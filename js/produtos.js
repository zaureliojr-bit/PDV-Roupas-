// Tela de Produtos/Estoque: listagem, busca e formulário de cadastro com variações.

let produtoEditandoId = null;
let variacoesEmEdicao = [];

function linhaVariacaoHtml(v, idx){
  return `
    <div class="variacao-row" data-idx="${idx}">
      <input type="text" class="vCor" placeholder="Cor" value="${escapeHtml(v.cor)}" />
      <input type="text" class="vTamanho" placeholder="Tamanho" value="${escapeHtml(v.tamanho)}" />
      <input type="number" class="vEstoque" placeholder="Estoque" min="0" step="1" value="${v.estoque}" />
      <button type="button" class="btn-icon btnRemoverVariacao" aria-label="Remover variação">✕</button>
    </div>`;
}

function renderVariacoesForm(){
  const container = document.getElementById('variacoesLista');
  container.innerHTML = variacoesEmEdicao.map(linhaVariacaoHtml).join('');
}

function lerVariacoesForm(){
  const linhas = document.querySelectorAll('#variacoesLista .variacao-row');
  return Array.from(linhas).map(linha => ({
    cor: linha.querySelector('.vCor').value,
    tamanho: linha.querySelector('.vTamanho').value,
    estoque: linha.querySelector('.vEstoque').value
  }));
}

