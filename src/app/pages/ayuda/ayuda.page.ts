import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, ViewDidEnter } from '@ionic/angular';

import { AuthStore } from '../../core/auth/auth.store';

interface SeccionAyuda {
  id: string;
  titulo: string;
  soloAdmin?: boolean;
}

/**
 * Manual de usuario integrado (sistema de ayuda contextual).
 * Cada pantalla tiene un botón «?» que abre esta página directamente en su sección (`/ayuda#seccion`).
 */
@Component({
  selector: 'app-ayuda',
  templateUrl: './ayuda.page.html',
  styleUrls: ['./ayuda.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent],
})
export class AyudaPage implements AfterViewInit, ViewDidEnter {
  protected readonly auth = inject(AuthStore);
  private readonly ruta = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly secciones: SeccionAyuda[] = [
    { id: 'primeros-pasos', titulo: 'Primeros pasos' },
    { id: 'inicio', titulo: 'Página de inicio' },
    { id: 'productos', titulo: 'Productos' },
    { id: 'pedidos', titulo: 'Pedidos' },
    { id: 'informes', titulo: 'Informes PDF y CSV' },
    { id: 'dashboard', titulo: 'Cuadro de mando', soloAdmin: true },
    { id: 'usuarios', titulo: 'Usuarios y roles', soloAdmin: true },
    { id: 'accesibilidad', titulo: 'Accesibilidad y teclado' },
    { id: 'preguntas', titulo: 'Preguntas frecuentes' },
  ];

  /** Apertura directa de la URL (Ionic no emite `ionViewDidEnter` para la página inicial). */
  ngAfterViewInit(): void {
    setTimeout(() => this.ionViewDidEnter(), 300);
  }

  /** Al entrar, si la URL trae un ancla, desplaza y enfoca la sección correspondiente. */
  ionViewDidEnter(): void {
    const ancla = this.ruta.snapshot.fragment;
    if (ancla) {
      this.irA(ancla);
    }
  }

  protected irA(id: string, evento?: Event): void {
    evento?.preventDefault();
    const titulo = this.host.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(id)} h2`);
    if (titulo) {
      titulo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titulo.focus({ preventScroll: true });
    }
  }
}
