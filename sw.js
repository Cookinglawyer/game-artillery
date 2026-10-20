// 날벼락전쟁 서비스 워커
// 네트워크 우선: 온라인이면 항상 최신 파일을 받아 캐시에 넣고, 오프라인이면 캐시에서 꺼낸다.
// 그래서 업데이트를 올리면 다음 실행 때 바로 반영되고, 한 번 연 뒤에는 인터넷 없이도 실행된다.
// 새 파일을 추가하면 SHELL에도 넣고 CACHE 버전을 올린다.
const CACHE = 'artillery-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
  './src/main.js', './src/config.js', './src/battle.js', './src/terrain.js', './src/ai.js', './src/render.js', './src/audio.js',
  './src/data/weapons.js', './src/data/tanks.js', './src/data/items.js',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
