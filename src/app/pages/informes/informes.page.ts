import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { documentOutline, gridOutline } from 'ionicons/icons';
import { firstValueFrom, switchMap } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { Pedido } from '../../core/models/pedido.model';
import { ProductoVista } from '../../core/models/producto.model';
import { Usuario } from '../../core/models/usuario.model';
import { Informe, InformesService } from '../../core/services/informes.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { InventarioStore } from '../../core/state/inventario.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { Columna, formatearMoneda, formatearNumero } from '../../core/utils/formato.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { TablaDatosComponent } from '../../shared/components/tabla-datos/tabla-datos.component';
import { PaginaBase } from '../../shared/pagina-base';
import { NotificacionesService } from '../../shared/services/notificaciones.service';

type TipoInforme = 'inventario' | 'bajo-stock' | 'pedidos' | 'usuarios';

interface OpcionInforme {
  tipo: TipoInforme;
  titulo: string;
  descripcion: string;
  soloAdmin: boolean;
}

const OPCIONES: OpcionInforme[] = [
  { tipo: 'inventario', titulo: 'Inventario valorado', descripcion: 'Todos los productos con su stock y valor.', soloAdmin: false },
  { tipo: 'bajo-stock', titulo: 'Reposición', descripcion: 'Productos con stock igual o inferior al mínimo.', soloAdmin: true },
  { tipo: 'pedidos', titulo: 'Pedidos', descripcion: 'Listado de pedidos con importe y estado.', soloAdmin: false },
  { tipo: 'usuarios', titulo: 'Usuarios', descripcion: 'Cuentas registradas y su rol.', soloAdmin: true },
];

