import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import { IonIcon, IonSkeletonText } from '@ionic/angular';

/**
 * Tarjeta de indicador (KPI) reutilizable.
 *
 * Muestra una etiqueta, un valor destacado, un icono y, opcionalmente, un detalle.
 * Si es `interactivo` se renderiza como `<button>` (accesible por teclado) y emite `seleccionado`
 * al pulsarse, de modo que la vista padre decide qué hacer (filtrar, navegar...).
 *
 * @example
 * <app-widget-estadistico etiqueta="Bajo stock" [valor]="5" icono="alert-circle" color="danger"
 *   interactivo (seleccionado)="filtrarBajoStock()" />
 */
@Component({
  selector: 'app-widget-estadistico',
  templateUrl: './widget-estadistico.component.html',
  styleUrls: ['./widget-estadistico.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, IonIcon, IonSkeletonText],
})
export class WidgetEstadisticoComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string | number>();
  /** Nombre del icono de Ionicons (debe estar registrado con `addIcons`). */
  readonly icono = input('stats-chart');
  readonly color = input<'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger'>('primary');
  readonly detalle = input<string | null>(null);
  readonly cargando = input(false);
  readonly interactivo = input(false, { transform: booleanAttribute });
  /** Marca el widget como activo (por ejemplo, cuando su filtro está aplicado). */
  readonly activo = input(false, { transform: booleanAttribute });

  readonly seleccionado = output<void>();

  protected readonly descripcion = computed(
    () => `${this.etiqueta()}: ${this.valor()}${this.detalle() ? '. ' + this.detalle() : ''}`,
  );
}
