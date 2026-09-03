// Tela de Clientes: cadastro, busca e histórico de compras.

let clienteEditandoId = null;
let clienteDetalheId = null;

function abrirFormCliente(cliente){
  clienteEditandoId = cliente ? cliente.id : null;
  document.getElementById('formClienteTitulo').textContent = cliente ? 'Editar cliente' : 'Novo cliente';
  document.getElementById('clienteId').value = cliente ? cliente.id : '';
  document.getElementById('cNome').value = cliente ? cliente.nome : '';
  document.getElementById('cTelefone').value = cliente ? cliente.telefone : '';
  document.getElementById('cCpf').value = cliente ? cliente.cpf : '';
  document.getElementById('formClienteCard').style.display = 'block';
  document.getElementById('formClienteCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormCliente(){
  clienteEditandoId = null;
  document.getElementById('formClienteCard').style.display = 'none';
  document.getElementById('formCliente').reset();
}

function clienteItemHtml(cliente){
  const total = totalCompradoCliente(cliente.id);
  const ultima = ultimaCompraCliente(cliente.id);
  return `
    <div class="item-produto" data-id="${cliente.id}">
      <div class="info">
        <div class="nome">${escapeHtml(cliente.nome)}</div>
        <div class="meta">${escapeHtml(cliente.telefone || 'Sem telefone')} · Total comprado: ${formatarMoeda(total)} · Última compra: ${ultima ? formatarDataCurta(ultima) : '-'}</div>
      </div>
      <div class="acoes">
        <button class="btn-icon btnVerCliente" aria-label="Ver histórico">👁</button>
        <button class="btn-icon btnEditarCliente" aria-label="Editar">✎</button>
        <button class="btn-icon btnRemoverCliente" aria-label="Remover">🗑</button>
      </div>
    </div>`;
}

function renderClientes(){
  const termo = (document.getElementById('clienteBusca').value || '').trim().toLowerCase();
  const lista = listarClientes().filter(c => {
    if(!termo) return true;
    return c.nome.toLowerCase().includes(termo) || c.telefone.toLowerCase().includes(termo);
  });

  const container = document.getElementById('clientesLista');
  const vazio = document.getElementById('clientesVazio');

  if(!lista.length){
    container.innerHTML = '';
    vazio.style.display = 'block';
  } else {
    vazio.style.display = 'none';
    container.innerHTML = `<div class="card">${lista.map(clienteItemHtml).join('')}</div>`;
  }

  if(clienteDetalheId) renderDetalheCliente();
}

function itemVendaHtml(venda){
  const itensTxt = venda.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ');
  return `<li><span>${formatarData(venda.data)} — ${escapeHtml(itensTxt)}</span><span class="destaque">${formatarMoeda(venda.total)}</span></li>`;
}

function renderDetalheCliente(){
  const cliente = buscarCliente(clienteDetalheId);
  const card = document.getElementById('clienteDetalheCard');
  if(!cliente){
    card.style.display = 'none';
    clienteDetalheId = null;
    return;
  }
  const historico = vendasDoCliente(cliente.id);
  document.getElementById('clienteDetalhe').innerHTML = `
    <h2>${escapeHtml(cliente.nome)}</h2>
    <p class="hint">${escapeHtml(cliente.telefone || 'Sem telefone')} ${cliente.cpf ? '· CPF ' + escapeHtml(cliente.cpf) : ''}</p>
    <p class="hint">Total comprado: <b style="color:var(--yellow);">${formatarMoeda(totalCompradoCliente(cliente.id))}</b></p>
    <h3>Histórico de compras</h3>
    ${historico.length ? `<ul class="lista-simples">${historico.map(itemVendaHtml).join('')}</ul>` : '<div class="empty">Nenhuma compra registrada.</div>'}
  `;
  card.style.display = 'block';
}

function ligarEventosClientes(){
  aplicarMascaraTelefone(document.getElementById('cTelefone'));

  document.getElementById('btnNovoCliente').addEventListener('click', () => abrirFormCliente(null));
  document.getElementById('btnCancelarCliente').addEventListener('click', fecharFormCliente);
  document.getElementById('clienteBusca').addEventListener('input', renderClientes);

  document.getElementById('formCliente').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = {
      nome: document.getElementById('cNome').value,
      telefone: document.getElementById('cTelefone').value,
      cpf: document.getElementById('cCpf').value
    };
    if(!dados.nome.trim()) return;

    const btnSalvar = document.querySelector('#formCliente button[type=submit]');
    btnSalvar.disabled = true;
    try{
      if(clienteEditandoId){
        await atualizarCliente(clienteEditandoId, dados);
      } else {
        await criarCliente(dados);
      }
      fecharFormCliente();
      renderClientes();
    } catch(err){
      alert('Erro ao salvar cliente: ' + err.message);
    } finally {
      btnSalvar.disabled = false;
    }
  });

  document.getElementById('clientesLista').addEventListener('click', async e => {
    const item = e.target.closest('.item-produto');
    if(!item) return;
    const id = item.dataset.id;

    if(e.target.closest('.btnEditarCliente')){
      abrirFormCliente(buscarCliente(id));
    } else if(e.target.closest('.btnRemoverCliente')){
      if(confirm('Remover este cliente? O histórico de vendas será mantido, mas desvinculado.')){
        try{
          await removerCliente(id);
        } catch(err){
          alert('Erro ao remover cliente: ' + err.message);
        }
      }
    } else if(e.target.closest('.btnVerCliente')){
      clienteDetalheId = id;
      renderDetalheCliente();
      document.getElementById('clienteDetalheCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  document.getElementById('btnFecharDetalheCliente').addEventListener('click', () => {
    clienteDetalheId = null;
    document.getElementById('clienteDetalheCard').style.display = 'none';
  });
}
