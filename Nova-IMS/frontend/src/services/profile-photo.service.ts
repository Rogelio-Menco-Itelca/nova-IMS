import { Injectable, signal } from '@angular/core';

const PHOTO_PREFIX = 'ims_profile_photo_';
const MAX_PHOTO_BYTES = 512_000;

@Injectable({ providedIn: 'root' })
export class ProfilePhotoService {
  /** URL de la foto del usuario en sesión (data URL o null). */
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
    if (file.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: 'La imagen no puede superar 500 KB.' };
    }

    const dataUrl = await this.readAsDataUrl(file);
    localStorage.setItem(`${PHOTO_PREFIX}${userId}`, dataUrl);
    this.photoUrl.set(dataUrl);
    return { ok: true };
  }

  removePhoto(userId: string): void {
    localStorage.removeItem(`${PHOTO_PREFIX}${userId}`);
    this.photoUrl.set(null);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
