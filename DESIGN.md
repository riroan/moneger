# Design System — Moneger

## Product Context

- **What this is:** 개인 가계부 앱. 수입/지출/저축을 기록하고, 월별 트렌드와 카테고리별 예산을 한눈에 파악한다.
- **Who it's for:** 본인의 재정 흐름을 직접 관리하는 개인 사용자 (한국어 우선)
- **Space/industry:** Personal finance / budgeting. 경쟁 제품: 뱅크샐러드, 토스 가계부, Notion finance templates
- **Project type:** Web app (dashboard + sub-pages)

---

## Aesthetic Direction

- **Direction:** Industrial/Utilitarian with ambient depth
- **Decoration level:** Intentional — noise overlay + gradient orbs로 공간감을 만들되, 컴포넌트는 클린하게 유지
- **Mood:** 어두운 배경에 부드러운 발광 효과. 숫자가 주인공이고 UI는 조용히 물러난다. 열면 차분하고 집중된 느낌.
- **Dark-first:** 기본값은 다크 모드. 라이트 모드도 지원하지만 다크가 주인공.

---

## Typography

- **Body/UI:** `Noto Sans KR` — 한국어 우선 앱이라 필수. weights 300/400/500/600/700 모두 로드.
- **Mono/Data:** `Space Mono` — 금액 표시 전용. tabular-nums 적용, 숫자 폭이 고정돼 금액이 정렬되어 보임.
- **UI/Labels:** Noto Sans KR (body와 동일)
- **Code:** Space Mono
- **Loading:** Next.js `next/font/google` — `--font-noto-sans-kr`, `--font-space-mono` CSS 변수로 주입
- **Scale:**
  - xs: 10px / text-[10px]
  - sm: 12px / text-xs
  - base: 13–14px / text-sm
  - md: 15–16px / text-base
  - lg: 18px / text-lg
  - xl: 20–24px / text-xl~2xl

---

## Color

- **Approach:** Balanced — 5개의 named accent + 시맨틱 역할 분리

### Dark Mode (default)

| Token | Hex | 역할 |
|-------|-----|------|
| `--bg-primary` | `#0a0a0f` | 페이지 배경 |
| `--bg-secondary` | `#12121a` | 입력 필드, 보조 배경 |
| `--bg-card` | `#1a1a24` | 카드 배경 |
| `--bg-card-hover` | `#22222e` | 카드 hover |
| `--accent-mint` | `#4ade80` | 수입, 긍정, 성공 |
| `--accent-coral` | `#ff6b6b` | 지출, 경고, 삭제 |
| `--accent-blue` | `#60a5fa` | 저축, 정보, 링크 |
| `--accent-purple` | `#a78bfa` | 분석, 순저축 라인 |
| `--accent-yellow` | `#fbbf24` | 예산 경고 (66–90%) |
| `--text-primary` | `#f8fafc` | 주요 텍스트 |
| `--text-secondary` | `#cbd5e1` | 보조 텍스트 |
| `--text-muted` | `#94a3b8` | 레이블, 힌트 |
| `--border` | `rgba(255,255,255,0.06)` | 카드 테두리 |

### Light Mode

| Token | Hex | 변경점 |
|-------|-----|--------|
| `--bg-primary` | `#e2e8f0` | 따뜻한 슬레이트 배경 |
| `--bg-card` | `#ffffff` | 카드는 흰색 |
| `--accent-mint` | `#22c55e` | 채도 낮춤 |
| `--accent-coral` | `#ef4444` | 채도 낮춤 |
| `--accent-blue` | `#3b82f6` | 채도 낮춤 |
| `--accent-purple` | `#8b5cf6` | 채도 낮춤 |
| `--border` | `rgba(0,0,0,0.08)` | |

### 시맨틱 색상 규칙

- 수입/긍정: `accent-mint`
- 지출/부정: `accent-coral`
- 저축/정보: `accent-blue`
- 분석/트렌드: `accent-purple`
- 예산 경고 (66–90%): `accent-yellow`
- 예산 위험 (90%+): `accent-coral`

