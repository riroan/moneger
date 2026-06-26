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

---

## 증권 연동: AES 마스터 키 회전 자동화 (P3)

**What:** `BROKERAGE_ENC_KEY` 회전(교체) 시 기존 자격증명 재암호화 경로.
**Why:** 현재 설계는 단일 마스터 키. 키를 바꾸면 기존 `BrokerageConnection` 자격증명이 전부 복호 불가. 키 유출/주기적 회전 대응이 없음.
**현재 상태:** PR1a에서 `BrokerageConnection.keyVersion` 컬럼만 미리 둠(기본 1). 회전 로직은 미구현.
**Implementation (나중):**
1. env에 `BROKERAGE_ENC_KEY_V2` 추가, 복호화는 `keyVersion`으로 old/new 키 선택.
2. 마이그레이션 스크립트: 모든 connection을 old 키로 복호 → new 키로 재암호화 → `keyVersion` 증가.
3. 신규 저장은 항상 최신 키.
**Depends on:** 증권 연동 PR1a(`BrokerageConnection` + `keyVersion` 컬럼) 선행.
**Source:** /plan-eng-review 2026-06-24 (codex outside voice).

---

## 투자 이중계상: 과거 월 스냅샷 백필 (P3)

**What:** 증권 연동 시점 ~ 저축↔계좌 링크 기능 적용 전 사이에 cron이 freeze한 `MonthlyAssetSnapshot` 월이 있으면, 그 월들은 링크 제외 로직 이전 값이라 이중계상이 남아 있음. 해당 월만 재계산.
**Why:** /assets 추세 그래프 연속성. 링크 적용 후 현재 월만 실시간 재계산되므로 과거 freeze 월은 자동 보정 안 됨.
**현재 상태:** 미구현. **연동(2026-06-24)과 링크 적용이 같은 6월(현재 월=항상 실시간)이면 영향 freeze 월은 0개**일 가능성 큼.
**Implementation (나중):**
1. 배포 후 확인: `MonthlyAssetSnapshot` 중 `month >= 증권 첫 스냅샷 월` AND freeze된 행이 있는지 1줄 쿼리.
2. 있으면 그 월들에 `upsertMonthlyAssetSnapshot(userId, monthKey)` 재실행(링크 제외 반영).
3. 없으면 이 TODO 닫음.
**Depends on:** 투자 이중계상 링크 기능 머지 후.
**Source:** /plan-eng-review 2026-06-27 (codex outside voice — frozen-month 지적).
