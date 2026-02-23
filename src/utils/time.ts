const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const MONTH_IN_MS = 30 * DAY_IN_MS;
const YEAR_IN_MS = 365 * DAY_IN_MS;

export function formatTimeAgoPt(dateInput: string | Date, nowInput: Date = new Date()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = nowInput;
  const deltaMs = date.getTime() - now.getTime();
  const absMs = Math.abs(deltaMs);
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  if (absMs < MINUTE_IN_MS) return formatter.format(Math.round(deltaMs / SECOND_IN_MS), 'second');
  if (absMs < HOUR_IN_MS) return formatter.format(Math.round(deltaMs / MINUTE_IN_MS), 'minute');
  if (absMs < DAY_IN_MS) return formatter.format(Math.round(deltaMs / HOUR_IN_MS), 'hour');
  if (absMs < MONTH_IN_MS) return formatter.format(Math.round(deltaMs / DAY_IN_MS), 'day');
  if (absMs < YEAR_IN_MS) return formatter.format(Math.round(deltaMs / MONTH_IN_MS), 'month');
  return formatter.format(Math.round(deltaMs / YEAR_IN_MS), 'year');
}

