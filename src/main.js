import { ECON, VIEW, PLAYER_COLORS, PLAYER_NAMES, MAX_LEVEL, COMBO_FEE } from './config.js';
import { WEAPONS, BASE_ORDER, weaponStats, upgradeCost, upgradeNote, statBits, comboId, isCombo } from './data/weapons.js';
import { TANKS, TANK_ORDER } from './data/tanks.js';
import { ITEMS, ITEM_ORDER } from './data/items.js';
import { Battle } from './battle.js';
import { render, drawTankShape, MINIMAP } from './render.js';
import { cpuShop } from './ai.js';
import { ensureAudio, toggleSound, sfx } from './audio.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
const cv = $('game'), ctx = cv.getContext('2d');
const OFF = 'off';
const CTRL = [['0', '사람'], ['1', '컴퓨터 · 쉬움'], ['2', '컴퓨터 · 보통'], ['3', '컴퓨터 · 어려움'], [OFF, '불참']];
const randomTank = () => TANK_ORDER[Math.floor(Math.random() * TANK_ORDER.length)];

const setup = PLAYER_NAMES.map((name, i) => ({ name, ctrl: i === 0 ? '0' : '2', tank: i === 0 ? 'cannon' : randomTank() }));
const game = { players: [], round: 0, rounds: 3, battle: null, shopIdx: 0, combo: ['cluster', 'drill'], fast: 1 };
window.game = game; // 디버깅용 핸들

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  $('menu').hidden = $('score').hidden = id === 'scrSetup';
  window.scrollTo({ top: 0 });
}
function updateScore() {
  const lead = [...game.players].sort((a, b) => b.wins - a.wins || b.totalDealt - a.totalDealt)[0];
  $('score').innerHTML = `<span class="k">라운드</span><span class="num">${Math.max(1, game.round)} / ${game.rounds}</span>` +
    (lead && lead.wins ? `<span class="k">선두</span><b style="color:${lead.color}">${esc(lead.name)}</b><span class="num">${lead.wins}승</span>` : '');
}
const chip = pl => `<i class="dot" style="background:${pl.color}"></i>`;