---

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** `p-1`(4px) `p-2`(8px) `p-3`(12px) `p-4`(16px) `p-6`(24px) `p-8`(32px)
- **Card padding:** `p-4` (16px)
- **Section gap:** `gap-4` (16px)

---

## Layout

- **Approach:** Grid-disciplined
- **Max content width:** `max-w-[1400px]` with `mx-auto p-4`
- **Desktop grid:** `lg:grid-cols-[330px_1fr_380px]` (대시보드 3-column)
- **Mobile:** 단일 컬럼, 순서는 `order-N`으로 제어
- **Border radius:**
  - 작은 요소 (뱃지, 버튼): `rounded-lg` (8px)
  - 카드: `rounded-[16px] sm:rounded-[20px]`
  - 풀 라운드: `rounded-full`
- **Ambient effects:**
  - `.noise-overlay` — 전체 화면 SVG noise texture, opacity 3%
  - `.gradient-orb` — 600px blur 원형 그라디언트 2개, 배경에 고정

---

## Motion

- **Approach:** Intentional — 의미 있는 전환만. 숫자가 핵심이라 화려한 애니메이션은 없다.
- **Theme transition:** `background-color 0.3s ease`, `color 0.2s ease`
- **Page entry:** `animate-[fadeIn_0.5s_ease-out]`, `animate-[fadeIn_0.6s_ease-out_0.3s_backwards]`
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`
- **Duration:** micro 50–100ms / short 150–250ms / medium 300ms / long 500ms

---

## Component Patterns

### Cards
```
bg-bg-card border border-[var(--border)] rounded-[16px] sm:rounded-[20px] p-4
```

### Muted action buttons
```
text-xs text-text-muted hover:text-text-secondary bg-bg-secondary hover:bg-bg-card-hover rounded-lg transition-colors py-1.5 px-2.5
```

### Section headings
```
text-base sm:text-lg font-semibold flex items-center gap-2
```

### Active badge (선택 상태)
```
bg-accent-blue/20 text-accent-blue font-medium rounded-lg px-2.5 py-1
```

### 월별 변화 뱃지
- 신규: `bg-blue-500/15 text-blue-400`
- 증가 ≥ 3%: `bg-red-500/15 text-red-400` + `%↗`
- 감소 ≤ -3%: `bg-emerald-500/15 text-emerald-400` + `%↘`
- 변화 없음: `text-text-muted` + `→`

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-11 | Dark-first, near-black background | 숫자 대시보드는 다크 배경이 눈의 피로를 줄이고 수치를 더 선명하게 만든다 |
| 2026-04-11 | Noto Sans KR as primary font | 한국어 우선 앱. 시스템 폰트는 일관성이 없다. |
| 2026-04-11 | Space Mono for currency display | tabular-nums 필수. 금액 컬럼이 정렬되어야 스캔하기 쉽다. |
| 2026-04-11 | 5-accent color system (mint/coral/blue/purple/yellow) | 수입/지출/저축/분석/경고를 색으로 즉시 구분. 혼동 없이 의미를 전달한다. |
| 2026-04-11 | Gradient orbs + noise overlay | 완전한 플랫 배경은 단조롭다. 저비용으로 공간감을 만드는 방법. |
| 2026-04-11 | DESIGN.md created | /design-consultation 기반, 기존 코드베이스에서 추출 |
| 2026-04-12 | 입력 필드(input/select/textarea)만 text-base(16px) 예외 적용 | iOS Safari는 font-size < 16px 입력 필드 탭 시 페이지 자동 zoom. 일반 UI 텍스트는 text-sm 유지. |
| 2026-04-12 | 차트 YAxis tick font-size 최솟값 12px 적용 | DESIGN.md xs 최솟값(12px) 준수. recharts tick={{ fontSize: 11 }} → {{ fontSize: 12 }}. |
