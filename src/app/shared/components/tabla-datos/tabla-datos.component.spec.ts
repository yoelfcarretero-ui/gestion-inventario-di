import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Columna } from '../../../core/utils/formato.util';
import { AccionTabla, EventoAccion, TablaDatosComponent } from './tabla-datos.component';

interface Fila {
  id: number;
  nombre: string;
  precio: number;
}

/** Componente anfitrión para probar la tabla como la usaría una vista real. */
@Component({
  imports: [TablaDatosComponent],
  template: `
    <app-tabla-datos
      titulo="Prueba"
      [columnas]="columnas"
      [filas]="filas()"
      [acciones]="acciones"
      [tamPagina]="2"
      [(busqueda)]="busqueda"
      (accion)="eventos.push($event)"
    />
  `,
})
class AnfitrionComponent {
  columnas: Columna<Fila>[] = [
    { clave: 'nombre', etiqueta: 'Nombre' },
    { clave: 'precio', etiqueta: 'Precio', tipo: 'numero' },
  ];
  filas = signal<Fila[]>([
    { id: 1, nombre: 'Teclado', precio: 30 },
    { id: 2, nombre: 'Ratón', precio: 10 },
    { id: 3, nombre: 'Monitor', precio: 150 },
  ]);
  acciones: AccionTabla<Fila>[] = [{ id: 'editar', etiqueta: 'Editar', icono: 'create-outline' }];
  busqueda = signal('');
  eventos: EventoAccion<Fila>[] = [];
}

describe('TablaDatosComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let anfitrion: AnfitrionComponent;

  const celdasNombre = () =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr td:first-child') as NodeListOf<HTMLElement>).map((td) =>
      td.textContent?.trim(),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnfitrionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    anfitrion = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('pagina los resultados', () => {
    expect(celdasNombre()).toEqual(['Teclado', 'Ratón']);
    expect(fixture.nativeElement.querySelector('.paginacion').textContent).toContain('Página 1 de 2');
  });

  it('filtra sin distinguir tildes ni mayúsculas mediante el enlace bidireccional', async () => {
    anfitrion.busqueda.set('RATON');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(celdasNombre()).toEqual(['Ratón']);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('1 resultado');
  });

  it('actualiza el padre al escribir en el buscador', async () => {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'mon';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(anfitrion.busqueda()).toBe('mon');
  });

  it('ordena por columna y expone aria-sort', async () => {
    const boton = fixture.nativeElement.querySelectorAll('th button')[1] as HTMLButtonElement;
    boton.click(); // ascendente por precio
    fixture.detectChanges();
    await fixture.whenStable();
    expect(celdasNombre()).toEqual(['Ratón', 'Teclado']);
    expect(boton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');

    boton.click(); // descendente
    fixture.detectChanges();
    await fixture.whenStable();
    expect(celdasNombre()).toEqual(['Monitor', 'Teclado']);
    expect(boton.closest('th')?.getAttribute('aria-sort')).toBe('descending');
  });

  it('emite el evento de acción con la fila al padre', () => {
    const accion = fixture.nativeElement.querySelector('td.acciones ion-button') as HTMLElement;
    accion.click();
    expect(anfitrion.eventos).toEqual([{ accion: 'editar', fila: anfitrion.filas()[0] }]);
  });
});
