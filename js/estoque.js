// Tela de Movimentações de estoque: registro manual (entrada, devolução,
// ajuste, perda, troca) e histórico. Vendas geram movimentação automaticamente
// pelo PDV (store.js), então não aparecem no formulário aqui.

function opcoesProdutoHtml(){
  return listarProdutos()
    .map(p => `<option value="${p.id}">${escapeHtml(p.nome)}${p.sku ? ' (' + escapeHtml(p.sku) + ')' : ''}</option>`)
    .join('');
}

function opcoesVariacaoHtml(produtoId){
  const produto = buscarProduto(produtoId);
  if(!produto) return '';
  return produto.variacoes
    .map(v => `<option value="${v.id}">${escapeHtml(descreverVariacao(v))} — estoque ${v.estoque}</option>`)
    .join('');
}

function popularSelectsMovimentacao(){
  const produtoSel = document.getElementById('movProduto');
  const produtoNovoSel = document.getElementById('movProdutoNovo');
  const valorAnterior = produtoSel.value;
  const valorAnteriorNovo = produtoNovoSel.value;

  produtoSel.innerHTML = opcoesProdutoHtml();
  produtoNovoSel.innerHTML = opcoesProdutoHtml();

  if(valorAnterior) produtoSel.value = valorAnterior;
  if(valorAnteriorNovo) produtoNovoSel.value = valorAnteriorNovo;

  atualizarVariacoesMovimentacao();
  atualizarVariacoesMovimentacaoNovo();
}

function atualizarVariacoesMovimentacao(){
  document.getElementById('movVariacao').innerHTML = opcoesVariacaoHtml(document.getElementById('movProduto').value);
}

function atualizarVariacoesMovimentacaoNovo(){
  document.getElementById('movVariacaoNovo').innerHTML = opcoesVariacaoHtml(document.getElementById('movProdutoNovo').value);
}

function atualizarFormPorTipo(){
  const tipo = document.getElementById('movTipo').value;
  const trocaExtra = document.getElementById('movTrocaExtra');
  const qtdLabel = document.getElementById('movQtdLabel');
  const qtdInput = document.getElementById('movQtd');

  trocaExtra.style.display = tipo === 'troca' ? 'block' : 'none';

  if(tipo === 'ajuste'){
    qtdLabel.firstChild.textContent = 'Quantidade (use negativo para reduzir) ';
    qtdInput.removeAttribute('min');
  } else if(tipo === 'troca'){
    qtdLabel.firstChild.textContent = 'Quantidade trocada ';
    qtdInput.min = 1;
  } else {
    qtdLabel.firstChild.textContent = 'Quantidade ';
    qtdInput.min = 1;
  }
}

function setMovStatus(msg, isErro){
  const el = document.getElementById('movStatus');
  el.textContent = msg || '';
  el.classList.toggle('erro', !!isErro);
}

function linhaMovimentacaoHtml(mov){
  const positivo = mov.delta > 0;
  return `
    <div class="item-produto">
      <div class="info">
        <div class="nome">${TIPOS_MOVIMENTACAO[mov.tipo] || mov.tipo} — ${escapeHtml(mov.produtoNome)}
          <span style="color:${positivo ? 'var(--green)' : 'var(--red)'}; font-weight:800;">${positivo ? '+' : ''}${mov.delta}</span>
        </div>
        <div class="meta">${escapeHtml(mov.variacaoDesc)} · ${formatarData(mov.data)}${mov.obs ? ' · ' + escapeHtml(mov.obs) : ''}</div>
      </div>
    </div>`;
}

function renderEstoque(){
  popularSelectsMovimentacao();
  atualizarFormPorTipo();

  const filtro = document.getElementById('movFiltroTipo').value;
  const lista = listarMovimentacoes().filter(m => !filtro || m.tipo === filtro);
  const container = document.getElementById('movLista');
  const vazio = document.getElementById('movVazio');

  if(!lista.length){
    container.innerHTML = '';
    vazio.style.display = 'block';
  } else {
    vazio.style.display = 'none';
    container.innerHTML = lista.map(linhaMovimentacaoHtml).join('');
  }
}

function ligarEventosEstoque(){
  document.getElementById('movTipo').addEventListener('change', atualizarFormPorTipo);
  document.getElementById('movProduto').addEventListener('change', atualizarVariacoesMovimentacao);
  document.getElementById('movProdutoNovo').addEventListener('change', atualizarVariacoesMovimentacaoNovo);
  document.getElementById('movFiltroTipo').addEventListener('change', renderEstoque);

  document.getElementById('formMovimentacao').addEventListener('submit', async e => {
    e.preventDefault();
    const tipo = document.getElementById('movTipo').value;
    const produtoId = document.getElementById('movProduto').value;
    const variacaoId = document.getElementById('movVariacao').value;
    const qtd = Number(document.getElementById('movQtd').value);
    const obs = document.getElementById('movObs').value;

    if(!produtoId){
      setMovStatus('Cadastre um produto antes de registrar movimentações.', true);
      return;
    }
    if(!qtd){
      setMovStatus('Informe uma quantidade válida.', true);
      return;
    }

    const btnSalvar = document.querySelector('#formMovimentacao button[type=submit]');
    btnSalvar.disabled = true;
    try{
      if(tipo === 'troca'){
        const produtoNovoId = document.getElementById('movProdutoNovo').value;
        const variacaoNovoId = document.getElementById('movVariacaoNovo').value;
        if(!produtoNovoId){
          setMovStatus('Selecione o produto de entrada da troca.', true);
          return;
        }
        await registrarMovimentacao({ produtoId, variacaoId, tipo, delta: -Math.abs(qtd), obs: obs ? `Troca (saída): ${obs}` : 'Troca (saída)' });
        await registrarMovimentacao({ produtoId: produtoNovoId, variacaoId: variacaoNovoId, tipo, delta: Math.abs(qtd), obs: obs ? `Troca (entrada): ${obs}` : 'Troca (entrada)' });
      } else if(tipo === 'perda'){
        await registrarMovimentacao({ produtoId, variacaoId, tipo, delta: -Math.abs(qtd), obs });
      } else if(tipo === 'ajuste'){
        await registrarMovimentacao({ produtoId, variacaoId, tipo, delta: qtd, obs });
      } else {
        // entrada, devolucao
        await registrarMovimentacao({ produtoId, variacaoId, tipo, delta: Math.abs(qtd), obs });
      }

      document.getElementById('formMovimentacao').reset();
      atualizarFormPorTipo();
      setMovStatus('Movimentação registrada.');
      renderEstoque();
    } catch(err){
      setMovStatus('Erro: ' + err.message, true);
    } finally {
      btnSalvar.disabled = false;
    }
  });
}
