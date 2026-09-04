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

// Caixinhas separadas por dígito (estilo código de SMS), uma pra cada
// caractere do APP_PIN configurado. Digitar avança pra próxima, backspace
// numa caixa vazia volta pra anterior, colar distribui os dígitos, e o
// último dígito já envia sozinho.
function ligarPinGate(aoDesbloquear){
  const overlay = document.getElementById('pinGate');
  const form = document.getElementById('formPin');
  const container = document.getElementById('pinBoxes');
  const erro = document.getElementById('pinErro');

  const tamanho = APP_PIN.length;
  container.innerHTML = '';
  const boxes = [];
  for(let i = 0; i < tamanho; i++){
    const box = document.createElement('input');
    box.type = 'text';
    box.inputMode = 'numeric';
    box.pattern = '[0-9]*';
    box.maxLength = 1;
    box.autocomplete = 'off';
    box.className = 'pin-box';
    container.appendChild(box);
    boxes.push(box);
  }

  function pinDigitado(){
    return boxes.map(b => b.value).join('');
  }

  function limparBoxes(){
    boxes.forEach(b => b.value = '');
    boxes[0].focus();
  }

  function tentarEntrar(){
    if(pinDigitado() === APP_PIN){
      marcarPinDesbloqueado();
      overlay.style.display = 'none';
      erro.textContent = '';
      aoDesbloquear();
    } else {
      erro.textContent = 'PIN incorreto.';
      limparBoxes();
    }
  }

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if(box.value && i < boxes.length - 1){
        boxes[i + 1].focus();
      } else if(box.value && i === boxes.length - 1){
        tentarEntrar();
      }
    });
    box.addEventListener('keydown', e => {
      if(e.key === 'Backspace' && !box.value && i > 0){
        boxes[i - 1].focus();
      }
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if(!texto) return;
      texto.slice(0, boxes.length).split('').forEach((d, idx) => { boxes[idx].value = d; });
      const proximo = Math.min(texto.length, boxes.length - 1);
      boxes[proximo].focus();
      if(texto.length >= boxes.length) tentarEntrar();
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    tentarEntrar();
  });

  if(pinJaDesbloqueado()){
    overlay.style.display = 'none';
    aoDesbloquear();
  } else {
    overlay.style.display = 'flex';
    boxes[0].focus();
  }
}
