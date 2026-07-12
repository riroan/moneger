import { NextRequest } from 'next/server';
import { POST } from '../route';
import { requireFeature } from '@/lib/entitlements-server';
import {
  createRecurringExpense,
  getRecurringExpenses,
} from '@/lib/services/recurring.service';
import { __setMockSessionUserId } from '@/lib/session';

jest.mock('@/lib/session');

jest.mock('@/lib/entitlements-server', () => ({
  requireFeature: jest.fn(),
}));

jest.mock('@/lib/services/recurring.service', () => ({
  createRecurringExpense: jest.fn(),
  getRecurringExpenses: jest.fn(),
}));

describe('POST /api/recurring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockSessionUserId('user-1');
    (requireFeature as jest.Mock).mockResolvedValue(null);
    (getRecurringExpenses as jest.Mock).mockResolvedValue([]);
  });

  it('세션이 없으면 401 에러를 반환해야 함', async () => {
    __setMockSessionUserId(null);

    const request = new NextRequest('http://localhost:3000/api/recurring', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000,
        description: '관리비',
        dayOfMonth: 25,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(createRecurringExpense).not.toHaveBeenCalled();
  });

  it('고정비가 20개면 400 에러를 반환해야 함', async () => {
    (getRecurringExpenses as jest.Mock).mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({ id: `rec-${index}` }))
    );

    const request = new NextRequest('http://localhost:3000/api/recurring', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000,
        description: '관리비',
        dayOfMonth: 25,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('정기 지출은 최대 20개까지 등록할 수 있습니다');
    expect(createRecurringExpense).not.toHaveBeenCalled();
  });

  it('고정비가 20개 미만이면 생성해야 함', async () => {
    const created = { id: 'rec-new', description: '관리비', amount: 10000 };
    (getRecurringExpenses as jest.Mock).mockResolvedValue(
      Array.from({ length: 19 }, (_, index) => ({ id: `rec-${index}` }))
    );
    (createRecurringExpense as jest.Mock).mockResolvedValue(created);

    const request = new NextRequest('http://localhost:3000/api/recurring', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000,
        description: '관리비',
        dayOfMonth: 25,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toEqual(created);
    expect(createRecurringExpense).toHaveBeenCalledWith({
      userId: 'user-1',
      amount: 10000,
      description: '관리비',
      type: 'EXPENSE',
      categoryId: null,
      dayOfMonth: 25,
    });
  });
});
