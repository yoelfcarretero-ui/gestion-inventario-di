/**
 * Acceso seguro a `localStorage`: en modo privado o con el almacenamiento bloqueado
 * las llamadas pueden lanzar excepciones, así que se capturan y se devuelve el valor por defecto.
 */
export const almacenamiento = {
  leer<T>(clave: string, porDefecto: T): T {
    try {
      const valor = localStorage.getItem(clave);
      return valor ? (JSON.parse(valor) as T) : porDefecto;
    } catch {
      return porDefecto;
    }
  },

  guardar(clave: string, valor: unknown): void {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      /* Sin almacenamiento disponible: los datos solo viven en memoria. */
    }
  },

  borrar(clave: string): void {
    try {
      localStorage.removeItem(clave);
    } catch {
      /* Ignorado intencionadamente. */
    }
  },
};

/** Devuelve un número entero aleatorio entre `min` y `max` (ambos incluidos). */
export function aleatorioEntre(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
