'use strict';

/* ══════════════════════════════════════════════
   ADMIN.JS — Parada da Pizza
   Painel profissional com Supabase + realtime + som forte + indicadores
══════════════════════════════════════════════ */

const ADMIN_PWD = 'marcelo2026';
const AUTO_REFRESH_MS = 15000;

let pedidosCarregados = [];
let filtroPedidosAtual = 'todos';
let autoRefreshId = null;
let primeiraCarga = true;
let idsConhecidos = new Set();
let audioLiberado = false;
let realtimePedidosIniciado = false;
let audioCtxGlobal = null;
let alertaPedidoPendente = false;
let alertaIntervalId = null;

/* LOGIN */

function verificarSenha() {
  const input = document.getElementById('inputSenha') || document.getElementById('senhaInput');
  if (!input) return;

  if (input.value === ADMIN_PWD) {
    const loginScreen = document.getElementById('loginScreen');
    const appOperacional = document.getElementById('appOperacional');
    const painelScreen = document.getElementById('painelScreen');

    if (loginScreen) loginScreen.style.display = 'none';
    if (appOperacional) appOperacional.style.display = 'block';
    if (painelScreen) painelScreen.style.display = 'block';

    liberarAudio();
    carregarPedidos(false);
    iniciarAutoRefresh();
    escutarPedidosTempoReal();
    return;
  }

  alert('Senha incorreta');
  input.value = '';
  input.focus();
}

/* TEMPO REAL */

function escutarPedidosTempoReal() {
  if (realtimePedidosIniciado) return;

  if (typeof supabaseClient === 'undefined') {
    console.warn('Supabase não encontrado para realtime.');
    return;
  }

  realtimePedidosIniciado = true;

  supabaseClient
    .channel('pedidos-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pedidos' },
      async (payload) => {
        if (payload?.new && pedidoEhMesa(payload.new)) return;

        dispararAlertaNovoPedido();
        await carregarPedidos(true);

        if (payload?.new?.id) destacarPedidoNovo(payload.new.id);
      }
    )
    .subscribe();
}

/* UTIL */

function fmtPreco(v) {
  return Number(v || 0).toFixed(2).replace('.', ',');
}

function fmtData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function getNumeroPedido(pedido) {
  if (pedido.numero_pedido) return String(pedido.numero_pedido).padStart(3, '0');
  if (pedido.id) return String(pedido.id).slice(0, 8);
  return '---';
}

function pedidoEhMesa(pedido) {
  return pedido.origem === 'garcom' || pedido.tipo === 'mesa' || !!pedido.mesa;
}

function pedidoEhOnline(pedido) {
  return !pedidoEhMesa(pedido);
}

function getTipoPedidoLabel(pedido) {
  if (pedido.tipo === 'entrega') return '🛵 Entrega';
  return '🏪 Retirada';
}

function getStatusLabel(pedido) {
  if (pedido.status === 'concluido') return '✅ Concluído';
  if (pedido.status === 'saiu_entrega') return '🛵 Saiu entrega';
  if (pedido.status === 'confirmado') return '🍕 Em preparo';
  return '🆕 Novo';
}

function normalizarTelefoneBrasil(telefone) {
  const limpo = String(telefone || '').replace(/\D/g, '');
  if (!limpo) return '';
  return limpo.startsWith('55') ? limpo : `55${limpo}`;
}

