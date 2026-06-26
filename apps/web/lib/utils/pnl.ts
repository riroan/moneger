import { formatCurrency } from '@moneger/shared';

// 평가손익 표시 컨벤션 (한국 증시 관습): 수익(>0)=빨강(coral)▲, 손실(<0)=파랑(blue)▼, 0=중립·.
// 색만으로 의미를 전달하지 않도록 마크(▲/▼)와 부호(+/-)를 항상 병행한다(a11y).
// InvestmentsTab·SavingsTab 등 평가손익을 표시하는 모든 곳에서 공용으로 쓴다.

export function pnlClass(v: number): string {
  return v > 0 ? 'text-accent-coral' : v < 0 ? 'text-accent-blue' : 'text-text-muted';
}

export function pnlMark(v: number): string {
  return v > 0 ? '▲' : v < 0 ? '▼' : '·';
}

export function signedCurrency(v: number): string {
  const s = formatCurrency(Math.abs(v));
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
}

export function signedPercent(rate: number): string {
  const pct = rate * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
