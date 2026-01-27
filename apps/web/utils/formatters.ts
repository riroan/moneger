/**
 * 숫자를 한국어 형식으로 포맷팅 (천 단위 콤마)
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('ko-KR');
};

/**
 * 날짜를 "YYYY.M.D HH:mm" 형식으로 포맷팅
 */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

/**
 * 년월 형식으로 포맷팅
 */
export const formatYearMonth = (date: Date): string => {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};

/**
 * 통화 형식으로 포맷팅 (기호와 숫자 분리)
 * JSX.Element를 반환하므로 React 컴포넌트에서 사용
 */
export const formatCurrencyDisplay = (amount: string): {
  sign: string;
  currencySymbol: string;
  number: string;
} => {
  const hasSign = amount.startsWith('+') || amount.startsWith('-');
  const sign = hasSign ? amount.charAt(0) : '';
  const rest = hasSign ? amount.slice(1) : amount;

  const currencySymbol = rest.charAt(0);
  const number = rest.slice(1);

  return { sign, currencySymbol, number };
};

/**
 * 금액 입력값 포맷팅 (콤마 추가)
 */
export const formatAmountInput = (value: string): string => {
  const rawValue = value.replace(/,/g, '');
  if (rawValue === '' || !/^\d+$/.test(rawValue)) {
    return '';
  }
  return parseInt(rawValue).toLocaleString('ko-KR');
};

/**
 * 포맷된 금액에서 숫자 추출
 */
export const parseFormattedAmount = (formattedValue: string): number => {
  return parseInt(formattedValue.replace(/,/g, '')) || 0;
};
