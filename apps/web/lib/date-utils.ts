/**
 * 날짜 관련 유틸리티 함수
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9시간 (밀리초)
export const KST_OFFSET_HOURS = 9;

/**
 * 월의 시작일과 종료일을 반환
 */
export function getMonthRange(year: number, month: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

/**
 * 특정 날짜의 시작 시간과 종료 시간을 반환
 */
export function getDayRange(date: Date): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/**
 * 날짜를 YYYY-MM-DD 형식의 문자열로 변환
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 한국 시간대(KST, UTC+9) 기준으로 날짜(일) 추출
 */
export function getKSTDay(date: Date): number {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  return kstDate.getUTCDate();
}

/**
 * KST 기준 월의 시작과 끝을 UTC로 변환하여 반환
 */
export function getMonthRangeKST(year: number, month: number): { startDate: Date; endDate: Date } {
  // KST 기준 월 1일 00:00:00 -> UTC
  const startDate = new Date(
    Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - KST_OFFSET_HOURS * 60 * 60 * 1000
  );

  // KST 기준 월 마지막일 23:59:59 -> UTC
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(
    Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59, 999) - KST_OFFSET_HOURS * 60 * 60 * 1000
  );

  return { startDate, endDate };
}

/**
 * 해당 월의 일수를 반환
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 오늘부터 N일 전까지의 날짜 범위를 반환
 */
export function getLastNDaysRange(days: number): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}
