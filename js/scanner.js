// Leitura de código de barras pela câmera do celular, usando a biblioteca
// ZXing (funciona em qualquer navegador com câmera — Android e iPhone —
// diferente da BarcodeDetector nativa do navegador, que só existe no Chrome).

let leitorZxing = null;

function scannerDisponivel(){
  return typeof ZXing !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
}

function setScannerStatus(msg, isErro){
  const el = document.getElementById('scannerStatus');
  el.textContent = msg || '';
  el.classList.toggle('erro', !!isErro);
}

// aoLer(codigoTexto) é chamado assim que um código é decodificado com sucesso.
async function abrirScannerCamera(aoLer){
  const overlay = document.getElementById('scannerOverlay');
  const video = document.getElementById('scannerVideo');
  setScannerStatus('');
  overlay.style.display = 'flex';

  if(!scannerDisponivel()){
    setScannerStatus('Leitor de código de barras não disponível neste navegador (ou sem acesso à câmera).', true);
    return;
  }

  try{
    leitorZxing = new ZXing.BrowserMultiFormatReader();
    await leitorZxing.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      video,
      (resultado, erro) => {
        if(resultado){
          const texto = resultado.getText();
          fecharScannerCamera();
          aoLer(texto);
        }
        // erros de "nenhum código neste frame" disparam a cada frame — ignora.
      }
    );
  } catch(err){
    setScannerStatus('Não foi possível acessar a câmera: ' + err.message, true);
  }
}

function fecharScannerCamera(){
  document.getElementById('scannerOverlay').style.display = 'none';
  if(leitorZxing){
    leitorZxing.reset();
    leitorZxing = null;
  }
}

function ligarEventosScanner(){
  document.getElementById('btnFecharScanner').addEventListener('click', fecharScannerCamera);
}
