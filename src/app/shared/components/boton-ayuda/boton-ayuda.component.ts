import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { helpCircleOutline } from 'ionicons/icons';

/**
 * Botón de ayuda contextual: abre el manual de usuario directamente en la sección
 * correspondiente a la pantalla actual.
 */
@Component({
  selector: 'app-boton-ayuda',
  template: `
    <ion-button [routerLink]="['/ayuda']" [fragment]="seccion()" [attr.aria-label]="'Ayuda sobre ' + tema()">
      <ion-icon slot="icon-only" name="help-circle-outline" aria-hidden="true"></ion-icon>
    </ion-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonButton, IonIcon],
})
export class BotonAyudaComponent {
  /** Identificador de la sección del manual (ancla). */
  readonly seccion = input.required<string>();
  /** Nombre legible del tema, para el `aria-label`. */
  readonly tema = input.required<string>();

  constructor() {
    addIcons({ helpCircleOutline });
  }
}
