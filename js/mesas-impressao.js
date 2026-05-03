function estiloImpressaoTermica() {
  return `
    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }

    body {
      font-family: "Courier New", monospace;
      width: 80mm;
      max-width: 80mm;
      padding: 4mm;
      font-size: 12px;
      line-height: 1.25;
    }

    h2, h3, p {
      text-align: center;
      margin: 2px 0;
      padding: 0;
    }

    h2 {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
    }

    h3 {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .aviso {
      text-align: center;
      font-weight: 900;
      font-size: 16px;
      margin: 6px 0;
    }

    .linha {
      border-top: 1px dashed #000;
      margin: 7px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td {
      padding: 4px 0;
      vertical-align: top;
      border-bottom: 1px dashed #ccc;
      font-size: 12px;
    }

    td:last-child {
      text-align: right;
      white-space: nowrap;
      padding-left: 6px;
    }

    strong {
      font-weight: 900;
    }

    small {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: #000;
    }

    .total {
      margin-top: 8px;
      text-align: center;
      font-size: 17px;
      font-weight: 900;
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

    @page {
      size: 80mm auto;
      margin: 0;
    }

    @media print {
      html, body {
        width: 80mm;
        max-width: 80mm;
        margin: 0;
        padding: 0;
      }

      body {
        padding: 4mm;
      }
    }
  `;
}

function imprimirComandaCozinha(numeroMesa) {
  const mesa = mesas.find(m => m.numero === numeroMesa);

  if (!mesa || mesa.itens.length === 0) {
    alert("Não há itens para imprimir.");
    return;
  }

  const itensHtml = mesa.itens.map(item => `
    <tr>
      <td>
        <strong>${item.quantidade}x ${item.nome}</strong>
        ${item.observacao ? `<br><small>${item.observacao}</small>` : ""}
      </td>
    </tr>
  `).join("");

  const janela = window.open("", "_blank", "width=420,height=700");

  janela.document.write(`
    <html>
      <head>
        <title>Comanda Cozinha - Mesa ${mesa.numero}</title>
        <style>
          ${estiloImpressaoTermica()}
        </style>
      </head>

      <body>
        <h2>PARADA DA PIZZA</h2>
        <h3>COMANDA COZINHA</h3>
        <div class="aviso">MESA ${mesa.numero}</div>
        ${mesa.nome ? `<p>Cliente: ${mesa.nome}</p>` : ""}
        <p>${new Date().toLocaleString("pt-BR")}</p>

        <div class="linha"></div>

        <table>
          ${itensHtml}
        </table>

        <div class="linha"></div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  janela.document.close();
}

function imprimirComandaCliente(numeroMesa) {
  const mesa = mesas.find(m => m.numero === numeroMesa);
  const total = calcularTotal(mesa);

  if (!mesa || mesa.itens.length === 0) {
    alert("Não há itens para imprimir.");
    return;
  }

  const itensHtml = mesa.itens.map(item => `
    <tr>
      <td>
        <strong>${item.quantidade}x ${item.nome}</strong>
        ${item.observacao ? `<br><small>${item.observacao}</small>` : ""}
      </td>
      <td>${formatarMoeda(item.preco * item.quantidade)}</td>
    </tr>
  `).join("");

  const janela = window.open("", "_blank", "width=420,height=700");

  janela.document.write(`
    <html>
      <head>
        <title>Comanda Cliente - Mesa ${mesa.numero}</title>
        <style>
          ${estiloImpressaoTermica()}
        </style>
      </head>

      <body>
        <h2>PARADA DA PIZZA</h2>
        <h3>COMANDA CLIENTE</h3>
        <p>Mesa ${mesa.numero}</p>
        ${mesa.nome ? `<p>Cliente: ${mesa.nome}</p>` : ""}
        <p>${new Date().toLocaleString("pt-BR")}</p>

        <div class="linha"></div>

        <table>
          ${itensHtml}
        </table>

        <div class="linha"></div>

        <div class="total">
          TOTAL: ${formatarMoeda(total)}
        </div>

        <div class="rodape">
          Obrigado pela preferência!
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  janela.document.close();
}

function imprimirFechamentoMesa(mesa, formaPagamento) {
  const total = calcularTotal(mesa);

  const itensHtml = mesa.itens.map(item => `
    <tr>
      <td>
        <strong>${item.quantidade}x ${item.nome}</strong>
        ${item.observacao ? `<br><small>${item.observacao}</small>` : ""}
      </td>
      <td>${formatarMoeda(item.preco * item.quantidade)}</td>
    </tr>
  `).join("");

  const janela = window.open("", "_blank", "width=420,height=700");

  janela.document.write(`
    <html>
      <head>
        <title>Fechamento Mesa ${mesa.numero}</title>
        <style>
          ${estiloImpressaoTermica()}
        </style>
      </head>

      <body>
        <h2>PARADA DA PIZZA</h2>
        <h3>FECHAMENTO - MESA ${mesa.numero}</h3>
        ${mesa.nome ? `<p>Cliente: ${mesa.nome}</p>` : ""}
        <p>${new Date().toLocaleString("pt-BR")}</p>

        <div class="linha"></div>

        <table>
          ${itensHtml}
        </table>

        <div class="linha"></div>

        <div class="total">
          TOTAL: ${formatarMoeda(total)}
        </div>

        <div class="pagamento">
          Pagamento: ${formaPagamento}
        </div>

        <div class="rodape">
          Obrigado pela preferência!
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  janela.document.close();
}


/* EXPOSIÇÃO GLOBAL - NECESSÁRIA COM <script> SEM MÓDULOS */
window.estiloImpressaoTermica = estiloImpressaoTermica;
window.imprimirComandaCozinha = imprimirComandaCozinha;
window.imprimirComandaCliente = imprimirComandaCliente;
window.imprimirFechamentoMesa = imprimirFechamentoMesa;
