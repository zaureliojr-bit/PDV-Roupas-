// Frente de caixa: busca de produto (ou leitura de código de barras via SKU +
// Enter, como um leitor de código de barras normalmente se comporta), carrinho,
// desconto, forma de pagamento e finalização da venda com baixa automática no
// estoque (feita por `finalizarVenda` em store.js).

let carrinhoPdv = [];

function itemCarrinho(produtoId, variacaoId){
  return carrinhoPdv.find(i => i.produtoId === produtoId && i.variacaoId === variacaoId) || null;
}

function adicionarAoCarrinho(produto, variacao){
  if(variacao.estoque <= 0){
    setPdvStatus(`Sem estoque para ${produto.nome} (${descreverVariacao(variacao)}).`, true);
    return;
  }
  const existente = itemCarrinho(produto.id, variacao.id);
  if(existente){
    if(existente.qtd >= variacao.estoque){
      setPdvStatus('Quantidade no carrinho já atingiu o estoque disponível.', true);
      return;
    }
    existente.qtd += 1;
  } else {
    carrinhoPdv.push({
      produtoId: produto.id,
      variacaoId: variacao.id,
      nome: produto.nome,
      variacaoDesc: descreverVariacao(variacao),
      qtd: 1,
      precoUnit: produto.precoVenda,
      custoUnit: produto.custo,
      estoqueDisponivel: variacao.estoque
    });
  }
  document.getElementById('pdvBusca').value = '';
  document.getElementById('pdvSugestoes').innerHTML = '';
  setPdvStatus('');
  renderCarrinho();
}

function sugestaoProdutoHtml(produto){
  if(produto.variacoes.length === 1){
    const v = produto.variacoes[0];
    return `
      <div class="sugestao-item" data-produto="${produto.id}" data-variacao="${v.id}">
        <span class="nome">${escapeHtml(produto.nome)} ${produto.sku ? `(${escapeHtml(produto.sku)})` : ''} — estoque ${v.estoque}</span>
        <span class="preco">${formatarMoeda(produto.precoVenda)}</span>
      </div>`;
  }
  const linhas = produto.variacoes.map(v => `
      <div class="sugestao-item" data-produto="${produto.id}" data-variacao="${v.id}">
        <span class="nome">${escapeHtml(produto.nome)} — ${escapeHtml(descreverVariacao(v))} — estoque ${v.estoque}</span>
        <span class="preco">${formatarMoeda(produto.precoVenda)}</span>
      </div>`).join('');
  return linhas;
}

function buscarProdutosPdv(termo){
  const t = termo.trim().toLowerCase();
  if(!t) return [];
  return listarProdutos().filter(p =>
    p.nome.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)
  ).slice(0, 8);
}

function renderSugestoesPdv(){
  const termo = document.getElementById('pdvBusca').value;
  const resultados = buscarProdutosPdv(termo);
  document.getElementById('pdvSugestoes').innerHTML = resultados.map(sugestaoProdutoHtml).join('');
}

function tentarLeituraExata(termo){
  const t = termo.trim().toLowerCase();
  if(!t) return false;
  const produto = listarProdutos().find(p => p.sku.toLowerCase() === t);
  if(!produto) return false;
  if(produto.variacoes.length === 1){
    adicionarAoCarrinho(produto, produto.variacoes[0]);
  } else {
    renderSugestoesPdv();
    setPdvStatus('Produto tem variações — escolha uma na lista abaixo.');
  }
  return true;
}

function linhaCarrinhoHtml(item, idx){
  return `
    <tr data-idx="${idx}">
      <td>${escapeHtml(item.nome)}${item.variacaoDesc !== '-' ? `<br><span style="color:var(--gray); font-size:11.5px;">${escapeHtml(item.variacaoDesc)}</span>` : ''}</td>
      <td>
        <div class="qtd-control">
          <button type="button" class="btnMenosQtd">−</button>
          <span>${item.qtd}</span>
          <button type="button" class="btnMaisQtd">+</button>
        </div>
      </td>
      <td>${formatarMoeda(item.precoUnit)}</td>
      <td>${formatarMoeda(item.qtd * item.precoUnit)}</td>
      <td><button type="button" class="btn-icon btnRemoverItem" aria-label="Remover">✕</button></td>
    </tr>`;
}

function calcularTotais(){
  const subtotal = carrinhoPdv.reduce((s, i) => s + i.qtd * i.precoUnit, 0);
  const desconto = Number(document.getElementById('pdvDesconto').value) || 0;
  const total = Math.max(0, subtotal - desconto);
  return { subtotal, desconto, total };
}

