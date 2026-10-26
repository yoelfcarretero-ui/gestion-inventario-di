import { DestroyRef, Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { aleatorioEntre, almacenamiento } from '../utils/almacenamiento.util';

/** Documento genérico: cualquier objeto con un identificador de texto. */
export interface Documento {
  id: string;
}

/** Mensaje que se difunde a otras pestañas cuando cambia una colección. */
interface MensajeSync {
  coleccion: string;
  documentos: Documento[];
}

const PREFIJO = 'gi.nosql.';

/**
 * Referencia a una colección del almacén de documentos, con una API inspirada en Firebase Firestore.
 */
export class ColeccionRef<T extends Documento> {
  constructor(
    private readonly nombre: string,
    private readonly sujeto: BehaviorSubject<T[]>,
    private readonly escribir: (nombre: string, docs: T[]) => void,
  ) {}

  /**
   * Suscripción en tiempo real (equivalente a `onSnapshot`): emite el estado actual
   * tras la latencia de conexión y vuelve a emitir con cada cambio, también los hechos en otras pestañas.
   */
  enTiempoReal(): Observable<T[]> {
    return timer(aleatorioEntre(environment.latenciaSimulada.min, environment.latenciaSimulada.max)).pipe(
      switchMap(() => this.sujeto),
      distinctUntilChanged(),
    );
  }

  /**
   * Añade un documento (equivalente a `addDoc`, o a `setDoc` si se indica el id).
   * @param id identificador propio; si se omite se genera uno aleatorio
   */
  async agregar(datos: Omit<T, 'id'>, id: string = crypto.randomUUID()): Promise<T> {
    await this.latencia();
    const doc = { ...datos, id } as T;
    this.escribir(this.nombre, [...this.sujeto.value, doc]);
    return doc;
  }

  /** Fusiona cambios en un documento existente (equivalente a `updateDoc`). */
  async actualizar(id: string, cambios: Partial<Omit<T, 'id'>>): Promise<T> {
    await this.latencia();
    const actual = this.sujeto.value.find((d) => d.id === id);
    if (!actual) {
      throw new Error(`Documento ${this.nombre}/${id} no encontrado.`);
    }
    const actualizado = { ...actual, ...cambios };
    this.escribir(
      this.nombre,
      this.sujeto.value.map((d) => (d.id === id ? actualizado : d)),
    );
    return actualizado;
  }

  /** Elimina un documento (equivalente a `deleteDoc`). */
  async eliminar(id: string): Promise<void> {
    await this.latencia();
    this.escribir(
      this.nombre,
      this.sujeto.value.filter((d) => d.id !== id),
    );
  }

  private latencia(): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, aleatorioEntre(environment.latenciaSimulada.min, environment.latenciaSimulada.max)),
    );
  }
}

/**
 * Almacén de documentos NoSQL en tiempo real (simula Firebase Firestore).
 *
 * - Cada colección es una lista de documentos JSON sin esquema fijo, persistida en `localStorage`.
 * - Los cambios se propagan al instante a todos los suscriptores y, mediante `BroadcastChannel`,
 *   a las demás pestañas abiertas: si un administrador cambia el estado de un pedido en una pestaña,
 *   el usuario lo ve actualizarse en la otra sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class AlmacenDocumentos {
  private readonly colecciones = new Map<string, BehaviorSubject<Documento[]>>();
  private readonly canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gi.nosql') : null;

  constructor() {
    if (this.canal) {
      this.canal.onmessage = ({ data }: MessageEvent<MensajeSync>) => {
        this.colecciones.get(data.coleccion)?.next(data.documentos);
      };
      inject(DestroyRef).onDestroy(() => this.canal?.close());
    }
  }

  /**
   * Obtiene una referencia a una colección.
   * @param nombre nombre de la colección
   * @param semilla función que genera los documentos iniciales si la colección está vacía
   */
  coleccion<T extends Documento>(nombre: string, semilla: () => T[] = () => []): ColeccionRef<T> {
    let sujeto = this.colecciones.get(nombre) as BehaviorSubject<T[]> | undefined;
    if (!sujeto) {
      const guardados = almacenamiento.leer<T[] | null>(PREFIJO + nombre, null);
      const iniciales = guardados ?? semilla();
      if (!guardados) {
        almacenamiento.guardar(PREFIJO + nombre, iniciales);
      }
      sujeto = new BehaviorSubject<T[]>(iniciales);
      this.colecciones.set(nombre, sujeto as unknown as BehaviorSubject<Documento[]>);
    }
    return new ColeccionRef<T>(nombre, sujeto, (n, docs) => this.escribir(n, docs));
  }

  /** Borra una colección para que se regenere con su semilla. */
  reiniciar(nombre: string): void {
    almacenamiento.borrar(PREFIJO + nombre);
    this.colecciones.delete(nombre);
  }

  private escribir(nombre: string, documentos: Documento[]): void {
    almacenamiento.guardar(PREFIJO + nombre, documentos);
    this.colecciones.get(nombre)?.next(documentos);
    this.canal?.postMessage({ coleccion: nombre, documentos } satisfies MensajeSync);
  }
}
