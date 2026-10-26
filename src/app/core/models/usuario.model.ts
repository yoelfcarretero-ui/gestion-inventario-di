/** Roles soportados por el sistema de control de acceso. */
export type Rol = 'admin' | 'usuario';

/** Usuario tal y como lo expone la API (nunca incluye la contraseña). */
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

/** Datos necesarios para iniciar sesión. */
export interface Credenciales {
  email: string;
  password: string;
}

/** Datos del formulario de registro de un nuevo usuario estándar. */
export interface NuevoUsuario {
  nombre: string;
  email: string;
  password: string;
}

/** Respuesta de los endpoints de autenticación. */
export interface RespuestaAuth {
  token: string;
  usuario: Usuario;
}

/** Contenido (payload) del token JWT emitido por el backend. */
export interface TokenPayload {
  sub: number;
  email: string;
  nombre: string;
  rol: Rol;
  /** Fecha de emisión (segundos desde epoch). */
  iat: number;
  /** Fecha de expiración (segundos desde epoch). */
  exp: number;
}
