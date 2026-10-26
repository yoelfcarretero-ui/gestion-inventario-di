import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, first, map, of, switchMap, timer } from 'rxjs';

/** Tiempo de espera tras la última pulsación antes de consultar al servidor (debounce). */
const ESPERA_MS = 400;

/**
 * Crea un validador asíncrono que consulta al servidor si un valor está libre.
 *
 * - Espera {@link ESPERA_MS} ms (debounce): como Angular cancela la validación anterior al cambiar
 *   el valor, solo se hace una petición cuando el usuario deja de escribir.
 * - Si la consulta falla no bloquea el formulario: el servidor volverá a validar al guardar.
 *
 * @param consulta función que devuelve `true` si el valor está disponible
 * @param clave nombre del error que se añade al control cuando el valor ya existe
 */
export function valorDisponibleValidator(
  consulta: (valor: string) => Observable<boolean>,
  clave: string,
): AsyncValidatorFn {
  return (control: AbstractControl<string>): Observable<ValidationErrors | null> => {
    const valor = (control.value ?? '').trim();
    if (!valor) {
      return of(null);
    }
    return timer(ESPERA_MS).pipe(
      switchMap(() => consulta(valor)),
      map((disponible) => (disponible ? null : { [clave]: true })),
      catchError(() => of(null)),
      first(),
    );
  };
}
