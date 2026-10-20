import { W, VIEW, H, TAU, rand, clamp } from './config.js';

// 먼 언덕은 카메라보다 느리게 움직인다(원근감).
export const PARALLAX = .3;
const BGW = Math.ceil(VIEW * 1.6 + (W - VIEW) * PARALLAX);

// 라운드마다 하나를 무작위로 고른다. 밝은 만화 풍.
const SCENES = [
  { name: '해바라기 들판', sky: ['#5cc8ff', '#a5e3ff', '#e9f9ff'], sun: '#ffe066', sunGlow: '255,236,140',
    hills: ['#b9eab0', '#8fdc8a'], trees: ['#5fbf6a', '#ffb3c7'], ground: ['#c99063', '#a8714a', '#7d5236'],
    crust: '#6fd36b', crustEdge: '#4fb84d', deco: ['#ffe066', '#ffffff', '#ff8fab'], rim: 'rgba(110,62,30,.45)', bedrock: '#6b4430' },
  { name: '솜사탕 사막', sky: ['#ff9ec7', '#ffc9e0', '#fff1e3'], sun: '#fff3a3', sunGlow: '255,240,200',
    hills: ['#ffd9b3', '#ffc08f'], trees: ['#7ed6a7', '#ff9f9f'], ground: ['#ffd98a', '#f2b45e', '#d48a45'],
    crust: '#fff1b8', crustEdge: '#ffd27a', deco: ['#ff9ec7', '#ffffff', '#8fd3ff'], rim: 'rgba(170,90,40,.4)', bedrock: '#b9733a' },
  { name: '눈사람 언덕', sky: ['#6cc4ff', '#bfe6ff', '#f5fbff'], sun: '#fff8c2', sunGlow: '255,250,220',
    hills: ['#cfe3f8', '#a9cbef'], trees: ['#6fbf9a', '#ffffff'], ground: ['#f7fbff', '#d6e8fa', '#a3c1e6'],
    crust: '#ffffff', crustEdge: '#d9ecff', deco: ['#9fd3ff', '#ffffff', '#ffb3c7'], rim: 'rgba(80,120,170,.35)', bedrock: '#7f9fc9' },
];

export class Terrain {
  constructor() {
    this.scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    this.version = 0; // 지형이 바뀔 때마다 증가(미니맵 캐시용)
    this.clouds = Array.from({ length: 9 }, () => ({ x: rand(0, BGW * 1.4), y: rand(-320, 140), s: rand(.7, 1.5), v: rand(4, 12) }));
    this.makeBackground();
    this.makeGround();
  }

