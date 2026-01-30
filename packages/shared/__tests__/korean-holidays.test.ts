import {
  getHolidays,
  getHolidayDaysInMonth,
  isHoliday,
} from '../src/korean-holidays';

describe('korean-holidays', () => {
  describe('getHolidays', () => {
    it('should return fixed holidays for any year', () => {
      const holidays2024 = getHolidays(2024);
      const holidayNames = holidays2024.map(h => h.name);

      expect(holidayNames).toContain('신정');
      expect(holidayNames).toContain('삼일절');
      expect(holidayNames).toContain('어린이날');
      expect(holidayNames).toContain('현충일');
      expect(holidayNames).toContain('광복절');
      expect(holidayNames).toContain('개천절');
      expect(holidayNames).toContain('한글날');
      expect(holidayNames).toContain('크리스마스');
    });

    it('should return correct fixed holiday dates', () => {
      const holidays = getHolidays(2024);
      const holidayDates = holidays.map(h => h.date);

      expect(holidayDates).toContain('2024-01-01'); // 신정
      expect(holidayDates).toContain('2024-03-01'); // 삼일절
      expect(holidayDates).toContain('2024-05-05'); // 어린이날
      expect(holidayDates).toContain('2024-06-06'); // 현충일
      expect(holidayDates).toContain('2024-08-15'); // 광복절
      expect(holidayDates).toContain('2024-10-03'); // 개천절
      expect(holidayDates).toContain('2024-10-09'); // 한글날
      expect(holidayDates).toContain('2024-12-25'); // 크리스마스
    });

    it('should return lunar holidays for 2024', () => {
      const holidays = getHolidays(2024);
      const holidayDates = holidays.map(h => h.date);

      // 2024 설날
      expect(holidayDates).toContain('2024-02-09');
      expect(holidayDates).toContain('2024-02-10');
      expect(holidayDates).toContain('2024-02-11');

      // 2024 추석
      expect(holidayDates).toContain('2024-09-16');
      expect(holidayDates).toContain('2024-09-17');
      expect(holidayDates).toContain('2024-09-18');

      // 2024 부처님오신날
      expect(holidayDates).toContain('2024-05-15');
    });

    it('should return lunar holidays for 2025', () => {
      const holidays = getHolidays(2025);
      const holidayDates = holidays.map(h => h.date);

      // 2025 설날
      expect(holidayDates).toContain('2025-01-28');
      expect(holidayDates).toContain('2025-01-29');
      expect(holidayDates).toContain('2025-01-30');

      // 2025 추석
      expect(holidayDates).toContain('2025-10-05');
      expect(holidayDates).toContain('2025-10-06');
      expect(holidayDates).toContain('2025-10-07');
    });

    it('should return lunar holidays for 2026', () => {
      const holidays = getHolidays(2026);
      const holidayDates = holidays.map(h => h.date);

      // 2026 설날
      expect(holidayDates).toContain('2026-02-16');
      expect(holidayDates).toContain('2026-02-17');
      expect(holidayDates).toContain('2026-02-18');
    });

    it('should only return fixed holidays for unsupported years', () => {
      const holidays = getHolidays(2010);
      const holidayNames = holidays.map(h => h.name);

      // Should have fixed holidays
      expect(holidayNames).toContain('신정');
      expect(holidayNames).toContain('크리스마스');

      // Should NOT have lunar holidays
      expect(holidayNames).not.toContain('설날');
      expect(holidayNames).not.toContain('추석');
    });
  });

  describe('getHolidayDaysInMonth', () => {
    it('should return holiday days for January 2024', () => {
      const days = getHolidayDaysInMonth(2024, 1);
      expect(days.has(1)).toBe(true); // 신정
    });

    it('should return holiday days for February 2024 (설날)', () => {
      const days = getHolidayDaysInMonth(2024, 2);
      expect(days.has(9)).toBe(true);  // 설날 연휴
      expect(days.has(10)).toBe(true); // 설날
      expect(days.has(11)).toBe(true); // 설날 연휴
      expect(days.has(12)).toBe(true); // 대체공휴일
    });

    it('should return holiday days for September 2024 (추석)', () => {
      const days = getHolidayDaysInMonth(2024, 9);
      expect(days.has(16)).toBe(true); // 추석 연휴
      expect(days.has(17)).toBe(true); // 추석
      expect(days.has(18)).toBe(true); // 추석 연휴
    });

    it('should return holiday days for October 2024', () => {
      const days = getHolidayDaysInMonth(2024, 10);
      expect(days.has(3)).toBe(true); // 개천절
      expect(days.has(9)).toBe(true); // 한글날
    });

    it('should return empty set for month with no holidays', () => {
      // November 2024 has no holidays
      const days = getHolidayDaysInMonth(2024, 11);
      expect(days.size).toBe(0);
    });
  });

  describe('isHoliday', () => {
    it('should return true for fixed holidays', () => {
      expect(isHoliday(2024, 1, 1)).toBe(true);   // 신정
      expect(isHoliday(2024, 3, 1)).toBe(true);   // 삼일절
      expect(isHoliday(2024, 5, 5)).toBe(true);   // 어린이날
      expect(isHoliday(2024, 6, 6)).toBe(true);   // 현충일
      expect(isHoliday(2024, 8, 15)).toBe(true);  // 광복절
      expect(isHoliday(2024, 10, 3)).toBe(true);  // 개천절
      expect(isHoliday(2024, 10, 9)).toBe(true);  // 한글날
      expect(isHoliday(2024, 12, 25)).toBe(true); // 크리스마스
    });

    it('should return true for lunar holidays', () => {
      // 2024 설날
      expect(isHoliday(2024, 2, 10)).toBe(true);
      // 2024 추석
      expect(isHoliday(2024, 9, 17)).toBe(true);
      // 2024 부처님오신날
      expect(isHoliday(2024, 5, 15)).toBe(true);
    });

    it('should return false for regular days', () => {
      expect(isHoliday(2024, 1, 2)).toBe(false);
      expect(isHoliday(2024, 4, 15)).toBe(false);
      expect(isHoliday(2024, 7, 20)).toBe(false);
    });

    it('should handle single-digit months and days', () => {
      expect(isHoliday(2024, 1, 1)).toBe(true);
      expect(isHoliday(2024, 3, 1)).toBe(true);
    });
  });
});
