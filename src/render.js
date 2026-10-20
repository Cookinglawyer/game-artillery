import { W, H, MAX_WIND, TAU, DEG, BODY, rand } from './config.js';
import { PARALLAX } from './terrain.js';
import { ARROW } from './battle.js';

const INK = '#2d3047';
const FONT = '"Jua", "Noto Sans KR", sans-serif';

// 화면(CSS 픽셀) 크기에 맞춘 배율과 보이는 범위.
// 세로 화면에서도 좌우로 최소 minVW만큼은 보이게 하고, 남는 위쪽은 하늘로 채운다.
// padB: 아래 조작판 높이. 땅이 조작판에 가리지 않게 그만큼 위로 올린다(가로 화면은 일부만).
export function viewFor(w, h, padT, padB) {
  const portrait = h >= w;
  const minVW = portrait ? 460 : 680;
  const pb = portrait ? padB : Math.min(padB, h * .18);
  let s = Math.min((h - pb) / (H + 30), w / minVW);
  s = Math.max(s, w / W);
  return { s, vw: w / s, yTop: H - (h - pb) / s, w, h, padT, padB };
}

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  return `rgb(${ch.map(f).join(',')})`;
}

const line = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
const ellipse = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
const pill = (c, x, y, w, h) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, h / 2) : c.rect(x, y, w, h); };

