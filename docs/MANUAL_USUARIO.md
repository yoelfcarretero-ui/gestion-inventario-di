# Manual de usuario · Gestión de Inventario

Versión 1.0 · Este manual también está disponible dentro de la aplicación (menú **Ayuda** o botón **?** de cada pantalla).

---

## 1. Primeros pasos

### 1.1 Acceder a la aplicación

Abre la dirección de la aplicación en cualquier navegador moderno (Chrome, Edge, Firefox o Safari) desde un ordenador, una tablet o un móvil.
No hace falta instalar nada. Si quieres, puedes **instalarla como aplicación** (PWA): en el menú del navegador elige *Instalar aplicación* / *Añadir a pantalla de inicio*.

### 1.2 Iniciar sesión

1. Escribe tu **correo electrónico** y tu **contraseña**.
2. Pulsa **Entrar**.

Si los datos no son correctos verás un mensaje en rojo. Si intentabas abrir una página concreta, tras entrar irás directamente a ella.
La sesión se cierra automáticamente a las **2 horas**.

### 1.3 Crear una cuenta

1. En la pantalla de inicio de sesión pulsa **Crear una cuenta**.
2. Escribe tu nombre, tu correo y una contraseña (mínimo 8 caracteres, con letras y números) y repítela.
3. Mientras escribes el correo, la aplicación comprueba si ya está registrado (verás *Comprobando disponibilidad…* y después *Correo disponible*).
4. Pulsa **Crear cuenta**. Entrarás automáticamente con el rol **Usuario estándar**.

### 1.4 Roles

| Rol | Puede… |
| --- | --- |
| **Usuario estándar** | Consultar el catálogo, hacer pedidos, ver y cancelar sus pedidos pendientes y descargar sus informes. |
| **Administrador** | Todo lo anterior y además gestionar productos y usuarios, cambiar el estado de cualquier pedido y usar el cuadro de mando. |

### 1.5 Moverse por la aplicación

- En ordenador el **menú lateral** está siempre visible. En móvil se abre con el botón **☰** (arriba a la izquierda).
- El menú muestra tu nombre y tu rol, y solo las secciones a las que tienes acceso.
- Para salir pulsa **Cerrar sesión** al final del menú.

## 2. Página de inicio

Muestra un resumen con **tarjetas de indicadores**. Las tarjetas con borde se pueden pulsar y te llevan al listado ya filtrado:

- *Administrador:* productos en catálogo, valor del inventario, productos bajo mínimo y pedidos pendientes.
- *Usuario:* mis pedidos, pendientes de envío, importe total y productos disponibles.

Debajo aparecen los últimos pedidos y, para administradores, los productos que necesitan reposición.

## 3. Productos

### 3.1 Consultar

- **Buscar:** escribe en el buscador. Busca en todas las columnas y no distingue mayúsculas ni tildes.
- **Filtrar:** elige una categoría o activa *Solo bajo mínimo*.
- **Ordenar:** pulsa el título de una columna. Cada pulsación cambia entre ascendente, descendente y sin orden.
- **Paginar:** usa los botones *‹* y *›* bajo la tabla.
- En pantallas pequeñas cada producto se muestra como una tarjeta.

### 3.2 Crear o editar (Administrador)

1. Pulsa **Nuevo producto** o el icono del **lápiz** de la fila.
2. Rellena los campos obligatorios (marcados con *):
   - **SKU:** código con formato `AAA-0000` (por ejemplo `INF-0010`). Se comprueba en el servidor que no exista.
   - **Nombre**, **categoría**, **proveedor**, **precio**, **stock actual** y **stock mínimo**.
3. Pulsa **Crear producto** o **Guardar cambios**.

Si hay errores, cada campo muestra el motivo y el cursor se coloca en el primero incorrecto.

### 3.3 Eliminar (Administrador)

Pulsa el icono de la **papelera** y confirma. Esta acción no se puede deshacer.

## 4. Pedidos

La lista se actualiza **en tiempo real**: si alguien cambia un pedido (en otro dispositivo o pestaña) lo verás al momento, sin recargar.

