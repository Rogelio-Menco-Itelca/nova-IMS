import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

const LOGIN_NOTICE_KEY = 'ims_login_notice';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  error = signal<string | null>(null);
  isSubmitting = signal(false);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
  });

  changePassword() {
    this.error.set(null);
    if (this.form.invalid || this.isSubmitting()) return;

    const passwordError = this.validateNewPassword(String(this.form.value.newPassword || ''));
    if (passwordError) {
      this.error.set(passwordError);
      return;
    }

    this.isSubmitting.set(true);

    this.authService
      .changePassword({
        currentPassword: this.form.value.currentPassword!,
        newPassword: this.form.value.newPassword!,
      })
      .subscribe({
        next: () => {
          sessionStorage.setItem(
            LOGIN_NOTICE_KEY,
            'Contraseña actualizada correctamente. Inicie sesión con su nueva contraseña.',
          );
          this.authService.logout();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.set(
            err?.error?.error?.message || err?.error?.message || 'Error al cambiar contraseña',
          );
        },
      });
  }

  private validateNewPassword(password: string): string | null {
    const missing: string[] = [];
    if (!password) return 'Ingrese la nueva contraseña.';
    if (password.length < 8) missing.push('mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) missing.push('una mayúscula (A-Z)');
    if (!/[a-z]/.test(password)) missing.push('una minúscula (a-z)');
    if (!/\d/.test(password)) missing.push('un número (0-9)');
    if (!/[^A-Za-z0-9]/.test(password)) missing.push('un símbolo (#, @, !, etc.)');
    if (/\s/.test(password)) missing.push('sin espacios');
    if (!missing.length) return null;
    return `La nueva contraseña no es válida. Falta: ${missing.join(', ')}.`;
  }
}
