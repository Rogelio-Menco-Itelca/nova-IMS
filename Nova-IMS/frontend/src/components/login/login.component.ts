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
import { IncidentService } from '../../services/incident.service';
import { ConfigurationService } from '../../services/configuration.service';
import { PersonService } from '../../services/person.service';
import { Agency, RoleOption } from '../../models/user.model';
import { passwordHints, validateNewPassword } from '../../utils/password-policy';

type Step = 'credentials' | 'otp' | 'forgot' | 'reset' | 'change';

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
  private readonly incidentService = inject(IncidentService);
  private readonly configurationService = inject(ConfigurationService);
  private readonly personService = inject(PersonService);

  step = signal<Step>('credentials');
  isLoading = signal(false);
  agenciesLoading = signal(true);
  rolesLoading = signal(false);
  agencies = signal<Agency[]>([]);
  roles = signal<RoleOption[]>([]);
  private rolesByAgency = signal<Record<string, RoleOption[]>>({});
  private catalogReady = signal(false);
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

  resetForm = this.fb.group({
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  changeForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  stepSubtitle(): string {
    switch (this.step()) {
      case 'forgot':
        return 'Olvidó su contraseña';
      case 'reset':
        return 'Código y nueva contraseña';
      case 'change':
        return 'Cambiar contraseña';
      case 'otp':
        return 'Verificación en dos pasos';
      default:
        return 'Bienvenido de nuevo';
    }
  }

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

    this.authService.getLoginOptions().subscribe({
      next: ({ agencies, rolesByAgency }) => {
        this.agencies.set(agencies || []);
        this.rolesByAgency.set(rolesByAgency || {});
        this.catalogReady.set(Object.keys(rolesByAgency || {}).length > 0);
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

  private agencyKey(code: string): string {
    return String(code || '').trim().toUpperCase();
  }

  private applyRoles(list: RoleOption[]): void {
    this.roles.set(list);
    this.rolesLoading.set(false);
    if (list.length) {
      this.loginForm.controls.rol.enable({ emitEvent: false });
    } else {
      this.loginForm.controls.rol.disable({ emitEvent: false });
    }
    this.resetRolSelection();
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

    const key = this.agencyKey(agencyCode);
    if (this.catalogReady()) {
      this.applyRoles(this.rolesByAgency()[key] || []);
      return;
    }

    this.loginForm.controls.rol.disable({ emitEvent: false });
    this.roles.set([]);
    this.rolesLoading.set(true);

    this.rolesSub = this.authService.getRoles(key).subscribe({
      next: (list) => this.applyRoles(list || []),
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
    const usuarioTrim = String(usuario || '').trim();

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

    if (!usuarioTrim || /\s/.test(usuarioTrim)) {
      this.isLoading.set(false);
      this.errorMsg.set('Ingrese un usuario válido, sin espacios.');
      return;
    }

    if (!password) {
      this.isLoading.set(false);
      this.errorMsg.set('Ingrese su contraseña.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ usuario: usuarioTrim }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    this.authService
      .login({
        agencia,
        usuario: usuarioTrim,
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
            this.clearAgencySessionData();
            this.notificationService.clearSessionNotifications();
            this.authService.bootstrapSessionPermissions().catch(() => {
            });
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
        this.clearAgencySessionData();
        this.notificationService.clearSessionNotifications();
        this.authService.bootstrapSessionPermissions().catch(() => {
        });
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
    this.successMsg.set(null);
    this.otpForm.reset();
    this.resetForm.reset();
    this.changeForm.reset();
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
    if (this.otpForm.valid && this.step() === 'otp') this.submitOtp();
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
    if (digits.length === 6 && this.step() === 'otp') this.submitOtp();
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

  startForgot(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.step.set('forgot');
  }

  startChange(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.changeForm.reset();
    this.step.set('change');
  }

  changePasswordHints() {
    return passwordHints(String(this.changeForm.value.newPassword || ''), {
      currentPassword: String(this.changeForm.value.currentPassword || ''),
      username: String(this.loginForm.controls.usuario.value || ''),
    });
  }

  resetPasswordHints() {
    return passwordHints(String(this.resetForm.value.newPassword || ''), {
      username: String(this.loginForm.controls.usuario.value || this.pendingUser() || ''),
    });
  }

  confirmMatches(form: 'change' | 'reset'): boolean {
    const source = form === 'change' ? this.changeForm.value : this.resetForm.value;
    const next = String(source.newPassword || '');
    const confirm = String(source.confirmPassword || '');
    return !!next && !!confirm && next === confirm;
  }

  onPasswordFieldsInput(form: 'change' | 'reset'): void {
    const source = form === 'change' ? this.changeForm.value : this.resetForm.value;
    const next = String(source.newPassword || '');
    const confirm = String(source.confirmPassword || '');
    if (confirm && next !== confirm) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }
    this.errorMsg.set(null);
  }

  blockConfirmPaste(event: Event): void {
    event.preventDefault();
    this.errorMsg.set('Escriba de nuevo la contraseña. No se permite pegar en confirmar.');
  }

  submitChange(): void {
    if (this.isLoading()) return;
    const agencia = String(this.loginForm.controls.agencia.value || '').trim();
    const usuario = String(this.loginForm.controls.usuario.value || '').trim();
    const currentPassword = String(this.changeForm.value.currentPassword || '');
    const newPassword = String(this.changeForm.value.newPassword || '');
    const confirmPassword = String(this.changeForm.value.confirmPassword || '');

    if (!agencia || !usuario) {
      this.errorMsg.set('Seleccione la agencia e ingrese el usuario.');
      return;
    }
    if (!currentPassword) {
      this.errorMsg.set('Ingrese la contraseña actual.');
      return;
    }
    const passwordError = validateNewPassword(newPassword, { currentPassword, username: usuario });
    if (passwordError) {
      this.errorMsg.set(passwordError);
      return;
    }
    if (!confirmPassword) {
      this.errorMsg.set('Confirme la nueva contraseña escribiéndola de nuevo.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.authService
      .changePasswordWithCredentials({ agencia, usuario, currentPassword, newPassword })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.successMsg.set(res.message);
          this.loginForm.patchValue({ password: '' });
          this.changeForm.reset();
          this.step.set('credentials');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMsg.set(err?.message || 'No se pudo cambiar la contraseña.');
        },
      });
  }

  submitForgot(): void {
    const agencia = String(this.loginForm.controls.agencia.value || '').trim();
    const usuario = String(this.loginForm.controls.usuario.value || '').trim();
    if (!agencia || !usuario) {
      this.errorMsg.set('Seleccione la agencia e ingrese el usuario.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.authService.forgotPassword({ agencia, usuario }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.pendingUser.set(res.userId);
        this.pendingAgency.set(agencia);
        this.otpTarget.set(res.otpTarget);
        this.successMsg.set(res.message);
        this.otpForm.reset();
        this.resetForm.reset();
        this.step.set('reset');
        this.startResendCountdown();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.message || 'No se pudo iniciar el restablecimiento.');
      },
    });
  }

  resendForgotCode(): void {
    if (this.resendCountdown() > 0) return;
    this.submitForgot();
  }

  submitReset(): void {
    if (this.isLoading()) return;
    if (this.otpForm.invalid) {
      this.errorMsg.set('Ingrese los 6 dígitos del código.');
      return;
    }
    const newPassword = String(this.resetForm.value.newPassword || '');
    const confirmPassword = String(this.resetForm.value.confirmPassword || '');
    const passwordError = validateNewPassword(newPassword, {
      username: String(this.loginForm.controls.usuario.value || this.pendingUser() || ''),
    });
    if (passwordError) {
      this.errorMsg.set(passwordError);
      return;
    }
    if (!confirmPassword) {
      this.errorMsg.set('Confirme la nueva contraseña escribiéndola de nuevo.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    const v = this.otpForm.getRawValue();
    const code = [v.d0, v.d1, v.d2, v.d3, v.d4, v.d5].join('');
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.authService
      .resetPassword({
        userId: this.pendingUser(),
        agencia: this.pendingAgency(),
        code,
        newPassword,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.successMsg.set(res.message);
          this.loginForm.patchValue({ password: '' });
          this.otpForm.reset();
          this.resetForm.reset();
          this.step.set('credentials');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMsg.set(err?.message || 'No se pudo restablecer la contraseña.');
        },
      });
  }

  /** Evita reutilizar en memoria datos de otra agencia al iniciar sesión. */
  private clearAgencySessionData(): void {
    this.incidentService.clearSessionData();
    this.configurationService.clearSessionData();
    this.personService.clearSessionData();
  }
}
