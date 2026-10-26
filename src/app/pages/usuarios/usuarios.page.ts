import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { banOutline, checkmarkCircleOutline, shieldCheckmarkOutline, personOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { Usuario } from '../../core/models/usuario.model';
import { UsuariosService } from '../../core/services/usuarios.service';
import { mensajeDeError } from '../../core/utils/errores.util';
import { Columna } from '../../core/utils/formato.util';
import { BotonAyudaComponent } from '../../shared/components/boton-ayuda/boton-ayuda.component';
import { AccionTabla, EventoAccion, TablaDatosComponent } from '../../shared/components/tabla-datos/tabla-datos.component';
import { PaginaBase } from '../../shared/pagina-base';
import { NotificacionesService } from '../../shared/services/notificaciones.service';

/** Gestión de usuarios y roles (solo Administrador). */
@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, TablaDatosComponent, BotonAyudaComponent],
})
export class UsuariosPage extends PaginaBase {
  private readonly api = inject(UsuariosService);
  private readonly auth = inject(AuthStore);
  private readonly avisos = inject(NotificacionesService);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');

  /** Vista de tabla: se añade el texto del rol y del estado para buscar y mostrar. */
  protected readonly filas = computed(() =>
    this.usuarios().map((u) => ({ ...u, rolTexto: u.rol === 'admin' ? 'admin' : 'usuario', estadoTexto: u.activo ? 'Activo' : 'Desactivado' })),
  );

  protected readonly columnas: Columna<Usuario & { rolTexto: string; estadoTexto: string }>[] = [
    { clave: 'nombre', etiqueta: 'Nombre' },
    { clave: 'email', etiqueta: 'Correo', ocultarEnMovil: true },
    { clave: 'rolTexto', etiqueta: 'Rol', tipo: 'estado', formato: (u) => (u.rol === 'admin' ? 'Administrador' : 'Usuario estándar') },
    { clave: 'estadoTexto', etiqueta: 'Estado' },
    { clave: 'creadoEn', etiqueta: 'Alta', tipo: 'fecha', ocultarEnMovil: true },
  ];

  private readonly esOtro = (u: Usuario) => u.id !== this.auth.usuario()?.id;

  protected readonly acciones: AccionTabla<Usuario>[] = [
    { id: 'hacer-admin', etiqueta: 'Hacer administrador a', icono: 'shield-checkmark-outline', visible: (u) => this.esOtro(u) && u.rol === 'usuario' },
    { id: 'hacer-usuario', etiqueta: 'Quitar rol administrador a', icono: 'person-outline', visible: (u) => this.esOtro(u) && u.rol === 'admin' },
    { id: 'desactivar', etiqueta: 'Desactivar a', icono: 'ban-outline', color: 'danger', visible: (u) => this.esOtro(u) && u.activo },
    { id: 'activar', etiqueta: 'Activar a', icono: 'checkmark-circle-outline', color: 'success', visible: (u) => this.esOtro(u) && !u.activo },
  ];

  constructor() {
    super();
    addIcons({ shieldCheckmarkOutline, personOutline, banOutline, checkmarkCircleOutline });
  }

  protected alEntrar(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.usuarios.set(await firstValueFrom(this.api.listar()));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async alAccion({ accion, fila }: EventoAccion<Usuario>): Promise<void> {
    const cambios: Partial<Pick<Usuario, 'rol' | 'activo'>> =
      accion === 'hacer-admin'
        ? { rol: 'admin' }
        : accion === 'hacer-usuario'
          ? { rol: 'usuario' }
          : { activo: accion === 'activar' };
    if (accion === 'desactivar') {
      const ok = await this.avisos.confirmar('Desactivar cuenta', `${fila.nombre} no podrá iniciar sesión. ¿Continuar?`, 'Desactivar');
      if (!ok) {
        return;
      }
    }
    try {
      const actualizado = await firstValueFrom(this.api.actualizar(fila.id, cambios));
      this.usuarios.update((lista) => lista.map((u) => (u.id === actualizado.id ? actualizado : u)));
      await this.avisos.exito(`Usuario ${actualizado.nombre} actualizado.`);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    }
  }
}
