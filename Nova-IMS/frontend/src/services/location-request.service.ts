import { Injectable, signal, inject } from "@angular/core";
import { SocketService } from "./socket.service";
import { NotificationService } from "./notification.service";

export interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  phoneNumber?: string;
}

@Injectable({ providedIn: "root" })
export class LocationRequestService {
  locationReceived = signal<LocationData | null>(null);

  triggerNewIncident = signal(false);
  pendingPhone = signal<string | null>(null);

  openNewIncidentForm(phone?: string): void {
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      const localNumber =
        digits.startsWith("57") && digits.length > 10
          ? digits.slice(2)
          : digits;
      this.pendingPhone.set(localNumber);
      this.lastRequestedNumber.set(localNumber);
    }
    this.triggerNewIncident.set(true);
  }

  clearNewIncidentTrigger(): void {
    this.triggerNewIncident.set(false);
    //this.pendingPhone.set(null);
  }

  clearPendingPhone(): void {
    this.pendingPhone.set(null);
  }

  private lastRequestedNumber = signal<string | null>(null);
  private lastRequestId = signal<string | null>(null);
  private socketService = inject(SocketService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.socketService.on("location:received", (data: any) => {
      const processedData = {
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp || Date.now(),
        phoneNumber: this.lastRequestedNumber() || undefined,
      };
      this.locationReceived.set(processedData);
    });
  }

  // ── Validación: solo números colombianos ─────────────────────────────────
  // Formatos aceptados:
  //   "3026172447"      → 10 dígitos locales           ✓
  //   "+573026172447"   → indicativo completo con +     ✓
  //   "573026172447"    → indicativo sin +              ✓
  // Todo lo demás es rechazado con notificación de error.
  validateColombianPhone(phone: string): { valid: boolean; error?: string } {
    const digits = phone.replace(/\D/g, "");

    if (digits.startsWith("57")) {
      // Formato internacional: "57" + 10 dígitos = 12 total
      if (digits.length !== 12) {
        return {
          valid: false,
          error: `Después de +57 deben ir exactamente 10 dígitos (tiene ${digits.length - 2}).`,
        };
      }
      return { valid: true };
    }

    // Formato local: exactamente 10 dígitos
    if (digits.length !== 10) {
      return {
        valid: false,
        error: `El número colombiano debe tener 10 dígitos (tiene ${digits.length}).`,
      };
    }

    return { valid: true };
  }

  // ── Utilidad: normalizar a formato internacional sin + ───────────────────
  // "3026172447"    → "573026172447"
  // "+573026172447" → "573026172447"
  // "573026172447"  → "573026172447"  (ya correcto, no duplicar)
  private toInternationalCo(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("57")) return digits;
    return `57${digits}`;
  }

  private async createLocationRequest(
    phone: string,
    channel: "whatsapp" | "sms",
  ): Promise<string> {
    const token =
      sessionStorage.getItem("ims_token") ||
      localStorage.getItem("ims_token") ||
      "";
    const response = await fetch("/api/location-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone, channel }),
    });

    const data = await response.json();

    if (!data?.requestUrl) {
      throw new Error("No se recibió requestUrl del backend");
    }

    const urlParams = new URL(data.requestUrl).searchParams;
    const requestId = urlParams.get("request_id");
    if (requestId) {
      this.lastRequestId.set(requestId);
    }

    return data.requestUrl;
  }

  // ── WHATSAPP ──────────────────────────────────────────────────────────────
  async requestLocation(phoneNumber: string): Promise<void> {
    // Validar número colombiano
    const validation = this.validateColombianPhone(phoneNumber);
    if (!validation.valid) {
      this.notificationService.addNotification(
        "Número Inválido",
        validation.error!,
      );
      return;
    }

    const digits = phoneNumber.replace(/\D/g, "");
    const localNumber = digits.startsWith("57") ? digits.slice(2) : digits;

    this.openNewIncidentForm(localNumber);

    try {
      const urlFromBackend = await this.createLocationRequest(
        localNumber,
        "whatsapp",
      );

      const publicUrl = urlFromBackend.replace(
        "http://localhost:3000",
        "https://irritant-knelt-reaffirm.ngrok-free.dev",
      );

      const message = `Haz clic en el enlace y permite el acceso para compartir tu ubicación de forma automática:\n${publicUrl}`;

      const waPhone = this.toInternationalCo(localNumber);

      const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      this.notificationService.addNotification(
        "Solicitud Enviada",
        `Se envió un enlace de ubicación a ${localNumber} por WhatsApp.`,
      );
    } catch (error) {
      console.error("Error WhatsApp:", error);
      this.notificationService.addNotification(
        "Error al Enviar",
        "No se pudo enviar la solicitud por WhatsApp. Intente de nuevo.",
      );
    }
  }

  // ── SMS ───────────────────────────────────────────────────────────────────
  async requestLocationViaSms(phoneNumber: string): Promise<void> {
    // Validar número colombiano
    const validation = this.validateColombianPhone(phoneNumber);
    if (!validation.valid) {
      this.notificationService.addNotification(
        "Número Inválido",
        validation.error!,
      );
      return;
    }

    const digits = phoneNumber.replace(/\D/g, "");
    const localNumber = digits.startsWith("57") ? digits.slice(2) : digits;

    this.openNewIncidentForm(localNumber);

    try {
      const urlFromBackend = await this.createLocationRequest(
        localNumber,
        "sms",
      );

      const publicUrl = urlFromBackend.replace(
        "http://localhost:3000",
        "https://irritant-knelt-reaffirm.ngrok-free.dev",
      );

      const message = `Haz clic en el enlace y permite el acceso para compartir tu ubicación de forma automática:\n${publicUrl}`;

      const smsPhone = this.toInternationalCo(localNumber);

      const smsUrl = `sms:+${smsPhone}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, "_blank");

      this.notificationService.addNotification(
        "Solicitud Enviada",
        `Se envió un enlace de ubicación a ${localNumber} por SMS.`,
      );
    } catch (error) {
      console.error("Error SMS:", error);
      this.notificationService.addNotification(
        "Error al Enviar",
        "No se pudo enviar la solicitud por SMS. Intente de nuevo.",
      );
    }
  }

  // ── SIMULACIÓN (para pruebas) ─────────────────────────────────────────────
  simulateLocationReception(): void {
    const phoneNumber = this.lastRequestedNumber();
    const lat = 4.60971 + (Math.random() - 0.5) * 0.1;
    const lng = -74.08175 + (Math.random() - 0.5) * 0.1;
    this.locationReceived.set({
      lat,
      lng,
      timestamp: Date.now(),
      phoneNumber: phoneNumber || undefined,
    });
  }

  clearLocation(): void {
    this.locationReceived.set(null);
  }
}
