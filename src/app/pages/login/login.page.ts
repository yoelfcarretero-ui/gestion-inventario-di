import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonInputPasswordToggle, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cubeOutline } from 'ionicons/icons';

import { AuthStore } from '../../core/auth/auth.store';
import { mensajeDeError } from '../../core/utils/errores.util';
import { mensajeValidacion, senalFormulario } from '../../core/utils/formularios.util';

/** Pantalla de inicio de sesión. */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonIcon],
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Ruta a la que volver tras iniciar sesión (query param `volverA`, enlazado por el router). */
  readonly volverA = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  private readonly cambios = senalFormulario(this.form);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = this.auth.motivoCierre;

  protected readonly errorEmail = computed(() => (this.cambios(), mensajeValidacion(this.form.controls.email)));
  protected readonly errorPassword = computed(() => (this.cambios(), mensajeValidacion(this.form.controls.password)));

  constructor() {
    addIcons({ cubeOutline });
  }

  protected async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.auth.iniciarSesion(this.form.getRawValue());
      const destino = this.volverA()?.startsWith('/') ? this.volverA()! : '/inicio';
      await this.router.navigateByUrl(destino, { replaceUrl: true });
      this.form.reset();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
