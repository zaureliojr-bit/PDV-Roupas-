// Inicialização: PIN → autenticação anônima no Firebase → sincronização em
// tempo real do Firestore → liga eventos de cada tela → mostra o Dashboard.

function ligarEventosDoApp(){
  ligarNavegacao();
  ligarEventosDashboard();
  ligarEventosProdutos();
  ligarEventosPdv();
  ligarEventosClientes();
  ligarEventosEstoque();
  ligarEventosRelatorios();
  ligarEventosConfig();

  mudarView('dashboard');
}

function mostrarApp(){
  document.getElementById('pinCarregando').style.display = 'none';
  document.getElementById('appRoot').style.display = 'block';
}

function mostrarErroConexao(msg){
  document.getElementById('pinCarregando').style.display = 'none';
  const overlay = document.getElementById('pinGate');
  const erro = document.getElementById('pinErro');
  overlay.style.display = 'flex';
  erro.textContent = msg;
}

function aoDesbloquearPin(){
  document.getElementById('pinCarregando').style.display = 'flex';

  inicializarFirebase()
    .then(() => {
      iniciarSincronizacao(
        () => rerenderViewAtual(),
        () => mostrarErroConexao('Erro ao sincronizar dados. Verifique sua internet e recarregue a página.')
      );
      ligarEventosDoApp();
      mostrarApp();
    })
    .catch(err => {
      console.error('Erro ao conectar no Firebase:', err);
      mostrarErroConexao('Não foi possível conectar ao banco de dados. Verifique sua internet ou a configuração do Firebase (vendas/js/firebase-config.js) e tente de novo.');
    });
}

ligarPinGate(aoDesbloquearPin);
