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
