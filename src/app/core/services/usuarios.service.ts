import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';

/** Acceso a la API REST de usuarios (solo administradores, salvo la comprobación de correo). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.api);
  }

  actualizar(id: number, cambios: Partial<Pick<Usuario, 'rol' | 'activo'>>): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.api}/${id}`, cambios);
  }

  /** Consulta si un correo está libre (validación asíncrona del registro). */
  emailDisponible(email: string): Observable<boolean> {
    const params = new HttpParams().set('email', email);
    return this.http.get<{ disponible: boolean }>(`${this.api}/email-disponible`, { params }).pipe(map((r) => r.disponible));
  }
}