/* ---------- 설정 ---------- */
// 10자리 각각 사람 / 컴퓨터(난이도) / 불참. 참가자가 2명 이상이어야 시작할 수 있다.
function renderSetup() {
  $('roster').innerHTML = setup.map((s, i) => `
    <div class="rrow" id="slot${i}">
      <i class="dot" style="background:${PLAYER_COLORS[i]}"></i>
      <input id="name${i}" data-i="${i}" data-f="name" maxlength="8" value="${esc(s.name)}" aria-label="${i + 1}번 이름">
      <select id="ctrl${i}" data-i="${i}" data-f="ctrl" aria-label="${i + 1}번 참가 방식">${CTRL.map(([v, l]) => `<option value="${v}"${v === s.ctrl ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <select id="tank${i}" data-i="${i}" data-f="tank" aria-label="${i + 1}번 탱크">${TANK_ORDER.map(id => `<option value="${id}"${id === s.tank ? ' selected' : ''}>${TANKS[id].name}</option>`).join('')}</select>
    </div>`).join('');
  updateRoster();
}
function updateRoster() {
  setup.forEach((s, i) => {
    const off = s.ctrl === OFF;
    $('slot' + i).classList.toggle('off', off);
    $('name' + i).disabled = $('tank' + i).disabled = off;
  });
  const on = setup.filter(s => s.ctrl !== OFF), humans = on.filter(s => s.ctrl === '0').length;
  $('headcount').innerHTML = `참가 <b class="num">${on.length}</b>명 <span class="dim">· 사람 ${humans} · 컴퓨터 ${on.length - humans}</span>`;
  $('start').disabled = on.length < 2;
  $('startNote').textContent = on.length < 2 ? '참가자가 2명 이상이어야 시작할 수 있습니다. 불참으로 둔 자리를 사람이나 컴퓨터로 바꿔 주세요.' : '';
}
function renderTankGuide() {
  $('tankGuide').innerHTML = TANK_ORDER.map(id => {
    const t = TANKS[id];
    const bar = v => `<span class="sbar"><i style="width:${Math.round(Math.min(100, v))}%"></i></span>`;
    return `<div class="tcard">
      <canvas width="112" height="60" data-tank="${id}" aria-hidden="true"></canvas>
      <span class="tname">${t.name}<small>${t.role}</small></span>
      <span class="stats"><span>체력</span>${bar(t.hp / 1.25)}<span>기동</span>${bar(t.move / 1.4 * 100)}<span>장갑</span>${bar(10 + t.armor * 900)}</span>
      <span class="sig">${WEAPONS[t.sig[0]].name} <span class="dim">·</span> 특기 ${WEAPONS[t.sig[1]].name}</span>
    </div>`;
  }).join('');
  $('tankGuide').querySelectorAll('canvas').forEach((c, i) => {
    const g = c.getContext('2d'); g.scale(2, 2);
    drawTankShape(g, c.dataset.tank, PLAYER_COLORS[i], 28, 26, 40);
  });
}
$('roster').addEventListener('input', e => { const { i, f } = e.target.dataset; if (f) setup[+i][f] = e.target.value; });
$('roster').addEventListener('change', e => { const { i, f } = e.target.dataset; if (f) { setup[+i][f] = e.target.value; if (f === 'ctrl') updateRoster(); } });
$('allCpu').addEventListener('click', () => { setup.forEach((s, i) => { if (i > 0 || s.ctrl === OFF) s.ctrl = '2'; }); renderSetup(); });
$('shuffleTanks').addEventListener('click', () => { setup.forEach(s => { s.tank = randomTank(); }); renderSetup(); });
$('start').addEventListener('click', () => {
  ensureAudio();
  const slots = setup.map((s, i) => ({ ...s, slot: i })).filter(s => s.ctrl !== OFF);
  if (slots.length < 2) return;
  game.players = slots.map((s, i) => ({
    id: i, name: s.name.trim() || PLAYER_NAMES[s.slot], color: PLAYER_COLORS[s.slot], tank: s.tank, cpu: +s.ctrl,
    money: ECON.start, wins: 0, totalDealt: 0, totalKills: 0,
    inventory: {}, upgrades: {}, recipes: [], items: { repair: 0, shield: 0, fuel: 0 },
  }));
  game.round = 0; game.rounds = +$('rounds').value;
  goShop(0);
});

/* ---------- 상점 ---------- */
function goShop(idx) {
  while (idx < game.players.length && game.players[idx].cpu) cpuShop(game.players[idx++]);
  if (idx >= game.players.length) return startRound();
  game.shopIdx = idx;
  renderShop(); show('scrShop'); updateScore();
}
function renderShop() {
  const pl = game.players[game.shopIdx], type = TANKS[pl.tank];
  $('shopChip').style.background = pl.color;
  $('shopName').textContent = pl.name;
  $('shopTank').textContent = `${type.name} · ${type.role}`;
  $('shopGold').textContent = pl.money + 'G';
  $('shopRound').textContent = `라운드 ${game.round + 1} 준비`;
  const nextHuman = game.players.slice(game.shopIdx + 1).find(p => !p.cpu);
  $('shopNext').textContent = nextHuman ? `완료하면 ${nextHuman.name}의 상점으로 넘어갑니다. CPU는 알아서 장을 봅니다.` : '완료하면 전투가 시작됩니다.';
  $('shopWeapons').innerHTML = BASE_ORDER.map(id => weaponRow(pl, type, id)).join('');
  $('shopCombos').innerHTML = pl.recipes.length
    ? pl.recipes.map(id => comboRow(pl, id)).join('')
    : '<p class="hint empty">아직 등록한 조합법이 없습니다. 오른쪽 조합대에서 두 무기를 골라 등록하세요.</p>';
  $('shopItems').innerHTML = ITEM_ORDER.map(id => itemRow(pl, id)).join('');
  renderComboBench(pl);
}
const pipsHtml = lv => Array.from({ length: MAX_LEVEL }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('');
function weaponRow(pl, type, id) {
  const w = WEAPONS[id], lv = pl.upgrades[id] || 0, s = weaponStats(id, pl.upgrades), sig = type.sig.indexOf(id), own = pl.inventory[id] || 0;
  const tag = sig === 0 ? '<span class="tag">기본 무장</span>' : sig === 1 ? `<span class="tag">특기 · ${type.cd}턴 대기</span>` : '';
  const buy = sig === 0
    ? '<span class="own">무제한</span>'
    : `<span class="own">${own ? '보유 ' + own : ''}</span><button type="button" data-buy="${id}"${pl.money < w.price ? ' disabled' : ''}>${w.pack}발 · ${w.price}G</button>`;
  const cost = upgradeCost(id, lv);
  const up = lv >= MAX_LEVEL
    ? '<button type="button" disabled>최대 강화</button>'
    : `<button type="button" data-up="${id}"${pl.money < cost ? ' disabled' : ''}>강화 Lv${lv + 1} · ${cost}G</button>`;
  return `<div class="wrow${sig >= 0 ? ' mine' : ''}">
    <div class="wmain">
      <div class="wtitle"><b>${w.name}</b><span class="pips" role="img" aria-label="강화 ${lv}단계">${pipsHtml(lv)}</span>${tag}</div>
      <p class="wdesc">${w.desc}</p>
      <p class="wstat">${statBits(s).join(' · ')}${lv < MAX_LEVEL ? `<span class="next">다음 강화: ${upgradeNote(id, lv + 1)}</span>` : ''}</p>
    </div>
    <div class="wact">${buy}${up}</div>
  </div>`;
}
function comboRow(pl, id) {
  const s = weaponStats(id, pl.upgrades), own = pl.inventory[id] || 0;
  const lvs = s.parts.map(p => `${WEAPONS[p].name} Lv${pl.upgrades[p] || 0}`).join(' + ');
  return `<div class="wrow combo">
    <div class="wmain">
      <div class="wtitle"><b>${s.name}</b><span class="tag">조합</span></div>
      <p class="wdesc">${lvs}</p>
      <p class="wstat">${statBits(s).join(' · ')}</p>
    </div>
    <div class="wact"><span class="own">${own ? '보유 ' + own : ''}</span><button type="button" data-buy="${id}"${pl.money < s.price ? ' disabled' : ''}>${s.pack}발 · ${s.price}G</button></div>
  </div>`;
}
function itemRow(pl, id) {
  const it = ITEMS[id], own = pl.items[id] || 0;
  return `<div class="wrow">
    <div class="wmain"><div class="wtitle"><b>${it.name}</b></div><p class="wdesc">${it.desc}</p></div>
    <div class="wact"><span class="own">${own ? '보유 ' + own : ''}</span><button type="button" data-item="${id}"${pl.money < it.price ? ' disabled' : ''}>${it.price}G</button></div>
  </div>`;
}
function renderComboBench(pl) {
  const [a, b] = game.combo;
  const opts = sel => BASE_ORDER.map(id => `<option value="${id}"${id === sel ? ' selected' : ''}>${WEAPONS[id].name}</option>`).join('');
  $('comboA').innerHTML = opts(a); $('comboB').innerHTML = opts(b);
  const btn = $('comboMake');
  if (a === b) {
    $('comboPreview').innerHTML = '<p class="hint">서로 다른 두 무기를 고르세요.</p>';
    btn.disabled = true; btn.textContent = `조합법 등록 · ${COMBO_FEE}G`;
    return;
  }
  const id = comboId(a, b), s = weaponStats(id, pl.upgrades), known = pl.recipes.includes(id);
  $('comboPreview').innerHTML = `
    <b class="cname">${s.name}</b>
    <p class="wstat">${statBits(s).join(' · ')}</p>
    <p class="wdesc">등록 후 ${s.pack}발에 ${s.price}G. 재료 무기를 강화하면 함께 강해집니다.</p>`;
  btn.disabled = known || pl.money < COMBO_FEE;
  btn.textContent = known ? '이미 등록한 조합법' : `조합법 등록 · ${COMBO_FEE}G`;
}
$('comboA').addEventListener('change', e => { game.combo[0] = e.target.value; renderComboBench(game.players[game.shopIdx]); });
$('comboB').addEventListener('change', e => { game.combo[1] = e.target.value; renderComboBench(game.players[game.shopIdx]); });
$('comboMake').addEventListener('click', () => {
  const pl = game.players[game.shopIdx], [a, b] = game.combo, id = comboId(a, b);
  if (a === b || pl.recipes.includes(id) || pl.money < COMBO_FEE) return;
  pl.money -= COMBO_FEE; pl.recipes.push(id);
  ensureAudio(); sfx('item');
  renderShop();
  ($('shopCombos').querySelector(`[data-buy="${id}"]:not(:disabled)`) || $('comboA')).focus();
});
$('scrShop').addEventListener('click', e => {
  const b = e.target.closest('button[data-buy],button[data-up],button[data-item]');
  if (!b || b.disabled) return;
  const pl = game.players[game.shopIdx];
  let sel;
  if (b.dataset.buy) {
    const id = b.dataset.buy, w = isCombo(id) ? weaponStats(id, pl.upgrades) : WEAPONS[id];
    if (pl.money < w.price) return;
    pl.money -= w.price; pl.inventory[id] = (pl.inventory[id] || 0) + w.pack;
    sel = `[data-buy="${id}"]`;
  } else if (b.dataset.up) {
    const id = b.dataset.up, lv = pl.upgrades[id] || 0, cost = upgradeCost(id, lv);
    if (lv >= MAX_LEVEL || pl.money < cost) return;
    pl.money -= cost; pl.upgrades[id] = lv + 1;
    sel = `[data-up="${id}"]`;
  } else {
    const id = b.dataset.item, it = ITEMS[id];
    if (pl.money < it.price) return;
    pl.money -= it.price; pl.items[id]++;
    sel = `[data-item="${id}"]`;
  }
  ensureAudio(); sfx('coin');
  renderShop();
  ($('scrShop').querySelector(sel + ':not(:disabled)') || $('shopDone')).focus();
});
$('shopDone').addEventListener('click', () => goShop(game.shopIdx + 1));

/* ---------- 전투 ---------- */
function startRound() {
  game.round++;
  const b = new Battle(game.players, w => setTimeout(() => game.battle === b && onRoundEnd(w), 1400));
  game.battle = b;
  hudKey = ''; rosterKey = '';
  show('scrBattle'); updateScore();
}
function onRoundEnd(w) {
  const b = game.battle;
  // 순위: 생존자 → 늦게 쓰러진 순
  const ranked = [...(w ? [w] : []), ...[...b.deathOrder].reverse()];
  const rows = ranked.map((t, rank) => {
    const r = { rank: rank + 1, dmg: t.dealt * ECON.perDamage, kill: t.kills * ECON.kill, place: ECON.place[rank] || 0 };
    r.total = ECON.round + r.dmg + r.kill + r.place;
    t.pl.money += r.total; t.pl.totalDealt += t.dealt; t.pl.totalKills += t.kills;
    return { t, r };
  });
  if (w) w.pl.wins++;
  const last = game.round >= game.rounds;
  const standings = [...game.players].sort((a, c) => c.wins - a.wins || c.totalDealt - a.totalDealt);
  const champ = standings[0];
  const roundTable = `<div class="table-wrap"><table class="earn">
    <thead><tr><th scope="col">순위</th><th scope="col">플레이어</th><th scope="col">준 피해</th><th scope="col">격파</th><th scope="col">획득</th><th scope="col">보유</th></tr></thead>
    <tbody>${rows.map(({ t, r }) => `<tr${t === w ? ' class="sum"' : ''}>
      <td>${r.rank}</td><th scope="row">${chip(t.pl)}${esc(t.pl.name)} <small>${t.type.name}</small></th>
      <td>${t.dealt}</td><td>${t.kills || '–'}</td><td>+${r.total}G</td><td>${t.pl.money}G</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="hint">획득 = 참가 ${ECON.round}G + 준 피해 × ${ECON.perDamage} + 격파 × ${ECON.kill}G + 순위 보너스(1위 ${ECON.place[0]} · 2위 ${ECON.place[1]} · 3위 ${ECON.place[2]})</p>`;
  const finalTable = last ? `<h3>최종 순위</h3><div class="table-wrap"><table class="earn">
    <thead><tr><th scope="col">순위</th><th scope="col">플레이어</th><th scope="col">승리</th><th scope="col">누적 피해</th><th scope="col">누적 격파</th></tr></thead>
    <tbody>${standings.map((p, i) => `<tr${i === 0 ? ' class="sum"' : ''}><td>${i + 1}</td><th scope="row">${chip(p)}${esc(p.name)}</th><td>${p.wins}</td><td>${p.totalDealt}</td><td>${p.totalKills}</td></tr>`).join('')}</tbody>
  </table></div>` : '';
  $('resultCard').innerHTML = `
    <p class="eyebrow">${last ? '경기 종료' : `라운드 ${game.round} / ${game.rounds} 종료`}</p>
    <h2 style="color:${last ? champ.color : w ? w.pl.color : 'var(--sand)'}">${last ? esc(champ.name) + ' 최종 우승' : w ? esc(w.pl.name) + ' 생존' : '전멸'}</h2>
    ${finalTable}
    ${last ? '<h3>마지막 라운드</h3>' : ''}${roundTable}
    <button type="button" class="fire" id="resultNext">${last ? '새 게임' : '상점으로'}</button>`;
  $('resultNext').addEventListener('click', () => last ? toSetup() : goShop(0));
  game.battle = null;
  show('scrResult'); updateScore();
  $('resultNext').focus();
}
function toSetup() { game.battle = null; renderSetup(); show('scrSetup'); }

let hudKey = '';
function hud(b) {
  const t = b.cur, h = b.human();
  const key = [b.turn, b.state, t.angle.toFixed(1), t.power.toFixed(1), Math.round(t.fuel), t.hp, t.sel, t.cd, t.shield, t.itemUsed,
    JSON.stringify(t.pl.inventory), JSON.stringify(t.pl.items)].join('|');
  if (key === hudKey) return;
  hudKey = key;
  $('chip').style.background = t.pl.color;
  $('pName').textContent = t.pl.name;
  $('pType').textContent = `${t.type.name} · ${t.pl.cpu ? 'CPU' : '사람'}${t.shield ? ' · 방어막' : ''}`;
  $('hpVal').textContent = t.hp; $('hpBar').style.width = (t.hp / t.maxHp * 100) + '%';
  if (document.activeElement !== $('angVal')) $('angVal').value = fmt(t.angle);
  if (document.activeElement !== $('powVal')) $('powVal').value = fmt(t.power);
  $('powBar').style.width = t.power + '%';
  $('fuelBar').style.width = (t.fuel / t.fuelMax * 100) + '%';
  $('weapons').innerHTML = b.available(t).map((a, i) => {
    const s = b.stats(t, a.id), lv = isCombo(a.id) ? 0 : s.level;
    return `<button type="button" data-w="${a.id}" aria-pressed="${a.id === t.sel}"${a.ok ? '' : ' disabled'} class="${a.special ? 'special' : ''}${s.combo ? ' combo' : ''}" title="${statBits(s).join(' · ')}">
      ${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}${s.name}${lv ? `<sup>+${lv}</sup>` : ''}<em>${a.label}</em></button>`;
  }).join('');
  $('items').innerHTML = ITEM_ORDER.map(id => {
    const n = t.pl.items[id] || 0;
    return `<button type="button" data-use="${id}"${!h || t.itemUsed || !n ? ' disabled' : ''} title="${ITEMS[id].desc}">${ITEMS[id].short}<em>${n}</em></button>`;
  }).join('');
  $('deck').classList.toggle('locked', !h);
}
let rosterKey = '';
function roster(b) {
  const key = b.turn + '|' + b.tanks.map(t => t.hp).join();
  if (key === rosterKey) return;
  rosterKey = key;
  $('alive').innerHTML = game.players.map(pl => {
    const t = b.tanks.find(x => x.pl === pl);
    return `<button type="button" class="pill${t.dead ? ' dead' : ''}${t === b.cur ? ' now' : ''}" data-look="${pl.id}" style="--pc:${pl.color}">
      <span class="pn">${esc(pl.name)}</span><span class="ph"><i style="width:${t.hp / t.maxHp * 100}%"></i></span><span class="num">${t.dead ? '격파' : t.hp}</span></button>`;
  }).join('');
}
$('alive').addEventListener('click', e => {
  const btn = e.target.closest('[data-look]'), b = game.battle;
  if (!btn || !b) return;
  const t = b.tanks.find(x => x.pl.id === +btn.dataset.look);
  if (t) b.lookAt(t.x);
});
$('weapons').addEventListener('click', e => {
  const btn = e.target.closest('[data-w]'), b = game.battle, t = b?.human();
  if (btn && t) b.select(t, btn.dataset.w);
});
$('items').addEventListener('click', e => {
  const btn = e.target.closest('[data-use]'), b = game.battle, t = b?.human();
  if (btn && t) { ensureAudio(); b.useItem(t, btn.dataset.use); }
});

/* ---------- 입력 ---------- */
const KEYMAP = { ArrowLeft: 'angL', ArrowRight: 'angR', ArrowUp: 'powU', ArrowDown: 'powD', KeyA: 'movL', KeyD: 'movR' };
const inBattle = () => game.battle && !$('scrBattle').hidden ? game.battle : null;
addEventListener('keydown', e => {
  const b = inBattle();
  if (!b || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  ensureAudio();
  b.fine = e.shiftKey;
  const act = KEYMAP[e.code], t = b.human();
  if (act) { e.preventDefault(); b.press(act); }
  else if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && t) b.fire(t); }
  else if (t && e.code === 'KeyQ') b.cycle(t, -1);
  else if (t && e.code === 'KeyE') b.cycle(t, 1);
  else if (t && /^Digit[1-9]$/.test(e.code)) { const a = b.available(t)[+e.code.slice(5) - 1]; if (a) b.select(t, a.id); }
});
addEventListener('keyup', e => {
  const b = inBattle(); if (!b) return;
  b.fine = e.shiftKey;
  if (KEYMAP[e.code]) b.release(KEYMAP[e.code]);
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('blur', () => game.battle?.held.clear());
document.querySelectorAll('[data-hold]').forEach(btn => {
  const act = btn.dataset.hold;
  btn.addEventListener('pointerdown', e => {
    const b = inBattle(); if (!b) return;
    e.preventDefault(); ensureAudio(); b.fine = e.shiftKey; b.press(act); btn.setPointerCapture?.(e.pointerId);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, () => game.battle?.release(act)));
});
// 각도·파워 숫자를 눌러 직접 입력
const fmt = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));
[['angVal', 'setAngle'], ['powVal', 'setPower']].forEach(([id, fn]) => {
  const el = $(id);
  el.addEventListener('change', () => {
    const b = inBattle(), t = b?.human(), v = parseFloat(el.value);
    if (t && Number.isFinite(v)) b[fn](t, v);
    hudKey = '';
  });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
});
$('fire').addEventListener('click', () => { const b = inBattle(), t = b?.human(); if (t) { ensureAudio(); b.fire(t); } });

// 전장 끌어서 둘러보기, 미니맵 누르면 그 위치로
let drag = null;
const toCanvas = e => { const r = cv.getBoundingClientRect(), k = VIEW / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k, k]; };
cv.addEventListener('pointerdown', e => {
  const b = inBattle(); if (!b) return;
  const [x, y] = toCanvas(e), M = MINIMAP;
  if (x >= M.x && x <= M.x + M.w && y >= M.y && y <= M.y + M.h) { b.lookAt((x - M.x) / M.w * (b.terrain.cv.width)); return; }
  drag = { x: e.clientX }; cv.setPointerCapture?.(e.pointerId);
});
cv.addEventListener('pointermove', e => {
  const b = inBattle(); if (!b || !drag) return;
  const [, , k] = toCanvas(e);
  b.pan(-(e.clientX - drag.x) * k); drag.x = e.clientX;
});
['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { drag = null; }));

$('sound').addEventListener('click', e => {
  const on = toggleSound();
  e.currentTarget.textContent = on ? '소리 켬' : '소리 끔';
  e.currentTarget.setAttribute('aria-pressed', on);
});
$('fast').addEventListener('click', e => {
  game.fast = game.fast === 1 ? 3 : 1;
  e.currentTarget.textContent = game.fast === 1 ? 'CPU 턴 보통 속도' : 'CPU 턴 3배속';
  e.currentTarget.setAttribute('aria-pressed', game.fast > 1);
});
let menuTimer;
$('menu').addEventListener('click', e => {
  const btn = e.currentTarget;
  if (btn.dataset.armed) { clearTimeout(menuTimer); delete btn.dataset.armed; btn.textContent = '처음으로'; return toSetup(); }
  btn.dataset.armed = '1'; btn.textContent = '한 번 더 누르면 나갑니다';
  menuTimer = setTimeout(() => { delete btn.dataset.armed; btn.textContent = '처음으로'; }, 3000);
});

/* ---------- PWA ---------- */
// 서비스 워커(오프라인 실행)와 설치 버튼. claude.ai 미리보기처럼 지원하지 않는 곳에서는 조용히 건너뛴다.
try {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
} catch (e) { /* 샌드박스 iframe 등 */ }
// 설치 버튼: 브라우저가 설치 창을 띄워 줄 수 있으면 바로 띄우고(안드로이드 크롬 등),
// 아니면 지금 환경(아이폰, 카카오톡 같은 앱 안 브라우저 등)에 맞는 설치 방법을 보여준다.
const ua = navigator.userAgent;
const env = {
  standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  embedded: (() => { try { return window.top !== window; } catch (e) { return true; } })(),
  ios: /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /Android/i.test(ua),
  kakao: /KAKAOTALK/i.test(ua),
  inApp: /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|; wv\)/i.test(ua),
};
let installPrompt = null;
const showInstall = () => { $('install').hidden = env.standalone || env.embedded || !(installPrompt || env.ios || env.android || env.inApp); };
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; showInstall(); });
addEventListener('appinstalled', () => { installPrompt = null; $('install').hidden = true; closeGuide(); });
showInstall();

