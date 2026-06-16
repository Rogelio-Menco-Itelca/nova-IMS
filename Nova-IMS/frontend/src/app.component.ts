import {
  Component,
  ChangeDetectionStrategy,
  signal,
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
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { InactivityService } from './services/inactivity.service';
import { SessionWarningComponent } from './components/session-warning/session-warning.component';
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { ProfilePhotoService } from './services/profile-photo.service';
import { IncidentLeaveGuardService } from './services/incident-leave-guard.service';

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
  readonly inactivityService = inject(InactivityService);
  readonly profilePhotoService = inject(ProfilePhotoService);
  private readonly incidentLeaveGuard = inject(IncidentLeaveGuardService);

  private readonly elementRef = inject(ElementRef);

  @ViewChild('notificationContainer')
  notificationContainer!: ElementRef;

  @ViewChild('profileContainer')
  profileContainer!: ElementRef;

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  mustChangePassword = this.authService.mustChangePassword;

  activeView = this.authService.currentView;
  isSidebarOpen = signal(true);
  isProfileOpen = signal(false);
  isProfileModalOpen = signal(false);
  isNotificationsOpen = signal(false);
  isDarkTheme = signal(true);
  phoneNumber = signal('');
  toastNotification = signal<{ title: string; message: string } | null>(null);

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
        this.inactivityService.start();
        this.profilePhotoService.loadForUser(this.authService.currentUser()?.id);
      } else {
        this.inactivityService.stop();
        this.profilePhotoService.loadForUser(null);
      }
    });
  }

  ngOnInit() {
    this.authService.checkAuth();
    if (this.authService.isAuthenticated()) {
      this.notificationService.restoreSession();
    }
    this.profilePhotoService.loadForUser(this.authService.currentUser()?.id);
    if (localStorage.getItem(THEME_KEY) === 'light') {
      this.isDarkTheme.set(false);
    }
    this.applyTheme(this.isDarkTheme());
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

    if (this.profileContainer && !this.profileContainer.nativeElement.contains(target)) {
      this.isProfileOpen.set(false);
    }
  }

  logout(): void {
    this.notificationService.clearSessionNotifications();
    this.inactivityService.stop();
    this.authService.logout();
    this.isProfileOpen.set(false);
    this.isProfileModalOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.authService.currentView.set('dashboard');
  }

  setView(view: View): void {
    if (this.authService.mustChangePassword()) {
      this.authService.currentView.set('change-password');
      return;
    }

    const navigate = () => {
      this.authService.currentView.set(view);
      if (window.innerWidth < 768) {
        this.isSidebarOpen.set(false);
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

  sendLocationRequest(): void {
    const number = this.phoneNumber();
    if (number) {
      this.authService.currentView.set('incidents');
      this.locationRequestService.requestLocation(number).catch(() => void 0);
    }
  }

  sendLocationRequestViaSms(): void {
    const number = this.phoneNumber();
    if (number) {
      this.authService.currentView.set('incidents');
      this.locationRequestService.requestLocationViaSms(number).catch(() => void 0);
    }
  }
}
