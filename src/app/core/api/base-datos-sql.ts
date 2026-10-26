import { Injectable } from '@angular/core';

import { Categoria, Producto, Proveedor } from '../models/producto.model';
import { almacenamiento } from '../utils/almacenamiento.util';
import {
  CATEGORIAS_SEMILLA,
  FilaUsuario,
  PRODUCTOS_SEMILLA,
  PROVEEDORES_SEMILLA,
  USUARIOS_SEMILLA,
} from './datos-semilla';

/** Esquema relacional simulado: cada propiedad es una tabla. */
export interface EsquemaSql {
  usuarios: FilaUsuario[];
  categorias: Categoria[];
  proveedores: Proveedor[];
  productos: Producto[];
}

type NombreTabla = keyof EsquemaSql;
type Fila<T extends NombreTabla> = EsquemaSql[T][number];

const CLAVE_ALMACEN = 'gi.sql.v1';

/**
 * Motor relacional en memoria que hace de "servidor SQL" para el backend simulado.
 *
 * Mantiene tablas con clave primaria numérica autoincremental e integridad referencial básica
 * (`productos.categoriaId → categorias.id`, `productos.proveedorId → proveedores.id`).
 * Persiste en `localStorage` para que los cambios sobrevivan a una recarga.
 * Solo lo usa {@link mockBackendInterceptor}; el resto de la app accede a los datos por HTTP.
 */
@Injectable({ providedIn: 'root' })
export class BaseDatosSql {
  private datos: EsquemaSql = this.cargar();

  /** SELECT * FROM tabla [WHERE filtro] */
  seleccionar<T extends NombreTabla>(tabla: T, filtro?: (fila: Fila<T>) => boolean): Fila<T>[] {
    const filas = this.datos[tabla] as Fila<T>[];
    return structuredClone(filtro ? filas.filter(filtro) : filas);
  }

  /** SELECT * FROM tabla WHERE id = ? */
  buscarPorId<T extends NombreTabla>(tabla: T, id: number): Fila<T> | undefined {
    return this.seleccionar(tabla, (f) => f.id === id)[0];
  }

  /** INSERT INTO tabla VALUES (...) — asigna el siguiente id. */
  insertar<T extends NombreTabla>(tabla: T, fila: Omit<Fila<T>, 'id'>): Fila<T> {
    const filas = this.datos[tabla] as Fila<T>[];
    const id = filas.reduce((max, f) => Math.max(max, f.id), 0) + 1;
    const nueva = { ...fila, id } as Fila<T>;
    filas.push(nueva);
    this.persistir();
    return structuredClone(nueva);
  }

  /** UPDATE tabla SET ... WHERE id = ? */
  actualizar<T extends NombreTabla>(tabla: T, id: number, cambios: Partial<Fila<T>>): Fila<T> | undefined {
    const filas = this.datos[tabla] as Fila<T>[];
    const indice = filas.findIndex((f) => f.id === id);
    if (indice === -1) {
      return undefined;
    }
    filas[indice] = { ...filas[indice], ...cambios, id };
    this.persistir();
    return structuredClone(filas[indice]);
  }

  /** DELETE FROM tabla WHERE id = ? */
  eliminar(tabla: NombreTabla, id: number): boolean {
    const filas = this.datos[tabla] as { id: number }[];
    const indice = filas.findIndex((f) => f.id === id);
    if (indice === -1) {
      return false;
    }
    filas.splice(indice, 1);
    this.persistir();
    return true;
  }

  /** Restaura los datos de demostración iniciales. */
  reiniciar(): void {
    this.datos = BaseDatosSql.semilla();
    this.persistir();
  }

  private cargar(): EsquemaSql {
    const guardado = almacenamiento.leer<EsquemaSql | null>(CLAVE_ALMACEN, null);
    return guardado?.usuarios && guardado.productos ? guardado : BaseDatosSql.semilla();
  }

  private persistir(): void {
    almacenamiento.guardar(CLAVE_ALMACEN, this.datos);
  }

  private static semilla(): EsquemaSql {
    return structuredClone({
      usuarios: USUARIOS_SEMILLA,
      categorias: CATEGORIAS_SEMILLA,
      proveedores: PROVEEDORES_SEMILLA,
      productos: PRODUCTOS_SEMILLA,
    });
  }
}
