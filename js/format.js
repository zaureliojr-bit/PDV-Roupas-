// Helpers de formatação usados por todas as telas.

function formatarMoeda(valor){
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(isoString){
  if(!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDataCurta(isoString){
  if(!isoString) return '-';
  return new Date(isoString).toLocaleDateString('pt-BR');
}

function escapeHtml(texto){
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

// Máscara de valor em reais: o campo aceita só dígitos e formata sozinho
// (ex: digitar "58876" mostra "588,76"), estilo campo de dinheiro comum em
// app brasileiro. `numeroParaMascara`/`valorMascaraParaNumero` convertem
// entre o texto exibido e o número usado nos cálculos.
function aplicarMascaraMoeda(input){
  input.setAttribute('inputmode', 'numeric');
  input.addEventListener('input', () => {
    let digitos = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if(!digitos){ input.value = ''; return; }
    while(digitos.length < 3) digitos = '0' + digitos;
    const centavos = digitos.slice(-2);
    const inteiros = digitos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = `${inteiros},${centavos}`;
  });
}

function valorMascaraParaNumero(texto){
  if(!texto) return 0;
  return Number(texto.replace(/\./g, '').replace(',', '.')) || 0;
}

function numeroParaMascara(valor){
  return (Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Máscara de telefone brasileiro no formato celular: (11) 94026-6948.
function formatarTelefoneDigitos(digitos){
  const d = digitos.slice(0, 11);
  if(!d) return '';
  if(d.length <= 2) return `(${d}`;
  if(d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function aplicarMascaraTelefone(input){
  input.setAttribute('inputmode', 'numeric');
  input.addEventListener('input', () => {
    input.value = formatarTelefoneDigitos(input.value.replace(/\D/g, ''));
  });
}
