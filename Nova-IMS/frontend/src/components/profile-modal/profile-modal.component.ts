import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProfilePhotoService } from '../../services/profile-photo.service';

const LAST_LOGIN_KEY = 'ims_last_login_at';
const SESSION_STARTED_KEY = 'ims_session_started_at';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-modal.component.html',
  styles: [
    `
      .profile-modal-backdrop {
        background: rgb(15 23 42 / 0.55);
        backdrop-filter: blur(4px);
      }

      .profile-modal-panel {
        background: #1e293b;
        border: 1px solid #334155;
        box-shadow:
          0 25px 50px -12px rgb(0 0 0 / 0.45),
          0 0 0 1px rgb(255 255 255 / 0.04);
        overflow: hidden;
      }

      .profile-modal-hero {
        background: linear-gradient(145deg, #1e3a5f 0%, #2d4a6f 45%, #1e293b 100%);
        border-bottom: 1px solid rgb(255 255 255 / 0.08);
      }

      .profile-modal-close {
        color: rgb(203 213 225 / 0.85);
      }

      .profile-modal-close:hover {
        color: #fff;
        background: rgb(255 255 255 / 0.1);
      }

      .profile-modal-avatar-wrap {
        cursor: pointer;
        border: none;
        padding: 0;
        background: transparent;
        border-radius: 9999px;
      }

      .profile-modal-avatar-wrap:disabled {
        cursor: wait;
        opacity: 0.85;
      }

      .profile-modal-avatar-img,
      .profile-modal-avatar-fallback {
        width: 5.5rem;
        height: 5.5rem;
        border-radius: 9999px;
        object-fit: cover;
        border: 3px solid rgb(255 255 255 / 0.25);
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
      }

      .profile-modal-avatar-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #3b6b9e, #4a90d9);
        font-size: 1.5rem;
        font-weight: 700;
        color: #f0f7ff;
      }

      .profile-modal-avatar-overlay {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(15 23 42 / 0.55);
        color: #fff;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .profile-modal-avatar-wrap:hover .profile-modal-avatar-overlay,
      .profile-modal-avatar-wrap:focus-visible .profile-modal-avatar-overlay {
        opacity: 1;
      }

      .profile-modal-name {
        color: #f8fafc;
      }

      .profile-modal-subtitle {
        color: #cbd5e1;
      }

      .profile-modal-meta {
        color: #94a3b8;
      }

      .profile-modal-btn-primary {
        background: #3d75a8;
        color: #fff;
        transition: background 0.15s ease;
      }

      .profile-modal-btn-primary:hover:not(:disabled) {
        background: #326892;
      }

      .profile-modal-btn-ghost {
        color: #cbd5e1;
        border: 1px solid rgb(255 255 255 / 0.15);
        background: rgb(255 255 255 / 0.06);
        transition: background 0.15s ease;
      }

      .profile-modal-btn-ghost:hover:not(:disabled) {
        background: rgb(255 255 255 / 0.12);
      }

      .profile-modal-body {
        background: #1e293b;
      }

      .profile-modal-card {
        background: rgb(15 23 42 / 0.45);
        border: 1px solid #334155;
      }

      .profile-modal-section-title {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #94a3b8;
      }

      .profile-modal-rows {
        margin: 0;
      }

      .profile-modal-row {
        display: grid;
        grid-template-columns: minmax(0, 38%) minmax(0, 1fr);
        gap: 0.75rem;
        align-items: baseline;
        padding: 0.55rem 0;
        border-bottom: 1px solid rgb(51 65 85 / 0.65);
      }

      .profile-modal-row-last {
        border-bottom: none;
        padding-bottom: 0;
      }

      .profile-modal-row dt {
        font-size: 0.75rem;
        color: #64748b;
        margin: 0;
      }

      .profile-modal-row dd {
        font-size: 0.8125rem;
        font-weight: 500;
        color: #e2e8f0;
        margin: 0;
        text-align: right;
      }

      .profile-modal-muted {
        color: #64748b !important;
        font-weight: 400 !important;
      }

      .profile-modal-session-local {
        background: rgb(61 117 168 / 0.18);
        color: #93c5fd;
        border: 1px solid rgb(61 117 168 / 0.35);
      }

      .profile-modal-session-ldap {
        background: rgb(14 165 233 / 0.15);
        color: #7dd3fc;
        border: 1px solid rgb(14 165 233 / 0.3);
      }

      .profile-modal-status {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        background: rgb(34 197 94 / 0.12);
        color: #4ade80;
        border: 1px solid rgb(34 197 94 / 0.28);
      }

      .profile-modal-status-dot {
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 9999px;
        background: #4ade80;
      }

      .profile-modal-footer {
        background: rgb(15 23 42 / 0.6);
        border-top: 1px solid #334155;
      }

      .profile-modal-footer-hint {
        color: #64748b;
      }

      .profile-modal-btn-close {
        color: #e2e8f0;
        background: rgb(51 65 85 / 0.5);
        border: 1px solid #475569;
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .profile-modal-btn-close:hover {
        background: rgb(51 65 85 / 0.85);
        border-color: #64748b;
      }

      /* Tema claro */
      :host-context(.theme-light) .profile-modal-panel,
      :host-context(html.theme-light) .profile-modal-panel {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 20px 40px -12px rgb(15 23 42 / 0.18);
      }

      :host-context(.theme-light) .profile-modal-hero,
      :host-context(html.theme-light) .profile-modal-hero {
        background: linear-gradient(145deg, #3b6b9e 0%, #4a7fb5 50%, #5a8fc4 100%);
        border-bottom-color: rgb(255 255 255 / 0.2);
      }

      :host-context(.theme-light) .profile-modal-body,
      :host-context(html.theme-light) .profile-modal-body {
        background: #f8fafc;
      }

      :host-context(.theme-light) .profile-modal-card,
      :host-context(html.theme-light) .profile-modal-card {
        background: #ffffff;
        border-color: #e2e8f0;
      }

      :host-context(.theme-light) .profile-modal-row,
      :host-context(html.theme-light) .profile-modal-row {
        border-bottom-color: #f1f5f9;
      }

      :host-context(.theme-light) .profile-modal-row dt,
      :host-context(html.theme-light) .profile-modal-row dt {
        color: #64748b;
      }

      :host-context(.theme-light) .profile-modal-row dd,
      :host-context(html.theme-light) .profile-modal-row dd {
        color: #0f172a;
      }

      :host-context(.theme-light) .profile-modal-section-title,
      :host-context(html.theme-light) .profile-modal-section-title {
        color: #475569;
      }

      :host-context(.theme-light) .profile-modal-footer,
      :host-context(html.theme-light) .profile-modal-footer {
        background: #ffffff;
        border-top-color: #e2e8f0;
      }

      :host-context(.theme-light) .profile-modal-btn-close,
      :host-context(html.theme-light) .profile-modal-btn-close {
        color: #334155;
        background: #f1f5f9;
        border-color: #e2e8f0;
      }

      :host-context(.theme-light) .profile-modal-btn-close:hover,
      :host-context(html.theme-light) .profile-modal-btn-close:hover {
        background: #e2e8f0;
      }
    `,
  ],
})
export class ProfileModalComponent implements OnInit {
  readonly closed = output<void>();

