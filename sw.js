// Service worker do app-shell: deixa o painel abrir (mesmo que só a casca,
// sem dados) quando o aparelho está sem internet, e permite o "Adicionar à
// tela inicial" nos celulares.
//
// Estratégia: network-first para os arquivos do próprio app (sempre busca a
// versão mais nova quando online — importante porque o app é atualizado com
// frequência — e só usa o cache como fallback offline). Requisições pro
// Firebase/Firestore e CDNs externos passam direto pela rede, sem cache.

const CACHE_NAME = 'painel-vendas-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/store.js',
  './js/format.js',
  './js/ui.js',
  './js/dashboard.js',
  './js/produtos.js',
  './js/pdv.js',
  './js/clientes.js',
  './js/estoque.js',
  './js/relatorios.js',
  './js/config.js',
  './js/db.js',
  './js/firebase-config.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c !== CACHE_NAME).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(resposta => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request).then(cacheado => cacheado || caches.match('./index.html')))
  );
});
