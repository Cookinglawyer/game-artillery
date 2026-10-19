import { W, VIEW, H, MAX_WIND, TAU, DEG, rand } from './config.js';
import { PARALLAX } from './terrain.js';

// 화면 왼쪽 위 미니맵 영역(클릭하면 그 위치로 카메라 이동)
export const MINIMAP = { x: 12, y: 10, w: 270, h: 40 };

// 탱크 종류별 실루엣. 설정 화면의 미리보기에도 쓴다.
export function drawTankShape(c, typeId, color, x, y, angle) {
  const r = angle * DEG, cy = y - 10, face = Math.cos(r) >= 0 ? 1 : -1;
  const barrel = (len, wid, cap) => {
    c.lineCap = cap;
    c.beginPath(); c.moveTo(x, cy); c.lineTo(x + Math.cos(r) * len, cy - Math.sin(r) * len);
    c.strokeStyle = '#1b1626'; c.lineWidth = wid + 2.5; c.stroke();
    c.strokeStyle = color; c.lineWidth = wid; c.stroke();
  };
  const hull = (hw, top, bw) => {
    c.beginPath(); c.moveTo(x - hw, y - top); c.lineTo(x + hw, y - top); c.lineTo(x + bw, y - 2); c.lineTo(x - bw, y - 2); c.closePath(); c.fill();
  };
  let tw = 22;
  if (typeId === 'missile') {
    barrel(15, 6, 'butt');
    c.fillStyle = color; c.fillRect(x - 13, y - 8, 26, 6); c.fillRect(x - 5 - face * 4, y - 12, 10, 4);
    tw = 24;
  } else if (typeId === 'drill') {
    barrel(15, 4, 'round');
    c.fillStyle = color; hull(14, 10, 11);
    c.beginPath(); c.moveTo(x + face * 13, y - 10); c.lineTo(x + face * 22, y - 6); c.lineTo(x + face * 13, y - 2); c.closePath();
    c.fillStyle = '#c9c2d6'; c.fill();
    c.fillStyle = color; c.beginPath(); c.arc(x, y - 10, 5.5, Math.PI, 0); c.fill();
    tw = 26;
  } else if (typeId === 'bouncer') {
    barrel(16, 3.5, 'round');
    c.fillStyle = color; c.beginPath(); c.arc(x, y - 9, 8, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - 2.5, y - 11.5, 2.5, 0, TAU); c.fill();
    tw = 20;
  } else {
    barrel(17, 4.5, 'round');
    c.fillStyle = color; c.beginPath(); c.arc(x, y - 8, 6.5, Math.PI, 0); c.fill(); hull(12, 8, 9);
  }
  if (typeId !== 'bouncer') { c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - tw / 2 + 1, y - 8, tw - 2, 1.5); }
  c.fillStyle = '#1b1626'; c.fillRect(x - tw / 2, y - 4, tw, 5);
  c.fillStyle = '#6d5d84';
  for (let i = -tw / 2 + 4; i <= tw / 2 - 4; i += 6) c.fillRect(x + i - 1.5, y - 3, 3, 3);
}

function drawTank(c, b, t, active) {
  const { x, y } = t;
  if (t.dead) {
    c.fillStyle = '#2b2533';
    c.beginPath(); c.moveTo(x - 12, y - 6); c.lineTo(x + 10, y - 8); c.lineTo(x + 9, y); c.lineTo(x - 9, y); c.closePath(); c.fill();
    return;
  }
  drawTankShape(c, t.pl.tank, t.pl.color, x, y, t.angle);
  if (t.shield) {
    c.fillStyle = 'rgba(155,231,255,.12)'; c.strokeStyle = 'rgba(155,231,255,.8)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y - 8, 18, 0, TAU); c.fill(); c.stroke();
  }
  const bw = 30;
  c.fillStyle = 'rgba(10,8,20,.75)'; c.fillRect(x - bw / 2 - 1, y - 31, bw + 2, 5);
  const k = t.hp / t.maxHp;
  c.fillStyle = k > .5 ? '#7be38a' : k > .25 ? '#ffd166' : '#ff5a5a';
  c.fillRect(x - bw / 2, y - 30, bw * k, 3);
  c.font = '700 11px "Noto Sans KR", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillStyle = 'rgba(241,228,207,.9)'; c.fillText(t.pl.name, x, y - 34);
  if (active) {
    const by = y - 50 + Math.sin(b.now * 6) * 3;
    c.fillStyle = t.pl.color;
    c.beginPath(); c.moveTo(x - 6, by - 7); c.lineTo(x + 6, by - 7); c.lineTo(x, by); c.closePath(); c.fill();
  }
}

