// Registra o service worker (fora do fluxo de PIN/Firebase — funciona mesmo
// antes de entrar no app, já que só cuida da casca do app, não dos dados).
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker não registrou:', err));
  });
}
