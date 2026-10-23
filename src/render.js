import { W, H, MAX_WIND, TAU, DEG, BODY, rand } from './config.js';
import { PARALLAX } from './terrain.js';
import { ARROW } from './battle.js';
import { TANKS } from './data/tanks.js';
import { SHIELDS } from './data/items.js';

const INK = '#2d3047';
const FONT = '"Jua", "Noto Sans KR", sans-serif';

// 화면(CSS 픽셀) 크기에 맞춘 배율과 보이는 범위. 가로 화면 기준.
// 전장 폭의 2/3(1200) 이상은 항상 보이게 하고, 화면이 넉넉하면 전장 전체(1800)까지 넣는다.
// 다만 탱크가 너무 작아지지 않게 배율 0.62 아래로는 줄이지 않는다(2/3 규칙이 우선).
// 아래 조작판은 땅속 일부를 가려도 되므로 화면 높이의 20%까지만 비켜 준다.
export function viewFor(w, h, padT, padB) {
  const fitW = Math.min(w / (W * 2 / 3), Math.max(w / W, .62));
  const pb = Math.min(padB, h * .2);
  const s = Math.min(fitW, (h - pb) / (H - 40));
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

const SKIN = '#ffd9bd';
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

// 국기: 가로 12 × 세로 8, 왼쪽 위가 원점
function drawFlag(c, id) {
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  switch (id) {
    case 'kr':
      R(0, 0, 12, 8, '#fff');
      c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(6, 4, 2.2, Math.PI, 0); c.fill();
      c.fillStyle = '#0047a0'; c.beginPath(); c.arc(6, 4, 2.2, 0, Math.PI); c.fill();
      c.fillStyle = '#222'; for (const [x, y] of [[1.6, 1.5], [10.4, 1.5], [1.6, 6.5], [10.4, 6.5]]) c.fillRect(x - .8, y - .7, 1.6, 1.4);
      break;
    case 'us': for (let i = 0; i < 5; i++) R(0, i * 1.6, 12, 1.6, i % 2 ? '#fff' : '#b22234'); R(0, 0, 5, 4.8, '#3c3b6e'); break;
    case 'kp':
      R(0, 0, 12, 8, '#024fa2'); R(0, 1.2, 12, 5.6, '#fff'); R(0, 1.6, 12, 4.8, '#ed1c27');
      c.fillStyle = '#fff'; circle(c, 4, 4, 1.8); c.fill(); c.fillStyle = '#ed1c27'; star(c, 4, 4, 1.4);
      break;
    case 'ru': R(0, 0, 12, 2.67, '#fff'); R(0, 2.67, 12, 2.67, '#0039a6'); R(0, 5.33, 12, 2.67, '#d52b1e'); break;
    case 'cn': R(0, 0, 12, 8, '#de2910'); c.fillStyle = '#ffde00'; star(c, 2.8, 2.6, 1.7); break;
    case 'jp': R(0, 0, 12, 8, '#fff'); c.fillStyle = '#bc002d'; circle(c, 6, 4, 2.3); c.fill(); break;
    case 'de': R(0, 0, 12, 2.67, '#111'); R(0, 2.67, 12, 2.67, '#dd0000'); R(0, 5.33, 12, 2.67, '#ffce00'); break;
    case 'fr': R(0, 0, 4, 8, '#0055a4'); R(4, 0, 4, 8, '#fff'); R(8, 0, 4, 8, '#ef4135'); break;
  }
  c.strokeStyle = INK; c.lineWidth = .8; c.strokeRect(0, 0, 12, 8);
}

// 머리 모양. 머리 위쪽을 덮는 둥근 '머리카락 모자'에 스타일별 특징을 더한다.
function drawHair(c, R, x, y, r, f) {
  c.fillStyle = R.hairColor; c.strokeStyle = INK; c.lineWidth = 1.3;
  const cap = (ry = .5, cy = .6, rx = .7) => { ellipse(c, x, y - r * cy, r + rx, r * ry); c.fill(); c.stroke(); };
  switch (R.hair) {
    case 'side': // 옆 가르마
      cap();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; line(c, x - f * 2.2, y - r * 1.05, x - f * 1.2, y - r * .45);
      break;
    case 'swoop': // 앞이마로 쓸어 넘긴 풍성한 금발
      cap(.52, .6, 1.1);
      c.beginPath(); c.moveTo(x - f * (r + .5), y - r * .5);
      c.quadraticCurveTo(x - f * 1, y - r * 1.45, x + f * (r + 1.8), y - r * .62);
      c.quadraticCurveTo(x + f * 2, y - r * .25, x - f * (r * .2), y - r * .5); c.closePath(); c.fill(); c.stroke();
      break;
    case 'flattop': // 옆은 짧게, 위는 높고 평평하게
      c.fillStyle = '#6b6b72'; ellipse(c, x, y - r * .35, r + .5, r * .45); c.fill();
      c.fillStyle = R.hairColor;
      c.beginPath(); c.roundRect ? c.roundRect(x - r * .82, y - r - 2.2, r * 1.64, 2.2 + r * .5, [3, 3, 1, 1]) : c.rect(x - r * .82, y - r - 2.2, r * 1.64, 2.2 + r * .5); c.fill(); c.stroke();
      break;
    case 'thin': // 옆머리만 조금, 정수리는 성글게
      c.globalAlpha = .55; ellipse(c, x, y - r * .78, r * .8, r * .28); c.fill(); c.globalAlpha = 1;
      ellipse(c, x - r * .88, y - r * .25, 1.5, 2.6); c.fill(); ellipse(c, x + r * .88, y - r * .25, 1.5, 2.6); c.fill();
      break;
    case 'combed': // 단정히 뒤로 넘긴 머리
      cap(.55, .58, .8);
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y - r * .2, r * .75, Math.PI * 1.15, Math.PI * 1.6); c.stroke();
      break;
    case 'bob': // 단발(뒷머리는 얼굴보다 먼저 그린다), 앞머리
      cap(.48, .62, 1);
      c.fillRect(x - r - 1.2, y - r * .4, 2.2, r * .9); c.fillRect(x + r - 1, y - r * .4, 2.2, r * .9);
      break;
    case 'fringe': // 대머리에 옆·뒷머리만
      c.fillStyle = R.hairColor;
      ellipse(c, x - f * r * .86, y - r * .1, 1.9, 3.4); c.fill(); c.stroke();
      ellipse(c, x + f * r * .9, y - r * .05, 1.2, 2.6); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; ellipse(c, x - f * 1.5, y - r * .7, 2, 1.1); c.fill();
      break;
    case 'swept': // 옆으로 쓸어 넘긴 짧은 머리
      cap(.48, .62, .6);
      ellipse(c, x + f * 3, y - r * .9, 3.6, 1.8, -f * .3); c.fill(); c.stroke();
      break;
  }
}

