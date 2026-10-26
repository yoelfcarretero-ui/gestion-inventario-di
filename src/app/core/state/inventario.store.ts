import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom, forkJoin } from 'rxjs';

import { Categoria, Producto, ProductoEditable, ProductoVista, Proveedor } from '../models/producto.model';
import { ProductosService } from '../services/productos.service';
import { mensajeDeError } from '../utils/errores.util';

export type EstadoCarga = 'inactivo' | 'cargando' | 'listo' | 'error';

interface EstadoInventario {
  productos: Producto[];
  categorias: Categoria[];
  proveedores: Proveedor[];
  estado: EstadoCarga;
  error: string | null;
}

const estadoInicial: EstadoInventario = {
  productos: [],
  categorias: [],
  proveedores: [],
  estado: 'inactivo',
  error: null,
};

/**
 * Store del inventario (NgRx SignalStore): caché compartida de productos y catálogos.
 *
 * Las vistas leen señales derivadas y piden cambios mediante métodos; nunca mutan el estado
 * directamente. Tras cada escritura en la API se actualiza el estado de forma inmutable.
 */
export const InventarioStore = signalStore(
  { providedIn: 'root' },
  withState(estadoInicial),
  withComputed(({ productos, categorias, proveedores }) => ({
    /** Productos con los nombres de sus claves foráneas resueltos (equivale a un JOIN). */
    productosVista: computed<ProductoVista[]>(() => {
      const cat = new Map(categorias().map((c) => [c.id, c.nombre]));
      const prov = new Map(proveedores().map((p) => [p.id, p.nombre]));
      return productos().map((p) => ({
        ...p,
        categoria: cat.get(p.categoriaId) ?? '—',
        proveedor: prov.get(p.proveedorId) ?? '—',
        bajoStock: p.stock <= p.stockMinimo,
        valorStock: Math.round(p.stock * p.precio * 100) / 100,
      }));
    }),
    totalUnidades: computed(() => productos().reduce((s, p) => s + p.stock, 0)),
    valorInventario: computed(() => Math.round(productos().reduce((s, p) => s + p.stock * p.precio, 0) * 100) / 100),
    productosBajoStock: computed(() => productos().filter((p) => p.stock <= p.stockMinimo).length),
  })),
  withMethods((store, api = inject(ProductosService)) => ({
    /**
     * Carga productos, categorías y proveedores **en paralelo** con `forkJoin`.
     * @param forzar vuelve a pedir los datos aunque ya estén en caché
     */
    async cargar(forzar = false): Promise<void> {
      if (store.estado() === 'cargando' || (store.estado() === 'listo' && !forzar)) {
        return;
      }
      patchState(store, { estado: 'cargando', error: null });
      try {
        const { productos, categorias, proveedores } = await firstValueFrom(
          forkJoin({ productos: api.listar(), categorias: api.categorias(), proveedores: api.proveedores() }),
        );
        patchState(store, { productos, categorias, proveedores, estado: 'listo' });
      } catch (e) {
        patchState(store, { estado: 'error', error: mensajeDeError(e) });
      }
    },

    /** Crea (sin `id`) o actualiza (con `id`) un producto. */
    async guardar(datos: ProductoEditable, id?: number): Promise<Producto> {
      const guardado = await firstValueFrom(id ? api.actualizar(id, datos) : api.crear(datos));
      patchState(store, ({ productos }) => ({
        productos: id ? productos.map((p) => (p.id === id ? guardado : p)) : [...productos, guardado],
      }));
      return guardado;
    },

    async eliminar(id: number): Promise<void> {
      await firstValueFrom(api.eliminar(id));
      patchState(store, ({ productos }) => ({ productos: productos.filter((p) => p.id !== id) }));
    },

    /** Marca la caché como obsoleta (p. ej. tras crear un pedido que modifica el stock). */
    invalidar(): void {
      if (store.estado() === 'listo') {
        patchState(store, { estado: 'inactivo' });
      }
    },

    /** Limpia el estado al cerrar sesión. */
    limpiar(): void {
      patchState(store, estadoInicial);
    },
  })),
);
