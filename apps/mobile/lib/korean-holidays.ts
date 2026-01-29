/**
 * 한국 공휴일 경량 유틸리티
 * date-holidays 라이브러리 대체 (번들 크기 최적화)
 */

// 고정 공휴일 (매년 동일)
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

// 음력 공휴일 (양력 변환된 날짜, 2024-2030년)
// 설날(음력 1/1), 추석(음력 8/15), 부처님오신날(음력 4/8)
const LUNAR_HOLIDAYS: Record<number, Record<string, string>> = {
  2024: {
    '02-09': '설날 연휴',
    '02-10': '설날',
    '02-11': '설날 연휴',
    '02-12': '대체공휴일',
    '05-15': '부처님오신날',
    '09-16': '추석 연휴',
    '09-17': '추석',
    '09-18': '추석 연휴',
  },
  2025: {
    '01-28': '설날 연휴',
    '01-29': '설날',
    '01-30': '설날 연휴',
    '05-05': '부처님오신날',
    '10-05': '추석 연휴',
    '10-06': '추석',
    '10-07': '추석 연휴',
    '10-08': '대체공휴일',
  },
  2026: {
    '02-16': '설날 연휴',
    '02-17': '설날',
    '02-18': '설날 연휴',
    '05-24': '부처님오신날',
    '09-24': '추석 연휴',
    '09-25': '추석',
    '09-26': '추석 연휴',
  },
  2027: {
    '02-05': '설날 연휴',
    '02-06': '설날',
    '02-07': '설날 연휴',
    '02-08': '대체공휴일',
    '05-13': '부처님오신날',
    '09-14': '추석 연휴',
    '09-15': '추석',
    '09-16': '추석 연휴',
  },
  2028: {
    '01-25': '설날 연휴',
    '01-26': '설날',
    '01-27': '설날 연휴',
    '05-02': '부처님오신날',
    '10-02': '추석 연휴',
    '10-03': '추석',
    '10-04': '추석 연휴',
  },
  2029: {
    '02-12': '설날 연휴',
    '02-13': '설날',
    '02-14': '설날 연휴',
    '05-20': '부처님오신날',
    '09-21': '추석 연휴',
    '09-22': '추석',
    '09-23': '추석 연휴',
    '09-24': '대체공휴일',
  },
  2030: {
    '02-02': '설날 연휴',
    '02-03': '설날',
    '02-04': '설날 연휴',
    '05-09': '부처님오신날',
    '09-11': '추석 연휴',
    '09-12': '추석',
    '09-13': '추석 연휴',
  },
};

/**
 * 특정 연도의 공휴일 목록 반환
 */
export function getHolidays(year: number): { date: string; name: string }[] {
  const holidays: { date: string; name: string }[] = [];

  // 고정 공휴일 추가
  for (const [monthDay, name] of Object.entries(FIXED_HOLIDAYS)) {
    holidays.push({
      date: `${year}-${monthDay}`,
      name,
    });
  }

  // 음력 공휴일 추가
  const lunarHolidays = LUNAR_HOLIDAYS[year];
  if (lunarHolidays) {
    for (const [monthDay, name] of Object.entries(lunarHolidays)) {
      holidays.push({
        date: `${year}-${monthDay}`,
        name,
      });
    }
  }

  return holidays;
}

/**
 * 특정 월의 공휴일 날짜 Set 반환
 */
export function getHolidayDaysInMonth(year: number, month: number): Set<number> {
  const holidayDays = new Set<number>();
  const holidays = getHolidays(year);
  const targetMonth = month.toString().padStart(2, '0');

  for (const holiday of holidays) {
    const [, holidayMonth, day] = holiday.date.split('-');
    if (holidayMonth === targetMonth) {
      holidayDays.add(parseInt(day, 10));
    }
  }

  return holidayDays;
}

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(year: number, month: number, day: number): boolean {
  const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const holidays = getHolidays(year);
  return holidays.some(h => h.date === dateStr);
}
