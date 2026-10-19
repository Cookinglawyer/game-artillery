let actx = null, on = true;

export function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
}
export function toggleSound() { on = !on; ensureAudio(); return on; }

export function sfx(kind, size = 1) {
  if (!on || !actx || actx.state !== 'running') return;
  const t0 = actx.currentTime, out = actx.createGain();
  out.connect(actx.destination);
  const blip = (f1, f2, dur, type = 'square', vol = .08) => {
    const o = actx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    out.gain.setValueAtTime(vol, t0); out.gain.exponentialRampToValueAtTime(.001, t0 + dur + .02);
    o.connect(out); o.start(t0); o.stop(t0 + dur + .04);
  };
  switch (kind) {
    case 'fire': return blip(220, 55, .18);
    case 'bounce': return blip(520, 260, .08, 'triangle', .1);
    case 'pop': return blip(720, 300, .1, 'square', .05);
    case 'coin': return blip(880, 1320, .12, 'triangle', .08);
    case 'item': return blip(440, 880, .18, 'sine', .1);
  }
  const len = .45 + Math.min(size, 2.5) * .35;
  const buf = actx.createBuffer(1, actx.sampleRate * len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = actx.createBufferSource(), f = actx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t0); f.frequency.exponentialRampToValueAtTime(120, t0 + len);
  out.gain.setValueAtTime(Math.min(.6, .25 * size + .15), t0);
  src.buffer = buf; src.connect(f); f.connect(out); src.start(t0);
}
