// 전투 중 자기 턴에 하나만 쓸 수 있다. 사용해도 턴은 넘어가지 않는다.
export const ITEMS = {
  repair: { name: '수리 키트', short: '수리', desc: '체력을 35 회복합니다.', price: 15 },
  fuel:   { name: '연료통', short: '연료', desc: '이번 턴 이동 연료를 100 더 채웁니다.', price: 8 },
};
export const ITEM_ORDER = Object.keys(ITEMS);

// 방어막: 상점에서 사 두면 다음 라운드 시작 때 탱크 둘레에 원으로 생긴다.
// hp만큼 피해를 먼저 막아 준다(체력에 더해지는 셈). 단계가 높을수록 두껍고 단단하다.
export const SHIELDS = [
  null,
  { name: '방어막 1단계', hp: 30, price: 15, color: '#66d9e8', width: 3 },
  { name: '방어막 2단계', hp: 60, price: 35, color: '#4dabf7', width: 5.5 },
  { name: '방어막 3단계', hp: 100, price: 60, color: '#b197fc', width: 8 },
];
