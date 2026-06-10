import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-admin-pagination',
  standalone: true,
  host: { class: 'mt-auto block w-full shrink-0' },
  template: `
    @if (hasItems()) {
      <nav class="flex w-full justify-end px-2 pt-3 pb-1" [attr.aria-label]="ariaLabel()">
        <div
          class="inline-flex items-center gap-0.5 rounded-full border border-gray-600/50 bg-gray-700/30 px-1 py-0.5 text-[11px] text-gray-400"
        >
          <button
            type="button"
            (click)="previous.emit()"
            [disabled]="currentPage() <= 1"
            class="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-600/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            title="Anterior"
            aria-label="Página anterior"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <span class="min-w-[2.75rem] px-1 text-center tabular-nums text-gray-300">
            {{ currentPage() }} / {{ totalPages() }}
          </span>
          <button
            type="button"
            (click)="next.emit()"
            [disabled]="currentPage() >= totalPages()"
            class="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-600/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            title="Siguiente"
            aria-label="Página siguiente"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  hasItems = input(false);
  ariaLabel = input('Paginación');
  previous = output<void>();
  next = output<void>();
}
