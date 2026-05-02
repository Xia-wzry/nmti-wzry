// NMTI Service Worker - 离线缓存静态资源
// 策略：install 只预缓存首屏关键资源，其他靠 fetch 懒缓存（stale-while-revalidate）
// 避免 install 时把 25 张图 + 8 音频全下完，抢占首屏带宽
const CACHE_VERSION = 'nmti-v20260502-e';
const CACHE_NAME = 'nmti-assets-' + CACHE_VERSION;

// 首屏必需（install 预缓存，保证离线可用 + 二次打开极速）
// 其他 22 张人格图、次要音频靠 fetch 懒缓存
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/questions.js?v=20260502c',
  '/logic.js?v=20260502c',
  '/personas.js?v=20260502c',
  '/vendor/html2canvas.min.js',
  '/vendor/qrcode.min.js',
  '/audio/logo.jpg',
  '/audio/score.svg',
  '/audio/yase.mp3',
  '/audio/wuzetian.mp3'
];

// 安装：只预缓存核心
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(
        CORE_ASSETS.map(function(url){
          return cache.add(url).catch(function(err){
            // 单个失败不阻塞
          });
        })
      );
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
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

// 拦截请求：stale-while-revalidate
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.indexOf('/admin') === 0) return;
  if(url.hostname.indexOf('tcloudbase.com') >= 0) return;

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
