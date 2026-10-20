import { W, VIEW, H, G, SPEED, MAX_WIND, DEG, BODY, rand, clamp, shuffle } from './config.js';
import { Terrain } from './terrain.js';
import { BASE_ORDER, weaponStats } from './data/weapons.js';
import { TANKS } from './data/tanks.js';
import { sfx } from './audio.js';
import { plan } from './ai.js';

// 조준 화살표: 길이 = base + 파워 × perPower (월드 단위). 렌더러와 같이 쓴다.
export const ARROW = { base: 30, perPower: 1.15 };
const EDGE = 110;

// 한 라운드의 난타전. players는 라운드를 넘어 유지되는 플레이어 객체(돈, 인벤토리, 강화, 조합법)이고
// tanks는 이번 라운드에만 쓰는 상태다. tanks 배열 순서가 곧 턴 순서(라운드마다 섞음).
// 마지막 한 대가 남으면 onEnd(승리 탱크 또는 null)를 부른다.
export class Battle {
  constructor(players, onEnd) {
    this.terrain = new Terrain();
    this.onEnd = onEnd;
    const slots = shuffle(spawnSlots(players.length));
    this.tanks = shuffle(players.map((pl, i) => this.makeTank(pl, slots[i])));
    this.projs = []; this.spawned = []; this.booms = []; this.parts = []; this.floaters = []; this.deaths = [];
    this.deathOrder = [];
    this.held = new Map(); this.fine = false;
    this.wind = rand(-.5, .5) * MAX_WIND;
    this.state = 'aim'; this.settleT = 0; this.shake = 0; this.now = 0;
    this.cam = { x: 0, manual: false }; this.lastBoom = null;
    this.viewW = VIEW; // 렌더러가 화면 비율에 맞춰 매 프레임 갱신
    this.turn = 0;
    this.startTurn();
    this.cam.x = this.camClamp(this.cur.x - this.viewW / 2);
  }

  makeTank(pl, x) {
    const type = TANKS[pl.tank];
    return { pl, type, x, y: this.terrain.surfaceY(x) - 1, hp: type.hp, maxHp: type.hp,
      angle: x < W / 2 ? 55 : 125, power: 60, fuel: 100, fuelMax: 100, sel: type.sig[0], cd: 0,
      shield: false, itemUsed: false, dead: false, falling: false, vy: 0, fallFrom: 0, moveAcc: 0,
      lastTrail: null, lastHitBy: null, ai: null, think: 0, dealt: 0, kills: 0,
      hurtT: 9, blinkT: rand(1, 4) }; // 표정 애니메이션용
  }

  get cur() { return this.tanks[this.turn]; }
  get alive() { return this.tanks.filter(t => !t.dead); }
  human() { const t = this.cur; return this.state === 'aim' && t && !t.pl.cpu && !t.dead ? t : null; }
  stats(t, id) { return weaponStats(id, t.pl.upgrades); }
  tip(t, a) { const r = a * DEG; return [t.x + Math.cos(r) * BODY.barrel, t.y - BODY.pivot - Math.sin(r) * BODY.barrel]; }

  // 이번 턴에 고를 수 있는 무기 목록. label은 HUD에 표시할 남은 수량/대기 턴.
  available(t) {
    const [s0, s1] = t.type.sig, inv = t.pl.inventory;
    const list = [{ id: s0, label: '∞', ok: true }];
    const n1 = inv[s1] || 0;
    list.push({ id: s1, label: t.cd > 0 ? (n1 ? String(n1) : `${t.cd}턴`) : '특기', ok: t.cd === 0 || n1 > 0, special: true });
    for (const id of [...BASE_ORDER, ...t.pl.recipes]) {
      if (id !== s0 && id !== s1 && inv[id] > 0) list.push({ id, label: String(inv[id]), ok: true });
    }
    return list;
  }
  canUse(t, id) { return this.available(t).some(a => a.id === id && a.ok); }
  select(t, id) { if (this.canUse(t, id)) t.sel = id; }
  cycle(t, d) {
    const av = this.available(t).filter(a => a.ok);
    const i = av.findIndex(a => a.id === t.sel);
    t.sel = av[(i + d + av.length) % av.length].id;
  }
  consume(t, id) {
    const [s0, s1] = t.type.sig;
    if (id === s0) return;
    if (id === s1 && t.cd === 0) { t.cd = t.type.cd + 1; return; }
    t.pl.inventory[id]--;
  }

