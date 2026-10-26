import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, createOutline, trashOutline } from 'ionicons/icons';

import { AuthStore } from '../../core/auth/auth.store';
import { ProductoVista } from '../../core/models/producto.model';
import { InventarioStore } from '../../core/state/inventario.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { Columna } from '../../core/utils/formato.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { AccionTabla, EventoAccion, TablaDatosComponent } from '../../shared/components/tabla-datos/tabla-datos.component';
import { PaginaBase } from '../../shared/pagina-base';
import { NotificacionesService } from '../../shared/services/notificaciones.service';

/** Catálogo de productos. Lectura para todos; alta, edición y borrado solo para administradores. */
@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
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
    IonSelect,
    IonSelectOption,
    IonToggle,
    TablaDatosComponent,
    BotonAyudaComponent,
  ],
})
export class ProductosPage extends PaginaBase {
  protected readonly auth = inject(AuthStore);
  protected readonly inventario = inject(InventarioStore);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  /** Query param `?filtro=bajo-stock` (llega desde los widgets de inicio). */
  readonly filtro = input<string>();

  /** Filtros de la vista (enlazados en ambos sentidos con los controles mediante `[(ngModel)]`). */
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly soloBajoStock = linkedSignal(() => this.filtro() === 'bajo-stock');
  protected readonly busqueda = signal('');

  protected readonly filas = computed(() => {
    const categoria = this.categoriaId();
    const bajo = this.soloBajoStock();
    return this.inventario
      .productosVista()
      .filter((p) => (categoria === null || p.categoriaId === categoria) && (!bajo || p.bajoStock));
  });

  protected readonly columnas: Columna<ProductoVista>[] = [
    { clave: 'sku', etiqueta: 'SKU' },
    { clave: 'nombre', etiqueta: 'Nombre' },
    { clave: 'categoria', etiqueta: 'Categoría', ocultarEnMovil: true },
    { clave: 'proveedor', etiqueta: 'Proveedor', ocultarEnMovil: true },
    { clave: 'precio', etiqueta: 'Precio', tipo: 'moneda' },
    {
      clave: 'stock',
      etiqueta: 'Stock',
      tipo: 'numero',
      formato: (p) => `${p.stock.toLocaleString('es-ES')}${p.bajoStock ? ' ⚠ bajo mínimo' : ''}`,
    },
  ];

  protected readonly acciones: AccionTabla<ProductoVista>[] = [
    { id: 'editar', etiqueta: 'Editar', icono: 'create-outline' },
    { id: 'eliminar', etiqueta: 'Eliminar', icono: 'trash-outline', color: 'danger' },
  ];

  constructor() {
    super();
    addIcons({ add, createOutline, trashOutline });
  }

  protected alEntrar(): void {
    void this.inventario.cargar();
  }

  protected nuevo(): void {
    void this.router.navigate(['/productos/nuevo']);
  }

  /** Recibe los eventos emitidos por la tabla de datos. */
  protected async alAccion({ accion, fila }: EventoAccion<ProductoVista>): Promise<void> {
    if (accion === 'editar') {
      void this.router.navigate(['/productos', fila.id, 'editar']);
      return;
    }
    const confirmado = await this.avisos.confirmar(
      'Eliminar producto',
      `¿Seguro que quieres eliminar «${fila.nombre}» (${fila.sku})? Esta acción no se puede deshacer.`,
    );
    if (!confirmado) {
      return;
    }
    try {
      await this.inventario.eliminar(fila.id);
      await this.avisos.exito(`Producto ${fila.sku} eliminado.`);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    }
  }
}
