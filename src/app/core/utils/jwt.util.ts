import { TokenPayload } from '../models/usuario.model';
import { base64UrlCodificar, base64UrlDecodificar, firmarHmac } from './crypto.util';

const CABECERA = base64UrlCodificar(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

/**
 * Genera un JWT HS256 firmado.
 * @param payload datos del usuario (sin `iat`/`exp`)
 * @param clave secreto del servidor
 * @param minutos duración del token
 */
export async function crearJwt(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  clave: string,
  minutos: number,
): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = base64UrlCodificar(JSON.stringify({ ...payload, iat: ahora, exp: ahora + minutos * 60 }));
  const firma = await firmarHmac(`${CABECERA}.${cuerpo}`, clave);
  return `${CABECERA}.${cuerpo}.${firma}`;
}

/**
 * Verifica firma y caducidad de un JWT. Devuelve el payload si es válido o `null` en caso contrario.
 * Esta comprobación la hace el SERVIDOR: el cliente nunca puede confiar en su propio token.
 */
export async function verificarJwt(token: string, clave: string): Promise<TokenPayload | null> {
  const partes = token.split('.');
  if (partes.length !== 3) {
    return null;
  }
  const [cabecera, cuerpo, firma] = partes;
  const firmaEsperada = await firmarHmac(`${cabecera}.${cuerpo}`, clave);
  if (firma !== firmaEsperada) {
    return null;
  }
  const payload = decodificarJwt(token);
  return payload && !jwtCaducado(payload) ? payload : null;
}

/** Lee el payload de un JWT sin verificar la firma (uso en cliente, solo para la interfaz). */
export function decodificarJwt(token: string): TokenPayload | null {
  try {
    return JSON.parse(base64UrlDecodificar(token.split('.')[1])) as TokenPayload;
  } catch {
    return null;
  }
}

/** Indica si el token ha caducado. */
export function jwtCaducado(payload: TokenPayload, margenSegundos = 0): boolean {
  return payload.exp <= Math.floor(Date.now() / 1000) + margenSegundos;
}
