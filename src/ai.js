import { W, H, G, SPEED, DEG, BODY, MAX_LEVEL, COMBO_FEE, rand, clamp } from './config.js';
import { WEAPONS, BASE_ORDER, weaponStats, upgradeCost, comboId } from './data/weapons.js';
import { TANKS } from './data/tanks.js';
import { ITEMS } from './data/items.js';

// 지형과 바람을 그대로 써서 착탄 지점을 계산한다(튕김과 굴착까지 따라간다, 분열은 무시).
function simulate(b, t, a, pw, w, target) {
  const T = b.terrain, r = a * DEG, v = pw * SPEED * (w.speedK || 1), h = 1 / 120;
  const wk = w.windK ?? 1, gk = w.gravK ?? 1;
  const onTarget = (x, y) => Math.abs(x - target.x) < BODY.hw && y > target.y - BODY.h && y < target.y + 2;
  let [x, y] = b.tip(t, a), vx = Math.cos(r) * v, vy = -Math.sin(r) * v, bounces = w.bounces || 0;
  for (let i = 0; i < 1600; i++) {
    const px = x, py = y;
    vx += b.wind * wk * h; vy += G * gk * h; x += vx * h; y += vy * h;
    if (x < -60 || x > W + 60 || y > H + 40) return null;
    if (onTarget(x, y)) return { x, y, hit: true };
    if (T.isSolid(x, y)) {
      if (bounces > 0) {
        x = px; y = py; [vx, vy] = T.reflect(px, py, vx, vy); bounces--;
        if (Math.hypot(vx, vy) >= 40) continue;
        return { x, y };
      }
      if (w.drill) {
        const s = Math.hypot(vx, vy) || 1;
        for (let d = 0; d < w.drill; d += 3) {
          x += vx / s * 3; y += vy / s * 3;
          if (onTarget(x, y)) return { x, y, hit: true };
          if (y > H - 2 || x < 0 || x > W) break;
        }
      }
      return { x, y };
    }
  }
  return null;
}

function aim(b, t, id, target) {
  const w = weaponStats(id, t.pl.upgrades), self = w.r + 40;
  let best = { s: 1e9, a: t.angle, p: t.power };
  for (let a = 8; a <= 172; a += 2.5) for (let pw = 15; pw <= 100; pw += 2.5) {
    const r = simulate(b, t, a, pw, w, target);
    if (!r) continue;
    let s = r.hit ? 0 : Math.hypot(r.x - target.x, r.y - target.y);
    if (Math.hypot(r.x - t.x, r.y - t.y) < self) s += 600;
    if (s < best.s) best = { s, a, p: pw };
  }
  return best;
}

// CPU 한 턴의 계획. 가깝고 체력이 낮은 적을 우선 노리되 약간 무작위로 고른다.
// 난이도(pl.cpu 1~3)에 따라 각도/파워 오차가 줄어든다.
export function plan(b, t) {
  const foes = b.alive.filter(o => o !== t)
    .map(o => ({ o, s: Math.abs(o.x - t.x) * .15 + o.hp + rand(0, 40) }))
    .sort((p, q) => p.s - q.s);
  const target = foes[0].o;
  let item = null;
  if (t.hp < t.maxHp * .5 && t.pl.items.repair > 0) item = 'repair';
  else if (!t.shield && t.pl.items.shield > 0 && Math.random() < .5) item = 'shield';

  const av = b.available(t).filter(a => { const w = b.stats(t, a.id); return a.ok && w.dmg > 0; });
  let weapon = av[0].id;
  const extra = av.slice(1);
  if (extra.length && Math.random() < .6) weapon = extra[Math.floor(Math.random() * extra.length)].id;
  let best = aim(b, t, weapon, target);
  const drill = av.find(a => b.stats(t, a.id).drill);
  if (best.s > 60 && drill && drill.id !== weapon) { weapon = drill.id; best = aim(b, t, weapon, target); }

  const [na, np] = [[0, 0], [9, 12], [4, 6], [1.2, 2]][t.pl.cpu] || [4, 6];
  return { a: clamp(best.a + rand(-na, na), 0, 180), p: clamp(best.p + rand(-np, np), 5, 100), weapon, item, wait: .2 };
}

// CPU 상점: 살 수 있는 선택지 중 가중치로 고르며, 120G 근처에서 일부는 저축한다.
export function cpuShop(pl) {
  const type = TANKS[pl.tank];
  const options = () => {
    const list = [];
    for (const id of BASE_ORDER) {
      const w = WEAPONS[id], lv = pl.upgrades[id] || 0;
      if (id !== type.sig[0] && !w.dirt) {
        list.push({ cost: w.price, weight: id === 'nuke' ? 1 : id === 'shell' ? .5 : 2, go: () => { pl.inventory[id] = (pl.inventory[id] || 0) + w.pack; } });
      }
      if (lv < MAX_LEVEL && (type.sig.includes(id) || pl.inventory[id] > 0)) {
        list.push({ cost: upgradeCost(id, lv), weight: id === type.sig[0] ? 3 : 1.5, go: () => { pl.upgrades[id] = lv + 1; } });
      }
    }
    for (const id of pl.recipes) {
      const w = weaponStats(id, pl.upgrades);
      if (w.dmg > 0) list.push({ cost: w.price, weight: 2.5, go: () => { pl.inventory[id] = (pl.inventory[id] || 0) + w.pack; } });
    }
    if (pl.recipes.length < 3) {
      const pool = BASE_ORDER.filter(id => !WEAPONS[id].dirt);
      const a = pool[Math.floor(Math.random() * pool.length)], c = pool[Math.floor(Math.random() * pool.length)];
      const id = comboId(a, c);
      if (a !== c && !pl.recipes.includes(id)) list.push({ cost: COMBO_FEE, weight: 1, go: () => { pl.recipes.push(id); } });
    }
    if (pl.items.repair < 2) list.push({ cost: ITEMS.repair.price, weight: 3, go: () => { pl.items.repair++; } });
    if (pl.items.shield < 1) list.push({ cost: ITEMS.shield.price, weight: 1.5, go: () => { pl.items.shield++; } });
    return list.filter(o => o.cost <= pl.money);
  };
  for (let guard = 0; guard < 20; guard++) {
    const opts = options();
    if (!opts.length) break;
    let r = Math.random() * opts.reduce((s, o) => s + o.weight, 0);
    const pick = opts.find(o => (r -= o.weight) < 0) || opts[0];
    pl.money -= pick.cost; pick.go();
    if (pl.money < 120 && Math.random() < .5) break;
  }
}
