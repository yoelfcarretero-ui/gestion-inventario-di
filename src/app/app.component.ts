import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonListHeader,
  IonNote,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink,
  IonFooter,
  IonButton,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  homeSharp,
  cubeOutline,
  cubeSharp,
  cartOutline,
  cartSharp,
  statsChartOutline,
  statsChartSharp,
  documentTextOutline,
  documentTextSharp,
  peopleOutline,
  peopleSharp,
  helpCircleOutline,
  helpCircleSharp,
  logOutOutline,
} from 'ionicons/icons';

import { AuthStore } from './core/auth/auth.store';
import { Rol } from './core/models/usuario.model';
import { InventarioStore } from './core/state/inventario.store';

interface EntradaMenu {
  titulo: string;
  url: string;
  icono: string;
  /** Roles que ven la entrada; vacío = todos los autenticados. */
  roles: Rol[];
}

const MENU: EntradaMenu[] = [
  { titulo: 'Inicio', url: '/inicio', icono: 'home', roles: [] },
  { titulo: 'Cuadro de mando', url: '/dashboard', icono: 'stats-chart', roles: ['admin'] },
  { titulo: 'Productos', url: '/productos', icono: 'cube', roles: [] },
  { titulo: 'Pedidos', url: '/pedidos', icono: 'cart', roles: [] },
  { titulo: 'Informes', url: '/informes', icono: 'document-text', roles: [] },
  { titulo: 'Usuarios', url: '/usuarios', icono: 'people', roles: ['admin'] },
  { titulo: 'Ayuda', url: '/ayuda', icono: 'help-circle', roles: [] },
];

/**
 * Componente raíz: menú lateral (split pane en escritorio, menú deslizante en móvil) y
 * `ion-router-outlet`. El menú se filtra según el rol del usuario y se oculta sin sesión.
 */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonListHeader,
    IonNote,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet,
    IonFooter,
    IonButton,
  ],
})
export class AppComponent {
  protected readonly auth = inject(AuthStore);
  private readonly inventario = inject(InventarioStore);

  /** Entradas del menú visibles para el rol actual. */
  protected readonly paginas = computed(() => {
    const rol = this.auth.usuario()?.rol;
    return MENU.filter((e) => !e.roles.length || (rol && e.roles.includes(rol)));
  });

  constructor() {
    addIcons({
      homeOutline,
      homeSharp,
      cubeOutline,
      cubeSharp,
      cartOutline,
      cartSharp,
      statsChartOutline,
      statsChartSharp,
      documentTextOutline,
      documentTextSharp,
      peopleOutline,
      peopleSharp,
      helpCircleOutline,
      helpCircleSharp,
      logOutOutline,
    });
    // Al cerrar sesión se vacía la caché para que otro usuario no vea datos del anterior.
    effect(() => {
      if (!this.auth.autenticado()) {
        this.inventario.limpiar();
      }
    });
  }

  /** Mueve el foco al contenido principal (enlace "Saltar al contenido"). */
  protected saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    const destino = document.querySelector<HTMLElement>('ion-router-outlet .ion-page:not(.ion-page-hidden) h1');
    if (destino) {
      destino.setAttribute('tabindex', '-1');
      destino.focus();
    }
  }
}