function abrirWhatsAppCliente(pedido, mensagem) {
  const telefoneFinal = normalizarTelefoneBrasil(pedido.telefone);

  if (!telefoneFinal) {
    alert('Telefone do cliente não encontrado.');
    return;
  }

  const url = `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

/* SOM FORTE */

function criarAudioContexto() {
  if (!audioCtxGlobal) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtxGlobal = new AudioCtx();
  }

  if (audioCtxGlobal.state === 'suspended') audioCtxGlobal.resume();

  return audioCtxGlobal;
}

function liberarAudio() {
  audioLiberado = true;
  tocarBeepSilencioso();
  pararAlertaPedido();
}

function tocarBeepSilencioso() {
  try {
    const ctx = criarAudioContexto();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch {}
}

function tocarSomNovoPedido() {
  if (!audioLiberado) return;

  try {
    const ctx = criarAudioContexto();
    if (!ctx) return;

    const notas = [
      { f: 880, t: 0, d: 0.18 },
      { f: 1175, t: 0.22, d: 0.18 },
      { f: 1480, t: 0.44, d: 0.28 },
      { f: 1175, t: 0.78, d: 0.18 },
      { f: 1480, t: 1.00, d: 0.32 }
    ];

    notas.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.t);
      osc.stop(ctx.currentTime + n.t + n.d);
    });
  } catch {}
}

function dispararAlertaNovoPedido() {
  alertaPedidoPendente = true;
  tocarSomNovoPedido();

  if (alertaIntervalId) clearInterval(alertaIntervalId);

  let repeticoes = 0;

  alertaIntervalId = setInterval(() => {
    if (!alertaPedidoPendente || repeticoes >= 3) {
      pararAlertaPedido();
      return;
    }

    tocarSomNovoPedido();
    repeticoes++;
  }, 3500);
}

function pararAlertaPedido() {
  alertaPedidoPendente = false;

  if (alertaIntervalId) {
    clearInterval(alertaIntervalId);
    alertaIntervalId = null;
  }
}

/* AUTO REFRESH */

function iniciarAutoRefresh() {
  if (autoRefreshId) clearInterval(autoRefreshId);

  autoRefreshId = setInterval(() => {
    carregarPedidos(true);
  }, AUTO_REFRESH_MS);
}

/* INDICADORES */

function garantirResumoOperacional() {
  const topbar = document.querySelector('.painel-topbar');
  if (!topbar) return;

  if (document.getElementById('resumoOperacional')) return;

  const resumo = document.createElement('div');
  resumo.id = 'resumoOperacional';
  resumo.style.cssText = `
    width:100%;
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
    gap:10px;
    margin:10px 0 4px;
  `;

  resumo.innerHTML = `
    <div class="resumo-admin-card">
      <span>Pedidos hoje</span>
      <strong id="resumoPedidosHoje">0</strong>
    </div>

    <div class="resumo-admin-card">
      <span>Faturamento hoje</span>
      <strong id="resumoFaturamentoHoje">R$ 0,00</strong>
    </div>

    <div class="resumo-admin-card">
      <span>Em andamento</span>
      <strong id="resumoEmAndamento">0</strong>
    </div>

    <div class="resumo-admin-card">
      <span>Concluídos</span>
      <strong id="resumoConcluidos">0</strong>
    </div>
  `;

  topbar.appendChild(resumo);

  if (!document.getElementById('resumoAdminStyle')) {
    const style = document.createElement('style');
    style.id = 'resumoAdminStyle';
    style.innerHTML = `
      .resumo-admin-card {
        background:#fff;
        border-radius:14px;
        padding:12px 14px;
        box-shadow:0 4px 14px rgba(15,23,42,.06);
        border-left:4px solid var(--red);
      }

      .resumo-admin-card span {
        display:block;
        font-size:11px;
        font-weight:800;
        color:#777;
        text-transform:uppercase;
        margin-bottom:4px;
      }

      .resumo-admin-card strong {
        font-family:var(--font-head);
        font-size:22px;
        color:var(--dark);
      }
    `;
    document.head.appendChild(style);
  }
}

function atualizarResumoOperacional() {
  garantirResumoOperacional();

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const dia = hoje.getDate();

  const pedidosHoje = pedidosCarregados.filter(p => {
    const data = new Date(p.data_criacao);
    return data.getFullYear() === ano && data.getMonth() === mes && data.getDate() === dia;
  });

  const concluidos = pedidosHoje.filter(p => p.status === 'concluido');
  const emAndamento = pedidosHoje.filter(p =>
    p.status !== 'concluido' &&
    p.status !== 'cancelado'
  );

  const faturamentoHoje = concluidos.reduce((total, p) => {
    return total + Number(p.total || 0);
  }, 0);

  const elPedidos = document.getElementById('resumoPedidosHoje');
  const elFat = document.getElementById('resumoFaturamentoHoje');
  const elAndamento = document.getElementById('resumoEmAndamento');
  const elConcluidos = document.getElementById('resumoConcluidos');

  if (elPedidos) elPedidos.textContent = pedidosHoje.length;
  if (elFat) elFat.textContent = `R$ ${fmtPreco(faturamentoHoje)}`;
  if (elAndamento) elAndamento.textContent = emAndamento.length;
  if (elConcluidos) elConcluidos.textContent = concluidos.length;
}

/* CARREGAR PEDIDOS */

async function carregarPedidos(silencioso = false) {
  const listEl = document.getElementById('painelList');
  const statusEl = document.getElementById('statusMsg');
  const btnAtualizar = document.getElementById('btnAtualizar');

  if (!listEl) return;

  garantirResumoOperacional();

  if (!silencioso) {
    listEl.innerHTML = '<div class="painel-loading">⏳ Carregando pedidos...</div>';
  }

  if (btnAtualizar) btnAtualizar.disabled = true;

  try {
    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('*')
      .neq('status', 'cancelado')
      .neq('origem', 'garcom')
      .neq('tipo', 'mesa')
      .order('data_criacao', { ascending: false })
      .limit(100);

    if (error) throw error;

    const novaLista = data || [];
    const novosIds = novaLista.map(p => p.id);

    const pedidosNovos = primeiraCarga
      ? []
      : novaLista.filter(p => !idsConhecidos.has(p.id));

    pedidosCarregados = novaLista;
    idsConhecidos = new Set(novosIds);

    atualizarResumoOperacional();
    aplicarFiltroAtual();

    if (pedidosNovos.length > 0) {
      dispararAlertaNovoPedido();

      setTimeout(() => {
        pedidosNovos.forEach(p => destacarPedidoNovo(p.id));
      }, 100);
    }

    primeiraCarga = false;

    if (statusEl) {
      statusEl.textContent =
        `Atualizado automaticamente às ${new Date().toLocaleTimeString('pt-BR')} · ${pedidosCarregados.length} pedido(s)`;
    }
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);

    if (!silencioso) {
      listEl.innerHTML = `
        <div class="painel-error">
          ⚠️ Não foi possível carregar os pedidos.<br>
          <small>${err.message || 'Verifique sua conexão/Supabase.'}</small>
        </div>
      `;
    }

    if (statusEl) statusEl.textContent = 'Erro ao atualizar pedidos.';
  } finally {
    if (btnAtualizar) btnAtualizar.disabled = false;
  }
}

/* FILTROS */

function filtrarPedidos(status) {
  filtroPedidosAtual = status;

  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));

  const btn = document.querySelector(`[data-filtro="${status}"]`);
  if (btn) btn.classList.add('active');

  pararAlertaPedido();
  aplicarFiltroAtual();
}

function aplicarFiltroAtual() {
  let lista = pedidosCarregados
    .filter(p => pedidoEhOnline(p))
    .filter(p => p.status !== 'cancelado');

  if (filtroPedidosAtual === 'todos') {
    lista = lista.filter(p => p.status !== 'concluido');
  }

  if (filtroPedidosAtual === 'novo') {
    lista = lista.filter(p => !p.status || p.status === 'novo');
  }

  if (filtroPedidosAtual === 'confirmado') {
    lista = lista.filter(p => p.status === 'confirmado');
  }

  if (filtroPedidosAtual === 'saiu_entrega') {
    lista = lista.filter(p => p.status === 'saiu_entrega');
  }

  if (filtroPedidosAtual === 'concluido') {
    lista = lista.filter(p => p.status === 'concluido');
  }

  renderPedidos(lista);
}

/* RENDER */

function garantirFiltrosAvancados() {
  const filtros = document.querySelector('.filtros');
  if (!filtros || filtros.dataset.adminFiltroAvancado === 'ok') return;

  filtros.dataset.adminFiltroAvancado = 'ok';

  filtros.innerHTML = `
    <button class="filtro-btn active" data-filtro="todos" onclick="filtrarPedidos('todos')">Todos</button>
    <button class="filtro-btn" data-filtro="novo" onclick="filtrarPedidos('novo')">🆕 Novos</button>
    <button class="filtro-btn" data-filtro="confirmado" onclick="filtrarPedidos('confirmado')">🍕 Em preparo</button>
    <button class="filtro-btn" data-filtro="saiu_entrega" onclick="filtrarPedidos('saiu_entrega')">🛵 Saiu entrega</button>
    <button class="filtro-btn" data-filtro="concluido" onclick="filtrarPedidos('concluido')">✅ Concluídos</button>
  `;
}

function renderPedidos(lista) {
  garantirFiltrosAvancados();

  const listEl = document.getElementById('painelList');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (!lista.length) {
    listEl.innerHTML = `
      <div class="painel-empty">
        <big>📋</big>
        <p>Nenhum pedido nesta etapa.</p>
        <small>Os pedidos aparecem aqui conforme o status.</small>
      </div>
    `;
    return;
  }

  lista.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pedido-card' + (p.status === 'concluido' ? ' pedido-impresso' : '');
    card.id = `card-${p.id}`;

    const itens = Array.isArray(p.itens) ? p.itens : [];

    const itensHtml = itens.length
      ? itens.map(i => {
          const qtd = Number(i.qtd || i.quantidade || 1);
          const preco = Number(i.preco || 0);
          const tamanho = i.tamanho ? ` <small>(${i.tamanho})</small>` : '';

          return `
            <div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #ddd;padding:6px 0;">
              <span>${qtd}x ${i.nome}${tamanho}</span>
              <strong>R$ ${fmtPreco(preco * qtd)}</strong>
            </div>
          `;
        }).join('')
      : '<small>Nenhum item informado</small>';

    const enderecoHtml = p.endereco
      ? `
        <div style="font-size:12px;color:#777;margin-top:8px;line-height:1.4;">
          📍 ${p.endereco.rua || ''}, ${p.endereco.numero || ''} — ${p.endereco.bairro || ''}, ${p.endereco.cidade || ''}${p.endereco.uf ? '-' + p.endereco.uf : ''}
          ${p.endereco.cep ? ` (CEP: ${p.endereco.cep})` : ''}
        </div>
      `
      : '';

    const telefoneHtml = p.telefone ? `📞 ${p.telefone}` : '📞 Sem telefone';

    const botaoFluxoEntrega = `
      <button class="btn-marcar" onclick="pedidoSaiuEntrega('${p.id}')" ${p.status !== 'confirmado' || p.tipo !== 'entrega' ? 'disabled' : ''}>
        🛵 Saiu entrega
      </button>

      <button class="btn-marcar" onclick="concluirPedido('${p.id}')" ${p.status !== 'saiu_entrega' ? 'disabled' : ''}>
        ✅ Entregue
      </button>
    `;

    const botaoFluxoRetirada = `
      <button class="btn-marcar" onclick="concluirPedido('${p.id}')" ${p.status !== 'confirmado' ? 'disabled' : ''}>
        ✅ Retirado
      </button>
    `;

    card.innerHTML = `
      <div class="pedido-header">
        <div>
          <div style="font-size:11px;font-weight:900;color:#777;text-transform:uppercase;margin-bottom:4px;">
            PEDIDO ONLINE
          </div>

          <div class="pedido-num">Pedido #${getNumeroPedido(p)}</div>
          <div class="pedido-time">${fmtData(p.data_criacao)}</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
          <span class="pedido-badge">${getTipoPedidoLabel(p)}</span>
          <span class="pedido-badge">${getStatusLabel(p)}</span>
        </div>
      </div>

      <div>
        <div class="pedido-client-name">${p.nome || 'Cliente não informado'}</div>
        <div class="pedido-client-tel">${telefoneHtml}</div>
      </div>

      <div class="pedido-items">${itensHtml}</div>

      ${enderecoHtml}

      <div class="pedido-pay">💳 ${p.pagamento || 'Não informado'}</div>

      <div class="pedido-total-line">
        <span>Total</span>
        <span>R$ ${fmtPreco(p.total)}</span>
      </div>

      <div class="pedido-actions" style="flex-wrap:wrap;">
        <button class="btn-marcar" onclick="confirmarPedido('${p.id}')" ${p.status && p.status !== 'novo' ? 'disabled' : ''}>
          ✅ Confirmar
        </button>

        ${p.tipo === 'entrega' ? botaoFluxoEntrega : botaoFluxoRetirada}

        <button class="btn-imprimir" onclick="imprimirPedido('${p.id}')">
          🖨️ Imprimir
        </button>

        <button class="btn-remover-pedido" onclick="removerPedido('${p.id}')" ${p.status === 'concluido' ? 'disabled' : ''}>
          ✕ Cancelar
        </button>
      </div>
    `;

    listEl.appendChild(card);
  });
}

function destacarPedidoNovo(id) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;

  card.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, .95)';
  card.style.transform = 'scale(1.015)';
  card.style.background = '#fff7ed';
  card.style.transition = 'all .25s ease';

  setTimeout(() => {
    card.style.boxShadow = '';
    card.style.transform = '';
    card.style.background = '';
  }, 7000);
}

/* STATUS + WHATSAPP */

async function confirmarPedido(id) {
  const pedido = pedidosCarregados.find(p => p.id === id);
  if (!pedido) return;

  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({ status: 'confirmado' })
      .eq('id', id);

    if (error) throw error;

    pedido.status = 'confirmado';

    abrirWhatsAppCliente(
      pedido,
      [
        `Olá, ${pedido.nome || 'cliente'}!`,
        ``,
        `Seu pedido #${getNumeroPedido(pedido)} foi confirmado pela Parada da Pizza.`,
        ``,
        `Já iniciamos o preparo do seu pedido.`
      ].join('\n')
    );

    atualizarResumoOperacional();
    aplicarFiltroAtual();
  } catch (erro) {
    console.error('Erro ao confirmar pedido:', erro);
    alert('Não foi possível confirmar o pedido.');
  }
}

