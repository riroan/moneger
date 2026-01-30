import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatYearMonth,
  formatTime,
  formatDateWithDay,
  formatAmountInput,
  parseFormattedAmount,
  formatCurrencyDisplay,
} from '../src/formatters';

describe('formatters', () => {
  describe('formatNumber', () => {
    it('should format number with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(100)).toBe('100');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with won symbol', () => {
      expect(formatCurrency(1000)).toBe('₩1,000');
      expect(formatCurrency(50000)).toBe('₩50,000');
    });

    it('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('₩0');
      expect(formatCurrency(undefined)).toBe('₩0');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('₩0');
    });
  });

  describe('formatDate', () => {
    it('should format date string to YYYY.M.D HH:mm', () => {
      const result = formatDate('2024-01-15T09:30:00');
      expect(result).toBe('2024.1.15 09:30');
    });

    it('should handle different dates', () => {
      const result = formatDate('2024-12-25T14:05:00');
      expect(result).toBe('2024.12.25 14:05');
    });
  });

  describe('formatYearMonth', () => {
    it('should format date to Korean year/month', () => {
      const date = new Date(2024, 0, 15); // January 2024
      expect(formatYearMonth(date)).toBe('2024년 1월');
    });

    it('should handle different months', () => {
      const date = new Date(2024, 11, 1); // December 2024
      expect(formatYearMonth(date)).toBe('2024년 12월');
    });
  });

  describe('formatTime', () => {
    it('should format time to HH:mm', () => {
      const result = formatTime('2024-01-15T09:30:00');
      // Result may vary based on locale, but should contain time
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDateWithDay', () => {
    it('should format date with day of week in Korean', () => {
      // 2024-01-15 is Monday
      const result = formatDateWithDay('2024-01-15T09:30:00');
      expect(result).toBe('1월 15일 (월)');
    });

    it('should handle Sunday', () => {
      // 2024-01-14 is Sunday
      const result = formatDateWithDay('2024-01-14T09:30:00');
      expect(result).toBe('1월 14일 (일)');
    });

    it('should handle Saturday', () => {
      // 2024-01-20 is Saturday
      const result = formatDateWithDay('2024-01-20T09:30:00');
      expect(result).toBe('1월 20일 (토)');
    });
  });

  describe('formatAmountInput', () => {
    it('should format amount with thousand separators', () => {
      const result = formatAmountInput('50000');
      expect(result.value).toBe('50,000');
      expect(result.exceeded).toBe(false);
    });

    it('should remove non-numeric characters', () => {
      const result = formatAmountInput('50,000원');
      expect(result.value).toBe('50,000');
    });

    it('should return empty for empty input', () => {
      const result = formatAmountInput('');
      expect(result.value).toBe('');
      expect(result.exceeded).toBe(false);
    });

    it('should cap at max amount and set exceeded flag', () => {
      // Default max is TRANSACTION_MAX (100,000,000,000)
      const result = formatAmountInput('999999999999999');
      expect(result.exceeded).toBe(true);
    });

    it('should respect custom max amount', () => {
      const result = formatAmountInput('15000', 10000);
      expect(result.value).toBe('10,000');
      expect(result.exceeded).toBe(true);
    });
  });

  describe('parseFormattedAmount', () => {
    it('should parse formatted amount string to number', () => {
      expect(parseFormattedAmount('50,000')).toBe(50000);
      expect(parseFormattedAmount('1,234,567')).toBe(1234567);
    });

    it('should return 0 for empty string', () => {
      expect(parseFormattedAmount('')).toBe(0);
    });

    it('should return 0 for non-numeric string', () => {
      expect(parseFormattedAmount('abc')).toBe(0);
    });
  });

  describe('formatCurrencyDisplay', () => {
    it('should split positive amount into sign and value', () => {
      const result = formatCurrencyDisplay('+50,000');
      expect(result.sign).toBe('+');
      expect(result.value).toBe('50,000');
    });

    it('should split negative amount into sign and value', () => {
      const result = formatCurrencyDisplay('-50,000');
      expect(result.sign).toBe('-');
      expect(result.value).toBe('50,000');
    });

    it('should default to + sign for unsigned amount', () => {
      const result = formatCurrencyDisplay('50,000');
      expect(result.sign).toBe('+');
      expect(result.value).toBe('50,000');
    });
  });
});
