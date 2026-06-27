import { effectivePlan, planFeatures, hasFeature } from '../entitlements';

describe('entitlements', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  it('FREE는 AI_SUMMARY가 없다', () => {
    const u = { plan: 'FREE' as const, planExpiresAt: null };
    expect(effectivePlan(u)).toBe('FREE');
    expect(planFeatures(u)).toEqual([]);
    expect(hasFeature(u, 'AI_SUMMARY')).toBe(false);
  });

  it('PRO(무기한)는 AI_SUMMARY가 있다', () => {
    const u = { plan: 'PRO' as const, planExpiresAt: null };
    expect(effectivePlan(u)).toBe('PRO');
    expect(hasFeature(u, 'AI_SUMMARY')).toBe(true);
  });

  it('PRO(미래 만료)는 AI_SUMMARY가 있다', () => {
    const u = { plan: 'PRO' as const, planExpiresAt: future };
    expect(effectivePlan(u)).toBe('PRO');
    expect(hasFeature(u, 'AI_SUMMARY')).toBe(true);
  });

  it('만료된 PRO는 FREE로 취급한다', () => {
    const u = { plan: 'PRO' as const, planExpiresAt: past };
    expect(effectivePlan(u)).toBe('FREE');
    expect(planFeatures(u)).toEqual([]);
    expect(hasFeature(u, 'AI_SUMMARY')).toBe(false);
  });

  it('ULTIMATE는 모든 기능을 가진다', () => {
    const u = { plan: 'ULTIMATE' as const, planExpiresAt: null };
    expect(effectivePlan(u)).toBe('ULTIMATE');
    expect(hasFeature(u, 'AI_SUMMARY')).toBe(true);
  });

  it('ULTIMATE는 planExpiresAt가 지나도 만료되지 않는다', () => {
    const u = { plan: 'ULTIMATE' as const, planExpiresAt: past };
    expect(effectivePlan(u)).toBe('ULTIMATE');
    expect(hasFeature(u, 'AI_SUMMARY')).toBe(true);
  });
});