// 포탑 위로 상반신을 내민 지도자. y는 포탑 윗면(해치) 높이.
function drawRider(c, R, x, y, f, o) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = '#2b2b2b'; ellipse(c, x, y, 7.5, 2.2); c.fill();
  // 정장 몸통
  c.fillStyle = o.dead ? '#8d939b' : R.suit; c.strokeStyle = INK; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(x - 7, y); c.quadraticCurveTo(x - 7.5, y - 8, x - 3, y - 9); c.lineTo(x + 3, y - 9); c.quadraticCurveTo(x + 7.5, y - 8, x + 7, y); c.closePath(); c.fill(); c.stroke();
  // 셔츠·넥타이 / 깃 높은 옷 / 목걸이
  if (R.tie || R.necklace) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 2.4, y - 9); c.lineTo(x, y - 5); c.lineTo(x + 2.4, y - 9); c.closePath(); c.fill(); }
  if (R.tie) {
    c.fillStyle = R.tie; c.beginPath(); c.moveTo(x - .9, y - 8.4); c.lineTo(x + .9, y - 8.4); c.lineTo(x + 1.3, y - 3); c.lineTo(x, y - 1.6); c.lineTo(x - 1.3, y - 3); c.closePath(); c.fill();
  } else if (R.necklace) {
    c.fillStyle = '#fff'; c.strokeStyle = 'rgba(45,48,71,.5)'; c.lineWidth = .4;
    for (let i = -2; i <= 2; i++) { circle(c, x + i * 1.3, y - 7.6 + Math.abs(i) * -.35, .65); c.fill(); c.stroke(); }
  } else {
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .8; line(c, x, y - 8, x, y - 1);
    for (const by of [y - 6, y - 3]) { c.fillStyle = 'rgba(255,255,255,.5)'; circle(c, x + .9, by, .5); c.fill(); }
  }
  // 손 흔들기
  const wave = o.dead ? 0 : Math.sin((o.t || 0) * 5 + x) * 2;
  c.strokeStyle = INK; c.lineWidth = 3.8; line(c, x + f * 5.5, y - 6.5, x + f * 9.5, y - 13 + wave);
  c.strokeStyle = o.dead ? '#8d939b' : R.suit; c.lineWidth = 2.2; line(c, x + f * 5.5, y - 6.5, x + f * 9.5, y - 13 + wave);
  c.fillStyle = SKIN; c.strokeStyle = INK; c.lineWidth = 1; circle(c, x + f * 9.8, y - 14 + wave, 1.9); c.fill(); c.stroke();
  // 머리
  const hr = R.round ? 7.5 : 7, hx = x, hy = y - 9 - hr + 1.5;
  if (R.hair === 'bob') { c.fillStyle = R.hairColor; c.strokeStyle = INK; c.lineWidth = 1.4; ellipse(c, hx, hy + 1.2, hr + 2.4, hr + 1.8); c.fill(); c.stroke(); }
  c.fillStyle = SKIN; c.strokeStyle = INK; c.lineWidth = 1.6;
  ellipse(c, hx, hy, hr * (R.round ? 1.08 : 1), hr); c.fill(); c.stroke();
  drawHair(c, R, hx, hy, hr, f);
  // 얼굴: 바라보는 쪽으로 살짝
  const fx = hx + f * 1.3, ey = hy + 1;
  c.fillStyle = 'rgba(255,120,140,.45)'; ellipse(c, fx - 4.3, ey + 2.6, 1.5, 1); c.fill(); ellipse(c, fx + 4.3, ey + 2.6, 1.5, 1); c.fill();
  c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 1.1;
  for (const [ex, side] of [[fx - 2.5, -1], [fx + 2.5, 1]]) {
    if (o.dead) { line(c, ex - 1, ey - 1, ex + 1, ey + 1); line(c, ex + 1, ey - 1, ex - 1, ey + 1); }
    else if (o.hurt) { line(c, ex - side * 1.1, ey - 1.2, ex + side * .9, ey); line(c, ex + side * .9, ey, ex - side * 1.1, ey + 1.2); }
    else if (o.blink) line(c, ex - 1, ey, ex + 1, ey);
    else { circle(c, ex + f * .4, ey, 1.05); c.fill(); }
  }
  if (R.glasses) {
    c.strokeStyle = INK; c.lineWidth = .9;
    c.strokeRect(fx - 4.4, ey - 1.6, 3.7, 3); c.strokeRect(fx + .7, ey - 1.6, 3.7, 3); line(c, fx - .7, ey - .5, fx + .7, ey - .5);
  }
  if (o.dead || o.hurt) { c.fillStyle = INK; ellipse(c, fx, ey + 3.4, 1.1, 1.4); c.fill(); }
  else { c.lineWidth = 1; c.beginPath(); c.arc(fx, ey + 2.1, 1.8, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  if (o.dead) { c.strokeStyle = '#fcc419'; c.lineWidth = 1.6; ellipse(c, hx, hy - hr - 4 - Math.sin((o.t || 0) * 3), 5, 1.6); c.stroke(); }
}

const CAMO = [[-15, -12, 6, 2.6, 1], [3, -12.5, 7, 2.4, 2], [17, -11, 4, 2, 1], [-7, -19, 5, 2.5, 2], [8, -20, 4.5, 2, 1], [-1, -15, 3, 1.6, 2]];

// 나라별 탱크 + 지도자. 설정 화면 미리보기와 앱 아이콘에서도 쓴다.
// o: { t: 시간(초), blink, hurt, dead, noRider }
export function drawVehicle(c, id, x, y, angle, o = {}) {
  const T = TANKS[id] || TANKS.kr, r = angle * DEG, f = Math.cos(r) >= 0 ? 1 : -1;
  const col = k => (o.dead ? ['#a3a9b0', '#8a9097', '#6f757c'][k] : T.camo[k]);
  const P = (dx, dy) => [x + f * dx, y + dy];
  const poly = pts => { c.beginPath(); pts.forEach(([dx, dy], i) => { const [px, py] = P(dx, dy); if (i) c.lineTo(px, py); else c.moveTo(px, py); }); c.closePath(); };
  const camo = () => { c.save(); c.clip(); for (const [dx, dy, rx, ry, k] of CAMO) { c.fillStyle = col(k); const [px, py] = P(dx, dy); ellipse(c, px, py, rx, ry, .3); c.fill(); } c.restore(); };
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = 'rgba(45,48,71,.18)'; ellipse(c, x, y + 1, 28, 4); c.fill();
  // 포신(회전축은 포탑 가운데)
  const px = x, py = y - BODY.pivot, ex = px + Math.cos(r) * BODY.barrel, ey = py - Math.sin(r) * BODY.barrel;
  c.strokeStyle = INK; c.lineWidth = 7.5; line(c, px, py, ex, ey);
  c.strokeStyle = o.dead ? '#7d838a' : '#4a5040'; c.lineWidth = 4.2; line(c, px, py, ex, ey);
  c.fillStyle = col(0); c.strokeStyle = INK; c.lineWidth = 1.4;
  circle(c, px + Math.cos(r) * BODY.barrel * .58, py - Math.sin(r) * BODY.barrel * .58, 3.3); c.fill(); c.stroke();
  c.fillStyle = INK; circle(c, ex, ey, 2.9); c.fill();
  // 궤도와 바퀴
  c.fillStyle = '#3b3d42'; c.strokeStyle = INK; c.lineWidth = 1.8;
  c.beginPath(); c.roundRect ? c.roundRect(x - 25, y - 10, 50, 10, 5) : c.rect(x - 25, y - 10, 50, 10); c.fill(); c.stroke();
  for (let i = 0; i < 6; i++) {
    const wx = x - 18.5 + i * 7.4;
    c.fillStyle = '#8d939b'; c.lineWidth = 1.1; circle(c, wx, y - 5, 3.1); c.fill(); c.stroke();
    c.fillStyle = '#5c6168'; circle(c, wx, y - 5, 1.1); c.fill();
  }
  // 차체
  poly([[-25, -9], [25, -9], [28, -12], [21, -16], [-23, -16], [-26, -12]]);
  const hull = [[-25, -9], [25, -9], [28, -12], [21, -16], [-23, -16], [-26, -12]];
  c.fillStyle = col(0); c.fill(); camo(); poly(hull); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  // 깃발(포탑 뒤 안테나)
  const [fx0, fy0] = P(-11, -T.top);
  c.strokeStyle = INK; c.lineWidth = 1.2; line(c, fx0, fy0, fx0, fy0 - 18);
  c.save(); c.translate(fx0, fy0 - 18); c.scale(-f, 1); c.transform(1, Math.sin((o.t || 0) * 5 + x) * .08, 0, 1, 0, 0);
  if (o.dead) c.globalAlpha = .5;
  drawFlag(c, T.flag); c.restore();
  // 포탑
  poly(T.turret); c.fillStyle = col(0); c.fill(); camo(); poly(T.turret); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.25)'; poly(T.turret.map(([dx, dy]) => [dx * .7, dy - 1.5 + (dy + T.top) * -.6])); c.fill();
  // 지도자
  if (!o.noRider) { const [rx, ry] = P(-3, -T.top); drawRider(c, T.rider, rx, ry, f, o); }
  // 부서진 탱크 연기
  if (o.dead) {
    for (let i = 0; i < 3; i++) {
      const k = ((o.t || 0) * .6 + i / 3) % 1;
      c.fillStyle = `rgba(120,125,135,${.45 * (1 - k)})`; circle(c, x + f * 8 + Math.sin(k * 6 + i) * 3, y - 24 - k * 30, 4 + k * 6); c.fill();
    }
  }
  c.restore();
}

