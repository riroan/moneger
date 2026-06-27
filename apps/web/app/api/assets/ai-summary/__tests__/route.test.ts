import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getMonthlyAssetReport } from '@/lib/services/monthly-asset.service';

const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    assetAiSummary: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/monthly-asset.service', () => ({
  getMonthlyAssetReport: jest.fn(),
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockSummaryFindUnique = prisma.assetAiSummary.findUnique as jest.Mock;
const mockSummaryUpsert = prisma.assetAiSummary.upsert as jest.Mock;
const mockGetMonthlyAssetReport = getMonthlyAssetReport as jest.Mock;

const generatedAt = new Date('2026-06-27T00:00:00.000Z');
const originalApiKey = process.env.OPENAI_API_KEY;

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/assets/ai-summary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeReport() {
  return {
    months: ['2026-05', '2026-06'],
    snapshots: [],
    current: {
      month: '2026-06',
      totalAssetKrw: 12000000,
      cashKrw: 3000000,
      investmentKrw: 5000000,
      savingsKrw: 3500000,
      otherKrw: 500000,
      cashRatio: 25,
      investmentRatio: 41.7,
      savingsRatio: 29.2,
      otherRatio: 4.1,
      monthlyIncomeKrw: 4000000,
      monthlyExpenseKrw: 1800000,
      monthlySavingsKrw: 1200000,
      investmentPnlKrw: 250000,
      investmentChangeKrw: 300000,
      sourceStatus: 'computed',
      stored: false,
      previousTotalAssetKrw: 11000000,
      totalMomDelta: 1000000,
      totalMomPercent: 9.1,
    },
    report: {
      expenseBudgetKrw: 2200000,
      expenseBudgetUsedPercent: 82,
      expenseMomPercent: -5,
      savingsRate: 30,
      emergencyMonths: 5.2,
      dailyExpenses: [],
      recentExpenses: [],
      expenseCategories: [],
      topExpenseCategories: [],
      primarySavingsGoal: null,
      savingsGoals: [],
      investment: {
        totalKrw: 5000000,
        monthlyChangeKrw: 300000,
        unrealizedPnlKrw: 250000,
        snapshotDate: null,
        snapshotDateCount: 0,
        accounts: [],
        dailyBalances: [],
        topPosition: null,
        positions: [],
      },
    },
  };
}

describe('POST /api/assets/ai-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    mockUserFindUnique.mockResolvedValue({ plan: 'ULTIMATE', planExpiresAt: null });
    mockSummaryFindUnique.mockResolvedValue(null);
    mockGetMonthlyAssetReport.mockResolvedValue(makeReport());
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '총자산은 전월 대비 증가했고 투자 비중이 가장 크게 나타납니다.' } }],
    });
    mockSummaryUpsert.mockImplementation(async ({ create, update }) => ({
      text: update?.text ?? create.text,
      source: update?.source ?? create.source,
      generatedAt: update?.generatedAt ?? create.generatedAt ?? generatedAt,
    }));
  });

  afterAll(() => {
    if (originalApiKey == null) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  });

  it('returns 403 when user is not entitled', async () => {
    mockUserFindUnique.mockResolvedValue({ plan: 'PRO', planExpiresAt: null });

    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06' }));

    expect(response.status).toBe(403);
    expect(mockGetMonthlyAssetReport).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06' }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('ai_unavailable');
    expect(mockSummaryFindUnique).not.toHaveBeenCalled();
  });

  it('returns cached summary without calling OpenAI', async () => {
    mockSummaryFindUnique.mockResolvedValue({
      text: '캐시된 요약입니다.',
      source: 'ai',
      generatedAt,
    });

    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.text).toBe('캐시된 요약입니다.');
    expect(mockGetMonthlyAssetReport).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ignores cache when regenerate is true', async () => {
    mockSummaryFindUnique.mockResolvedValue({
      text: '캐시된 요약입니다.',
      source: 'ai',
      generatedAt,
    });

    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06', regenerate: true }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.source).toBe('ai');
    expect(data.data.text).not.toBe('캐시된 요약입니다.');
    expect(mockSummaryFindUnique).not.toHaveBeenCalled();
    expect(mockGetMonthlyAssetReport).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
  });

  it('calls OpenAI and stores sanitized AI output', async () => {
    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.source).toBe('ai');
    expect(data.data.text).toBe('총자산은 전월 대비 증가했고 투자 비중이 가장 크게 나타납니다.');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4.1-mini' }));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('max_tokens');
    expect(mockSummaryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId_month: expect.objectContaining({ userId: 'user-1' }) }),
      })
    );
  });

  it('falls back to template when OpenAI fails', async () => {
    mockCreate.mockRejectedValue(new Error('timeout'));

    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06', regenerate: true }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.source).toBe('template');
    expect(data.data.text).toContain('2026년 6월 총자산은 12,000,000원');
  });

  it('falls back to template when OpenAI output is prescriptive', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '지금은 매수하세요.' } }] });

    const response = await POST(makeRequest({ userId: 'user-1', month: '2026-06', regenerate: true }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.source).toBe('template');
    expect(data.data.text).not.toContain('매수하세요');
  });
});
