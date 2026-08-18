import { Injectable, computed, signal } from '@angular/core';

const PHOTO_PREFIX = 'ims_profile_photo_';
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_EDGE_PX = 512;
const JPEG_QUALITY = 0.85;

@Injectable({ providedIn: 'root' })
export class ProfilePhotoService {
  private readonly photosByUser = signal<Readonly<Record<string, string>>>({});
  private readonly activeUserId = signal<string | null>(null);

  readonly photoUrl = computed(() => {
    const id = this.activeUserId();
    if (!id) return null;
    return this.photosByUser()[id] ?? null;
  });

  loadForUser(userId: string | undefined | null): void {
    if (!userId) {
      this.activeUserId.set(null);
      return;
    }
    this.activeUserId.set(userId);
    const stored = localStorage.getItem(`${PHOTO_PREFIX}${userId}`);
    this.photosByUser.update((map) => {
      if (!stored) {
        if (!(userId in map)) return map;
        const next = { ...map };
        delete next[userId];
        return next;
      }
      if (map[userId] === stored) return map;
      return { ...map, [userId]: stored };
    });
  }

  getPhotoUrl(userId: string | undefined | null): string | null {
    if (!userId) return null;
    const map = this.photosByUser();
    if (Object.prototype.hasOwnProperty.call(map, userId)) {
      return map[userId] ?? null;
    }
    const stored = localStorage.getItem(`${PHOTO_PREFIX}${userId}`);
    if (stored) {
      queueMicrotask(() => {
        this.photosByUser.update((current) =>
          current[userId] === stored ? current : { ...current, [userId]: stored },
        );
      });
    }
    return stored;
  }

  async setPhotoFromFile(userId: string, file: File): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'Seleccione un archivo de imagen (JPG, PNG, etc.).' };
    }
    if (file.size > MAX_INPUT_BYTES) {
      return { ok: false, error: 'La imagen no puede superar 5 MB.' };
    }

    try {
      const dataUrl = await this.compressForStorage(file);
      localStorage.setItem(`${PHOTO_PREFIX}${userId}`, dataUrl);
      this.activeUserId.set(userId);
      this.photosByUser.update((map) => ({ ...map, [userId]: dataUrl }));
      return { ok: true };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        return {
          ok: false,
          error: 'No hay espacio suficiente en el navegador para guardar la foto. Pruebe con otra imagen.',
        };
      }
      return { ok: false, error: 'No se pudo procesar la imagen. Intente de nuevo.' };
    }
  }

  removePhoto(userId: string): void {
    localStorage.removeItem(`${PHOTO_PREFIX}${userId}`);
    this.photosByUser.update((map) => {
      if (!(userId in map)) return map;
      const next = { ...map };
      delete next[userId];
      return next;
    });
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const surnameIdx = parts.length >= 3 ? parts.length - 2 : parts.length - 1;
    return (parts[0][0] + (parts[surnameIdx]?.[0] ?? '')).toUpperCase();
  }

  private async compressForStorage(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return this.readAsDataUrl(file);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      if (!dataUrl || dataUrl === 'data:,') {
        return this.readAsDataUrl(file);
      }
      return dataUrl;
    } finally {
      bitmap.close();
    }
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(typeof result === 'string' ? result : '');
      };
      reader.onerror = () => {
        const err = reader.error;
        reject(err instanceof Error ? err : new Error('No se pudo leer el archivo de imagen.'));
      };
      reader.readAsDataURL(file);
    });
  }
}
