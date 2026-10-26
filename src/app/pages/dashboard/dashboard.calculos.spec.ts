import { Pedido } from '../../core/models/pedido.model';
import { Categoria } from '../../core/models/producto.model';
import { consolidar } from './dashboard.calculos';

const categorias: Categoria[] = [
  { id: 1, nombre: 'Informática' },
  { id: 2, nombre: 'Periféricos' },
];

const ahora = new Date('2026-10-15T12:00:00Z');

function pedido(id: string, fecha: string, estado: Pedido['estado'], lineas: [number, number, number][]): Pedido {
  return {
    id,
    usuarioId: 2,
    usuarioNombre: 'Demo',
    estado,
    creadoEn: fecha,
    actualizadoEn: fecha,
    total: lineas.reduce((s, [, c, p]) => s + c * p, 0),
    lineas: lineas.map(([categoriaId, cantidad, precioUnitario], i) => ({
      productoId: i + 1,
      sku: `SKU-${i}`,
      nombre: `Producto ${categoriaId}-${i}`,
      categoriaId,
      cantidad,
      precioUnitario,
    })),
  };
}

const pedidos: Pedido[] = [
  pedido('A', '2026-10-01T10:00:00Z', 'entregado', [[1, 1, 100], [2, 2, 10]]),
  pedido('B', '2026-09-10T10:00:00Z', 'pendiente', [[2, 1, 50]]),
  pedido('C', '2026-08-10T10:00:00Z', 'cancelado', [[1, 1, 999]]),
  pedido('D', '2025-01-10T10:00:00Z', 'entregado', [[1, 1, 500]]), // fuera del periodo
];

describe('consolidar (cuadro de mando)', () => {
  it('excluye cancelados y pedidos fuera del periodo', () => {
    const d = consolidar(pedidos, categorias, { meses: 12, categoriaId: null, estado: null }, ahora);
    expect(d.numPedidos).toBe(2);
    expect(d.facturacion).toBe(170);
    expect(d.ticketMedio).toBe(85);
    expect(d.unidades).toBe(4);
  });

  it('filtra por categoría contando solo las líneas de esa categoría', () => {
    const d = consolidar(pedidos, categorias, { meses: 12, categoriaId: 2, estado: null }, ahora);
    expect(d.numPedidos).toBe(2);
    expect(d.facturacion).toBe(70);
  });

  it('permite analizar un estado concreto, incluido cancelado', () => {
    const d = consolidar(pedidos, categorias, { meses: 12, categoriaId: null, estado: 'cancelado' }, ahora);
    expect(d.numPedidos).toBe(1);
    expect(d.facturacion).toBe(999);
  });

  it('agrupa las ventas por mes en el último tramo del periodo', () => {
    const d = consolidar(pedidos, categorias, { meses: 3, categoriaId: null, estado: null }, ahora);
    expect(d.ventasMensuales.etiquetas).toHaveLength(3);
    expect(d.ventasMensuales.valores).toEqual([0, 50, 120]);
  });

  it('calcula pedidos por estado y ventas por categoría', () => {
    const d = consolidar(pedidos, categorias, { meses: 12, categoriaId: null, estado: null }, ahora);
    expect(d.porEstado.valores).toEqual([1, 0, 1, 1]); // pendiente, enviado, entregado, cancelado
    expect(d.porCategoria.valores).toEqual([100, 70]);
  });
});
