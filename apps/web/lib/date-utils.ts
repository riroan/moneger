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
 * KST 기준 오늘부터 N일 전까지의 날짜 범위를 반환 (UTC로 변환)
 * toKST로 변환된 Date는 UTC 메서드를 사용해야 올바른 KST 값을 얻음
 */
export function getLastNDaysRange(days: number): { startDate: Date; endDate: Date } {
  const now = new Date();
  const kstNow = toKST(now);

  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth();
  const day = kstNow.getUTCDate();

  // KST 기준 오늘 끝 -> UTC
  const endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - KST_OFFSET_MS);

  // KST 기준 N일 전 시작 -> UTC
  const startDate = new Date(Date.UTC(year, month, day - days + 1, 0, 0, 0, 0) - KST_OFFSET_MS);

  return { startDate, endDate };
}

/**
 * UTC Date를 KST Date로 변환
 */
export function toKST(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/**
 * KST 기준 오늘의 시작 시간 (UTC)
 * toKST로 변환된 Date는 UTC 메서드를 사용해야 올바른 KST 값을 얻음
 */
export function getKSTDayStartUTC(date: Date = new Date()): Date {
  const kst = toKST(date);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 0, 0, 0, 0) - KST_OFFSET_MS);
}

/**
 * KST 기준 오늘의 끝 시간 (UTC)
 * toKST로 변환된 Date는 UTC 메서드를 사용해야 올바른 KST 값을 얻음
 */
export function getKSTDayEndUTC(date: Date = new Date()): Date {
  const kst = toKST(date);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 23, 59, 59, 999) - KST_OFFSET_MS);
}

/**
 * KST 기준 연/월/일 정보 추출
 * toKST로 변환된 Date는 UTC 메서드를 사용해야 올바른 KST 값을 얻음
 */
export function getKSTDateParts(date: Date): { year: number; month: number; day: number; dayOfWeek: number; hours: number; minutes: number } {
  const kst = toKST(date);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    dayOfWeek: kst.getUTCDay(),
    hours: kst.getUTCHours(),
    minutes: kst.getUTCMinutes(),
  };
}

/**
 * KST 기준 날짜를 PostgreSQL DATE 타입용 Date 객체로 변환
 * DATE 타입은 UTC 날짜를 저장하므로, KST 날짜가 UTC 날짜와 일치하도록 변환
 * toKST로 변환된 Date는 UTC 메서드를 사용해야 올바른 KST 값을 얻음
 */
export function toKSTDateForDB(date: Date): Date {
  const kst = toKST(date);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

/**
 * KST 기준 특정 날짜의 시작/종료 시간 범위 (UTC로 변환)
 * toKST로 변환된 Date는 UTC 메서드를 사용해야 올바른 KST 값을 얻음
 */
export function getKSTDayRangeUTC(date: Date): { startOfDay: Date; endOfDay: Date; dateForDB: Date } {
  const kst = toKST(date);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth();
  const day = kst.getUTCDate();

  // KST 00:00:00 -> UTC
  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - KST_OFFSET_MS);
  // KST 23:59:59.999 -> UTC
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - KST_OFFSET_MS);
  // PostgreSQL DATE 저장용 (UTC 자정)
  const dateForDB = new Date(Date.UTC(year, month, day));

  return { startOfDay, endOfDay, dateForDB };
}
