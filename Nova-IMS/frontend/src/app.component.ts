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
} from "@angular/core";
import { CommonModule } from "@angular/common";

import { IncidentsComponent } from "./components/incidents/incidents.component";
import { AdminComponent } from "./components/admin/admin.component";
import { ReportsComponent } from "./components/reports/reports.component";
import { IncidentListComponent } from "./components/incident-list/incident-list.component";
import { NotificationService } from "./services/notification.service";
import { LoginComponent } from "./components/login/login.component";
import { LocationRequestService } from "./services/location-request.service";
import { AuthService } from "./services/auth.service";
import { ChangePasswordComponent } from "./components/change-password/change-password.component";
import { InactivityService } from "./services/inactivity.service";
import { SessionWarningComponent } from "./components/session-warning/session-warning.component";

type View = "dashboard" | "incidents" | "reports" | "admin" | "change-password";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
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
  ],
})
export class AppComponent implements OnInit {
  notificationService = inject(NotificationService);
  locationRequestService = inject(LocationRequestService);
  authService = inject(AuthService);
  inactivityService = inject(InactivityService);

  private readonly elementRef = inject(ElementRef);

  @ViewChild("notificationContainer")
  notificationContainer!: ElementRef;

  @ViewChild("profileContainer")
  profileContainer!: ElementRef;

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  mustChangePassword = this.authService.mustChangePassword;

  activeView = this.authService.currentView;
  isSidebarOpen = signal(true);
  isProfileOpen = signal(false);
  isNotificationsOpen = signal(false);
  isDarkTheme = signal(true);
  phoneNumber = signal("");
  toastNotification = signal<any | null>(null);

  constructor() {
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
      } else {
        this.inactivityService.stop();
      }
    });
  }

  ngOnInit() {
    this.authService.checkAuth();
  }
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
  
    if (
      this.notificationContainer &&
      !this.notificationContainer.nativeElement.contains(target)
    ) {
      this.isNotificationsOpen.set(false);
    }
  
    if (
      this.profileContainer &&
      !this.profileContainer.nativeElement.contains(target)
    ) {
      this.isProfileOpen.set(false);
    }
  }

  logout(): void {
    this.notificationService.clearSessionNotifications();
    this.inactivityService.stop();
    this.authService.logout();
    this.isProfileOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.authService.currentView.set("dashboard");
  }

  setView(view: View): void {
    if (this.authService.mustChangePassword()) {
      this.authService.currentView.set("change-password");
      return;
    }
    this.authService.currentView.set(view);
    if (window.innerWidth < 768) {
      this.isSidebarOpen.set(false);
    }
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

  toggleTheme(): void {
    this.isDarkTheme.update((dark) => !dark);
  }

  sendLocationRequest(): void {
    const number = this.phoneNumber();
    if (number) {
      this.authService.currentView.set("incidents");
      void this.locationRequestService.requestLocation(number);
    }
  }

  sendLocationRequestViaSms(): void {
    const number = this.phoneNumber();
    if (number) {
      this.authService.currentView.set("incidents");
      void this.locationRequestService.requestLocationViaSms(number);
    }
  }
}