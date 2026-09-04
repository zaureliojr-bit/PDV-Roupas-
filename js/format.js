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

// Máscara de telefone com código do país: +55 (11) 94026-6948. Se o que foi
// digitado/colado tiver mais de 11 dígitos, assume que os 2 primeiros já são
// o código do país (é o que acontece ao colar um contato copiado do
// WhatsApp, que já vem como "+55 11 94026-6948"). Com 11 dígitos ou menos,
// assume Brasil (+55) e trata tudo como DDD + número.
function formatarTelefoneDigitos(digitos){
  const d = digitos.slice(0, 13);
  if(!d) return '';
  let codigoPais = '55';
  let local = d;
  if(d.length > 11){
    codigoPais = d.slice(0, 2);
    local = d.slice(2);
  }
  if(local.length <= 2) return `+${codigoPais} (${local}`;
  if(local.length <= 7) return `+${codigoPais} (${local.slice(0, 2)}) ${local.slice(2)}`;
  return `+${codigoPais} (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

// Como a máscara "desenha" o +55 assumido junto do texto, não dá pra
// simplesmente re-extrair os dígitos do que está exibido a cada tecla — o
// "55" desenhado voltaria a ser lido como se tivesse sido digitado, e o
// número cresce sozinho. Por isso guardamos à parte (input._digitosTelefone)
// só os dígitos que a pessoa realmente digitou/colou, e comparamos o texto
// atual com o que já esperávamos pra descobrir o que mudou (digitou no fim
// ou apagou).
function aplicarMascaraTelefone(input){
  input.setAttribute('inputmode', 'numeric');
  input._digitosTelefone = digitosTelefone(input.value);

  input.addEventListener('input', () => {
    const mostrado = digitosTelefone(input.value);
    const semMudanca = digitosTelefone(formatarTelefoneDigitos(input._digitosTelefone));

    if(mostrado.length > semMudanca.length){
      input._digitosTelefone += mostrado.slice(semMudanca.length);
    } else if(mostrado.length < semMudanca.length){
      const removidos = semMudanca.length - mostrado.length;
      input._digitosTelefone = input._digitosTelefone.slice(0, Math.max(0, input._digitosTelefone.length - removidos));
    }

    input.value = formatarTelefoneDigitos(input._digitosTelefone);
  });
}

function digitosTelefone(texto){
  return (texto || '').replace(/\D/g, '');
}

// Usado ao abrir o formulário de edição — preenche o campo E sincroniza o
// buffer interno de dígitos, senão a próxima tecla digitada compararia com
// um buffer desatualizado (vazio) e bagunçaria o número.
function sincronizarMascaraTelefone(input, valor){
  input.value = valor || '';
  input._digitosTelefone = digitosTelefone(valor || '');
}
