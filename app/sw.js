const CORE='wildlens-core-v20',RUN='wildlens-run-v1',LIB='wildlens-lib-v1';
const CORE_FILES=['./','index.html','manifest.webmanifest','icon.svg','qr.js','accesso.js','voce.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CORE).then(c=>Promise.all(CORE_FILES.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
/* Only old app-shell caches are removed. AI brains (transformers-cache), the AI library (LIB) and map tiles (RUN) are kept across updates. */
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('wildlens-core-')&&k!==CORE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(/huggingface|hf\.co|xethub/.test(u.hostname))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{caches.open(CORE).then(c=>c.put('index.html',res.clone()));return res}).catch(()=>caches.match('index.html')));return}
 const tile=u.hostname.endsWith('tile.openstreetmap.org');
 /* AI library and runtime from the CDN (versioned URLs): cache first, kept forever, so the offline brain still starts with no signal */
 if(u.hostname==='cdn.jsdelivr.net'&&/@huggingface\/transformers|onnxruntime/.test(u.pathname)){e.respondWith(caches.open(LIB).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}))));return}
 e.respondWith(caches.match(r).then(hit=>{const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(tile?RUN:CORE).then(c=>c.put(r,cp))}return res}).catch(()=>hit);return hit||net}))});
