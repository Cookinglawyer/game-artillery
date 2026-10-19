import { W, VIEW, H, TAU, rand, clamp } from './config.js';

// 배경은 카메라보다 느리게 움직인다(원근감).
export const PARALLAX = .3;
const BGW = Math.ceil(VIEW + (W - VIEW) * PARALLAX);

// 라운드마다 하나를 무작위로 고른다.
const SCENES = [
  { name: '노을 사막', sky: ['#141033', '#3f2458', '#b4504a', '#f09a52', '#f7c27a'], glow: '255,190,120', sun: '#ffd99a', sunY: .64,
    ridges: ['rgba(78,38,86,.7)', 'rgba(48,24,62,.9)'], ground: ['#d39250', '#a85a36', '#4e2428'], crust: '#f4c983', stars: 160 },
  { name: '새벽 협곡', sky: ['#1b2a4a', '#3d5a80', '#98a9c4', '#f2c6a0', '#f7dcc0'], glow: '255,232,200', sun: '#fff1d6', sunY: .6,
    ridges: ['rgba(70,90,130,.55)', 'rgba(45,60,95,.85)'], ground: ['#b9a27d', '#7f6a55', '#3b2f35'], crust: '#ebdfbb', stars: 40 },
  { name: '달밤 설원', sky: ['#05070f', '#0f1a33', '#1f2f55', '#3a4d78', '#56699a'], glow: '200,215,255', sun: '#e8eefc', sunY: .22,
    ridges: ['rgba(40,55,90,.75)', 'rgba(25,35,60,.92)'], ground: ['#dfe7f2', '#8d9bb3', '#2e3550'], crust: '#ffffff', stars: 240 },
];

export class Terrain {
  constructor() {
    this.scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    this.version = 0; // 지형이 바뀔 때마다 증가(미니맵 캐시용)
    this.makeBackground();
    this.makeGround();
  }

  makeBackground() {
    const s = this.scene, cv = this.bg = document.createElement('canvas');
    cv.width = BGW; cv.height = H;
    const b = cv.getContext('2d');
    const g = b.createLinearGradient(0, 0, 0, H);
    s.sky.forEach((c, i) => g.addColorStop([0, .45, .72, .9, 1][i], c));
    b.fillStyle = g; b.fillRect(0, 0, BGW, H);
    for (let i = 0; i < s.stars; i++) {
      b.fillStyle = `rgba(255,244,230,${rand(.15, .8)})`;
      const sz = Math.random() < .85 ? 1 : 2;
      b.fillRect(rand(0, BGW), rand(0, H * .45), sz, sz);
    }
    const sx = rand(BGW * .3, BGW * .7), sy = H * s.sunY;
    const sg = b.createRadialGradient(sx, sy, 0, sx, sy, 190);
    sg.addColorStop(0, `rgba(${s.glow},.85)`); sg.addColorStop(.25, `rgba(${s.glow},.4)`); sg.addColorStop(1, `rgba(${s.glow},0)`);
    b.fillStyle = sg; b.fillRect(0, 0, BGW, H);
    b.fillStyle = s.sun; b.beginPath(); b.arc(sx, sy, 30, 0, TAU); b.fill();
    s.ridges.forEach((c, i) => ridge(b, H * (.6 + i * .1), 46 - i * 14, c));
  }

