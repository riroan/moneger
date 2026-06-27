import type { MonthlyAssetReport } from './monthly-asset.service';
import { formatMonthKey, kstMonthKey } from '@/lib/utils/asset-month';

export type AiSummarySource = 'ai' | 'template';

export interface AiFactsDTO {
  month: string;
  monthLabel: string;
  totalAssetText: string;
  totalAssetIsZero: boolean;
  totalMomText: string | null;
  allocationText: string;
  allocationChangeText: string | null;
  dominantAllocationText: string | null;
  monthlyFlowText: string;
  netCashFlowText: string;
  expenseBudgetText: string | null;
  expenseMomText: string | null;
  savingsRateText: string | null;
  savingsRateChangeText: string | null;
  emergencyMonthsText: string | null;
  investmentPnlText: string | null;
  investmentChangeText: string | null;
  changeDriversText: string | null;
  strongestSignalText: string | null;
  insightCandidates: string[];
  dataQualityText: string;
  inProgressText: string | null;
}

export interface AiMessage {
  role: 'system' | 'user';
  content: string;
}

function krw(value: number): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  return `${rounded.toLocaleString('ko-KR')}원`;
}

function signedKrw(value: number): string {
  if (value === 0) return krw(0);
  return `${value > 0 ? '+' : '-'}${krw(Math.abs(value))}`;
}

function ratio(value: number): string {
  return `${value.toFixed(1)}%`;
}

function signedRatio(value: number): string {
  return `${value > 0 ? '+' : ''}${ratio(value)}`;
}

