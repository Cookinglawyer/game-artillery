import { MAX_LEVEL } from '../config.js';

// 무기는 '부품'의 묶음이다. 조합 무기는 두 무기의 부품을 합친 것이다.
//   bomblets(+radial)  꼭대기에서 갈라짐(부채꼴 / 사방)
//   burst              떨어진 자리에서 작은 탄이 위로 튀어 오름
//   homing / drone     가까운 적을 쫓아감 / 거의 수평으로 날다 돌진
//   hops               터진 뒤 아무 방향으로 다시 튀어 나가 또 터짐(벙커버스터)
//   bounces / drill    지형에 튕김 / 땅을 파고 들어감
//   windK/gravK/speedK 탄도 보정
//   knock / heal / teleport / dirt   날려버림 / 회복 / 순간이동 / 흙 쌓기
// prefix: 조합에서 보조 재료가 되었을 때 이름 앞에 붙는 말
// price/pack: 상점에서 한 번 살 때 가격과 발 수. 재미로 하는 게임이라 싸게.
export const WEAPONS = {
  shell:    { name: '기본탄', prefix: '개량', desc: '평범하지만 폭발은 큼직한 기본 포탄.', r: 50, dmg: 34, price: 5, pack: 10 },
  split3:   { name: '3분할탄', prefix: '3분할', desc: '꼭대기에서 세 갈래로 갈라집니다.', r: 36, dmg: 24, price: 10, pack: 3, bomblets: 3 },
  split5:   { name: '5분할탄', prefix: '5분할', desc: '꼭대기에서 다섯 갈래로 쫙 퍼집니다.', r: 30, dmg: 18, price: 15, pack: 3, bomblets: 5 },
  homing:   { name: '유도탄', prefix: '유도', desc: '꼭대기를 지나면 가장 가까운 적을 쫓아갑니다.', r: 40, dmg: 30, price: 15, pack: 2, homing: 2.6 },
  drone:    { name: '자폭 드론', prefix: '드론', desc: '윙윙 거의 수평으로 날다가 가까운 적에게 돌진합니다.', r: 44, dmg: 36, price: 20, pack: 2, drone: true, homing: 3.2, gravK: 0, windK: .15, speedK: .55 },
  bunker:   { name: '벙커버스터', prefix: '벙커', desc: '터진 뒤 아무 방향으로 다시 튀어 나가 모두 세 번 폭발합니다.', r: 38, dmg: 26, price: 18, pack: 2, hops: 2 },
  babynuke: { name: '베이비 누크', prefix: '미니핵', desc: '화면 5분의 1을 날려버리는 귀여운 핵.', r: 96, dmg: 55, price: 30, pack: 1 },
  nuke:     { name: '누크', prefix: '핵', desc: '화면 3분의 1이 사라집니다. 쏜 사람도 조심.', r: 160, dmg: 85, price: 60, pack: 1 },
  laser:    { name: '직사 레이저', prefix: '레이저', desc: '중력도 바람도 무시하고 눈 깜짝할 새 똑바로 날아갑니다.', r: 30, dmg: 30, price: 12, pack: 3, gravK: 0, windK: 0, speedK: 2.4 },
  banana:   { name: '바나나 폭탄', prefix: '바나나', desc: '한 번 통 튀었다가 바나나 다섯 개로 흩어집니다.', r: 34, dmg: 22, price: 15, pack: 2, bounces: 1, burst: 5 },
  melon:    { name: '수박 폭탄', prefix: '수박', desc: '떨어진 자리에서 수박씨가 사방으로 튑니다.', r: 40, dmg: 24, price: 12, pack: 2, burst: 7 },
  bouncy:   { name: '통통볼', prefix: '통통', desc: '통! 통! 네 번 튀고 나서야 터집니다.', r: 42, dmg: 30, price: 8, pack: 3, bounces: 4 },
  mole:     { name: '두더지탄', prefix: '두더지', desc: '땅속을 파고 들어가 숨은 적 밑에서 터집니다.', r: 40, dmg: 30, price: 10, pack: 3, drill: 150 },
  firework: { name: '폭죽탄', prefix: '폭죽', desc: '꼭대기에서 펑! 불꽃 여덟 개가 사방으로 흩어집니다.', r: 26, dmg: 14, price: 12, pack: 2, bomblets: 8, radial: true },
  punch:    { name: '펀치 글러브', prefix: '펀치', desc: '피해는 적지만 맞은 탱크를 멀리 날려버립니다.', r: 40, dmg: 10, price: 10, pack: 2, knock: 130 },
  teleport: { name: '순간이동탄', prefix: '순간이동', desc: '떨어진 자리로 내 탱크가 순간이동합니다.', r: 0, dmg: 0, price: 8, pack: 2, teleport: true },
  heal:     { name: '회복 꽃다발', prefix: '꽃다발', desc: '떨어진 자리 근처 탱크를 모두 고쳐 줍니다. 적도요.', r: 60, dmg: 0, heal: 35, price: 12, pack: 2 },
  dirt:     { name: '흙더미탄', prefix: '흙', desc: '흙을 와르르 쏟아 벽을 쌓거나 적을 파묻습니다.', r: 56, dmg: 0, price: 6, pack: 3, dirt: true },
};
export const BASE_ORDER = Object.keys(WEAPONS);
export const BASIC = 'shell'; // 모두가 무제한으로 가진 기본 무기

