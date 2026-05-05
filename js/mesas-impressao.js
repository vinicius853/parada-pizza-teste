function estiloImpressaoTermica() {
  return `
    * {
      box-sizing: border-box;
    }

    @page {
      size: 80mm auto;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }

    body {
      font-family: "Courier New", monospace;
      width: 72mm;
      max-width: 72mm;
      padding: 4mm;
      font-size: 12px;
      line-height: 1.3;
    }

    h2, h3, p {
      text-align: center;
      margin: 2px 0;
      padding: 0;
    }

    h2 {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    h3 {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .aviso {
      text-align: center;
      font-weight: 900;
      font-size: 18px;
      margin: 7px 0;
    }

    .linha {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }

    .item {
      padding: 6px 0;
      border-bottom: 1px dashed #000;
    }

    .item-nome {
      font-size: 13px;
      font-weight: 900;
      word-break: break-word;
    }

    .item-info {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      word-break: break-word;
    }

    .item-total {
      margin-top: 3px;
      text-align: right;
      font-size: 13px;
      font-weight: 900;
    }

    .total {
      margin-top: 8px;
      text-align: right;
      font-size: 18px;
      font-weight: 900;
      border-top: 2px solid #000;
      padding-top: 6px;
    }

    .pagamento {
      margin-top: 6px;
      text-align: center;
      font-size: 13px;
      font-weight: 900;
    }

    .rodape {
      margin-top: 10px;
      text-align: center;
      font-size: 11px;
    }
  `;
}

function limparTextoTermico(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7EÀ-ÿ]/g, "")
    .trim();
}

function imprimirHtmlTermico(html) {
  if (window.electronAPI && typeof window.electronAPI.imprimir === "function") {
    window.electronAPI.imprimir(html);
    return;
  }

  const janela = window.open("", "_blank", "width=420,height=700");

  if (!janela) {
    alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
    return;
  }

  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  janela.onload = function () {
    janela.focus();

    setTimeout(() => {
      janela.print();
    }, 300);
  };
}

