import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { CatalogOption } from '../models/incident.model';
import { IncidentType } from '../models/admin.model';
import { AuthService } from './auth.service';

export interface ReportSummary {
  kpis: {
    total: number;
    resolved: number;
    cancelled: number;
    active: number;
    critical: number;
    high: number;
  };
  byType: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  byPriority: { label: string; value: number }[];
  byOperator: { label: string; value: number }[];
  daily: { day: string; total: number; critical: number }[];
  operatorActivity: { operator: string; actions: number; created: number; updated: number }[];
  history: HistoryRow[];
}

export interface HistoryRow {
  id: string;
  type: string;
  priority: string;
  status: string;
  origin: string;
  phone: string;
  location: string;
  operator: string;
  timestamp: string;
  updatedAt: string;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  priority?: string;
  operator?: string;
}

export interface ReportFilterCatalogs {
  statuses: CatalogOption[];
  priorities: CatalogOption[];
  types: IncidentType[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getFilterCatalogs(): Observable<ReportFilterCatalogs> {
    const agency = this.auth.currentUser()?.agency ?? 'CSJ';
    return forkJoin({
      statuses: this.http
        .get<CatalogOption[]>('/api/incident-statuses', { params: { agency } })
        .pipe(catchError(() => of([]))),
      priorities: this.http
        .get<CatalogOption[]>('/api/priorities')
        .pipe(catchError(() => of([]))),
      types: this.http.get<IncidentType[]>('/api/incident-types').pipe(catchError(() => of([]))),
    });
  }

  getSummary(filters: ReportFilters = {}): Observable<ReportSummary> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params = params.set(k, v);
    });
    return this.http.get<ReportSummary>('/api/reports/summary', { params });
  }
}
