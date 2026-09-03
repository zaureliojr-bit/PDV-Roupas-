// Tela de Relatórios: agrega vendas, estoque e movimentações por período.

function periodoSelecionadoRelatorios(){
  const dias = Number(document.getElementById('relPeriodo').value);
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  inicio.setHours(0, 0, 0, 0);
  return vendasNoPeriodo(inicio, new Date());
}

function renderRelatorios(){
  const lista = periodoSelecionadoRelatorios();

  document.getElementById('relResumo').innerHTML = [
    statCardHtml('Faturamento', formatarMoeda(faturamentoTotal(lista))),
    statCardHtml('Lucro estimado', formatarMoeda(lucroEstimado(lista))),
    statCardHtml('Vendas', lista.length),
    statCardHtml('Ticket médio', formatarMoeda(ticketMedio(lista)))
  ].join('');

  const porDia = vendasPorDia(lista);
  document.getElementById('relPorDia').innerHTML = porDia.length
    ? `<ul class="lista-simples">${porDia.map(d =>
        `<li><span>${formatarDataCurta(d.dia)}</span><span class="destaque">${d.qtd} vendas · ${formatarMoeda(d.total)}</span></li>`
      ).join('')}</ul>`
    : '<div class="empty">Sem vendas no período.</div>';

  const maisVendidos = produtosMaisVendidos(lista, 10);
  document.getElementById('relMaisVendidos').innerHTML = maisVendidos.length
    ? `<ul class="lista-simples">${maisVendidos.map(p =>
        `<li><span>${escapeHtml(p.nome)}</span><span class="destaque">${p.qtd} un. · ${formatarMoeda(p.total)}</span></li>`
      ).join('')}</ul>`
    : '<div class="empty">Sem vendas no período.</div>';

  const parados = produtosParados(30);
  document.getElementById('relParados').innerHTML = parados.length
    ? `<ul class="lista-simples">${parados.map(p =>
        `<li><span>${escapeHtml(p.nome)}</span><span>${estoqueTotalProduto(p)} un. em estoque</span></li>`
      ).join('')}</ul>`
    : '<div class="empty">Todos os produtos tiveram venda nos últimos 30 dias.</div>';

  const baixos = listarProdutos().filter(produtoEstoqueBaixo);
  document.getElementById('relEstoqueBaixo').innerHTML = baixos.length
    ? `<ul class="lista-simples">${baixos.map(p =>
        `<li><span>${escapeHtml(p.nome)}</span><span class="destaque" style="color:var(--red);">${estoqueTotalProduto(p)} / mín. ${p.estoqueMinimo}</span></li>`
      ).join('')}</ul>`
    : '<div class="empty">Nenhum produto com estoque baixo.</div>';

  const porPagamento = vendasPorFormaPagamento(lista);
  document.getElementById('relPorPagamento').innerHTML = porPagamento.length
    ? `<ul class="lista-simples">${porPagamento.map(f =>
        `<li><span>${escapeHtml(f.formaPagamento)}</span><span class="destaque">${f.qtd} vendas · ${formatarMoeda(f.total)}</span></li>`
      ).join('')}</ul>`
    : '<div class="empty">Sem vendas no período.</div>';

  const porVendedor = vendasPorVendedor(lista);
  document.getElementById('relPorVendedor').innerHTML = porVendedor.length
    ? `<ul class="lista-simples">${porVendedor.map(v =>
        `<li><span>${escapeHtml(v.vendedor)}</span><span class="destaque">${v.qtd} vendas · ${formatarMoeda(v.total)}</span></li>`
      ).join('')}</ul>`
    : '<div class="empty">Sem vendas no período.</div>';
}

function ligarEventosRelatorios(){
  document.getElementById('relPeriodo').addEventListener('change', renderRelatorios);
}
