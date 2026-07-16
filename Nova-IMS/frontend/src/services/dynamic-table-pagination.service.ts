import { Injectable, NgZone } from '@angular/core';

export const TABLE_PAGE_SIZE_MIN = 5;
export const TABLE_PAGE_SIZE_MAX = 30;
export const TABLE_PAGE_SIZE_DEFAULT = 15;
export const TABLE_CARD_BREAKPOINT_PX = 576;

const CHROME_EXTRA_PX = 4;
const MEASURE_SAFETY_PX = 8;
const DEFAULT_HEAD_HEIGHT_PX = 40;
const DEFAULT_ROW_HEIGHT_PX = 43;
const DEFAULT_CARD_ROW_HEIGHT_PX = 40;
const MAX_OVERFLOW_REFINE_PASSES = 15;

export interface TablePageMeasureConfig {
  panel: HTMLElement;
  chromeSelectors?: string[];
  tableWrapSelector?: string;
  tableBreakpointPx?: number;
  layout?: 'auto' | 'table' | 'cards';
  theadSelector?: string;
  tableRowSelector?: string;
  cardRowSelector?: string;
  viewportAnchorSelector?: string;
  paginationSelector?: string;
  minSize?: number;
  maxSize?: number;
}

export interface DynamicPageSizeContext {
  minSize: number;
  maxSize: number;
  getCurrentSize: () => number;
  applySize: (size: number) => void;
  ngZone: NgZone;
  measure: () => number | null;
  getOverflowEl?: () => HTMLElement | null;
  overflowsViewport?: () => boolean;
}

export interface ResizeRecalcOptions {
  cacheKey: object;
  getObserveTargets: () => (HTMLElement | null | undefined)[];
  recalc: () => void;
  debounceMs?: number;
}

@Injectable({ providedIn: 'root' })
export class DynamicTablePaginationService {
  private readonly resizeTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

  private sampleRowHeight(
    panel: HTMLElement,
    rowSelector: string | undefined,
    fallback: number,
  ): number {
    if (!rowSelector) return fallback;
    const rows = panel.querySelectorAll(rowSelector);
    if (rows.length === 0) return fallback;

    let maxH = 0;
    const sampleCount = Math.min(rows.length, 4);
    for (let i = 0; i < sampleCount; i++) {
      const h = rows[i].getBoundingClientRect().height;
      if (h > maxH) maxH = h;
    }
    return maxH || fallback;
  }

  measureRows(config: TablePageMeasureConfig): number | null {
    const min = config.minSize ?? TABLE_PAGE_SIZE_MIN;
    const max = config.maxSize ?? TABLE_PAGE_SIZE_MAX;
    const panel = config.panel;

    const viewportAnchor = config.viewportAnchorSelector
      ? (panel.querySelector(config.viewportAnchorSelector) as HTMLElement | null)
      : null;
    const pagination = config.paginationSelector
      ? (panel.querySelector(config.paginationSelector) as HTMLElement | null)
      : null;

    if (viewportAnchor) {
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const tableTop = viewportAnchor.getBoundingClientRect().top;
      const listArea = viewportH - tableTop - (pagination?.offsetHeight ?? 36) - 12;
      if (listArea <= 0) return null;

      const thead = config.theadSelector
        ? (panel.querySelector(config.theadSelector) as HTMLElement | null)
        : null;
      const headerH = thead?.offsetHeight ?? DEFAULT_HEAD_HEIGHT_PX;
      const rowH = this.sampleRowHeight(panel, config.tableRowSelector, DEFAULT_ROW_HEIGHT_PX);
      const rows = Math.floor((listArea - headerH - MEASURE_SAFETY_PX) / rowH);
      return Math.min(max, Math.max(min, rows));
    }

    const chrome =
      (config.chromeSelectors?.reduce((sum, selector) => {
        const el = panel.querySelector(selector) as HTMLElement | null;
        return sum + (el?.offsetHeight ?? 0);
      }, 0) ?? 0) + CHROME_EXTRA_PX;

    const style = getComputedStyle(panel);
    const paddingY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);

    const tableWrap = config.tableWrapSelector
      ? (panel.querySelector(config.tableWrapSelector) as HTMLElement | null)
      : null;
    const listArea =
      tableWrap && tableWrap.clientHeight > 0
        ? tableWrap.clientHeight
        : panel.clientHeight - chrome - paddingY;
    if (listArea <= 0) return null;

    const breakpoint = config.tableBreakpointPx ?? TABLE_CARD_BREAKPOINT_PX;
    const layout = config.layout ?? 'auto';
    const useTable =
      layout === 'table' ||
      (layout === 'auto' && panel.clientWidth >= breakpoint && !!tableWrap?.querySelector('table'));

    const thead = config.theadSelector
      ? (panel.querySelector(config.theadSelector) as HTMLElement | null)
      : null;
    const cardRow = config.cardRowSelector
      ? (panel.querySelector(config.cardRowSelector) as HTMLElement | null)
      : null;

    const headerH = useTable ? (thead?.offsetHeight ?? DEFAULT_HEAD_HEIGHT_PX) : 0;
    const rowH = useTable
      ? this.sampleRowHeight(panel, config.tableRowSelector, DEFAULT_ROW_HEIGHT_PX)
      : cardRow?.offsetHeight || DEFAULT_CARD_ROW_HEIGHT_PX;
    const rows = Math.floor((listArea - headerH - MEASURE_SAFETY_PX) / rowH);
    return Math.min(max, Math.max(min, rows));
  }

  private hasOverflow(ctx: DynamicPageSizeContext): boolean {
    const overflowEl = ctx.getOverflowEl?.();
    if (overflowEl) {
      return overflowEl.scrollHeight > overflowEl.clientHeight + 1;
    }
    return ctx.overflowsViewport?.() ?? false;
  }

  private scheduleOverflowRefine(ctx: DynamicPageSizeContext, pass = 0): void {
    if (pass >= MAX_OVERFLOW_REFINE_PASSES) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!this.hasOverflow(ctx)) return;

          const next = Math.max(ctx.minSize, ctx.getCurrentSize() - 1);
          if (next === ctx.getCurrentSize()) return;

          ctx.ngZone.run(() => ctx.applySize(next));
          this.scheduleOverflowRefine(ctx, pass + 1);
        }, 0);
      });
    });
  }

  recalc(ctx: DynamicPageSizeContext): void {
    const size = ctx.measure();
    if (size === null) return;

    if (size !== ctx.getCurrentSize()) {
      ctx.ngZone.run(() => ctx.applySize(size));
    }

    this.scheduleOverflowRefine(ctx);
  }

  bindResizeRecalc(options: ResizeRecalcOptions): () => void {
    const debounceMs = options.debounceMs ?? 120;
    const schedule = () => {
      const existing = this.resizeTimers.get(options.cacheKey);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.resizeTimers.delete(options.cacheKey);
        options.recalc();
      }, debounceMs);
      this.resizeTimers.set(options.cacheKey, timer);
    };

    const observer = new ResizeObserver(schedule);
    const observeTargets = () => {
      for (const target of options.getObserveTargets()) {
        if (target) observer.observe(target);
      }
    };

    observeTargets();
    queueMicrotask(observeTargets);

    const onViewportResize = () => schedule();
    window.addEventListener('resize', onViewportResize);
    window.visualViewport?.addEventListener('resize', onViewportResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onViewportResize);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
      const timer = this.resizeTimers.get(options.cacheKey);
      if (timer) clearTimeout(timer);
      this.resizeTimers.delete(options.cacheKey);
    };
  }
}
