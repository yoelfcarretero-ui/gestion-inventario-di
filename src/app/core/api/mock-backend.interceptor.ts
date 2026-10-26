import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, defer, delay, from, mergeMap, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Producto, ProductoEditable } from '../models/producto.model';
import { Credenciales, NuevoUsuario, Rol, TokenPayload, Usuario } from '../models/usuario.model';
import { generarSal, hashPassword } from '../utils/crypto.util';
import { aleatorioEntre } from '../utils/almacenamiento.util';
import { crearJwt, verificarJwt } from '../utils/jwt.util';
import { BaseDatosSql } from './base-datos-sql';
import { FilaUsuario } from './datos-semilla';

/**
 * Clave con la que el servidor SIMULADO firma los JWT de demostración.
 * No es un secreto de ningún servicio real: en una API de verdad viviría solo en el servidor.
 */
const CLAVE_SERVIDOR_DEMO = 'gestion-inventario-demo-hs256';

/** Error HTTP lanzado por los controladores del backend simulado. */
class ErrorApi extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Contexto que recibe cada controlador. */
interface Contexto {
  req: HttpRequest<unknown>;
  params: Record<string, string>;
  usuario: TokenPayload | null;
  db: BaseDatosSql;
}

interface Ruta {
  metodo: string;
  patron: RegExp;
  /** Rol mínimo exigido. `null` = endpoint público. */
  rol: Rol | 'autenticado' | null;
  controlador: (ctx: Contexto) => unknown | Promise<unknown>;
}

const sinCredenciales = (fila: FilaUsuario): Usuario => {
  const { sal: _sal, hash: _hash, ...usuario } = fila;
  return usuario;
};

const normalizarEmail = (email: string) => email.trim().toLowerCase();

async function emitirSesion(fila: FilaUsuario) {
  const token = await crearJwt(
    { sub: fila.id, email: fila.email, nombre: fila.nombre, rol: fila.rol },
    CLAVE_SERVIDOR_DEMO,
    environment.duracionSesionMin,
  );
  return { token, usuario: sinCredenciales(fila) };
}

function validarProducto(db: BaseDatosSql, datos: ProductoEditable, idActual?: number): void {
  if (!datos.sku?.trim() || !datos.nombre?.trim()) {
    throw new ErrorApi(422, 'El SKU y el nombre son obligatorios.');
  }
  if (datos.precio < 0 || datos.stock < 0 || datos.stockMinimo < 0) {
    throw new ErrorApi(422, 'Precio y stock no pueden ser negativos.');
  }
  const skuOcupado = db.seleccionar('productos', (p) => p.sku.toUpperCase() === datos.sku.toUpperCase() && p.id !== idActual);
  if (skuOcupado.length) {
    throw new ErrorApi(409, `El SKU ${datos.sku} ya existe.`);
  }
  if (!db.buscarPorId('categorias', datos.categoriaId) || !db.buscarPorId('proveedores', datos.proveedorId)) {
    throw new ErrorApi(422, 'La categoría o el proveedor no existen (violación de clave foránea).');
  }
}

