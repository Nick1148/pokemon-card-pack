// 캐시 버전: 정적 파일 목록이나 전략을 바꾸면 올립니다.
const CACHE_NAME = 'pokemon-card-sim-v5';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/utils.js',
  '/js/cards.js',
  '/js/gacha.js',
  '/js/app.js',
  '/manifest.json',
  '/assets/card_back.png',
  '/assets/icon.svg',
];

// Install: cache core assets (하나가 실패해도 설치는 계속)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 같은 출처 요청: 네트워크 우선 → 배포 즉시 반영, 오프라인이면 캐시 (?v= 쿼리 무시)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // 공유 링크(?share=...)마다 캐시 항목이 늘어나지 않도록 제외
    if (response.ok && !new URL(request.url).searchParams.has('share')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // 외부 요청(카드 이미지 CDN·광고·분석·폰트)은 브라우저 HTTP 캐시에 맡김.
  // no-cors 이미지(opaque 응답)를 SW 캐시에 넣으면 항목당 수 MB 의 저장 공간을 차지하기 때문.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});
