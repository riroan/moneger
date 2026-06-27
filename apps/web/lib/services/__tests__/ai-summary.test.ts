import {
  buildAiFacts,
  buildMessages,
  sanitize,
  templateSummary,
} from '../ai-summary';
import type { MonthlyAssetReport } from '../monthly-asset.service';

function makeReport(overrides: Partial<MonthlyAssetReport['current']> = {}): MonthlyAssetReport {
  const current = {
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
  };

  return {
    months: ['2026-05', '2026-06'],
    snapshots: [
      {
        month: '2026-05',
        totalAssetKrw: 11000000,
        cashKrw: 3500000,
        investmentKrw: 4000000,
        savingsKrw: 3000000,
        otherKrw: 500000,
        cashRatio: 31.8,
        investmentRatio: 36.4,
        savingsRatio: 27.3,
        otherRatio: 4.5,
        monthlyIncomeKrw: 3900000,
        monthlyExpenseKrw: 1900000,
        monthlySavingsKrw: 1000000,
        investmentPnlKrw: 100000,
        investmentChangeKrw: null,
        sourceStatus: 'computed',
        stored: true,
      },
      current,
    ],
    current: {
      ...current,
      previousTotalAssetKrw: 11000000,
      totalMomDelta: 1000000,
      totalMomPercent: 9.1,
      ...overrides,
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

describe('ai-summary service', () => {
  it('builds narrow Korean facts and messages from a monthly asset report', () => {
    const facts = buildAiFacts(makeReport(), new Date('2026-06-15T00:00:00Z'));
    const messages = buildMessages(facts);

    expect(facts.monthLabel).toBe('2026년 6월');
    expect(facts.totalAssetText).toBe('12,000,000원');
    expect(facts.allocationText).toContain('투자 41.7%');
    expect(facts.allocationChangeText).toContain('현금 -6.8%p');
    expect(facts.monthlyFlowText).toContain('수입 4,000,000원');
    expect(facts.netCashFlowText).toContain('수입-소비 +2,200,000원');
    expect(facts.expenseBudgetText).toContain('82% 사용');
    expect(facts.savingsRateChangeText).toContain('+4.4%p');
    expect(facts.changeDriversText).toContain('기타/보정 -2,700,000원');
    expect(facts.insightCandidates[0]).toMatch(/\[(핵심|중요)\]/);
    expect(facts.insightCandidates.join(' ')).toContain('총자산 변화에서 가장 큰 항목');
    expect(messages[0].content).toContain('새로운 숫자를 만들지 마라');
    expect(messages[0].content).toContain('모든 계산은 애플리케이션에서 완료된 값');
    expect(messages[0].content).toContain('비율이나 증감률을 새로 계산하지 말고');
    expect(messages[1].content).toContain('월간 흐름');
    expect(messages[1].content).toContain('총자산 변화 기여');
    expect(messages[1].content).toContain('해석 후보');
    expect(messages[1].content).toContain('1. 한 줄 요약');
    expect(messages[1].content).toContain('6. 다음 달에 확인하면 좋을 사항');
    expect(messages[1].content).not.toContain('삼성전자');
    expect(messages[1].content).not.toContain('여행 목표');
  });

  it('handles nullable facts without inventing values', () => {
    const report = makeReport({
      previousTotalAssetKrw: null,
      totalMomDelta: null,
      totalMomPercent: null,
    });
    report.report.savingsRate = null;
    report.report.emergencyMonths = null;
    report.report.investment.monthlyChangeKrw = null;

    const messages = buildMessages(buildAiFacts(report));

    expect(messages[1].content).toContain('전월 대비: 데이터 없음');
    expect(messages[1].content).toContain('저축률: 데이터 없음');
    expect(messages[1].content).toContain('비상금 여력: 데이터 없음');
  });

  it('creates a deterministic structured template report', () => {
    const summary = templateSummary(buildAiFacts(makeReport()));

    expect(summary).toContain('2026년 6월 총자산은 12,000,000원');
    expect(summary).toContain('1. 한 줄 요약');
    expect(summary).toContain('6. 다음 달에 확인하면 좋을 사항');
    expect(sanitize(summary).ok).toBe(true);
  });

  it('rejects unsafe or low-quality model output', () => {
    expect(sanitize('좋습니다.').ok).toBe(true);
    expect(sanitize('').ok).toBe(false);
    expect(sanitize('지금은 매수하세요.').ok).toBe(false);
    expect(sanitize('**강조된 문장입니다.**').ok).toBe(false);
    expect(sanitize('This portfolio has good alpha beta signal trend budget savings investment cash balance report.').ok).toBe(false);
    expect(sanitize('문장입니다. 또 문장입니다. 세 번째 문장입니다.').ok).toBe(true);
    expect(sanitize('긴 문장입니다. '.repeat(400))).toEqual(
      expect.objectContaining({ ok: true })
    );
  });
});
