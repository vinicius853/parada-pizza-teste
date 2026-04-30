'use strict';

/* ══════════════════════════════════════════════
   ADMIN.JS — painel de pedidos Parada da Pizza
   Supabase + impressão + auto refresh + som forte + tela cheia
══════════════════════════════════════════════ */

const ADMIN_PWD = 'marcelo2026';
const AUTO_REFRESH_MS = 15000;

let pedidosCarregados = [];
let filtroAtual = 'todos';
let autoRefreshId = null;
let primeiraCarga = true;
let idsConhecidos = new Set();
let audioLiberado = false;

/* ════════════════════════
   AUTENTICAÇÃO SIMPLES
════════════════════════ */

function verificarSenha() {
  const input = document.getElementById('inputSenha');
  const erro = document.getElementById('erroSenha');

  if (!input) return;

  if (input.value === ADMIN_PWD) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('painelScreen').style.display = 'block';

    audioLiberado = true;
    tocarBeepSilencioso();
    inserirBotaoTelaCheia();

    carregarPedidos(false);
    iniciarAutoRefresh();
  } else {
    erro.textContent = 'Senha incorreta.';
    input.value = '';
    input.focus();
  }
}

/* ════════════════════════
   UTILITÁRIOS
════════════════════════ */

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

function aplicarFiltroAtual() {
  if (filtroAtual === 'todos') {
    renderPedidos(pedidosCarregados);
    return;
  }

  renderPedidos(
    pedidosCarregados.filter(p =>
      filtroAtual === 'novo' ? !p.impresso : p.impresso
    )
  );
}

/* ════════════════════════
   MODO TELA CHEIA
════════════════════════ */

function inserirBotaoTelaCheia() {
  const topbar = document.querySelector('.painel-topbar');
  if (!topbar || document.getElementById('btnTelaCheia')) return;

  const btn = document.createElement('button');
  btn.id = 'btnTelaCheia';
  btn.type = 'button';
  btn.className = 'btn-atualizar';
  btn.innerHTML = '📺 Tela Cheia';
  btn.onclick = ativarTelaCheia;

  topbar.appendChild(btn);
}

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

/* ════════════════════════
   SOM DE NOVO PEDIDO
════════════════════════ */

function tocarBeepSilencioso() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.01);
  } catch (e) {
    console.warn('Áudio ainda não liberado pelo navegador.');
  }
}

function tocarSomNovoPedido() {
  if (!audioLiberado) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    const tocar = (freq, inicio, duracao, volume = 0.55) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao);
    };

    tocar(900, 0, 0.16);
    tocar(1200, 0.20, 0.22);
    tocar(900, 0.48, 0.16);
    tocar(1200, 0.68, 0.25);

  } catch (err) {
    console.warn('Não foi possível tocar som:', err);
  }
}

/* ════════════════════════
   AUTO REFRESH
════════════════════════ */

function iniciarAutoRefresh() {
  if (autoRefreshId) clearInterval(autoRefreshId);

  autoRefreshId = setInterval(() => {
    carregarPedidos(true);
  }, AUTO_REFRESH_MS);
}

/* ════════════════════════
   CARREGAR PEDIDOS DO SUPABASE
════════════════════════ */

async function carregarPedidos(silencioso = false) {
  const listEl = document.getElementById('painelList');
  const statusEl = document.getElementById('statusMsg');
  const btnAtu = document.getElementById('btnAtualizar');

  if (!listEl) return;

  if (!silencioso) {
    listEl.innerHTML = '<div class="painel-loading">⏳ Carregando pedidos...</div>';
    if (statusEl) statusEl.textContent = '';
  }

  if (btnAtu) btnAtu.disabled = true;

  try {
    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('*')
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

    aplicarFiltroAtual();

    if (pedidosNovos.length > 0) {
      tocarSomNovoPedido();
      destacarPedidosNovos(pedidosNovos.map(p => p.id));
    }

    primeiraCarga = false;

    if (statusEl) {
      statusEl.textContent =
        `Atualizado automaticamente às ${new Date().toLocaleTimeString('pt-BR')} · ${pedidosCarregados.length} pedido(s)`;
    }

  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);

    if (!silencioso) {
      listEl.innerHTML = `
        <div class="painel-error">
          ⚠️ Não foi possível carregar os pedidos.<br>
          <small>${err.message || 'Verifique sua conexão.'}</small>
        </div>
      `;
    }

    if (statusEl) {
      statusEl.textContent = 'Erro ao atualizar pedidos.';
    }
  } finally {
    if (btnAtu) btnAtu.disabled = false;
  }
}

