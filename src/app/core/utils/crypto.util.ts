/**
 * Utilidades criptográficas basadas en Web Crypto API (disponible en navegadores modernos y Node 20+).
 * Se usan para no guardar nunca contraseñas en texto plano y para firmar los tokens JWT del backend simulado.
 */

const codificador = new TextEncoder();

/** Convierte bytes a hexadecimal. */
function aHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Codifica texto (UTF-8) en Base64URL, el formato usado por JWT. */
export function base64UrlCodificar(texto: string): string {
  const bytes = codificador.encode(texto);
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodifica Base64URL a texto (UTF-8). */
export function base64UrlDecodificar(valor: string): string {
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(valor.length / 4) * 4, '=');
  const binario = atob(base64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Calcula el hash SHA-256 (hex) de una contraseña con su sal.
 * @param password contraseña en claro introducida por el usuario
 * @param sal sal aleatoria asociada al usuario
 */
export async function hashPassword(password: string, sal: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', codificador.encode(`${sal}:${password}`));
  return aHex(digest);
}

/** Genera una sal aleatoria de 16 bytes en hexadecimal. */
export function generarSal(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return aHex(bytes.buffer);
}

/**
 * Firma un mensaje con HMAC-SHA256 y devuelve la firma en Base64URL.
 * @param mensaje contenido a firmar (cabecera.payload del JWT)
 * @param clave clave secreta del servidor
 */
export async function firmarHmac(mensaje: string, clave: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', codificador.encode(clave), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const firma = await crypto.subtle.sign('HMAC', key, codificador.encode(mensaje));
  let binario = '';
  new Uint8Array(firma).forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
