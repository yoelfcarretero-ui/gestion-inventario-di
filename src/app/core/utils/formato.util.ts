/** Definición de una columna tabular, compartida por la tabla de datos y los exportadores PDF/CSV. */
export interface Columna<T> {
  /** Propiedad de la fila que se muestra. */
  clave: keyof T & string;
  /** Texto de la cabecera. */
  etiqueta: string;
  tipo?: 'texto' | 'numero' | 'moneda' | 'fecha' | 'estado';
  /** Permite ordenar por esta columna (por defecto `true`). */
  ordenable?: boolean;
  /** Formateador propio; si no se indica se usa el del tipo. */
  formato?: (fila: T) => string;
  /** Oculta la columna en pantallas estrechas. */
  ocultarEnMovil?: boolean;
}

const moneda = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const numero = new Intl.NumberFormat('es-ES');
const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export const formatearMoneda = (v: number) => moneda.format(v);
export const formatearNumero = (v: number) => numero.format(v);
export const formatearFecha = (v: string) => fecha.format(new Date(v));

/** Devuelve el valor de una celda formateado como texto según la definición de la columna. */
export function valorCelda<T>(fila: T, columna: Columna<T>): string {
  if (columna.formato) {
    return columna.formato(fila);
  }
  const valor = fila[columna.clave] as unknown;
  if (valor === null || valor === undefined) {
    return '';
  }
  switch (columna.tipo) {
    case 'moneda':
      return formatearMoneda(Number(valor));
    case 'numero':
      return formatearNumero(Number(valor));
    case 'fecha':
      return formatearFecha(String(valor));
    case 'estado':
      return String(valor).charAt(0).toUpperCase() + String(valor).slice(1);
    default:
      return String(valor);
  }
}

/** Normaliza texto para búsquedas: minúsculas y sin tildes. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
