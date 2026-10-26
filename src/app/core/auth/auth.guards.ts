import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { Rol } from '../models/usuario.model';
import { AuthStore } from './auth.store';

/**
 * Permite el acceso solo a usuarios autenticados.
 * Se usa como `canMatch`, así el chunk de la página (lazy loading) ni siquiera se descarga sin sesión.
 */
export const autenticadoGuard: CanMatchFn = (_ruta, segmentos) => {
  const auth = inject(AuthStore);
  if (auth.autenticado()) {
    return true;
  }
  const destino = '/' + segmentos.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(['/login'], { queryParams: { volverA: destino } });
};

/**
 * Fábrica de guards por rol: solo deja pasar si el usuario tiene alguno de los roles indicados.
 * Si no hay sesión redirige al login; si la hay pero sin permiso, a "Acceso denegado".
 * @param roles roles autorizados
 */
export function rolGuard(...roles: Rol[]): CanMatchFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }
    return auth.tieneRol(...roles) ? true : router.createUrlTree(['/acceso-denegado']);
  };
}

/** Impide entrar al login o al registro si ya hay una sesión abierta. */
export const invitadoGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  return auth.autenticado() ? inject(Router).createUrlTree(['/inicio']) : true;
};
