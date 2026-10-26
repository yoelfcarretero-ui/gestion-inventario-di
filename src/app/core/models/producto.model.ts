/** Categoría de producto (tabla `categorias`). */
export interface Categoria {
  id: number;
  nombre: string;
}

/** Proveedor (tabla `proveedores`). */
export interface Proveedor {
  id: number;
  nombre: string;
  pais: string;
}

/** Producto del inventario (tabla `productos`). */
export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  categoriaId: number;
  proveedorId: number;
  precio: number;
  stock: number;
  stockMinimo: number;
  actualizadoEn: string;
}

/** Datos editables de un producto (alta y modificación). */
export type ProductoEditable = Omit<Producto, 'id' | 'actualizadoEn'>;

/** Producto enriquecido con los nombres de sus claves foráneas, listo para mostrar. */
export interface ProductoVista extends Producto {
  categoria: string;
  proveedor: string;
  bajoStock: boolean;
  valorStock: number;
}
