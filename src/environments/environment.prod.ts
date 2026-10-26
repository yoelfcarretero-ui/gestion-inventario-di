/**
 * Configuración del entorno de producción (despliegue en Vercel).
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  latenciaSimulada: { min: 200, max: 600 },
  tasaFalloSimulada: 0,
  duracionSesionMin: 120,
};
