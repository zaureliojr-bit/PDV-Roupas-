// Frente de caixa: busca de produto (ou leitura de código de barras via SKU +
// Enter, como um leitor de código de barras normalmente se comporta), carrinho,
// desconto, forma de pagamento e finalização da venda com baixa automática no
// estoque (feita por `finalizarVenda` em store.js).

let carrinhoPdv = [];
let ultimoComprovante = null;

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
  esconderComprovante();
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
  const desconto = valorMascaraParaNumero(document.getElementById('pdvDesconto').value);
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

let clienteSelecionadoId = null;

function digitosSomente(texto){
  return (texto || '').replace(/\D/g, '');
}

// Busca por nome (substring) ou por telefone — comparando só os dígitos, o
// que já permite achar sem digitar o DDD (ex: "94026" bate com "(11) 94026-6948").
function buscarClientesPdv(termo){
  const t = termo.trim().toLowerCase();
  if(!t) return [];
  const digitos = digitosSomente(termo);
  return listarClientes().filter(c => {
    const bateNome = c.nome.toLowerCase().includes(t);
    const batePhone = digitos && digitosSomente(c.telefone).includes(digitos);
    return bateNome || batePhone;
  }).slice(0, 6);
}

function sugestaoClienteHtml(cliente){
  return `
    <div class="sugestao-item" data-cliente="${cliente.id}">
      <span class="nome">${escapeHtml(cliente.nome)}</span>
      <span class="preco">${escapeHtml(cliente.telefone || '')}</span>
    </div>`;
}

function renderSugestoesClientePdv(){
  const termo = document.getElementById('pdvClienteBusca').value;
  const resultados = clienteSelecionadoId ? [] : buscarClientesPdv(termo);
  document.getElementById('pdvClienteSugestoes').innerHTML = resultados.map(sugestaoClienteHtml).join('');
}

function selecionarClientePdv(cliente){
  clienteSelecionadoId = cliente ? cliente.id : null;
  document.getElementById('pdvClienteBusca').value = cliente ? cliente.nome : '';
  document.getElementById('pdvClienteSugestoes').innerHTML = '';
}

function popularSelectVendedoresPdv(){
  const select = document.getElementById('pdvVendedor');
  const atual = select.value || pegarUltimoVendedorId();
  select.innerHTML = '<option value="">Selecione...</option>' +
    listarVendedores().map(v => `<option value="${v.id}">${escapeHtml(v.nome)}</option>`).join('');
  select.value = atual;
}

function popularSelectPagamento(){
  const select = document.getElementById('pdvPagamento');
  if(select.options.length) return;
  select.innerHTML = FORMAS_PAGAMENTO.map(f => `<option value="${f}">${f}</option>`).join('');
}

function renderPdv(){
  popularSelectVendedoresPdv();
  popularSelectPagamento();
  renderCarrinho();
}

// Telefones cadastrados com o formato novo (+55 (11) 94026-6948) já vêm com
// o código do país nos dígitos; cadastros antigos (só 11 dígitos, sem
// código) ainda precisam do "55" na frente pro link do WhatsApp funcionar.
function numeroWhatsapp(telefone){
  const digitos = digitosTelefone(telefone);
  if(!digitos) return '';
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

function gerarComprovanteTexto(venda, clienteNome){
  const linhasItens = venda.itens.map(item => {
    const variacao = item.variacaoDesc && item.variacaoDesc !== '-' ? ` (${item.variacaoDesc})` : '';
    return `${item.qtd}x ${item.nome}${variacao} — ${formatarMoeda(item.qtd * item.precoUnit)}`;
  }).join('\n');

  let texto = `*Comprovante de venda*\n${formatarData(venda.data)}\n`;
  if(clienteNome) texto += `Cliente: ${clienteNome}\n`;
  texto += `\n${linhasItens}\n\nSubtotal: ${formatarMoeda(venda.subtotal)}\n`;
  if(venda.desconto) texto += `Desconto: ${formatarMoeda(venda.desconto)}\n`;
  texto += `*Total: ${formatarMoeda(venda.total)}*\n\nForma de pagamento: ${venda.formaPagamento}\n`;
  if(venda.vendedor) texto += `Vendedor(a): ${venda.vendedor}\n`;
  texto += `\nObrigado pela preferência! 💛`;
  return texto;
}

function mostrarComprovante(venda, clienteNome, clienteTelefone){
  ultimoComprovante = { venda, clienteNome, clienteTelefone };
  document.getElementById('pdvComprovanteAcao').style.display = 'block';
}

function esconderComprovante(){
  ultimoComprovante = null;
  document.getElementById('pdvComprovanteAcao').style.display = 'none';
}

function enviarComprovanteWhatsapp(){
  if(!ultimoComprovante) return;
  const { venda, clienteNome, clienteTelefone } = ultimoComprovante;
  const texto = gerarComprovanteTexto(venda, clienteNome);
  const numero = numeroWhatsapp(clienteTelefone);
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
}

async function finalizarVendaPdv(){
  if(!carrinhoPdv.length) return;
  const { desconto } = calcularTotais();
  const formaPagamento = document.getElementById('pdvPagamento').value;
  const clienteId = clienteSelecionadoId;
  const clienteAtual = clienteId ? buscarCliente(clienteId) : null;
  const vendedorId = document.getElementById('pdvVendedor').value;
  const vendedor = vendedorId ? buscarVendedor(vendedorId)?.nome || '' : '';

  if(!vendedorId){
    setPdvStatus('Selecione o vendedor (cadastre um na aba Config, se ainda não tiver).', true);
    return;
  }
  salvarUltimoVendedorId(vendedorId);

  const btn = document.getElementById('btnFinalizarVenda');
  btn.disabled = true;
  try{
    const venda = await finalizarVenda({
      itens: carrinhoPdv.map(({ estoqueDisponivel, ...item }) => item),
      desconto,
      formaPagamento,
      clienteId,
      vendedor
    });
    carrinhoPdv = [];
    document.getElementById('pdvDesconto').value = '';
    selecionarClientePdv(null);
    renderCarrinho();
    mostrarComprovante(venda, clienteAtual?.nome || null, clienteAtual?.telefone || null);
    setPdvStatus(`Venda finalizada! Total: ${formatarMoeda(venda.total)}`);
  } catch(err){
    setPdvStatus('Erro ao finalizar venda: ' + err.message, true);
    btn.disabled = carrinhoPdv.length === 0;
  }
}

function ligarEventosPdv(){
  aplicarMascaraMoeda(document.getElementById('pdvDesconto'));
  document.getElementById('btnComprovanteWhats').addEventListener('click', enviarComprovanteWhatsapp);

  const clienteBusca = document.getElementById('pdvClienteBusca');
  clienteBusca.addEventListener('input', () => {
    clienteSelecionadoId = null;
    renderSugestoesClientePdv();
  });
  clienteBusca.addEventListener('focus', renderSugestoesClientePdv);

  document.getElementById('pdvClienteSugestoes').addEventListener('click', e => {
    const item = e.target.closest('.sugestao-item');
    if(!item) return;
    selecionarClientePdv(buscarCliente(item.dataset.cliente));
  });

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
