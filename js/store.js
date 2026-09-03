// Camada de dados do painel de vendas: persistência em localStorage e regras de
// negócio (estoque, vendas, movimentações). Nenhum outro arquivo lê localStorage
// diretamente — tudo passa por aqui.

const DB_KEYS = {
  produtos: 'vendas_produtos_v1',
  clientes: 'vendas_clientes_v1',
  vendas: 'vendas_vendas_v1',
  movimentacoes: 'vendas_movimentacoes_v1',
  vendedor: 'vendas_vendedor_atual_v1'
};

const TIPOS_MOVIMENTACAO = {
  entrada: 'Entrada',
  venda: 'Venda',
  devolucao: 'Devolução',
  ajuste: 'Ajuste',
  perda: 'Perda',
  troca: 'Troca'
};

const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Outros'];

function lerJSON(chave, valorPadrao){
  const raw = localStorage.getItem(chave);
  if(!raw) return valorPadrao;
  try{
    const dado = JSON.parse(raw);
    return (dado === null || dado === undefined) ? valorPadrao : dado;
  } catch(err){
    console.warn(`Dado inválido em "${chave}", ignorando:`, err);
    return valorPadrao;
  }
}

function salvarJSON(chave, valor){
  localStorage.setItem(chave, JSON.stringify(valor));
}

function gerarId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

// ---------------- Produtos ----------------

let produtos = lerJSON(DB_KEYS.produtos, []);
if(!Array.isArray(produtos)) produtos = [];

function salvarProdutos(){ salvarJSON(DB_KEYS.produtos, produtos); }

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

