import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { IncidentsComponent } from './components/incidents/incidents.component';
import { AdminComponent } from './components/admin/admin.component';
import { ReportsComponent } from './components/reports/reports.component';
import { IncidentListComponent } from './components/incident-list/incident-list.component';
import { NotificationService } from './services/notification.service';
import { LoginComponent } from './components/login/login.component';
import { LocationRequestService } from './services/location-request.service';
import { AuthService } from './services/auth.service';
import { PermissionService } from './services/permission.service';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { InactivityService } from './services/inactivity.service';
import { SessionWarningComponent } from './components/session-warning/session-warning.component';
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { ProfilePhotoService } from './services/profile-photo.service';
import { IncidentLeaveGuardService } from './services/incident-leave-guard.service';
import { IncidentService } from './services/incident.service';
import { ConfigurationService } from './services/configuration.service';
import { PersonService } from './services/person.service';

type View = 'dashboard' | 'incidents' | 'reports' | 'admin' | 'change-password';

const THEME_KEY = 'ims_theme';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IncidentsComponent,
    AdminComponent,
    ReportsComponent,
    IncidentListComponent,
    LoginComponent,
    ChangePasswordComponent,
    SessionWarningComponent,
    ProfileModalComponent,
  ],
})
export class AppComponent implements OnInit {
  readonly notificationService = inject(NotificationService);
  readonly locationRequestService = inject(LocationRequestService);
  readonly authService = inject(AuthService);
  readonly permissionService = inject(PermissionService);
  readonly inactivityService = inject(InactivityService);
  readonly profilePhotoService = inject(ProfilePhotoService);
  private readonly incidentLeaveGuard = inject(IncidentLeaveGuardService);
  private readonly incidentService = inject(IncidentService);
  private readonly configurationService = inject(ConfigurationService);
  private readonly personService = inject(PersonService);

  private readonly elementRef = inject(ElementRef);

  @ViewChild('notificationContainer')
  notificationContainer!: ElementRef;

  @ViewChild('profileContainer')
  profileContainer!: ElementRef;

  @ViewChild('mobileProfileContainer')
  mobileProfileContainer!: ElementRef;

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  mustChangePassword = this.authService.mustChangePassword;

