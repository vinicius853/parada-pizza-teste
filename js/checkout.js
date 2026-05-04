'use strict';

/* ══════════════════════════════════════════════
   CHECKOUT.JS — revisão do pedido, endereço, pagamento e envio
   ATUALIZADO: salva pedido no Supabase antes de abrir WhatsApp
══════════════════════════════════════════════ */

function renderCoCart() {
  const list  = document.getElementById('coCartItems');
  const subEl = document.getElementById('coSubDisplay');

  if (!list || !subEl) return;

  list.innerHTML = '';

  carrinho.forEach(item => {
    const div = document.createElement('div');
    div.className = 'co-cart-item';

    div.innerHTML = `
      <div class="co-item-left">
        <div>
          <div class="co-item-name">${item.nome}</div>
          <div class="co-item-size">${formatarDetalheItem(item)}</div>
        </div>
      </div>
      <div class="co-item-right">
        <div class="co-item-price">R$ ${fmtPreco(item.preco * item.qtd)}</div>
        <div class="co-item-controls">
          <button class="qty-btn" onclick="mudarQtd('${item.chave}', -1)">−</button>
          <span class="qty-val">${item.qtd}</span>
          <button class="qty-btn" onclick="mudarQtd('${item.chave}', 1)">+</button>
        </div>
      </div>
    `;

    list.appendChild(div);
  });

  subEl.textContent = 'R$ ' + fmtPreco(subtotalCarrinho());
}

function onTipoChange() {
  const tipo = getRadio('tipo');
  const endBlock = document.getElementById('enderecoBlock');

  if (endBlock) {
    endBlock.style.display = tipo === 'entrega' ? 'block' : 'none';
  }

  if (tipo !== 'entrega') {
    taxaEntrega = 0;

    const rowTaxa = document.getElementById('rowTaxaEntrega');
    const taxaMsg = document.getElementById('taxaMsg');

    if (rowTaxa) rowTaxa.style.display = 'none';
    if (taxaMsg) taxaMsg.style.display = 'none';
  }

  atualizarTotais();
}

/* CEP */

function maskCep(input) {
  let v = input.value.replace(/\D/g, '');

  if (v.length > 5) {
    v = v.slice(0, 5) + '-' + v.slice(5, 8);
  }

  input.value = v;
}

async function buscarCep() {
  const cepInput = document.getElementById('fCep');
  const msgEl    = document.getElementById('cepMsg');

  if (!cepInput || !msgEl) return;

  const cepRaw = cepInput.value.replace(/\D/g, '');

  if (cepRaw.length !== 8) {
    setMsg(msgEl, 'CEP inválido. Use 8 dígitos.', 'err');
    return;
  }

  setMsg(msgEl, 'Buscando...', '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.erro) {
      setMsg(msgEl, 'CEP não encontrado.', 'err');
      limparEndereco();
      return;
    }

    setValue('fRua', data.logradouro || '');
    setValue('fBairro', data.bairro || '');

    const cidade = document.getElementById('fCidade');
    if (cidade) cidade.value = 'Barra Mansa - RJ';

    setMsg(msgEl, '✓ Endereço encontrado', 'ok');
    calcularTaxaEntrega();

    const num = document.getElementById('fNum');
    if (num) num.focus();

  } catch (error) {
    console.error('Erro ao buscar CEP:', error);

    setMsg(
      msgEl,
      'Não foi possível consultar o CEP agora. Preencha bairro/endereço manualmente.',
      'err'
    );

    calcularTaxaEntrega();
  }
}