function drawTank(c, b, t, active, v) {
  const { x, y } = t, k = 1 / v.s, shake = t.hurtT < .3 ? Math.sin(b.now * 80) * 1.2 : 0;
  drawVehicle(c, t.pl.tank, x + shake, y, t.angle, { t: b.now, dead: t.dead, blink: t.blinkT < 0, hurt: t.hurtT < .6 });
  if (t.dead) return;
  // 방어막: 단계가 높을수록 두껍고, 깎일수록 얇아진다
  if (t.shield > 0) {
    const S = SHIELDS[t.shieldTier] || SHIELDS[1], frac = t.shield / t.shieldMax, pulse = 1 + Math.sin(b.now * 3) * .03;
    c.fillStyle = rgba(S.color, .12); c.strokeStyle = S.color; c.lineWidth = S.width * (.45 + .55 * frac);
    circle(c, x, y - 20, 38 * pulse); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - 20, 32 * pulse, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
  }
  const bw = 40, by = y - 62;
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.6;
  pill(c, x - bw / 2 - 1.5, by - 1.5, bw + 3, 7); c.fill(); c.stroke();
  const hp = t.hp / t.maxHp;
  c.fillStyle = hp > .5 ? '#51cf66' : hp > .25 ? '#fcc419' : '#ff6b6b';
  if (hp > 0) { pill(c, x - bw / 2, by, Math.max(4, bw * hp), 4); c.fill(); }
  if (t.shieldMax) {
    c.fillStyle = (SHIELDS[t.shieldTier] || SHIELDS[1]).color;
    if (t.shield > 0) { pill(c, x - bw / 2, by + 5.5, Math.max(3, bw * t.shield / t.shieldMax), 3); c.fill(); }
  }
  // 이름표: 플레이어 색
  const fs = 12 * Math.max(1, k * .9), ny = by - 4;
  c.font = `${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  const tw = c.measureText(t.pl.name).width + 10 * Math.max(1, k * .9);
  c.fillStyle = t.pl.color; c.strokeStyle = INK; c.lineWidth = 1.4;
  pill(c, x - tw / 2, ny - fs - 3, tw, fs + 4); c.fill(); c.stroke();
  c.lineWidth = 3; c.strokeStyle = '#fff'; c.strokeText(t.pl.name, x, ny - 1); c.fillStyle = INK; c.fillText(t.pl.name, x, ny - 1);
  if (active) {
    const ay = ny - fs - 10 + Math.sin(b.now * 6) * 3;
    c.fillStyle = t.pl.color; c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 7, ay - 8); c.lineTo(x + 7, ay - 8); c.lineTo(x, ay); c.closePath(); c.fill(); c.stroke();
  }
}

// 무기마다 다른 탄 모양(조합 무기는 성질로 판단)
function drawShot(c, p, now) {
  const w = p.w, a = p.spin + now * 8;
  c.save(); c.translate(p.x, p.y); c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = 1.8;
  if (w.drone) {
    c.rotate(Math.atan2(p.vy, p.vx) * .3);
    c.fillStyle = '#495057'; c.beginPath(); c.roundRect ? c.roundRect(-7, -3, 14, 6, 3) : c.rect(-7, -3, 14, 6); c.fill(); c.stroke();
    c.fillStyle = `rgba(200,210,220,${.5 + .4 * Math.sin(now * 60)})`;
    ellipse(c, -7, -5, 6, 1.4); c.fill(); ellipse(c, 7, -5, 6, 1.4); c.fill();
    c.fillStyle = Math.sin(now * 10) > 0 ? '#ff6b6b' : '#ffc9c9'; circle(c, 0, 0, 1.6); c.fill();
  } else if (w.heal) {
    c.fillStyle = '#ff8cc8'; c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-9, -1, -4, -8, 0, -3); c.bezierCurveTo(4, -8, 9, -1, 0, 6); c.fill(); c.stroke();
  } else if (w.teleport) {
    c.fillStyle = '#b197fc'; circle(c, 0, 0, 5.5); c.fill(); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.rotate(a);
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); line(c, 7, 0, 10, 0); }
  } else if (w.knock) {
    c.rotate(Math.atan2(p.vy, p.vx));
    c.fillStyle = '#fff'; c.fillRect(-9, -3.5, 4, 7); c.strokeRect(-9, -3.5, 4, 7);
    c.fillStyle = '#e03131'; ellipse(c, 0, 0, 6.5, 5.5); c.fill(); c.stroke(); ellipse(c, 1, -4.5, 2.6, 2); c.fill(); c.stroke();
  } else if (w.bounces && w.burst) {
    c.rotate(a); c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.arc(0, 3, 6, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.strokeStyle = '#ffe066'; c.lineWidth = 3.6; c.stroke();
  } else if (w.burst) {
    c.rotate(a); c.fillStyle = '#51cf66'; circle(c, 0, 0, 6.5); c.fill(); c.stroke();
    c.strokeStyle = '#2b8a3e'; c.lineWidth = 1.4; for (const dx of [-3, 0, 3]) line(c, dx, -5.5, dx, 5.5);
  } else if (w.r >= 90) {
    c.rotate(a * .3); c.fillStyle = '#ffd43b'; circle(c, 0, 0, w.r >= 150 ? 9 : 7); c.fill(); c.stroke();
    c.fillStyle = INK;
    for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, w.r >= 150 ? 7 : 5.5, -.45, .45); c.closePath(); c.fill(); }
    c.fillStyle = '#ffd43b'; circle(c, 0, 0, 1.6); c.fill();
  } else if (w.drill) {
    c.rotate(Math.atan2(p.vy, p.vx)); c.fillStyle = '#a0785a'; ellipse(c, 0, 0, 6.5, 5); c.fill(); c.stroke();
    c.fillStyle = '#ffa8c5'; circle(c, 6.5, 0, 1.8); c.fill(); c.fillStyle = INK; circle(c, 2.5, -2, .9); c.fill();
  } else if (w.bomblets && w.radial) {
    c.rotate(a); c.fillStyle = '#ff8cc8'; star(c, 0, 0, 7); c.stroke();
  } else if (w.gravK === 0) {
    const sp = Math.hypot(p.vx, p.vy) || 1, dx = -p.vx / sp * 18, dy = -p.vy / sp * 18;
    c.strokeStyle = 'rgba(255,77,109,.5)'; c.lineWidth = 8; line(c, dx, dy, 0, 0);
    c.strokeStyle = '#fff'; c.lineWidth = 3; line(c, dx, dy, 0, 0);
  } else {
    c.fillStyle = w.hops ? '#868e96' : '#ffd43b'; circle(c, 0, 0, 5.5); c.fill(); c.stroke();
    c.fillStyle = '#fff'; circle(c, -1.6, -1.6, 1.6); c.fill();
  }
  c.restore();
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
  // 가로 화면은 오른쪽 아래(조작판 바로 위, 땅속이라 가릴 게 없다), 세로 화면은 오른쪽 위
  const w = 128, cx = v.w - w / 2 - 10, y = v.w > v.h ? v.h - v.padB - 22 : v.padT + 19;
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
  // 가로 화면은 왼쪽 아래(조작판 바로 위), 세로 화면은 왼쪽 위
  const mw = Math.min(200, v.w * .42), mh = 30, M = b.minimap = { x: 10, y: v.w > v.h ? v.h - v.padB - mh - 8 : v.padT + 4, w: mw, h: mh };
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
  b.tanks.filter(t => t.dead).forEach(t => drawTank(c, b, t, false, v)); // 부서진 탱크는 뒤에
  b.tanks.filter(t => !t.dead).forEach(t => drawTank(c, b, t, t === cur && b.state === 'aim', v));
  for (const p of b.projs) {
    const tr = p.trail, n = tr.length;
    for (let i = Math.max(0, n - 24); i < n; i += 2) {
      const a = (i - (n - 24)) / 24;
      c.fillStyle = p.drilling !== null ? `rgba(120,90,60,${a * .6})` : `rgba(255,255,255,${a * .9})`;
      c.beginPath(); c.arc(tr[i][0], tr[i][1], 1.5 + a * 2.5, 0, TAU); c.fill();
    }
    drawShot(c, p, b.now);
  }
  for (const o of b.booms) {
    const k = o.t / o.dur, e = 1 - (1 - k) ** 3;
    if (o.heal) { // 하트가 퐁퐁
      c.globalAlpha = 1 - k;
      c.fillStyle = 'rgba(105,219,124,.25)'; circle(c, o.x, o.y, o.r * (.4 + .6 * e)); c.fill();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU, hx = o.x + Math.cos(a) * o.r * .55 * e, hy = o.y - 25 * e - Math.sin(a) * o.r * .25;
        c.fillStyle = '#ff8cc8'; c.strokeStyle = INK; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(hx, hy + 5); c.bezierCurveTo(hx - 7, hy - 1, hx - 3, hy - 7, hx, hy - 2.5); c.bezierCurveTo(hx + 3, hy - 7, hx + 7, hy - 1, hx, hy + 5); c.fill(); c.stroke();
      }
      c.globalAlpha = 1; continue;
    }
    if (o.tele) { // 보라색 고리와 반짝이
      c.globalAlpha = 1 - k; c.strokeStyle = '#9775fa'; c.lineWidth = 4;
      circle(c, o.x, o.y, o.r * e); c.stroke();
      c.fillStyle = '#e5dbff';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + k * 3; star(c, o.x + Math.cos(a) * o.r * .8 * e, o.y + Math.sin(a) * o.r * .8 * e, 3.5); }
      c.globalAlpha = 1; continue;
    }
    if (o.nuke) { // 핵: 화면이 하얗게 번쩍, 버섯구름
      if (k < .45) { c.fillStyle = `rgba(255,250,225,${(1 - k / .45) * .6})`; c.fillRect(b.cam.x - 200, v.yTop, v.vw + 400, v.h / s + 200); }
      const R = o.base * 1.8, top = o.y - R * (.4 + 1.1 * e), cr = R * (.35 + .25 * e);
      c.globalAlpha = Math.min(1, 1.6 - k * 1.6);
      c.fillStyle = '#ffd8a8'; c.fillRect(o.x - cr * .28, top, cr * .56, o.y - top);
      for (const [dx, dy, rr] of [[0, 0, 1], [-.7, .25, .65], [.7, .25, .65], [-.35, -.35, .6], [.35, -.35, .6]]) {
        c.fillStyle = dy < 0 ? '#fff4e6' : '#ffc078'; circle(c, o.x + dx * cr, top + dy * cr, cr * rr); c.fill();
      }
      c.globalAlpha = 1;
    }
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
      const word = o.nuke ? '콰콰쾅!!' : POW[Math.abs(Math.round(o.x + o.y)) % POW.length], fs = Math.min(o.nuke ? 110 : 70, 18 + o.r * .3);
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
