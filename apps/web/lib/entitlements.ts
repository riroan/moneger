import type { Plan } from '@prisma/client';

// 요금제별 사용 가능 기능. 결제 본체는 아직 없고, plan은 DB에서 직접 부여한다.
// 결제 도입 시 feature/plan만 늘리면 게이트 로직(hasFeature)은 그대로 동작한다.
export type Feature =
  | 'AI_SUMMARY'
  | 'RECURRING' // 고정비
  | 'SAVINGS' // 저축
  | 'GROUPS' // 그룹
  | 'ASSETS' // 자산 현황
  | 'ANALYTICS' // 소비 분석
  | 'BROKERAGE'; // 증권 자산

// PRO 기능: 자산 현황(ASSETS)·증권(BROKERAGE)·AI 자산 분석(AI_SUMMARY)을 제외한 기능.
const PRO_FEATURES: Feature[] = ['RECURRING', 'SAVINGS', 'GROUPS', 'ANALYTICS'];

// 모든 기능. ULTIMATE 전용: 자산 현황(ASSETS), 증권 자산(BROKERAGE), AI 자산 분석(AI_SUMMARY).
const ALL_FEATURES: Feature[] = [...PRO_FEATURES, 'ASSETS', 'BROKERAGE', 'AI_SUMMARY'];

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  FREE: [],
  PRO: PRO_FEATURES,
  ULTIMATE: ALL_FEATURES,
};

// 잠금 화면/내비 안내용 메타데이터.
export const FEATURE_LABELS: Record<Feature, string> = {
  AI_SUMMARY: 'AI 자산 분석',
  RECURRING: '고정비',
  SAVINGS: '저축',
  GROUPS: '그룹',
  ASSETS: '자산 현황',
  ANALYTICS: '소비 분석',
  BROKERAGE: '증권 자산',
};

// 기능을 처음 사용할 수 있는 요금제(업그레이드 안내용).
export const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  AI_SUMMARY: 'ULTIMATE',
  RECURRING: 'PRO',
  SAVINGS: 'PRO',
  GROUPS: 'PRO',
  ASSETS: 'ULTIMATE',
  ANALYTICS: 'PRO',
  BROKERAGE: 'ULTIMATE',
};

type PlanFields = { plan: Plan; planExpiresAt: Date | null };

// 만료된 PRO는 FREE로 취급한다(planExpiresAt가 지난 경우).
export function effectivePlan(user: PlanFields): Plan {
  if (user.plan === 'PRO' && user.planExpiresAt && user.planExpiresAt.getTime() < Date.now()) {
    return 'FREE';
  }
  return user.plan;
}

export function planFeatures(user: PlanFields): Feature[] {
  return PLAN_FEATURES[effectivePlan(user)];
}

export function hasFeature(user: PlanFields, feature: Feature): boolean {
  return planFeatures(user).includes(feature);
}