function destacarPedidosNovos(ids) {
  ids.forEach(id => {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;

    card.style.boxShadow = '0 0 0 4px rgba(245, 200, 0, .95)';
    card.style.transform = 'scale(1.02)';
    card.style.background = '#FFFBE6';

    setTimeout(() => {
      card.style.boxShadow = '';
      card.style.transform = '';
      card.style.background = '';
    }, 7000);
  });
}

/* ════════════════════════
   RENDERIZAR LISTA
════════════════════════ */

function renderPedidos(lista) {
  const listEl = document.getElementById('painelList');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (!lista.length) {
    listEl.innerHTML = `
      <div class="painel-empty">
        <big>📋</big>
        <p>Nenhum pedido registrado ainda.</p>
        <small>Os pedidos aparecem aqui após a finalização.</small>
      </div>
    `;
    return;
  }

  lista.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pedido-card' + (p.impresso ? ' pedido-impresso' : '');
    card.id = `card-${p.id}`;

    const itens = Array.isArray(p.itens) ? p.itens : [];
    const itensHtml = itens
      .map(i => `${i.qtd}x ${i.nome} (${i.tamanho}) — R$ ${fmtPreco(i.preco * i.qtd)}`)
      .join('\n');

    const badgeClass = p.tipo === 'retirada' ? 'badge-retirada' : 'badge-entrega';
    const badgeLabel = p.tipo === 'retirada' ? '🏪 Retirada' : '🛵 Entrega';

    const statusClass = p.impresso ? 'status-impresso' : 'status-novo';
    const statusLabel = p.impresso ? '✅ Impresso' : '🆕 Novo';

    let endHtml = '';
    if (p.endereco) {
      const e = p.endereco;
      const cepTxt = e.cep ? ` (CEP: ${e.cep})` : '';
      endHtml = `<div class="pedido-addr">📍 ${e.rua}, ${e.numero} — ${e.bairro}, ${e.cidade}-${e.uf}${cepTxt}</div>`;
    }

    let trocoHtml = '';
    if (p.troco !== null && p.troco !== undefined) {
      trocoHtml = `<div class="pedido-pay">💵 Troco: R$ ${fmtPreco(p.troco)}</div>`;
    }

    card.innerHTML = `
      <div class="pedido-header">
        <div>
          <div class="pedido-num">Pedido #${String(p.numero_pedido).padStart(3, '0')}</div>
          <div class="pedido-time">${fmtData(p.data_criacao)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span class="pedido-badge ${badgeClass}">${badgeLabel}</span>
          <span class="pedido-badge ${statusClass}">${statusLabel}</span>
        </div>
      </div>

      <div>
        <div class="pedido-client-name">${p.nome}</div>
        <div class="pedido-client-tel">📞 ${p.telefone}</div>
      </div>

      <pre class="pedido-items">${itensHtml}</pre>
      ${endHtml}
      <div class="pedido-pay">💳 ${p.pagamento}</div>
      ${trocoHtml}

      <div class="pedido-total-line">
        <span>Total</span>
        <span>R$ ${fmtPreco(p.total)}</span>
      </div>

      <div class="pedido-actions">
        <button class="btn-imprimir" onclick="imprimirPedido('${p.id}')">🖨️ Imprimir</button>
        <button class="btn-marcar" onclick="marcarImpresso('${p.id}')" ${p.impresso ? 'disabled' : ''}>
          ${p.impresso ? '✓ Impresso' : '✓ Marcar'}
        </button>
        <button class="btn-remover-pedido" onclick="removerPedido('${p.id}')">✕</button>
      </div>
    `;

    listEl.appendChild(card);
  });
}

/* ════════════════════════
   IMPRIMIR COMANDA
════════════════════════ */

