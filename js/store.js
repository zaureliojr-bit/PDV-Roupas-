// Camada de dados do painel de vendas: tudo fica no Firestore (compartilhado
// entre todos os aparelhos que entrarem com o mesmo PIN) e é sincronizado em
// tempo real via onSnapshot. Nenhum outro arquivo fala com o Firestore
// diretamente — tudo passa por aqui. As arrays abaixo (produtos, clientes...)
// são mantidas atualizadas pelos listeners e lidas de forma síncrona pelo
// resto do app, como antes (quando eram carregadas do localStorage).

const TIPOS_MOVIMENTACAO = {
  entrada: 'Entrada',
  venda: 'Venda',
  devolucao: 'Devolução',
  ajuste: 'Ajuste',
  perda: 'Perda',
  troca: 'Troca'
};

const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Outros'];

const ULTIMO_VENDEDOR_STORAGE = 'vendas_ultimo_vendedor_id_v1';

function gerarId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

// ---------------- Sincronização em tempo real ----------------

let produtos = [];
let clientes = [];
let vendas = [];
let movimentacoes = [];
let vendedores = [];

// Chamado uma vez, depois que a autenticação anônima é concluída. `aoAtualizar`
// é chamado sempre que qualquer coleção mudar (local ou em outro aparelho).
function iniciarSincronizacao(aoAtualizar, aoErro){
  const colecoes = [
    { nome: 'produtos', arr: produtos, campo: 'nome' },
    { nome: 'clientes', arr: clientes, campo: 'nome' },
    { nome: 'vendas', arr: vendas, campo: 'data', desc: true },
    { nome: 'movimentacoes', arr: movimentacoes, campo: 'data', desc: true },
    { nome: 'vendedores', arr: vendedores, campo: 'nome' }
  ];

  colecoes.forEach(({ nome, arr, campo, desc }) => {
    db.collection(nome).orderBy(campo, desc ? 'desc' : 'asc').onSnapshot(snap => {
      arr.length = 0;
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      aoAtualizar();
    }, err => {
      console.error(`Erro ao sincronizar "${nome}":`, err);
      if(aoErro) aoErro(err);
    });
  });
}

// ---------------- Produtos ----------------

function listarProdutos(){ return produtos; }

function buscarProduto(id){ return produtos.find(p => p.id === id) || null; }

function normalizarVariacao(v){
  return {
    id: v.id || gerarId(),
    cor: (v.cor || '').trim(),
    tamanho: (v.tamanho || '').trim(),
    estoque: Math.max(0, Number(v.estoque) || 0)
  };
}

async function criarProduto(dados){
  const variacoes = (dados.variacoes && dados.variacoes.length)
    ? dados.variacoes.map(normalizarVariacao)
    : [normalizarVariacao({ cor: '', tamanho: '', estoque: dados.estoque || 0 })];

  const produto = {
    nome: (dados.nome || '').trim(),
    sku: (dados.sku || '').trim(),
    categoria: (dados.categoria || '').trim(),
    marca: (dados.marca || '').trim(),
    fornecedor: (dados.fornecedor || '').trim(),
    custo: Number(dados.custo) || 0,
    precoVenda: Number(dados.precoVenda) || 0,
    estoqueMinimo: Number(dados.estoqueMinimo) || 0,
    foto: (dados.foto || '').trim(),
    variacoes
  };
  const ref = await db.collection('produtos').add(produto);
  return { id: ref.id, ...produto };
}

async function atualizarProduto(id, dados){
  const produto = buscarProduto(id);
  if(!produto) return null;

  const atualizacao = {};
  if(dados.nome !== undefined) atualizacao.nome = dados.nome.trim();
  if(dados.sku !== undefined) atualizacao.sku = dados.sku.trim();
  if(dados.categoria !== undefined) atualizacao.categoria = dados.categoria.trim();
  if(dados.marca !== undefined) atualizacao.marca = dados.marca.trim();
  if(dados.fornecedor !== undefined) atualizacao.fornecedor = dados.fornecedor.trim();
  if(dados.custo !== undefined) atualizacao.custo = Number(dados.custo) || 0;
  if(dados.precoVenda !== undefined) atualizacao.precoVenda = Number(dados.precoVenda) || 0;
  if(dados.estoqueMinimo !== undefined) atualizacao.estoqueMinimo = Number(dados.estoqueMinimo) || 0;
  if(dados.foto !== undefined) atualizacao.foto = dados.foto.trim();
  if(dados.variacoes){
    atualizacao.variacoes = dados.variacoes.map(normalizarVariacao);
    if(!atualizacao.variacoes.length) atualizacao.variacoes = [normalizarVariacao({ cor: '', tamanho: '', estoque: 0 })];
  }

  await db.collection('produtos').doc(id).update(atualizacao);
  return { ...produto, ...atualizacao };
}

async function removerProduto(id){
  await db.collection('produtos').doc(id).delete();
}

function estoqueTotalProduto(produto){
  return produto.variacoes.reduce((soma, v) => soma + v.estoque, 0);
}

