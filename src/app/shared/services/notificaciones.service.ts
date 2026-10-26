import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/**
 * Mensajes al usuario (toasts) y diálogos de confirmación.
 * Los toasts de Ionic se anuncian a los lectores de pantalla (`role="status"`).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);

  async exito(mensaje: string): Promise<void> {
    await this.mostrar(mensaje, 'success');
  }

  async error(mensaje: string): Promise<void> {
    await this.mostrar(mensaje, 'danger', 5000);
  }

  /**
   * Pide confirmación antes de una acción irreversible.
   * @returns `true` si el usuario confirma
   */
  async confirmar(titulo: string, mensaje: string, textoAceptar = 'Eliminar'): Promise<boolean> {
    const dialogo = await this.alert.create({
      header: titulo,
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: textoAceptar, role: 'confirm', cssClass: 'boton-peligro' },
      ],
    });
    await dialogo.present();
    const { role } = await dialogo.onDidDismiss();
    return role === 'confirm';
  }

  private async mostrar(mensaje: string, color: string, duracion = 3000): Promise<void> {
    const t = await this.toast.create({ message: mensaje, color, duration: duracion, position: 'bottom', buttons: [{ text: 'Cerrar', role: 'cancel' }] });
    await t.present();
  }
}