/** Tabla de rutas de la API REST simulada. */
const RUTAS: Ruta[] = [
  // ---------- Autenticación ----------
  {
    metodo: 'POST',
    patron: /^\/auth\/login$/,
    rol: null,
    controlador: async ({ req, db }) => {
      const { email, password } = req.body as Credenciales;
      const fila = db.seleccionar('usuarios', (u) => u.email === normalizarEmail(email ?? ''))[0];
      if (!fila || (await hashPassword(password ?? '', fila.sal)) !== fila.hash) {
        throw new ErrorApi(401, 'Correo o contraseña incorrectos.');
      }
      if (!fila.activo) {
        throw new ErrorApi(403, 'La cuenta está desactivada. Contacta con un administrador.');
      }
      return emitirSesion(fila);
    },
  },
  {
    metodo: 'POST',
    patron: /^\/auth\/registro$/,
    rol: null,
    controlador: async ({ req, db }) => {
      const datos = req.body as NuevoUsuario;
      const email = normalizarEmail(datos.email ?? '');
      if (!datos.nombre?.trim() || !email || (datos.password ?? '').length < 8) {
        throw new ErrorApi(422, 'Datos de registro incompletos.');
      }
      if (db.seleccionar('usuarios', (u) => u.email === email).length) {
        throw new ErrorApi(409, 'Ya existe una cuenta con ese correo.');
      }
      const sal = generarSal();
      const fila = db.insertar('usuarios', {
        nombre: datos.nombre.trim(),
        email,
        rol: 'usuario',
        activo: true,
        creadoEn: new Date().toISOString(),
        sal,
        hash: await hashPassword(datos.password, sal),
      });
      return emitirSesion(fila);
    },
  },
  {
    metodo: 'GET',
    patron: /^\/auth\/yo$/,
    rol: 'autenticado',
    controlador: ({ usuario, db }) => {
      const fila = db.buscarPorId('usuarios', usuario!.sub);
      if (!fila) {
        throw new ErrorApi(404, 'Usuario no encontrado.');
      }
      return sinCredenciales(fila);
    },
  },

  // ---------- Usuarios ----------
  {
    metodo: 'GET',
    patron: /^\/usuarios\/email-disponible$/,
    rol: null,
    controlador: ({ req, db }) => {
      const email = normalizarEmail(req.params.get('email') ?? '');
      return { disponible: !db.seleccionar('usuarios', (u) => u.email === email).length };
    },
  },
  {
    metodo: 'GET',
    patron: /^\/usuarios$/,
    rol: 'admin',
    controlador: ({ db }) => db.seleccionar('usuarios').map(sinCredenciales),
  },
  {
    metodo: 'PATCH',
    patron: /^\/usuarios\/(?<id>\d+)$/,
    rol: 'admin',
    controlador: ({ req, params, usuario, db }) => {
      const id = Number(params['id']);
      const cambios = req.body as Partial<Pick<Usuario, 'rol' | 'activo'>>;
      if (id === usuario!.sub) {
        throw new ErrorApi(409, 'No puedes cambiar tu propio rol ni desactivar tu cuenta.');
      }
      const fila = db.actualizar('usuarios', id, {
        ...(cambios.rol !== undefined && { rol: cambios.rol }),
        ...(cambios.activo !== undefined && { activo: cambios.activo }),
      });
      if (!fila) {
        throw new ErrorApi(404, 'Usuario no encontrado.');
      }
      return sinCredenciales(fila);
    },
  },

  // ---------- Catálogos ----------
  { metodo: 'GET', patron: /^\/categorias$/, rol: 'autenticado', controlador: ({ db }) => db.seleccionar('categorias') },
  { metodo: 'GET', patron: /^\/proveedores$/, rol: 'autenticado', controlador: ({ db }) => db.seleccionar('proveedores') },

  // ---------- Productos ----------
  { metodo: 'GET', patron: /^\/productos$/, rol: 'autenticado', controlador: ({ db }) => db.seleccionar('productos') },
  {
    metodo: 'GET',
    patron: /^\/productos\/sku-disponible$/,
    rol: 'autenticado',
    controlador: ({ req, db }) => {
      const sku = (req.params.get('sku') ?? '').trim().toUpperCase();
      const excluir = Number(req.params.get('excluirId') ?? 0);
      return { disponible: !db.seleccionar('productos', (p) => p.sku.toUpperCase() === sku && p.id !== excluir).length };
    },
  },
  {
    metodo: 'GET',
    patron: /^\/productos\/(?<id>\d+)$/,
    rol: 'autenticado',
    controlador: ({ params, db }) => {
      const producto = db.buscarPorId('productos', Number(params['id']));
      if (!producto) {
        throw new ErrorApi(404, 'Producto no encontrado.');
      }
      return producto;
    },
  },
  {
    metodo: 'POST',
    patron: /^\/productos$/,
    rol: 'admin',
    controlador: ({ req, db }) => {
      const datos = req.body as ProductoEditable;
      validarProducto(db, datos);
      return db.insertar('productos', { ...datos, sku: datos.sku.toUpperCase(), actualizadoEn: new Date().toISOString() });
    },
  },
  {
    metodo: 'PUT',
    patron: /^\/productos\/(?<id>\d+)$/,
    rol: 'admin',
    controlador: ({ req, params, db }) => {
      const id = Number(params['id']);
      const datos = req.body as ProductoEditable;
      validarProducto(db, datos, id);
      const actualizado = db.actualizar('productos', id, {
        ...datos,
        sku: datos.sku.toUpperCase(),
        actualizadoEn: new Date().toISOString(),
      });
      if (!actualizado) {
        throw new ErrorApi(404, 'Producto no encontrado.');
      }
      return actualizado;
    },
  },
  {
    metodo: 'PATCH',
    patron: /^\/productos\/(?<id>\d+)\/stock$/,
    rol: 'autenticado',
    controlador: ({ req, params, db }) => {
      const id = Number(params['id']);
      const { delta } = req.body as { delta: number };
      const producto = db.buscarPorId('productos', id);
      if (!producto) {
        throw new ErrorApi(404, 'Producto no encontrado.');
      }
      if (producto.stock + delta < 0) {
        throw new ErrorApi(409, `Stock insuficiente de ${producto.nombre} (quedan ${producto.stock}).`);
      }
      return db.actualizar('productos', id, { stock: producto.stock + delta, actualizadoEn: new Date().toISOString() }) as Producto;
    },
  },
  {
    metodo: 'DELETE',
    patron: /^\/productos\/(?<id>\d+)$/,
    rol: 'admin',
    controlador: ({ params, db }) => {
      if (!db.eliminar('productos', Number(params['id']))) {
        throw new ErrorApi(404, 'Producto no encontrado.');
      }
      return null;
    },
  },

  // ---------- Utilidades ----------
  {
    metodo: 'POST',
    patron: /^\/demo\/reiniciar$/,
    rol: 'admin',
    controlador: ({ db }) => {
      db.reiniciar();
      return null;
    },
  },
];