  // 먼 언덕(하늘은 렌더러가 화면에 맞춰 그린다). 월드와 같은 높이 좌표를 쓴다.
  makeBackground() {
    const s = this.scene, cv = this.bg = document.createElement('canvas');
    cv.width = BGW; cv.height = H;
    const b = cv.getContext('2d');
    hills(b, H * .52, 70, s.hills[0], s.trees, 4);
    hills(b, H * .64, 50, s.hills[1], s.trees, 0);
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
        Math.sin(x * .0201 + ph[1]) * 16 + Math.sin(x * .047 + ph[2]) * 4;
      hs[x] = clamp(h, 150, H - 50);
      for (let y = Math.ceil(hs[x]); y < H; y++) this.solid[y * W + x] = 1;
    }
    const surface = () => { c.beginPath(); c.moveTo(0, H); for (let x = 0; x < W; x++) c.lineTo(x, hs[x]); c.lineTo(W, H); c.closePath(); };
    const g = c.createLinearGradient(0, base - a1, 0, H);
    g.addColorStop(0, s.ground[0]); g.addColorStop(.55, s.ground[1]); g.addColorStop(1, s.ground[2]);
    surface(); c.fillStyle = g; c.fill();
    c.globalCompositeOperation = 'source-atop';
    // 흙 속 조약돌과 얼룩
    for (let i = 0; i < 520; i++) {
      const x = rand(0, W), y = rand(base - a1, H), r = rand(2, 7);
      c.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.16)' : 'rgba(60,30,10,.12)';
      c.beginPath(); c.ellipse(x, y, r * 1.3, r, rand(0, TAU), 0, TAU); c.fill();
    }
    // 잔디(또는 눈·설탕) 띠: 표면을 따라 두꺼운 물결 띠
    c.lineJoin = 'round';
    c.strokeStyle = s.crustEdge; c.lineWidth = 26;
    c.beginPath(); for (let x = 0; x < W; x += 2) c.lineTo(x, hs[x] + 3); c.stroke();
    c.strokeStyle = s.crust; c.lineWidth = 18;
    c.beginPath(); for (let x = 0; x < W; x += 2) c.lineTo(x, hs[x]); c.stroke();
    // 띠 아래 둥근 물결 무늬
    c.fillStyle = s.crust;
    for (let x = 0; x < W; x += 14) { c.beginPath(); c.arc(x + 7, hs[x | 0] + 9, 7, 0, Math.PI); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    // 꽃·풀잎 장식(지형 위로 살짝 솟아 있지만 충돌에는 영향 없음)
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rand(10, W - 10)), y = hs[x];
      if (Math.random() < .5) {
        c.strokeStyle = s.crustEdge; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y - 7); c.moveTo(x, y); c.lineTo(x + 2, y - 8); c.stroke();
      } else {
        const col = s.deco[Math.floor(Math.random() * s.deco.length)];
        c.strokeStyle = s.crustEdge; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 7); c.stroke();
        c.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y - 8 + Math.sin(a) * 2.6, 2, 0, TAU); c.fill(); }
        c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(x, y - 8, 1.6, 0, TAU); c.fill();
      }
    }
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

  // 구덩이 테두리를 살짝 짙게(만화풍이라 검게 그을리지는 않는다)
  scorch(x, y, r) {
    const c = this.ctx;
    c.save(); c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = this.scene.rim; c.lineWidth = 6;
    c.beginPath(); c.arc(x, y, r + 2, 0, TAU); c.stroke(); c.restore();
  }

  addDirt(x, y, r) {
    this.fillCircle(x, y, r, 1);
    const c = this.ctx, s = this.scene, g = c.createRadialGradient(x - r * .3, y - r * .4, 2, x, y, r);
    g.addColorStop(0, s.ground[0]); g.addColorStop(1, s.ground[1]);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = s.crust; c.lineWidth = 6; c.beginPath(); c.arc(x, y, r - 3, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
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

// 둥근 언덕 띠와 막대사탕 나무
function hills(b, base, amp, color, trees, treeEvery) {
  const p1 = rand(0, TAU), p2 = rand(0, TAU), ys = [];
  b.fillStyle = color; b.beginPath(); b.moveTo(0, H);
  for (let x = 0; x <= BGW; x += 3) {
    const y = base + Math.sin(x * .006 + p1) * amp + Math.sin(x * .017 + p2) * amp * .3;
    ys.push(y); b.lineTo(x, y);
  }
  b.lineTo(BGW, H); b.closePath(); b.fill();
  if (!treeEvery) return;
  for (let i = 0; i < BGW / 90; i++) {
    const x = rand(0, BGW), y = ys[Math.min(ys.length - 1, Math.round(x / 3))] + 4, r = rand(9, 15);
    b.fillStyle = 'rgba(120,80,60,.55)'; b.fillRect(x - 1.5, y - r - 8, 3, r + 8);
    b.fillStyle = trees[Math.random() < .75 ? 0 : 1]; b.beginPath(); b.arc(x, y - r - 10, r, 0, TAU); b.fill();
    b.fillStyle = 'rgba(255,255,255,.35)'; b.beginPath(); b.arc(x - r * .35, y - r * 1.35 - 10, r * .35, 0, TAU); b.fill();
  }
}