async function pedidoSaiuEntrega(id) {
  const pedido = pedidosCarregados.find(p => p.id === id);
  if (!pedido) return;

  if (pedido.tipo !== 'entrega') {
    alert('Este pedido não é de entrega.');
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({ status: 'saiu_entrega' })
      .eq('id', id);

    if (error) throw error;

    pedido.status = 'saiu_entrega';

    abrirWhatsAppCliente(
      pedido,
      [
        `Olá, ${pedido.nome || 'cliente'}!`,
        ``,
        `Seu pedido #${getNumeroPedido(pedido)} saiu para entrega. 🛵🍕`,
        ``,
        `Fique atento ao telefone/portão.`
      ].join('\n')
    );

    atualizarResumoOperacional();
    aplicarFiltroAtual();
  } catch (erro) {
    console.error('Erro ao marcar saiu entrega:', erro);
    alert('Não foi possível atualizar o pedido.');
  }
}

async function concluirPedido(id) {
  const pedido = pedidosCarregados.find(p => p.id === id);
  if (!pedido) return;

  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({ status: 'concluido' })
      .eq('id', id);

    if (error) throw error;

    pedido.status = 'concluido';

    atualizarResumoOperacional();
    aplicarFiltroAtual();
  } catch (erro) {
    console.error('Erro ao concluir pedido:', erro);
    alert('Não foi possível concluir o pedido.');
  }
}