function drawWind(c, wind) {
  const cx = VIEW / 2 + 60, y = 30;
  c.fillStyle = 'rgba(14,10,28,.6)';
  c.beginPath(); c.roundRect ? c.roundRect(cx - 92, 14, 184, 32, 16) : c.rect(cx - 92, 14, 184, 32); c.fill();
  c.textBaseline = 'middle';
  c.font = '700 12px "Noto Sans KR", sans-serif'; c.fillStyle = '#a99cc4'; c.textAlign = 'left'; c.fillText('바람', cx - 80, y);
  c.font = '700 13px "JetBrains Mono", monospace'; c.fillStyle = '#f1e4cf'; c.textAlign = 'right'; c.fillText(Math.round(Math.abs(wind)), cx + 80, y);
  const len = Math.abs(wind) / MAX_WIND * 46, dir = Math.sign(wind) || 1, ax = cx + 4;
  c.strokeStyle = '#ff9a3d'; c.fillStyle = '#ff9a3d'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(ax - dir * len / 2, y); c.lineTo(ax + dir * len / 2, y); c.stroke();
  if (len > 2) {
    c.beginPath(); c.moveTo(ax + dir * (len / 2 + 6), y); c.lineTo(ax + dir * (len / 2 - 2), y - 6); c.lineTo(ax + dir * (len / 2 - 2), y + 6); c.closePath(); c.fill();
  }
}

// 지형 윤곽은 지형이 바뀔 때만 다시 샘플링한다.
const mini = { terrain: null, version: -1, pts: [] };
function drawMinimap(c, b) {
  const M = MINIMAP, T = b.terrain, sx = M.w / W, sy = M.h / H;
  if (mini.terrain !== T || mini.version !== T.version) {
    mini.terrain = T; mini.version = T.version;
    mini.pts = Array.from({ length: M.w + 1 }, (_, i) => T.surfaceY(Math.min(W - 1, Math.round(i / sx))));
  }
  c.fillStyle = 'rgba(14,10,28,.7)'; c.fillRect(M.x, M.y, M.w, M.h);
  c.beginPath(); c.moveTo(M.x, M.y + M.h);
  mini.pts.forEach((y, i) => c.lineTo(M.x + i, M.y + y * sy));
  c.lineTo(M.x + M.w, M.y + M.h); c.closePath();
  c.fillStyle = 'rgba(241,228,207,.28)'; c.fill();
  for (const t of b.tanks) {
    if (t.dead) continue;
    const x = M.x + t.x * sx, y = M.y + Math.min(H, t.y) * sy;
    c.fillStyle = t.pl.color; c.fillRect(x - 2, y - 4, 4, 4);
    if (t === b.cur) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(x - 3.5, y - 5.5, 7, 7); }
  }
  for (const p of b.projs) { c.fillStyle = '#fff2c9'; c.fillRect(M.x + p.x * sx - 1, M.y + Math.max(0, p.y) * sy - 1, 2, 2); }
  c.strokeStyle = 'rgba(255,154,61,.9)'; c.lineWidth = 1.5;
  c.strokeRect(M.x + b.cam.x * sx + .5, M.y + .5, VIEW * sx - 1, M.h - 1);
}

const path = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };

