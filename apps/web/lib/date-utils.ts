/**
 * 날짜 관련 유틸리티 함수
 *
 * 공통 KST 함수는 @moneger/shared에서 re-export
 * 서버 전용 날짜 범위 함수만 이 파일에 정의
 */

// 공통 KST 함수 re-export
export {
  KST_OFFSET_MS,
  toKST,
  getKSTDayStartUTC,
  getKSTDayEndUTC,
  getKSTDateParts,
  getKSTDay,
} from '@moneger/shared';

import { KST_OFFSET_MS, toKST } from '@moneger/shared';

const KST_OFFSET_HOURS = 9;

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
 * 날짜를 YYYY-MM-DD 형식의 문자열로 변환
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * KST 기준 날짜를 PostgreSQL DATE 타입용 Date 객체로 변환
 */
export function toKSTDateForDB(date: Date): Date {
  const kst = toKST(date);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

/**
 * KST 기준 특정 날짜의 시작/종료 시간 범위 (UTC로 변환)
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
