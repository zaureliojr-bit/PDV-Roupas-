// Navegação por abas. Cada módulo expõe uma função `renderX()` chamada aqui
// sempre que sua aba é ativada, garantindo que os dados exibidos estejam sempre
// atualizados (inclusive após operações feitas em outras abas, como uma venda
// no PDV que afeta o Dashboard e os Relatórios).

const RENDER_POR_VIEW = {
  dashboard: () => renderDashboard(),
  produtos: () => renderProdutos(),
  pdv: () => renderPdv(),
  clientes: () => renderClientes(),
  estoque: () => renderEstoque(),
  relatorios: () => renderRelatorios()
};

function mudarView(nome){
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === nome);
  });
  document.querySelectorAll('.view').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${nome}`);
  });
  const render = RENDER_POR_VIEW[nome];
  if(render) render();
}

function ligarNavegacao(){
  document.getElementById('tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if(!btn) return;
    mudarView(btn.dataset.view);
  });
}
