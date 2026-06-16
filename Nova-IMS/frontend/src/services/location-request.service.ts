import { Injectable, signal, inject } from '@angular/core';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';
import { apiUrl } from '../utils/api-base';
import {
  resolvePublicShareUrl,
  isMobileShareUrl,
  buildLocationShareMessage,
} from '../utils/public-share-url';

export interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  phoneNumber?: string;
  channel?: 'whatsapp' | 'sms';
  requestId?: string;
  solicitudId?: number;
  address?: string;
}

interface LocationReceivedPayload {
  lat: number;
  lng: number;
  timestamp?: number;
  phoneNumber?: string;
  request_id?: string;
  solicitudId?: number;
  address?: string;
}

function isLocationReceivedPayload(data: unknown): data is LocationReceivedPayload {
  if (typeof data !== 'object' || data === null) return false;
  const row = data as LocationReceivedPayload;
  return typeof row.lat === 'number' && typeof row.lng === 'number';
}

@Injectable({ providedIn: 'root' })
export class LocationRequestService {
  locationReceived = signal<LocationData | null>(null);

  triggerNewIncident = signal(false);
  pendingPhone = signal<string | null>(null);

  openNewIncidentForm(phone?: string): void {
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      const localNumber = digits.startsWith('57') && digits.length > 10 ? digits.slice(2) : digits;
      this.pendingPhone.set(localNumber);
      this.lastRequestedNumber.set(localNumber);
    }
    this.triggerNewIncident.set(true);
  }

  clearNewIncidentTrigger(): void {
    this.triggerNewIncident.set(false);
  }

  clearPendingPhone(): void {
    this.pendingPhone.set(null);
  }

  private readonly lastRequestedNumber = signal<string | null>(null);
  private readonly lastRequestChannel = signal<'whatsapp' | 'sms'>('whatsapp');
  private readonly lastRequestId = signal<string | null>(null);
  private readonly lastSolicitudId = signal<number | null>(null);
  private readonly socketService = inject(SocketService);
  private readonly notificationService = inject(NotificationService);

  constructor() {
    this.socketService.on('location:received', (data: unknown) => {
      if (!isLocationReceivedPayload(data)) return;
      const processedData: LocationData = {
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp || Date.now(),
        phoneNumber: data.phoneNumber || this.lastRequestedNumber() || undefined,
        channel: this.lastRequestChannel(),
        requestId: data.request_id || this.lastRequestId() || undefined,
        solicitudId: data.solicitudId ?? this.lastSolicitudId() ?? undefined,
        address: data.address || undefined,
      };
      if (data.request_id) {
        this.lastRequestId.set(String(data.request_id));
      }
      if (data.solicitudId != null) {
        this.lastSolicitudId.set(Number(data.solicitudId));
      }
      this.locationReceived.set(processedData);
    });
  }

  // ── Validación: solo números colombianos ─────────────────────────────────
  // Formatos aceptados:
  //   "3026172447"      → 10 dígitos locales           ✓
  //   "+573026172447"   → indicativo completo con +     ✓
  //   "573026172447"    → indicativo sin +              ✓
  // Cualquier otro formato se rechaza con notificación de error.
  validateColombianPhone(phone: string): { valid: boolean; error?: string } {
    const digits = phone.replace(/\D/g, '');

    if (digits.startsWith('57')) {
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
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('57')) return digits;
    return `57${digits}`;
  }

  private async createLocationRequest(phone: string, channel: 'whatsapp' | 'sms'): Promise<string> {
    this.lastRequestChannel.set(channel);
    const token = sessionStorage.getItem('ims_token') || localStorage.getItem('ims_token') || '';
    const response = await fetch(apiUrl('/api/location-requests'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone, channel }),
    });

    const data = await response.json();

    if (!data?.requestUrl) {
      throw new Error('No se recibió requestUrl del backend');
    }

    if (data.publicUrlWarning) {
      this.notificationService.addNotification(
        'Configurar URL pública',
        String(data.publicUrlWarning),
      );
    }

    const urlParams = new URL(data.requestUrl).searchParams;
    const requestId = urlParams.get('request_id');
    if (requestId) {
      this.lastRequestId.set(requestId);
    }
    if (data.id != null) {
      this.lastSolicitudId.set(Number(data.id));
    }
    if (data.requestId) {
      this.lastRequestId.set(String(data.requestId));
    }

    return resolvePublicShareUrl(data.requestUrl);
  }

  getLastLocationRequestId(): string | null {
    return this.lastRequestId();
  }

  getLastLocationSolicitudId(): number | null {
    return this.lastSolicitudId();
  }

  private warnIfShareUrlNotPublic(shareUrl: string): void {
    if (isMobileShareUrl(shareUrl)) return;
    this.notificationService.addNotification(
      'Enlace no público',
      'El enlace sigue siendo localhost. En backend/.env agregue NGROK_URL=https://su-tunel.ngrok-free.dev y reinicie el backend (o publicShareBaseUrl en environment.ts).',
    );
  }

  // ── WHATSAPP ──────────────────────────────────────────────────────────────
  async requestLocation(phoneNumber: string): Promise<void> {
    // Validar número colombiano
    const validation = this.validateColombianPhone(phoneNumber);
    if (!validation.valid) {
      this.notificationService.addNotification('Número Inválido', validation.error!);
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    const localNumber = digits.startsWith('57') ? digits.slice(2) : digits;

    this.openNewIncidentForm(localNumber);

    try {
      const shareUrl = await this.createLocationRequest(localNumber, 'whatsapp');
      this.warnIfShareUrlNotPublic(shareUrl);

      const message = buildLocationShareMessage(shareUrl);

      const waPhone = this.toInternationalCo(localNumber);

      const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      this.notificationService.addNotification(
        'Solicitud Enviada',
        `Se envió un enlace de ubicación a ${localNumber} por WhatsApp.`,
      );
    } catch (error) {
      console.error('Error WhatsApp:', error);
      this.notificationService.addNotification(
        'Error al Enviar',
        'No se pudo enviar la solicitud por WhatsApp. Intente de nuevo.',
      );
    }
  }

  // ── SMS ───────────────────────────────────────────────────────────────────
  async requestLocationViaSms(phoneNumber: string): Promise<void> {
    // Validar número colombiano
    const validation = this.validateColombianPhone(phoneNumber);
    if (!validation.valid) {
      this.notificationService.addNotification('Número Inválido', validation.error!);
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    const localNumber = digits.startsWith('57') ? digits.slice(2) : digits;

    this.openNewIncidentForm(localNumber);

    try {
      const shareUrl = await this.createLocationRequest(localNumber, 'sms');
      this.warnIfShareUrlNotPublic(shareUrl);

      const message = buildLocationShareMessage(shareUrl);

      const smsPhone = this.toInternationalCo(localNumber);

      const smsUrl = `sms:+${smsPhone}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_blank');

      this.notificationService.addNotification(
        'Solicitud Enviada',
        `Se envió un enlace de ubicación a ${localNumber} por SMS.`,
      );
    } catch (error) {
      console.error('Error SMS:', error);
      this.notificationService.addNotification(
        'Error al Enviar',
        'No se pudo enviar la solicitud por SMS. Intente de nuevo.',
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
      channel: this.lastRequestChannel(),
    });
  }

  clearLocation(): void {
    this.locationReceived.set(null);
  }
}