function abrirFormProduto(produto){
  fecharLote();
  produtoEditandoId = produto ? produto.id : null;
  document.getElementById('formProdutoTitulo').textContent = produto ? 'Editar produto' : 'Novo produto';
  document.getElementById('produtoId').value = produto ? produto.id : '';
  document.getElementById('pNome').value = produto ? produto.nome : '';
  document.getElementById('pSku').value = produto ? produto.sku : '';
  document.getElementById('pCategoria').value = produto ? produto.categoria : '';
  document.getElementById('pMarca').value = produto ? produto.marca : '';
  document.getElementById('pFornecedor').value = produto ? produto.fornecedor : '';
  document.getElementById('pFoto').value = produto ? produto.foto : '';
  document.getElementById('pCusto').value = produto ? numeroParaMascara(produto.custo) : '';
  document.getElementById('pPreco').value = produto ? numeroParaMascara(produto.precoVenda) : '';
  document.getElementById('pEstoqueMinimo').value = produto ? produto.estoqueMinimo : 0;

  variacoesEmEdicao = produto
    ? produto.variacoes.map(v => ({ ...v }))
    : [{ cor: '', tamanho: '', estoque: 0 }];
  renderVariacoesForm();

  document.getElementById('formProdutoCard').style.display = 'block';
  document.getElementById('formProdutoCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormProduto(){
  produtoEditandoId = null;
  document.getElementById('formProdutoCard').style.display = 'none';
  document.getElementById('formProduto').reset();
}

function produtoItemHtml(produto){
  const total = estoqueTotalProduto(produto);
  const baixo = produtoEstoqueBaixo(produto);
  const variacoesTxt = produto.variacoes
    .map(v => `${descreverVariacao(v)}: ${v.estoque}`)
    .join(' · ');
  return `
    <div class="item-produto" data-id="${produto.id}">
      <div class="info">
        <div class="nome">${escapeHtml(produto.nome)} ${produto.sku ? `<span style="color:var(--gray); font-weight:400;">(${escapeHtml(produto.sku)})</span>` : ''}
          <span class="badge ${baixo ? 'baixo' : 'ok'}">${baixo ? 'estoque baixo' : 'estoque ok'}</span>
        </div>
        <div class="meta">${escapeHtml(produto.categoria || 'Sem categoria')} · ${formatarMoeda(produto.precoVenda)} · Estoque total: ${total}</div>
        <div class="meta">${escapeHtml(variacoesTxt)}</div>
      </div>
      <div class="acoes">
        <button class="btn-icon btnEditarProduto" aria-label="Editar">✎</button>
        <button class="btn-icon btnRemoverProduto" aria-label="Remover">🗑</button>
      </div>
    </div>`;
}

function renderProdutos(){
  const termo = (document.getElementById('produtoBusca').value || '').trim().toLowerCase();
  const lista = listarProdutos().filter(p => {
    if(!termo) return true;
    return p.nome.toLowerCase().includes(termo)
      || p.sku.toLowerCase().includes(termo)
      || p.categoria.toLowerCase().includes(termo);
  });

  const container = document.getElementById('produtosLista');
  const vazio = document.getElementById('produtosVazio');

  if(!lista.length){
    container.innerHTML = '';
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';
  container.innerHTML = `<div class="card">${lista.map(produtoItemHtml).join('')}</div>`;
}

// ---------------- Cadastro em lote ----------------
// Formato de cada linha: Nome; Preço; Cores; Tamanhos
// Cores e tamanhos são listas separadas por vírgula — uma variação é criada
// pra cada combinação (estoque começa em 0, ajustável depois).

function abrirLote(){
  fecharFormProduto();
  document.getElementById('loteResultado').textContent = '';
  document.getElementById('loteCard').style.display = 'block';
  document.getElementById('loteCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharLote(){
  document.getElementById('loteCard').style.display = 'none';
  document.getElementById('loteTexto').value = '';
  document.getElementById('loteResultado').textContent = '';
}

function parsearPrecoLote(texto){
  const limpo = (texto || '').replace(/[^\d,.-]/g, '');
  if(!limpo) return 0;
  if(limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(limpo) || 0;
}

function parsearLinhaLote(linha){
  const partes = linha.split(';').map(p => p.trim());
  const nome = partes[0] || '';
  if(!nome || partes.length < 2 || !partes[1]) return null;

  const precoVenda = parsearPrecoLote(partes[1] || '');
  const cores = (partes[2] || '').split(',').map(c => c.trim()).filter(Boolean);
  const tamanhos = (partes[3] || '').split(',').map(t => t.trim()).filter(Boolean);

  const listaCores = cores.length ? cores : [''];
  const listaTamanhos = tamanhos.length ? tamanhos : [''];
  const variacoes = [];
  listaCores.forEach(cor => {
    listaTamanhos.forEach(tamanho => variacoes.push({ cor, tamanho, estoque: 0 }));
  });

  return { nome, precoVenda, variacoes };
}

async function processarLote(){
  const linhas = document.getElementById('loteTexto').value
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  const resultado = document.getElementById('loteResultado');
  if(!linhas.length){
    resultado.textContent = 'Cole pelo menos uma linha.';
    resultado.classList.add('erro');
    return;
  }

  const btn = document.getElementById('btnCadastrarLote');
  btn.disabled = true;
  resultado.classList.remove('erro');
  resultado.textContent = `Cadastrando ${linhas.length} linha(s)...`;

  let sucesso = 0;
  const erros = [];
  for(const linha of linhas){
    const dados = parsearLinhaLote(linha);
    if(!dados){
      erros.push(`"${linha}" — preciso de pelo menos Nome; Preço`);
      continue;
    }
    try{
      await criarProduto(dados);
      sucesso++;
    } catch(err){
      erros.push(`"${linha}" — erro: ${err.message}`);
    }
  }

  let msg = `${sucesso} produto(s) cadastrado(s) com sucesso.`;
  if(erros.length) msg += `\n\n${erros.length} linha(s) com problema:\n` + erros.join('\n');
  resultado.textContent = msg;
  resultado.classList.toggle('erro', erros.length > 0);
  btn.disabled = false;

  if(sucesso > 0){
    document.getElementById('loteTexto').value = '';
    renderProdutos();
  }
}

function ligarEventosProdutos(){
  aplicarMascaraMoeda(document.getElementById('pCusto'));
  aplicarMascaraMoeda(document.getElementById('pPreco'));

  document.getElementById('btnNovoProduto').addEventListener('click', () => abrirFormProduto(null));
  document.getElementById('btnCancelarProduto').addEventListener('click', fecharFormProduto);

  document.getElementById('btnScannerSku').addEventListener('click', () => {
    abrirScannerCamera(codigo => {
      document.getElementById('pSku').value = codigo;
    });
  });
  document.getElementById('produtoBusca').addEventListener('input', renderProdutos);

  document.getElementById('btnAbrirLote').addEventListener('click', abrirLote);
  document.getElementById('btnCancelarLote').addEventListener('click', fecharLote);
  document.getElementById('btnCadastrarLote').addEventListener('click', processarLote);

  document.getElementById('btnAddVariacao').addEventListener('click', () => {
    variacoesEmEdicao = lerVariacoesForm();
    variacoesEmEdicao.push({ cor: '', tamanho: '', estoque: 0 });
    renderVariacoesForm();
  });

  document.getElementById('variacoesLista').addEventListener('click', e => {
    const btn = e.target.closest('.btnRemoverVariacao');
    if(!btn) return;
    const idx = Number(btn.closest('.variacao-row').dataset.idx);
    variacoesEmEdicao = lerVariacoesForm();
    if(variacoesEmEdicao.length <= 1) return;
    variacoesEmEdicao.splice(idx, 1);
    renderVariacoesForm();
  });

  document.getElementById('formProduto').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = {
      nome: document.getElementById('pNome').value,
      sku: document.getElementById('pSku').value,
      categoria: document.getElementById('pCategoria').value,
      marca: document.getElementById('pMarca').value,
      fornecedor: document.getElementById('pFornecedor').value,
      foto: document.getElementById('pFoto').value,
      custo: valorMascaraParaNumero(document.getElementById('pCusto').value),
      precoVenda: valorMascaraParaNumero(document.getElementById('pPreco').value),
      estoqueMinimo: document.getElementById('pEstoqueMinimo').value,
      variacoes: lerVariacoesForm()
    };
    if(!dados.nome.trim()) return;

    const btnSalvar = document.querySelector('#formProduto button[type=submit]');
    btnSalvar.disabled = true;
    try{
      if(produtoEditandoId){
        await atualizarProduto(produtoEditandoId, dados);
      } else {
        await criarProduto(dados);
      }
      fecharFormProduto();
      renderProdutos();
    } catch(err){
      alert('Erro ao salvar produto: ' + err.message);
    } finally {
      btnSalvar.disabled = false;
    }
  });

  document.getElementById('produtosLista').addEventListener('click', async e => {
    const item = e.target.closest('.item-produto');
    if(!item) return;
    const id = item.dataset.id;

    if(e.target.closest('.btnEditarProduto')){
      abrirFormProduto(buscarProduto(id));
    } else if(e.target.closest('.btnRemoverProduto')){
      if(confirm('Remover este produto? Essa ação não pode ser desfeita.')){
        try{
          await removerProduto(id);
        } catch(err){
          alert('Erro ao remover produto: ' + err.message);
        }
      }
    }
  });
}
