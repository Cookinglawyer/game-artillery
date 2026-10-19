// sig[0]: 기본 무장(무제한), sig[1]: 특기(쓰고 나면 cd턴 동안 대기)
// move: 연료 효율 배수, armor: 받는 피해 감소율
export const TANKS = {
  cannon:  { name: '캐논', role: '균형형', desc: '무난한 체력과 기동력.', hp: 100, move: 1, armor: 0, sig: ['shell', 'heavy'], cd: 2 },
  missile: { name: '미사일', role: '저격형', desc: '바람을 덜 타는 미사일. 몸은 약하지만 빠릅니다.', hp: 88, move: 1.35, armor: 0, sig: ['missile', 'triple'], cd: 2 },
  drill:   { name: '드릴', role: '돌격형', desc: '두꺼운 장갑. 굴착탄으로 숨은 적을 노립니다.', hp: 120, move: .7, armor: .1, sig: ['drill', 'cluster'], cd: 3 },
  bouncer: { name: '바운서', role: '교란형', desc: '튕기는 포탄과 흙폭탄으로 지형을 바꿉니다.', hp: 105, move: 1, armor: .05, sig: ['bounce', 'dirt'], cd: 1 },
};
export const TANK_ORDER = Object.keys(TANKS);
