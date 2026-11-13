/* ぶっぽうまるのページ　オフライン版の service worker
   ・このページのファイル（index.html・アイコンなど）を iPad に保存して、ネットがなくてもひらけるようにする
   ・文字のフォント（Google Fonts）も、1回読みこんだら保存して使う
   ・ぶっぽうまるのページ（script.google.com）とのやりとりは保存しない（いつもそのまま送る） */
var SHELL = 'bpm-shell-v1', FONTS = 'bpm-fonts-v1';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return /^bpm-(shell|fonts)-/.test(k) && k !== SHELL && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // フォント：保存してあればそれを使い、なければ取りに行って保存
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; });
      });
    }).catch(function () { return new Response('', { status: 504 }); }));
    return;
  }
  // このページのファイル：つながっていれば新しいものを使って保存しなおす。つながらなければ保存したもの
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(SHELL).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
    }));
  }
  // それ以外（script.google.com など）はさわらない
});