function installSteps() {
  if (env.inApp) {
    return {
      title: env.kakao ? '카카오톡 안에서는 설치할 수 없어요' : '앱 안의 브라우저에서는 설치할 수 없어요',
      steps: [
        env.kakao ? '아래 <b>기본 브라우저로 열기</b>를 누르거나, 화면 오른쪽 아래(또는 위) <b>⋮</b> 메뉴에서 <b>다른 브라우저로 열기</b>를 고르세요.'
                  : '화면 위 <b>⋮</b> 또는 공유 메뉴에서 <b>다른 브라우저로 열기</b>(Safari·Chrome)를 고르세요.',
        env.ios ? 'Safari에서 열리면 공유 버튼 → <b>홈 화면에 추가</b>.' : 'Chrome에서 열리면 다시 <b>앱 설치</b> 버튼을 누르세요.',
      ],
      external: env.kakao,
    };
  }
  if (env.ios) {
    return {
      title: '아이폰에 설치하기',
      steps: [
        '화면 아래(또는 위)의 <b>공유 버튼</b>(네모에서 화살표가 나가는 모양)을 누르세요.',
        '목록을 내려 <b>홈 화면에 추가</b> → <b>추가</b>.',
        '홈 화면의 <b>포격전</b> 아이콘으로 실행하면 앱처럼 전체 화면으로 열리고, 인터넷 없이도 실행됩니다.',
      ],
    };
  }
  return {
    title: '안드로이드에 설치하기',
    steps: [
      'Chrome 오른쪽 위 <b>⋮</b> 메뉴를 누르세요.',
      '<b>앱 설치</b> 또는 <b>홈 화면에 추가</b> → <b>설치</b>.',
      '메뉴에 설치 항목이 없으면 페이지를 한 번 새로고침한 뒤 다시 보세요. 삼성 인터넷은 주소창 옆 <b>⬇︎ 설치</b> 아이콘을 누르면 됩니다.',
    ],
  };
}
function openGuide() {
  const g = installSteps();
  $('guideTitle').textContent = g.title;
  $('guideSteps').innerHTML = g.steps.map(t => `<li>${t}</li>`).join('');
  $('guideExternal').hidden = !g.external;
  $('guideUrl').textContent = location.href.split('#')[0];
  $('installGuide').hidden = false;
  $('guideClose').focus();
}
function closeGuide() { $('installGuide').hidden = true; }
$('install').addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) { /* 무시 */ }
    installPrompt = null; showInstall();
    return;
  }
  openGuide();
});
$('guideClose').addEventListener('click', closeGuide);
$('installGuide').addEventListener('click', e => { if (e.target === e.currentTarget) closeGuide(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('installGuide').hidden) closeGuide(); });
$('guideExternal').addEventListener('click', () => {
  location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href.split('#')[0]);
});
$('guideCopy').addEventListener('click', async e => {
  const btn = e.currentTarget, url = $('guideUrl').textContent;
  try { await navigator.clipboard.writeText(url); btn.textContent = '복사했습니다'; }
  catch (err) { getSelection().selectAllChildren($('guideUrl')); btn.textContent = '주소를 길게 눌러 복사하세요'; }
  setTimeout(() => { btn.textContent = '주소 복사'; }, 2500);
});

/* ---------- 루프 ---------- */
let last = performance.now();
function frame(ts) {
  const dt = Math.min(1 / 30, (ts - last) / 1000); last = ts;
  const b = inBattle();
  if (b) {
    const steps = b.cur.pl.cpu && b.state !== 'over' ? game.fast : 1;
    for (let i = 0; i < steps && game.battle === b; i++) b.update(dt);
    render(ctx, b); hud(b); roster(b);
  }
  requestAnimationFrame(frame);
}
renderSetup(); renderTankGuide();
show('scrSetup');
requestAnimationFrame(frame);
