import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, cartOutline, cashOutline, cubeOutline, timeOutline, walletOutline } from 'ionicons/icons';
import { switchMap } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { Pedido } from '../../core/models/pedido.model';
import { ProductoVista } from '../../core/models/producto.model';
import { PedidosService } from '../../core/services/pedidos.service';
import { InventarioStore } from '../../core/state/inventario.store';
import { Columna, formatearMoneda, formatearNumero } from '../../core/utils/formato.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { PaginaBase } from '../../shared/pagina-base';
import { TablaDatosComponent } from '../../shared/components/tabla-datos/tabla-datos.component';
import { WidgetEstadisticoComponent } from '../../shared/components/widget-estadistico/widget-estadistico.component';

/** Página de inicio: resumen adaptado al rol del usuario. */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    WidgetEstadisticoComponent,
    TablaDatosComponent,
    BotonAyudaComponent,
  ],
})
export class InicioPage extends PaginaBase {
  protected readonly auth = inject(AuthStore);
  protected readonly inventario = inject(InventarioStore);
  private readonly router = inject(Router);
  private readonly pedidosService = inject(PedidosService);

  /** Pedidos visibles para el usuario actual, en tiempo real. `undefined` mientras conecta. */
  protected readonly pedidos = toSignal(
    toObservable(this.auth.usuario).pipe(switchMap((u) => this.pedidosService.visiblesPara$(u))),
  );

  protected readonly cargandoPedidos = computed(() => this.pedidos() === undefined);
  protected readonly recientes = computed(() => (this.pedidos() ?? []).slice(0, 5));
  protected readonly pendientes = computed(() => (this.pedidos() ?? []).filter((p) => p.estado === 'pendiente').length);
  protected readonly importeTotal = computed(() =>
    formatearMoneda((this.pedidos() ?? []).filter((p) => p.estado !== 'cancelado').reduce((s, p) => s + p.total, 0)),
  );
  protected readonly bajoStock = computed(() => this.inventario.productosVista().filter((p) => p.bajoStock));

  protected readonly saludo = computed(() => {
    const hora = new Date().getHours();
    const nombre = this.auth.usuario()?.nombre.split(' ')[0] ?? '';
    return `${hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${nombre}`;
  });

  protected readonly formatearMoneda = formatearMoneda;
  protected readonly formatearNumero = formatearNumero;

  protected readonly columnasPedidos: Columna<Pedido>[] = [
    { clave: 'id', etiqueta: 'Pedido' },
    { clave: 'usuarioNombre', etiqueta: 'Cliente', ocultarEnMovil: true },
    { clave: 'creadoEn', etiqueta: 'Fecha', tipo: 'fecha' },
    { clave: 'total', etiqueta: 'Total', tipo: 'moneda' },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'estado' },
  ];

  protected readonly columnasStock: Columna<ProductoVista>[] = [
    { clave: 'sku', etiqueta: 'SKU' },
    { clave: 'nombre', etiqueta: 'Producto' },
    { clave: 'stock', etiqueta: 'Stock', tipo: 'numero' },
    { clave: 'stockMinimo', etiqueta: 'Mínimo', tipo: 'numero' },
  ];

  constructor() {
    super();
    addIcons({ cubeOutline, cashOutline, alertCircleOutline, timeOutline, cartOutline, walletOutline });
  }

  protected alEntrar(): void {
    void this.inventario.cargar();
  }

  protected ir(url: string, queryParams?: Record<string, string>): void {
    void this.router.navigate([url], { queryParams });
  }
}