function renderCarrinho(){
  const corpo = document.getElementById('pdvCarrinhoCorpo');
  const vazio = document.getElementById('pdvCarrinhoVazio');
  const tabela = document.getElementById('pdvCarrinhoTabela');

  if(!carrinhoPdv.length){
    corpo.innerHTML = '';
    tabela.style.display = 'none';
    vazio.style.display = 'block';
  } else {
    tabela.style.display = 'table';
    vazio.style.display = 'none';
    corpo.innerHTML = carrinhoPdv.map(linhaCarrinhoHtml).join('');
  }

  const { subtotal, total } = calcularTotais();
  document.getElementById('pdvSubtotal').textContent = formatarMoeda(subtotal);
  document.getElementById('pdvTotal').textContent = formatarMoeda(total);
  document.getElementById('btnFinalizarVenda').disabled = carrinhoPdv.length === 0;
}

function setPdvStatus(msg, isErro){
  const el = document.getElementById('pdvStatus');
  el.textContent = msg || '';
  el.classList.toggle('erro', !!isErro);
}

function popularSelectClientesPdv(){
  const select = document.getElementById('pdvCliente');
  const atual = select.value;
  select.innerHTML = '<option value="">Consumidor não identificado</option>' +
    listarClientes().map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  select.value = atual;
}

function popularSelectPagamento(){
  const select = document.getElementById('pdvPagamento');
  if(select.options.length) return;
  select.innerHTML = FORMAS_PAGAMENTO.map(f => `<option value="${f}">${f}</option>`).join('');
}

function renderPdv(){
  popularSelectClientesPdv();
  popularSelectPagamento();
  document.getElementById('pdvVendedor').value = pegarVendedorAtual();
  renderCarrinho();
}

function finalizarVendaPdv(){
  if(!carrinhoPdv.length) return;
  const { desconto, total } = calcularTotais();
  const formaPagamento = document.getElementById('pdvPagamento').value;
  const clienteId = document.getElementById('pdvCliente').value || null;
  const vendedor = document.getElementById('pdvVendedor').value.trim();
  salvarVendedorAtual(vendedor);

  try{
    const venda = finalizarVenda({
      itens: carrinhoPdv.map(({ estoqueDisponivel, ...item }) => item),
      desconto,
      formaPagamento,
      clienteId,
      vendedor
    });
    carrinhoPdv = [];
    document.getElementById('pdvDesconto').value = 0;
    renderCarrinho();
    setPdvStatus(`Venda finalizada! Total: ${formatarMoeda(venda.total)}`);
  } catch(err){
    setPdvStatus('Erro ao finalizar venda: ' + err.message, true);
  }
}

function ligarEventosPdv(){
  const busca = document.getElementById('pdvBusca');
  busca.addEventListener('input', renderSugestoesPdv);
  busca.addEventListener('keypress', e => {
    if(e.key === 'Enter'){
      e.preventDefault();
      if(!tentarLeituraExata(busca.value)){
        renderSugestoesPdv();
      }
    }
  });

  document.getElementById('pdvSugestoes').addEventListener('click', e => {
    const item = e.target.closest('.sugestao-item');
    if(!item) return;
    const produto = buscarProduto(item.dataset.produto);
    const variacao = buscarVariacao(produto, item.dataset.variacao);
    if(produto && variacao) adicionarAoCarrinho(produto, variacao);
  });

  document.getElementById('pdvCarrinhoCorpo').addEventListener('click', e => {
    const linha = e.target.closest('tr');
    if(!linha) return;
    const idx = Number(linha.dataset.idx);
    const item = carrinhoPdv[idx];
    if(!item) return;

    if(e.target.closest('.btnMaisQtd')){
      if(item.qtd < item.estoqueDisponivel) item.qtd += 1;
      else setPdvStatus('Quantidade no carrinho já atingiu o estoque disponível.', true);
    } else if(e.target.closest('.btnMenosQtd')){
      item.qtd -= 1;
      if(item.qtd <= 0) carrinhoPdv.splice(idx, 1);
    } else if(e.target.closest('.btnRemoverItem')){
      carrinhoPdv.splice(idx, 1);
    } else {
      return;
    }
    renderCarrinho();
  });

  document.getElementById('pdvDesconto').addEventListener('input', renderCarrinho);

  document.getElementById('btnFinalizarVenda').addEventListener('click', finalizarVendaPdv);

  document.getElementById('btnLimparCarrinho').addEventListener('click', () => {
    if(!carrinhoPdv.length) return;
    if(confirm('Limpar o carrinho atual?')){
      carrinhoPdv = [];
      setPdvStatus('');
      renderCarrinho();
    }
  });
}
