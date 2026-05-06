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
      font-family: monospace;
      font-weight: 700;
      width: 72mm;
      max-width: 72mm;
      padding: 4mm;
      font-size: 13px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .topo {
      text-align: center;
      margin-bottom: 6px;
    }

    .empresa {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .documento {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .mesa-destaque {
      font-size: 26px;
      font-weight: 900;
      text-align: center;
      margin: 8px 0 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .info {
      text-align: center;
      font-size: 12px;
      font-weight: 800;
    }

    .linha {
      border-top: 2px dashed #000;
      margin: 10px 0;
    }

    .linha-fina {
      border-top: 1px dashed #000;
      margin: 7px 0;
    }

    .secao {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: .5px;
    }

    .item {
      padding: 8px 0;
      border-bottom: 1px dashed #999;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .item-nome {
      font-size: 17px;
      font-weight: 900;
      text-transform: uppercase;
      word-break: break-word;
      letter-spacing: .3px;
    }

    .item-info {
      display: block;
      margin-top: 3px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      word-break: break-word;
    }

    .item-obs {
      display: block;
      margin-top: 4px;
      padding: 3px 0;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      word-break: break-word;
    }

    .item-total {
      margin-top: 4px;
      text-align: right;
      font-size: 15px;
      font-weight: 900;
    }

    .total {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 2px solid #000;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 25px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .pagamento {
      margin-top: 10px;
      text-align: center;
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .rodape {
      margin-top: 14px;
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .assinatura {
      margin-top: 22px;
      text-align: center;
      font-size: 12px;
      font-weight: 800;
    }

    .assinatura-linha {
      border-top: 1px solid #000;
      margin: 18px 8mm 3px;
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

function dataHoraImpressao() {
  return new Date().toLocaleString("pt-BR");
}

function escaparRegex(texto) {
  return String(texto || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizarComparacaoTermica(texto) {
  return limparTextoTermico(texto).toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizarNomeItemImpressao(item) {
  let nome = limparTextoTermico(item.nome);
  const tamanho = limparTextoTermico(item.tamanho || "");

  if (tamanho) {
    nome = nome
      .replace(new RegExp(`\\s*-?\\s*${escaparRegex(tamanho)}\\s*$`, "i"), "")
      .trim();
  }

  return nome;
}

function deveMostrarObservacao(item) {
  const observacao = normalizarComparacaoTermica(item.observacao || "");
  const tamanho = normalizarComparacaoTermica(item.tamanho || "");

  if (!observacao) return false;
  if (observacao === tamanho) return false;

  return true;
}

function nomeClienteMesa(mesa) {
  const nome = limparTextoTermico(mesa?.nome || "");
  return nome ? `Cliente: ${nome}<br>` : "";
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

function montarHtmlBaseImpressao(titulo, conteudo, titleTag = "Comanda") {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${limparTextoTermico(titleTag)}</title>
        <style>${estiloImpressaoTermica()}</style>
      </head>

      <body>
        <div class="topo">
          <div class="empresa">PARADA DA PIZZA</div>
          <div class="documento">${limparTextoTermico(titulo)}</div>
        </div>

        ${conteudo}
      </body>
    </html>
  `;
}

function montarHtmlComandaCozinha(mesa) {
  const itensHtml = mesa.itens.map(item => `
    <div class="item">
      <div class="item-nome">
        ${Number(item.quantidade || 1)}x ${normalizarNomeItemImpressao(item)}
      </div>

      ${item.tamanho ? `<span class="item-info">${limparTextoTermico(item.tamanho)}</span>` : ""}

      ${deveMostrarObservacao(item)
        ? `<span class="item-obs">OBS: ${limparTextoTermico(item.observacao)}</span>`
        : ""
      }
    </div>
  `).join("");

  const conteudo = `
    <div class="mesa-destaque">MESA ${mesa.numero}</div>

    <div class="info">
      ${nomeClienteMesa(mesa)}
      ${dataHoraImpressao()}
    </div>

    <div class="linha"></div>

    <div class="secao">Itens para preparo</div>

    ${itensHtml}

    <div class="linha"></div>

    <div class="rodape">
      Enviar para preparo
    </div>
  `;

  return montarHtmlBaseImpressao(
    "COMANDA COZINHA",
    conteudo,
    `Comanda Cozinha - Mesa ${mesa.numero}`
  );
}

function montarHtmlComandaCliente(mesa) {
  const total = calcularTotal(mesa);

  const itensHtml = mesa.itens.map(item => {
    const qtd = Number(item.quantidade || 1);
    const subtotal = Number(item.preco || 0) * qtd;

    return `
      <div class="item">
        <div class="item-nome">
          ${qtd}x ${normalizarNomeItemImpressao(item)}
        </div>

        ${item.tamanho ? `<span class="item-info">${limparTextoTermico(item.tamanho)}</span>` : ""}

        ${deveMostrarObservacao(item)
          ? `<span class="item-info">${limparTextoTermico(item.observacao)}</span>`
          : ""
        }

        <div class="item-total">${formatarMoeda(subtotal)}</div>
      </div>
    `;
  }).join("");

  const conteudo = `
    <div class="mesa-destaque">MESA ${mesa.numero}</div>

    <div class="info">
      ${nomeClienteMesa(mesa)}
      ${dataHoraImpressao()}
    </div>

    <div class="linha"></div>

    <div class="secao">Consumo</div>

    ${itensHtml}

    <div class="total">
      <span>Total</span>
      <span>${formatarMoeda(total)}</span>
    </div>

    <div class="linha-fina"></div>

    <div class="rodape">
      Obrigado pela preferencia!
    </div>
  `;

  return montarHtmlBaseImpressao(
    "RECIBO DO CLIENTE",
    conteudo,
    `Comanda Cliente - Mesa ${mesa.numero}`
  );
}

function montarHtmlFechamentoMesa(mesa, formaPagamento) {
  const total = calcularTotal(mesa);

  const itensHtml = mesa.itens.map(item => {
    const qtd = Number(item.quantidade || 1);
    const subtotal = Number(item.preco || 0) * qtd;

    return `
      <div class="item">
        <div class="item-nome">
          ${qtd}x ${normalizarNomeItemImpressao(item)}
        </div>

        ${item.tamanho ? `<span class="item-info">${limparTextoTermico(item.tamanho)}</span>` : ""}

        ${deveMostrarObservacao(item)
          ? `<span class="item-info">${limparTextoTermico(item.observacao)}</span>`
          : ""
        }

        <div class="item-total">${formatarMoeda(subtotal)}</div>
      </div>
    `;
  }).join("");

  const conteudo = `
    <div class="mesa-destaque">MESA ${mesa.numero}</div>

    <div class="info">
      ${nomeClienteMesa(mesa)}
      ${dataHoraImpressao()}
    </div>

    <div class="linha"></div>

    <div class="secao">Fechamento da comanda</div>

    ${itensHtml}

    <div class="total">
      <span>Total</span>
      <span>${formatarMoeda(total)}</span>
    </div>

    <div class="pagamento">
      Pagamento: ${limparTextoTermico(formaPagamento)}
    </div>

    <div class="assinatura">
      <div class="assinatura-linha"></div>
      Assinatura / Conferencia
    </div>

    <div class="rodape">
      Obrigado pela preferencia!
    </div>
  `;

  return montarHtmlBaseImpressao(
    "FECHAMENTO",
    conteudo,
    `Fechamento Mesa ${mesa.numero}`
  );
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
window.dataHoraImpressao = dataHoraImpressao;
window.escaparRegex = escaparRegex;
window.normalizarComparacaoTermica = normalizarComparacaoTermica;
window.normalizarNomeItemImpressao = normalizarNomeItemImpressao;
window.deveMostrarObservacao = deveMostrarObservacao;
window.nomeClienteMesa = nomeClienteMesa;
window.imprimirHtmlTermico = imprimirHtmlTermico;
window.montarHtmlBaseImpressao = montarHtmlBaseImpressao;
window.montarHtmlComandaCozinha = montarHtmlComandaCozinha;
window.montarHtmlComandaCliente = montarHtmlComandaCliente;
window.montarHtmlFechamentoMesa = montarHtmlFechamentoMesa;
window.imprimirComandaCozinha = imprimirComandaCozinha;
window.imprimirComandaCliente = imprimirComandaCliente;
window.imprimirFechamentoMesa = imprimirFechamentoMesa;