export function render(c, b) {
  const T = b.terrain, cur = b.cur, cx = Math.round(b.cam.x);
  c.save();
  if (b.shake > .3) c.translate(rand(-b.shake, b.shake), rand(-b.shake, b.shake));
  c.drawImage(T.bg, -Math.round(cx * PARALLAX), 0);
  c.translate(-cx, 0);
  c.drawImage(T.cv, cx, 0, VIEW, H, cx, 0, VIEW, H);
  if (b.state === 'aim' && !cur.dead) {
    if (cur.lastTrail && cur.lastTrail.length > 1) {
      c.setLineDash([2, 6]); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.5;
      path(c, cur.lastTrail); c.stroke(); c.setLineDash([]);
    }
    if (!cur.pl.cpu) {
      const r = cur.angle * DEG, [bx, by] = b.tip(cur, cur.angle), L = 14 + cur.power * .55;
      c.setLineDash([4, 5]); c.strokeStyle = cur.pl.color; c.globalAlpha = .7; c.lineWidth = 2;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(r) * L, by - Math.sin(r) * L); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
    }
  }
  b.tanks.forEach(t => drawTank(c, b, t, t === cur && b.state === 'aim'));
  for (const p of b.projs) {
    c.strokeStyle = p.drilling !== null ? 'rgba(200,190,220,.6)' : 'rgba(255,226,170,.55)'; c.lineWidth = 1.5;
    path(c, p.trail.slice(-40)); c.lineTo(p.x, p.y); c.stroke();
    c.fillStyle = '#fff2c9'; c.beginPath(); c.arc(p.x, p.y, p.w.r > 60 ? 4.5 : 3, 0, TAU); c.fill();
    if (p.y < 0) { c.beginPath(); c.moveTo(p.x, 4); c.lineTo(p.x - 5, 12); c.lineTo(p.x + 5, 12); c.closePath(); c.fill(); }
  }
  for (const o of b.booms) {
    const k = o.t / o.dur;
    if (o.dirt) {
      c.fillStyle = `rgba(214,150,90,${.5 * (1 - k)})`;
      c.beginPath(); c.arc(o.x, o.y, o.r * (.7 + .4 * k), 0, TAU); c.fill();
      continue;
    }
    const rr = o.r * (.45 + .75 * Math.sqrt(k));
    const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, rr);
    g.addColorStop(0, `rgba(255,248,220,${1 - k})`);
    g.addColorStop(.45, `rgba(255,170,70,${.9 * (1 - k)})`);
    g.addColorStop(1, 'rgba(255,80,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, rr, 0, TAU); c.fill();
  }
  for (const p of b.parts) { c.fillStyle = p.color; c.fillRect(p.x - 1, p.y - 1, 2.5, 2.5); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '700 15px "JetBrains Mono", "Noto Sans KR", monospace';
  for (const f of b.floaters) {
    const fy = f.y - f.t * 26;
    c.globalAlpha = 1 - f.t / 1.3;
    c.strokeStyle = 'rgba(10,8,20,.8)'; c.lineWidth = 3; c.strokeText(f.text, f.x, fy);
    c.fillStyle = f.color; c.fillText(f.text, f.x, fy);
  }
  c.globalAlpha = 1;
  c.restore();
  // 화면 밖 현재 탱크 방향 표시
  const sx = cur.x - cx;
  if (!cur.dead && (sx < 0 || sx > VIEW)) {
    const ex = sx < 0 ? 14 : VIEW - 14, d = sx < 0 ? -1 : 1, ey = Math.min(H - 20, Math.max(70, cur.y - 10));
    c.fillStyle = cur.pl.color;
    c.beginPath(); c.moveTo(ex + d * 8, ey); c.lineTo(ex - d * 4, ey - 8); c.lineTo(ex - d * 4, ey + 8); c.closePath(); c.fill();
  }
  drawMinimap(c, b);
  drawWind(c, b.wind);
  c.font = '600 11px "Noto Sans KR", sans-serif'; c.textAlign = 'right'; c.textBaseline = 'top';
  c.fillStyle = 'rgba(241,228,207,.6)';
  c.fillText(`${T.scene.name} · 생존 ${b.alive.length}/${b.tanks.length}`, VIEW - 14, 16);
}
