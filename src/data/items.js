// 전투 중 자기 턴에 하나만 쓸 수 있다. 사용해도 턴은 넘어가지 않는다.
export const ITEMS = {
  repair: { name: '수리 키트', short: '수리', desc: '체력을 35 회복합니다.', price: 120 },
  shield: { name: '방어막', short: '방어막', desc: '다음에 받는 피해를 절반으로 줄입니다.', price: 110 },
  fuel:   { name: '연료통', short: '연료', desc: '이번 턴 이동 연료를 100 더 채웁니다.', price: 60 },
};
export const ITEM_ORDER = Object.keys(ITEMS);
