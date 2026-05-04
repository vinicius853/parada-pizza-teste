'use strict';

/* ══════════════════════════════════════════════
   PEDIDO.JS — camada central de pedidos
   Usa o mesmo formato para cliente, garçom/mesa e painel admin.
══════════════════════════════════════════════ */

const PDP_PEDIDO_COUNTER_KEY = 'pdp_counter';
const PDP_PEDIDOS_OFFLINE_KEY = 'pdp_pedidos_pendentes';

function pedidoFmtPreco(valor) {
  return Number(valor || 0).toFixed(2).replace('.', ',');
}

function gerarNumeroPedido() {
  const atual = parseInt(localStorage.getItem(PDP_PEDIDO_COUNTER_KEY) || '0', 10) || 0;
  const proximo = atual + 1;
  localStorage.setItem(PDP_PEDIDO_COUNTER_KEY, String(proximo));
  return proximo;
}

function voltarNumeroPedido(numero) {
  const atual = parseInt(localStorage.getItem(PDP_PEDIDO_COUNTER_KEY) || '0', 10) || 0;
  if (Number(numero) === atual) {
    localStorage.setItem(PDP_PEDIDO_COUNTER_KEY, String(Math.max(0, atual - 1)));
  }
}

function salvarPedidoPendenteLocal(pedido) {
  const lista = carregarPedidosPendentesLocais();
  lista.unshift({
    ...pedido,
    pendente_local: true,
    salvo_local_em: new Date().toISOString()
  });
  localStorage.setItem(PDP_PEDIDOS_OFFLINE_KEY, JSON.stringify(lista));
}

function carregarPedidosPendentesLocais() {
  try {
    const dados = localStorage.getItem(PDP_PEDIDOS_OFFLINE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
}

function limparPedidosPendentesLocais() {
  localStorage.removeItem(PDP_PEDIDOS_OFFLINE_KEY);
}

function normalizarItemPedido(item) {
  return {
    nome: item.nome || 'Item',
    tamanho: item.tamanho || item.observacao || item.detalhe || 'Unidade',
    qtd: Number(item.qtd || item.quantidade || 1),
    preco: Number(item.preco || 0),
    tipoItem: item.tipoItem || item.tipo_item || 'inteira',
    metade1: item.metade1 || null,
    metade2: item.metade2 || null
  };
}

function calcularSubtotalItens(itens) {
  return (itens || []).reduce((total, item) => {
    const i = normalizarItemPedido(item);
    return total + (i.preco * i.qtd);
  }, 0);
}

function montarPayloadPedido(pedido) {
  const itens = (pedido.itens || []).map(normalizarItemPedido);
  const subtotal = Number(
    pedido.subtotal ?? pedido.sub ?? calcularSubtotalItens(itens)
  );
  const taxaEntrega = Number(pedido.taxa_entrega ?? pedido.entrega ?? 0);
  const total = Number(pedido.total ?? (subtotal + taxaEntrega));
  const numeroPedido = pedido.numero_pedido || pedido.numeroPedido || gerarNumeroPedido();

  return {
    numero_pedido: numeroPedido,
    data_criacao: pedido.data_criacao || new Date().toISOString(),
    nome: pedido.nome || 'Cliente',
    telefone: pedido.telefone || pedido.tel || '',
    tipo: pedido.tipo || 'retirada',
    endereco: pedido.endereco || null,
    itens,
    subtotal,
    taxa_entrega: taxaEntrega,
    total,
    pagamento: pedido.pagamento || 'Não informado',
    troco: pedido.troco ?? null,
    status: pedido.status || 'novo',
    impresso: Boolean(pedido.impresso),

    // Campos profissionais. Se sua tabela ainda não tiver essas colunas,
    // a função salvarPedidoSupabase faz fallback automático sem quebrar.
    origem: pedido.origem || 'cliente',
    mesa: pedido.mesa || null
  };
}

function montarPedidoCliente(dados) {
  return montarPayloadPedido({
    origem: 'cliente',
    ...dados
  });
}

function montarPedidoGarcom(mesa, formaPagamento) {
  if (!mesa || !Array.isArray(mesa.itens) || mesa.itens.length === 0) {
    throw new Error('Mesa vazia.');
  }

  const itens = mesa.itens.map(item => normalizarItemPedido({
    nome: item.nome,
    tamanho: item.observacao || 'Unidade',
    qtd: item.quantidade,
    preco: item.preco
  }));

  const subtotal = calcularSubtotalItens(itens);
  const nomeCliente = mesa.nome && mesa.nome.trim()
    ? `Mesa ${mesa.numero} - ${mesa.nome.trim()}`
    : `Mesa ${mesa.numero}`;

  return montarPayloadPedido({
    origem: 'garcom',
    mesa: mesa.numero,
    nome: nomeCliente,
    telefone: '',
    tipo: 'mesa',
    endereco: null,
    itens,
    subtotal,
    taxa_entrega: 0,
    total: subtotal,
    pagamento: formaPagamento,
    troco: null,
    status: 'novo',
    impresso: false
  });
}

async function salvarPedidoSupabase(pedido, opcoes = {}) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    throw new Error('Supabase não configurado. Verifique o arquivo supabase-config.js.');
  }

  const payload = montarPayloadPedido(pedido);

  const { data, error } = await supabaseClient
    .from('pedidos')
    .insert([payload])
    .select()
    .single();

  if (!error) {
    return data || payload;
  }

  // Compatibilidade: se sua tabela ainda não tiver origem/mesa,
  // tenta salvar no formato antigo para não travar o sistema.
  const msg = String(error.message || '').toLowerCase();
  const erroColunaExtra = msg.includes('origem') || msg.includes('mesa') || msg.includes('column');

  if (!erroColunaExtra) {
    throw error;
  }

  const payloadLegado = { ...payload };
  delete payloadLegado.origem;
  delete payloadLegado.mesa;

  if (payload.tipo === 'mesa') {
    payloadLegado.nome = payload.mesa ? `Mesa ${payload.mesa}${pedido.nome && !String(pedido.nome).startsWith('Mesa') ? ' - ' + pedido.nome : ''}` : payload.nome;
  }

  const { data: dataLegado, error: errorLegado } = await supabaseClient
    .from('pedidos')
    .insert([payloadLegado])
    .select()
    .single();

  if (errorLegado) throw errorLegado;
  return dataLegado || payloadLegado;
}

