/**
 * 숫자 및 통화 포맷팅 유틸리티 함수 테스트
 */

describe('formatNumber', () => {
  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };

  it('정수를 천 단위 구분자로 포맷해야 함', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(10000)).toBe('10,000');
    expect(formatNumber(100000)).toBe('100,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('0을 올바르게 포맷해야 함', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('음수를 올바르게 포맷해야 함', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
    expect(formatNumber(-50000)).toBe('-50,000');
  });

  it('작은 숫자를 올바르게 포맷해야 함', () => {
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(10)).toBe('10');
    expect(formatNumber(100)).toBe('100');
  });
});

describe('handleAmountChange (금액 입력 검증)', () => {
  const validateAmount = (value: string): { isValid: boolean; error?: string; formatted?: string } => {
    const rawValue = value.replace(/,/g, '');

    if (rawValue === '') {
      return { isValid: true, formatted: '' };
    }

    if (!/^\d+$/.test(rawValue)) {
      return { isValid: false, error: '숫자만 입력할 수 있습니다' };
    }

    if (parseInt(rawValue) === 0) {
      return { isValid: false, error: '0보다 큰 금액을 입력하세요' };
    }

    const formattedValue = parseInt(rawValue).toLocaleString('ko-KR');
    return { isValid: true, formatted: formattedValue };
  };

  it('빈 값을 허용해야 함', () => {
    const result = validateAmount('');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('');
  });

  it('숫자를 콤마 포맷으로 변환해야 함', () => {
    expect(validateAmount('1000').formatted).toBe('1,000');
    expect(validateAmount('10000').formatted).toBe('10,000');
    expect(validateAmount('100000').formatted).toBe('100,000');
  });

  it('이미 포맷된 숫자를 올바르게 처리해야 함', () => {
    expect(validateAmount('1,000').formatted).toBe('1,000');
    expect(validateAmount('10,000').formatted).toBe('10,000');
  });

  it('숫자가 아닌 입력을 거부해야 함', () => {
    const result = validateAmount('abc');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('숫자만 입력할 수 있습니다');
  });

  it('0을 거부해야 함', () => {
    const result = validateAmount('0');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('0보다 큰 금액을 입력하세요');
  });

  it('특수 문자를 거부해야 함', () => {
    const result1 = validateAmount('1000!');
    expect(result1.isValid).toBe(false);

    const result2 = validateAmount('1000@');
    expect(result2.isValid).toBe(false);
  });

  it('공백을 거부해야 함', () => {
    const result = validateAmount('1 000');
    expect(result.isValid).toBe(false);
  });
});

describe('formatDate (날짜 포맷팅)', () => {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  };

  it('날짜를 "월 일" 형식으로 포맷해야 함', () => {
    expect(formatDate('2024-01-15')).toBe('1월 15일');
    expect(formatDate('2024-12-25')).toBe('12월 25일');
  });

  it('한 자리 월과 일을 올바르게 포맷해야 함', () => {
    expect(formatDate('2024-01-05')).toBe('1월 5일');
    expect(formatDate('2024-03-09')).toBe('3월 9일');
  });

  it('두 자리 월과 일을 올바르게 포맷해야 함', () => {
    expect(formatDate('2024-11-30')).toBe('11월 30일');
    expect(formatDate('2024-12-31')).toBe('12월 31일');
  });
});

describe('formatYearMonth (연월 포맷팅)', () => {
  const formatYearMonth = (date: Date): string => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  it('Date 객체를 "년 월" 형식으로 포맷해야 함', () => {
    expect(formatYearMonth(new Date(2024, 0, 1))).toBe('2024년 1월');
    expect(formatYearMonth(new Date(2024, 11, 31))).toBe('2024년 12월');
  });

  it('다양한 연도와 월을 올바르게 포맷해야 함', () => {
    expect(formatYearMonth(new Date(2023, 5, 15))).toBe('2023년 6월');
    expect(formatYearMonth(new Date(2025, 0, 1))).toBe('2025년 1월');
  });
});
