import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment, UrlTree, provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { Usuario } from '../models/usuario.model';
import { autenticadoGuard, invitadoGuard, rolGuard } from './auth.guards';
import { AuthStore } from './auth.store';

const usuario = (rol: Usuario['rol']): Usuario => ({
  id: 9,
  nombre: 'Prueba',
  email: 'prueba@prueba.test',
  rol,
  activo: true,
  creadoEn: '2026-01-01T00:00:00Z',
});

describe('Guards de autenticación y rol', () => {
  let store: InstanceType<typeof AuthStore>;
  let router: Router;

  const ejecutar = (guard: typeof autenticadoGuard, ruta = 'dashboard') =>
    TestBed.runInInjectionContext(() =>
      guard({} as Route, [new UrlSegment(ruta, {})], {} as Parameters<typeof autenticadoGuard>[2]),
    );
  const url = (resultado: unknown) => router.serializeUrl(resultado as UrlTree);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  it('sin sesión redirige al login conservando la ruta de destino', () => {
    expect(url(ejecutar(autenticadoGuard))).toBe('/login?volverA=%2Fdashboard');
  });

  it('con sesión deja pasar a las rutas autenticadas', () => {
    patchState(unprotected(store), { token: 'x', usuario: usuario('usuario') });
    expect(ejecutar(autenticadoGuard)).toBe(true);
  });

  it('un usuario estándar no puede entrar en rutas de administrador', () => {
    patchState(unprotected(store), { token: 'x', usuario: usuario('usuario') });
    expect(url(ejecutar(rolGuard('admin')))).toBe('/acceso-denegado');
  });

  it('un administrador sí puede entrar en rutas de administrador', () => {
    patchState(unprotected(store), { token: 'x', usuario: usuario('admin') });
    expect(ejecutar(rolGuard('admin'))).toBe(true);
  });

  it('con sesión abierta no se muestra el login', () => {
    patchState(unprotected(store), { token: 'x', usuario: usuario('admin') });
    expect(url(ejecutar(invitadoGuard))).toBe('/inicio');
  });
});