function limparEndereco() {
  setValue('fRua', '');
  setValue('fBairro', '');

  const cidade = document.getElementById('fCidade');
  if (cidade) cidade.value = 'Barra Mansa - RJ';

  taxaEntrega = 0;
  atualizarTotais();
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

/* TAXA DE ENTREGA */

function onBairroInput() {
  calcularTaxaEntrega();
}

function calcularTaxaEntrega() {
  const bairroInput = document.getElementById('fBairro');
  const taxaEl      = document.getElementById('taxaMsg');
  const rowTaxa     = document.getElementById('rowTaxaEntrega');
  const ttEntrega   = document.getElementById('ttEntrega');

  if (!bairroInput || !taxaEl || !rowTaxa || !ttEntrega) return;

  const bairroRaw = bairroInput.value.trim();

  if (!bairroRaw) {
    taxaEl.style.display = 'none';
    taxaEntrega = 0;
    atualizarTotais();
    return;
  }

  const BAIRROS_EQUIVALENTES = {
    'vista alegre': [
      'vista alegre',
      'loteamento belo horizonte',
      'belo horizonte',
      'lot belo horizonte',
      'jardim vista alegre',
      'loteamento vista alegre'
    ]
  };

  const bairroNorm = normalizar(bairroRaw);
  let taxa = null;
  let bairroFinal = bairroRaw;

  for (const [chave, valor] of Object.entries(TAXAS_ENTREGA)) {
    if (bairroNorm === normalizar(chave)) {
      taxa = valor;
      bairroFinal = chave;
      break;
    }
  }

  if (taxa === null) {
    for (const [principal, equivalentes] of Object.entries(BAIRROS_EQUIVALENTES)) {
      const encontrou = equivalentes.some(nome => normalizar(nome) === bairroNorm);

      if (encontrou && TAXAS_ENTREGA[principal] !== undefined) {
        taxa = TAXAS_ENTREGA[principal];
        bairroFinal = principal;
        break;
      }
    }
  }

  if (taxa === null) {
    for (const [chave, valor] of Object.entries(TAXAS_ENTREGA)) {
      const chaveNorm = normalizar(chave);

      if (bairroNorm.includes(chaveNorm) || chaveNorm.includes(bairroNorm)) {
        taxa = valor;
        bairroFinal = chave;
        break;
      }
    }
  }

  if (taxa === null) {
    for (const [principal, equivalentes] of Object.entries(BAIRROS_EQUIVALENTES)) {
      const encontrou = equivalentes.some(nome => {
        const nomeNorm = normalizar(nome);
        return bairroNorm.includes(nomeNorm) || nomeNorm.includes(bairroNorm);
      });

      if (encontrou && TAXAS_ENTREGA[principal] !== undefined) {
        taxa = TAXAS_ENTREGA[principal];
        bairroFinal = principal;
        break;
      }
    }
  }

  taxaEl.style.display = 'block';

  if (taxa !== null) {
    taxaEntrega = taxa;
    taxaEl.className = 'taxa-msg ok';

    const bairroMostrado = normalizar(bairroFinal) !== bairroNorm
      ? `${capitalizeWords(bairroFinal)} (${bairroRaw})`
      : capitalizeWords(bairroRaw);

    taxaEl.innerHTML = `✓ Entrega em <strong>${bairroMostrado}</strong> · Taxa: <strong>R$ ${fmtPreco(taxa)}</strong>`;

    rowTaxa.style.display = 'flex';
    ttEntrega.textContent = 'R$ ' + fmtPreco(taxa);
  } else {
    taxaEntrega = -1;
    taxaEl.className = 'taxa-msg err';
    taxaEl.innerHTML = '✗ No momento não entregamos para esse bairro.';
    rowTaxa.style.display = 'none';
  }

  atualizarTotais();
}

function capitalizeWords(texto) {
  return texto
    .toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

/* PAGAMENTO */

function onPagChange() {
  const pag = getRadio('pagamento');
  const trocoBox = document.getElementById('trocoBox');

  if (trocoBox) trocoBox.style.display = pag === 'dinheiro' ? 'block' : 'none';

  if (pag !== 'dinheiro') {
    const cb = document.getElementById('cbTroco');
    const fields = document.getElementById('trocoFields');
    const result = document.getElementById('trocoResult');
    const valorPago = document.getElementById('fValorPago');

    if (cb) cb.checked = false;
    if (fields) fields.style.display = 'none';
    if (result) result.textContent = '';
    if (valorPago) valorPago.value = '';
  }

  atualizarTotais();
}

function onTrocoToggle() {
  const checked = document.getElementById('cbTroco')?.checked;
  const fields = document.getElementById('trocoFields');
  const result = document.getElementById('trocoResult');
  const valorPago = document.getElementById('fValorPago');

  if (fields) fields.style.display = checked ? 'block' : 'none';

  if (!checked) {
    if (result) result.textContent = '';
    if (valorPago) valorPago.value = '';
  }
}

function calcTroco() {
  const total = totalFinal();
  const pago = parseFloat(document.getElementById('fValorPago')?.value || '0') || 0;
  const el = document.getElementById('trocoResult');

  if (!el) return;

  if (pago <= 0) {
    el.textContent = '';
    el.className = 'troco-result';
    return;
  }

  if (pago < total) {
    el.className = 'troco-result insuf';
    el.textContent = `⚠ Valor insuficiente. Faltam R$ ${fmtPreco(total - pago)}`;
  } else {
    el.className = 'troco-result ok';
    el.textContent = `Troco: R$ ${fmtPreco(pago - total)}`;
  }
}

/* TOTAIS */

function totalFinal() {
  const sub = subtotalCarrinho();
  const entrega = (taxaEntrega > 0 && getRadio('tipo') === 'entrega') ? taxaEntrega : 0;
  return sub + entrega;
}

function atualizarTotais() {
  const sub = subtotalCarrinho();
  const entrega = (taxaEntrega > 0 && getRadio('tipo') === 'entrega') ? taxaEntrega : 0;
  const total = sub + entrega;

  setText('ttSub', 'R$ ' + fmtPreco(sub));
  setText('ttEntrega', 'R$ ' + fmtPreco(entrega));
  setText('ttTotal', 'R$ ' + fmtPreco(total));

  const rowTaxaEntrega = document.getElementById('rowTaxaEntrega');
  if (rowTaxaEntrega) {
    rowTaxaEntrega.style.display = entrega > 0 ? 'flex' : 'none';
  }
}

/* ════════════════════════
   FINALIZAR PEDIDO — salva no Supabase, depois abre WhatsApp
════════════════════════ */

async function finalizarPedido() {
  const nome = document.getElementById('fNome')?.value.trim() || '';
  const tel = document.getElementById('fTel')?.value.trim() || '';
  const tipo = getRadio('tipo');
  const pag = getRadio('pagamento');

  if (!nome) {
    alerta('Informe seu nome.');
    document.getElementById('fNome')?.focus();
    return;
  }

  if (!tel) {
    alerta('Informe seu WhatsApp.');
    document.getElementById('fTel')?.focus();
    return;
  }

  if (!tipo) {
    alerta('Selecione o tipo de pedido (Retirada ou Entrega).');
    return;
  }

  if (!pag) {
    alerta('Selecione a forma de pagamento.');
    return;
  }

  if (!carrinho.length) {
    alerta('Seu carrinho está vazio!');
    return;
  }

  let rua = '', numero = '', bairro = '', cidade = '', uf = '', cep = '';

  if (tipo === 'entrega') {
    rua = document.getElementById('fRua')?.value.trim() || '';
    numero = document.getElementById('fNum')?.value.trim() || '';
    bairro = document.getElementById('fBairro')?.value.trim() || '';
    cidade = 'Barra Mansa';
    uf = 'RJ';
    cep = document.getElementById('fCep')?.value.trim() || '';

    if (!rua) {
      alerta('Informe a rua ou busque o CEP.');
      document.getElementById('fRua')?.focus();
      return;
    }

    if (!numero) {
      alerta('Informe o número do endereço.');
      document.getElementById('fNum')?.focus();
      return;
    }

    if (!bairro) {
      alerta('Informe o bairro.');
      document.getElementById('fBairro')?.focus();
      return;
    }

    calcularTaxaEntrega();

    if (taxaEntrega === -1) {
      alerta('No momento não entregamos para esse bairro. Escolha Retirada ou altere o endereço.');
      return;
    }

    if (taxaEntrega === 0 && bairro) {
      alerta('Bairro não reconhecido. Verifique o bairro ou escolha Retirada.');
      return;
    }
  }

  if (pag === 'dinheiro' && document.getElementById('cbTroco')?.checked) {
    const pago = parseFloat(document.getElementById('fValorPago')?.value || '0') || 0;
    const total = totalFinal();

    if (pago > 0 && pago < total) {
      alerta('O valor informado para troco é menor que o total do pedido.');
      document.getElementById('fValorPago')?.focus();
      return;
    }
  }

  const sub = subtotalCarrinho();
  const entrega = (taxaEntrega > 0 && tipo === 'entrega') ? taxaEntrega : 0;
  const total = sub + entrega;

  const valorPago = parseFloat(document.getElementById('fValorPago')?.value || '0') || 0;
  const troco = (pag === 'dinheiro' && document.getElementById('cbTroco')?.checked && valorPago > 0)
    ? (valorPago - total)
    : null;

  const pagLabels = {
    pix: 'Pix',
    cartao: 'Cartão',
    dinheiro: 'Dinheiro'
  };

  numeroPedido += 1;
  localStorage.setItem('pdp_counter', String(numeroPedido));

  const pedido = {
    id: numeroPedido,
    data: new Date().toLocaleString('pt-BR'),
    nome,
    tel,
    tipo,
    endereco: tipo === 'entrega' ? { rua, numero, bairro, cidade, uf, cep } : null,
    itens: carrinho.map(i => ({
      nome: i.nome,
      tamanho: formatarDetalheItem(i),
      qtd: i.qtd,
      preco: i.preco,
      tipoItem: i.tipoItem || 'inteira',
      metade1: i.metade1 || null,
      metade2: i.metade2 || null
    })),
    sub,
    entrega,
    taxaCart: 0,
    total,
    pagamento: pagLabels[pag],
    troco
  };

  /* ── Montar mensagem WhatsApp (igual ao original) ── */
  const linhasItens = pedido.itens.map(i => {
    return `  • ${i.qtd}x ${i.nome} (${i.tamanho}) — R$ ${fmtPreco(i.preco * i.qtd)}`;
  }).join('\n');

  const msg = [
    `🍕 *PARADA DA PIZZA — Pedido #${String(numeroPedido).padStart(3, '0')}*`,
    ``,
    `👤 *Nome:* ${nome}`,
    `📞 *Telefone:* ${tel}`,
    ``,
    `📦 *Tipo:* ${tipo === 'entrega' ? 'Entrega 🛵' : 'Retirada 🏪'}`,
    tipo === 'entrega' ? `📍 *Endereço:* ${rua}, ${numero} — ${bairro}, ${cidade}-${uf}${cep ? ` (CEP: ${cep})` : ''}` : null,
    ``,
    `🛒 *Itens:*`,
    linhasItens,
    ``,
    `💰 *Subtotal:* R$ ${fmtPreco(sub)}`,
    entrega > 0 ? `🛵 *Entrega:* R$ ${fmtPreco(entrega)}` : null,
    `✅ *TOTAL: R$ ${fmtPreco(total)}*`,
    ``,
    `💳 *Pagamento:* ${pagLabels[pag]}`,
    troco !== null ? `💵 *Troco para:* R$ ${fmtPreco(valorPago)} (troco: R$ ${fmtPreco(troco)})` : null,
  ].filter(Boolean).join('\n');

  /* ── Salvar no Supabase ANTES de abrir WhatsApp ── */
  const btnWa = document.querySelector('.btn-whatsapp');
  if (btnWa) {
    btnWa.disabled = true;
    btnWa.textContent = '⏳ Registrando pedido...';
  }

  try {
    if (typeof salvarPedidoSupabase !== 'function') {
      throw new Error('Arquivo pedido.js não foi carregado.');
    }

    await salvarPedidoSupabase(montarPedidoCliente({
      numero_pedido : numeroPedido,
      data_criacao  : new Date().toISOString(),
      nome,
      telefone      : tel,
      tipo,
      endereco      : pedido.endereco,
      itens         : pedido.itens,
      subtotal      : sub,
      taxa_entrega  : entrega,
      total,
      pagamento     : pagLabels[pag],
      troco         : troco,
      status        : 'novo',
      impresso      : false
    }));

  } catch (err) {
    console.error('Erro ao salvar pedido no Supabase:', err);

    if (typeof voltarNumeroPedido === 'function') {
      voltarNumeroPedido(numeroPedido);
    } else {
      numeroPedido -= 1;
      localStorage.setItem('pdp_counter', String(numeroPedido));
    }

    if (btnWa) {
      btnWa.disabled = false;
      btnWa.textContent = 'Enviar Pedido pelo WhatsApp';
    }

    alerta('Erro ao registrar pedido: ' + (err.message || JSON.stringify(err)));
    return;
  }

  /* Restaurar botão */
  if (btnWa) {
    btnWa.disabled = false;
    btnWa.textContent = 'Enviar Pedido pelo WhatsApp';
  }

  /* Salvar cópia local para o painel embutido (compatibilidade) */
  pedidos.unshift(pedido);
  localStorage.setItem('pdp_pedidos', JSON.stringify(pedidos));

  /* Abrir WhatsApp */
  const waURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(waURL, '_blank');

  /* Limpar carrinho após envio */
  carrinho = [];
  atualizarCarrinhoUI();
  goView('cardapio');

  renderPainel();
}
