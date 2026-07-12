import { act, renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';
import { useAppStore, useAuthStore, useCategoryStore, useTransactionStore } from '@/stores';
import type { TransactionSummary } from '@/types';

function makeSummary(balance: number): TransactionSummary {
  return {
    summary: {
      totalIncome: balance,
      totalExpense: 0,
      totalSavings: 0,
      netAmount: balance,
      balance,
      carryOverBalance: 0,
    },
    categories: [],
    transactionCount: {
      income: 0,
      expense: 0,
    },
    savings: {
      totalAmount: 0,
      targetAmount: 0,
      count: 0,
      primaryGoal: null,
    },
  };
}

function jsonResponse(data: unknown) {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

describe('useDashboardData', () => {
  const juneBootstrapSummary = makeSummary(600);
  const juneRefetchedSummary = makeSummary(601);
  const maySummary = makeSummary(500);
  const aprilSummary = makeSummary(400);

  beforeEach(() => {
    useAuthStore.setState({
      userId: 'user-1',
      userName: 'User',
      userEmail: 'user@example.com',
      isLoading: false,
    });
    useAppStore.setState({
      currentDate: new Date(2026, 5, 1),
      activeTab: 'dashboard',
      isMobile: false,
    });
    useTransactionStore.setState({
      recentTransactions: [],
      summary: null,
      todaySummary: null,
      lastMonthBalance: 0,
      oldestTransactionDate: null,
      isLoadingTransactions: false,
      isLoadingSummary: false,
      isLoadingTodaySummary: false,
    });
    useCategoryStore.setState({ categories: [], isLoading: false });

    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.startsWith('/api/dashboard/bootstrap')) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              categories: [],
              oldestTransactionDate: null,
              recentTransactions: [],
              todaySummary: null,
              summary: juneBootstrapSummary,
              lastMonthBalance: 550,
            },
          })
        );
      }

      if (url === '/api/transactions/summary?year=2026&month=6') {
        return Promise.resolve(jsonResponse({ success: true, data: juneRefetchedSummary }));
      }

      if (url === '/api/transactions/summary?year=2026&month=5') {
        return Promise.resolve(jsonResponse({ success: true, data: maySummary }));
      }

      if (url === '/api/transactions/summary?year=2026&month=4') {
        return Promise.resolve(jsonResponse({ success: true, data: aprilSummary }));
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it('refetches the bootstrapped month after navigating away and back', async () => {
    renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(useTransactionStore.getState().summary).toBe(juneBootstrapSummary);
    });

    act(() => {
      useAppStore.getState().goToPreviousMonth();
    });

    await waitFor(() => {
      expect(useTransactionStore.getState().summary).toBe(maySummary);
    });

    act(() => {
      useAppStore.getState().goToNextMonth();
    });

    await waitFor(() => {
      expect(useTransactionStore.getState().summary).toBe(juneRefetchedSummary);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/transactions/summary?year=2026&month=6');
  });
});