  makeGround() {
    const s = this.scene;
    this.solid = new Uint8Array(W * H);
    const cv = this.cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = this.ctx = cv.getContext('2d');
    const ph = [rand(0, TAU), rand(0, TAU), rand(0, TAU), rand(0, TAU)];
    const base = rand(H * .56, H * .64), a1 = rand(45, 85);
    const hs = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const h = base + Math.sin(x * .0042 + ph[0]) * a1 + Math.sin(x * .0113 + ph[3]) * 30 +
        Math.sin(x * .0201 + ph[1]) * 16 + Math.sin(x * .047 + ph[2]) * 6;
      hs[x] = clamp(h, 150, H - 50);
      for (let y = Math.ceil(hs[x]); y < H; y++) this.solid[y * W + x] = 1;
    }
    const g = c.createLinearGradient(0, base - a1, 0, H);
    g.addColorStop(0, s.ground[0]); g.addColorStop(.5, s.ground[1]); g.addColorStop(1, s.ground[2]);
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x < W; x++) c.lineTo(x, hs[x]);
    c.lineTo(W, H); c.closePath(); c.fillStyle = g; c.fill();
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 24; i++) {
      const y0 = base - a1 + i * 17, p = rand(0, TAU);
      c.fillStyle = i % 2 ? 'rgba(40,14,30,.07)' : 'rgba(255,235,200,.05)';
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, y0 + Math.sin(x * .011 + p) * 7);
      c.lineTo(W, H); c.closePath(); c.fill();
    }
    c.strokeStyle = s.crust; c.lineWidth = 6;
    c.beginPath(); for (let x = 0; x < W; x++) c.lineTo(x, hs[x]); c.stroke();
    c.globalCompositeOperation = 'source-over';
  }

  isSolid(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || x >= W || y < 0) return false;
    if (y >= H) return true;
    return this.solid[y * W + x] === 1;
  }

  surfaceY(x) { for (let y = 0; y < H; y++) if (this.isSolid(x, y)) return y; return H; }

  fillCircle(x, y, r, v) {
    const r2 = r * r;
    for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(H - 1, Math.ceil(y + r)); yy++)
      for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(W - 1, Math.ceil(x + r)); xx++)
        if ((xx - x) ** 2 + (yy - y) ** 2 <= r2) this.solid[yy * W + xx] = v;
    this.version++;
  }

  carve(x, y, r) {
    this.fillCircle(x, y, r, 0);
    const c = this.ctx;
    c.save(); c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  }

  scorch(x, y, r) {
    const c = this.ctx;
    c.save(); c.globalCompositeOperation = 'source-atop';
    const g = c.createRadialGradient(x, y, r * .85, x, y, r + 9);
    g.addColorStop(0, 'rgba(24,10,14,.8)'); g.addColorStop(1, 'rgba(24,10,14,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r + 9, 0, TAU); c.fill(); c.restore();
  }

  addDirt(x, y, r) {
    this.fillCircle(x, y, r, 1);
    const c = this.ctx, g = c.createRadialGradient(x, y - r * .3, 2, x, y, r);
    g.addColorStop(0, this.scene.ground[0]); g.addColorStop(1, this.scene.ground[1]);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  // (x,y)는 지형 바로 바깥의 점. 주변 지형으로 법선을 추정해 속도를 반사하고 감쇠한다.
  reflect(x, y, vx, vy) {
    let nx = (this.isSolid(x - 4, y) ? 1 : 0) - (this.isSolid(x + 4, y) ? 1 : 0);
    let ny = (this.isSolid(x, y - 4) ? 1 : 0) - (this.isSolid(x, y + 4) ? 1 : 0);
    let len = Math.hypot(nx, ny);
    if (!len) { nx = 0; ny = -1; len = 1; }
    nx /= len; ny /= len;
    const d = vx * nx + vy * ny;
    return [(vx - 2 * d * nx) * .62, (vy - 2 * d * ny) * .62];
  }
}

function ridge(b, base, amp, color) {
  const p1 = rand(0, TAU), p2 = rand(0, TAU);
  b.fillStyle = color; b.beginPath(); b.moveTo(0, H);
  for (let x = 0; x <= BGW; x += 3) {
    const y = base + Math.sin(x * .004 + p1) * amp + Math.sin(x * .014 + p2) * amp * .4;
    b.lineTo(x, Math.max(y, base - amp * .55)); // 메사처럼 평평한 꼭대기
  }
  b.lineTo(BGW, H); b.closePath(); b.fill();
}
