import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, swapVertical, arrowUp, arrowDown, searchOutline, refresh } from 'ionicons/icons';

import { Columna, normalizar, valorCelda } from '../../../core/utils/formato.util';

/** Acción disponible en cada fila (editar, eliminar...). */
export interface AccionTabla<T> {
  id: string;
  etiqueta: string;
  icono: string;
  color?: string;
  /** Si se indica, la acción solo se muestra en las filas para las que devuelve `true`. */
  visible?: (fila: T) => boolean;
}

/** Evento emitido al pulsar una acción de fila. */
export interface EventoAccion<T> {
  accion: string;
  fila: T;
}

/** Criterio de ordenación actual. */
export interface Orden {
  clave: string;
  direccion: 'asc' | 'desc';
}

/**
 * Tabla de datos avanzada, reutilizable y agnóstica de la vista que la contiene.
 *
 * - Recibe columnas y filas por `input()`; no conoce el origen de los datos.
 * - Búsqueda de texto libre con *two-way binding* (`[(busqueda)]`), ordenación por columna y paginación.
 * - Notifica al padre mediante eventos: `filaSeleccionada`, `accion` y `reintentar`.
 * - Accesible: `<table>` semántica con `caption`, `scope`, `aria-sort`, región `aria-live` con el número
 *   de resultados y navegación completa por teclado. En móvil cada fila se muestra como una tarjeta.
 * - `OnPush` + señales computadas: solo se recalcula lo que cambia.
 *
 * @example
 * <app-tabla-datos titulo="Productos" [columnas]="columnas" [filas]="productos()"
 *   [acciones]="acciones" (accion)="alPulsar($event)" [(busqueda)]="texto" />
 */
@Component({
  selector: 'app-tabla-datos',
  templateUrl: './tabla-datos.component.html',
  styleUrls: ['./tabla-datos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonButton, IonIcon, IonSpinner],
})
export class TablaDatosComponent<T extends object> {
  /** Título de la tabla (se usa como `<caption>`). */
  readonly titulo = input.required<string>();
  readonly columnas = input.required<Columna<T>[]>();
  readonly filas = input.required<T[]>();
  readonly acciones = input<AccionTabla<T>[]>([]);
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly tamPagina = input(10);
  readonly textoVacio = input('No hay registros que mostrar.');
  /** Permite seleccionar filas con clic o teclado (emite `filaSeleccionada`). */
  readonly seleccionable = input(false, { transform: booleanAttribute });
  /** Propiedad usada como identificador estable de cada fila. */
  readonly claveFila = input<keyof T & string>('id' as keyof T & string);
  /** Columna usada para nombrar la fila en los `aria-label` de las acciones. */
  readonly columnaNombre = input<keyof T & string | null>(null);

  /** Texto de búsqueda (enlace bidireccional con el padre). */
  readonly busqueda = model('');

  readonly filaSeleccionada = output<T>();
  readonly accion = output<EventoAccion<T>>();
  readonly reintentar = output<void>();

  protected readonly orden = signal<Orden | null>(null);
  /** Vuelve a la primera página cuando cambian los datos o la búsqueda. */
  protected readonly pagina = linkedSignal({
    source: () => [this.filas(), this.busqueda()] as const,
    computation: () => 1,
  });
  protected readonly idBusqueda = `busqueda-${Math.random().toString(36).slice(2, 8)}`;

  protected readonly filtradas = computed(() => {
    const termino = normalizar(this.busqueda().trim());
    if (!termino) {
      return this.filas();
    }
    const columnas = this.columnas();
    return this.filas().filter((fila) => columnas.some((c) => normalizar(valorCelda(fila, c)).includes(termino)));
  });

  protected readonly ordenadas = computed(() => {
    const orden = this.orden();
    if (!orden) {
      return this.filtradas();
    }
    const factor = orden.direccion === 'asc' ? 1 : -1;
    return [...this.filtradas()].sort((a, b) => {
      const va = a[orden.clave as keyof T] as unknown;
      const vb = b[orden.clave as keyof T] as unknown;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * factor;
      }
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * factor;
    });
  });

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.ordenadas().length / this.tamPagina())));

  protected readonly visibles = computed(() => {
    const inicio = (Math.min(this.pagina(), this.totalPaginas()) - 1) * this.tamPagina();
    return this.ordenadas().slice(inicio, inicio + this.tamPagina());
  });

  protected readonly hayAcciones = computed(() => this.acciones().length > 0);
  protected readonly valorCelda = valorCelda;

  constructor() {
    addIcons({ chevronBack, chevronForward, swapVertical, arrowUp, arrowDown, searchOutline, refresh });
  }

  /** Alterna la ordenación: ascendente → descendente → sin ordenar. */
  protected ordenarPor(columna: Columna<T>): void {
    const actual = this.orden();
    if (actual?.clave !== columna.clave) {
      this.orden.set({ clave: columna.clave, direccion: 'asc' });
    } else if (actual.direccion === 'asc') {
      this.orden.set({ clave: columna.clave, direccion: 'desc' });
    } else {
      this.orden.set(null);
    }
  }

  protected ariaSort(columna: Columna<T>): 'ascending' | 'descending' | 'none' {
    const orden = this.orden();
    if (orden?.clave !== columna.clave) {
      return 'none';
    }
    return orden.direccion === 'asc' ? 'ascending' : 'descending';
  }

  protected irAPagina(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  protected seleccionar(fila: T): void {
    if (this.seleccionable()) {
      this.filaSeleccionada.emit(fila);
    }
  }

  protected accionesDe(fila: T): AccionTabla<T>[] {
    return this.acciones().filter((a) => !a.visible || a.visible(fila));
  }

  protected nombreFila(fila: T): string {
    const clave = this.columnaNombre() ?? this.columnas()[0]?.clave;
    return clave ? String(fila[clave]) : '';
  }

  protected idDe(fila: T): unknown {
    return fila[this.claveFila()];
  }
}
