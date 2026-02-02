import {
  authApi,
  transactionApi,
  categoryApi,
  budgetApi,
  savingsApi,
  balanceApi,
  summaryApi,
  statsApi,
  dailyBalanceApi,
} from '../../lib/api';

// Mock fetch globally
global.fetch = jest.fn();

// Mock API constants
jest.mock('../../constants/Api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  API_ENDPOINTS: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    PASSWORD: '/api/auth/password',
    DELETE_ACCOUNT: '/api/auth/delete',
    TRANSACTIONS: '/api/transactions',
    TRANSACTIONS_RECENT: '/api/transactions/recent',
    TRANSACTIONS_SUMMARY: '/api/transactions/summary',
    TRANSACTIONS_TODAY: '/api/transactions/today',
    TRANSACTIONS_OLDEST_DATE: '/api/transactions/oldest-date',
    CATEGORIES: '/api/categories',
    BUDGETS: '/api/budgets',
    SAVINGS: '/api/savings',
    BALANCE: '/api/balance',
    SUMMARY: '/api/summary',
    STATS: '/api/stats',
    DAILY_BALANCE: '/api/daily-balance',
  },
}));

describe('API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authApi', () => {
    describe('login', () => {
      it('should make POST request with email and password', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { user: { id: '1', name: 'Test', email: 'test@test.com' } },
          }),
        });

        const result = await authApi.login('test@test.com', 'password123');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
          })
        );
        expect(result.success).toBe(true);
      });

      it('should return error on failed login', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: '이메일 또는 비밀번호가 일치하지 않습니다' }),
        });

        const result = await authApi.login('test@test.com', 'wrong');

        expect(result.success).toBe(false);
        expect(result.error).toBe('이메일 또는 비밀번호가 일치하지 않습니다');
      });

      it('should handle network error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await authApi.login('test@test.com', 'password');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });
    });

    describe('signup', () => {
      it('should make POST request with signup data', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { user: { id: '1', name: 'Test', email: 'test@test.com' } },
          }),
        });

        const result = await authApi.signup('test@test.com', 'password123', 'Test User');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/auth/signup',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@test.com', password: 'password123', name: 'Test User' }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('changePassword', () => {
      it('should make PATCH request to change password', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await authApi.changePassword('user-1', 'oldPass', 'newPass');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/auth/password',
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    describe('deleteAccount', () => {
      it('should make POST request to delete account', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await authApi.deleteAccount('user-1', 'password');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/auth/delete',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('transactionApi', () => {
    describe('getAll', () => {
      it('should fetch transactions for user and month', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await transactionApi.getAll('user-1', 2024, 1);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions?userId=user-1&year=2024&month=1',
          expect.any(Object)
        );
      });

      it('should include limit parameter when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await transactionApi.getAll('user-1', 2024, 1, 10);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions?userId=user-1&year=2024&month=1&limit=10',
          expect.any(Object)
        );
      });
    });

    describe('getRecent', () => {
      it('should fetch recent transactions', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await transactionApi.getRecent('user-1', 10, 0);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions/recent?userId=user-1&limit=10&offset=0',
          expect.any(Object)
        );
      });
    });

    describe('getSummary', () => {
      it('should fetch transaction summary', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await transactionApi.getSummary('user-1', 2024, 1);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions/summary?userId=user-1&year=2024&month=1',
          expect.any(Object)
        );
      });
    });

    describe('getToday', () => {
      it('should fetch today summary', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await transactionApi.getToday('user-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions/today?userId=user-1',
          expect.any(Object)
        );
      });
    });

    describe('create', () => {
      it('should create a transaction', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: '1' } }),
        });

        await transactionApi.create({
          userId: 'user-1',
          amount: 50000,
          type: 'EXPENSE',
          date: '2024-01-15',
        });

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('update', () => {
      it('should update a transaction', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: '1' } }),
        });

        await transactionApi.update('tx-1', {
          userId: 'user-1',
          amount: 60000,
          type: 'EXPENSE',
        });

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions/tx-1',
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    describe('delete', () => {
      it('should delete a transaction', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await transactionApi.delete('tx-1', 'user-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/transactions/tx-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('categoryApi', () => {
    describe('getAll', () => {
      it('should fetch all categories for user', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await categoryApi.getAll('user-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/categories?userId=user-1',
          expect.any(Object)
        );
      });
    });

    describe('create', () => {
      it('should create a category', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: '1' } }),
        });

        await categoryApi.create({
          userId: 'user-1',
          name: '식비',
          type: 'EXPENSE',
          color: '#EF4444',
          icon: 'restaurant',
        });

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/categories',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('budgetApi', () => {
    describe('getAll', () => {
      it('should fetch budgets for user and month', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await budgetApi.getAll('user-1', 2024, 1);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/budgets?userId=user-1&year=2024&month=1',
          expect.any(Object)
        );
      });
    });

    describe('set', () => {
      it('should set a budget', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: '1' } }),
        });

        await budgetApi.set({
          userId: 'user-1',
          categoryId: 'cat-1',
          amount: 500000,
          year: 2024,
          month: 1,
        });

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/budgets',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('savingsApi', () => {
    describe('getAll', () => {
      it('should fetch savings goals for user', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await savingsApi.getAll('user-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/savings?userId=user-1',
          expect.any(Object)
        );
      });
    });

    describe('deposit', () => {
      it('should make deposit to savings goal', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await savingsApi.deposit('goal-1', 'user-1', 100000);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/savings/goal-1/deposit',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('balanceApi', () => {
    describe('get', () => {
      it('should fetch balance for user', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { balance: 1000000 } }),
        });

        await balanceApi.get('user-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/balance?userId=user-1',
          expect.any(Object)
        );
      });
    });
  });

  describe('statsApi', () => {
    describe('get', () => {
      it('should fetch stats for user and month', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await statsApi.get('user-1', 2024, 1);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/stats?userId=user-1&year=2024&month=1',
          expect.any(Object)
        );
      });
    });
  });

  describe('dailyBalanceApi', () => {
    describe('getRecent', () => {
      it('should fetch recent daily balances', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await dailyBalanceApi.getRecent('user-1', 7);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/daily-balance?userId=user-1&days=7',
          expect.any(Object)
        );
      });
    });

    describe('getMonthly', () => {
      it('should fetch monthly daily balances', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        await dailyBalanceApi.getMonthly('user-1', 2024, 1);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/daily-balance?userId=user-1&year=2024&month=1',
          expect.any(Object)
        );
      });
    });
  });
});
