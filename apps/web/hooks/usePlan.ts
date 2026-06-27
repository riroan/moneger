import { useState, useEffect } from 'react';
import type { Plan } from '@prisma/client';
import type { Feature } from '@/lib/entitlements';

interface UsePlanResult {
  plan: Plan | null;
  features: Feature[];
  isLoading: boolean;
}

interface FetchedPlan {
  userId: string;
  plan: Plan | null;
  features: Feature[];
}

const planCache = new Map<string, FetchedPlan>();
const inflightPlanRequests = new Map<string, Promise<FetchedPlan>>();

async function fetchPlan(userId: string): Promise<FetchedPlan> {
  const cached = planCache.get(userId);
  if (cached) return cached;

  const inflight = inflightPlanRequests.get(userId);
  if (inflight) return inflight;

  const request = fetch(`/api/user/entitlements?userId=${userId}`)
    .then((res) => res.json())
    .then((data) => {
      const fetched: FetchedPlan = data.success
        ? { userId, plan: data.data.plan, features: data.data.features }
        : { userId, plan: null, features: [] };
      planCache.set(userId, fetched);
      return fetched;
    })
    .catch(() => {
      const fallback: FetchedPlan = { userId, plan: null, features: [] };
      planCache.set(userId, fallback);
      return fallback;
    })
    .finally(() => {
      inflightPlanRequests.delete(userId);
    });

  inflightPlanRequests.set(userId, request);
  return request;
}

export function invalidatePlanCache(userId?: string) {
  if (userId) {
    planCache.delete(userId);
    inflightPlanRequests.delete(userId);
    return;
  }
  planCache.clear();
  inflightPlanRequests.clear();
}

// 유저의 요금제(만료 반영)와 사용 가능 기능을 가져온다.
export function usePlan(userId: string | null): UsePlanResult {
  const [fetched, setFetched] = useState<FetchedPlan | null>(() => (userId ? planCache.get(userId) ?? null : null));

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    fetchPlan(userId).then((planData) => {
      if (!cancelled) setFetched(planData);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 로딩 상태는 state가 아닌 파생값으로 계산한다(effect 내 동기 setState 회피).
  if (!userId) {
    return { plan: null, features: [], isLoading: false };
  }
  if (fetched && fetched.userId === userId) {
    return { plan: fetched.plan, features: fetched.features, isLoading: false };
  }
  return { plan: null, features: [], isLoading: true };
}
