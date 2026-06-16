import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Agency, RoleOption } from '../../models/user.model';

type Step = 'credentials' | 'otp';

interface OtpForm {
  d0: FormControl<string>;
  d1: FormControl<string>;
  d2: FormControl<string>;
  d3: FormControl<string>;
  d4: FormControl<string>;
  d5: FormControl<string>;
}

const REMEMBER_KEY = 'ims_remember';
const LOGIN_NOTICE_KEY = 'ims_login_notice';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  step = signal<Step>('credentials');
  isLoading = signal(false);
  agenciesLoading = signal(true);
  rolesLoading = signal(false);
  agencies = signal<Agency[]>([]);
  roles = signal<RoleOption[]>([]);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  otpTarget = signal<string>('');
  pendingUser = signal<string>('');
  pendingAgency = signal<string>('');
  resendCountdown = signal(0);

  private resendTimer: ReturnType<typeof setInterval> | null = null;
  private agencySub: Subscription | null = null;
  private rolesSub: Subscription | null = null;

  loginForm = this.fb.group({
    agencia: ['', [Validators.required]],
    rol: [{ value: '', disabled: true }, [Validators.required]],
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  otpForm: FormGroup<OtpForm> = this.fb.group({
    d0: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d$/)],
    }),
    d1: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d$/)],
    }),
    d2: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d$/)],
    }),
    d3: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d$/)],
    }),
    d4: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d$/)],
    }),
    d5: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d$/)],
    }),
  }) as FormGroup<OtpForm>;

  ngOnInit(): void {
    const notice = sessionStorage.getItem(LOGIN_NOTICE_KEY);
    if (notice) {
      sessionStorage.removeItem(LOGIN_NOTICE_KEY);
      this.successMsg.set(notice);
    }

    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      try {
        const { usuario } = JSON.parse(saved);
        this.loginForm.patchValue({
          usuario: usuario ?? '',
          rememberMe: true,
        });
      } catch {
        localStorage.removeItem(REMEMBER_KEY);
      }
    }

    this.authService.getAgencies().subscribe({
      next: (list) => {
        this.agencies.set(list);
        this.agenciesLoading.set(false);
        this.loginForm.patchValue({ agencia: '' });
      },
      error: () => {
        this.agenciesLoading.set(false);
        this.errorMsg.set(
          'No se pudieron cargar las agencias. Verifique que el backend esté activo.',
        );
      },
    });

    this.agencySub = this.loginForm.controls.agencia.valueChanges.subscribe((code) => {
      this.loadRolesForAgency(code || '');
    });
  }

  ngOnDestroy(): void {
    this.agencySub?.unsubscribe();
    this.rolesSub?.unsubscribe();
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  private loadRolesForAgency(agencyCode: string): void {
    this.rolesSub?.unsubscribe();
    this.resetRolSelection();

    if (!agencyCode) {
      this.roles.set([]);
      this.rolesLoading.set(false);
      this.loginForm.controls.rol.disable({ emitEvent: false });
      return;
    }

    this.loginForm.controls.rol.enable({ emitEvent: false });
    this.rolesLoading.set(true);

    this.rolesSub = this.authService.getRoles(agencyCode).subscribe({
      next: (list) => {
        this.roles.set(list);
        this.rolesLoading.set(false);
        // Evita que el navegador preseleccione el primer rol (p. ej. Administrador)
        queueMicrotask(() => this.resetRolSelection());
      },
      error: () => {
        this.rolesLoading.set(false);
        this.roles.set([]);
        this.resetRolSelection();
        this.errorMsg.set('No se pudieron cargar los roles para la agencia seleccionada.');
      },
    });
  }

  private resetRolSelection(): void {
    this.loginForm.controls.rol.setValue('', { emitEvent: false });
  }

  submitCredentials(): void {
    if (this.loginForm.invalid) {
      this.errorMsg.set('Por favor, complete todos los campos.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const { agencia, rol, usuario, password, rememberMe } = this.loginForm.getRawValue();

    if (!agencia) {
      this.isLoading.set(false);
      this.errorMsg.set('Seleccione una agencia.');
      return;
    }

    if (!rol) {
      this.isLoading.set(false);
      this.errorMsg.set('Seleccione un rol.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ usuario }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    this.authService
      .login({
        agencia,
        usuario: usuario!,
        password: password!,
        rol,
        rememberMe: !!rememberMe,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if ('requiresOtp' in res) {
            this.pendingUser.set(res.userId);
            this.pendingAgency.set(agencia);
            this.otpTarget.set(res.otpTarget);
            this.step.set('otp');
            this.startResendCountdown();
          } else {
            this.notificationService.clearSessionNotifications();
            if (res.mustChangePassword) {
              this.authService.mustChangePassword.set(true);
              this.authService.currentView.set('change-password');
            } else {
              this.authService.currentView.set('dashboard');
            }
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMsg.set(err?.message || 'No se pudo iniciar sesión.');
        },
      });
  }

  submitOtp(): void {
    if (this.otpForm.invalid) {
      this.errorMsg.set('Ingrese los 6 dígitos del código.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const v = this.otpForm.getRawValue();
    const code = [v.d0, v.d1, v.d2, v.d3, v.d4, v.d5].join('');

    this.authService.verifyOtp(this.pendingUser(), code, this.pendingAgency()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.notificationService.clearSessionNotifications();
        if (res.mustChangePassword) {
          this.authService.mustChangePassword.set(true);
          this.authService.currentView.set('change-password');
          return;
        }
        this.authService.currentView.set('dashboard');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.message || 'Código incorrecto.');
        this.otpForm.reset();
      },
    });
  }

  resendCode(): void {
    if (this.resendCountdown() > 0) return;
    this.errorMsg.set(null);
    this.otpForm.reset();
    const { agencia, rol, usuario, password, rememberMe } = this.loginForm.getRawValue();
    if (!agencia || !rol || !usuario || !password) {
      this.errorMsg.set('Sesión de login incompleta. Vuelva a ingresar credenciales.');
      this.step.set('credentials');
      return;
    }
    this.isLoading.set(true);
    this.authService
      .login({
        agencia,
        usuario,
        password,
        rol,
        rememberMe: !!rememberMe,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if ('requiresOtp' in res) {
            this.otpTarget.set(res.otpTarget);
            this.startResendCountdown();
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMsg.set(err?.message || 'Error al reenviar el código.');
        },
      });
  }

  backToCredentials(): void {
    this.step.set('credentials');
    this.errorMsg.set(null);
    this.otpForm.reset();
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  onOtpInput(event: Event, current: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    const key = `d${current}` as keyof OtpForm;
    this.otpForm.controls[key].setValue(val);
    if (val && current < 5) {
      const next = document.getElementById(`otp-${current + 1}`);
      (next as HTMLInputElement)?.focus();
    }
    if (this.otpForm.valid) this.submitOtp();
  }

  onOtpKeydown(event: KeyboardEvent, current: number): void {
    if (event.key === 'Backspace') {
      const key = `d${current}` as keyof OtpForm;
      if (!this.otpForm.controls[key].value && current > 0) {
        const prev = document.getElementById(`otp-${current - 1}`);
        (prev as HTMLInputElement)?.focus();
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6);
    const keys: (keyof OtpForm)[] = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'];
    digits.split('').forEach((d, i) => {
      if (i < keys.length) this.otpForm.controls[keys[i]].setValue(d);
    });
    if (digits.length === 6) this.submitOtp();
  }

  private startResendCountdown(seconds = 60): void {
    this.resendCountdown.set(seconds);
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      const v = this.resendCountdown() - 1;
      this.resendCountdown.set(v);
      if (v <= 0 && this.resendTimer) clearInterval(this.resendTimer);
    }, 1000);
  }
}
