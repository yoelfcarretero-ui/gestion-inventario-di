# Gestión de Inventario · PWA multiplataforma

Aplicación de gestión empresarial de **inventario y pedidos** desarrollada con **Ionic 9 + Angular 22** (componentes *standalone*, señales y sin Zone.js).
Funciona como aplicación web progresiva (PWA) instalable y se adapta a móvil, tablet y escritorio.

> Proyecto del módulo **Desarrollo de Interfaces (0488)** · CFGS Desarrollo de Aplicaciones Multiplataforma.
> Autor: **Yoel Carretero**.

- **Aplicación en producción:** _(añadir la URL de Vercel)_
- **Documentación técnica (Compodoc):** `/docs` dentro del despliegue (p. ej. `https://<app>.vercel.app/docs`)
- **Manual de usuario:** [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) y la sección **Ayuda** dentro de la app.

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Arquitectura](#arquitectura)
3. [Correspondencia con los resultados de aprendizaje](#correspondencia-con-los-resultados-de-aprendizaje)
4. [Instalación y ejecución](#instalación-y-ejecución)
5. [Scripts](#scripts)
6. [Control de versiones (Git Flow)](#control-de-versiones-git-flow)
7. [Integración y despliegue continuos](#integración-y-despliegue-continuos)
8. [Accesibilidad](#accesibilidad)
9. [Seguridad y datos](#seguridad-y-datos)
10. [Manual de usuario (resumen)](#manual-de-usuario-resumen)

---

## Funcionalidades

| Área | Usuario estándar | Administrador |
| --- | :---: | :---: |
| Iniciar sesión / registrarse (validación asíncrona del correo) | ✅ | ✅ |
| Inicio con indicadores pulsables | ✅ | ✅ |
| Catálogo de productos (búsqueda, filtros, orden, paginación) | ✅ | ✅ |
| Alta / edición / borrado de productos (validación asíncrona del SKU) | — | ✅ |
| Pedidos en tiempo real (crear, ver detalle, cancelar pendientes) | Los suyos | Todos + cambiar estado |
| Cuadro de mando con gráficos interactivos (Chart.js) | — | ✅ |
| Informes descargables en **PDF** y **CSV** | Inventario y sus pedidos | Todos |
| Gestión de usuarios y roles | — | ✅ |
| Ayuda contextual integrada | ✅ | ✅ |

## Arquitectura

Patrón **MVVM** con capas separadas:

```
src/app
├── core/                    ← Modelo y lógica de negocio (sin dependencias de la vista)
│   ├── models/              ← Interfaces de dominio (Usuario, Producto, Pedido…)
│   ├── api/                 ← Orígenes de datos simulados
│   │   ├── mock-backend.interceptor.ts   API REST "SQL" (JWT + roles validados en servidor)
│   │   ├── base-datos-sql.ts             Motor relacional en memoria (tablas, PK, FK)
│   │   └── almacen-documentos.service.ts Almacén NoSQL en tiempo real (tipo Firestore)
│   ├── auth/                ← AuthStore (NgRx SignalStore), guards e interceptor HTTP
│   ├── state/               ← InventarioStore (NgRx SignalStore)
│   ├── services/            ← Servicios asíncronos (Observables RxJS / async-await)
│   ├── validators/          ← Validadores asíncronos con debounce
│   └── utils/               ← JWT, criptografía, formato, formularios…
├── shared/
│   ├── components/          ← Componentes reutilizables y agnósticos
│   │   ├── tabla-datos/          Data table: búsqueda [(busqueda)], orden, paginación, acciones
│   │   ├── widget-estadistico/   Tarjeta KPI interactiva
│   │   ├── grafico/              Envoltorio de Chart.js accesible
│   │   └── boton-ayuda/          Acceso a la ayuda contextual
│   └── pagina-base.ts       ← Ciclo de vida común de las páginas Ionic
└── pages/                   ← Vistas (View + ViewModel con señales), todas con lazy loading
```

### Flujo de datos

```
 Vista (plantilla)  ──eventos──▶  Página (ViewModel)  ──métodos──▶  Store / Servicio
       ▲                               │ señales computadas                │ HttpClient / RxJS
       └────────── señales ◀───────────┘                                    ▼
                                                     authInterceptor ─▶ mockBackendInterceptor ─▶ BaseDatosSql (SQL)
                                                     AlmacenDocumentos (NoSQL, tiempo real + BroadcastChannel)
```

- **Estado predecible:** `AuthStore` e `InventarioStore` son *NgRx SignalStores*; el estado solo cambia mediante `patchState` en sus métodos.
- **Renderizado optimizado:** todos los componentes usan `ChangeDetectionStrategy.OnPush`, señales y `computed`; la app es *zoneless*.
- **Enrutamiento:** `loadComponent` (lazy loading) en todas las páginas; `canMatch` evita incluso descargar el código de rutas no autorizadas.
- **Seguridad en dos capas:** guards en cliente + validación de firma JWT (HS256) y rol en el "servidor" (`mockBackendInterceptor`). Un token manipulado devuelve 401 y un rol insuficiente 403.
- **Asincronía y concurrencia:** `forkJoin` (catálogo), `Promise.all` (dashboard: SQL + NoSQL en paralelo), `Promise.allSettled` con compensación (crear pedido), `switchMap`, `retry` y `debounce` en validadores.
- **Dos orígenes de datos:**
  - *SQL:* API REST (`/api/...`) sobre tablas relacionales con claves foráneas.
  - *NoSQL:* colección de documentos `pedidos` con suscripción en tiempo real (`enTiempoReal()` ≈ `onSnapshot`). Los cambios se propagan entre pestañas.

## Correspondencia con los resultados de aprendizaje

| RA | Dónde se cumple |
| --- | --- |
| **RA1** Interfaces, enrutamiento, roles | `app.routes.ts`, `core/auth/*`, `AuthStore`, interceptores HTTP, menú por rol |
| **RA2** Interfaces declarativas | Plantillas Angular, *data binding* unidireccional (`[prop]`) y bidireccional (`[(ngModel)]`, `[(busqueda)]`), formularios reactivos con validación asíncrona (`registro`, `producto-form`) y `FormArray` dinámico (`pedido-form`) |
| **RA3** Componentes | `shared/components/*`: entradas con `input()`, salidas con `output()`, *two-way* con `model()`, limpieza en `ngOnDestroy` |
| **RA4** Usabilidad y accesibilidad | Diseño *mobile-first* (grid/flexbox), WCAG 2.2 AA, WAI-ARIA, navegación completa por teclado |
| **RA5** Informes | `dashboard` (Chart.js, filtros en tiempo real), `informes` (PDF maquetado con jsPDF + CSV) |
| **RA6** Documentación | Compodoc (`npm run docs`), JSDoc en el código, este README y el manual de usuario |
| **RA7** Distribución | Git Flow, GitHub Actions (CI/CD), PWA con service worker, despliegue en Vercel |

## Instalación y ejecución

Requisitos: **Node.js 24 LTS** y **npm**.

```bash
npm ci
npm start            # http://localhost:4200
```

Las cuentas de demostración se entregan aparte (no se publican contraseñas en el repositorio).
También puedes crear una cuenta nueva desde «Crear una cuenta» (rol Usuario estándar).

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build de producción en `www/` (PWA con service worker) |
| `npm run build:produccion` | Build de producción + documentación en `www/docs` (lo usa Vercel) |
| `npm test` / `npm run test:ci` | Pruebas unitarias (Vitest + jsdom) |
| `npm run lint` | ESLint con reglas de Angular y accesibilidad de plantillas |
| `npm run docs` | Genera la documentación técnica con Compodoc en `docs-tecnica/` |
| `npm run docs:servir` | Genera y sirve la documentación en local |

## Control de versiones (Git Flow)

- `main`: versión estable desplegada en producción. Solo recibe *merges* desde `develop`.
- `develop`: rama de integración.
- `feature/*`: una rama por funcionalidad, integrada en `develop` mediante *merge* `--no-ff` / Pull Request.

Ramas de funcionalidad del proyecto: `feature/arquitectura-core`, `feature/componentes-reutilizables`, `feature/autenticacion`,
`feature/gestion-inventario-pedidos`, `feature/dashboard-informes`, `feature/accesibilidad-ayuda`, `feature/calidad-ci-docs`.

Los mensajes de *commit* siguen [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`, `docs:`, `test:`, `ci:`…).

## Integración y despliegue continuos

Workflow `.github/workflows/ci-cd.yml`:

1. En cada push / PR a `develop` o `main`: `lint` → `test` → `build:produccion` (incluye Compodoc).
2. En `main`, **solo si el paso anterior termina bien**, se despliega en Vercel con `vercel deploy --prebuilt --prod`.
   Si fallan las pruebas, el despliegue queda bloqueado.

Configuración necesaria (una vez):

1. Crear el proyecto en Vercel e importar el repositorio (`vercel link`).
2. Añadir en GitHub → *Settings → Secrets and variables → Actions* los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.

`vercel.json` define el build, la reescritura de rutas de la SPA, la cabecera `no-cache` del service worker y cabeceras de seguridad.

## Accesibilidad

Objetivo: **WCAG 2.2 nivel AA** y puntuación ≥ 95 en Lighthouse (Accesibilidad y Buenas prácticas).

- Contraste: paleta propia con relación ≥ 4.5:1 para texto (ver `src/theme/variables.scss`).
- Tipografía escalable en `rem`; se permite el zoom (sin `user-scalable=no`).
- Navegación por teclado: orden de tabulación natural (sin `tabindex` positivos), enlace «Saltar al contenido», foco visible de alto contraste, foco al primer error en formularios.
- Semántica y WAI-ARIA: `lang="es"`, títulos de página dinámicos, landmarks (`main`, `nav`, `aside`), tablas con `caption`, `scope` y `aria-sort`, regiones `aria-live` para resultados y estados, `aria-pressed` en filtros, etiquetas accesibles en botones de icono.
- Gráficos: `role="img"` con descripción y tabla de datos equivalente operable por teclado.
- Respeta `prefers-reduced-motion`.

## Seguridad y datos

- **Datos 100 % sintéticos.** Correos con dominio reservado `.test` (RFC 2606) y nombres ficticios marcados como «(demo)».
- **Sin contraseñas en texto plano:** se guardan como hash SHA-256 con sal individual.
- **Sin claves de terceros:** no se usan servicios externos ni tokens de API reales. La clave HS256 del backend es una clave de demostración del servidor simulado.
- Los datos se guardan en el navegador (`localStorage`), por lo que cada visitante tiene su propia copia de la demo.

## Manual de usuario (resumen)

El manual completo está en [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) y dentro de la app (menú **Ayuda** o botón **?** de cada pantalla).

1. **Acceso:** inicia sesión o crea una cuenta. La sesión caduca a las 2 horas.
2. **Inicio:** resumen con indicadores; pulsa una tarjeta para ir al listado filtrado.
3. **Productos:** busca, filtra y ordena. Los administradores pueden crear, editar y eliminar.
4. **Pedidos:** crea pedidos con varias líneas; la lista se actualiza en tiempo real. Los administradores cambian el estado.
5. **Cuadro de mando** (admin): filtra por periodo, categoría o estado, también pulsando en los gráficos.
6. **Informes:** elige un informe, revisa la vista previa y descárgalo en PDF o CSV.
7. **Usuarios** (admin): cambia roles y activa o desactiva cuentas.
