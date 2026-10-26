import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, checkmarkDoneOutline, closeCircleOutline, paperPlaneOutline, radioOutline } from 'ionicons/icons';
import { switchMap } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { EstadoPedido, LineaPedido, Pedido } from '../../core/models/pedido.model';
import { PedidosService } from '../../core/services/pedidos.service';
import { InventarioStore } from '../../core/state/inventario.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { Columna, formatearFecha, formatearMoneda } from '../../core/utils/formato.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { AccionTabla, EventoAccion, TablaDatosComponent } from '../../shared/components/tabla-datos/tabla-datos.component';
import { NotificacionesService } from '../../shared/services/notificaciones.service';

type FiltroEstado = EstadoPedido | 'todos';

/**
 * Listado de pedidos en tiempo real (origen NoSQL).
 * Los administradores ven todos y pueden cambiar su estado; los usuarios ven y cancelan los suyos.
 */
@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.page.html',
  styleUrls: ['./pedidos.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    TablaDatosComponent,
    BotonAyudaComponent,
  ],
})
export class PedidosPage {
  protected readonly auth = inject(AuthStore);
  private readonly servicio = inject(PedidosService);
  private readonly inventario = inject(InventarioStore);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  /** Query param `?estado=` para abrir la vista ya filtrada. */
  readonly estado = input<string>();
  protected readonly filtro = linkedSignal<FiltroEstado>(() => (this.estado() as FiltroEstado) || 'todos');
  protected readonly busqueda = signal('');
  protected readonly seleccionado = signal<Pedido | null>(null);

  protected readonly pedidos = toSignal(
    toObservable(this.auth.usuario).pipe(switchMap((u) => this.servicio.visiblesPara$(u))),
  );

  protected readonly filas = computed(() => {
    const filtro = this.filtro();
    return (this.pedidos() ?? []).filter((p) => filtro === 'todos' || p.estado === filtro);
  });

  /** Mantiene sincronizado el detalle con los cambios en tiempo real del pedido abierto. */
  protected readonly detalle = computed(() => {
    const id = this.seleccionado()?.id;
    return id ? ((this.pedidos() ?? []).find((p) => p.id === id) ?? null) : null;
  });

  protected readonly contadores = computed(() => {
    const c: Record<FiltroEstado, number> = { todos: 0, pendiente: 0, enviado: 0, entregado: 0, cancelado: 0 };
    for (const p of this.pedidos() ?? []) {
      c.todos++;
      c[p.estado]++;
    }
    return c;
  });

  protected readonly filtros: { valor: FiltroEstado; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'enviado', etiqueta: 'Enviados' },
    { valor: 'entregado', etiqueta: 'Entregados' },
    { valor: 'cancelado', etiqueta: 'Cancelados' },
  ];

  protected readonly columnas = computed<Columna<Pedido>[]>(() => [
    { clave: 'id', etiqueta: 'Pedido' },
    ...(this.auth.esAdmin() ? [{ clave: 'usuarioNombre' as const, etiqueta: 'Cliente' }] : []),
    { clave: 'creadoEn', etiqueta: 'Fecha', tipo: 'fecha' },
    { clave: 'lineas', etiqueta: 'Artículos', ordenable: false, ocultarEnMovil: true, formato: (p) => `${p.lineas.reduce((s, l) => s + l.cantidad, 0)}` },
    { clave: 'total', etiqueta: 'Total', tipo: 'moneda' },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'estado' },
  ]);

  protected readonly acciones = computed<AccionTabla<Pedido>[]>(() =>
    this.auth.esAdmin()
      ? [
          { id: 'enviado', etiqueta: 'Marcar como enviado', icono: 'paper-plane-outline', visible: (p) => p.estado === 'pendiente' },
          { id: 'entregado', etiqueta: 'Marcar como entregado', icono: 'checkmark-done-outline', color: 'success', visible: (p) => p.estado === 'enviado' },
          { id: 'cancelado', etiqueta: 'Cancelar pedido', icono: 'close-circle-outline', color: 'danger', visible: (p) => p.estado === 'pendiente' },
        ]
      : [{ id: 'cancelado', etiqueta: 'Cancelar pedido', icono: 'close-circle-outline', color: 'danger', visible: (p) => p.estado === 'pendiente' }],
  );

  protected readonly formatearMoneda = formatearMoneda;
  protected readonly formatearFecha = formatearFecha;
  protected readonly subtotal = (l: LineaPedido) => formatearMoneda(l.cantidad * l.precioUnitario);

  constructor() {
    addIcons({ add, paperPlaneOutline, checkmarkDoneOutline, closeCircleOutline, radioOutline });
  }

  protected nuevo(): void {
    void this.router.navigate(['/pedidos/nuevo']);
  }

  protected async alAccion({ accion, fila }: EventoAccion<Pedido>): Promise<void> {
    const estado = accion as EstadoPedido;
    if (estado === 'cancelado') {
      const ok = await this.avisos.confirmar('Cancelar pedido', `¿Cancelar el pedido ${fila.id}? Se repondrá el stock.`, 'Cancelar pedido');
      if (!ok) {
        return;
      }
    }
    try {
      await this.servicio.cambiarEstado(fila.id, estado);
      if (estado === 'cancelado') {
        await this.servicio.reponerStock(fila);
        this.inventario.invalidar();
      }
      await this.avisos.exito(`Pedido ${fila.id}: ${estado}.`);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    }
  }
}
