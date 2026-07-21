
export function startOfCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDaysSince(from: Date, to: Date = new Date()): number {
  const diffMs = startOfCalendarDay(to).getTime() - startOfCalendarDay(from).getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}

export function parseCerremDateOnly(value: string | null | undefined): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const isoDate = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) {
    return startOfCalendarDay(new Date(direct));
  }

  return null;
}

export function daysSinceCerremEnvio(options: {
  fechaCerrem?: string | null;
  cerremPhaseSince?: Date | null;
  asOf?: Date;
}): number | null {
  const from =
    parseCerremDateOnly(options.fechaCerrem) ?? options.cerremPhaseSince ?? null;
  if (!from) return null;
  return calendarDaysSince(from, options.asOf ?? new Date());
}
