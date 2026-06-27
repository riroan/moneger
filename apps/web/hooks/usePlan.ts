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

// 유저의 요금제(만료 반영)와 사용 가능 기능을 가져온다.
export function usePlan(userId: string | null): UsePlanResult {
  const [fetched, setFetched] = useState<FetchedPlan | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    fetch(`/api/user/entitlements?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setFetched({ userId, plan: data.data.plan, features: data.data.features });
        } else {
          setFetched({ userId, plan: null, features: [] });
        }
      })
      .catch(() => {
        if (!cancelled) setFetched({ userId, plan: null, features: [] });
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
