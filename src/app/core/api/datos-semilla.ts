import { Categoria, Producto, Proveedor } from '../models/producto.model';
import { Rol } from '../models/usuario.model';

/**
 * Datos SINTÉTICOS de arranque. Ningún nombre, correo ni empresa corresponde a personas o entidades reales:
 * los correos usan el dominio reservado `.test` (RFC 2606) y los nombres son ficticios.
 * Las contraseñas NO se almacenan: solo su hash SHA-256 con sal.
 */

/** Fila de la tabla `usuarios` (incluye credenciales, nunca sale del backend). */
export interface FilaUsuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  sal: string;
  hash: string;
}

export const USUARIOS_SEMILLA: FilaUsuario[] = [
  {
    id: 1,
    nombre: 'Laura Admin (demo)',
    email: 'admin@gestionstock.test',
    rol: 'admin',
    activo: true,
    creadoEn: '2026-01-08T09:00:00.000Z',
    sal: '35eae44fd267700be94072fc43ff420b',
    hash: 'dbf823a95dcf04465493ea37727bf82bbd7152c512fb55c9c42a13d437f6b643',
  },
  {
    id: 2,
    nombre: 'Carlos Usuario (demo)',
    email: 'usuario@gestionstock.test',
    rol: 'usuario',
    activo: true,
    creadoEn: '2026-02-14T10:30:00.000Z',
    sal: '4502af047abc9d294adf061e16352521',
    hash: '9a42e7adfc9d5ffa18c9fb519b14339a0dacce60ed18d37ce330ffad76b17a4f',
  },
  {
    id: 3,
    nombre: 'Marta Compras (demo)',
    email: 'compras@gestionstock.test',
    rol: 'usuario',
    activo: true,
    creadoEn: '2026-03-02T08:15:00.000Z',
    sal: '8dc782a78b4ba619b64032272394d4c2',
    hash: '6b94eaed234b6a86cfd140d2b44bb96c70913f3b2e08a876224cc363cf32d4d8',
  },
];

export const CATEGORIAS_SEMILLA: Categoria[] = [
  { id: 1, nombre: 'Informática' },
  { id: 2, nombre: 'Periféricos' },
  { id: 3, nombre: 'Redes' },
  { id: 4, nombre: 'Mobiliario' },
  { id: 5, nombre: 'Papelería' },
  { id: 6, nombre: 'Almacenamiento' },
];

export const PROVEEDORES_SEMILLA: Proveedor[] = [
  { id: 1, nombre: 'Suministros Atlas S.L. (ficticio)', pais: 'España' },
  { id: 2, nombre: 'Distribuciones Boreal (ficticio)', pais: 'Portugal' },
  { id: 3, nombre: 'Componentes Cénit (ficticio)', pais: 'España' },
  { id: 4, nombre: 'Oficina Delta (ficticio)', pais: 'Francia' },
  { id: 5, nombre: 'Logística Éter (ficticio)', pais: 'Italia' },
];

const FECHA_BASE = '2026-09-30T12:00:00.000Z';

/** [sku, nombre, categoriaId, proveedorId, precio, stock, stockMinimo] */
const FILAS_PRODUCTO: [string, string, number, number, number, number, number][] = [
  ['INF-0001', 'Portátil 14" i5 16GB', 1, 3, 849.0, 18, 5],
  ['INF-0002', 'Portátil 15" i7 32GB', 1, 3, 1299.0, 6, 4],
  ['INF-0003', 'Sobremesa compacto Ryzen 5', 1, 1, 699.0, 11, 3],
  ['INF-0004', 'Monitor 24" IPS', 1, 2, 159.9, 34, 10],
  ['INF-0005', 'Monitor 27" 4K', 1, 2, 329.0, 3, 5],
  ['PER-0001', 'Teclado mecánico ES', 2, 1, 79.5, 52, 15],
  ['PER-0002', 'Ratón ergonómico inalámbrico', 2, 1, 39.9, 70, 20],
  ['PER-0003', 'Auriculares con micrófono USB', 2, 4, 49.0, 9, 12],
  ['PER-0004', 'Webcam Full HD', 2, 4, 59.0, 25, 8],
  ['PER-0005', 'Base de carga USB-C', 2, 3, 129.0, 14, 6],
  ['RED-0001', 'Switch 24 puertos gestionable', 3, 5, 289.0, 7, 3],
  ['RED-0002', 'Punto de acceso Wi-Fi 6', 3, 5, 149.0, 2, 4],
  ['RED-0003', 'Cable Cat6 (caja 305 m)', 3, 1, 119.0, 12, 4],
  ['RED-0004', 'Router empresarial VPN', 3, 5, 239.0, 5, 2],
  ['MOB-0001', 'Silla ergonómica', 4, 4, 219.0, 16, 5],
  ['MOB-0002', 'Mesa elevable eléctrica', 4, 4, 449.0, 4, 3],
  ['MOB-0003', 'Cajonera con llave', 4, 2, 129.0, 10, 4],
  ['PAP-0001', 'Papel A4 80g (caja 5 paquetes)', 5, 2, 24.9, 120, 40],
  ['PAP-0002', 'Bolígrafos azules (pack 50)', 5, 2, 12.5, 35, 20],
  ['PAP-0003', 'Archivador de palanca', 5, 1, 3.2, 15, 30],
  ['ALM-0001', 'SSD NVMe 1TB', 6, 3, 89.0, 40, 10],
  ['ALM-0002', 'Disco externo 2TB', 6, 3, 79.0, 22, 8],
  ['ALM-0003', 'NAS 4 bahías', 6, 5, 529.0, 3, 2],
  ['ALM-0004', 'Memoria USB 64GB', 6, 1, 9.9, 95, 25],
];

export const PRODUCTOS_SEMILLA: Producto[] = FILAS_PRODUCTO.map(
  ([sku, nombre, categoriaId, proveedorId, precio, stock, stockMinimo], i) => ({
    id: i + 1,
    sku,
    nombre,
    descripcion: `${nombre}. Artículo de catálogo de demostración.`,
    categoriaId,
    proveedorId,
    precio,
    stock,
    stockMinimo,
    actualizadoEn: FECHA_BASE,
  }),
);