async function tentarEnviarPedidosPendentes() {
  const pendentes = carregarPedidosPendentesLocais();
  if (!pendentes.length) return { enviados: 0, falhas: 0 };

  const restantes = [];
  let enviados = 0;

  for (const pedido of pendentes) {
    try {
      await salvarPedidoSupabase(pedido);
      enviados++;
    } catch {
      restantes.push(pedido);
    }
  }

  localStorage.setItem(PDP_PEDIDOS_OFFLINE_KEY, JSON.stringify(restantes));
  return { enviados, falhas: restantes.length };
}

function montarMensagemWhatsAppPedido(pedido) {
  const p = montarPayloadPedido(pedido);
  const linhasItens = p.itens.map(i => {
    return `  • ${i.qtd}x ${i.nome} (${i.tamanho}) — R$ ${pedidoFmtPreco(i.preco * i.qtd)}`;
  }).join('\n');

  const endereco = p.endereco;

  return [
    `🍕 *PARADA DA PIZZA — Pedido #${String(p.numero_pedido).padStart(3, '0')}*`,
    ``,
    `👤 *Nome:* ${p.nome}`,
    p.telefone ? `📞 *Telefone:* ${p.telefone}` : null,
    p.mesa ? `🍽️ *Mesa:* ${p.mesa}` : null,
    ``,
    `📦 *Tipo:* ${p.tipo === 'entrega' ? 'Entrega 🛵' : p.tipo === 'mesa' ? 'Mesa 🍽️' : 'Retirada 🏪'}`,
    endereco ? `📍 *Endereço:* ${endereco.rua}, ${endereco.numero} — ${endereco.bairro}, ${endereco.cidade}-${endereco.uf}${endereco.cep ? ` (CEP: ${endereco.cep})` : ''}` : null,
    ``,
    `🛒 *Itens:*`,
    linhasItens,
    ``,
    `💰 *Subtotal:* R$ ${pedidoFmtPreco(p.subtotal)}`,
    p.taxa_entrega > 0 ? `🛵 *Entrega:* R$ ${pedidoFmtPreco(p.taxa_entrega)}` : null,
    `✅ *TOTAL: R$ ${pedidoFmtPreco(p.total)}*`,
    ``,
    `💳 *Pagamento:* ${p.pagamento}`,
    p.troco !== null && p.troco !== undefined ? `💵 *Troco:* R$ ${pedidoFmtPreco(p.troco)}` : null
  ].filter(Boolean).join('\n');
}

window.gerarNumeroPedido = gerarNumeroPedido;
window.voltarNumeroPedido = voltarNumeroPedido;
window.salvarPedidoPendenteLocal = salvarPedidoPendenteLocal;
window.carregarPedidosPendentesLocais = carregarPedidosPendentesLocais;
window.limparPedidosPendentesLocais = limparPedidosPendentesLocais;
window.normalizarItemPedido = normalizarItemPedido;
window.calcularSubtotalItens = calcularSubtotalItens;
window.montarPayloadPedido = montarPayloadPedido;
window.montarPedidoCliente = montarPedidoCliente;
window.montarPedidoGarcom = montarPedidoGarcom;
window.salvarPedidoSupabase = salvarPedidoSupabase;
window.tentarEnviarPedidosPendentes = tentarEnviarPedidosPendentes;
window.montarMensagemWhatsAppPedido = montarMensagemWhatsAppPedido;
