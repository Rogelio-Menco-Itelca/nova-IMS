import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { passwordHints, validateNewPassword } from '../../utils/password-policy';

const LOGIN_NOTICE_KEY = 'ims_login_notice';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  error = signal<string | null>(null);
  isSubmitting = signal(false);
  isForced = this.authService.mustChangePassword;

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  onPasswordFieldsInput(): void {
    const next = String(this.form.value.newPassword || '');
    const confirm = String(this.form.value.confirmPassword || '');
    if (confirm && next !== confirm) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.error.set(null);
  }

  blockConfirmPaste(event: Event): void {
    event.preventDefault();
    this.error.set('Escriba de nuevo la contraseña. No se permite pegar en confirmar.');
  }

  cancel(): void {
    if (this.isForced()) return;
    this.authService.currentView.set('dashboard');
  }

  newPasswordHints() {
    return passwordHints(String(this.form.value.newPassword || ''), {
      currentPassword: String(this.form.value.currentPassword || ''),
      username: String(this.authService.currentUser()?.id || ''),
    });
  }

  confirmMatches(): boolean {
    const next = String(this.form.value.newPassword || '');
    const confirm = String(this.form.value.confirmPassword || '');
    return !!next && !!confirm && next === confirm;
  }

  changePassword() {
    this.error.set(null);
    if (this.form.invalid || this.isSubmitting()) return;

    const currentPassword = String(this.form.value.currentPassword || '');
    const newPassword = String(this.form.value.newPassword || '');
    const confirmPassword = String(this.form.value.confirmPassword || '');
    const passwordError = validateNewPassword(newPassword, {
      currentPassword,
      username: String(this.authService.currentUser()?.id || ''),
    });
    if (passwordError) {
      this.error.set(passwordError);
      return;
    }
    if (!confirmPassword) {
      this.error.set('Confirme la nueva contraseña escribiéndola de nuevo.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
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

}