function percentagePoint(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%p`;
}

function monthLabel(month: string): string {
  const [year, rawMonth] = month.split('-');
  return `${year}년 ${Number(rawMonth)}월`;
}

function currentMonthText(now: Date): string {
  return formatMonthKey(kstMonthKey(now));
}

function rankLabel(priority: number): string {
  if (priority >= 90) return '핵심';
  if (priority >= 70) return '중요';
  return '보조';
}

function previousSnapshot(report: MonthlyAssetReport): MonthlyAssetReport['snapshots'][number] | null {
  const currentIndex = report.snapshots.findIndex((snapshot) => snapshot.month === report.current.month);
  if (currentIndex > 0) return report.snapshots[currentIndex - 1];
  return report.snapshots.filter((snapshot) => snapshot.month < report.current.month).at(-1) ?? null;
}

export function buildAiFacts(report: MonthlyAssetReport, now = new Date()): AiFactsDTO {
  const current = report.current;
  const previous = previousSnapshot(report);
  const netOperatingFlow = current.monthlyIncomeKrw - current.monthlyExpenseKrw;
  const afterSavingsCashFlow = netOperatingFlow - current.monthlySavingsKrw;
  const investmentChange = report.report.investment.monthlyChangeKrw ?? current.investmentChangeKrw ?? 0;
  const otherAdjustment =
    current.totalMomDelta == null
      ? null
      : current.totalMomDelta - (netOperatingFlow + current.monthlySavingsKrw + investmentChange);
  const allocationItems = [
    { label: '현금', ratio: current.cashRatio, previousRatio: previous?.cashRatio, value: current.cashKrw },
    { label: '투자', ratio: current.investmentRatio, previousRatio: previous?.investmentRatio, value: current.investmentKrw },
    { label: '저축', ratio: current.savingsRatio, previousRatio: previous?.savingsRatio, value: current.savingsKrw },
    { label: '기타', ratio: current.otherRatio, previousRatio: previous?.otherRatio, value: current.otherKrw },
  ];
  const dominant = allocationItems
    .filter((item) => item.value > 0)
    .sort((a, b) => b.ratio - a.ratio)[0] ?? null;
  const allocationChanges =
    previous == null
      ? []
      : allocationItems
          .map((item) => ({ label: item.label, delta: item.ratio - (item.previousRatio ?? 0) }))
          .filter((item) => Math.abs(item.delta) >= 0.1)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 2);
  const driverItems =
    current.totalMomDelta == null
      ? []
      : [
          { label: '수입-소비', value: netOperatingFlow },
          { label: '저축', value: current.monthlySavingsKrw },
          { label: '투자 변동', value: investmentChange },
          { label: '기타/보정', value: otherAdjustment ?? 0 },
        ];
  const strongestDriver = driverItems.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0] ?? null;
  const previousSavingsRate =
    previous && previous.monthlyIncomeKrw > 0 ? (previous.monthlySavingsKrw / previous.monthlyIncomeKrw) * 100 : null;
  const savingsRateChange =
    report.report.savingsRate == null || previousSavingsRate == null
      ? null
      : report.report.savingsRate - previousSavingsRate;
  const expenseBudgetRemaining =
    report.report.expenseBudgetUsedPercent == null || report.report.expenseBudgetKrw <= 0
      ? null
      : report.report.expenseBudgetKrw - current.monthlyExpenseKrw;
  const insightCandidates: Array<{ priority: number; text: string }> = [];
  if (current.totalMomDelta != null && current.totalMomPercent != null) {
    insightCandidates.push({
      priority: current.totalMomDelta < 0 ? 86 : 78,
      text: `총자산은 전월 대비 ${signedKrw(current.totalMomDelta)}(${signedRatio(current.totalMomPercent)}) ${
        current.totalMomDelta >= 0 ? '증가' : '감소'
      }했습니다`,
    });
  }
  if (strongestDriver != null) {
    insightCandidates.push({
      priority: 82,
      text: `총자산 변화에서 가장 큰 항목은 ${strongestDriver.label} ${signedKrw(strongestDriver.value)}입니다`,
    });
  }
  if (afterSavingsCashFlow < 0) {
    insightCandidates.push({
      priority: 94,
      text: `저축 후 현금흐름이 ${signedKrw(afterSavingsCashFlow)}로 현금 여유를 낮췄습니다`,
    });
  } else if (afterSavingsCashFlow > 0) {
    insightCandidates.push({
      priority: 67,
      text: `저축 후에도 현금흐름이 ${signedKrw(afterSavingsCashFlow)}로 남았습니다`,
    });
  }
  if (report.report.expenseBudgetUsedPercent != null && expenseBudgetRemaining != null) {
    if (report.report.expenseBudgetUsedPercent > 100) {
      insightCandidates.push({
        priority: 96,
        text: `소비가 예산을 ${krw(Math.abs(expenseBudgetRemaining))} 초과했습니다`,
      });
    } else if (report.report.expenseBudgetUsedPercent >= 90) {
      insightCandidates.push({
        priority: 88,
        text: `소비 예산을 ${report.report.expenseBudgetUsedPercent}% 사용해 여유가 ${krw(expenseBudgetRemaining)} 남았습니다`,
      });
    } else {
      insightCandidates.push({
        priority: 58,
        text: `소비 예산 사용률은 ${report.report.expenseBudgetUsedPercent}%입니다`,
      });
    }
  }
  if (report.report.savingsRate != null) {
    const savingsRateSignal =
      savingsRateChange == null ? '' : `, 전월 대비 ${percentagePoint(savingsRateChange)}`;
    insightCandidates.push({
      priority: report.report.savingsRate < 15 ? 85 : report.report.savingsRate >= 30 ? 74 : 62,
      text: `저축률은 ${ratio(report.report.savingsRate)}${savingsRateSignal}입니다`,
    });
  }
  if (report.report.emergencyMonths != null) {
    insightCandidates.push({
      priority: report.report.emergencyMonths < 3 ? 90 : report.report.emergencyMonths < 6 ? 76 : 52,
      text: `비상금 여력은 최근 소비 기준 ${report.report.emergencyMonths.toFixed(1)}개월입니다`,
    });
  }
  if (allocationChanges.length > 0) {
    insightCandidates.push({
      priority: 64,
      text: `구성비 변화는 ${allocationChanges.map((item) => `${item.label} ${percentagePoint(item.delta)}`).join(', ')}가 두드러집니다`,
    });
  }
  if (report.report.investment.monthlyChangeKrw != null && report.report.investment.monthlyChangeKrw !== 0) {
    insightCandidates.push({
      priority: 61,
      text: `투자 자산의 월간 변화는 ${signedKrw(report.report.investment.monthlyChangeKrw)}입니다`,
    });
  }
  const topInsights = insightCandidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((item) => `[${rankLabel(item.priority)}] ${item.text}`);
  const qualityFlags = [
    current.stored ? '저장된 월말 스냅샷 기반' : '실시간 계산 기반',
    `데이터 상태 ${current.sourceStatus}`,
  ];

  return {
    month: current.month,
    monthLabel: monthLabel(current.month),
    totalAssetText: krw(current.totalAssetKrw),
    totalAssetIsZero: current.totalAssetKrw <= 0,
    totalMomText:
      current.totalMomDelta == null || current.totalMomPercent == null
        ? null
        : `${signedKrw(current.totalMomDelta)} (${current.totalMomPercent > 0 ? '+' : ''}${ratio(current.totalMomPercent)})`,
    allocationText: allocationItems.map((item) => `${item.label} ${ratio(item.ratio)}`).join(', '),
    allocationChangeText:
      allocationChanges.length === 0
        ? null
        : allocationChanges.map((item) => `${item.label} ${percentagePoint(item.delta)}`).join(', '),
    dominantAllocationText: dominant ? `${dominant.label} ${ratio(dominant.ratio)}` : null,
    monthlyFlowText: `수입 ${krw(current.monthlyIncomeKrw)}, 소비 ${krw(current.monthlyExpenseKrw)}, 저축 ${krw(current.monthlySavingsKrw)}`,
    netCashFlowText: `수입-소비 ${signedKrw(netOperatingFlow)}, 저축 후 현금흐름 ${signedKrw(afterSavingsCashFlow)}`,
    expenseBudgetText:
      expenseBudgetRemaining == null
        ? null
        : `소비 예산 ${krw(report.report.expenseBudgetKrw)} 중 ${report.report.expenseBudgetUsedPercent}% 사용, ${
            expenseBudgetRemaining >= 0 ? `${krw(expenseBudgetRemaining)} 남음` : `${krw(Math.abs(expenseBudgetRemaining))} 초과`
          }`,
    expenseMomText:
      report.report.expenseMomPercent == null ? null : `소비 전월 대비 ${signedRatio(report.report.expenseMomPercent)}`,
    savingsRateText: report.report.savingsRate == null ? null : ratio(report.report.savingsRate),
    savingsRateChangeText: savingsRateChange == null ? null : `전월 대비 ${percentagePoint(savingsRateChange)}`,
    emergencyMonthsText:
      report.report.emergencyMonths == null ? null : `${report.report.emergencyMonths.toFixed(1)}개월`,
    investmentPnlText:
      current.investmentKrw <= 0 ? null : signedKrw(report.report.investment.unrealizedPnlKrw),
    investmentChangeText:
      report.report.investment.monthlyChangeKrw == null ? null : signedKrw(report.report.investment.monthlyChangeKrw),
    changeDriversText:
      driverItems.length === 0
        ? null
        : driverItems.map((item) => `${item.label} ${signedKrw(item.value)}`).join(', '),
    strongestSignalText:
      strongestDriver == null
        ? null
        : `총자산 변화 기여에서 ${strongestDriver.label}(${signedKrw(strongestDriver.value)})가 가장 큰 항목입니다`,
    insightCandidates: topInsights,
    dataQualityText: qualityFlags.join(', '),
    inProgressText:
      current.month === currentMonthText(now) ? '이번 달은 아직 진행 중인 월입니다.' : null,
  };
}

export function buildMessages(facts: AiFactsDTO): AiMessage[] {
  const factLines = [
    `대상 월: ${facts.monthLabel}`,
    `총자산: ${facts.totalAssetText}`,
    facts.totalMomText ? `전월 대비: ${facts.totalMomText}` : '전월 대비: 데이터 없음',
    `자산 배분: ${facts.allocationText}`,
    facts.allocationChangeText ? `구성비 변화: ${facts.allocationChangeText}` : '구성비 변화: 데이터 없음',
    `월간 흐름: ${facts.monthlyFlowText}`,
    `현금흐름: ${facts.netCashFlowText}`,
    facts.expenseBudgetText ? `소비 예산: ${facts.expenseBudgetText}` : '소비 예산: 데이터 없음',
    facts.expenseMomText ? facts.expenseMomText : '소비 전월 대비: 데이터 없음',
    facts.savingsRateText ? `저축률: ${facts.savingsRateText}` : '저축률: 데이터 없음',
    facts.savingsRateChangeText ? `저축률 변화: ${facts.savingsRateChangeText}` : '저축률 변화: 데이터 없음',
    facts.emergencyMonthsText ? `비상금 여력: ${facts.emergencyMonthsText}` : '비상금 여력: 데이터 없음',
    facts.investmentPnlText ? `투자 평가손익: ${facts.investmentPnlText}` : '투자 평가손익: 데이터 없음',
    facts.investmentChangeText ? `투자 월간 변화: ${facts.investmentChangeText}` : '투자 월간 변화: 데이터 없음',
    facts.changeDriversText ? `총자산 변화 기여: ${facts.changeDriversText}` : '총자산 변화 기여: 데이터 없음',
    facts.strongestSignalText ? `가장 큰 신호: ${facts.strongestSignalText}` : '가장 큰 신호: 데이터 없음',
    facts.insightCandidates.length > 0 ? `해석 후보: ${facts.insightCandidates.join(' / ')}` : '해석 후보: 데이터 없음',
    `데이터 품질: ${facts.dataQualityText}`,
    facts.inProgressText,
  ].filter(Boolean);

  return [
    {
      role: 'system',
      content:
        [
          '당신은 개인 자산 관리 전문 AI 어시스턴트입니다.',
          '목표:',
          '- 사용자의 자산 현황을 객관적으로 분석한다.',
          '- 데이터에 근거한 내용만 말한다.',
          '- 없는 사실을 추측하지 않는다.',
          '- 투자, 대출, 보험 등에 대해 확정적인 조언을 하지 않는다.',
          '- 이해하기 쉬운 한국어로 작성한다.',
          '',
          '항상 친절하지만 과장하지 않는다.',
          '모든 계산은 애플리케이션에서 완료된 값이라고 가정하세요.',
          '아래 이미 계산된 사실만 사용하고, 새로운 숫자를 만들지 마라.',
          '비율이나 증감률을 새로 계산하지 말고 제공된 데이터를 기반으로 해석만 수행하세요.',
          '데이터에 없는 내용은 추측하지 말고, 필요하면 변화의 원인을 가능성으로 표현하라.',
          '매수, 매도, 갈아타기, 비중 조정 등 투자 행동을 지시하지 마라.',
        ].join('\n'),
    },
    {
      role: 'user',
      content: [
        '위 데이터를 분석하여 사용자가 이해하기 쉬운 월간 자산 리포트를 작성해 주세요.',
        '데이터 없음 항목은 강조하지 마세요.',
        '',
        '응답 형식',
        '1. 한 줄 요약',
        '2. 이번 달 핵심 변화',
        '3. 소비 패턴 분석',
        '4. 긍정적인 점',
        '5. 주의할 점',
        '6. 다음 달에 확인하면 좋을 사항',
        '',
        '데이터',
        factLines.map((line) => `- ${line}`).join('\n'),
      ].join('\n'),
    },
  ];
}

export function templateSummary(facts: AiFactsDTO): string {
  if (facts.totalAssetIsZero) {
    return [
      '1. 한 줄 요약',
      `${facts.monthLabel}은 집계된 자산이 없어 해석할 데이터가 제한적입니다.`,
      '',
      '2. 이번 달 핵심 변화',
      '총자산과 전월 대비 변화 모두 충분한 데이터가 없습니다.',
      '',
      '3. 소비 패턴 분석',
      '수입·소비·저축 데이터가 더 쌓이면 소비 흐름을 확인할 수 있습니다.',
      '',
      '4. 긍정적인 점',
      '현재는 평가할 수 있는 지표가 제한적입니다.',
      '',
      '5. 주의할 점',
      '데이터가 적어 특정 변화 원인을 단정하기 어렵습니다.',
      '',
      '6. 다음 달에 확인하면 좋을 사항',
      '총자산, 소비, 저축률, 현금흐름이 안정적으로 기록되는지 확인하면 좋습니다.',
    ].join('\n');
  }

  const changeText = facts.totalMomText ? `전월 대비 ${facts.totalMomText} 변동했습니다` : '전월 비교 데이터는 아직 없습니다';
  const primaryInsight = facts.insightCandidates[0]?.replace(/^\[[^\]]+\]\s*/, '') ?? null;
  const secondaryInsight = facts.insightCandidates[1]?.replace(/^\[[^\]]+\]\s*/, '') ?? null;
  const positive = facts.savingsRateText
    ? `저축률은 ${facts.savingsRateText}${facts.savingsRateChangeText ? `이고 ${facts.savingsRateChangeText}` : ''}입니다.`
    : facts.emergencyMonthsText
      ? `비상금 여력은 ${facts.emergencyMonthsText}로 집계됐습니다.`
      : '긍정적인 신호는 추가 데이터가 쌓이면 더 명확하게 볼 수 있습니다.';
  const caution =
    facts.insightCandidates
      .map((candidate) => candidate.replace(/^\[[^\]]+\]\s*/, ''))
      .find((candidate) => /(초과|감소|낮췄|여력|음수|주의)/.test(candidate)) ??
    '현재 데이터만으로는 특정 위험 요인을 단정하기 어렵습니다.';

  return [
    '1. 한 줄 요약',
    `${facts.monthLabel} 총자산은 ${facts.totalAssetText}이며, ${primaryInsight ?? changeText}.`,
    '',
    '2. 이번 달 핵심 변화',
    `${secondaryInsight ?? facts.strongestSignalText ?? changeText}.`,
    '',
    '3. 소비 패턴 분석',
    `${facts.expenseBudgetText ?? '소비 예산 데이터는 없습니다.'}${facts.expenseMomText ? ` ${facts.expenseMomText}.` : ''}`,
    '',
    '4. 긍정적인 점',
    positive,
    '',
    '5. 주의할 점',
    `${caution} 변화 원인은 현재 데이터만으로 단정하지 않는 편이 좋습니다.`,
    '',
    '6. 다음 달에 확인하면 좋을 사항',
    '소비 예산 사용률, 저축 후 현금흐름, 자산 구성비 변화가 이어지는지 확인하면 좋습니다.',
  ].join('\n');
}

const PRESCRIPTIVE_PATTERN =
  /(매수|매도|팔아|파세요|팔고|사세요|사야|사라|갈아타|비중\s*조정|추천|투자하세요|옮기세요|줄이세요|늘리세요|확대하세요|축소하세요|정리하세요|진입하세요)/;

export function sanitize(text: string): { ok: boolean; text: string } {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!normalized) return { ok: false, text: '' };
  if (PRESCRIPTIVE_PATTERN.test(normalized)) return { ok: false, text: normalized };
  if (/(\*\*|__|```|^#{1,6}\s|(?:^|\n)[-*]\s)/m.test(normalized)) return { ok: false, text: normalized };
  const englishWords = normalized.match(/[A-Za-z]{3,}/g) ?? [];
  if (englishWords.length > 10) return { ok: false, text: normalized };

  return { ok: true, text: normalized };
}
