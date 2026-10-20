// W: 전장 전체 너비, VIEW: 기본으로 보이는 너비(실제 보이는 폭은 화면 비율에 따라 달라진다)
export const W = 1800, VIEW = 960, H = 540, G = 260, SPEED = 7.2, MAX_WIND = 70;
export const TAU = Math.PI * 2, DEG = Math.PI / 180;
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 탱크 몸체: 충돌 판정 반폭·높이, 포신 회전축 높이, 포신 길이
export const BODY = { hw: 15, h: 24, pivot: 13, barrel: 22 };
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 라운드 보상: 참가 + 피해량 × perDamage + 격파 + 순위(1~3위)
export const ECON = { start: 400, round: 100, perDamage: 2, kill: 100, place: [150, 90, 50] };
export const COMBO_FEE = 100;
export const MAX_LEVEL = 3;
export const MAX_PLAYERS = 10;
export const PLAYER_COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff8cc8', '#f8f9fa', '#ff922b', '#38d9a9', '#748ffc'];
export const PLAYER_NAMES = ['빨강', '하늘', '노랑', '초록', '보라', '분홍', '하양', '주황', '청록', '남색'];