// 귀여운 탱크 캐릭터. 설정 화면과 아이콘에서도 쓴다.
// o: { t: 시간(초), blink, hurt, dead }
export function drawCritter(c, type, color, x, y, angle, o = {}) {
  const r = angle * DEG, face = Math.cos(r) >= 0 ? 1 : -1, px = x, py = y - BODY.pivot;
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = 'rgba(45,48,71,.16)'; ellipse(c, x, y + 1, 16, 3.5); c.fill();
  if (o.dead) {
    c.fillStyle = '#d5d9e2'; c.strokeStyle = INK; c.lineWidth = 2.2;
    ellipse(c, x, y - 7, 16, 8); c.fill(); c.stroke();
    c.lineWidth = 1.8;
    for (const ex of [x - 5, x + 5]) { line(c, ex - 2.2, y - 9.5, ex + 2.2, y - 5.5); line(c, ex + 2.2, y - 9.5, ex - 2.2, y - 5.5); }
    c.strokeStyle = '#ffd43b'; c.lineWidth = 2.2; ellipse(c, x, y - 20 - Math.sin((o.t || 0) * 3) * 1.5, 7, 2.5); c.stroke();
    c.restore(); return;
  }
  // 포신
  const bw = type === 'missile' ? 9 : type === 'cannon' ? 8 : 7, ex = px + Math.cos(r) * BODY.barrel, ey = py - Math.sin(r) * BODY.barrel;
  c.strokeStyle = INK; c.lineWidth = bw + 4.5; line(c, px, py, ex, ey);
  c.strokeStyle = shade(color, -.18); c.lineWidth = bw; line(c, px, py, ex, ey);
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2;
  line(c, px - Math.sin(r) * bw * .2, py - Math.cos(r) * bw * .2, ex - Math.sin(r) * bw * .2, ey - Math.cos(r) * bw * .2);
  c.fillStyle = shade(color, -.3); c.strokeStyle = INK; c.lineWidth = 2;
  c.beginPath(); c.arc(ex, ey, bw / 2 + 1.8, 0, TAU); c.fill(); c.stroke();
  // 발
  if (type !== 'bouncer') { c.fillStyle = INK; ellipse(c, x - 8, y - 1.8, 5.5, 3.2); c.fill(); ellipse(c, x + 8, y - 1.8, 5.5, 3.2); c.fill(); }
  // 몸통
  c.fillStyle = color; c.strokeStyle = INK; c.lineWidth = 2.4;
  let cx = x, cy = y - 12;
  if (type === 'missile') {
    c.fillStyle = shade(color, -.2);
    c.beginPath(); c.moveTo(x - face * 10, y - 16); c.lineTo(x - face * 20, y - 25); c.lineTo(x - face * 16, y - 12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = color; c.beginPath(); c.roundRect ? c.roundRect(x - 16, y - 21, 32, 18, 9) : c.rect(x - 16, y - 21, 32, 18); c.fill(); c.stroke();
    cy = y - 12;
  } else if (type === 'drill') {
    c.fillStyle = '#dfe3ec';
    c.beginPath(); c.moveTo(x + face * 11, y - 19); c.lineTo(x + face * 26, y - 11); c.lineTo(x + face * 11, y - 3); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(45,48,71,.5)'; c.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) line(c, x + face * (13 + k * 4), y - 17 + k * 2, x + face * (15 + k * 4), y - 5 - k * 2);
    c.fillStyle = color; c.strokeStyle = INK; c.lineWidth = 2.4;
    ellipse(c, x, y - 12, 15.5, 12.5); c.fill(); c.stroke();
    c.fillStyle = shade(color, -.2); c.beginPath(); c.arc(x, y - 18, 9, Math.PI, 0); c.fill(); c.stroke();
  } else if (type === 'bouncer') {
    const bob = Math.abs(Math.sin((o.t || 0) * 4)) * 3;
    c.strokeStyle = INK; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(x - 5, y - 1); for (let k = 0; k < 4; k++) c.lineTo(x + (k % 2 ? -5 : 5), y - 2 - (k + 1) * (2 + bob / 4)); c.stroke();
    cy = y - 16 - bob;
    c.fillStyle = color; c.strokeStyle = INK; c.lineWidth = 2.4;
    c.beginPath(); c.arc(x, cy, 12.5, 0, TAU); c.fill(); c.stroke();
  } else {
    ellipse(c, x, y - 12, 16, 13); c.fill(); c.stroke();
    c.fillStyle = shade(color, .35); ellipse(c, x, y - 4, 10, 3); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.6)'; ellipse(c, cx - 6, cy - 6, 4.5, 2.8, -.5); c.fill();
  // 얼굴: 조준하는 쪽을 바라본다
  const fx = cx + face * 3.5, fy = cy - 1, lx = Math.cos(r) * 1.3, ly = -Math.sin(r) * 1.3;
  c.fillStyle = 'rgba(255,120,150,.5)'; ellipse(c, fx - 8.5, fy + 4, 2.8, 1.8); c.fill(); ellipse(c, fx + 8.5, fy + 4, 2.8, 1.8); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.6;
  for (const ex2 of [fx - 4.6, fx + 4.6]) {
    if (o.hurt) { line(c, ex2 - 2.2, fy - 3, ex2 + 1.6, fy - 1); line(c, ex2 + 1.6, fy - 1, ex2 - 2.2, fy + 1); }
    else if (o.blink) { c.beginPath(); c.arc(ex2, fy - 1.5, 2.6, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
    else {
      c.fillStyle = '#fff'; ellipse(c, ex2, fy - 1.5, 3.3, 4.1); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(ex2 + lx, fy - 1.3 + ly, 1.9, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex2 + lx + .7, fy - 2.2 + ly, .7, 0, TAU); c.fill();
    }
  }
  if (o.hurt) { c.fillStyle = INK; c.beginPath(); c.arc(fx, fy + 4.5, 1.8, 0, TAU); c.fill(); }
  else { c.beginPath(); c.arc(fx, fy + 3, 2.4, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  c.restore();
}

function drawTank(c, b, t, active, v) {
  const { x, y } = t;
  drawCritter(c, t.pl.tank, t.pl.color, x, y, t.angle, { t: b.now, dead: t.dead, blink: t.blinkT < 0, hurt: t.hurtT < .6 });
  if (t.dead) return;
  if (t.shield) {
    c.fillStyle = 'rgba(155,231,255,.18)'; c.strokeStyle = 'rgba(80,190,255,.9)'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y - 12, 24, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x, y - 12, 19, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
  }
  const k = 1 / v.s, bw = 34, by = y - 36;
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.6;
  pill(c, x - bw / 2 - 1.5, by - 1.5, bw + 3, 7); c.fill(); c.stroke();
  const hp = t.hp / t.maxHp;
  c.fillStyle = hp > .5 ? '#51cf66' : hp > .25 ? '#fcc419' : '#ff6b6b';
  if (hp > 0) { pill(c, x - bw / 2, by, Math.max(4, bw * hp), 4); c.fill(); }
  c.font = `${12 * Math.max(1, k * .9)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.lineWidth = 3; c.strokeStyle = '#fff'; c.strokeText(t.pl.name, x, by - 3); c.fillStyle = INK; c.fillText(t.pl.name, x, by - 3);
  if (active) {
    const ay = by - 22 * Math.max(1, k * .9) + Math.sin(b.now * 6) * 3;
    c.fillStyle = t.pl.color; c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 7, ay - 8); c.lineTo(x + 7, ay - 8); c.lineTo(x, ay); c.closePath(); c.fill(); c.stroke();
  }
}

// 조준 화살표: 방향 = 각도, 길이 = 파워
function drawArrow(c, t, v) {
  const r = t.angle * DEG, ux = Math.cos(r), uy = -Math.sin(r), nx = -uy, ny = ux;
  const px = t.x, py = t.y - BODY.pivot, L = ARROW.base + t.power * ARROW.perPower, st = BODY.barrel + 6;
  const P = (a, bb) => [px + ux * a + nx * bb, py + uy * a + ny * bb];
  // 최대 파워 안내 호
  c.setLineDash([3, 7]); c.strokeStyle = 'rgba(45,48,71,.28)'; c.lineWidth = 2;
  c.beginPath(); c.arc(px, py, ARROW.base + 100 * ARROW.perPower, Math.PI, 2 * Math.PI); c.stroke(); c.setLineDash([]);
  const hl = 18, sw = 5, hw = 11;
  const pts = [P(st, -sw), P(L - hl, -sw), P(L - hl, -hw), P(L, 0), P(L - hl, hw), P(L - hl, sw), P(st, sw)];
  c.beginPath(); pts.forEach(([a, bb], i) => i ? c.lineTo(a, bb) : c.moveTo(a, bb)); c.closePath();
  c.lineJoin = 'round'; c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
  const g = c.createLinearGradient(...P(st, 0), ...P(L, 0));
  g.addColorStop(0, shade(t.pl.color, .55)); g.addColorStop(1, t.pl.color);
  c.fillStyle = g; c.fill();
  // 수치 말풍선
  const k = 1 / v.s, [lx, ly] = P(L + 16 * k, 0), text = `${fmt(t.angle)}° · ${fmt(t.power)}`;
  c.font = `${13 * k}px ${FONT}`;
  const tw = c.measureText(text).width + 14 * k, th = 20 * k;
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.6 * k;
  pill(c, lx - tw / 2, ly - th / 2, tw, th); c.fill(); c.stroke();
  c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, lx, ly + 1 * k);
}
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function drawCloud(c, x, y, s) {
  c.fillStyle = 'rgba(190,220,245,.55)';
  for (const [dx, dy, r] of [[-28, 6, 18], [0, 8, 22], [28, 6, 17]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
  c.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-28, 0, 18], [-6, -12, 24], [20, -4, 20], [36, 4, 14], [0, 2, 20]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
}

function drawSky(c, b, v) {
  const S = b.terrain.scene, g = c.createLinearGradient(0, 0, 0, v.h);
  g.addColorStop(0, S.sky[0]); g.addColorStop(.55, S.sky[1]); g.addColorStop(1, S.sky[2]);
  c.fillStyle = g; c.fillRect(0, 0, v.w, v.h);
  // 해: 화면 오른쪽 위, 천천히 도는 햇살
  const sx = v.w * .8, sy = v.padT + Math.min(90, v.h * .14), rot = b.now * .15;
  c.save(); c.translate(sx, sy); c.rotate(rot);
  c.fillStyle = `rgba(${S.sunGlow},.35)`;
  for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(-6, 34); c.lineTo(6, 34); c.lineTo(0, 62); c.closePath(); c.fill(); }
  c.restore();
  c.fillStyle = `rgba(${S.sunGlow},.45)`; c.beginPath(); c.arc(sx, sy, 38, 0, TAU); c.fill();
  c.fillStyle = S.sun; c.beginPath(); c.arc(sx, sy, 28, 0, TAU); c.fill();
  // 구름: 바람 반대로 흐르지 않고 천천히 오른쪽으로
  const span = (v.vw + 600) * v.s;
  for (const cl of b.terrain.clouds) {
    let x = ((cl.x + b.now * cl.v - b.cam.x * .15) * v.s) % span;
    if (x < 0) x += span;
    drawCloud(c, x - 150 * v.s, (cl.y - v.yTop) * v.s, cl.s * Math.max(.6, v.s));
  }
  c.drawImage(b.terrain.bg, -b.cam.x * PARALLAX * v.s, (0 - v.yTop) * v.s, b.terrain.bg.width * v.s, H * v.s);
}

function drawWind(c, wind, v) {
  const w = 128, cx = v.w - w / 2 - 10, y = v.padT + 19;
  c.fillStyle = 'rgba(255,255,255,.88)'; c.strokeStyle = INK; c.lineWidth = 2;
  pill(c, cx - w / 2, y - 14, w, 28); c.fill(); c.stroke();
  c.font = `13px ${FONT}`; c.textBaseline = 'middle';
  c.fillStyle = INK; c.textAlign = 'left'; c.fillText('바람', cx - w / 2 + 10, y + 1);
  c.textAlign = 'right'; c.fillText(Math.round(Math.abs(wind)), cx + w / 2 - 10, y + 1);
  const len = Math.abs(wind) / MAX_WIND * 40, dir = Math.sign(wind) || 1, ax = cx + 6;
  if (len < 2) { c.fillStyle = '#adb5bd'; c.beginPath(); c.arc(ax, y, 3, 0, TAU); c.fill(); return; }
  c.strokeStyle = '#4dabf7'; c.fillStyle = '#4dabf7'; c.lineWidth = 4; c.lineCap = 'round';
  line(c, ax - dir * len / 2, y, ax + dir * len / 2, y);
  c.beginPath(); c.moveTo(ax + dir * (len / 2 + 7), y); c.lineTo(ax + dir * (len / 2 - 2), y - 6); c.lineTo(ax + dir * (len / 2 - 2), y + 6); c.closePath(); c.fill();
}

// 지형 윤곽은 지형이 바뀔 때만 다시 샘플링한다.
const mini = { terrain: null, version: -1, pts: [] };
function drawMinimap(c, b, v) {
  const mw = Math.min(200, v.w * .42), mh = 30, M = b.minimap = { x: 10, y: v.padT + 4, w: mw, h: mh };
  const T = b.terrain, sx = M.w / W, sy = M.h / H;
  if (mini.terrain !== T || mini.version !== T.version || mini.pts.length !== Math.round(M.w) + 1) {
    mini.terrain = T; mini.version = T.version;
    mini.pts = Array.from({ length: Math.round(M.w) + 1 }, (_, i) => T.surfaceY(Math.min(W - 1, Math.round(i / sx))));
  }
  c.fillStyle = 'rgba(255,255,255,.75)'; c.strokeStyle = INK; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect ? c.roundRect(M.x, M.y, M.w, M.h, 8) : c.rect(M.x, M.y, M.w, M.h); c.fill(); c.stroke();
  c.save(); c.clip();
  c.beginPath(); c.moveTo(M.x, M.y + M.h);
  mini.pts.forEach((y, i) => c.lineTo(M.x + i, M.y + y * sy));
  c.lineTo(M.x + M.w, M.y + M.h); c.closePath();
  c.fillStyle = T.scene.ground[1]; c.fill();
  c.strokeStyle = T.scene.ground[2]; c.lineWidth = 1; c.stroke();
  for (const t of b.tanks) {
    if (t.dead) continue;
    const x = M.x + t.x * sx, y = M.y + Math.min(H, t.y) * sy;
    c.fillStyle = t.pl.color; c.strokeStyle = INK; c.lineWidth = 1;
    c.beginPath(); c.arc(x, y - 2.5, t === b.cur ? 3.5 : 2.5, 0, TAU); c.fill(); c.stroke();
  }
  for (const p of b.projs) { c.fillStyle = INK; c.fillRect(M.x + p.x * sx - 1, M.y + Math.max(0, p.y) * sy - 1, 2, 2); }
  c.strokeStyle = INK; c.lineWidth = 1.5;
  c.strokeRect(M.x + Math.max(0, b.cam.x) * sx, M.y + 1, Math.min(W, v.vw) * sx, M.h - 2);
  c.restore();
}

const POW = ['쾅!', '펑!', '빵!'];
export function render(c, b, v, dpr) {
  const cur = b.cur, s = v.s;
  b.viewW = v.vw;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.save();
  if (b.shake > .3) c.translate(rand(-b.shake, b.shake), rand(-b.shake, b.shake));
  drawSky(c, b, v);
  // 월드 좌표로
  c.save();
  c.translate(-b.cam.x * s, -v.yTop * s); c.scale(s, s);
  c.drawImage(b.terrain.cv, 0, 0);
  c.fillStyle = b.terrain.scene.bedrock; c.fillRect(0, H, W, v.h / s);
  if (b.state === 'aim' && !cur.dead) {
    if (cur.lastTrail && cur.lastTrail.length > 1) {
      c.fillStyle = 'rgba(255,255,255,.75)';
      cur.lastTrail.forEach(([x, y], i) => { if (i % 4 === 0) { c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); } });
    }
    if (!cur.pl.cpu) drawArrow(c, cur, v);
  }
  b.tanks.forEach(t => drawTank(c, b, t, t === cur && b.state === 'aim', v));
  for (const p of b.projs) {
    const tr = p.trail, n = tr.length;
    for (let i = Math.max(0, n - 24); i < n; i += 2) {
      const a = (i - (n - 24)) / 24;
      c.fillStyle = p.drilling !== null ? `rgba(120,90,60,${a * .6})` : `rgba(255,255,255,${a * .9})`;
      c.beginPath(); c.arc(tr[i][0], tr[i][1], 1.5 + a * 2.5, 0, TAU); c.fill();
    }
    const big = p.w.r > 60;
    c.fillStyle = big ? '#ff6b6b' : '#ffd43b'; c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.arc(p.x, p.y, big ? 7 : 5, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - 1.5, p.y - 1.5, 1.6, 0, TAU); c.fill();
  }
  for (const o of b.booms) {
    const k = o.t / o.dur, e = 1 - (1 - k) ** 3;
    if (o.dirt) {
      c.fillStyle = `rgba(200,150,100,${.6 * (1 - k)})`;
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.arc(o.x + Math.cos(a) * o.r * .6 * e, o.y + Math.sin(a) * o.r * .4 * e, o.r * .35, 0, TAU); c.fill(); }
      continue;
    }
    c.globalAlpha = 1 - k;
    c.fillStyle = '#fff7c2'; c.beginPath(); c.arc(o.x, o.y, o.r * (.5 + .6 * e), 0, TAU); c.fill();
    c.strokeStyle = '#ffa94d'; c.lineWidth = 7 * (1 - k) + 1; c.stroke();
    c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(45,48,71,.35)'; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + o.x, d = o.r * (.55 + .5 * e);
      c.beginPath(); c.arc(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * .8, o.r * .28 * (1 - k * .5), 0, TAU); c.fill(); c.stroke();
    }
    if (o.r >= 22 && k < .85) {
      const word = POW[Math.abs(Math.round(o.x + o.y)) % POW.length], fs = 14 + o.r * .45;
      c.save(); c.translate(o.x, o.y - o.r * .5 - 12 * e); c.rotate(-.12); c.scale(.7 + .5 * e, .7 + .5 * e);
      c.font = `${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 6; c.strokeStyle = INK; c.strokeText(word, 0, 0);
      c.fillStyle = '#ffd43b'; c.fillText(word, 0, 0);
      c.restore();
    }
    c.globalAlpha = 1;
  }
  for (const p of b.parts) { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, TAU); c.fill(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `${16 / s}px ${FONT}`;
  for (const f of b.floaters) {
    const fy = f.y - f.t * 30;
    c.globalAlpha = Math.min(1, 2.2 - f.t * 1.7);
    c.lineWidth = 4 / s; c.strokeStyle = INK; c.strokeText(f.text, f.x, fy);
    c.fillStyle = f.color; c.fillText(f.text, f.x, fy);
  }
  c.globalAlpha = 1;
  c.restore();
  // 화면 밖 현재 탱크 방향 표시
  const sx = (cur.x - b.cam.x) * s;
  if (!cur.dead && (sx < 0 || sx > v.w)) {
    const ex = sx < 0 ? 16 : v.w - 16, d = sx < 0 ? -1 : 1, ey = Math.min(v.h - v.padB - 20, Math.max(v.padT + 60, (cur.y - v.yTop) * s));
    c.fillStyle = cur.pl.color; c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(ex + d * 9, ey); c.lineTo(ex - d * 5, ey - 10); c.lineTo(ex - d * 5, ey + 10); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
  drawMinimap(c, b, v);
  drawWind(c, b.wind, v);
}