function criarProduto(dados){
  const variacoes = (dados.variacoes && dados.variacoes.length)
    ? dados.variacoes.map(normalizarVariacao)
    : [normalizarVariacao({ cor: '', tamanho: '', estoque: dados.estoque || 0 })];

  const produto = {
    id: gerarId(),
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
  produtos.push(produto);
  salvarProdutos();
  return produto;
}

function atualizarProduto(id, dados){
  const produto = buscarProduto(id);
  if(!produto) return null;
  if(dados.nome !== undefined) produto.nome = dados.nome.trim();
  if(dados.sku !== undefined) produto.sku = dados.sku.trim();
  if(dados.categoria !== undefined) produto.categoria = dados.categoria.trim();
  if(dados.marca !== undefined) produto.marca = dados.marca.trim();
  if(dados.fornecedor !== undefined) produto.fornecedor = dados.fornecedor.trim();
  if(dados.custo !== undefined) produto.custo = Number(dados.custo) || 0;
  if(dados.precoVenda !== undefined) produto.precoVenda = Number(dados.precoVenda) || 0;
  if(dados.estoqueMinimo !== undefined) produto.estoqueMinimo = Number(dados.estoqueMinimo) || 0;
  if(dados.foto !== undefined) produto.foto = dados.foto.trim();
  if(dados.variacoes) produto.variacoes = dados.variacoes.map(normalizarVariacao);
  if(!produto.variacoes.length) produto.variacoes = [normalizarVariacao({ cor: '', tamanho: '', estoque: 0 })];
  salvarProdutos();
  return produto;
}

function removerProduto(id){
  produtos = produtos.filter(p => p.id !== id);
  salvarProdutos();
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

// ---------------- Clientes ----------------

let clientes = lerJSON(DB_KEYS.clientes, []);
if(!Array.isArray(clientes)) clientes = [];

function salvarClientes(){ salvarJSON(DB_KEYS.clientes, clientes); }

function listarClientes(){ return clientes; }

function buscarCliente(id){ return clientes.find(c => c.id === id) || null; }

function criarCliente(dados){
  const cliente = {
    id: gerarId(),
    nome: (dados.nome || '').trim(),
    telefone: (dados.telefone || '').trim(),
    cpf: (dados.cpf || '').trim()
  };
  clientes.push(cliente);
  salvarClientes();
  return cliente;
}

function atualizarCliente(id, dados){
  const cliente = buscarCliente(id);
  if(!cliente) return null;
  if(dados.nome !== undefined) cliente.nome = dados.nome.trim();
  if(dados.telefone !== undefined) cliente.telefone = dados.telefone.trim();
  if(dados.cpf !== undefined) cliente.cpf = dados.cpf.trim();
  salvarClientes();
  return cliente;
}

function removerCliente(id){
  clientes = clientes.filter(c => c.id !== id);
  salvarClientes();
}

function vendasDoCliente(clienteId){
  return vendas.filter(v => v.clienteId === clienteId).sort((a, b) => b.data.localeCompare(a.data));
}

function totalCompradoCliente(clienteId){
  return vendasDoCliente(clienteId).reduce((soma, v) => soma + v.total, 0);
}

function ultimaCompraCliente(clienteId){
  const lista = vendasDoCliente(clienteId);
  return lista.length ? lista[0].data : null;
}

// ---------------- Movimentações de estoque ----------------

let movimentacoes = lerJSON(DB_KEYS.movimentacoes, []);
if(!Array.isArray(movimentacoes)) movimentacoes = [];

function salvarMovimentacoes(){ salvarJSON(DB_KEYS.movimentacoes, movimentacoes); }

function listarMovimentacoes(){ return movimentacoes; }

function aplicarDeltaEstoque(produtoId, variacaoId, delta){
  const produto = buscarProduto(produtoId);
  if(!produto) return false;
  const variacao = buscarVariacao(produto, variacaoId);
  if(!variacao) return false;
  variacao.estoque = Math.max(0, variacao.estoque + delta);
  salvarProdutos();
  return true;
}

// delta: positivo aumenta estoque, negativo diminui. `tipo` só categoriza o motivo.
function registrarMovimentacao({ produtoId, variacaoId, tipo, delta, obs, vendaId }){
  const produto = buscarProduto(produtoId);
  if(!produto) throw new Error('PRODUTO_INEXISTENTE');
  const variacao = buscarVariacao(produto, variacaoId);
  if(!variacao) throw new Error('VARIACAO_INEXISTENTE');

  aplicarDeltaEstoque(produtoId, variacao.id, delta);

  const mov = {
    id: gerarId(),
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
  movimentacoes.unshift(mov);
  salvarMovimentacoes();
  return mov;
}

function descreverVariacao(variacao){
  const partes = [variacao.cor, variacao.tamanho].filter(Boolean);
  return partes.length ? partes.join(' / ') : '-';
}

// ---------------- Vendas ----------------

let vendas = lerJSON(DB_KEYS.vendas, []);
if(!Array.isArray(vendas)) vendas = [];

function salvarVendas(){ salvarJSON(DB_KEYS.vendas, vendas); }

function listarVendas(){ return vendas; }

function buscarVenda(id){ return vendas.find(v => v.id === id) || null; }

// itens: [{ produtoId, variacaoId, nome, variacaoDesc, qtd, precoUnit, custoUnit }]
function finalizarVenda({ itens, desconto, formaPagamento, clienteId, vendedor }){
  if(!itens || !itens.length) throw new Error('CARRINHO_VAZIO');

  const subtotal = itens.reduce((soma, item) => soma + item.qtd * item.precoUnit, 0);
  const total = Math.max(0, subtotal - (Number(desconto) || 0));

  const venda = {
    id: gerarId(),
    data: new Date().toISOString(),
    itens,
    subtotal,
    desconto: Number(desconto) || 0,
    total,
    formaPagamento,
    clienteId: clienteId || null,
    vendedor: (vendedor || '').trim()
  };

  vendas.unshift(venda);
  salvarVendas();

  itens.forEach(item => {
    registrarMovimentacao({
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      tipo: 'venda',
      delta: -item.qtd,
      obs: 'Baixa automática por venda',
      vendaId: venda.id
    });
  });

  return venda;
}

function pegarVendedorAtual(){
  return localStorage.getItem(DB_KEYS.vendedor) || '';
}

function salvarVendedorAtual(nome){
  localStorage.setItem(DB_KEYS.vendedor, nome);
}

// ---------------- Consultas agregadas ----------------

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
  return listaVendas.reduce((soma, v) => soma + v.total, 0);
}

function lucroEstimado(listaVendas){
  return listaVendas.reduce((soma, v) => {
    const lucroVenda = v.itens.reduce((s, item) => s + (item.precoUnit - (item.custoUnit || 0)) * item.qtd, 0);
    return soma + lucroVenda - 0;
  }, 0);
}

function produtosMaisVendidos(listaVendas, limite){
  const contagem = new Map();
  listaVendas.forEach(v => {
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
  vendas.forEach(v => {
    if(new Date(v.data) >= limite){
      v.itens.forEach(item => vendidosRecentemente.add(item.produtoId));
    }
  });
  return produtos.filter(p => !vendidosRecentemente.has(p.id));
}

function vendasPorFormaPagamento(listaVendas){
  const mapa = new Map();
  listaVendas.forEach(v => {
    const atual = mapa.get(v.formaPagamento) || { formaPagamento: v.formaPagamento, qtd: 0, total: 0 };
    atual.qtd += 1;
    atual.total += v.total;
    mapa.set(v.formaPagamento, atual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

function vendasPorVendedor(listaVendas){
  const mapa = new Map();
  listaVendas.forEach(v => {
    const nome = v.vendedor || 'Não informado';
    const atual = mapa.get(nome) || { vendedor: nome, qtd: 0, total: 0 };
    atual.qtd += 1;
    atual.total += v.total;
    mapa.set(nome, atual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

function ticketMedio(listaVendas){
  if(!listaVendas.length) return 0;
  return faturamentoTotal(listaVendas) / listaVendas.length;
}

function vendasPorDia(listaVendas){
  const mapa = new Map();
  listaVendas.forEach(v => {
    const dia = v.data.slice(0, 10);
    const atual = mapa.get(dia) || { dia, qtd: 0, total: 0 };
    atual.qtd += 1;
    atual.total += v.total;
    mapa.set(dia, atual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.dia.localeCompare(a.dia));
}
