import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, forkJoin, map, of } from 'rxjs';

import { AlmacenDocumentos, ColeccionRef } from '../api/almacen-documentos.service';
import { PRODUCTOS_SEMILLA } from '../api/datos-semilla';
import { EstadoPedido, LineaPedido, NuevoPedido, Pedido } from '../models/pedido.model';
import { Usuario } from '../models/usuario.model';
import { ProductosService } from './productos.service';

/** Generador pseudoaleatorio determinista (mulberry32) para que la semilla sea reproducible. */
function generador(semilla: number): () => number {
  return () => {
    semilla |= 0;
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Genera pedidos sintéticos de los últimos 12 meses a partir del catálogo de demostración. */
export function generarPedidosSemilla(ahora = new Date()): Pedido[] {
  const azar = generador(488);
  const clientes = [
    { id: 2, nombre: 'Carlos Usuario (demo)' },
    { id: 3, nombre: 'Marta Compras (demo)' },
  ];
  const pedidos: Pedido[] = [];
  for (let i = 0; i < 110; i++) {
    const diasAtras = Math.floor(azar() * 365);
    const fecha = new Date(ahora.getTime() - diasAtras * 86_400_000 - Math.floor(azar() * 36_000_000));
    const lineas: LineaPedido[] = Array.from({ length: 1 + Math.floor(azar() * 3) }, () => {
      const p = PRODUCTOS_SEMILLA[Math.floor(azar() * PRODUCTOS_SEMILLA.length)];
      return {
        productoId: p.id,
        sku: p.sku,
        nombre: p.nombre,
        categoriaId: p.categoriaId,
        cantidad: 1 + Math.floor(azar() * 4),
        precioUnitario: p.precio,
      };
    });
    const r = azar();
    const estado: EstadoPedido =
      r < 0.07 ? 'cancelado' : diasAtras > 20 ? 'entregado' : diasAtras > 7 ? (r < 0.5 ? 'enviado' : 'entregado') : r < 0.6 ? 'pendiente' : 'enviado';
    const cliente = clientes[Math.floor(azar() * clientes.length)];
    pedidos.push({
      id: `PED-${(1000 + i).toString()}`,
      usuarioId: cliente.id,
      usuarioNombre: cliente.nombre,
      lineas,
      total: calcularTotal(lineas),
      estado,
      creadoEn: fecha.toISOString(),
      actualizadoEn: fecha.toISOString(),
    });
  }
  return pedidos.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

/** Suma de las líneas de un pedido, redondeada a céntimos. */
export function calcularTotal(lineas: LineaPedido[]): number {
  return Math.round(lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0) * 100) / 100;
}

/**
 * Servicio de pedidos sobre el almacén de documentos en tiempo real (origen NoSQL).
 */
@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly productos = inject(ProductosService);
  private readonly coleccion: ColeccionRef<Pedido> = inject(AlmacenDocumentos).coleccion<Pedido>('pedidos', () =>
    generarPedidosSemilla(),
  );

  /** Todos los pedidos, ordenados del más reciente al más antiguo, actualizados en tiempo real. */
  todos$(): Observable<Pedido[]> {
    return this.coleccion
      .enTiempoReal()
      .pipe(map((pedidos) => [...pedidos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))));
  }

  /** Pedidos de un usuario concreto, en tiempo real. */
  delUsuario$(usuarioId: number): Observable<Pedido[]> {
    return this.todos$().pipe(map((pedidos) => pedidos.filter((p) => p.usuarioId === usuarioId)));
  }

  /** Pedidos que puede ver un usuario: todos si es administrador, solo los suyos en otro caso. */
  visiblesPara$(usuario: Usuario | null): Observable<Pedido[]> {
    if (!usuario) {
      return of([]);
    }
    return usuario.rol === 'admin' ? this.todos$() : this.delUsuario$(usuario.id);
  }

  /**
   * Crea un pedido orquestando ambos orígenes de datos:
   * 1. descuenta el stock de cada línea en la API SQL **en paralelo** (`forkJoin`);
   * 2. si todo va bien, guarda el documento del pedido en el almacén NoSQL.
   * Si falla algún descuento, revierte los que sí se aplicaron.
   */
  async crear(datos: NuevoPedido): Promise<Pedido> {
    const resultados = await Promise.allSettled(
      datos.lineas.map((l) => firstValueFrom(this.productos.ajustarStock(l.productoId, -l.cantidad))),
    );
    const fallo = resultados.find((r) => r.status === 'rejected');
    if (fallo) {
      const aplicadas = datos.lineas.filter((_, i) => resultados[i].status === 'fulfilled');
      if (aplicadas.length) {
        await firstValueFrom(forkJoin(aplicadas.map((l) => this.productos.ajustarStock(l.productoId, l.cantidad))));
      }
      throw (fallo as PromiseRejectedResult).reason;
    }
    const ahora = new Date().toISOString();
    return this.coleccion.agregar(
      {
        ...datos,
        total: calcularTotal(datos.lineas),
        estado: 'pendiente',
        creadoEn: ahora,
        actualizadoEn: ahora,
      },
      `PED-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    );
  }

  /**
   * Devuelve al inventario (API SQL) las unidades de un pedido cancelado, en paralelo.
   * Las líneas de productos que ya no existen en el catálogo se ignoran.
   */
  async reponerStock(pedido: Pedido): Promise<void> {
    await Promise.allSettled(pedido.lineas.map((l) => firstValueFrom(this.productos.ajustarStock(l.productoId, l.cantidad))));
  }

  /** Cambia el estado de un pedido (lo verán al instante todos los clientes conectados). */
  cambiarEstado(id: string, estado: EstadoPedido): Promise<Pedido> {
    return this.coleccion.actualizar(id, { estado, actualizadoEn: new Date().toISOString() });
  }
}
