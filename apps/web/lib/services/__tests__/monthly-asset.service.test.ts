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
    recurringExpense: { findMany: jest.fn() },
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
    (prisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([]);
    // /savings 총 저축액과 동일: 목표들의 currentAmount 합
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', name: '목표', currentAmount: 33000, targetAmount: 100000, targetYear: 2030, targetMonth: 1, isPrimary: true, brokerageAccounts: [] },
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

  it('소비 예산 페이스는 예정 고정비를 해당 결제일에 반영한다', async () => {
    const endMonthKey = new Date(Date.UTC(2026, 5, 1));
    (prisma.monthlyAssetSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ defaultExpenseBudget: 300000 });
    (prisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([
      { amount: 90000, dayOfMonth: 10, createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { amount: 30000, dayOfMonth: 31, createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 1);

    expect(report.report.dailyExpenses[0].budgetPaceKrw).toBe(6000);
    expect(report.report.dailyExpenses[9].budgetPaceKrw).toBe(150000);
    expect(report.report.dailyExpenses[29].budgetPaceKrw).toBe(300000);
  });
});

// 투자 이중계상 제거: 저축 목표 ↔ 증권 계좌 링크
//   연결 목표는 유효 스냅샷(totalEquityKrw>0)이 있을 때만 savingsKrw에서 제외되고,
//   그 평가액은 investmentKrw로 카운트된다. 유효 스냅샷이 없으면 원금(currentAmount) fallback.
describe('investment dedup (savingsGoal ↔ brokerage link)', () => {
  function brokerageSnapshotRow(opts: {
    accountId?: string;
    savingsGoalId?: string | null;
    totalEquityKrw: number;
    date: Date;
  }) {
    const { accountId = 'acc-1', savingsGoalId = null, totalEquityKrw, date } = opts;
    return {
      accountId,
      date,
      asOf: date,
      cashKrw: 0,
      totalEquityKrw,
      positionsValueKrw: totalEquityKrw,
      account: {
        displayName: '연동 계좌',
        savingsGoalId,
        connection: { broker: 'KIS' },
      },
      positions: [],
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 }, _count: 0 });
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.assetSnapshot.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ defaultExpenseBudget: null });
    (prisma.monthlyAssetSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.recurringExpense.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('연결 목표 + 유효 스냅샷: savingsKrw에서 제외, 평가액은 investmentKrw로 1회만 카운트', async () => {
    const endMonthKey = kstMonthKey(new Date());
    const [currentMonth] = buildMonthWindow(endMonthKey, 1);
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', name: '주식', currentAmount: 33000, targetAmount: 100000, targetYear: 2030, targetMonth: 1, isPrimary: true, brokerageAccounts: [{ id: 'acc-1' }] },
    ]);
    (prisma.brokerageSnapshot.findMany as jest.Mock).mockResolvedValue([
      brokerageSnapshotRow({ savingsGoalId: 'g1', totalEquityKrw: 50000, date: currentMonth }),
    ]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 1);

    // 이중계상이라면 savings 33000 + investment 50000 = 83000. 제외 후:
    expect(report.current.savingsKrw).toBe(0);
    expect(report.current.investmentKrw).toBe(50000);
    expect(report.current.totalAssetKrw).toBe(50000);
    // 원금/평가액/손익 페어링
    const goal = report.report.savingsGoals[0];
    expect(goal.currentAmount).toBe(33000);
    expect(goal.marketValueKrw).toBe(50000);
    expect(goal.pnlKrw).toBe(17000);
    expect(goal.linkedAccountIds).toEqual(['acc-1']);
  });

  it('연결 목표인데 스냅샷 없음: 원금(currentAmount) fallback — 돈이 사라지지 않는다', async () => {
    const endMonthKey = kstMonthKey(new Date());
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', name: '주식', currentAmount: 33000, targetAmount: 100000, targetYear: 2030, targetMonth: 1, isPrimary: true, brokerageAccounts: [{ id: 'acc-1' }] },
    ]);
    (prisma.brokerageSnapshot.findMany as jest.Mock).mockResolvedValue([]); // 아직 sync 전

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 1);

    expect(report.current.savingsKrw).toBe(33000); // fallback
    expect(report.current.investmentKrw).toBe(0);
    const goal = report.report.savingsGoals[0];
    expect(goal.linkedAccountIds).toEqual(['acc-1']); // 연결은 됨(동기화 중)
    expect(goal.marketValueKrw).toBeNull();
    expect(goal.pnlKrw).toBeNull();
  });

  it('연결 계좌 스냅샷이 0원(실패): 제외 트리거 안 함 — 원금 fallback', async () => {
    const endMonthKey = kstMonthKey(new Date());
    const [currentMonth] = buildMonthWindow(endMonthKey, 1);
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', name: '주식', currentAmount: 33000, targetAmount: 100000, targetYear: 2030, targetMonth: 1, isPrimary: true, brokerageAccounts: [{ id: 'acc-1' }] },
    ]);
    (prisma.brokerageSnapshot.findMany as jest.Mock).mockResolvedValue([
      brokerageSnapshotRow({ savingsGoalId: 'g1', totalEquityKrw: 0, date: currentMonth }),
    ]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 1);

    expect(report.current.savingsKrw).toBe(33000); // 유효성 기준 미달 → fallback
    expect(report.report.savingsGoals[0].marketValueKrw).toBeNull();
  });

  it('비연결 목표는 변경 후에도 savingsKrw에 그대로 합산된다 (회귀 방지)', async () => {
    const endMonthKey = kstMonthKey(new Date());
    const [currentMonth] = buildMonthWindow(endMonthKey, 1);
    (prisma.savingsGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', name: '비상금', currentAmount: 33000, targetAmount: 100000, targetYear: 2030, targetMonth: 1, isPrimary: true, brokerageAccounts: [] },
    ]);
    // 다른 사용자/미연결 계좌 스냅샷이 있어도 g1과 무관
    (prisma.brokerageSnapshot.findMany as jest.Mock).mockResolvedValue([
      brokerageSnapshotRow({ accountId: 'acc-x', savingsGoalId: null, totalEquityKrw: 50000, date: currentMonth }),
    ]);

    const report = await getMonthlyAssetReport('user-1', endMonthKey, 1);

    expect(report.current.savingsKrw).toBe(33000);
    expect(report.current.investmentKrw).toBe(50000);
    expect(report.report.savingsGoals[0].marketValueKrw).toBeNull();
    expect(report.report.savingsGoals[0].linkedAccountIds).toEqual([]);
  });
});
