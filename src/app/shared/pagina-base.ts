import { Directive, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';

/** Margen para considerar que dos avisos de entrada pertenecen a la misma visita. */
const MARGEN_MS = 500;

/**
 * Base para las páginas que deben refrescar sus datos cada vez que se muestran.
 *
 * Ionic reutiliza las páginas de la pila de navegación, así que `ngOnInit` solo se ejecuta la primera vez
 * y `ionViewWillEnter` cubre las siguientes visitas. Pero cuando se abre una URL directamente, Ionic no
 * emite `ionViewWillEnter` para la página inicial. Se escuchan ambos y se descarta el duplicado,
 * de modo que {@link alEntrar} se ejecuta una sola vez por visita en todos los casos.
 */
@Directive()
export abstract class PaginaBase implements OnInit, ViewWillEnter {
  private ultimaEntrada = 0;

  /** Lógica que se ejecuta cada vez que el usuario entra en la página. */
  protected abstract alEntrar(): void | Promise<void>;

  ngOnInit(): void {
    this.entrar();
  }

  ionViewWillEnter(): void {
    this.entrar();
  }

  private entrar(): void {
    const ahora = Date.now();
    if (ahora - this.ultimaEntrada < MARGEN_MS) {
      return;
    }
    this.ultimaEntrada = ahora;
    void this.alEntrar();
  }
}
