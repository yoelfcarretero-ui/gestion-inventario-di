import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce cualquier error (HTTP, de red o de código) a un mensaje legible para el usuario.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const mensaje = (error.error as { mensaje?: string } | null)?.mensaje;
    if (mensaje) {
      return mensaje;
    }
    if (error.status === 0) {
      return 'No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.';
    }
    return `Error ${error.status} al comunicarse con el servidor.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Se ha producido un error inesperado.';
}
