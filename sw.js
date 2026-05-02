// NMTI Service Worker - 离线缓存静态资源
// 策略：install 只预缓存首屏关键资源，其他靠 fetch 懒缓存（stale-while-revalidate）
const CACHE_VERSION = 'nmti-v20260502-j';
const CACHE_NAME = 'nmti-assets-' + CACHE_VERSION;

// 首屏必需（install 预缓存）
// 其他 22 张人格图、题目选项音频靠 fetch 懒缓存
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/questions.js?v=20260502d',
  '/logic.js?v=20260502d',
  '/personas.js?v=20260502d',
  '/vendor/html2canvas.min.js',
  '/vendor/qrcode.min.js',
  '/audio/logo2.jpg',
  '/audio/score2.png',
  '/audio/yase.mp3',
  '/audio/wuzetian.mp3'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(
        CORE_ASSETS.map(function(url){
          return cache.add(url).catch(function(){});
        })
      );
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){
          return k.startsWith('nmti-assets-') && k !== CACHE_NAME;
        }).map(function(k){
          return caches.delete(k);
        })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.indexOf('/admin') === 0) return;
  if(url.hostname.indexOf('tcloudbase.com') >= 0 && url.hostname.indexOf('app.tcloudbase') >= 0) return; // 云函数

  // HTML / JS / CSS：network-first（保证用户总能拿到最新逻辑）
  // 图片 / 音频：stale-while-revalidate（离线可用 + 快速响应）
  var isHTML = url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  var isScript = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if(isHTML || isScript){
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache){
        return fetch(req).then(function(resp){
          if(resp && resp.status === 200){
            cache.put(req, resp.clone()).catch(function(){});
          }
          return resp;
        }).catch(function(){
          return cache.match(req);
        });
      })
    );
    return;
  }

  // 其他资源：stale-while-revalidate
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(req).then(function(cached){
        var fetchPromise = fetch(req).then(function(resp){
          if(resp && resp.status === 200){
            cache.put(req, resp.clone()).catch(function(){});
          }
          return resp;
        }).catch(function(){
          return cached;
        });
        return cached || fetchPromise;
      });
    })
  );
});