- Filtra por estado con las pestañas: *Todos, Pendientes, Enviados, Entregados, Cancelados* (entre paréntesis, cuántos hay).
- Pulsa una fila (o selecciónala con **Tab** y pulsa **Intro**) para ver el **detalle** con sus artículos.

### 4.1 Hacer un pedido

1. Pulsa **Nuevo pedido**.
2. Elige un producto y el número de unidades. No puedes pedir más unidades de las disponibles.
3. Con **Añadir artículo** incluyes más productos; con la papelera quitas una línea.
4. Revisa el **total** y pulsa **Confirmar pedido**. El stock se descuenta automáticamente.

### 4.2 Estados de un pedido

`Pendiente → Enviado → Entregado`. Un pedido **pendiente** puede **cancelarse**; al hacerlo se repone el stock.

- Los usuarios pueden cancelar sus pedidos pendientes.
- Los administradores pueden marcar pedidos como enviados o entregados, y cancelar cualquier pedido pendiente.

## 5. Cuadro de mando (Administrador)

Reúne en una pantalla los indicadores clave y cuatro gráficos: ventas mensuales, pedidos por estado, ventas por categoría y productos más vendidos.

- Cambia el **periodo** (3, 6 o 12 meses), la **categoría** o el **estado** con los selectores: todo se recalcula al instante.
- **Pulsa una barra** del gráfico de categorías o **un sector** del gráfico de estados para filtrar por ese valor. Vuelve a pulsarlo para quitar el filtro. Los filtros activos aparecen como botones que puedes quitar uno a uno.
- Sin ratón: abre **Ver datos** bajo cada gráfico; cada fila es un botón que aplica el mismo filtro.
- **Actualizar** vuelve a cargar los datos; **Exportar PDF** descarga el resumen con los filtros aplicados.

## 6. Informes

1. Elige el informe:
   - **Inventario valorado** (todos).
   - **Pedidos** (los tuyos, o todos si eres administrador).
   - **Reposición** y **Usuarios** (solo administradores).
2. Revisa los datos en la vista previa. Puedes buscar dentro de ella.
3. Pulsa **Descargar PDF** (documento maquetado con cabecera, tabla y resumen) o **Descargar CSV** (para Excel o LibreOffice; separado por punto y coma).

## 7. Usuarios y roles (Administrador)

Desde la tabla de usuarios puedes:

- **Hacer administrador** a un usuario estándar o **quitarle** el rol de administrador.
- **Desactivar** una cuenta (no podrá iniciar sesión) o **activarla** de nuevo.

Por seguridad no puedes modificar tu propia cuenta.

## 8. Accesibilidad y uso con teclado

| Tecla | Acción |
| --- | --- |
| **Tab** / **Mayús + Tab** | Avanzar / retroceder entre elementos (el activo se marca con un borde naranja) |
| **Intro** / **Espacio** | Activar botones y enlaces; abrir el detalle de un pedido |
| **Esc** | Cerrar menús desplegables y diálogos |
| **Ctrl + +** / **Ctrl + −** | Ampliar o reducir el texto sin perder contenido |

- El primer **Tab** de cada página muestra el enlace **Saltar al contenido principal**.
- Todos los botones con icono tienen una descripción para lectores de pantalla.
- Los gráficos incluyen una tabla con los mismos datos.
- La aplicación respeta la preferencia del sistema de reducir animaciones.

## 9. Preguntas frecuentes

**He vuelto a la pantalla de inicio de sesión sin querer.**
Tu sesión ha caducado. Vuelve a entrar y te llevaremos a la página que querías ver.

**Veo «Acceso denegado».**
Esa sección es solo para administradores. Pide a un administrador que cambie tu rol si la necesitas.

**No puedo pedir más unidades de un producto.**
No hay stock suficiente. El desplegable muestra las unidades disponibles de cada producto.

**¿Los datos son reales?**
No. Es un entorno de demostración con datos sintéticos que se guardan en tu navegador.
