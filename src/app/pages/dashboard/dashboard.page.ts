import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircle, cubeOutline, documentOutline, cashOutline, cartOutline, receiptOutline, refresh } from 'ionicons/icons';
import { first, firstValueFrom } from 'rxjs';

import { EstadoPedido } from '../../core/models/pedido.model';
import { PedidosService } from '../../core/services/pedidos.service';
import { InformesService } from '../../core/services/informes.service';
import { InventarioStore } from '../../core/state/inventario.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { formatearMoneda, formatearNumero } from '../../core/utils/formato.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { GraficoComponent, SeleccionGrafico } from '../../shared/components/grafico/grafico.component';
import { WidgetEstadisticoComponent } from '../../shared/components/widget-estadistico/widget-estadistico.component';
import { PaginaBase } from '../../shared/pagina-base';
import { consolidar } from './dashboard.calculos';

/**
 * Cuadro de mando del Administrador.
 *
 * Combina los pedidos en tiempo real (NoSQL) con el catálogo (SQL). Los filtros son señales:
 * cualquier cambio —en un selector, al pulsar un gráfico o al llegar un pedido nuevo— recalcula
 * los datos consolidados y actualiza los gráficos al instante.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonButton,
    IonSpinner,
    WidgetEstadisticoComponent,
    GraficoComponent,
    BotonAyudaComponent,
  ],
})
export class DashboardPage extends PaginaBase {
  protected readonly inventario = inject(InventarioStore);
  private readonly pedidosService = inject(PedidosService);
  private readonly informes = inject(InformesService);

  private readonly pedidos = toSignal(this.pedidosService.todos$());

  // Filtros (enlazados con [(ngModel)] y modificables desde los gráficos)
  protected readonly meses = signal(12);
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly estado = signal<EstadoPedido | null>(null);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly ultimaActualizacion = signal<Date | null>(null);

  protected readonly datos = computed(() =>
    consolidar(this.pedidos() ?? [], this.inventario.categorias(), {
      meses: this.meses(),
      categoriaId: this.categoriaId(),
      estado: this.estado(),
    }),
  );

  protected readonly nombreCategoria = computed(
    () => this.inventario.categorias().find((c) => c.id === this.categoriaId())?.nombre ?? null,
  );
  protected readonly indiceCategoria = computed(() => {
    const i = this.datos().porCategoria.ids.indexOf(this.categoriaId() ?? -1);
    return i === -1 ? null : i;
  });
  protected readonly indiceEstado = computed(() => {
    const i = this.datos().porEstado.estados.indexOf(this.estado() as EstadoPedido);
    return i === -1 ? null : i;
  });

  protected readonly formatearMoneda = formatearMoneda;
  protected readonly formatearNumero = formatearNumero;
  protected readonly formatoUnidades = (v: number) => `${formatearNumero(v)} uds.`;
  protected readonly formatoPedidos = (v: number) => `${formatearNumero(v)} pedidos`;

  constructor() {
    super();
    addIcons({ closeCircle, cubeOutline, documentOutline, cashOutline, cartOutline, receiptOutline, refresh });
  }

  protected async alEntrar(): Promise<void> {
    await this.recargar();
  }

  /**
   * Carga concurrente de ambos orígenes con `Promise.all`: el catálogo SQL (que internamente usa
   * `forkJoin` para productos, categorías y proveedores) y la primera instantánea de pedidos NoSQL.
   */
  protected async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      await Promise.all([
        this.inventario.cargar(true),
        firstValueFrom(this.pedidosService.todos$().pipe(first())),
      ]);
      if (this.inventario.error()) {
        throw new Error(this.inventario.error()!);
      }
      this.ultimaActualizacion.set(new Date());
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Al pulsar una categoría del gráfico se filtra por ella (o se quita el filtro si ya estaba). */
  protected alSeleccionarCategoria(sel: SeleccionGrafico): void {
    const id = this.datos().porCategoria.ids[sel.indice];
    this.categoriaId.update((actual) => (actual === id ? null : id));
  }

  protected alSeleccionarEstado(sel: SeleccionGrafico): void {
    const estado = this.datos().porEstado.estados[sel.indice];
    this.estado.update((actual) => (actual === estado ? null : estado));
  }

  protected limpiarFiltros(): void {
    this.categoriaId.set(null);
    this.estado.set(null);
  }

  /** Exporta el resumen consolidado del cuadro de mando a PDF. */
  protected async exportarResumen(): Promise<void> {
    const d = this.datos();
    const filas = d.ventasMensuales.etiquetas.map((mes, i) => ({ mes, ventas: d.ventasMensuales.valores[i] }));
    await this.informes.exportarPdf({
      titulo: 'Cuadro de mando — ventas mensuales',
      subtitulo: this.descripcionFiltros(),
      columnas: [
        { clave: 'mes', etiqueta: 'Mes' },
        { clave: 'ventas', etiqueta: 'Ventas', tipo: 'moneda' },
      ],
      filas,
      resumen: [
        { etiqueta: 'Facturación', valor: formatearMoneda(d.facturacion) },
        { etiqueta: 'Pedidos', valor: formatearNumero(d.numPedidos) },
        { etiqueta: 'Ticket medio', valor: formatearMoneda(d.ticketMedio) },
        { etiqueta: 'Unidades vendidas', valor: formatearNumero(d.unidades) },
      ],
      nombreFichero: 'cuadro-de-mando',
    });
  }

  protected descripcionFiltros(): string {
    const partes = [`Últimos ${this.meses()} meses`];
    if (this.nombreCategoria()) {
      partes.push(`categoría ${this.nombreCategoria()}`);
    }
    if (this.estado()) {
      partes.push(`estado ${this.estado()}`);
    }
    return partes.join(' · ');
  }
}
