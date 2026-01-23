import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import HomePage from '../page';

// Mock useRouter and usePathname
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
}));

// Helper to wrap components with ThemeProvider and ToastProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  );
};

// Default mock responses
const mockCategories = {
  success: true,
  data: [
    { id: 'cat-1', name: '식비', type: 'EXPENSE', color: '#EF4444', icon: '🍽️' },
    { id: 'cat-2', name: '급여', type: 'INCOME', color: '#10B981', icon: '💰' },
  ],
};

const mockOldestDate = {
  success: true,
  data: { year: 2024, month: 1 },
};

const mockRecentTransactions = {
  success: true,
  data: [],
  count: 0,
};

const mockTodaySummary = {
  success: true,
  data: {
    date: '2024-01-15',
    year: 2024,
    month: 1,
    day: 15,
    dayOfWeek: 1,
    expense: { total: 0, count: 0 },
    income: { total: 0, count: 0 },
    savings: { total: 0, count: 0 },
  },
};

const mockSummary = {
  success: true,
  data: {
    summary: { totalIncome: 100000, totalExpense: 50000, netAmount: 50000, balance: 50000 },
    categories: [],
    budget: { amount: 200000, used: 50000, remaining: 150000, usagePercent: 25 },
    transactionCount: { income: 1, expense: 2 },
    savings: { totalAmount: 0, count: 0, targetAmount: 0, primaryGoal: null },
  },
};

// Setup fetch mock
const setupFetchMock = () => {
  (global.fetch as jest.Mock) = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/categories?')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCategories),
      });
    }
    if (url.includes('/api/transactions/oldest-date')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockOldestDate),
      });
    }
    if (url.includes('/api/transactions/recent')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecentTransactions),
      });
    }
    if (url.includes('/api/transactions/today')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTodaySummary),
      });
    }
    if (url.includes('/api/transactions/summary')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSummary),
      });
    }
    if (url.includes('/api/categories/seed')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
};

describe('HomePage', () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'userId') return 'user-1';
      if (key === 'userName') return '테스트';
      if (key === 'userEmail') return 'test@example.com';
      return null;
    });

    setupFetchMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('메인 페이지가 렌더링되어야 함', async () => {
    renderWithTheme(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('MONEGER')).toBeInTheDocument();
    });
  });

  it('로그인하지 않은 경우 로그인 페이지로 이동해야 함', () => {
    Storage.prototype.getItem = jest.fn(() => null);

    renderWithTheme(<HomePage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('사용자 이름 이니셜이 표시되어야 함', async () => {
    renderWithTheme(<HomePage />);

    await waitFor(() => {
      // 사용자 이름의 첫 글자가 표시되어야 함
      const initials = screen.getAllByText('테');
      expect(initials.length).toBeGreaterThan(0);
    });
  });

  it('API 에러 시에도 페이지가 렌더링되어야 함', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('Network error'));

    renderWithTheme(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('MONEGER')).toBeInTheDocument();
    });
  });
});
