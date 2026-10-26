import { ESTADOS_PEDIDO, EstadoPedido, Pedido } from '../../core/models/pedido.model';
import { Categoria } from '../../core/models/producto.model';

/** Filtros del cuadro de mando. */
export interface FiltrosDashboard {
  /** Número de meses hacia atrás que se analizan. */
  meses: number;
  categoriaId: number | null;
  estado: EstadoPedido | null;
}

/** Datos consolidados listos para pintar. */
export interface Consolidado {
  facturacion: number;
  numPedidos: number;
  ticketMedio: number;
  unidades: number;
  ventasMensuales: { etiquetas: string[]; valores: number[] };
  porEstado: { etiquetas: string[]; valores: number[]; estados: EstadoPedido[] };
  porCategoria: { etiquetas: string[]; valores: number[]; ids: number[] };
  topProductos: { etiquetas: string[]; valores: number[] };
}

const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' });

/** Importe de un pedido limitado a una categoría (o completo si no hay filtro). */
function importe(p: Pedido, categoriaId: number | null): number {
  return p.lineas
    .filter((l) => categoriaId === null || l.categoriaId === categoriaId)
    .reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
}

/**
 * Consolida los pedidos (NoSQL) con el catálogo de categorías (SQL) aplicando los filtros.
 * Función pura: no depende de Angular, así que es fácil de probar.
 */
export function consolidar(pedidos: Pedido[], categorias: Categoria[], filtros: FiltrosDashboard, ahora = new Date()): Consolidado {
  const desde = new Date(ahora.getFullYear(), ahora.getMonth() - filtros.meses + 1, 1);
  const { categoriaId, estado } = filtros;

  const enPeriodo = pedidos.filter(
    (p) => new Date(p.creadoEn) >= desde && (categoriaId === null || p.lineas.some((l) => l.categoriaId === categoriaId)),
  );
  // Las métricas de ventas excluyen los cancelados salvo que se filtre explícitamente por ese estado.
  const validos = enPeriodo.filter((p) => (estado ? p.estado === estado : p.estado !== 'cancelado'));

  const facturacion = validos.reduce((s, p) => s + importe(p, categoriaId), 0);
  const unidades = validos.reduce(
    (s, p) => s + p.lineas.filter((l) => categoriaId === null || l.categoriaId === categoriaId).reduce((u, l) => u + l.cantidad, 0),
    0,
  );

  // Ventas por mes
  const meses: Date[] = Array.from({ length: filtros.meses }, (_, i) => new Date(desde.getFullYear(), desde.getMonth() + i, 1));
  const ventasMes = meses.map(() => 0);
  for (const p of validos) {
    const f = new Date(p.creadoEn);
    const indice = (f.getFullYear() - desde.getFullYear()) * 12 + f.getMonth() - desde.getMonth();
    if (indice >= 0 && indice < ventasMes.length) {
      ventasMes[indice] += importe(p, categoriaId);
    }
  }

  // Pedidos por estado (sobre todo el periodo, para poder elegir cualquiera)
  const porEstado = ESTADOS_PEDIDO.map((e) => enPeriodo.filter((p) => p.estado === e).length);

  // Ventas por categoría (sin aplicar el filtro de categoría, para poder cambiarlo desde el gráfico)
  const base = pedidos.filter(
    (p) => new Date(p.creadoEn) >= desde && (estado ? p.estado === estado : p.estado !== 'cancelado'),
  );
  const ventasCategoria = categorias.map((c) => base.reduce((s, p) => s + importe(p, c.id), 0));

  // Top 5 productos por unidades
  const unidadesProducto = new Map<string, number>();
  for (const p of validos) {
    for (const l of p.lineas) {
      if (categoriaId === null || l.categoriaId === categoriaId) {
        unidadesProducto.set(l.nombre, (unidadesProducto.get(l.nombre) ?? 0) + l.cantidad);
      }
    }
  }
  const top = [...unidadesProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const redondear = (v: number) => Math.round(v * 100) / 100;
  return {
    facturacion: redondear(facturacion),
    numPedidos: validos.length,
    ticketMedio: validos.length ? redondear(facturacion / validos.length) : 0,
    unidades,
    ventasMensuales: { etiquetas: meses.map((m) => nombreMes.format(m)), valores: ventasMes.map(redondear) },
    porEstado: {
      etiquetas: ESTADOS_PEDIDO.map((e) => e.charAt(0).toUpperCase() + e.slice(1)),
      valores: porEstado,
      estados: [...ESTADOS_PEDIDO],
    },
    porCategoria: { etiquetas: categorias.map((c) => c.nombre), valores: ventasCategoria.map(redondear), ids: categorias.map((c) => c.id) },
    topProductos: { etiquetas: top.map(([n]) => n), valores: top.map(([, v]) => v) },
  };
}
