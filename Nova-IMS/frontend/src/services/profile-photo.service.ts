import { Injectable, signal } from '@angular/core';

const PHOTO_PREFIX = 'ims_profile_photo_';
/** Max size of the selected file (before compression). */
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB
/** Longest side after resize — enough for avatar UI, keeps localStorage small. */
const MAX_EDGE_PX = 512;
const JPEG_QUALITY = 0.85;

@Injectable({ providedIn: 'root' })
export class ProfilePhotoService {
  readonly photoUrl = signal<string | null>(null);

  loadForUser(userId: string | undefined | null): void {
    if (!userId) {
      this.photoUrl.set(null);
      return;
    }
    this.photoUrl.set(localStorage.getItem(`${PHOTO_PREFIX}${userId}`));
  }

  getPhotoUrl(userId: string): string | null {
    return localStorage.getItem(`${PHOTO_PREFIX}${userId}`);
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
      this.photoUrl.set(dataUrl);
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
    this.photoUrl.set(null);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts.at(-1)?.[0] ?? '')).toUpperCase();
  }

  /** Resize + JPEG compress so avatar fits localStorage even if the source file is large. */
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