async function removerPedido(id) {
  const pedido = pedidosCarregados.find(p => p.id === id);
  if (!pedido) return;

  const confirmar = confirm(`Cancelar o pedido #${getNumeroPedido(pedido)} e avisar o cliente pelo WhatsApp?`);
  if (!confirmar) return;

  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({
        status: 'cancelado',
        impresso: false
      })
      .eq('id', id);

    if (error) throw error;

    abrirWhatsAppCliente(
      pedido,
      [
        `Olá, ${pedido.nome || 'cliente'}!`,
        ``,
        `Seu pedido #${getNumeroPedido(pedido)} foi cancelado pela Parada da Pizza.`,
        ``,
        `Caso tenha dúvidas ou queira fazer um novo pedido, fale conosco por aqui.`
      ].join('\n')
    );

    pedidosCarregados = pedidosCarregados.filter(p => p.id !== id);
    idsConhecidos.delete(id);

    atualizarResumoOperacional();
    aplicarFiltroAtual();
  } catch (erro) {
    console.error('Erro ao cancelar pedido:', erro);
    alert('Não foi possível cancelar o pedido.');
  }
}

/* IMPRESSÃO */

function montarItensImpressao(pedido) {
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

  if (!itens.length) return '<div>Nenhum item informado</div>';

  return itens.map(item => {
    const qtd = Number(item.qtd || item.quantidade || 1);
    const preco = Number(item.preco || 0);
    const tamanho = item.tamanho ? `<small>${item.tamanho}</small>` : '';
    const obs = item.observacao ? `<small>${item.observacao}</small>` : '';

    return `
      <div class="prt-row">
        <span>
          <strong>${qtd}x ${item.nome}</strong>
          ${tamanho}
          ${obs}
        </span>
        <span class="r">R$ ${fmtPreco(preco * qtd)}</span>
      </div>
    `;
  }).join('');
}

