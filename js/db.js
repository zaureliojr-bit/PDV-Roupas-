// Conexão com o Firebase: a autenticação anônima (exigida pelas regras do
// Firestore) só acontece depois que o PIN correto é digitado — assim,
// quem só tem o link do site mas não o PIN não consegue ler nem gravar
// nada no banco. `db` (Firestore) fica disponível globalmente para o
// store.js depois que `inicializarFirebase()` resolve.

const PIN_OK_STORAGE = 'vendas_pin_ok_v1';

let db = null;
let firebaseProntoPromise = null;

function pinJaDesbloqueado(){
  return localStorage.getItem(PIN_OK_STORAGE) === '1';
}

function marcarPinDesbloqueado(){
  localStorage.setItem(PIN_OK_STORAGE, '1');
}

function bloquearApp(){
  localStorage.removeItem(PIN_OK_STORAGE);
  location.reload();
}

function inicializarFirebase(){
  if(firebaseProntoPromise) return firebaseProntoPromise;

  firebaseProntoPromise = new Promise((resolve, reject) => {
    try{
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      firebase.auth().signInAnonymously().then(resolve).catch(reject);
    } catch(err){
      reject(err);
    }
  });

  return firebaseProntoPromise;
}

function ligarPinGate(aoDesbloquear){
  const overlay = document.getElementById('pinGate');
  const form = document.getElementById('formPin');
  const input = document.getElementById('pinInput');
  const erro = document.getElementById('pinErro');

  form.addEventListener('submit', e => {
    e.preventDefault();
    if(input.value.trim() === APP_PIN){
      marcarPinDesbloqueado();
      overlay.style.display = 'none';
      erro.textContent = '';
      aoDesbloquear();
    } else {
      erro.textContent = 'PIN incorreto.';
      input.value = '';
      input.focus();
    }
  });

  if(pinJaDesbloqueado()){
    overlay.style.display = 'none';
    aoDesbloquear();
  } else {
    overlay.style.display = 'flex';
    input.focus();
  }
}
