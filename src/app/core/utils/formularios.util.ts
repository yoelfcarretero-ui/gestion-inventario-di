import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { map } from 'rxjs';

/**
 * Convierte los eventos de un formulario reactivo (valor, estado, touched...) en una señal.
 *
 * La app funciona sin Zone.js, así que las señales computadas que dependan de esta señal
 * se recalculan —y la vista se actualiza— también cuando termina una validación asíncrona.
 */
export function senalFormulario(control: AbstractControl): Signal<number> {
  return toSignal(control.events.pipe(map((_, i) => i)), { initialValue: -1 });
}

/** Mensajes de error estándar para los validadores más habituales. */
export function mensajeValidacion(control: AbstractControl | null, nombres: Record<string, string> = {}): string {
  if (!control?.errors) {
    return '';
  }
  const [clave, valor] = Object.entries(control.errors)[0] as [string, Record<string, number>];
  if (nombres[clave]) {
    return nombres[clave];
  }
  switch (clave) {
    case 'required':
      return 'Este campo es obligatorio.';
    case 'email':
      return 'Introduce un correo electrónico válido.';
    case 'minlength':
      return `Debe tener al menos ${valor['requiredLength']} caracteres.`;
    case 'maxlength':
      return `No puede superar ${valor['requiredLength']} caracteres.`;
    case 'min':
      return `El valor mínimo es ${valor['min']}.`;
    case 'max':
      return `El valor máximo es ${valor['max']}.`;
    case 'pattern':
      return 'El formato no es válido.';
    default:
      return 'El valor no es válido.';
  }
}
