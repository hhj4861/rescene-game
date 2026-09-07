// 스펙 §4: 데미지 = atk × 배율. 방어·치명타·행운·레벨은 없다(v0.1의 Stats 기반 계산에서 단순화).
export function damage(atk: number, multiplier: number): number {
  return Math.max(1, Math.round(atk * multiplier));
}
