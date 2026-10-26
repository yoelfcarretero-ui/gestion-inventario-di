/**
 * Configuración del entorno de desarrollo.
 * `ng build` (producción) sustituye este fichero por `environment.prod.ts`.
 */
export const environment = {
  production: false,
  /** Prefijo de la API REST (SQL). Lo atiende el backend simulado en el navegador. */
  apiUrl: '/api',
  /** Latencia simulada de red (ms) para la API REST y el almacén NoSQL. */
  latenciaSimulada: { min: 250, max: 700 },
  /** Probabilidad (0-1) de que una petición simulada falle, para probar la gestión de errores. */
  tasaFalloSimulada: 0,
  /** Duración de la sesión emitida por el backend simulado (minutos). */
  duracionSesionMin: 120,
};
