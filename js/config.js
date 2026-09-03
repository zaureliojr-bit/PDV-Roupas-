// Aba de Configurações: cadastro de vendedores (compartilhado entre todos os
// aparelhos via Firestore) e bloqueio do app neste aparelho.

function vendedorItemHtml(vendedor){
  return `
    <div class="item-produto" data-id="${vendedor.id}">
      <div class="info">
        <div class="nome">${escapeHtml(vendedor.nome)}</div>
      </div>
      <div class="acoes">
        <button class="btn-icon btnRemoverVendedor" aria-label="Remover">🗑</button>
      </div>
    </div>`;
}

function renderConfig(){
  const lista = listarVendedores();
  const container = document.getElementById('vendedoresLista');
  const vazio = document.getElementById('vendedoresVazio');

  if(!lista.length){
    container.innerHTML = '';
    vazio.style.display = 'block';
  } else {
    vazio.style.display = 'none';
    container.innerHTML = lista.map(vendedorItemHtml).join('');
  }
}

function ligarEventosConfig(){
  document.getElementById('formVendedor').addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('vendedorNome');
    const nome = input.value.trim();
    if(!nome) return;

    input.disabled = true;
    try{
      await criarVendedor(nome);
      input.value = '';
    } catch(err){
      alert('Erro ao salvar vendedor: ' + err.message);
    } finally {
      input.disabled = false;
      input.focus();
    }
  });

  document.getElementById('vendedoresLista').addEventListener('click', async e => {
    const btn = e.target.closest('.btnRemoverVendedor');
    if(!btn) return;
    const id = btn.closest('.item-produto').dataset.id;
    if(confirm('Remover este vendedor?')){
      try{
        await removerVendedor(id);
      } catch(err){
        alert('Erro ao remover vendedor: ' + err.message);
      }
    }
  });

  document.getElementById('btnBloquearApp').addEventListener('click', () => {
    if(confirm('Bloquear o app neste aparelho? Será necessário digitar o PIN novamente para entrar.')){
      bloquearApp();
    }
  });
}