async function resolver(req: HttpRequest<unknown>, db: BaseDatosSql): Promise<HttpResponse<unknown>> {
  const ruta = req.url.slice(environment.apiUrl.length).split('?')[0];
  let coincidencia: RegExpExecArray | null = null;
  const definicion = RUTAS.find((r) => r.metodo === req.method && (coincidencia = r.patron.exec(ruta)));
  if (!definicion) {
    throw new ErrorApi(404, `Ruta no encontrada: ${req.method} ${ruta}`);
  }

  let usuario: TokenPayload | null = null;
  if (definicion.rol) {
    const cabecera = req.headers.get('Authorization') ?? '';
    usuario = cabecera.startsWith('Bearer ') ? await verificarJwt(cabecera.slice(7), CLAVE_SERVIDOR_DEMO) : null;
    if (!usuario) {
      throw new ErrorApi(401, 'Sesión no válida o caducada.');
    }
    if (definicion.rol === 'admin' && usuario.rol !== 'admin') {
      throw new ErrorApi(403, 'Esta operación requiere el rol Administrador.');
    }
  }

  const params = (coincidencia as RegExpExecArray | null)?.groups ?? {};
  const cuerpo = await definicion.controlador({ req, params, usuario, db });
  return new HttpResponse({ status: cuerpo === null ? 204 : 200, body: cuerpo, url: req.url });
}

/**
 * Interceptor que simula el servidor de la API REST respaldada por una base de datos relacional.
 *
 * Captura las peticiones dirigidas a `environment.apiUrl`, valida el JWT y el rol en el "servidor"
 * (de modo que la protección no depende solo de los guards del cliente), ejecuta la consulta sobre
 * {@link BaseDatosSql} y devuelve la respuesta con latencia de red simulada.
 * El resto de peticiones (assets, etc.) pasan sin modificar.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const db = inject(BaseDatosSql);
  const latencia = aleatorioEntre(environment.latenciaSimulada.min, environment.latenciaSimulada.max);

  return of(null).pipe(
    delay(latencia),
    mergeMap(() =>
      defer(() => {
        if (Math.random() < environment.tasaFalloSimulada) {
          throw new ErrorApi(503, 'Servicio no disponible temporalmente (fallo simulado).');
        }
        return from(resolver(req, db));
      }),
    ),
    catchError((e: unknown) => {
      const status = e instanceof ErrorApi ? e.status : 500;
      const mensaje = e instanceof Error ? e.message : 'Error interno del servidor.';
      return throwError(() => new HttpErrorResponse({ status, error: { mensaje }, url: req.url }));
    }),
  );
};
