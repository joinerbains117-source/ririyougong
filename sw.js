const CACHE='ririyougong-v2.0.0';
const ASSETS=['./','./index.html','./style.css?v=2','./core.js?v=2','./app.js?v=2','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ririyougong-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const hit=await cache.match(event.request);
    if(hit)return hit;
    try{return await fetch(event.request);}catch(error){
      if(event.request.mode==='navigate')return (await cache.match('./index.html'))||Response.error();
      return Response.error();
    }
  }));
});
