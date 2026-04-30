'use strict';

/* ══════════════════════════════════════════════
   CARRINHO.JS — cardápio, modal produto e carrinho
══════════════════════════════════════════════ */

/* ════════════════════════
   CARDÁPIO
════════════════════════ */

function renderCardapio(filtro = 'all') {
  const catalog = document.getElementById('catalog');
  if (!catalog) return;

  catalog.innerHTML = '';

  CATS.forEach(cat => {
    if (filtro !== 'all' && filtro !== cat.key) return;

    const items = CARDAPIO.filter(p => p.cat === cat.key);
    if (!items.length) return;

    const section = document.createElement('div');
    section.className = 'cat-section';

    const title = document.createElement('div');
    title.className = 'cat-section-title';
    title.textContent = cat.label;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'products-grid';

    items.forEach(prod => grid.appendChild(criarCard(prod)));

    section.appendChild(grid);
    catalog.appendChild(section);
  });
}

function criarCard(prod) {
  const card = document.createElement('div');
  card.className = 'prod-card';

  let precosHtml = '';

  if (prod.tamanhos.length > 1) {
    precosHtml = `
      <div class="prod-prices">
        <div class="price-line"><span>30 cm</span><span>R$ ${fmtPreco(prod.tamanhos[0].preco)}</span></div>
        <div class="price-line"><span>35 cm</span><span>R$ ${fmtPreco(prod.tamanhos[1].preco)}</span></div>
      </div>
    `;
  } else {
    precosHtml = `<div class="prod-price-single">R$ ${fmtPreco(prod.tamanhos[0].preco)}</div>`;
  }

  const imgHtml = prod.img
    ? `<img src="${prod.img}" class="prod-img" alt="${prod.nome}" onerror="this.outerHTML='<div class=&quot;prod-img-fallback&quot;>🍕</div>'">`
    : `<div class="prod-img-fallback">🍕</div>`;

  card.innerHTML = `
    <div class="prod-card-top">
      <div class="prod-name">${prod.nome}</div>
      <div class="prod-desc">${prod.desc}</div>
      ${precosHtml}
    </div>
    <div class="prod-card-bot">
      ${imgHtml}
      <button class="btn-add" title="Adicionar">+</button>
    </div>
  `;

  card.querySelector('.btn-add').addEventListener('click', e => {
    e.stopPropagation();

    if (!prod.aceitaMeio && prod.tamanhos.length === 1) {
      adicionarProdutoSimples(prod);
      return;
    }

    abrirModal(prod);
  });

  card.addEventListener('click', () => {
    if (!prod.aceitaMeio && prod.tamanhos.length === 1) {
      adicionarProdutoSimples(prod);
      return;
    }

    abrirModal(prod);
  });

  return card;
}

function bindCategoryFilter() {
  const catBar = document.getElementById('catBar');
  if (!catBar) return;

  catBar.addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;

    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderCardapio(pill.dataset.cat);
  });
}

/* ════════════════════════
   MODAL DE PRODUTO / MEIO A MEIO
════════════════════════ */

function abrirModal(prod) {
  modalProduto    = prod;
  modalModo       = 'inteira';
  modalTamanhoIdx = null;
  modalMetade1    = null;
  modalMetade2    = null;

  renderModalProduto();
  abrirOverlay('overlaySize');
}

function renderModalProduto() {
  const nomeEl         = document.getElementById('msProdName');
  const descEl         = document.getElementById('msProdDesc');
  const sizesContainer = document.getElementById('msSizes');
  const btnConfirmar   = document.getElementById('btnConfirmar');

  if (!nomeEl || !descEl || !sizesContainer || !btnConfirmar || !modalProduto) return;

  nomeEl.textContent = modalProduto.nome;
  descEl.textContent = modalProduto.desc;

  let html = '';

  if (modalProduto.aceitaMeio) {
    html += `
      <div class="ms-helper">Escolha se deseja a pizza inteira ou meio a meio.</div>
      <div class="ms-mode-list">
        <div class="ms-mode-opt ${modalModo === 'inteira' ? 'sel' : ''}" onclick="setModoPizza('inteira')">
          <strong>🍕 Pizza inteira</strong><br>
          <small>Um único sabor.</small>
        </div>
        <div class="ms-mode-opt ${modalModo === 'meio' ? 'sel' : ''}" onclick="setModoPizza('meio')">
          <strong>🌓 Meio a meio</strong><br>
          <small>Escolha o outro sabor para montar sua pizza meio a meio.</small>
        </div>
      </div>
    `;
  }

  html += `<div class="ms-half-title">Escolha o tamanho</div>`;
  html += `<div class="ms-sizes">`;

  modalProduto.tamanhos.forEach((tam, idx) => {
    html += `
      <div class="ms-size-opt ${modalTamanhoIdx === idx ? 'sel' : ''}" onclick="selecionarTamanhoModal(${idx})">
        <div class="ms-size-info"><div class="ms-size-label">${tam.label}</div></div>
        <div class="ms-size-price">R$ ${fmtPreco(tam.preco)}</div>
      </div>
    `;
  });

  html += `</div>`;

  if (modalModo === 'meio') {
    html += renderHalfSelector();
  }

  sizesContainer.innerHTML = html;

  if (modalProduto.tamanhos.length === 1 && modalTamanhoIdx === null) {
    modalTamanhoIdx = 0;
    renderModalProduto();
    return;
  }

  btnConfirmar.textContent = modalModo === 'meio' ? 'Adicionar meio a meio' : 'Adicionar ao carrinho';
}