function produtoEstoqueBaixo(produto){
  return estoqueTotalProduto(produto) <= produto.estoqueMinimo;
}

function buscarVariacao(produto, variacaoId){
  return produto.variacoes.find(v => v.id === variacaoId) || produto.variacoes[0] || null;
}

function descreverVariacao(variacao){
  const partes = [variacao.cor, variacao.tamanho].filter(Boolean);
  return partes.length ? partes.join(' / ') : '-';
}

// ---------------- Clientes ----------------

function listarClientes(){ return clientes; }

function buscarCliente(id){ return clientes.find(c => c.id === id) || null; }

async function criarCliente(dados){
  const cliente = {
    nome: (dados.nome || '').trim(),
    telefone: (dados.telefone || '').trim(),
    cpf: (dados.cpf || '').trim()
  };
  const ref = await db.collection('clientes').add(cliente);
  return { id: ref.id, ...cliente };
}

async function atualizarCliente(id, dados){
  const cliente = buscarCliente(id);
  if(!cliente) return null;
  const atualizacao = {};
  if(dados.nome !== undefined) atualizacao.nome = dados.nome.trim();
  if(dados.telefone !== undefined) atualizacao.telefone = dados.telefone.trim();
  if(dados.cpf !== undefined) atualizacao.cpf = dados.cpf.trim();
  await db.collection('clientes').doc(id).update(atualizacao);
  return { ...cliente, ...atualizacao };
}

async function removerCliente(id){
  await db.collection('clientes').doc(id).delete();
}

function vendasDoCliente(clienteId){
  return vendas.filter(v => v.clienteId === clienteId).sort((a, b) => b.data.localeCompare(a.data));
}

function totalCompradoCliente(clienteId){
  return vendasAtivas(vendasDoCliente(clienteId)).reduce((soma, v) => soma + v.total, 0);
}

function ultimaCompraCliente(clienteId){
  const lista = vendasAtivas(vendasDoCliente(clienteId));
  return lista.length ? lista[0].data : null;
}

// ---------------- Vendedores ----------------

function listarVendedores(){ return vendedores; }

function buscarVendedor(id){ return vendedores.find(v => v.id === id) || null; }

async function criarVendedor(nome){
  const nomeLimpo = (nome || '').trim();
  if(!nomeLimpo) return null;
  const ref = await db.collection('vendedores').add({ nome: nomeLimpo });
  return { id: ref.id, nome: nomeLimpo };
}

async function removerVendedor(id){
  await db.collection('vendedores').doc(id).delete();
}

function pegarUltimoVendedorId(){
  return localStorage.getItem(ULTIMO_VENDEDOR_STORAGE) || '';
}

function salvarUltimoVendedorId(id){
  localStorage.setItem(ULTIMO_VENDEDOR_STORAGE, id || '');
}

// ---------------- Movimentações de estoque ----------------

function listarMovimentacoes(){ return movimentacoes; }

// Usa uma transação do Firestore para não perder baixas de estoque quando
// duas vendas/movimentações acontecem quase ao mesmo tempo em aparelhos
// diferentes (evita "última escrita ganha" sobrescrever a outra).
async function aplicarDeltaEstoqueTransacao(produtoId, variacaoId, delta){
  const ref = db.collection('produtos').doc(produtoId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if(!snap.exists) throw new Error('PRODUTO_INEXISTENTE');
    const variacoesAtuais = (snap.data().variacoes || []).map(v => ({ ...v }));
    const variacao = variacoesAtuais.find(v => v.id === variacaoId) || variacoesAtuais[0];
    if(!variacao) throw new Error('VARIACAO_INEXISTENTE');
    variacao.estoque = Math.max(0, (Number(variacao.estoque) || 0) + delta);
    tx.update(ref, { variacoes: variacoesAtuais });
  });
}

// delta: positivo aumenta estoque, negativo diminui. `tipo` só categoriza o motivo.
async function registrarMovimentacao({ produtoId, variacaoId, tipo, delta, obs, vendaId }){
  const produto = buscarProduto(produtoId);
  if(!produto) throw new Error('PRODUTO_INEXISTENTE');
  const variacao = buscarVariacao(produto, variacaoId);
  if(!variacao) throw new Error('VARIACAO_INEXISTENTE');

  await aplicarDeltaEstoqueTransacao(produtoId, variacao.id, delta);

  const mov = {
    data: new Date().toISOString(),
    produtoId,
    variacaoId: variacao.id,
    produtoNome: produto.nome,
    variacaoDesc: descreverVariacao(variacao),
    tipo,
    delta,
    obs: obs || '',
    vendaId: vendaId || null
  };
  const ref = await db.collection('movimentacoes').add(mov);
  return { id: ref.id, ...mov };
}

// ---------------- Vendas ----------------

function listarVendas(){ return vendas; }

function buscarVenda(id){ return vendas.find(v => v.id === id) || null; }

