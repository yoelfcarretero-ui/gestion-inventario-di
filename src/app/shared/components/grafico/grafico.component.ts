import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

/** Serie de datos de un gráfico. */
export interface SerieGrafico {
  etiqueta: string;
  datos: number[];
}

/** Elemento del gráfico pulsado por el usuario (con ratón o teclado). */
export interface SeleccionGrafico {
  indice: number;
  etiqueta: string;
  valor: number;
  serie: string;
}

/** Paleta categórica con contraste suficiente sobre fondo claro (WCAG 1.4.11, ≥ 3:1). */
export const PALETA_GRAFICOS = ['#1e40af', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#4d7c0f', '#0369a1', '#a16207'];

/**
 * Envoltorio reutilizable de Chart.js.
 *
 * - Crea el gráfico tras el primer renderizado (`afterNextRender`) y lo actualiza en sitio cuando
 *   cambian las entradas (`effect`), sin recrear el lienzo.
 * - Libera el objeto `Chart` en `ngOnDestroy` para evitar fugas de memoria.
 * - Emite `elementoSeleccionado` al pulsar una barra o sector, para que el padre aplique filtros.
 * - Accesibilidad: el `<canvas>` tiene `role="img"` y descripción; además se ofrece la tabla de datos
 *   equivalente, cuyas filas son botones, de modo que la interacción también es posible por teclado.
 */
@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrls: ['./grafico.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoComponent implements OnDestroy {
  readonly tipo = input<ChartType>('bar');
  readonly titulo = input.required<string>();
  /** Explicación breve del gráfico para lectores de pantalla. */
  readonly descripcion = input('');
  readonly etiquetas = input.required<string[]>();
  readonly series = input.required<SerieGrafico[]>();
  /** Formato de los valores en tooltips y en la tabla accesible. */
  readonly formatoValor = input<(v: number) => string>((v) => v.toLocaleString('es-ES'));
  readonly horizontal = input(false);
  /** Índice resaltado (p. ej. el filtro activo). */
  readonly resaltado = input<number | null>(null);

  readonly elementoSeleccionado = output<SeleccionGrafico>();

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico?: Chart;

  protected readonly idDescripcion = `graf-desc-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly esCircular = computed(() => ['pie', 'doughnut', 'polarArea'].includes(this.tipo()));

  constructor() {
    afterNextRender(() => this.crear());
    effect(() => {
      const config = this.configuracion();
      if (this.grafico) {
        this.grafico.data = config.data;
        this.grafico.options = config.options ?? {};
        this.grafico.update();
      }
    });
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
  }

  /** Emite la selección de un elemento (se usa también desde la tabla accesible). */
  protected seleccionar(indice: number, serie = 0): void {
    const s = this.series()[serie];
    if (!s) {
      return;
    }
    this.elementoSeleccionado.emit({ indice, etiqueta: this.etiquetas()[indice], valor: s.datos[indice], serie: s.etiqueta });
  }

  private readonly configuracion = computed<ChartConfiguration>(() => {
    const circular = this.esCircular();
    const resaltado = this.resaltado();
    const formato = this.formatoValor();
    const color = (i: number, base: string) =>
      resaltado === null || resaltado === i ? base : `${base}55`;

    return {
      type: this.tipo(),
      data: {
        labels: this.etiquetas(),
        datasets: this.series().map((s, si) => ({
          label: s.etiqueta,
          data: s.datos,
          backgroundColor: circular
            ? s.datos.map((_, i) => color(i, PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]))
            : this.tipo() === 'line'
              ? `${PALETA_GRAFICOS[si]}33`
              : s.datos.map((_, i) => color(i, PALETA_GRAFICOS[si % PALETA_GRAFICOS.length])),
          borderColor: circular ? '#ffffff' : PALETA_GRAFICOS[si % PALETA_GRAFICOS.length],
          borderWidth: this.tipo() === 'line' ? 2 : 1,
          fill: this.tipo() === 'line',
          cubicInterpolationMode: 'monotone' as const,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: this.horizontal() ? 'y' : 'x',
        onClick: (_evento, elementos) => {
          if (elementos.length) {
            this.seleccionar(elementos[0].index, elementos[0].datasetIndex);
          }
        },
        plugins: {
          legend: { display: circular || this.series().length > 1, position: 'bottom' },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formato(Number(ctx.raw))}` },
          },
        },
        scales: circular
          ? {}
          : {
              x: { ticks: { color: '#374151' }, grid: { display: !this.horizontal() ? false : true } },
              y: { ticks: { color: '#374151' }, beginAtZero: true },
            },
      },
    };
  });

  private crear(): void {
    this.grafico = new Chart(this.lienzo().nativeElement, this.configuracion());
  }
}
