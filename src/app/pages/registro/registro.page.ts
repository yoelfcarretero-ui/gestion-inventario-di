import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, IonSpinner } from '@ionic/angular';

import { AuthStore } from '../../core/auth/auth.store';
import { UsuariosService } from '../../core/services/usuarios.service';
import { mensajeDeError } from '../../core/utils/errores.util';
import { mensajeValidacion, senalFormulario } from '../../core/utils/formularios.util';
import { valorDisponibleValidator } from '../../core/validators/validadores-asincronos';

/** Validador de grupo: la confirmación debe coincidir con la contraseña. */
function contrasenasCoinciden(grupo: AbstractControl): ValidationErrors | null {
  const { password, confirmar } = grupo.value as { password: string; confirmar: string };
  return confirmar && password !== confirmar ? { noCoinciden: true } : null;
}

/**
 * Alta de un nuevo Usuario estándar.
 * El correo se valida de forma asíncrona contra la API para avisar en vivo si ya está registrado.
 */
@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['../login/login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner],
})
export class RegistroPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly usuarios = inject(UsuariosService);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      email: [
        '',
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [valorDisponibleValidator((v) => this.usuarios.emailDisponible(v), 'emailOcupado')],
        },
      ],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: [contrasenasCoinciden] },
  );

  private readonly cambios = senalFormulario(this.form);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly errorNombre = computed(() => (this.cambios(), mensajeValidacion(this.form.controls.nombre)));
  protected readonly errorEmail = computed(
    () => (this.cambios(), mensajeValidacion(this.form.controls.email, { emailOcupado: 'Ya existe una cuenta con este correo.' })),
  );
  protected readonly ayudaEmail = computed(() => {
    this.cambios();
    const control = this.form.controls.email;
    if (control.pending) {
      return 'Comprobando disponibilidad…';
    }
    return control.valid ? 'Correo disponible.' : 'Usaremos este correo para identificarte.';
  });
  protected readonly errorPassword = computed(
    () =>
      (this.cambios(),
      mensajeValidacion(this.form.controls.password, { pattern: 'Debe contener al menos una letra y un número.' })),
  );
  protected readonly errorConfirmar = computed(() => {
    this.cambios();
    return this.form.hasError('noCoinciden') ? 'Las contraseñas no coinciden.' : mensajeValidacion(this.form.controls.confirmar);
  });
  /** Marca el campo de confirmación como inválido también cuando falla el validador de grupo. */
  protected readonly confirmarInvalido = computed(
    () => (this.cambios(), this.form.hasError('noCoinciden') && this.form.controls.confirmar.touched),
  );

  protected async enviar(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const { nombre, email, password } = this.form.getRawValue();
      await this.auth.registrar({ nombre, email, password });
      await this.router.navigateByUrl('/inicio', { replaceUrl: true });
      this.form.reset();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
