import { MAX_LEVEL } from '../config.js';

// 무기는 '부품'의 묶음이다. 조합 무기는 두 무기의 부품을 합친 것이다.
//   count/spread       한 번에 여러 발을 부채꼴로
//   windK/gravK/speedK 탄도 보정(바람·중력 영향, 속도)
//   bomblets           최고점에서 자탄으로 분열(자탄은 나머지 부품을 물려받음)
//   bounces            지형에 튕김
//   drill              지형을 뚫고 들어간 뒤 폭발
//   dirt               구덩이 대신 흙을 쌓음
// prefix: 조합에서 보조 재료가 되었을 때 이름 앞에 붙는 말
// price/pack: 상점에서 한 번 살 때 가격과 발 수. 탱크 종류와 상관없이 누구나 살 수 있다.
export const WEAPONS = {
  shell:   { name: '기본탄', prefix: '개량', desc: '가장 기본적인 포탄.', r: 26, dmg: 40, price: 40, pack: 5 },
  heavy:   { name: '대형탄', prefix: '대형', desc: '폭발 반경이 큰 묵직한 포탄.', r: 48, dmg: 58, price: 120, pack: 2 },
  missile: { name: '미사일', prefix: '유도', desc: '빠르고 곧게 날아가 바람을 덜 탑니다.', r: 22, dmg: 38, price: 90, pack: 3, windK: .25, gravK: .65, speedK: 1.1 },
  triple:  { name: '3연발', prefix: '삼중', desc: '세 발을 부채꼴로 발사합니다.', r: 20, dmg: 24, price: 100, pack: 3, count: 3, spread: 5 },
  scatter: { name: '산탄', prefix: '산개', desc: '다섯 발을 넓게 흩뿌립니다.', r: 16, dmg: 18, price: 130, pack: 2, count: 5, spread: 4 },
  cluster: { name: '집속탄', prefix: '집속', desc: '최고점에서 자탄으로 갈라집니다.', r: 18, dmg: 20, price: 170, pack: 2, bomblets: 5 },
  bounce:  { name: '바운스탄', prefix: '튕기는', desc: '땅에 튕긴 뒤 터집니다. 엄폐물 뒤를 노릴 때.', r: 26, dmg: 38, price: 100, pack: 3, bounces: 2 },
  drill:   { name: '굴착탄', prefix: '관통', desc: '땅을 뚫고 들어가 깊은 곳에서 터집니다.', r: 22, dmg: 34, price: 110, pack: 2, drill: 130 },
  dirt:    { name: '흙폭탄', prefix: '흙', desc: '흙더미를 쏟아 상대를 파묻거나 벽을 세웁니다.', r: 44, dmg: 0, price: 80, pack: 2, dirt: true },
  nuke:    { name: '핵탄두', prefix: '핵', desc: '전장을 도려내는 초대형 폭발.', r: 85, dmg: 90, price: 420, pack: 1 },
};
export const BASE_ORDER = Object.keys(WEAPONS);

export const comboId = (a, b) => [a, b].sort().join('+');
export const isCombo = id => id.includes('+');

function levelStats(id, level) {
  const b = WEAPONS[id];
  return {
    ...b, id, level,
    dmg: Math.round(b.dmg * (1 + .12 * level)),
    r: Math.round(b.r * (1 + .08 * level)),
    drill: b.drill ? Math.round(b.drill * (1 + .2 * level)) : 0,
    bomblets: b.bomblets ? b.bomblets + (level >= 2 ? 1 : 0) + (level >= 3 ? 1 : 0) : 0,
    bounces: b.bounces ? b.bounces + (level >= 3 ? 1 : 0) : 0,
  };
}

// 폭발력이 큰 쪽이 주 탄두, 다른 쪽은 부품만 보탠다.
const weight = w => (w.dirt && !w.dmg ? w.r * 10 : w.dmg * w.r);
function merge(A, B) {
  const [main, mod] = weight(A) >= weight(B) ? [A, B] : [B, A];
  const s = {
    name: `${mod.prefix} ${main.name}`,
    desc: `${A.name} + ${B.name}`,
    dmg: Math.round(main.dmg + mod.dmg * .25),
    r: Math.round(main.r + mod.r * .15),
    count: Math.max(A.count || 1, B.count || 1),
    spread: Math.max(A.spread || 0, B.spread || 0),
    windK: Math.min(A.windK ?? 1, B.windK ?? 1),
    gravK: Math.min(A.gravK ?? 1, B.gravK ?? 1),
    speedK: Math.max(A.speedK || 1, B.speedK || 1),
    bomblets: Math.max(A.bomblets || 0, B.bomblets || 0),
    bounces: Math.max(A.bounces || 0, B.bounces || 0),
    drill: Math.max(A.drill || 0, B.drill || 0),
    dirt: !!(A.dirt || B.dirt),
    price: Math.round((A.price + B.price) * .85 / 10) * 10,
    pack: Math.max(1, Math.min(A.pack, B.pack)),
    combo: true, parts: [A.id, B.id],
  };
  // 큰 탄두를 여러 개로 늘리면 한 발의 위력은 줄어든다
  if (s.count > 1 && (main.count || 1) === 1) { s.dmg = Math.round(s.dmg * .55); s.r = Math.round(s.r * .7); }
  if (s.bomblets && !main.bomblets) { s.dmg = Math.round(s.dmg * .55); s.r = Math.round(s.r * .7); }
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

export const upgradeCost = (id, level) => Math.round(80 + WEAPONS[id].price * .8 * (level + 1));

export function upgradeNote(id, nextLevel) {
  if (nextLevel > MAX_LEVEL) return '';
  const w = WEAPONS[id], n = w.dmg ? ['피해 +12%', '반경 +8%'] : ['반경 +8%'];
  if (w.drill) n.push('관통 +20%');
  if (w.bomblets && nextLevel >= 2) n.push('자탄 +1');
  if (w.bounces && nextLevel === 3) n.push('튕김 +1');
  return n.join(' · ');
}

export function statBits(s) {
  const bits = s.dmg ? [`피해 ${s.dmg}`, `반경 ${s.r}`] : [`반경 ${s.r}`];
  if (s.dirt) bits.push('흙 쌓기');
  if (s.count > 1) bits.push(`${s.count}발`);
  if (s.bomblets) bits.push(`자탄 ${s.bomblets}`);
  if (s.bounces) bits.push(`튕김 ${s.bounces}`);
  if (s.drill) bits.push(`관통 ${s.drill}`);
  if ((s.windK ?? 1) < 1) bits.push('바람 영향 적음');
  return bits;
}