function imprimirPedido(id) {
  const p = pedidosCarregados.find(o => o.id === id);
  if (!p) return;

  const printArea = document.getElementById('printArea');
  if (!printArea) {
    alert('Área de impressão não encontrada.');
    return;
  }

  const enderecoHtml = p.endereco
    ? `
      <hr class="prt-sep"/>
      <div class="prt-section-title">Endereço:</div>
      <div>${p.endereco.rua || ''}, ${p.endereco.numero || ''}</div>
      <div>${p.endereco.bairro || ''}</div>
      <div>${p.endereco.cidade || ''} ${p.endereco.uf ? '-' + p.endereco.uf : ''}</div>
      ${p.endereco.cep ? `<div>CEP: ${p.endereco.cep}</div>` : ''}
    `
    : '';

  printArea.innerHTML = `
    <div class="prt-logo">PARADA DA PIZZA</div>
    <hr class="prt-sep"/>

    <div class="prt-row">
      <span><strong>PEDIDO ONLINE</strong></span>
      <span class="r">${getTipoPedidoLabel(p)}</span>
    </div>

    <div class="prt-row">
      <span><strong>Pedido:</strong></span>
      <span class="r">#${getNumeroPedido(p)}</span>
    </div>

    <div class="prt-row">
      <span><strong>Data:</strong></span>
      <span class="r">${fmtData(p.data_criacao)}</span>
    </div>

    <hr class="prt-sep"/>

    <div><strong>Cliente:</strong> ${p.nome || 'Não informado'}</div>
    ${p.telefone ? `<div><strong>Telefone:</strong> ${p.telefone}</div>` : ''}

    ${enderecoHtml}

    <hr class="prt-sep"/>
    <div class="prt-section-title">Itens:</div>

    ${montarItensImpressao(p)}

    <hr class="prt-sep"/>

    <div class="prt-row">
      <span>Subtotal:</span>
      <span class="r">R$ ${fmtPreco(p.subtotal || p.total)}</span>
    </div>

    ${Number(p.taxa_entrega || 0) > 0 ? `
      <div class="prt-row">
        <span>Entrega:</span>
        <span class="r">R$ ${fmtPreco(p.taxa_entrega)}</span>
      </div>
    ` : ''}

    <div class="prt-total prt-row">
      <span>TOTAL:</span>
      <span class="r">R$ ${fmtPreco(p.total)}</span>
    </div>

    <hr class="prt-sep"/>

    <div><strong>Pagamento:</strong> ${p.pagamento || 'Não informado'}</div>

    <div class="prt-rodape">
      ---- Obrigado pela preferência! ----<br/>
      Parada da Pizza
    </div>
  `;

  window.print();
}

/* TELA CHEIA */

function ativarTelaCheia() {
  const el = document.documentElement;

  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
}

/* INIT */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('inputSenha') || document.getElementById('senhaInput');

  document.addEventListener('click', liberarAudio);
  document.addEventListener('keydown', liberarAudio);

  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (typeof validarSenha === 'function') validarSenha();
        else verificarSenha();
      }
    });

    input.focus();
  }
});

window.verificarSenha = verificarSenha;
window.carregarPedidos = carregarPedidos;
window.iniciarAutoRefresh = iniciarAutoRefresh;
window.escutarPedidosTempoReal = escutarPedidosTempoReal;
window.filtrarPedidos = filtrarPedidos;
window.imprimirPedido = imprimirPedido;
window.removerPedido = removerPedido;
window.confirmarPedido = confirmarPedido;
window.pedidoSaiuEntrega = pedidoSaiuEntrega;
window.concluirPedido = concluirPedido;
window.ativarTelaCheia = ativarTelaCheia;
window.tocarSomNovoPedido = tocarSomNovoPedido;
window.tocarBeepSilencioso = tocarBeepSilencioso;
window.liberarAudio = liberarAudio;