  protected readonly authService = inject(AuthService);
  protected readonly photoService = inject(ProfilePhotoService);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

  photoError = signal<string | null>(null);
  isUpdatingPhoto = signal(false);
  isLoadingProfile = signal(true);

  ngOnInit(): void {
    this.authService.refreshProfile().subscribe({
      next: () => this.isLoadingProfile.set(false),
      error: () => this.isLoadingProfile.set(false),
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onBackdropKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.close();
  }

  triggerPhotoPicker(): void {
    this.photoError.set(null);
    this.fileInput()?.nativeElement.click();
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const user = this.authService.currentUser();
    if (!file || !user) return;

    this.isUpdatingPhoto.set(true);
    this.photoError.set(null);
    try {
      const result = await this.photoService.setPhotoFromFile(user.id, file);
      if (result.ok === false) {
        this.photoError.set(result.error);
      }
    } catch {
      this.photoError.set('No se pudo cargar la imagen. Intente de nuevo.');
    } finally {
      this.isUpdatingPhoto.set(false);
    }
  }

  removePhoto(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    this.photoService.removePhoto(user.id);
    this.photoError.set(null);
  }

  agencyLabel(): string {
    const user = this.authService.currentUser();
    if (!user) return '—';
    const name = String(user.agencyName || '').trim();
    const code = String(user.agency || '').trim();
    if (name && code) return `${name} (${code})`;
    return name || code || '—';
  }

  agencyShortLabel(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    const code = String(user.agency || '').trim();
    const name = String(user.agencyName || '').trim();
    if (code && name) return `${code} · ${name}`;
    return code || name;
  }

  roleLabel(): string {
    const role = String(this.authService.currentUser()?.role || '').trim();
    return role || '—';
  }

  phoneLabel(): string {
    const phone = String(this.authService.currentUser()?.phone || '').trim();
    return phone || 'No registrado';
  }

  hasPhone(): boolean {
    return !!String(this.authService.currentUser()?.phone || '').trim();
  }

  sessionTypeLabel(): string {
    return this.authService.authSourceLabel();
  }

  lastAccessLabel(): string {
    const raw =
      localStorage.getItem(LAST_LOGIN_KEY) || sessionStorage.getItem(SESSION_STARTED_KEY);
    if (!raw) return 'Sesión actual';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'Sesión actual';
    return date.toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  accountStatusLabel(): string {
    return this.authService.isAuthenticated() ? 'Activo' : '—';
  }
}
