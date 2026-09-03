// Inicialização: liga os eventos de cada tela e renderiza a aba inicial.

function init(){
  ligarNavegacao();
  ligarEventosDashboard();
  ligarEventosProdutos();
  ligarEventosPdv();
  ligarEventosClientes();
  ligarEventosEstoque();
  ligarEventosRelatorios();

  mudarView('dashboard');
}

init();