  activeView = this.authService.currentView;
  readonly activeViewLabel = computed(() => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      incidents: 'Incidentes',
      reports: 'Reportes',
      admin: 'Administración',
    };
    return labels[this.activeView()] ?? '';
  });
  todayLabel(): string {
    const s = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  isSidebarOpen = signal(false);
  isProfileOpen = signal(false);
  isProfileModalOpen = signal(false);
  isNotificationsOpen = signal(false);
  isDarkTheme = signal(true);
  phoneNumber = signal('');
  toastNotification = signal<{ title: string; message: string } | null>(null);
  private hadAuthenticatedSession = false;

  constructor() {
    effect(() => {
      const isDark = this.isDarkTheme();
      this.applyTheme(isDark);
    });

    effect(() => {
      const last = this.notificationService.lastNotification();
      if (last) {
        this.isNotificationsOpen.set(true);
        setTimeout(() => {
          this.isNotificationsOpen.set(false);
        }, 5000);
      }
    });

    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.hadAuthenticatedSession = true;
        this.inactivityService.start();
        this.profilePhotoService.loadForUser(this.authService.currentUser()?.id);
      } else {
        this.inactivityService.stop();
        this.profilePhotoService.loadForUser(null);
        // Limpia caché al cerrar sesión (botón, inactividad o 401), no en el arranque en frío.
        if (this.hadAuthenticatedSession) {
          this.clearAgencySessionData();
          this.hadAuthenticatedSession = false;
        }
      }
    });

    effect(() => {
      const locationData = this.locationRequestService.locationReceived();
      if (!locationData) return;
      if (this.authService.currentView() !== 'incidents') {
        this.authService.currentView.set('incidents');
      }
    });
  }

  ngOnInit() {
    this.authService.checkAuth();
    void this.initAuthenticatedSession();
    this.profilePhotoService.loadForUser(this.authService.currentUser()?.id);
    if (localStorage.getItem(THEME_KEY) === 'light') {
      this.isDarkTheme.set(false);
    }
    this.applyTheme(this.isDarkTheme());
    this.syncSidebarBodyClass();
  }

  private async initAuthenticatedSession(): Promise<void> {
    if (!this.authService.isAuthenticated()) return;
    this.notificationService.restoreSession();
    await this.permissionService.loadSessionPermissions();
  }

  private applyTheme(isDark: boolean): void {
    const isLight = !isDark;
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('theme-light', isLight);
    root.classList.toggle('dark', isDark);
    body.classList.toggle('theme-light', isLight);
    body.classList.toggle('bg-gray-900', isDark);
    body.classList.toggle('text-gray-100', isDark);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (this.notificationContainer && !this.notificationContainer.nativeElement.contains(target)) {
      this.isNotificationsOpen.set(false);
    }

    if (this.isProfileOpen()) {
      const inSidebar =
        this.profileContainer?.nativeElement.contains(target) ?? false;
      const inMobile =
        this.mobileProfileContainer?.nativeElement.contains(target) ?? false;
      if (!inSidebar && !inMobile) {
        this.isProfileOpen.set(false);
      }
    }
  }

  logout(): void {
    this.notificationService.clearSessionNotifications();
    this.clearAgencySessionData();
    this.inactivityService.stop();
    this.authService.logout();
    this.isProfileOpen.set(false);
    this.isProfileModalOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.authService.currentView.set('dashboard');
  }

  /** Evita reutilizar en memoria datos de otra agencia al cambiar de sesión. */
  private clearAgencySessionData(): void {
    this.incidentService.clearSessionData();
    this.configurationService.clearSessionData();
    this.personService.clearSessionData();
  }

  setView(view: View): void {
    if (this.authService.mustChangePassword()) {
      this.authService.currentView.set('change-password');
      return;
    }

    const navigate = () => {
      this.authService.currentView.set(view);
      if (window.innerWidth < 1024) {
        this.isSidebarOpen.set(false);
        this.syncSidebarBodyClass();
      }
    };

    const leavingIncidents =
      this.authService.currentView() === 'incidents' && view !== 'incidents';
    if (leavingIncidents && !this.incidentLeaveGuard.tryLeaveIncidentsView(navigate)) {
      return;
    }

    navigate();
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
    this.syncSidebarBodyClass();
  }

  private syncSidebarBodyClass(): void {
    const lockScroll = this.isSidebarOpen() && window.innerWidth < 1024;
    document.documentElement.classList.toggle('ims-sidebar-open', lockScroll);
  }

  toggleProfile(): void {
    const nextState = !this.isProfileOpen();
    this.isProfileOpen.set(nextState);
    if (nextState) {
      this.isNotificationsOpen.set(false);
    }
  }

  toggleNotifications(): void {
    const nextState = !this.isNotificationsOpen();
    this.isNotificationsOpen.set(nextState);
    if (nextState) {
      this.isProfileOpen.set(false);
      this.notificationService.markAllAsRead();
    }
  }

  openProfileModal(): void {
    this.isProfileOpen.set(false);
    this.isProfileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.isProfileModalOpen.set(false);
  }

  toggleTheme(): void {
    const next = !this.isDarkTheme();
    this.isDarkTheme.set(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    this.applyTheme(next);
  }

  onQuickLocationPhoneInput(event: Event): void {
    const el = event.target;
    if (el instanceof HTMLInputElement) {
      this.phoneNumber.set(el.value);
    }
  }

  async sendLocationRequest(): Promise<void> {
    const number = this.phoneNumber().trim();
    if (!number) return;
    const ok = await this.locationRequestService.requestLocation(number);
    if (ok) {
      this.phoneNumber.set('');
      if (this.authService.currentView() !== 'incidents') {
        this.setView('incidents');
      }
    }
  }

  async sendLocationRequestViaSms(): Promise<void> {
    const number = this.phoneNumber().trim();
    if (!number) return;
    const ok = await this.locationRequestService.requestLocationViaSms(number);
    if (ok) {
      this.phoneNumber.set('');
      if (this.authService.currentView() !== 'incidents') {
        this.setView('incidents');
      }
    }
  }
}
