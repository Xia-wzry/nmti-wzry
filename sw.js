// NMTI Service Worker - 离线缓存静态资源
// 策略：stale-while-revalidate（先返回缓存，后台更新）
const CACHE_VERSION = 'nmti-v20260502-d';
const CACHE_NAME = 'nmti-assets-' + CACHE_VERSION;

// 核心资源（首次访问时预缓存）
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/questions.js?v=20260502b',
  '/logic.js?v=20260502b',
  '/personas.js?v=20260502b',
  '/vendor/html2canvas.min.js',
  '/vendor/qrcode.min.js',
  '/audio/logo.jpg',
  '/audio/score.png',
  '/audio/yase.mp3',
  '/audio/wusha.mp3',
  '/audio/wuzetian.mp3',
  '/audio/sunce.mp3',
  '/audio/zhongkui.mp3',
  '/audio/chengyaojin.mp3',
  '/audio/zhuangzhou.mp3',
  '/audio/makebolo.mp3'
];

// persona 图（25 张）
const PERSONAS = [
  'aidawangzhe','bazhe','fengjinglongwang','guaidaojide','guashazhe',
  'guyongzhe','hongbuff','hunzhe','huozhe','jiahao',
  'jifenduobaoquan','kongdazhe','lanbuff','liulanggou','rongyaowangzhe',
  'shizuoyongzhe','shufuzhe','sizhe','toutazhe','toutoufangpizhe',
  'tuanduizhiguang','weimuzegang','wodizhe','zhener','zuzong'
];
const PERSONA_ASSETS = PERSONAS.map(id => '/personas/' + id + '.png?v=20260502');

const ALL_ASSETS = CORE_ASSETS.concat(PERSONA_ASSETS);

// 安装：预缓存所有资源
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // 批量缓存（失败不中断整个流程）
      return Promise.all(
        ALL_ASSETS.map(function(url){
          return cache.add(url).catch(function(err){
            console.warn('SW cache miss:', url, err.message);
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

// 拦截请求：stale-while-revalidate 策略
self.addEventListener('fetch', function(e){
  var req = e.request;
  // 只处理同源 GET
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  // 不缓存 admin 页面（需要实时数据）
  if(url.pathname.indexOf('/admin') === 0) return;
  // 不缓存云函数调用
  if(url.hostname.indexOf('tcloudbase.com') >= 0) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(req).then(function(cached){
        // 并发发起网络请求（更新缓存）
        var fetchPromise = fetch(req).then(function(resp){
          if(resp && resp.status === 200){
            cache.put(req, resp.clone()).catch(function(){});
          }
          return resp;
        }).catch(function(){
          return cached; // 网络失败用缓存
        });
        // 有缓存就立即返回，否则等网络
        return cached || fetchPromise;
      });
    })
  );
});
