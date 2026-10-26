import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonRouterLink } from '@ionic/angular';

import { AuthStore } from '../../core/auth/auth.store';

/** Página de error para 403 (acceso denegado) y 404 (no encontrada). El código llega por `data` de la ruta. */
@Component({
  selector: 'app-error',
  template: `
    <ion-content class="ion-padding">
      <main class="contenedor error" id="contenido-principal">
        <p class="codigo" aria-hidden="true">{{ codigo() }}</p>
        <h1 class="titulo-pagina">{{ titulo() }}</h1>
        <p>{{ mensaje() }}</p>
        <ion-button [routerLink]="auth.autenticado() ? '/inicio' : '/login'" routerDirection="root">
          {{ auth.autenticado() ? 'Volver al inicio' : 'Ir a iniciar sesión' }}
        </ion-button>
      </main>
    </ion-content>
  `,
  styles: `
    .error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80%; text-align: center; }
    .codigo { margin: 0; font-size: 4rem; font-weight: 800; color: var(--ion-color-primary); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonRouterLink, IonContent, IonButton],
})
export class ErrorPage {
  protected readonly auth = inject(AuthStore);
  /** Código HTTP simbólico, definido en `data` de la ruta. */
  readonly codigo = input<number>(404);

  protected readonly titulo = computed(() => (this.codigo() === 403 ? 'Acceso denegado' : 'Página no encontrada'));
  protected readonly mensaje = computed(() =>
    this.codigo() === 403
      ? 'Esta sección solo está disponible para usuarios con el rol Administrador.'
      : 'La dirección que buscas no existe o se ha movido.',
  );
}
