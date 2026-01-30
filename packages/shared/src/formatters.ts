/**
 * 포매팅 유틸리티 함수
 */

import { AMOUNT_LIMITS } from './constants';

/**
 * KST 타임존 오프셋 (밀리초)
 */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * UTC Date를 KST Date로 변환
 */
export function toKST(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/**
 * 현재 KST 시간을 반환
 */
export function nowKST(): Date {
  return toKST(new Date());
}

/**
 * KST 기준 오늘의 시작 시간 (UTC)
 */
export function getKSTDayStartUTC(date: Date = new Date()): Date {
  const kst = toKST(date);
  const kstMidnight = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate(), 0, 0, 0, 0);
  return new Date(kstMidnight.getTime() - KST_OFFSET_MS);
}

/**
 * KST 기준 오늘의 끝 시간 (UTC)
 */
export function getKSTDayEndUTC(date: Date = new Date()): Date {
  const kst = toKST(date);
  const kstEndOfDay = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate(), 23, 59, 59, 999);
  return new Date(kstEndOfDay.getTime() - KST_OFFSET_MS);
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
 * 숫자를 천단위 콤마가 포함된 문자열로 변환
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 금액을 원화 형식으로 포맷
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '₩0';
  return '₩' + amount.toLocaleString('ko-KR');
}

/**
 * 날짜 문자열을 "YYYY.M.D HH:mm" 형식으로 변환 (KST 기준)
 */
export function formatDate(dateStr: string): string {
  const { year, month, day, hours, minutes } = getKSTDateParts(new Date(dateStr));
  return `${year}.${month}.${day} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Date 객체를 "YYYY년 MM월" 형식으로 변환 (KST 기준)
 */
export function formatYearMonth(date: Date): string {
  const { year, month } = getKSTDateParts(date);
  return `${year}년 ${month}월`;
}

/**
 * 시간을 "HH:mm" 형식으로 변환 (KST 기준)
 */
export function formatTime(dateStr: string): string {
  const { hours, minutes } = getKSTDateParts(new Date(dateStr));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 날짜를 "M월 D일 (요일)" 형식으로 변환 (KST 기준)
 */
export function formatDateWithDay(dateStr: string): string {
  const { month, day, dayOfWeek } = getKSTDateParts(new Date(dateStr));
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}월 ${day}일 (${dayNames[dayOfWeek]})`;
}

/**
 * 금액 입력값 포맷팅 (천단위 콤마 + 최대값 체크)
 */
export function formatAmountInput(
  value: string,
  maxAmount: number = AMOUNT_LIMITS.TRANSACTION_MAX
): { value: string; exceeded: boolean } {
  const numericValue = value.replace(/[^0-9]/g, '');
  if (!numericValue) return { value: '', exceeded: false };

  const num = Number(numericValue);
  if (num > maxAmount) {
    return { value: maxAmount.toLocaleString('ko-KR'), exceeded: true };
  }
  return { value: num.toLocaleString('ko-KR'), exceeded: false };
}

/**
 * 포맷된 금액 문자열을 숫자로 파싱
 */
export function parseFormattedAmount(formattedValue: string): number {
  return parseInt(formattedValue.replace(/,/g, ''), 10) || 0;
}

/**
 * 금액 표시용 포맷 (기호와 숫자 분리)
 */
export function formatCurrencyDisplay(amount: string): { sign: string; value: string } {
  const isNegative = amount.startsWith('-');
  const cleanAmount = amount.replace(/^[-+]/, '');
  return {
    sign: isNegative ? '-' : '+',
    value: cleanAmount,
  };
}
