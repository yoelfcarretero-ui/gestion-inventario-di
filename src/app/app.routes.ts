import { Routes } from '@angular/router';

import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/auth.guards';

/**
 * Rutas de la aplicación.
 *
 * Todas las páginas se cargan de forma diferida (`loadComponent`) y las protegidas usan `canMatch`:
 * si el usuario no cumple el guard, el código de la página no llega a descargarse.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },

  // ---- Públicas (solo sin sesión) ----
  {
    path: 'login',
    title: 'Iniciar sesión',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    canMatch: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },

  // ---- Cualquier usuario autenticado ----
  {
    path: 'inicio',
    title: 'Inicio',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'productos',
    title: 'Productos',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/productos/productos.page').then((m) => m.ProductosPage),
  },
  {
    path: 'pedidos',
    title: 'Pedidos',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/pedidos/pedidos.page').then((m) => m.PedidosPage),
  },
  {
    path: 'pedidos/nuevo',
    title: 'Nuevo pedido',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/pedido-form/pedido-form.page').then((m) => m.PedidoFormPage),
  },
  {
    path: 'informes',
    title: 'Informes',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/informes/informes.page').then((m) => m.InformesPage),
  },
  {
    path: 'ayuda',
    title: 'Ayuda',
    canMatch: [autenticadoGuard],
    loadComponent: () => import('./pages/ayuda/ayuda.page').then((m) => m.AyudaPage),
  },

  // ---- Solo Administrador ----
  {
    path: 'dashboard',
    title: 'Cuadro de mando',
    canMatch: [rolGuard('admin')],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'productos/nuevo',
    title: 'Nuevo producto',
    canMatch: [rolGuard('admin')],
    loadComponent: () => import('./pages/producto-form/producto-form.page').then((m) => m.ProductoFormPage),
  },
  {
    path: 'productos/:id/editar',
    title: 'Editar producto',
    canMatch: [rolGuard('admin')],
    loadComponent: () => import('./pages/producto-form/producto-form.page').then((m) => m.ProductoFormPage),
  },
  {
    path: 'usuarios',
    title: 'Usuarios',
    canMatch: [rolGuard('admin')],
    loadComponent: () => import('./pages/usuarios/usuarios.page').then((m) => m.UsuariosPage),
  },

  // ---- Errores ----
  {
    path: 'acceso-denegado',
    title: 'Acceso denegado',
    loadComponent: () => import('./pages/error/error.page').then((m) => m.ErrorPage),
    data: { codigo: 403 },
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./pages/error/error.page').then((m) => m.ErrorPage),
    data: { codigo: 404 },
  },
];