/** Generación y descarga de informes tabulados en PDF y CSV. */
@Component({
  selector: 'app-informes',
  templateUrl: './informes.page.html',
  styleUrls: ['./informes.page.scss'],
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
    IonSpinner,
    TablaDatosComponent,
    BotonAyudaComponent,
  ],
})
export class InformesPage extends PaginaBase {
  protected readonly auth = inject(AuthStore);
  private readonly inventario = inject(InventarioStore);
  private readonly pedidosService = inject(PedidosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly informes = inject(InformesService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly opciones = computed(() => OPCIONES.filter((o) => !o.soloAdmin || this.auth.esAdmin()));
  protected readonly tipo = signal<TipoInforme>('inventario');
  protected readonly busqueda = signal('');
  protected readonly generando = signal<'pdf' | 'csv' | null>(null);
  private readonly usuarios = signal<Usuario[]>([]);

  private readonly pedidos = toSignal(
    toObservable(this.auth.usuario).pipe(switchMap((u) => this.pedidosService.visiblesPara$(u))),
  );

  protected readonly cargando = computed(() =>
    this.tipo() === 'pedidos' ? this.pedidos() === undefined : this.inventario.estado() === 'cargando',
  );

  /** Informe activo: columnas y filas dependen del tipo elegido. */
  protected readonly informe = computed<Informe<object>>(() => {
    const autor = this.auth.usuario()?.nombre ?? '';
    switch (this.tipo()) {
      case 'inventario':
      case 'bajo-stock': {
        const filas = this.inventario.productosVista().filter((p) => this.tipo() === 'inventario' || p.bajoStock);
        const columnas: Columna<ProductoVista>[] = [
          { clave: 'sku', etiqueta: 'SKU' },
          { clave: 'nombre', etiqueta: 'Producto' },
          { clave: 'categoria', etiqueta: 'Categoría' },
          { clave: 'precio', etiqueta: 'Precio', tipo: 'moneda' },
          { clave: 'stock', etiqueta: 'Stock', tipo: 'numero' },
          { clave: 'stockMinimo', etiqueta: 'Mínimo', tipo: 'numero' },
          { clave: 'valorStock', etiqueta: 'Valor', tipo: 'moneda' },
        ];
        return {
          titulo: this.tipo() === 'inventario' ? 'Informe de inventario valorado' : 'Informe de reposición',
          subtitulo: `${filas.length} productos · Solicitado por ${autor}`,
          columnas,
          filas,
          resumen: [
            { etiqueta: 'Productos', valor: formatearNumero(filas.length) },
            { etiqueta: 'Unidades', valor: formatearNumero(filas.reduce((s, p) => s + p.stock, 0)) },
            { etiqueta: 'Valor total', valor: formatearMoneda(filas.reduce((s, p) => s + p.valorStock, 0)) },
          ],
          nombreFichero: `informe-${this.tipo()}-${hoy()}`,
        } as Informe<ProductoVista> as Informe<object>;
      }
      case 'pedidos': {
        const filas = (this.pedidos() ?? []).map((p) => ({
          ...p,
          articulos: p.lineas.reduce((s, l) => s + l.cantidad, 0),
        }));
        const columnas: Columna<Pedido & { articulos: number }>[] = [
          { clave: 'id', etiqueta: 'Pedido' },
          { clave: 'usuarioNombre', etiqueta: 'Cliente' },
          { clave: 'creadoEn', etiqueta: 'Fecha', tipo: 'fecha' },
          { clave: 'articulos', etiqueta: 'Artículos', tipo: 'numero' },
          { clave: 'total', etiqueta: 'Total', tipo: 'moneda' },
          { clave: 'estado', etiqueta: 'Estado', tipo: 'estado' },
        ];
        const validos = filas.filter((p) => p.estado !== 'cancelado');
        return {
          titulo: this.auth.esAdmin() ? 'Informe de pedidos' : 'Mis pedidos',
          subtitulo: `${filas.length} pedidos · Solicitado por ${autor}`,
          columnas,
          filas,
          resumen: [
            { etiqueta: 'Pedidos', valor: formatearNumero(filas.length) },
            { etiqueta: 'Cancelados', valor: formatearNumero(filas.length - validos.length) },
            { etiqueta: 'Importe (sin cancelados)', valor: formatearMoneda(validos.reduce((s, p) => s + p.total, 0)) },
          ],
          nombreFichero: `informe-pedidos-${hoy()}`,
        } as Informe<Pedido & { articulos: number }> as Informe<object>;
      }
      case 'usuarios': {
        const columnas: Columna<Usuario>[] = [
          { clave: 'id', etiqueta: 'ID', tipo: 'numero' },
          { clave: 'nombre', etiqueta: 'Nombre' },
          { clave: 'email', etiqueta: 'Correo' },
          { clave: 'rol', etiqueta: 'Rol', formato: (u) => (u.rol === 'admin' ? 'Administrador' : 'Usuario estándar') },
          { clave: 'activo', etiqueta: 'Activo', formato: (u) => (u.activo ? 'Sí' : 'No') },
          { clave: 'creadoEn', etiqueta: 'Alta', tipo: 'fecha' },
        ];
        return {
          titulo: 'Informe de usuarios',
          subtitulo: `${this.usuarios().length} cuentas · Solicitado por ${autor}`,
          columnas,
          filas: this.usuarios(),
          nombreFichero: `informe-usuarios-${hoy()}`,
        } as Informe<Usuario> as Informe<object>;
      }
    }
  });

  constructor() {
    super();
    addIcons({ documentOutline, gridOutline });
  }

  protected async alEntrar(): Promise<void> {
    void this.inventario.cargar();
    if (this.auth.esAdmin()) {
      try {
        this.usuarios.set(await firstValueFrom(this.usuariosService.listar()));
      } catch (e) {
        await this.avisos.error(mensajeDeError(e));
      }
    }
  }

  protected seleccionar(tipo: TipoInforme): void {
    this.tipo.set(tipo);
    this.busqueda.set('');
  }

  protected async exportar(formato: 'pdf' | 'csv'): Promise<void> {
    const informe = this.informe();
    if (!informe.filas.length) {
      await this.avisos.error('El informe no tiene datos que exportar.');
      return;
    }
    this.generando.set(formato);
    try {
      if (formato === 'pdf') {
        await this.informes.exportarPdf(informe);
      } else {
        this.informes.exportarCsv(informe);
      }
      await this.avisos.exito(`Informe descargado en ${formato.toUpperCase()}.`);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    } finally {
      this.generando.set(null);
    }
  }
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
