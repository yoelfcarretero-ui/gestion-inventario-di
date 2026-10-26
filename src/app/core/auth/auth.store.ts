import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Credenciales, NuevoUsuario, RespuestaAuth, Usuario } from '../models/usuario.model';
import { almacenamiento } from '../utils/almacenamiento.util';
import { decodificarJwt, jwtCaducado } from '../utils/jwt.util';

/** Estado global de la sesión. */
export interface EstadoAuth {
  token: string | null;
  usuario: Usuario | null;
  /** Motivo del último cierre de sesión forzado (p. ej. token caducado), para informar al usuario. */
  motivoCierre: string | null;
}

const CLAVE_SESION = 'gi.sesion';

/** Recupera la sesión persistida si el token sigue siendo válido. */
function estadoInicial(): EstadoAuth {
  const guardada = almacenamiento.leer<Pick<EstadoAuth, 'token' | 'usuario'> | null>(CLAVE_SESION, null);
  const payload = guardada?.token ? decodificarJwt(guardada.token) : null;
  if (!guardada || !payload || jwtCaducado(payload)) {
    almacenamiento.borrar(CLAVE_SESION);
    return { token: null, usuario: null, motivoCierre: null };
  }
  return { token: guardada.token, usuario: guardada.usuario, motivoCierre: null };
}

let temporizadorCaducidad: ReturnType<typeof setTimeout> | undefined;

/**
 * Store de autenticación (NgRx SignalStore).
 *
 * Es la única fuente de verdad de la sesión: el estado solo cambia a través de sus métodos
 * (`patchState`), lo que hace el flujo predecible. Persiste el JWT, programa el cierre automático
 * de la sesión cuando el token caduca y expone señales derivadas para la interfaz y los guards.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<EstadoAuth>(estadoInicial),
  withComputed(({ usuario }) => ({
    autenticado: computed(() => usuario() !== null),
    esAdmin: computed(() => usuario()?.rol === 'admin'),
    iniciales: computed(() =>
      (usuario()?.nombre ?? '')
        .split(' ')
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join(''),
    ),
  })),
  withMethods((store, http = inject(HttpClient), router = inject(Router)) => {
    const api = environment.apiUrl;

    const abrirSesion = (respuesta: RespuestaAuth) => {
      patchState(store, { token: respuesta.token, usuario: respuesta.usuario, motivoCierre: null });
      almacenamiento.guardar(CLAVE_SESION, { token: respuesta.token, usuario: respuesta.usuario });
      programarCaducidad();
    };

    const cerrarSesion = (motivo: string | null = null) => {
      clearTimeout(temporizadorCaducidad);
      almacenamiento.borrar(CLAVE_SESION);
      patchState(store, { token: null, usuario: null, motivoCierre: motivo });
      void router.navigateByUrl('/login', { replaceUrl: true });
    };

    /** Cierra la sesión automáticamente en el instante en que caduca el JWT. */
    const programarCaducidad = () => {
      clearTimeout(temporizadorCaducidad);
      const payload = store.token() ? decodificarJwt(store.token()!) : null;
      if (payload) {
        const restante = payload.exp * 1000 - Date.now();
        temporizadorCaducidad = setTimeout(
          () => cerrarSesion('Tu sesión ha caducado. Vuelve a iniciar sesión.'),
          Math.max(restante, 0),
        );
      }
    };

    return {
      /** Inicia sesión contra la API y guarda el token. */
      async iniciarSesion(credenciales: Credenciales): Promise<Usuario> {
        const respuesta = await firstValueFrom(http.post<RespuestaAuth>(`${api}/auth/login`, credenciales));
        abrirSesion(respuesta);
        return respuesta.usuario;
      },

      /** Registra un usuario estándar y abre su sesión. */
      async registrar(datos: NuevoUsuario): Promise<Usuario> {
        const respuesta = await firstValueFrom(http.post<RespuestaAuth>(`${api}/auth/registro`, datos));
        abrirSesion(respuesta);
        return respuesta.usuario;
      },

      cerrarSesion,
      programarCaducidad,

      /** Indica si el usuario actual tiene alguno de los roles indicados. */
      tieneRol(...roles: string[]): boolean {
        const rol = store.usuario()?.rol;
        return !!rol && roles.includes(rol);
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.programarCaducidad();
    },
  }),
);
