import { getMonthRangeKST } from '@/lib/date-utils';
import { toKST } from '@moneger/shared';

export function kstMonthKey(date: Date): Date {
  const kst = toKST(date);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
}

export function kstMonthEndUTC(year: number, month: number): Date {
  return getMonthRangeKST(year, month).endDate;
}

export function kstMonthKeyFromYM(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function ymFromMonthKey(monthKey: Date): { year: number; month: number } {
  return { year: monthKey.getUTCFullYear(), month: monthKey.getUTCMonth() + 1 };
}

export function formatMonthKey(monthKey: Date): string {
  const y = monthKey.getUTCFullYear();
  const m = String(monthKey.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function previousMonth(monthKey: Date): Date {
  return new Date(Date.UTC(monthKey.getUTCFullYear(), monthKey.getUTCMonth() - 1, 1));
}

export function buildMonthWindow(endMonthKey: Date, count: number): Date[] {
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(new Date(Date.UTC(endMonthKey.getUTCFullYear(), endMonthKey.getUTCMonth() - i, 1)));
  }
  return months;
}
