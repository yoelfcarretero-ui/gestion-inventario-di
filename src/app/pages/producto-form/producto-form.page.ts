import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonRouterLink,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { ProductoEditable } from '../../core/models/producto.model';
import { ProductosService } from '../../core/services/productos.service';
import { InventarioStore } from '../../core/state/inventario.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { mensajeValidacion, senalFormulario } from '../../core/utils/formularios.util';
import { valorDisponibleValidator } from '../../core/validators/validadores-asincronos';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { PaginaBase } from '../../shared/pagina-base';
import { NotificacionesService } from '../../shared/services/notificaciones.service';

/** Alta y edición de productos (solo Administrador). */
@Component({
  selector: 'app-producto-form',
  templateUrl: './producto-form.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    BotonAyudaComponent,
  ],
})
export class ProductoFormPage extends PaginaBase {
  private readonly api = inject(ProductosService);
  protected readonly inventario = inject(InventarioStore);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  /** Parámetro de ruta `:id` (vacío en el alta). */
  readonly id = input<string>();
  protected readonly idProducto = computed(() => (this.id() ? Number(this.id()) : null));
  protected readonly esEdicion = computed(() => this.idProducto() !== null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    sku: [
      '',
      {
        validators: [Validators.required, Validators.pattern(/^[A-Za-z]{3}-\d{4}$/)],
        asyncValidators: [
          valorDisponibleValidator((v) => this.api.skuDisponible(v, this.idProducto() ?? undefined), 'skuOcupado'),
        ],
      },
    ],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    descripcion: ['', [Validators.maxLength(300)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    proveedorId: [0, [Validators.required, Validators.min(1)]],
    precio: [0, [Validators.required, Validators.min(0.01), Validators.max(100000)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    stockMinimo: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  private readonly cambios = senalFormulario(this.form);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Mensajes de error de cada campo, recalculados cuando cambia el formulario. */
  protected readonly errores = computed(() => {
    this.cambios();
    const c = this.form.controls;
    return {
      sku: mensajeValidacion(c.sku, {
        pattern: 'Formato AAA-0000 (tres letras, guion y cuatro números).',
        skuOcupado: 'Ya existe un producto con este SKU.',
      }),
      nombre: mensajeValidacion(c.nombre),
      descripcion: mensajeValidacion(c.descripcion),
      categoriaId: mensajeValidacion(c.categoriaId, { min: 'Selecciona una categoría.' }),
      proveedorId: mensajeValidacion(c.proveedorId, { min: 'Selecciona un proveedor.' }),
      precio: mensajeValidacion(c.precio),
      stock: mensajeValidacion(c.stock, { pattern: 'Debe ser un número entero.' }),
      stockMinimo: mensajeValidacion(c.stockMinimo, { pattern: 'Debe ser un número entero.' }),
    };
  });

  protected readonly ayudaSku = computed(() => {
    this.cambios();
    const sku = this.form.controls.sku;
    if (sku.pending) {
      return 'Comprobando que el SKU no exista…';
    }
    return sku.valid && sku.dirty ? 'SKU disponible.' : 'Ejemplo: INF-0010';
  });

  protected async alEntrar(): Promise<void> {
    void this.inventario.cargar();
    this.error.set(null);
    const id = this.idProducto();
    if (id === null) {
      this.form.reset();
      return;
    }
    this.cargando.set(true);
    try {
      const { id: _id, actualizadoEn: _fecha, ...datos } = await firstValueFrom(this.api.obtener(id));
      this.form.reset(datos);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      this.enfocarPrimerError();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      const datos: ProductoEditable = {
        ...v,
        sku: v.sku.toUpperCase(),
        precio: Number(v.precio),
        stock: Number(v.stock),
        stockMinimo: Number(v.stockMinimo),
      };
      const guardado = await this.inventario.guardar(datos, this.idProducto() ?? undefined);
      await this.avisos.exito(`Producto ${guardado.sku} ${this.esEdicion() ? 'actualizado' : 'creado'}.`);
      await this.router.navigate(['/productos']);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  /** Lleva el foco al primer campo con error (WCAG 3.3.1). */
  private enfocarPrimerError(): void {
    setTimeout(() => {
      const campo = document.querySelector<HTMLElement>('app-producto-form .ion-invalid.ion-touched');
      (campo as unknown as { setFocus?: () => void })?.setFocus?.();
    });
  }
}
