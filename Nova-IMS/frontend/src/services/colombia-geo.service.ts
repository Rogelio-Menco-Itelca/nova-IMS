import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ColombiaDepartment, ColombiaMunicipality } from '../models/incident.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ColombiaGeoService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly departmentsCache = new Map<string, ColombiaDepartment[]>();

  private sessionAgency(): string | null {
    return this.authService.currentUser()?.agency?.trim().toUpperCase() || null;
  }

  async getDepartments(): Promise<ColombiaDepartment[]> {
    const agency = this.sessionAgency();
    if (!agency) return [];

    if (this.departmentsCache.has(agency)) {
      return this.departmentsCache.get(agency)!;
    }
    const rows = await firstValueFrom(
      this.http.get<ColombiaDepartment[]>('/api/departments', {
        params: { agency },
      }),
    );
    this.departmentsCache.set(agency, rows);
    return rows;
  }

  getMunicipalities(departmentId: number) {
    const agency = this.sessionAgency();
    return this.http.get<ColombiaMunicipality[]>('/api/municipalities', {
      params: {
        departmentId: String(departmentId),
        ...(agency ? { agency } : {}),
      },
    });
  }
}
