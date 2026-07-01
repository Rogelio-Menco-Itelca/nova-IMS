import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type PermissionAction = 'view' | 'create' | 'edit' | 'notify' | 'export';

export interface ModulePermission {
  module: string;
  enabled: boolean;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    notify: boolean;
    export: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly http = inject(HttpClient);

  sessionPermissions = signal<ModulePermission[]>([]);
  loaded = signal(false);

  async loadSessionPermissions(): Promise<void> {
    try {
      const permissions = await firstValueFrom(
        this.http.get<ModulePermission[]>('/api/auth/permissions', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        })
      );
      this.sessionPermissions.set(Array.isArray(permissions) ? permissions : []);
    } catch {
      this.sessionPermissions.set([]);
    } finally {
      this.loaded.set(true);
    }
  }

  clearSession(): void {
    this.sessionPermissions.set([]);
    this.loaded.set(false);
  }

  canModuleAction(module: string, action: PermissionAction): boolean {
    const row = this.sessionPermissions().find((item) => item.module === module);
    if (!row?.enabled) return false;
    return !!row.actions[action];
  }

  canNotify(): boolean {
    if (!this.loaded()) return true;
    return this.canModuleAction('Incidentes', 'notify');
  }

  canExport(): boolean {
    if (!this.loaded()) return true;
    return this.canModuleAction('Reportes', 'export');
  }
}
