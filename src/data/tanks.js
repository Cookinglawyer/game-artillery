// 나라별 탱크와 지도자. 성능은 모두 같고 생김새만 다르다.
// tank.turret: 포탑 윤곽(앞쪽이 +x, 위가 -y), tank.top: 포탑 윗면 높이(지도자가 이 위로 상반신을 내민다)
// camo: [바탕, 무늬1, 무늬2], rider: 지도자 그림 정보(머리 모양·색, 옷, 넥타이, 안경)
// 지도자는 2026년 10월 기준. 바뀌면 leader/rider만 고치면 된다.
export const TANKS = {
  kr: { nation: '대한민국', short: '한국', tank: 'K2 흑표', leader: '이재명', flag: 'kr',
    camo: ['#6b8a4e', '#8a6a3e', '#36392d'], top: 23,
    turret: [[-12, -15], [14, -15], [19, -19], [13, -23], [-11, -23], [-14, -20]],
    rider: { hair: 'side', hairColor: '#2b2b30', suit: '#2c3e66', tie: '#3d6fd6', glasses: true } },
  us: { nation: '미국', short: '미국', tank: 'M1A2 에이브럼스', leader: '트럼프', flag: 'us',
    camo: ['#c9b27a', '#b59a5f', '#9d8550'], top: 23,
    turret: [[-14, -15], [15, -15], [19, -18], [15, -23], [-14, -23], [-16, -19]],
    rider: { hair: 'swoop', hairColor: '#f2cf6b', suit: '#24304f', tie: '#e03131' } },
  kp: { nation: '북한', short: '북한', tank: '천마-20', leader: '김정은', flag: 'kp',
    camo: ['#55623d', '#45512f', '#6c7a4a'], top: 24,
    turret: [[-13, -15], [13, -15], [17, -18], [12, -24], [-10, -24], [-14, -19]],
    rider: { hair: 'flattop', hairColor: '#1f1f22', suit: '#3a3d42', tie: null, round: true } },
  ru: { nation: '러시아', short: '러시아', tank: 'T-14 아르마타', leader: '푸틴', flag: 'ru',
    camo: ['#5f7a3f', '#4c6431', '#7a8f55'], top: 26,
    turret: [[-11, -15], [12, -15], [14, -18], [13, -26], [-10, -26]],
    rider: { hair: 'thin', hairColor: '#c9b48f', suit: '#2e3138', tie: '#7d8597' } },
  cn: { nation: '중국', short: '중국', tank: '99A식', leader: '시진핑', flag: 'cn',
    camo: ['#5d7a4a', '#7f9a62', '#425a35'], top: 23,
    turret: [[-13, -15], [13, -15], [20, -19], [13, -23], [-12, -23], [-15, -19]],
    rider: { hair: 'combed', hairColor: '#1d1d22', suit: '#2a2d36', tie: '#c92a2a', round: true } },
  jp: { nation: '일본', short: '일본', tank: '10식', leader: '다카이치', flag: 'jp',
    camo: ['#6e7752', '#8a7a55', '#4d5638'], top: 22,
    turret: [[-12, -15], [13, -15], [16, -18], [13, -22], [-12, -22], [-14, -19]],
    rider: { hair: 'bob', hairColor: '#3b2a24', suit: '#2f4a7a', tie: null, necklace: true } },
  de: { nation: '독일', short: '독일', tank: '레오파르트 2A7', leader: '메르츠', flag: 'de',
    camo: ['#4f5a3a', '#5e4a36', '#2a2a26'], top: 24,
    turret: [[-13, -15], [12, -15], [21, -20], [12, -24], [-12, -24], [-14, -20]],
    rider: { hair: 'fringe', hairColor: '#b9b9b9', suit: '#262a33', tie: '#4263eb', glasses: true } },
  fr: { nation: '프랑스', short: '프랑스', tank: '르클레르', leader: '마크롱', flag: 'fr',
    camo: ['#7d8656', '#a28d5e', '#555d3a'], top: 23,
    turret: [[-17, -15], [12, -15], [16, -18], [12, -23], [-17, -23], [-18, -19]],
    rider: { hair: 'swept', hairColor: '#6b4a32', suit: '#253a6b', tie: '#1c2a4a' } },
};
export const TANK_ORDER = Object.keys(TANKS);

// 모든 탱크 공통 능력치
export const TANK_STATS = { hp: 100, move: 1 };