function imprimirPedido(id) {
  const p = pedidosCarregados.find(o => o.id === id);
  if (!p) return;

  const itens = Array.isArray(p.itens) ? p.itens : [];

  const itensHtml = itens.map(i => `
    <div class="prt-row">
      <span>${i.qtd}x ${i.nome} (${i.tamanho})</span>
      <span class="r">R$ ${fmtPreco(i.preco * i.qtd)}</span>
    </div>
  `).join('');

  let endBloco = '';
  if (p.endereco) {
    const e = p.endereco;
    endBloco = `
      <div class="prt-section-title">Endereço:</div>
      <div>${e.rua}, ${e.numero}</div>
      <div>${e.bairro}</div>
      <div>${e.cidade} - ${e.uf}</div>
      ${e.cep ? `<div>CEP: ${e.cep}</div>` : ''}
    `;
  }

  let trocoBloco = '';
  if (p.troco !== null && p.troco !== undefined) {
    trocoBloco = `<div class="prt-row"><span>Troco:</span><span class="r">R$ ${fmtPreco(p.troco)}</span></div>`;
  }

  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  printArea.innerHTML = `
    <div class="prt-logo">PARADA DA PIZZA</div>
    <hr class="prt-sep"/>
    <div class="prt-row"><span><strong>Pedido:</strong></span><span class="r">#${String(p.numero_pedido).padStart(3, '0')}</span></div>
    <div class="prt-row"><span><strong>Data:</strong></span><span class="r">${fmtData(p.data_criacao)}</span></div>
    <hr class="prt-sep"/>

    <div class="prt-row"><span><strong>Cliente:</strong></span><span class="r">${p.nome}</span></div>
    <div class="prt-row"><span><strong>Telefone:</strong></span><span class="r">${p.telefone}</span></div>
    <div class="prt-row"><span><strong>Tipo:</strong></span><span class="r">${p.tipo === 'entrega' ? 'Entrega' : 'Retirada'}</span></div>
    ${endBloco}
    <hr class="prt-sep"/>

    <div class="prt-section-title">Itens:</div>
    ${itensHtml}
    <hr class="prt-sep"/>

    <div class="prt-row"><span>Subtotal:</span><span class="r">R$ ${fmtPreco(p.subtotal)}</span></div>
    ${p.taxa_entrega > 0 ? `<div class="prt-row"><span>Entrega:</span><span class="r">R$ ${fmtPreco(p.taxa_entrega)}</span></div>` : ''}
    <div class="prt-total prt-row"><span>TOTAL:</span><span class="r">R$ ${fmtPreco(p.total)}</span></div>
    <hr class="prt-sep"/>

    <div class="prt-row"><span>Pagamento:</span><span class="r">${p.pagamento}</span></div>
    ${trocoBloco}

    <div class="prt-rodape">
      ---- Obrigado pela preferência! ----<br/>
      instagram: @paradadapizza_bm<br/>
      (24) 99905-7453
    </div>
  `;

  window.print();
  marcarImpresso(id);
}

/* ════════════════════════
   MARCAR COMO IMPRESSO
════════════════════════ */

async function marcarImpresso(id) {
  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({ impresso: true, status: 'impresso' })
      .eq('id', id);

    if (error) throw error;

    const pedido = pedidosCarregados.find(p => p.id === id);
    if (pedido) {
      pedido.impresso = true;
      pedido.status = 'impresso';
    }

    aplicarFiltroAtual();

  } catch (err) {
    console.error('Erro ao marcar como impresso:', err);
  }
}

/* ════════════════════════
   REMOVER / CANCELAR PEDIDO
════════════════════════ */

async function removerPedido(id) {
  if (!confirm('Deseja remover/cancelar este pedido?')) return;

  try {
    const { error } = await supabaseClient
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    pedidosCarregados = pedidosCarregados.filter(p => p.id !== id);
    idsConhecidos.delete(id);
    aplicarFiltroAtual();

  } catch (err) {
    console.error('Erro ao remover pedido:', err);
    alert('Não foi possível remover o pedido. Tente novamente.');
  }
}

/* ════════════════════════
   FILTRO DE STATUS
════════════════════════ */

function filtrarPedidos(status) {
  filtroAtual = status;

  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));

  const btn = document.querySelector(`[data-filtro="${status}"]`);
  if (btn) btn.classList.add('active');

  aplicarFiltroAtual();
}

/* ════════════════════════
   ENTER NA TELA DE LOGIN
════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('inputSenha');

  document.addEventListener('click', () => {
    audioLiberado = true;
  }, { once: true });

  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') verificarSenha();
    });
    input.focus();
  }
});