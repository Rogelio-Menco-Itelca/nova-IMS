import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  OnInit,
  AfterViewInit,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Incident } from '../../models/incident.model';
import { ConfigurationService } from '../../services/configuration.service';
import { IncidentService } from '../../services/incident.service';
import { NotificationService } from '../../services/notification.service';
import { firstValueFrom } from 'rxjs';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-incident-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incident-email-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      dialog.email-modal {
        margin: auto;
        padding: 1rem;
        border: none;
        background: transparent;
        max-width: 100%;
        width: 100%;
        height: 100%;
        max-height: 100%;
      }

      dialog.email-modal::backdrop {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }
    `,
  ],
})
export class IncidentEmailModalComponent implements OnInit, AfterViewInit {
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('emailDialog');
  incident = input.required<Incident>();
  closed = output<void>();

  private readonly configService = inject(ConfigurationService);
  private readonly incidentService = inject(IncidentService);
  private readonly notificationService = inject(NotificationService);

  searchTerm = signal('');
  currentPage = signal(1);
  selectedEmails = signal<Set<string>>(new Set());
  sending = signal(false);
  loadError = signal<string | null>(null);

  readonly pageSize = PAGE_SIZE;

  allEmails = computed(() => this.configService.activeNotificationEmailAddresses());

  filteredEmails = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.allEmails();
    if (!term) return list;
    return list.filter((e) => e.toLowerCase().includes(term));
  });

  totalPages = computed(() => {
    const total = this.filteredEmails().length;
    return total ? Math.ceil(total / PAGE_SIZE) : 0;
  });

  paginatedEmails = computed(() => {
    const list = this.filteredEmails();
    const pages = this.totalPages();
    let page = this.currentPage();
    if (pages > 0 && page > pages) page = pages;
    if (page < 1) page = 1;
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  });

  pageRangeLabel = computed(() => {
    const total = this.filteredEmails().length;
    if (!total) return '';
    const page = Math.min(this.currentPage(), this.totalPages() || 1);
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}-${end} de ${total}`;
  });

  selectedCount = computed(() => this.selectedEmails().size);

  allPageSelected = computed(() => {
    const page = this.paginatedEmails();
    if (!page.length) return false;
    const sel = this.selectedEmails();
    return page.every((e) => sel.has(e));
  });

  constructor() {
    effect(() => {
      this.incident();
      this.selectedEmails.set(new Set());
      this.searchTerm.set('');
      this.currentPage.set(1);
    });

    effect(() => {
      this.searchTerm();
      this.filteredEmails();
      const pages = this.totalPages();
      if (pages > 0 && this.currentPage() > pages) {
        this.currentPage.set(pages);
      }
    });
  }

  ngOnInit(): void {
    this.loadError.set(null);
    if (this.allEmails().length) return;

    this.configService.getNotificationEmails().catch(() => {
      this.loadError.set('No se pudo cargar la lista de correos autorizados.');
    });
  }

  ngAfterViewInit(): void {
    this.dialogRef().nativeElement.showModal();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) {
      this.close();
    }
  }

  onBackdropKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== this.dialogRef().nativeElement) return;
    event.preventDefault();
    this.close();
  }

  isSelected(email: string): boolean {
    return this.selectedEmails().has(email);
  }

  toggleEmail(email: string): void {
    const next = new Set(this.selectedEmails());
    if (next.has(email)) next.delete(email);
    else next.add(email);
    this.selectedEmails.set(next);
  }

  toggleSelectCurrentPage(): void {
    const page = this.paginatedEmails();
    const next = new Set(this.selectedEmails());
    const allOn = page.every((e) => next.has(e));
    if (allOn) {
      page.forEach((e) => next.delete(e));
    } else {
      page.forEach((e) => next.add(e));
    }
    this.selectedEmails.set(next);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    const pages = this.totalPages();
    if (pages < 1) return;
    this.currentPage.set(Math.min(Math.max(1, page), pages));
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  close(): void {
    if (this.sending()) return;
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
    this.closed.emit();
  }

  async send(): Promise<void> {
    const recipients = [...this.selectedEmails()];
    if (!recipients.length) {
      this.notificationService.addNotification(
        'Sin destinatarios',
        'Seleccione al menos un correo de la lista.',
      );
      return;
    }

    this.sending.set(true);
    try {
      const resp = await firstValueFrom(
        this.incidentService.sendIncidentEmail(this.incident().id, recipients),
      );
      const enviados = (resp.recipients?.length ? resp.recipients : recipients).join(', ');
      this.notificationService.addNotification(
        'Correo enviado',
        resp.message || `Enviado a: ${enviados}`,
      );
      this.closed.emit();
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg =
        e?.error?.error?.message ||
        e?.error?.message ||
        'No se pudo enviar la notificación por correo.';
      this.notificationService.addNotification('Error al enviar', msg);
    } finally {
      this.sending.set(false);
    }
  }
}
