import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Categoria, Producto, ProductoEditable, Proveedor } from '../models/producto.model';

/**
 * Acceso a la API REST de productos y catálogos (origen de datos relacional / SQL).
 * Todas las operaciones son asíncronas y devuelven Observables de RxJS.
 */
@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}`;

  /** GET /productos — reintenta una vez ante fallos transitorios. */
  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.api}/productos`).pipe(retry({ count: 1, delay: 500 }));
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.api}/productos/${id}`);
  }

  crear(datos: ProductoEditable): Observable<Producto> {
    return this.http.post<Producto>(`${this.api}/productos`, datos);
  }

  actualizar(id: number, datos: ProductoEditable): Observable<Producto> {
    return this.http.put<Producto>(`${this.api}/productos/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/productos/${id}`);
  }

  /** Suma (o resta, si `delta` es negativo) unidades al stock de un producto. */
  ajustarStock(id: number, delta: number): Observable<Producto> {
    return this.http.patch<Producto>(`${this.api}/productos/${id}/stock`, { delta });
  }

  /**
   * Comprueba en el servidor si un SKU está libre (para la validación asíncrona del formulario).
   * @param excluirId id del producto que se está editando, para no compararlo consigo mismo
   */
  skuDisponible(sku: string, excluirId?: number): Observable<boolean> {
    let params = new HttpParams().set('sku', sku);
    if (excluirId) {
      params = params.set('excluirId', excluirId);
    }
    return this.http
      .get<{ disponible: boolean }>(`${this.api}/productos/sku-disponible`, { params })
      .pipe(map((r) => r.disponible));
  }

  categorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.api}/categorias`).pipe(retry({ count: 1, delay: 500 }));
  }

  proveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${this.api}/proveedores`).pipe(retry({ count: 1, delay: 500 }));
  }
}
