// Navegação por abas. Cada módulo expõe uma função `renderX()` chamada aqui
// sempre que sua aba é ativada. Como os dados agora vêm do Firestore em tempo
// real, `rerenderViewAtual()` também é chamada sempre que qualquer coleção
// muda (em qualquer aparelho) — assim a aba aberta nunca fica desatualizada,
// sem precisar trocar de aba.

const RENDER_POR_VIEW = {
  dashboard: () => renderDashboard(),
  produtos: () => renderProdutos(),
  pdv: () => renderPdv(),
  clientes: () => renderClientes(),
  estoque: () => renderEstoque(),
  relatorios: () => renderRelatorios(),
  config: () => renderConfig()
};

let viewAtual = 'dashboard';

function mudarView(nome){
  viewAtual = nome;
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === nome);
  });
  document.querySelectorAll('.view').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${nome}`);
  });
  const render = RENDER_POR_VIEW[nome];
  if(render) render();
}

function rerenderViewAtual(){
  const render = RENDER_POR_VIEW[viewAtual];
  if(render) render();
}

function ligarNavegacao(){
  document.getElementById('tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if(!btn) return;
    mudarView(btn.dataset.view);
  });
}
