import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

/**
 * Interceptor HTTP de autenticación.
 *
 * - Añade la cabecera `Authorization: Bearer <jwt>` a todas las peticiones a la API.
 * - Si el servidor responde 401 (token inválido o caducado) cierra la sesión y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const auth = inject(AuthStore);
  const token = auth.token();
  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      const esLogin = req.url.includes('/auth/login');
      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin && token) {
        auth.cerrarSesion('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
      }
      return throwError(() => error);
    }),
  );
};