function montarHtmlComandaCozinha(mesa) {
  const itensHtml = mesa.itens.map(item => `
    <div class="item">
      <div class="item-nome">${Number(item.quantidade || 1)}x ${limparTextoTermico(item.nome)}</div>
      ${item.tamanho ? `<span class="item-info">${limparTextoTermico(item.tamanho)}</span>` : ""}
      ${item.observacao ? `<span class="item-info">${limparTextoTermico(item.observacao)}</span>` : ""}
    </div>
  `).join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comanda Cozinha - Mesa ${mesa.numero}</title>
        <style>${estiloImpressaoTermica()}</style>
      </head>

      <body>
        <h2>PARADA DA PIZZA</h2>
        <h3>COMANDA COZINHA</h3>

        <div class="aviso">MESA ${mesa.numero}</div>

        ${mesa.nome ? `<p>Cliente: ${limparTextoTermico(mesa.nome)}</p>` : ""}
        <p>${new Date().toLocaleString("pt-BR")}</p>

        <div class="linha"></div>

        ${itensHtml}

        <div class="linha"></div>

        <div class="rodape">
          Enviar para preparo
        </div>
      </body>
    </html>
  `;
}

function montarHtmlComandaCliente(mesa) {
  const total = calcularTotal(mesa);

  const itensHtml = mesa.itens.map(item => {
    const qtd = Number(item.quantidade || 1);
    const subtotal = Number(item.preco || 0) * qtd;

    return `
      <div class="item">
        <div class="item-nome">${qtd}x ${limparTextoTermico(item.nome)}</div>
        ${item.tamanho ? `<span class="item-info">${limparTextoTermico(item.tamanho)}</span>` : ""}
        ${item.observacao ? `<span class="item-info">${limparTextoTermico(item.observacao)}</span>` : ""}
        <div class="item-total">${formatarMoeda(subtotal)}</div>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comanda Cliente - Mesa ${mesa.numero}</title>
        <style>${estiloImpressaoTermica()}</style>
      </head>

      <body>
        <h2>PARADA DA PIZZA</h2>
        <h3>COMANDA CLIENTE</h3>

        <p>Mesa ${mesa.numero}</p>
        ${mesa.nome ? `<p>Cliente: ${limparTextoTermico(mesa.nome)}</p>` : ""}
        <p>${new Date().toLocaleString("pt-BR")}</p>

        <div class="linha"></div>

        ${itensHtml}

        <div class="total">
          TOTAL: ${formatarMoeda(total)}
        </div>

        <div class="rodape">
          Obrigado pela preferência!
        </div>
      </body>
    </html>
  `;
}

function montarHtmlFechamentoMesa(mesa, formaPagamento) {
  const total = calcularTotal(mesa);

  const itensHtml = mesa.itens.map(item => {
    const qtd = Number(item.quantidade || 1);
    const subtotal = Number(item.preco || 0) * qtd;

    return `
      <div class="item">
        <div class="item-nome">${qtd}x ${limparTextoTermico(item.nome)}</div>
        ${item.tamanho ? `<span class="item-info">${limparTextoTermico(item.tamanho)}</span>` : ""}
        ${item.observacao ? `<span class="item-info">${limparTextoTermico(item.observacao)}</span>` : ""}
        <div class="item-total">${formatarMoeda(subtotal)}</div>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Fechamento Mesa ${mesa.numero}</title>
        <style>${estiloImpressaoTermica()}</style>
      </head>

      <body>
        <h2>PARADA DA PIZZA</h2>
        <h3>FECHAMENTO</h3>

        <div class="aviso">MESA ${mesa.numero}</div>

        ${mesa.nome ? `<p>Cliente: ${limparTextoTermico(mesa.nome)}</p>` : ""}
        <p>${new Date().toLocaleString("pt-BR")}</p>

        <div class="linha"></div>

        ${itensHtml}

        <div class="total">
          TOTAL: ${formatarMoeda(total)}
        </div>

        <div class="pagamento">
          Pagamento: ${limparTextoTermico(formaPagamento)}
        </div>

        <div class="rodape">
          Obrigado pela preferência!
        </div>
      </body>
    </html>
  `;
}

function imprimirComandaCozinha(numeroMesa) {
  const mesa = mesas.find(m => Number(m.numero) === Number(numeroMesa));

  if (!mesa || mesa.itens.length === 0) {
    alert("Não há itens para imprimir.");
    return;
  }

  imprimirHtmlTermico(montarHtmlComandaCozinha(mesa));
}

function imprimirComandaCliente(numeroMesa) {
  const mesa = mesas.find(m => Number(m.numero) === Number(numeroMesa));

  if (!mesa || mesa.itens.length === 0) {
    alert("Não há itens para imprimir.");
    return;
  }

  imprimirHtmlTermico(montarHtmlComandaCliente(mesa));
}

function imprimirFechamentoMesa(mesa, formaPagamento) {
  if (!mesa || !Array.isArray(mesa.itens) || mesa.itens.length === 0) return;

  imprimirHtmlTermico(montarHtmlFechamentoMesa(mesa, formaPagamento));
}

/* EXPOSIÇÃO GLOBAL - NECESSÁRIA COM <script> SEM MÓDULOS */
window.estiloImpressaoTermica = estiloImpressaoTermica;
window.limparTextoTermico = limparTextoTermico;
window.imprimirHtmlTermico = imprimirHtmlTermico;
window.montarHtmlComandaCozinha = montarHtmlComandaCozinha;
window.montarHtmlComandaCliente = montarHtmlComandaCliente;
window.montarHtmlFechamentoMesa = montarHtmlFechamentoMesa;
window.imprimirComandaCozinha = imprimirComandaCozinha;
window.imprimirComandaCliente = imprimirComandaCliente;
window.imprimirFechamentoMesa = imprimirFechamentoMesa;