import { prisma } from '@/lib/prisma';
import { getMonthlyAssetReport } from '../monthly-asset.service';
import { buildMonthWindow, formatMonthKey, kstMonthKey } from '@/lib/utils/asset-month';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    savingsGoal: { findMany: jest.fn() },
    assetSnapshot: { aggregate: jest.fn() },
    brokerageSnapshot: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
    budget: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    monthlyAssetSnapshot: { findMany: jest.fn() },
  },
}));

function storedRow(month: Date, savingsKrw: number) {
  return {
    month,
    totalAssetKrw: savingsKrw,
    cashKrw: 0,
    investmentKrw: 0,
    savingsKrw,
    otherKrw: 0,
    cashRatio: 0,
    investmentRatio: 0,
    savingsRatio: 100,
    otherRatio: 0,
    monthlyIncomeKrw: 0,
    monthlyExpenseKrw: 0,
    monthlySavingsKrw: 0,
    investmentPnlKrw: 0,
    investmentChangeKrw: 0,
    sourceStatus: 'manual',
  };
}

describe('getMonthlyAssetReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 }, _count: 0 });
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.assetSnapshot.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (prisma.brokerageSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ defaultExpenseBudget: null });
    // /savings 총 저축액과 동일: 목표들의 currentAmount 합
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', name: '목표', currentAmount: 33000, targetAmount: 100000, targetYear: 2030, targetMonth: 1, isPrimary: true },
    ]);
  });

  it('진행 중인 이번 달은 저장 스냅샷이 있어도 무시하고 실시간 저축액(currentAmount 합)을 쓴다', async () => {
    const endMonthKey = kstMonthKey(new Date());
    const [prevMonth, currentMonth] = buildMonthWindow(endMonthKey, 2);
    // 이번 달에 옛 값(999)으로 저장된 스냅샷이 남아 있어도 무시되어야 한다
    (prisma.monthlyAssetSnapshot.findMany as jest.Mock).mockResolvedValue([
      storedRow(currentMonth, 999),
    ]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 2);

    expect(report.current.month).toBe(formatMonthKey(currentMonth));
    expect(report.current.savingsKrw).toBe(33000);
    expect(report.current.stored).toBe(false);
    void prevMonth;
  });

  it('완료된 과거 달은 저장된 스냅샷 값을 그대로 freeze 한다', async () => {
    const endMonthKey = kstMonthKey(new Date());
    const [prevMonth] = buildMonthWindow(endMonthKey, 2);
    (prisma.monthlyAssetSnapshot.findMany as jest.Mock).mockResolvedValue([
      storedRow(prevMonth, 5000),
    ]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 2);

    const prev = report.snapshots[0];
    expect(prev.month).toBe(formatMonthKey(prevMonth));
    expect(prev.savingsKrw).toBe(5000);
    expect(prev.stored).toBe(true);
  });

  it('소비 카테고리는 상위 3개로 자르지 않고 모두 반환한다', async () => {
    const endMonthKey = kstMonthKey(new Date());
    (prisma.monthlyAssetSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { id: 'cat-food', name: '식비', color: '#ef4444', defaultBudget: 500000 },
      { id: 'cat-traffic', name: '교통', color: '#f59e0b', defaultBudget: 200000 },
      { id: 'cat-life', name: '생활', color: '#10b981', defaultBudget: 300000 },
      { id: 'cat-culture', name: '문화', color: '#6366f1', defaultBudget: 150000 },
    ]);
    (prisma.transaction.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { categoryId: 'cat-food', _sum: { amount: 400000 } },
        { categoryId: 'cat-traffic', _sum: { amount: 120000 } },
        { categoryId: 'cat-life', _sum: { amount: 250000 } },
        { categoryId: 'cat-culture', _sum: { amount: 90000 } },
      ])
      .mockResolvedValueOnce([]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 1);

    expect(report.report.expenseCategories).toHaveLength(4);
    expect(report.report.expenseCategories.map((category) => category.name)).toEqual([
      '식비',
      '생활',
      '교통',
      '문화',
    ]);
  });
});
