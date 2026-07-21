import {
  Injectable,
  InjectionToken,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from './auth.service';

export const INACTIVITY_TIMEOUT_MS = new InjectionToken<number>('INACTIVITY_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 20 * 60 * 1000, // 20 minuto → cierre de sesión
});

export const INACTIVITY_WARNING_MS = new InjectionToken<number>('INACTIVITY_WARNING_MS', {
  providedIn: 'root',
  //factory: () =>  15 * 60 * 1000, // 60 segundos
  factory: () => 5 * 60 * 1000, // aviso a los 15 minutos
});

export const ACTIVITY_THROTTLE_MS = new InjectionToken<number>('ACTIVITY_THROTTLE_MS', {
  providedIn: 'root',
  factory: () => 1000, // 1 segundo
});

type ChannelMessage = { type: 'activity'; at: number } | { type: 'logout' };

const ACTIVITY_EVENTS: readonly (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
];

const CHANNEL_NAME = 'ims-inactivity';

const COUNTDOWN_TICK_MS = 1000;

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly timeoutMs = inject(INACTIVITY_TIMEOUT_MS);
  private readonly warningMs = inject(INACTIVITY_WARNING_MS);
  private readonly throttleMs = inject(ACTIVITY_THROTTLE_MS);

  private readonly warningSecondsSig = signal<number | null>(null);
  readonly warningSeconds = this.warningSecondsSig.asReadonly();
  readonly isWarningVisible = computed(() => this.warningSecondsSig() !== null);

  private warnTimerId: ReturnType<typeof setTimeout> | null = null;
  private expireTimerId: ReturnType<typeof setTimeout> | null = null;
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = Date.now();
  private channel: BroadcastChannel | null = null;
  private running = false;

  start(): void {
    if (this.running) return;
    if (!this.authService.isAuthenticated()) return;

    this.running = true;
    this.lastActivityAt = Date.now();
    this.warningSecondsSig.set(null);

    this.zone.runOutsideAngular(() => {
      this.attachActivityListeners();
      this.openChannel();
      this.armTimers();
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    this.detachActivityListeners();
    this.disarmTimers();
    this.closeChannel();
    this.warningSecondsSig.set(null);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private attachActivityListeners(): void {
    for (const ev of ACTIVITY_EVENTS) {
      globalThis.addEventListener(ev, this.onActivity, { passive: true });
    }
  }

  private detachActivityListeners(): void {
    for (const ev of ACTIVITY_EVENTS) {
      globalThis.removeEventListener(ev, this.onActivity);
    }
  }

  private readonly onActivity = (): void => {
    const now = Date.now();
    if (now - this.lastActivityAt < this.throttleMs) {
      return; // dentro del throttle window: ignorar
    }
    this.registerActivity(now, true);
  };

  private registerActivity(now: number, doBroadcast: boolean): void {
    this.lastActivityAt = now;
    this.armTimers();

    if (this.warningSecondsSig() !== null) {
      this.zone.run(() => this.warningSecondsSig.set(null));
    }

    if (doBroadcast) {
      this.broadcast({ type: 'activity', at: now });
    }
  }

  private armTimers(): void {
    this.disarmTimers();

    const warnDelay = Math.max(0, this.timeoutMs - this.warningMs);
    this.warnTimerId = setTimeout(() => this.enterWarningPhase(), warnDelay);
    this.expireTimerId = setTimeout(() => this.checkExpiration(), this.timeoutMs);
  }

  private disarmTimers(): void {
    if (this.warnTimerId !== null) {
      clearTimeout(this.warnTimerId);
      this.warnTimerId = null;
    }
    if (this.expireTimerId !== null) {
      clearTimeout(this.expireTimerId);
      this.expireTimerId = null;
    }
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private enterWarningPhase(): void {
    const initialSeconds = Math.ceil(this.warningMs / 1000);
    this.zone.run(() => this.warningSecondsSig.set(initialSeconds));

    this.countdownIntervalId = setInterval(() => {
      const elapsed = Date.now() - this.lastActivityAt;
      const remainingMs = this.timeoutMs - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      this.zone.run(() => this.warningSecondsSig.set(remainingSec));
    }, COUNTDOWN_TICK_MS);
  }

  private checkExpiration(): void {
    const elapsed = Date.now() - this.lastActivityAt;
    if (elapsed < this.timeoutMs) {
      this.armTimers();
      return;
    }
    this.expireSession();
  }

  private openChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return; // navegador legacy
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event) => this.onChannelMessage(event);
  }

  private closeChannel(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  private broadcast(message: ChannelMessage): void {
    this.channel?.postMessage(message);
  }

  private onChannelMessage(event: MessageEvent<ChannelMessage>): void {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'activity':
        this.registerActivity(Date.now(), false);
        break;
      case 'logout':
        this.localLogout();
        break;
    }
  }

  private expireSession(): void {
    console.info('[Inactivity] Sesión expirada por inactividad');
    this.broadcast({ type: 'logout' });
    this.localLogout();
  }

  private localLogout(): void {
    this.zone.run(() => {
      this.authService.logout('inactividad');
      this.stop();
    });
  }
}
