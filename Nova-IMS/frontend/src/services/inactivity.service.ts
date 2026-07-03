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

// ---------------------------------------------------------------------------
//  Tokens de configuración
// ---------------------------------------------------------------------------
//  Estos InjectionToken permiten que ops/QA cambien los tiempos sin tocar
//  el servicio. Para sobreescribir el valor por defecto, en el bootstrap
//  de la app (main.ts):
//
//    bootstrapApplication(AppComponent, {
//      providers: [
//        { provide: INACTIVITY_TIMEOUT_MS, useValue: 10 * 60 * 1000 }, // 10 min
//        { provide: INACTIVITY_WARNING_MS, useValue: 30 * 1000 },      // 30 s
//      ],
//    });
//
//  En el futuro, cuando el proyecto tenga environment.ts, la factory
//  puede leer de allí. Hoy usamos valores por defecto razonables.
// ---------------------------------------------------------------------------

/** Tiempo total de inactividad antes de cerrar sesión (en milisegundos). */
export const INACTIVITY_TIMEOUT_MS = new InjectionToken<number>('INACTIVITY_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 20 * 60 * 1000, // 20 minuto → cierre de sesión
});

/**
 * Tiempo (al final del timeout) durante el cual se muestra el modal de aviso.
 * Si TIMEOUT=300000 y WARNING=60000, el modal aparece a los 4:00 y la sesión
 * expira a los 5:00 si el usuario no interactúa.
 *
 * Debe ser MENOR que INACTIVITY_TIMEOUT_MS.
 */
export const INACTIVITY_WARNING_MS = new InjectionToken<number>('INACTIVITY_WARNING_MS', {
  providedIn: 'root',
  //factory: () =>  15 * 60 * 1000, // 60 segundos
  factory: () => 5 * 60 * 1000, // aviso a los 15 minutos
});

/** Frecuencia máxima a la que procesamos eventos de actividad del usuario. */
export const ACTIVITY_THROTTLE_MS = new InjectionToken<number>('ACTIVITY_THROTTLE_MS', {
  providedIn: 'root',
  factory: () => 1000, // 1 segundo
});

// ---------------------------------------------------------------------------
//  Tipos y constantes internas (no configurables)
// ---------------------------------------------------------------------------

/** Mensajes intercambiados entre pestañas. Discriminated union para tipado fuerte. */
type ChannelMessage = { type: 'activity'; at: number } | { type: 'logout' };

/** Eventos del DOM que cuentan como "actividad del usuario". */
const ACTIVITY_EVENTS: readonly (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
];

/** Nombre del canal de broadcast para sincronizar entre pestañas del mismo origen. */
const CHANNEL_NAME = 'ims-inactivity';

/** Cadencia de actualización del countdown del modal de aviso. */
const COUNTDOWN_TICK_MS = 1000;

/**
 * Servicio de cierre de sesión por inactividad con modal de aviso.
 *
 * Flujo de tres fases:
 *   1. Activa     — el usuario interactúa, el timer se resetea normalmente.
 *   2. Aviso      — restan WARNING_MS antes de expirar; emite señal para
 *                   mostrar el modal con countdown. Cualquier actividad
 *                   (incluyendo el botón "Continuar") cancela el aviso y
 *                   resetea el timer al timeout completo.
 *   3. Expirada   — el usuario no respondió; ejecuta logout.
 *
 * Sincroniza entre pestañas vía BroadcastChannel: actividad en una pestaña
 * resetea el timer de las demás (y oculta su modal de aviso si lo tienen).
 *
 * Notas de diseño relevantes:
 *
 * - Configurabilidad: timeouts inyectables vía InjectionToken.
 *
 * - runOutsideAngular: los listeners de DOM y el countdown viven fuera de
 *   la zona de Angular para no disparar change detection innecesario.
 *   Solo el cambio de estado del modal (visible/oculto/segundos restantes)
 *   pasa por el zone, vía signals, para actualizar la UI.
 *
 * - Timestamp en lugar de contar: comparamos Date.now() contra
 *   lastActivityAt. Si una pestaña estuvo en background y el navegador
 *   pausó setTimeout, al volver detectamos correctamente la expiración real.
 *
 * - Idempotencia: start() y stop() son seguros de llamar varias veces.
 *
 * - Single source of truth: cuando el servicio inicia, consulta
 *   authService.isAuthenticated() para no arrancar si no hay sesión.
 */
