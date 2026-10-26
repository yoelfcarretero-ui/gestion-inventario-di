import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Injectable, inject, isDevMode } from '@angular/core';
import { bootstrapApplication, Title } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  RouterStateSnapshot,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { mockBackendInterceptor } from './app/core/api/mock-backend.interceptor';

/** Pone como título del documento "<página> · Gestión de Inventario" (WCAG 2.4.2). */
@Injectable({ providedIn: 'root' })
class TituloPagina extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(estado: RouterStateSnapshot): void {
    const titulo = this.buildTitle(estado);
    this.title.setTitle(titulo ? `${titulo} · Gestión de Inventario` : 'Gestión de Inventario');
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: TitleStrategy, useClass: TituloPagina },
    provideIonicAngular(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled' }),
    ),
    // El orden importa: primero se añade el token y después el backend simulado responde.
    provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
});
