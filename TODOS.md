# TODOS

## Phase 2: 알림 시스템 (Notification Infrastructure)

**What:** Web Push 기반 알림 시스템 구현
**Why:** 인사이트 엔진(Phase 1)이 완성되면, 알림이 없으면 사용자가 직접 앱을 열어야만 인사이트를 확인할 수 있습니다. 알림이 인사이트를 살아있게 만듭니다.
**Design doc:** `~/.gstack/projects/riroan-moneger/riroan-main-design-20260412-224908.md`

**Key decisions to make before starting:**
- VAPID 키 생성 (`npx web-push generate-vapid-keys`) → `.env`에 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` 추가
- `PushSubscription` Prisma 모델 추가 (userId, endpoint, p256dh, auth, createdAt)
- iOS <17 대응: in-app 배너 fallback 구현 여부

**Implementation steps:**
1. `apps/web/public/sw.js` — Service Worker (push event + notificationclick)
2. `apps/web/prisma/schema.prisma` — PushSubscription model
3. `apps/web/app/api/notifications/subscribe/route.ts` — POST subscription save
4. `apps/web/app/api/notifications/send/route.ts` — POST VAPID send (called by cron)
5. `apps/web/app/api/cron/notifications/route.ts` — weekly summary + recurring reminders
6. Modify `apps/web/app/api/transactions/route.ts` POST handler — budget alert trigger
7. Notification settings UI (opt-in per notification type)

**Deep-link URL structure (from design):**
- `/analytics?type=budget_alert&categoryId={id}&month={YYYY-MM}`
- `/analytics?type=weekly_summary&week={YYYY-Www}`
- `/recurring?highlight={id}` (fixed expense reminder)

**Cron schedule (Asia/Seoul):**
- Weekly summary: Sunday 20:00 KST
- Recurring reminders: daily 09:00 KST (3-day-ahead check)

**Depends on:** Phase 1 (Insights Engine) — budget alert needs `/api/insights` to be live
