import type { Plan } from '@prisma/client';

// 요금제별 사용 가능 기능. 결제 본체는 아직 없고, plan은 DB에서 직접 부여한다.
// 결제 도입 시 feature/plan만 늘리면 게이트 로직(hasFeature)은 그대로 동작한다.
export type Feature = 'AI_SUMMARY';

// 모든 기능 목록. ULTIMATE(개인 최상위 등급)은 항상 전체 기능을 가진다.
const ALL_FEATURES: Feature[] = ['AI_SUMMARY'];

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  FREE: [],
  PRO: ['AI_SUMMARY'],
  ULTIMATE: ALL_FEATURES,
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
