/**
 * 포매팅 유틸리티 함수
 */

import { AMOUNT_LIMITS } from './constants';

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
 * 날짜 문자열을 "YYYY.M.D HH:mm" 형식으로 변환
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

/**
 * Date 객체를 "YYYY년 MM월" 형식으로 변환
 */
export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

/**
 * 시간을 "HH:mm" 형식으로 변환
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 날짜를 "M월 D일 (요일)" 형식으로 변환
 */
export function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
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