  useItem(t, id) {
    const items = t.pl.items;
    if (this.state !== 'aim' || t.itemUsed || !(items[id] > 0)) return false;
    if (id === 'repair' && t.hp >= t.maxHp) return false;
    if (id === 'shield' && t.shield) return false;
    items[id]--; t.itemUsed = true;
    if (id === 'repair') { const h = Math.min(35, t.maxHp - t.hp); t.hp += h; this.float(t.x, t.y - 46, '+' + h, '#7be38a'); }
    if (id === 'shield') { t.shield = true; this.float(t.x, t.y - 46, '방어막', '#9be7ff'); }
    if (id === 'fuel') { t.fuel += 100; t.fuelMax = t.fuel; this.float(t.x, t.y - 46, '연료 +100', '#f1e4cf'); }
    sfx('item');
    return true;
  }

  float(x, y, text, color) { this.floaters.push({ x, y, text, color, t: 0 }); }

  /* ---------- 카메라 ---------- */
  focusX() {
    if (this.projs.length) return this.projs.reduce((s, p) => s + p.x, 0) / this.projs.length;
    if (this.state !== 'aim' && this.lastBoom) return this.lastBoom.x;
    const t = this.cur; // 조준 중엔 화살표 쪽으로 조금 치우쳐서 본다
    return t.pl.cpu ? t.x : t.x + Math.cos(t.angle * DEG) * 70;
  }
  // 화면이 전장보다 넓으면 가운데 정렬
  // 가장자리에서도 조준 화살표가 보이도록 전장 밖으로 조금(EDGE) 더 갈 수 있다
  camClamp(x) { return this.viewW >= W ? (W - this.viewW) / 2 : clamp(x, -EDGE, W - this.viewW + EDGE); }
  updateCam(dt) {
    if (this.cam.manual && !this.projs.length) { this.cam.x = this.camClamp(this.cam.x); return; } // 직접 둘러보는 중이면 포탄이 날 때까지 그대로
    this.cam.manual = false;
    const tx = this.camClamp(this.focusX() - this.viewW / 2);
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * (this.projs.length ? 6 : this.state === 'aim' ? 5 : 3));
  }
  pan(dx) { this.cam.x = this.camClamp(this.cam.x + dx); this.cam.manual = true; }
  lookAt(x) { this.cam.x = this.camClamp(x - this.viewW / 2); this.cam.manual = true; }

  /* ---------- 턴 ---------- */
  startTurn() {
    const t = this.cur;
    this.state = 'aim'; this.settleT = 0; this.cam.manual = false; this.lastBoom = null;
    t.fuel = t.fuelMax = 100; t.itemUsed = false; t.ai = null; t.think = .45; t.moveAcc = 0;
    if (t.cd > 0) t.cd--;
    if (!this.canUse(t, t.sel)) t.sel = t.type.sig[0];
    this.wind = clamp(this.wind + rand(-18, 18), -MAX_WIND, MAX_WIND);
  }
  endTurn() {
    const alive = this.alive;
    if (alive.length <= 1) { this.state = 'over'; this.onEnd(alive[0] || null); return; }
    let n = this.turn;
    do n = (n + 1) % this.tanks.length; while (this.tanks[n].dead);
    this.turn = n;
    this.startTurn();
  }

  /* ---------- 탱크 ---------- */
  onGround(t) { return [-11, -6, 0, 6, 11].some(dx => this.terrain.isSolid(t.x + dx, t.y + 1)); }
  blocked(x, y, dir) {
    for (let k = 2; k <= 14; k += 3) if (this.terrain.isSolid(x + dir * 12, y - k)) return true;
    return this.terrain.isSolid(x, y - 4);
  }
  tryMove(t, dir) {
    if (t.fuel <= 0 || t.falling) return;
    const nx = t.x + dir;
    if (nx < 12 || nx > W - 12) return;
    for (let climb = 0; climb <= 5; climb++) {
      if (!this.blocked(nx, t.y - climb, dir)) {
        t.x = nx; t.y -= climb; t.fuel = Math.max(0, t.fuel - .55 / t.type.move);
        return;
      }
    }
  }
  hurt(t, dmg, src) {
    if (t.dead) return;
    dmg = Math.round(dmg * (1 - t.type.armor));
    if (t.shield && dmg > 0) { dmg = Math.ceil(dmg / 2); t.shield = false; }
    if (dmg <= 0) return;
    t.hp = Math.max(0, t.hp - dmg);
    if (src && src !== t) { src.dealt += dmg; t.lastHitBy = src; }
    t.hurtT = 0;
    this.float(t.x, t.y - 46, '-' + dmg, t.pl.color);
    if (t.hp <= 0) this.kill(t, true);
  }
  kill(t, blast) {
    if (t.dead) return;
    t.dead = true; t.hp = 0;
    this.deathOrder.push(t);
    if (t.lastHitBy && t.lastHitBy !== t) t.lastHitBy.kills++;
    if (blast) this.deaths.push({ t, delay: .45 });
  }
  updateTank(t, dt) {
    if (t.y > H) return;
    if (!this.onGround(t)) {
      if (!t.falling) { t.falling = true; t.fallFrom = t.y; t.vy = 0; }
      t.vy = Math.min(t.vy + G * 2 * dt, 600);
      let dy = t.vy * dt;
      while (dy > 0) { const s = Math.min(1, dy); t.y += s; dy -= s; if (this.onGround(t)) break; }
      if (t.y > H + 20) { t.falling = false; this.float(t.x, H - 30, '추락', t.pl.color); this.kill(t, false); }
    } else if (t.falling) {
      t.falling = false;
      const d = t.y - t.fallFrom;
      if (d > 40) this.hurt(t, Math.round((d - 40) * .25), null);
      t.vy = 0;
    }
  }

  /* ---------- 발사 ---------- */
  fire(t) {
    if (this.state !== 'aim' || t.dead || !this.canUse(t, t.sel)) return;
    const id = t.sel, w = this.stats(t, id);
    this.consume(t, id);
    const n = w.count || 1, spread = w.spread || 0;
    for (let i = 0; i < n; i++) {
      const a = t.angle + (i - (n - 1) / 2) * spread;
      const [px, py] = this.tip(t, a), v = t.power * SPEED * (w.speedK || 1), r = a * DEG;
      const p = this.proj(px, py, Math.cos(r) * v, -Math.sin(r) * v, w, t);
      this.projs.push(p);
      if (i === n >> 1) t.lastTrail = p.trail;
    }
    if (!this.canUse(t, t.sel)) t.sel = t.type.sig[0];
    this.state = 'fire'; this.settleT = 0; t.ai = null; this.cam.manual = false;
    sfx('fire');
  }
  proj(x, y, vx, vy, w, owner, age = 0) {
    return { x, y, vx, vy, w, owner, age, trail: [[x, y]], drilling: null, carveAcc: 0, bounces: w.bounces || 0 };
  }
  tankHit(p) {
    return this.tanks.find(t => !t.dead && !(t === p.owner && p.age < .25) &&
      Math.abs(p.x - t.x) < BODY.hw && p.y > t.y - BODY.h && p.y < t.y + 2);
  }

  // 부품 순서: 공중 분열 → 지형 접촉 시 튕김 → 굴착 → 폭발(또는 흙)
  stepProj(p, dt) {
    const T = this.terrain, w = p.w;
    p.age += dt;
    const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 2)), h = dt / n;
    for (let i = 0; i < n; i++) {
      if (p.drilling !== null) {
        p.x += p.vx * h; p.y += p.vy * h;
        const d = Math.hypot(p.vx, p.vy) * h;
        p.drilling -= d; p.carveAcc += d;
        if (p.carveAcc >= 4) { p.carveAcc = 0; T.carve(p.x, p.y, 9); }
        if (this.tankHit(p) || p.drilling <= 0 || p.y > H - 2 || p.x < 0 || p.x > W) { this.explode(p); return false; }
        continue;
      }
      const px = p.x, py = p.y;
      p.vx += this.wind * (w.windK ?? 1) * h;
      p.vy += G * (w.gravK ?? 1) * h;
      p.x += p.vx * h; p.y += p.vy * h;
      if (p.x < -60 || p.x > W + 60 || p.y > H + 40) return false;
      if (w.bomblets && p.vy > 0 && p.age > .15) { this.split(p); return false; }
      const hit = this.tankHit(p);
      if (hit || T.isSolid(p.x, p.y)) {
        if (!hit && p.bounces > 0) {
          p.x = px; p.y = py;
          [p.vx, p.vy] = T.reflect(px, py, p.vx, p.vy);
          p.bounces--; this.puff(px, py); sfx('bounce');
          if (Math.hypot(p.vx, p.vy) >= 40) continue;
        } else if (!hit && w.drill) {
          const s = Math.hypot(p.vx, p.vy) || 1;
          p.vx = p.vx / s * 260; p.vy = p.vy / s * 260; p.drilling = w.drill;
          continue;
        }
        this.explode(p); return false;
      }
    }
    p.trail.push([p.x, p.y]);
    return true;
  }
  split(p) {
    const w = p.w, n = w.bomblets, sub = { ...w, bomblets: 0, count: 1 };
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) - .5 : 0;
      this.spawned.push(this.proj(p.x, p.y, p.vx + k * 150, p.vy - 30, sub, p.owner, 1));
    }
    this.puff(p.x, p.y); sfx('pop');
  }
  explode(p) { this.blast(p.x, p.y, p.w.r, p.w.dmg, p.owner, p.w.dirt); }
  blast(x, y, r, dmg, src, dirt = false) {
    this.lastBoom = { x, y };
    if (dmg > 0) {
      for (const t of this.tanks) {
        if (t.dead) continue;
        const d = Math.hypot(t.x - x, t.y - 10 - y), reach = r + 14;
        if (d < reach) this.hurt(t, Math.round(dmg * (1 - Math.max(0, d - 8) / reach)), src);
      }
    }
    if (dirt) {
      this.terrain.addDirt(x, y, r);
      this.booms.push({ x, y, r, t: 0, dur: .5, dirt: true });
      this.shake = Math.max(this.shake, 4); sfx('boom', .5);
      return;
    }
    this.terrain.carve(x, y, r); this.terrain.scorch(x, y, r);
    this.booms.push({ x, y, r, t: 0, dur: .55 });
    const n = 18 + r * .6;
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 1.05, Math.PI * 1.95), s = rand(80, 260) * (r / 30);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.5, 1.2), color: Math.random() < .45 ? '#ffd43b' : this.terrain.scene.ground[1] });
    }
    this.shake = Math.max(this.shake, r / 4);
    sfx('boom', r / 30);
  }
  puff(x, y) {
    for (let i = 0; i < 8; i++) this.parts.push({ x, y, vx: rand(-80, 80), vy: rand(-140, -40), life: rand(.3, .6), color: '#ffffff' });
  }

  /* ---------- 조작 ---------- */
  // 각도·파워는 0.1 단위로 맞춘다. 한 칸 = 1(Shift를 누르고 있으면 0.1).
  setAngle(t, v) { t.angle = clamp(Math.round(v * 10) / 10, 0, 180); }
  setPower(t, v) { t.power = clamp(Math.round(v * 10) / 10, 5, 100); }
  step(t, act) {
    const s = this.fine ? .1 : 1;
    if (act === 'angL') this.setAngle(t, t.angle + s);
    if (act === 'angR') this.setAngle(t, t.angle - s);
    if (act === 'powU') this.setPower(t, t.power + s);
    if (act === 'powD') this.setPower(t, t.power - s);
  }
  // 화면에서 탱크를 끌어 조준: 방향이 각도, 길이가 파워
  aimAt(t, wx, wy) {
    const px = t.x, py = t.y - BODY.pivot, dx = wx - px, dy = py - wy;
    let a = Math.atan2(dy, dx) / DEG;
    if (a < 0) a = dx >= 0 ? 0 : 180; // 포신보다 아래로 끌면 수평으로
    this.setAngle(t, a);
    this.setPower(t, (Math.hypot(dx, dy) - ARROW.base) / ARROW.perPower);
  }
  // 누르는 순간 정확히 한 칸. held에는 누른 시간을 기록해 두고 humanUpdate에서 길게 누를 때만 반복한다.
  press(act) {
    if (this.held.has(act)) return;
    this.held.set(act, { t: 0, acc: 0 });
    const t = this.human();
    if (t) this.step(t, act);
  }
  release(act) { this.held.delete(act); }
  humanUpdate(t, dt) {
    const held = this.held;
    for (const [act, h] of held) {
      if (act === 'movL' || act === 'movR') continue;
      h.t += dt;
      if (h.t < .4) continue;                 // 0.4초 넘게 누르고 있어야 반복 시작
      h.acc += (h.t < 1.5 ? 10 : 30) * dt;    // 초당 10칸, 1.5초가 지나면 초당 30칸
      while (h.acc >= 1) { h.acc--; this.step(t, act); }
    }
    const dir = (held.has('movR') ? 1 : 0) - (held.has('movL') ? 1 : 0);
    if (dir) {
      this.cam.manual = false;
      t.moveAcc += 40 * dt;
      while (t.moveAcc >= 1) { t.moveAcc--; this.tryMove(t, dir); }
    }
  }
  aiUpdate(t, dt) {
    if (!t.ai) {
      t.think -= dt;
      if (t.think <= 0) {
        t.ai = plan(this, t);
        if (t.ai.item) this.useItem(t, t.ai.item);
        this.select(t, t.ai.weapon);
      }
      return;
    }
    const da = t.ai.a - t.angle, dp = t.ai.p - t.power;
    t.angle += clamp(da, -120 * dt, 120 * dt);
    t.power += clamp(dp, -80 * dt, 80 * dt);
    if (Math.abs(da) < .3 && Math.abs(dp) < .3) { t.ai.wait -= dt; if (t.ai.wait <= 0) this.fire(t); }
  }

  /* ---------- 루프 ---------- */
  update(dt) {
    this.now += dt;
    for (const t of this.tanks) {
      this.updateTank(t, dt);
      t.hurtT += dt;
      if ((t.blinkT -= dt) < -.12) t.blinkT = rand(2, 5);
    }
    const cur = this.cur;
    if (this.state === 'aim') {
      if (cur.dead) { this.state = 'fire'; this.settleT = 0; }
      else if (cur.pl.cpu) this.aiUpdate(cur, dt);
      else this.humanUpdate(cur, dt);
    }
    const live = [];
    for (const p of this.projs) if (this.stepProj(p, dt)) live.push(p);
    this.projs = live.concat(this.spawned); this.spawned = [];
    for (const d of this.deaths) {
      d.delay -= dt;
      if (d.delay <= 0) { this.blast(d.t.x, d.t.y - 10, 34, 22, null); d.done = true; }
    }
    this.deaths = this.deaths.filter(d => !d.done);
    for (const b of this.booms) b.t += dt;
    this.booms = this.booms.filter(b => b.t < b.dur);
    for (const p of this.parts) {
      p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (this.terrain.isSolid(p.x, p.y)) p.life = Math.min(p.life, .05);
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter(f => f.t < 1.3);
    this.shake *= Math.pow(.02, dt);
    this.updateCam(dt);
    if (this.state === 'fire') {
      const busy = this.projs.length || this.booms.length || this.deaths.length || this.tanks.some(t => t.falling);
      if (busy) this.settleT = 0;
      else if ((this.settleT += dt) > .45) this.endTurn();
    }
  }
}

// 전장 폭에 고르게 흩어 놓되 조금씩 흔든다.
function spawnSlots(n) {
  const m = 60, step = n > 1 ? (W - 2 * m) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => Math.round(clamp(n > 1 ? m + i * step + rand(-step * .18, step * .18) : W / 2, 20, W - 20)));
}
