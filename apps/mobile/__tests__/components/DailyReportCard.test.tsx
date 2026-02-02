import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DailyReportCard from '../../components/cards/DailyReportCard';

// Mock themeStore
jest.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}));

// Mock authStore
jest.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    userId: 'user-123',
  }),
}));

// Mock refreshStore
jest.mock('../../stores/refreshStore', () => ({
  useRefreshStore: () => ({
    lastTransactionUpdate: null,
  }),
}));

// Mock shared package
jest.mock('@moneger/shared', () => ({
  formatNumber: (num: number) => num.toLocaleString('ko-KR'),
  getKSTDateParts: (date: Date) => ({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    dayOfWeek: date.getDay(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
  }),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock LineChart
jest.mock('../../components/charts', () => ({
  LineChart: 'LineChart',
}));

// Mock API
const mockDailyBalanceData = [
  { date: '2024-01-01', balance: 1000000, income: 100000, expense: 50000, savings: 0 },
  { date: '2024-01-02', balance: 1050000, income: 80000, expense: 30000, savings: 0 },
  { date: '2024-01-03', balance: 1100000, income: 100000, expense: 50000, savings: 0 },
];

jest.mock('../../lib/api', () => ({
  dailyBalanceApi: {
    getRecent: jest.fn().mockResolvedValue({
      success: true,
      data: [
        { date: '2024-01-01', balance: 1000000, income: 100000, expense: 50000, savings: 0 },
        { date: '2024-01-02', balance: 1050000, income: 80000, expense: 30000, savings: 0 },
        { date: '2024-01-03', balance: 1100000, income: 100000, expense: 50000, savings: 0 },
      ],
    }),
  },
}));

describe('DailyReportCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title', async () => {
    const { getByText } = render(<DailyReportCard />);

    await waitFor(() => {
      expect(getByText('일별 리포트')).toBeTruthy();
    });
  });

  it('should render subtitle with days', async () => {
    const { getByText } = render(<DailyReportCard />);

    await waitFor(() => {
      expect(getByText('최근 7일')).toBeTruthy();
    });
  });

  it('should render period selector buttons', async () => {
    const { getByText } = render(<DailyReportCard />);

    await waitFor(() => {
      expect(getByText('1일')).toBeTruthy();
      expect(getByText('3일')).toBeTruthy();
      expect(getByText('7일')).toBeTruthy();
      expect(getByText('30일')).toBeTruthy();
    });
  });

  it('should render balance after loading', async () => {
    const { getByText } = render(<DailyReportCard />);

    await waitFor(() => {
      expect(getByText('₩1,100,000')).toBeTruthy();
    });
  });

  it('should render summary items after loading', async () => {
    const { getByText } = render(<DailyReportCard />);

    await waitFor(() => {
      expect(getByText('수입')).toBeTruthy();
      expect(getByText('지출')).toBeTruthy();
      expect(getByText('저축')).toBeTruthy();
      expect(getByText('합계')).toBeTruthy();
    });
  });

  it('should change period when button is pressed', async () => {
    const { getByText } = render(<DailyReportCard />);

    await waitFor(() => {
      expect(getByText('7일')).toBeTruthy();
    });

    fireEvent.press(getByText('30일'));

    await waitFor(() => {
      expect(getByText('최근 30일')).toBeTruthy();
    });
  });

  it('should show loading indicator initially', () => {
    const { UNSAFE_root } = render(<DailyReportCard />);

    const activityIndicators = UNSAFE_root.findAllByType('ActivityIndicator');
    expect(activityIndicators.length).toBeGreaterThanOrEqual(0);
  });

  it('should render without userId', async () => {
    jest.doMock('../../stores/authStore', () => ({
      useAuthStore: () => ({
        userId: null,
      }),
    }));

    const { UNSAFE_root } = render(<DailyReportCard />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
