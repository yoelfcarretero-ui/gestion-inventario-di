import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { RespuestaAuth } from '../models/usuario.model';
import { BaseDatosSql } from './base-datos-sql';
import { mockBackendInterceptor } from './mock-backend.interceptor';

const EMAIL_ADMIN = 'admin@gestionstock.test';

describe('mockBackendInterceptor (API REST simulada)', () => {
  let http: HttpClient;

  const estado = async (peticion: Promise<unknown>) => {
    try {
      await peticion;
      return 200;
    } catch (e) {
      return (e as HttpErrorResponse).status;
    }
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    TestBed.inject(BaseDatosSql).reiniciar();
    http = TestBed.inject(HttpClient);
  });

  it('rechaza credenciales incorrectas con 401', async () => {
    const s = await estado(firstValueFrom(http.post('/api/auth/login', { email: EMAIL_ADMIN, password: 'incorrecta' })));
    expect(s).toBe(401);
  });

  it('exige token en los endpoints protegidos', async () => {
    expect(await estado(firstValueFrom(http.get('/api/productos')))).toBe(401);
  });

  it('registra un usuario estándar y le impide usar endpoints de administrador (403)', async () => {
    const { token, usuario } = await firstValueFrom(
      http.post<RespuestaAuth>('/api/auth/registro', { nombre: 'Prueba', email: 'nuevo@prueba.test', password: 'clave1234' }),
    );
    expect(usuario.rol).toBe('usuario');
    expect(usuario).not.toHaveProperty('hash');

    const headers = { Authorization: `Bearer ${token}` };
    expect(await estado(firstValueFrom(http.get('/api/productos', { headers })))).toBe(200);
    expect(await estado(firstValueFrom(http.get('/api/usuarios', { headers })))).toBe(403);
    expect(await estado(firstValueFrom(http.delete('/api/productos/1', { headers })))).toBe(403);
  });

  it('detecta correos ya registrados (validación asíncrona)', async () => {
    const r = await firstValueFrom(http.get<{ disponible: boolean }>('/api/usuarios/email-disponible', { params: { email: 'ADMIN@gestionstock.test' } }));
    expect(r.disponible).toBe(false);
  });

  it('rechaza un token manipulado', async () => {
    const { token } = await firstValueFrom(
      http.post<RespuestaAuth>('/api/auth/registro', { nombre: 'Prueba', email: 'otro@prueba.test', password: 'clave1234' }),
    );
    const [cab, cuerpo, firma] = token.split('.');
    const payload = JSON.parse(atob(cuerpo.replace(/-/g, '+').replace(/_/g, '/')));
    const falso = btoa(JSON.stringify({ ...payload, rol: 'admin' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const headers = { Authorization: `Bearer ${cab}.${falso}.${firma}` };
    expect(await estado(firstValueFrom(http.get('/api/usuarios', { headers })))).toBe(401);
  });
});
