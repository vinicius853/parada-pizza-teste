'use strict';

/* ══════════════════════════════════════════════
   APP.JS — utilitários, views, painel admin e inicialização
══════════════════════════════════════════════ */

/* ════════════════════════
   UTILITÁRIOS
════════════════════════ */

function formatarDetalheItem(item) {
  return item.tamanho;
}

function fmtPreco(v) {
  return Number(v).toFixed(2).replace('.', ',');
}

function normalizar(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function setMsg(el, txt, tipo) {
  el.textContent = txt;
  el.className   = 'fmsg' + (tipo ? ' ' + tipo : '');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function alerta(msg) {
  alert('⚠️ ' + msg);
}

function abrirOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

/* ════════════════════════
   VIEWS
════════════════════════ */

function controlarCartFloat(view) {
  const cartFloat = document.getElementById('cartFloat');
  if (!cartFloat) return;

  if (view === 'cardapio' && carrinho.length > 0) {
    cartFloat.style.display = 'flex';
  } else {
    cartFloat.style.display = 'none';
  }
}

function goView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const target = document.getElementById('view' + capitalize(view));
  if (target) target.classList.add('active');

  const navCardapio = document.getElementById('navCardapio');
  if (navCardapio) navCardapio.classList.toggle('active', view === 'cardapio');

  if (view === 'painel') {
    renderPainel();
  }

  if (view === 'checkout') {
    renderCoCart();
    atualizarTotais();
  }

  controlarCartFloat(view);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ════════════════════════
   PAINEL DE PEDIDOS / ADMIN
════════════════════════ */

function renderPainel() {
  const list = document.getElementById('painelList');
  if (!list) return;

  controlarCartFloat('painel');

  list.innerHTML = '';

  if (!pedidos.length) {
    list.innerHTML = `
      <div class="painel-empty">
        <big>📋</big>
        <p>Nenhum pedido registrado ainda.</p>
        <small>Os pedidos aparecem aqui após a finalização.</small>
      </div>
    `;
    return;
  }

  pedidos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pedido-card';

    const itensHtml  = p.itens
      .map(i => `${i.qtd}x ${i.nome} (${i.tamanho}) — R$ ${fmtPreco(i.preco * i.qtd)}`)
      .join('\n');

    const badgeClass = p.tipo === 'retirada' ? 'badge-retirada' : 'badge-entrega';
    const badgeLabel = p.tipo === 'retirada' ? '🏪 Retirada' : '🛵 Entrega';

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
          <div class="pedido-num">Pedido #${String(p.id).padStart(3, '0')}</div>
          <div class="pedido-time">${p.data}</div>
        </div>
        <span class="pedido-badge ${badgeClass}">${badgeLabel}</span>
      </div>

      <div>
        <div class="pedido-client-name">${p.nome}</div>
        <div class="pedido-client-tel">📞 ${p.tel}</div>
      </div>

      <pre class="pedido-items" style="font-family:inherit;white-space:pre-wrap;font-size:13px;line-height:1.7">${itensHtml}</pre>
      ${endHtml}
      <div class="pedido-pay">💳 ${p.pagamento}</div>
      ${trocoHtml}

      <div class="pedido-total-line">
        <span>Total</span>
        <span>R$ ${fmtPreco(p.total)}</span>
      </div>

      <div class="pedido-actions">
        <button class="btn-imprimir" onclick="imprimirPedido(${p.id})">🖨️ Imprimir</button>
        <button class="btn-remover-pedido" onclick="removerPedido(${p.id})">✕</button>
      </div>
    `;

    list.appendChild(card);
  });
}

function removerPedido(id) {
  if (!confirm('Remover este pedido?')) return;
  pedidos = pedidos.filter(p => p.id !== id);
  localStorage.setItem('pdp_pedidos', JSON.stringify(pedidos));
  renderPainel();
}

function limparTodos() {
  if (!confirm('Deseja apagar todos os pedidos?')) return;
  pedidos = [];
  localStorage.removeItem('pdp_pedidos');
  renderPainel();
}

/* ── Impressão ── */

function imprimirPedido(id) {
  const p = pedidos.find(o => o.id === id);
  if (!p) return;

  const itensHtml = p.itens.map(i => `
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
    <div class="prt-row"><span><strong>Pedido:</strong></span><span class="r">#${String(p.id).padStart(3, '0')}</span></div>
    <div class="prt-row"><span><strong>Data:</strong></span><span class="r">${p.data}</span></div>
    <hr class="prt-sep"/>

    <div class="prt-row"><span><strong>Cliente:</strong></span><span class="r">${p.nome}</span></div>
    <div class="prt-row"><span><strong>Telefone:</strong></span><span class="r">${p.tel}</span></div>
    <div class="prt-row"><span><strong>Tipo:</strong></span><span class="r">${p.tipo === 'entrega' ? 'Entrega' : 'Retirada'}</span></div>
    ${endBloco}
    <hr class="prt-sep"/>

    <div class="prt-section-title">Itens:</div>
    ${itensHtml}
    <hr class="prt-sep"/>

    <div class="prt-row"><span>Subtotal:</span><span class="r">R$ ${fmtPreco(p.sub)}</span></div>
    ${p.entrega > 0 ? `<div class="prt-row"><span>Entrega:</span><span class="r">R$ ${fmtPreco(p.entrega)}</span></div>` : ''}
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
}

/* ── Acesso secreto admin ── */

function bindAdminSecretAccess() {
  const trigger = document.getElementById('brandNameTrigger');
  if (!trigger) return;

  trigger.addEventListener('click', () => {
    const now = Date.now();

    if (now - adminLastClickTime <= 1500) {
      adminClickCount += 1;
    } else {
      adminClickCount = 1;
    }

    adminLastClickTime = now;

    if (adminClickCount >= 3) {
      adminClickCount = 0;
      const senha = window.prompt('Acesso restrito - paradadapizza');

      if (senha === ADMIN_PASSWORD) {
        goView('painel');
      } else if (senha !== null) {
        alert('Acesso negado');
      }
    }
  });
}

/* ════════════════════════
   INICIALIZAÇÃO
════════════════════════ */

(function init() {
  renderCardapio();
  atualizarCarrinhoUI();
  bindCategoryFilter();
  bindAdminSecretAccess();
  controlarCartFloat('cardapio');

  const fCep = document.getElementById('fCep');

  if (fCep) {
    fCep.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarCep();
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
    }
  });
})();