function setModoPizza(modo) {
  modalModo = modo;

  if (modo === 'meio') {
    modalMetade1 = modalProduto.id;
    modalMetade2 = null;
  } else {
    modalMetade1 = null;
    modalMetade2 = null;
  }

  renderModalProduto();
}

function selecionarTamanhoModal(idx) {
  modalTamanhoIdx = idx;
  renderModalProduto();
}

function renderHalfSelector() {
  const pizzas  = CARDAPIO.filter(p => p.aceitaMeio && p.cat === modalProduto.cat);
  const metade1 = CARDAPIO.find(p => p.id === modalMetade1);

  if (modalMetade2) {
    const metade2 = CARDAPIO.find(p => p.id === modalMetade2);
    return `
      <div class="ms-helper" style="background:#FFF2F2;padding:12px;border-radius:10px;margin-top:10px;">
        ✅ <strong>Meio a meio selecionada</strong><br>
        <strong>Metade 1:</strong> ${metade1.nome}<br>
        <strong>Metade 2:</strong> ${metade2.nome}<br>
        <small>Agora toque em "Adicionar meio a meio".</small>
      </div>
    `;
  }

  let html = `
    <div class="ms-helper">
      <strong>Metade 1:</strong> ${metade1.nome}<br>
      Agora escolha apenas a segunda metade.
    </div>
    <div class="ms-half-title">Escolha a segunda metade</div>
    <div class="ms-half-list">
  `;

  pizzas.forEach(p => {
    html += `
      <div class="ms-half-opt" onclick="selecionarMetade(2, ${p.id})">
        <strong>${p.nome}</strong><br>
        <small>${p.desc}</small>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

function selecionarMetade(num, id) {
  if (num === 2) modalMetade2 = id;

  renderModalProduto();

  setTimeout(() => {
    const btn = document.getElementById('btnConfirmar');
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

function confirmarAdicao() {
  if (!modalProduto || modalTamanhoIdx === null) {
    alerta('Escolha o tamanho.');
    return;
  }

  if (modalModo === 'meio') {
    adicionarMeioAMeio();
    return;
  }

  const tam    = modalProduto.tamanhos[modalTamanhoIdx];
  const chave  = `inteira_${modalProduto.id}_${modalTamanhoIdx}`;
  const existe = carrinho.find(c => c.chave === chave);

  if (existe) {
    existe.qtd += 1;
  } else {
    carrinho.push({
      chave,
      tipoItem: 'inteira',
      prodId  : modalProduto.id,
      nome    : modalProduto.nome,
      tamanho : tam.label,
      preco   : tam.preco,
      qtd     : 1
    });
  }

  fecharOverlay('overlaySize');
  atualizarCarrinhoUI();
  flashCartBar();
}

function adicionarMeioAMeio() {
  if (!modalMetade1 || !modalMetade2) {
    alerta('Escolha a segunda metade da pizza.');
    return;
  }

  const sabor1 = CARDAPIO.find(p => p.id === modalMetade1);
  const sabor2 = CARDAPIO.find(p => p.id === modalMetade2);

  if (!sabor1 || !sabor2) {
    alerta('Erro ao localizar os sabores escolhidos.');
    return;
  }

  const tam1       = sabor1.tamanhos[modalTamanhoIdx];
  const tam2       = sabor2.tamanhos[modalTamanhoIdx];
  const precoFinal = Math.max(tam1.preco, tam2.preco);
  const tamLabel   = modalProduto.tamanhos[modalTamanhoIdx].label;
  const chave      = `meio_${modalTamanhoIdx}_${sabor1.id}_${sabor2.id}`;
  const existe     = carrinho.find(c => c.chave === chave);

  if (existe) {
    existe.qtd += 1;
  } else {
    carrinho.push({
      chave,
      tipoItem: 'meio',
      prodId  : null,
      nome    : 'Pizza Meio a Meio',
      tamanho : `${tamLabel} — ${sabor1.nome} / ${sabor2.nome}`,
      preco   : precoFinal,
      qtd     : 1,
      metade1 : sabor1.nome,
      metade2 : sabor2.nome
    });
  }

  fecharOverlay('overlaySize');
  atualizarCarrinhoUI();
  flashCartBar();
}

function fecharSizeModal() {
  fecharOverlay('overlaySize');
}

function overlayClickSize(e) {
  if (e.target === document.getElementById('overlaySize')) fecharSizeModal();
}

/* Adiciona direto produtos simples: bebidas, adicionais e esfihas */
function adicionarProdutoSimples(prod) {
  const tam = prod.tamanhos[0];
  const chave = `simples_${prod.id}`;
  const existe = carrinho.find(c => c.chave === chave);

  if (existe) {
    existe.qtd += 1;
  } else {
    carrinho.push({
      chave,
      tipoItem: 'simples',
      prodId  : prod.id,
      nome    : prod.nome,
      tamanho : tam.label,
      preco   : tam.preco,
      qtd     : 1
    });
  }

  atualizarCarrinhoUI();
  flashCartBar();
}

/* ════════════════════════
   CARRINHO
════════════════════════ */

function subtotalCarrinho() {
  return carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
}

function qtdCarrinho() {
  return carrinho.reduce((s, i) => s + i.qtd, 0);
}

function atualizarCarrinhoUI() {
  const qtd     = qtdCarrinho();
  const total   = subtotalCarrinho();
  const bar     = document.getElementById('cartFloat');
  const badge   = document.getElementById('cfBadge');
  const totalEl = document.getElementById('cfTotal');

  if (bar && badge && totalEl) {
    if (qtd > 0) {
      bar.style.display   = 'flex';
      badge.textContent   = String(qtd);
      totalEl.textContent = 'R$ ' + fmtPreco(total);
    } else {
      bar.style.display = 'none';
    }
  }

  renderDrawer();
  renderCoCart();
  atualizarTotais();
}

function flashCartBar() {
  animarCarrinho();
  mostrarToastAdd();
}

function animarCarrinho() {
  const bar = document.getElementById('cartFloat');
  if (!bar) return;
  bar.classList.remove('pulse');
  void bar.offsetWidth;
  bar.classList.add('pulse');
  setTimeout(() => bar.classList.remove('pulse'), 600);
}

function mostrarToastAdd() {
  let toast = document.getElementById('_toastAdd');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '_toastAdd';
    toast.style.cssText = [
      'position:fixed', 'bottom:90px', 'left:50%', 'transform:translateX(-50%)',
      'background:#222', 'color:#fff', 'padding:8px 18px', 'border-radius:20px',
      'font-size:13px', 'z-index:9999', 'pointer-events:none',
      'opacity:0', 'transition:opacity .25s'
    ].join(';');
    document.body.appendChild(toast);
  }

  toast.textContent = '✓ Item adicionado ao carrinho';
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 1800);
}

function mudarQtd(chave, delta) {
  const item = carrinho.find(c => c.chave === chave);
  if (!item) return;

  item.qtd += delta;

  if (item.qtd <= 0) {
    carrinho = carrinho.filter(c => c.chave !== chave);
    if (carrinho.length === 0) fecharCarrinho();
  }

  atualizarCarrinhoUI();
}

function removerItem(chave) {
  carrinho = carrinho.filter(c => c.chave !== chave);
  if (carrinho.length === 0) fecharCarrinho();
  atualizarCarrinhoUI();
}

function abrirCarrinho() {
  renderDrawer();
  abrirOverlay('overlayCart');
}

function fecharCarrinho() {
  fecharOverlay('overlayCart');
}

function overlayClickCart(e) {
  if (e.target === document.getElementById('overlayCart')) fecharCarrinho();
}

function renderDrawer() {
  const body    = document.getElementById('drawerBody');
  const totalEl = document.getElementById('drawerTotal');

  if (!body || !totalEl) return;

  if (!carrinho.length) {
    body.innerHTML      = '<div class="drawer-empty">🛒<strong>Carrinho vazio</strong></div>';
    totalEl.textContent = 'R$ 0,00';
    return;
  }

  body.innerHTML = '';

  carrinho.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';

    div.innerHTML = `
      <div class="ci-info">
        <div class="ci-name">${item.nome}</div>
        <div class="ci-size">${formatarDetalheItem(item)}</div>
      </div>
      <div class="ci-price">R$ ${fmtPreco(item.preco * item.qtd)}</div>
      <div class="ci-controls">
        <button class="qty-btn" onclick="mudarQtd('${item.chave}', -1)">−</button>
        <span class="qty-val">${item.qtd}</span>
        <button class="qty-btn" onclick="mudarQtd('${item.chave}', 1)">+</button>
      </div>
    `;

    body.appendChild(div);
  });

  totalEl.textContent = 'R$ ' + fmtPreco(subtotalCarrinho());
}

function irCheckout() {
  if (!carrinho.length) return;

  fecharCarrinho();
  renderCoCart();
  atualizarTotais();
  goView('checkout');
}