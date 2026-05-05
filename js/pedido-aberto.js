'use strict';

/* ══════════════════════════════════════════════
   PEDIDO-ABERTO.JS — Comanda viva no Supabase
══════════════════════════════════════════════ */

function ordenarItensComanda(itens = []) {
  return [...itens].sort((a, b) => {
    const dataA = new Date(a.data_criacao || a.created_at || 0).getTime();
    const dataB = new Date(b.data_criacao || b.created_at || 0).getTime();

    if (dataA !== dataB) return dataA - dataB;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

async function buscarPedidoAbertoPorMesa(numeroMesa) {
  const { data, error } = await supabaseClient
    .from('pedidos_abertos')
    .select('*')
    .eq('mesa', numeroMesa)
    .eq('status', 'aberto')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function criarPedidoAberto(numeroMesa, nomeCliente = '') {
  const existente = await buscarPedidoAbertoPorMesa(numeroMesa);

  if (existente) return existente;

  const { data, error } = await supabaseClient
    .from('pedidos_abertos')
    .insert({
      mesa: numeroMesa,
      nome_cliente: nomeCliente || '',
      origem: 'garcom',
      status: 'aberto',
      subtotal: 0,
      total: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function atualizarNomePedidoAberto(numeroMesa, nomeCliente) {
  const pedido = await criarPedidoAberto(numeroMesa, nomeCliente);

  const { error } = await supabaseClient
    .from('pedidos_abertos')
    .update({
      nome_cliente: nomeCliente || ''
    })
    .eq('id', pedido.id);

  if (error) throw error;
}

async function buscarItensPedidoAberto(pedidoAbertoId) {
  const { data, error } = await supabaseClient
    .from('itens_pedido_aberto')
    .select('*')
    .eq('pedido_aberto_id', pedidoAbertoId)
    .order('data_criacao', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return ordenarItensComanda(data || []);
}

async function salvarItemPedidoAberto(numeroMesa, item) {
  const pedido = await criarPedidoAberto(numeroMesa);

  const { error } = await supabaseClient
    .from('itens_pedido_aberto')
    .insert({
      pedido_aberto_id: pedido.id,
      produto_id: String(item.produto_id || item.id || ''),
      nome: item.nome,
      tamanho: item.tamanho || '',
      observacao: item.observacao || '',
      preco: Number(item.preco || 0),
      quantidade: Number(item.quantidade || item.qtd || 1)
    });

  if (error) throw error;

  await recalcularPedidoAberto(pedido.id);

  return pedido;
}

async function atualizarQuantidadeItemAberto(itemAbertoId, quantidade) {
  if (quantidade <= 0) {
    return removerItemPedidoAberto(itemAbertoId);
  }

  const { data, error } = await supabaseClient
    .from('itens_pedido_aberto')
    .update({ quantidade })
    .eq('id', itemAbertoId)
    .select('pedido_aberto_id')
    .single();

  if (error) throw error;

  await recalcularPedidoAberto(data.pedido_aberto_id);
}

async function removerItemPedidoAberto(itemAbertoId) {
  const { data: item, error: erroBusca } = await supabaseClient
    .from('itens_pedido_aberto')
    .select('pedido_aberto_id')
    .eq('id', itemAbertoId)
    .single();

  if (erroBusca) throw erroBusca;

  const { error } = await supabaseClient
    .from('itens_pedido_aberto')
    .delete()
    .eq('id', itemAbertoId);

  if (error) throw error;

  await recalcularPedidoAberto(item.pedido_aberto_id);
}

async function recalcularPedidoAberto(pedidoAbertoId) {
  const itens = await buscarItensPedidoAberto(pedidoAbertoId);

  const total = itens.reduce((acc, item) => {
    return acc + Number(item.preco || 0) * Number(item.quantidade || 0);
  }, 0);

  const { error } = await supabaseClient
    .from('pedidos_abertos')
    .update({
      subtotal: total,
      total: total
    })
    .eq('id', pedidoAbertoId);

  if (error) throw error;

  return total;
}

async function carregarComandasAbertas() {
  const { data, error } = await supabaseClient
    .from('pedidos_abertos')
    .select(`
      *,
      itens_pedido_aberto (*)
    `)
    .eq('status', 'aberto')
    .order('mesa', { ascending: true });

  if (error) throw error;

  const comandas = data || [];

  return comandas.map(comanda => ({
    ...comanda,
    itens_pedido_aberto: ordenarItensComanda(comanda.itens_pedido_aberto || [])
  }));
}

async function fecharPedidoAberto(numeroMesa, pagamento = 'Não informado') {
  const pedidoAberto = await buscarPedidoAbertoPorMesa(numeroMesa);

  if (!pedidoAberto) {
    throw new Error('Nenhuma comanda aberta encontrada para esta mesa.');
  }

  const itensAbertos = await buscarItensPedidoAberto(pedidoAberto.id);

  if (!itensAbertos.length) {
    throw new Error('A comanda não possui itens.');
  }

  const itens = itensAbertos.map(item => ({
    qtd: item.quantidade,
    nome: item.nome,
    tamanho: item.tamanho || 'Unidade',
    preco: Number(item.preco || 0),
    observacao: item.observacao || ''
  }));

  const total = itens.reduce((acc, item) => {
    return acc + Number(item.preco || 0) * Number(item.qtd || 0);
  }, 0);

  const { data: pedidoFinal, error: erroPedido } = await supabaseClient
    .from('pedidos')
    .insert({
      origem: 'garcom',
      tipo: 'mesa',
      mesa: numeroMesa,
      nome: pedidoAberto.nome_cliente || `Mesa ${numeroMesa}`,
      telefone: '',
      itens,
      subtotal: total,
      taxa_entrega: 0,
      total,
      pagamento,
      troco: null,
      status: 'novo',
      impresso: false,
      data_criacao: new Date().toISOString()
    })
    .select()
    .single();

  if (erroPedido) throw erroPedido;

  const { error: erroFechar } = await supabaseClient
    .from('pedidos_abertos')
    .update({ status: 'finalizado' })
    .eq('id', pedidoAberto.id);

  if (erroFechar) throw erroFechar;

  return pedidoFinal;
}

window.ordenarItensComanda = ordenarItensComanda;
window.buscarPedidoAbertoPorMesa = buscarPedidoAbertoPorMesa;
window.criarPedidoAberto = criarPedidoAberto;
window.atualizarNomePedidoAberto = atualizarNomePedidoAberto;
window.buscarItensPedidoAberto = buscarItensPedidoAberto;
window.salvarItemPedidoAberto = salvarItemPedidoAberto;
window.atualizarQuantidadeItemAberto = atualizarQuantidadeItemAberto;
window.removerItemPedidoAberto = removerItemPedidoAberto;
window.recalcularPedidoAberto = recalcularPedidoAberto;
window.carregarComandasAbertas = carregarComandasAbertas;
window.fecharPedidoAberto = fecharPedidoAberto;