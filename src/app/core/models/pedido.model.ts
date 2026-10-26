/** Estados por los que pasa un pedido. */
export type EstadoPedido = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';

export const ESTADOS_PEDIDO: readonly EstadoPedido[] = ['pendiente', 'enviado', 'entregado', 'cancelado'];

/** Línea de un pedido (desnormalizada, como es habitual en un almacén de documentos). */
export interface LineaPedido {
  productoId: number;
  sku: string;
  nombre: string;
  categoriaId: number;
  cantidad: number;
  precioUnitario: number;
}

/** Documento de la colección `pedidos` del almacén NoSQL en tiempo real. */
export interface Pedido {
  id: string;
  usuarioId: number;
  usuarioNombre: string;
  lineas: LineaPedido[];
  total: number;
  estado: EstadoPedido;
  creadoEn: string;
  actualizadoEn: string;
}

/** Datos necesarios para crear un pedido. */
export type NuevoPedido = Pick<Pedido, 'usuarioId' | 'usuarioNombre' | 'lineas'>;
