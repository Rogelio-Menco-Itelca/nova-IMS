import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

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
  success = signal(false);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
  });

  changePassword() {
    this.error.set(null);
    if (this.form.invalid) return;

    this.authService.changePassword({
      currentPassword: this.form.value.currentPassword!,
      newPassword: this.form.value.newPassword!,
    }).subscribe({
      next: () => {
        this.authService.clearMustChangePassword();
        this.authService.currentView.set('dashboard');
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message || 'Error al cambiar contraseña');
      }
    });
  }
}