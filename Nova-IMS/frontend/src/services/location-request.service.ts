import { Injectable, signal, inject } from '@angular/core';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';
import { apiUrl } from '../utils/api-base';
import {
  resolvePublicShareUrl,
  isMobileShareUrl,
  buildLocationShareMessage,
} from '../utils/public-share-url';
import {
  toInternationalColombianPhone,
  toLocalColombianPhone,
  validateColombianPhone as checkColombianPhone,
  IMS_DEFAULT_MAP_CENTER,
} from '../utils/ims-geo.constants';

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
      const localNumber = toLocalColombianPhone(phone);
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

  validateColombianPhone(phone: string): { valid: boolean; error?: string } {
    return checkColombianPhone(phone);
  }

  private toInternationalCo(phone: string): string {
    return toInternationalColombianPhone(phone);
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

    if (!response.ok) {
      const msg =
        data?.error?.message || data?.error || data?.message || 'No se pudo registrar la solicitud';
      throw new Error(typeof msg === 'string' ? msg : 'No se pudo registrar la solicitud');
    }

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

  getLastRequestChannel(): 'whatsapp' | 'sms' {
    return this.lastRequestChannel();
  }

  private warnIfShareUrlNotPublic(shareUrl: string): void {
    if (isMobileShareUrl(shareUrl)) return;
    this.notificationService.addNotification(
      'Enlace no público',
      'El enlace sigue siendo localhost. En backend/.env agregue NGROK_URL=https://su-tunel.ngrok-free.dev y reinicie el backend (o publicShareBaseUrl en environment.ts).',
    );
  }

  async requestLocation(phoneNumber: string): Promise<boolean> {
    const validation = this.validateColombianPhone(phoneNumber);
    if (!validation.valid) {
      this.notificationService.addNotification('Número Inválido', validation.error ?? 'Número inválido');
      return false;
    }

    const localNumber = toLocalColombianPhone(phoneNumber);
    this.lastRequestedNumber.set(localNumber);
    this.lastRequestChannel.set('whatsapp');

    try {
      const shareUrl = await this.createLocationRequest(localNumber, 'whatsapp');
      this.warnIfShareUrlNotPublic(shareUrl);

      const message = buildLocationShareMessage(shareUrl);

      const waPhone = this.toInternationalCo(localNumber);

      const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      this.openNewIncidentForm(localNumber);

      this.notificationService.addNotification(
        'Solicitud Enviada',
        `Enlace enviado a ${localNumber} por WhatsApp. Complete el formulario cuando llegue la ubicación GPS y pulse Guardar.`,
      );
      return true;
    } catch (error) {
      console.error('Error WhatsApp:', error);
      const detail = error instanceof Error ? error.message : 'Intente de nuevo.';
      this.notificationService.addNotification('Error al Enviar', detail);
      return false;
    }
  }

  async requestLocationViaSms(phoneNumber: string): Promise<boolean> {
    const validation = this.validateColombianPhone(phoneNumber);
    if (!validation.valid) {
      this.notificationService.addNotification('Número Inválido', validation.error ?? 'Número inválido');
      return false;
    }

    const localNumber = toLocalColombianPhone(phoneNumber);
    this.lastRequestedNumber.set(localNumber);
    this.lastRequestChannel.set('sms');

    try {
      const shareUrl = await this.createLocationRequest(localNumber, 'sms');
      this.warnIfShareUrlNotPublic(shareUrl);

      const message = buildLocationShareMessage(shareUrl);

      const smsPhone = this.toInternationalCo(localNumber);

      const smsUrl = `sms:+${smsPhone}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_blank');

      this.openNewIncidentForm(localNumber);

      this.notificationService.addNotification(
        'Solicitud Enviada',
        `Enlace enviado a ${localNumber} por SMS. Complete el formulario cuando llegue la ubicación GPS y pulse Guardar.`,
      );
      return true;
    } catch (error) {
      console.error('Error SMS:', error);
      const detail = error instanceof Error ? error.message : 'Intente de nuevo.';
      this.notificationService.addNotification('Error al Enviar', detail);
      return false;
    }
  }

  simulateLocationReception(): void {
    const phoneNumber = this.lastRequestedNumber();
    const lat = IMS_DEFAULT_MAP_CENTER.lat + (Math.random() - 0.5) * 0.1;
    const lng = IMS_DEFAULT_MAP_CENTER.lng + (Math.random() - 0.5) * 0.1;
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