export const comboId = (a, b) => [a, b].sort().join('+');
export const isCombo = id => id.includes('+');

function levelStats(id, level) {
  const b = WEAPONS[id], up = k => 1 + k * level, plus = (v, at) => (v ? v + (level >= at ? 1 : 0) : 0);
  return {
    ...b, id, level,
    dmg: Math.round(b.dmg * up(.12)),
    r: Math.round(b.r * up(.08)),
    drill: b.drill ? Math.round(b.drill * up(.2)) : 0,
    bomblets: b.bomblets ? plus(plus(b.bomblets, 2), 3) : 0,
    burst: b.burst ? plus(plus(b.burst, 2), 3) : 0,
    bounces: plus(b.bounces || 0, 3),
    hops: plus(b.hops || 0, 3),
    homing: b.homing ? b.homing * up(.15) : 0,
    knock: b.knock ? Math.round(b.knock * up(.15)) : 0,
    heal: b.heal ? Math.round(b.heal * up(.15)) : 0,
  };
}

// 폭발력이 큰 쪽이 주 탄두, 다른 쪽은 부품만 보탠다.
const weight = w => (w.dmg ? w.dmg * w.r : w.heal ? w.heal * w.r : w.dirt ? w.r * 10 : 0);
function merge(A, B) {
  const [main, mod] = weight(A) >= weight(B) ? [A, B] : [B, A];
  const max = k => Math.max(A[k] || 0, B[k] || 0), any = k => !!(A[k] || B[k]);
  const s = {
    name: `${mod.prefix} ${main.name}`,
    desc: `${A.name} + ${B.name}`,
    dmg: Math.round(main.dmg + mod.dmg * .25),
    r: Math.round(main.r + mod.r * .15),
    windK: Math.min(A.windK ?? 1, B.windK ?? 1),
    gravK: Math.min(A.gravK ?? 1, B.gravK ?? 1),
    speedK: A.drone || B.drone ? Math.min(A.speedK || 1, B.speedK || 1) : Math.max(A.speedK || 1, B.speedK || 1),
    bomblets: max('bomblets'), radial: any('radial'), burst: max('burst'), homing: max('homing'), drone: any('drone'),
    hops: max('hops'), bounces: max('bounces'), drill: max('drill'), knock: max('knock'), heal: max('heal'),
    teleport: any('teleport'), dirt: any('dirt'),
    price: Math.max(5, Math.round((A.price + B.price) * .8)),
    pack: Math.max(1, Math.min(A.pack, B.pack)),
    combo: true, parts: [A.id, B.id],
  };
  // 큰 탄두를 여러 개로 늘리면 한 발의 위력은 줄어든다
  if ((s.bomblets && !main.bomblets) || (s.burst && !main.burst)) { s.dmg = Math.round(s.dmg * .55); s.r = Math.round(s.r * .7); }
  return s;
}

// 플레이어의 강화 상태(upgrades)를 반영한 실제 성능. 조합 무기는 재료의 강화 단계를 그대로 물려받는다.
export function weaponStats(id, upgrades = {}) {
  if (isCombo(id)) {
    const [a, b] = id.split('+');
    return { ...merge(levelStats(a, upgrades[a] || 0), levelStats(b, upgrades[b] || 0)), id, level: 0 };
  }
  return levelStats(id, upgrades[id] || 0);
}

export const upgradeCost = (id, level) => Math.round(10 + WEAPONS[id].price * .6 * (level + 1));

export function upgradeNote(id, nextLevel) {
  if (nextLevel > MAX_LEVEL) return '';
  const w = WEAPONS[id], n = [];
  if (w.dmg) n.push('피해 +12%');
  if (w.r) n.push('반경 +8%');
  if (w.heal) n.push('회복 +15%');
  if (w.knock) n.push('밀어내기 +15%');
  if (w.homing) n.push('추적력 +15%');
  if (w.drill) n.push('관통 +20%');
  if ((w.bomblets || w.burst) && nextLevel >= 2) n.push('조각 +1');
  if ((w.bounces || w.hops) && nextLevel === 3) n.push(w.hops ? '폭발 +1' : '튕김 +1');
  return n.join(' · ') || '성능 향상 없음';
}

export function statBits(s) {
  const bits = [];
  if (s.dmg) bits.push(`피해 ${s.dmg}`);
  if (s.heal) bits.push(`회복 ${s.heal}`);
  if (s.r) bits.push(`반경 ${s.r}`);
  if (s.bomblets) bits.push(`${s.radial ? '불꽃' : '갈래'} ${s.bomblets}`);
  if (s.burst) bits.push(`조각 ${s.burst}`);
  if (s.hops) bits.push(`폭발 ${s.hops + 1}번`);
  if (s.bounces) bits.push(`튕김 ${s.bounces}`);
  if (s.drill) bits.push(`관통 ${s.drill}`);
  if (s.homing) bits.push(s.drone ? '돌진' : '추적');
  if (s.knock) bits.push(`밀어내기 ${s.knock}`);
  if (s.teleport) bits.push('순간이동');
  if (s.dirt) bits.push('흙 쌓기');
  if ((s.windK ?? 1) < .5) bits.push('바람 무시');
  return bits;
}
