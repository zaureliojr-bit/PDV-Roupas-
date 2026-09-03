// Tela de Dashboard: indicadores do dia e faturamento por período.

function statCardHtml(label, value, extraClass){
  return `<div class="stat-card ${extraClass || ''}"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function renderDashboard(){
  const hoje = vendasDeHoje();
  const totalHoje = faturamentoTotal(hoje);
  const totalProdutos = listarProdutos().length;
  const unidadesEmEstoque = listarProdutos().reduce((soma, p) => soma + estoqueTotalProduto(p), 0);
  const comEstoqueBaixo = listarProdutos().filter(produtoEstoqueBaixo).length;

  document.getElementById('dashCards').innerHTML = [
    statCardHtml('💰 Vendas do dia', formatarMoeda(totalHoje)),
    statCardHtml('🛒 Qtd. de vendas hoje', hoje.length),
    statCardHtml('📦 Unidades em estoque', unidadesEmEstoque),
    statCardHtml('⚠️ Estoque baixo', `${comEstoqueBaixo} de ${totalProdutos}`, comEstoqueBaixo ? 'alert' : 'ok')
  ].join('');

  renderFaturamentoPeriodo();
  renderMaisVendidosDashboard();
}

function renderFaturamentoPeriodo(){
  const dias = Number(document.getElementById('dashPeriodo').value);
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  inicio.setHours(0, 0, 0, 0);
  const lista = vendasNoPeriodo(inicio, new Date());

  document.getElementById('dashFaturamento').innerHTML = `
    <div class="resumo" style="border-top:none; padding-top:0;">
      <span>Faturamento: <b>${formatarMoeda(faturamentoTotal(lista))}</b></span>
      <span>Vendas: <b>${lista.length}</b></span>
      <span>Ticket médio: <b>${formatarMoeda(ticketMedio(lista))}</b></span>
    </div>`;
}

function renderMaisVendidosDashboard(){
  const top = produtosMaisVendidos(listarVendas(), 5);
  const container = document.getElementById('dashMaisVendidos');
  if(!top.length){
    container.innerHTML = '<div class="empty">Nenhuma venda registrada ainda.</div>';
    return;
  }
  container.innerHTML = `<ul class="lista-simples">${top.map(p =>
    `<li><span>${escapeHtml(p.nome)}</span><span class="destaque">${p.qtd} un. · ${formatarMoeda(p.total)}</span></li>`
  ).join('')}</ul>`;
}

function ligarEventosDashboard(){
  document.getElementById('dashPeriodo').addEventListener('change', renderFaturamentoPeriodo);
}