// itens: [{ produtoId, variacaoId, nome, variacaoDesc, qtd, precoUnit, custoUnit }]
async function finalizarVenda({ itens, desconto, formaPagamento, clienteId, vendedor }){
  if(!itens || !itens.length) throw new Error('CARRINHO_VAZIO');

  const subtotal = itens.reduce((soma, item) => soma + item.qtd * item.precoUnit, 0);
  const total = Math.max(0, subtotal - (Number(desconto) || 0));

  const venda = {
    data: new Date().toISOString(),
    itens,
    subtotal,
    desconto: Number(desconto) || 0,
    total,
    formaPagamento,
    clienteId: clienteId || null,
    vendedor: (vendedor || '').trim()
  };

  const ref = await db.collection('vendas').add(venda);

  for(const item of itens){
    await registrarMovimentacao({
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      tipo: 'venda',
      delta: -item.qtd,
      obs: 'Baixa automática por venda',
      vendaId: ref.id
    });
  }

  return { id: ref.id, ...venda };
}

// Cancela uma venda: devolve as quantidades ao estoque (uma movimentação de
// devolução por item, pra manter o histórico rastreável) e marca a venda
// como cancelada — ela some das somas de faturamento/lucro/etc., mas
// continua aparecendo no histórico (marcada) pra não sumir nenhum registro.
async function cancelarVenda(vendaId){
  const venda = buscarVenda(vendaId);
  if(!venda) throw new Error('VENDA_INEXISTENTE');
  if(venda.cancelada) return venda;

  for(const item of venda.itens){
    await registrarMovimentacao({
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      tipo: 'devolucao',
      delta: item.qtd,
      obs: 'Estorno automático — venda cancelada',
      vendaId
    });
  }

  const canceladaEm = new Date().toISOString();
  await db.collection('vendas').doc(vendaId).update({ cancelada: true, canceladaEm });

  return { ...venda, cancelada: true, canceladaEm };
}

// ---------------- Consultas agregadas ----------------

function vendasAtivas(listaVendas){
  return listaVendas.filter(v => !v.cancelada);
}

function inicioDoDia(data){
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function vendasNoPeriodo(inicio, fim){
  return vendas.filter(v => {
    const d = new Date(v.data);
    return d >= inicio && d <= fim;
  });
}

function vendasDeHoje(){
  const inicio = inicioDoDia(new Date());
  const fim = new Date();
  return vendasNoPeriodo(inicio, fim);
}

function faturamentoTotal(listaVendas){
  return vendasAtivas(listaVendas).reduce((soma, v) => soma + v.total, 0);
}

function lucroEstimado(listaVendas){
  return vendasAtivas(listaVendas).reduce((soma, v) => {
    const lucroVenda = v.itens.reduce((s, item) => s + (item.precoUnit - (item.custoUnit || 0)) * item.qtd, 0);
    return soma + lucroVenda;
  }, 0);
}

function produtosMaisVendidos(listaVendas, limite){
  const contagem = new Map();
  vendasAtivas(listaVendas).forEach(v => {
    v.itens.forEach(item => {
      const chave = item.produtoId;
      const atual = contagem.get(chave) || { produtoId: item.produtoId, nome: item.nome, qtd: 0, total: 0 };
      atual.qtd += item.qtd;
      atual.total += item.qtd * item.precoUnit;
      contagem.set(chave, atual);
    });
  });
  const lista = Array.from(contagem.values()).sort((a, b) => b.qtd - a.qtd);
  return limite ? lista.slice(0, limite) : lista;
}

function produtosParados(diasSemVenda){
  const limite = new Date();
  limite.setDate(limite.getDate() - diasSemVenda);
  const vendidosRecentemente = new Set();
  vendasAtivas(vendas).forEach(v => {
    if(new Date(v.data) >= limite){
      v.itens.forEach(item => vendidosRecentemente.add(item.produtoId));
    }
  });
  return produtos.filter(p => !vendidosRecentemente.has(p.id));
}

function vendasPorFormaPagamento(listaVendas){
  const mapa = new Map();
  vendasAtivas(listaVendas).forEach(v => {
    const atual = mapa.get(v.formaPagamento) || { formaPagamento: v.formaPagamento, qtd: 0, total: 0 };
    atual.qtd += 1;
    atual.total += v.total;
    mapa.set(v.formaPagamento, atual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

function vendasPorVendedor(listaVendas){
  const mapa = new Map();
  vendasAtivas(listaVendas).forEach(v => {
    const nome = v.vendedor || 'Não informado';
    const atual = mapa.get(nome) || { vendedor: nome, qtd: 0, total: 0 };
    atual.qtd += 1;
    atual.total += v.total;
    mapa.set(nome, atual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

function ticketMedio(listaVendas){
  const ativas = vendasAtivas(listaVendas);
  if(!ativas.length) return 0;
  return faturamentoTotal(ativas) / ativas.length;
}

function vendasPorDia(listaVendas){
  const mapa = new Map();
  vendasAtivas(listaVendas).forEach(v => {
    const dia = v.data.slice(0, 10);
    const atual = mapa.get(dia) || { dia, qtd: 0, total: 0 };
    atual.qtd += 1;
    atual.total += v.total;
    mapa.set(dia, atual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.dia.localeCompare(a.dia));
}
