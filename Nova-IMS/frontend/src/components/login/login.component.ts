import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
  FormGroup,
} from "@angular/forms";
import { AuthService } from "../../services/auth.service";
import { NotificationService } from "../../services/notification.service";

type Step = "credentials" | "otp";

interface OtpForm {
  d0: FormControl<string>;
  d1: FormControl<string>;
  d2: FormControl<string>;
  d3: FormControl<string>;
  d4: FormControl<string>;
  d5: FormControl<string>;
}

const REMEMBER_KEY = "ims_remember";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./login.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private fb                  = inject(FormBuilder);
  private authService         = inject(AuthService);
  private notificationService = inject(NotificationService);

  step            = signal<Step>("credentials");
  isLoading       = signal(false);
  errorMsg        = signal<string | null>(null);
  otpTarget       = signal<string>("");
  pendingUser     = signal<string>("");
  resendCountdown = signal(0);

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  loginForm = this.fb.group({
    agencia:    ["CENTRAL", [Validators.required]],
    rol:        ["", [Validators.required]],
    usuario:    ["", [Validators.required]],
    password:   ["", [Validators.required]],
    rememberMe: [false],
  });

  otpForm: FormGroup<OtpForm> = this.fb.group({
    d0: new FormControl<string>("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d$/)] }),
    d1: new FormControl<string>("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d$/)] }),
    d2: new FormControl<string>("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d$/)] }),
    d3: new FormControl<string>("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d$/)] }),
    d4: new FormControl<string>("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d$/)] }),
    d5: new FormControl<string>("", { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d$/)] }),
  }) as FormGroup<OtpForm>;

  ngOnInit(): void {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      try {
        const { agencia, rol, usuario } = JSON.parse(saved);
        this.loginForm.patchValue({ agencia, rol, usuario, rememberMe: true });
      } catch {
        localStorage.removeItem(REMEMBER_KEY);
      }
    }
  }

  submitCredentials(): void {
    if (this.loginForm.invalid) {
      this.errorMsg.set("Por favor, complete todos los campos.");
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { agencia, rol, usuario, password, rememberMe } = this.loginForm.value;

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ agencia, rol, usuario }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    this.authService
      .login({ agencia: agencia!, usuario: usuario!, password: password!, rol: rol! })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if ('requiresOtp' in res) {
            this.pendingUser.set(res.userId);
            this.otpTarget.set(res.otpTarget);
            this.step.set("otp");
            this.startResendCountdown();
          } else {
            this.notificationService.clearSessionNotifications();
            if (res.mustChangePassword) {
              this.authService.mustChangePassword.set(true);
              this.authService.currentView.set("change-password");
            } else {
              this.authService.currentView.set("dashboard");
            }
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMsg.set(err?.message || "No se pudo iniciar sesión.");
        },
      });
  }

  submitOtp(): void {
    if (this.otpForm.invalid) {
      this.errorMsg.set("Ingrese los 6 dígitos del código.");
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const v = this.otpForm.getRawValue();
    const code = [v.d0, v.d1, v.d2, v.d3, v.d4, v.d5].join("");

    this.authService.verifyOtp(this.pendingUser(), code).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.notificationService.clearSessionNotifications();
        if (res.mustChangePassword) {
          this.authService.mustChangePassword.set(true);
          this.authService.currentView.set("change-password");
          return;
        }
        this.authService.currentView.set("dashboard");
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.message || "Código incorrecto.");
        this.otpForm.reset();
      },
    });
  }

  resendCode(): void {
    if (this.resendCountdown() > 0) return;
    this.errorMsg.set(null);
    this.otpForm.reset();
    const { agencia, rol, usuario, password } = this.loginForm.value;
    this.isLoading.set(true);
    this.authService
      .login({ agencia: agencia!, usuario: usuario!, password: password!, rol: rol! })
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
          this.errorMsg.set(err?.message || "Error al reenviar el código.");
        },
      });
  }

  backToCredentials(): void {
    this.step.set("credentials");
    this.errorMsg.set(null);
    this.otpForm.reset();
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  onOtpInput(event: Event, current: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, "").slice(-1);
    const key = `d${current}` as keyof OtpForm;
    this.otpForm.controls[key].setValue(val);
    if (val && current < 5) {
      const next = document.getElementById(`otp-${current + 1}`);
      (next as HTMLInputElement)?.focus();
    }
    if (this.otpForm.valid) this.submitOtp();
  }

  onOtpKeydown(event: KeyboardEvent, current: number): void {
    if (event.key === "Backspace") {
      const key = `d${current}` as keyof OtpForm;
      if (!this.otpForm.controls[key].value && current > 0) {
        const prev = document.getElementById(`otp-${current - 1}`);
        (prev as HTMLInputElement)?.focus();
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData("text") ?? "";
    const digits = text.replace(/\D/g, "").slice(0, 6);
    const keys: (keyof OtpForm)[] = ["d0","d1","d2","d3","d4","d5"];
    digits.split("").forEach((d, i) => {
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