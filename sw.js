// Service worker: guarda os arquivos do site no celular para o app abrir rápido e funcionar offline.
// Se um dia precisar "zerar" o que ficou guardado nos celulares, troque o número abaixo (v1 → v2).
const CACHE = 'quem-cabe-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // a página em si: tenta a internet primeiro (para pegar atualizações); sem internet, usa a cópia guardada
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request)
      .then(resposta => { const copia = resposta.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return resposta; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  // os outros arquivos (css, js, dados, fotos, fontes): usa a cópia guardada; se não tiver, baixa e guarda
  e.respondWith(caches.match(e.request).then(guardado => guardado || fetch(e.request).then(resposta => {
    if (resposta.ok || resposta.type === 'opaque') {
      const copia = resposta.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
    }
    return resposta;
  })));
});
