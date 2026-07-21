import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReportsService, ReportSummary } from '../../services/reports.service';
import { PermissionService } from '../../services/permission.service';
import { AuditClientService } from '../../services/audit-client.service';
import { environment } from '../../environments/environment';
import { trustedPowerBiEmbedUrl } from '../../utils/trusted-embed-urls';

type Tab = 'analytics' | 'pbi';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit {
  private readonly svc = inject(ReportsService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  readonly permissionService = inject(PermissionService);
  private readonly auditClient = inject(AuditClientService);

  activeTab = signal<Tab>('analytics');

  pbiSafeUrl = signal<SafeResourceUrl | null>(null);

  isLoading = signal(true);
  data = signal<ReportSummary | null>(null);
  error = signal<string | null>(null);
  searchText = signal('');

  filters = this.fb.group({
    from: [''],
    to: [''],
    status: [''],
    type: [''],
    priority: [''],
    operator: [''],
  });

  filteredHistory = computed(() => {
    const d = this.data();
    if (!d) return [];
    const q = this.searchText().toLowerCase();
    if (!q) return d.history;
    return d.history.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.operator || '').toLowerCase().includes(q),
    );
  });

  ngOnInit() {
    this.load();
    this.pbiSafeUrl.set(trustedPowerBiEmbedUrl(this.sanitizer, environment.powerBiEmbedUrl));
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  canExport(): boolean {
    return this.permissionService.canExport();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const f = this.filters.value;
    this.svc
      .getSummary({
        from: f.from || undefined,
        to: f.to || undefined,
        status: f.status || undefined,
        type: f.type || undefined,
        priority: f.priority || undefined,
        operator: f.operator || undefined,
      })
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.isLoading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.error?.message || 'Error al cargar reportes');
          this.isLoading.set(false);
        },
      });
  }

  resetFilters(): void {
    this.filters.reset();
    this.searchText.set('');
    this.load();
  }
  onSearchText(e: Event) {
    this.searchText.set((e.target as HTMLInputElement).value);
  }

  barWidth(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }
  maxOf(arr: { value: number }[]): number {
    return arr.length ? Math.max(...arr.map((x) => x.value)) : 1;
  }
  maxDailyTotal(daily: ReportSummary['daily']): number {
    return daily.length ? Math.max(...daily.map((d) => d.total)) : 1;
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      Nuevo: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      Asignado: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      'En camino': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      'En situación': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      Resuelto: 'bg-green-500/20 text-green-300 border border-green-500/30',
      Cerrado: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
      'Cerrado con solución': 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
      Cancelado: 'bg-red-500/20 text-red-300 border border-red-500/30',
    };
    return m[s] ?? 'bg-gray-600/20 text-gray-300';
  }

  priorityColor(p: string): string {
    return (
      {
        Crítica: 'text-red-400',
        Alta: 'text-orange-400',
        Media: 'text-yellow-400',
        Baja: 'text-green-400',
      }[p] ?? 'text-gray-400'
    );
  }
  priorityBar(p: string): string {
    return (
      {
        Crítica: 'bg-red-500',
        Alta: 'bg-orange-500',
        Media: 'bg-yellow-500',
        Baja: 'bg-green-500',
      }[p] ?? 'bg-gray-500'
    );
  }
  typeBar(i: number): string {
    return ['bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-cyan-500', 'bg-purple-500'][i % 5];
  }
  statusBar(s: string): string {
    return (
      {
        Nuevo: 'bg-blue-500',
        Asignado: 'bg-yellow-500',
        'En camino': 'bg-orange-500',
        'En situación': 'bg-purple-500',
        Resuelto: 'bg-green-500',
        Cerrado: 'bg-gray-500',
        'Cerrado con solución': 'bg-teal-500',
        Cancelado: 'bg-red-500',
      }[s] ?? 'bg-gray-500'
    );
  }

  exportCSV(): void {
    const rows = this.filteredHistory();
    if (!rows.length) return;
    const headers = [
      'ID',
      'Tipo',
      'Prioridad',
      'Estado',
      'Origen',
      'Teléfono',
      'Ubicación',
      'Operador',
      'Fecha creación',
      'Última actualización',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.type,
          r.priority,
          r.status,
          r.origin,
          r.phone,
          `"${(r.location || '').replaceAll('"', '""')}"`,
          r.operator,
          r.timestamp?.slice(0, 19) ?? '',
          r.updatedAt?.slice(0, 19) ?? '',
        ].join(','),
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.auditClient.reportDownload(
      `reporte de incidentes (${rows.length} registro${rows.length === 1 ? '' : 's'})`,
      'csv',
    );
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