@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly timeoutMs = inject(INACTIVITY_TIMEOUT_MS);
  private readonly warningMs = inject(INACTIVITY_WARNING_MS);
  private readonly throttleMs = inject(ACTIVITY_THROTTLE_MS);

  /**
   * Segundos restantes antes del logout, expuesto al modal vía signal.
   * - null  → no hay aviso visible (fase activa).
   * - >= 0  → modal de aviso visible con esa cantidad de segundos.
   *
   * El modal lo consume con un `if (warningSeconds() !== null)` y muestra
   * el número directamente. Cuando llega a 0 el servicio dispara logout
   * y pone el signal de vuelta en null.
   */
  private readonly warningSecondsSig = signal<number | null>(null);
  readonly warningSeconds = this.warningSecondsSig.asReadonly();
  readonly isWarningVisible = computed(() => this.warningSecondsSig() !== null);

  private warnTimerId: ReturnType<typeof setTimeout> | null = null;
  private expireTimerId: ReturnType<typeof setTimeout> | null = null;
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = Date.now();
  private channel: BroadcastChannel | null = null;
  private running = false;

  /**
   * Inicia el monitoreo. No-op si ya está corriendo o si no hay sesión.
   * Llamar después de un login exitoso o tras restaurar sesión en checkAuth().
   */
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

  /**
   * Detiene el monitoreo y libera recursos. Idempotente: seguro llamar
   * varias veces. Llamar al hacer logout (manual o automático).
   */
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

  // -------------------------------------------------------------------------
  //  Manejo de listeners del DOM
  // -------------------------------------------------------------------------

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

  /**
   * Handler de eventos de actividad. Está throttled a un evento por throttleMs
   * para no saturar el navegador (mousemove se dispara cientos de veces/s).
   *
   * Definido como arrow-property para que `this` sea estable sin necesidad
   * de .bind(), y para que la misma referencia funcione en add/remove.
   */
  private readonly onActivity = (): void => {
    const now = Date.now();
    if (now - this.lastActivityAt < this.throttleMs) {
      return; // dentro del throttle window: ignorar
    }
    this.registerActivity(now, true);
  };

  /**
   * Registra una actividad (local o por el botón Continuar) y resetea timers.
   * @param now Timestamp de la actividad.
   * @param doBroadcast Si true, notifica a otras pestañas. False cuando la
   *                    actividad llegó precisamente desde otra pestaña
   *                    (evita rebote infinito).
   */
  private registerActivity(now: number, doBroadcast: boolean): void {
    this.lastActivityAt = now;
    this.armTimers();

    // Si había un modal de aviso visible, ocultarlo en el zone de Angular
    // para que la UI reaccione.
    if (this.warningSecondsSig() !== null) {
      this.zone.run(() => this.warningSecondsSig.set(null));
    }

    if (doBroadcast) {
      this.broadcast({ type: 'activity', at: now });
    }
  }

  // -------------------------------------------------------------------------
  //  Manejo de timers (warn + expire + countdown)
  // -------------------------------------------------------------------------

  /**
   * Programa los dos timers principales:
   *   - warnTimerId    → dispara cuando entramos a la fase de aviso.
   *   - expireTimerId  → dispara cuando expira la sesión.
   *
   * También cancela el countdown del modal si estaba activo (porque el
   * usuario interactuó dentro de la fase de aviso).
   */
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

  /**
   * Entramos a la fase de aviso: mostrar modal y arrancar countdown
   * que actualiza el signal cada segundo.
   */
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

  /**
   * El expireTimer se cumplió. Validamos contra timestamp real porque
   * setTimeout puede dispararse tarde (pestaña en background) o temprano
   * (broadcast llegó justo antes). Si la actividad fue reciente, re-armamos
   * por el tiempo restante real en lugar de cerrar sesión.
   */
  private checkExpiration(): void {
    const elapsed = Date.now() - this.lastActivityAt;
    if (elapsed < this.timeoutMs) {
      // Actividad llegó después de armar el timer pero antes de su disparo.
      // Re-programamos los dos timers con el tiempo real restante.
      this.armTimers();
      return;
    }
    this.expireSession();
  }

  // -------------------------------------------------------------------------
  //  Comunicación entre pestañas (BroadcastChannel)
  // -------------------------------------------------------------------------

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

  /**
   * Mensaje recibido de OTRA pestaña.
   *  - 'activity' → registrar como actividad sin re-broadcastear (evita eco).
   *  - 'logout'   → cerrar también esta pestaña (sin re-broadcastear).
   */
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

  // -------------------------------------------------------------------------
  //  Cierre de sesión
  // -------------------------------------------------------------------------

  /**
   * Sesión expiró por inactividad: notificar a otras pestañas y cerrar local.
   * Se ejecuta dentro de la zona de Angular para que la UI reaccione (volver
   * a la pantalla de login).
   */
  private expireSession(): void {
    console.info('[Inactivity] Sesión expirada por inactividad');
    this.broadcast({ type: 'logout' });
    this.localLogout();
  }

  /** Cierra sesión en esta pestaña sin notificar a las demás. */
  private localLogout(): void {
    this.zone.run(() => {
      this.authService.logout('inactividad');
      // authService.logout() ya llama a stop() vía la integración existente,
      // pero por seguridad lo hacemos explícito (stop es idempotente).
      this.stop();
    });
  }
}
