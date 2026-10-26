import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, trashOutline } from 'ionicons/icons';

import { AuthStore } from '../../core/auth/auth.store';
import { LineaPedido } from '../../core/models/pedido.model';
import { PedidosService } from '../../core/services/pedidos.service';
import { InventarioStore } from '../../core/state/inventario.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { formatearMoneda } from '../../core/utils/formato.util';
import { mensajeValidacion, senalFormulario } from '../../core/utils/formularios.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { PaginaBase } from '../../shared/pagina-base';
import { NotificacionesService } from '../../shared/services/notificaciones.service';

type GrupoLinea = FormGroup<{
  productoId: FormControl<number>;
  cantidad: FormControl<number>;
}>;

/** Validador del FormArray: no se puede repetir un producto en dos líneas. */
function sinDuplicados(array: AbstractControl): ValidationErrors | null {
  const ids = (array.value as { productoId: number }[]).map((l) => l.productoId).filter(Boolean);
  return new Set(ids).size !== ids.length ? { duplicado: true } : null;
}

/** Formulario de nuevo pedido con líneas dinámicas (FormArray). */
@Component({
  selector: 'app-pedido-form',
  templateUrl: './pedido-form.page.html',
  styleUrls: ['./pedido-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    BotonAyudaComponent,
  ],
})
export class PedidoFormPage extends PaginaBase {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  protected readonly inventario = inject(InventarioStore);
  private readonly pedidos = inject(PedidosService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  protected readonly lineas: FormArray<GrupoLinea> = this.fb.array<GrupoLinea>([], {
    validators: [Validators.required, sinDuplicados],
  });
  protected readonly form = this.fb.group({ lineas: this.lineas });

  private readonly cambios = senalFormulario(this.form);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Productos con stock disponible para elegir. */
  protected readonly disponibles = computed(() => this.inventario.productosVista().filter((p) => p.stock > 0));

  /** Vista de cada línea: grupo del formulario, producto elegido, subtotal y mensajes de error. */
  protected readonly resumenLineas = computed(() => {
    this.cambios();
    const productos = new Map(this.inventario.productos().map((p) => [p.id, p]));
    return this.lineas.controls.map((g) => {
      const producto = productos.get(g.controls.productoId.value);
      const cantidad = Number(g.controls.cantidad.value) || 0;
      return {
        grupo: g,
        producto,
        subtotal: producto ? cantidad * producto.precio : 0,
        errorProducto: mensajeValidacion(g.controls.productoId, { min: 'Selecciona un producto.' }),
        errorCantidad: mensajeValidacion(g.controls.cantidad, {
          max: `Solo hay ${producto?.stock ?? 0} unidades disponibles.`,
          pattern: 'Debe ser un número entero.',
        }),
      };
    });
  });

  protected readonly total = computed(() => this.resumenLineas().reduce((s, l) => s + l.subtotal, 0));
  protected readonly errorDuplicado = computed(() => (this.cambios(), this.lineas.hasError('duplicado')));
  protected readonly formatearMoneda = formatearMoneda;

  constructor() {
    super();
    addIcons({ addCircleOutline, trashOutline });
  }

  protected alEntrar(): void {
    void this.inventario.cargar();
    this.lineas.clear();
    this.agregarLinea();
    this.error.set(null);
  }

  protected agregarLinea(): void {
    const grupo: GrupoLinea = this.fb.group({
      productoId: [0, [Validators.required, Validators.min(1)]],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    });
    // El máximo de unidades depende del producto elegido: se actualiza el validador al cambiarlo.
    grupo.controls.productoId.valueChanges.subscribe((id) => {
      const stock = this.inventario.productos().find((p) => p.id === id)?.stock ?? 0;
      grupo.controls.cantidad.setValidators([Validators.required, Validators.min(1), Validators.max(stock), Validators.pattern(/^\d+$/)]);
      grupo.controls.cantidad.updateValueAndValidity();
    });
    this.lineas.push(grupo);
  }

  protected quitarLinea(indice: number): void {
    this.lineas.removeAt(indice);
  }

  protected async confirmar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const usuario = this.auth.usuario();
    if (!usuario) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const productos = new Map(this.inventario.productos().map((p) => [p.id, p]));
      const lineas: LineaPedido[] = this.lineas.getRawValue().map(({ productoId, cantidad }) => {
        const p = productos.get(productoId)!;
        return { productoId, sku: p.sku, nombre: p.nombre, categoriaId: p.categoriaId, cantidad: Number(cantidad), precioUnitario: p.precio };
      });
      const pedido = await this.pedidos.crear({ usuarioId: usuario.id, usuarioNombre: usuario.nombre, lineas });
      this.inventario.invalidar();
      await this.avisos.exito(`Pedido ${pedido.id} registrado.`);
      await this.router.navigate(['/pedidos']);
    } catch (e) {
      this.error.set(mensajeDeError(e));
      this.inventario.invalidar();
      void this.inventario.cargar();
    } finally {
      this.enviando.set(false);
    }
  }
}
