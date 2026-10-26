import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { AppComponent } from './app.component';
import { AuthStore } from './core/auth/auth.store';
import { Usuario } from './core/models/usuario.model';

const usuario = (rol: Usuario['rol']): Usuario => ({
  id: 1,
  nombre: 'Ana Prueba',
  email: 'ana@prueba.test',
  rol,
  activo: true,
  creadoEn: '2026-01-01T00:00:00Z',
});

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  const entradasMenu = async (rol: Usuario['rol']) => {
    patchState(unprotected(TestBed.inject(AuthStore)), { token: 'x', usuario: usuario(rol) });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    // ion-label es un componente Stencil que reubica su contenido de forma asíncrona: se lee innerHTML.
    return Array.from(fixture.nativeElement.querySelectorAll('ion-menu ion-item ion-label') as NodeListOf<HTMLElement>).map(
      (e) => e.innerHTML.replace(/<!--.*?-->/g, '').trim(),
    );
  };

  it('se crea', () => {
    expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();
  });

  it('muestra al administrador todas las secciones', async () => {
    expect(await entradasMenu('admin')).toEqual(['Inicio', 'Cuadro de mando', 'Productos', 'Pedidos', 'Informes', 'Usuarios', 'Ayuda']);
  });

  it('oculta al usuario estándar las secciones de administración', async () => {
    expect(await entradasMenu('usuario')).toEqual(['Inicio', 'Productos', 'Pedidos', 'Informes', 'Ayuda']);
  });

  it('incluye el enlace para saltar al contenido', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a.saltar').textContent).toContain('Saltar al contenido');
  });
});
