const STORAGE_KEY = "paradaPizzaMesasV1";

let mesas = carregarMesas();
let modalPizza = null;
let modalVariacao = null;
let filtroMesasAtual = "todos";
let buscaAtual = "";
let mesaSelecionada = null;
let realtimeMesasIniciado = false;

const containerMesas = document.getElementById("mesas");
const painel = document.getElementById("painel");

const produtos = montarProdutosMesa();

function criarMesasIniciais() {
  return Array.from({ length: 20 }, (_, i) => ({
    numero: i + 1,
    nome: "",
    itens: []
  }));
}

function carregarMesas() {
  const dados = localStorage.getItem(STORAGE_KEY);
  if (!dados) return criarMesasIniciais();

  try {
    const mesasSalvas = JSON.parse(dados);
    if (!Array.isArray(mesasSalvas) || mesasSalvas.length === 0) return criarMesasIniciais();
    return mesasSalvas;
  } catch {
    return criarMesasIniciais();
  }
}

function salvarMesas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mesas));
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calcularTotal(mesa) {
  if (!mesa || !Array.isArray(mesa.itens)) return 0;

  return mesa.itens.reduce((total, item) => {
    return total + Number(item.preco || 0) * Number(item.quantidade || 0);
  }, 0);
}

function encontrarMesa(numero) {
  return mesas.find(m => Number(m.numero) === Number(numero));
}

function converterItemBancoParaMesa(item) {
  return {
    id: item.id,
    produto_id: item.produto_id || "",
    nome: item.nome,
    tamanho: item.tamanho || "",
    observacao: item.observacao || "",
    preco: Number(item.preco || 0),
    quantidade: Number(item.quantidade || 1),
    origemBanco: true
  };
}

async function sincronizarMesaComBanco(numeroMesa) {
  const mesa = encontrarMesa(numeroMesa);
  if (!mesa) return null;

  if (typeof criarPedidoAberto !== "function" || typeof buscarItensPedidoAberto !== "function") {
    console.warn("pedido-aberto.js não foi carregado. Usando apenas localStorage.");
    return mesa;
  }

  const pedidoAberto = await criarPedidoAberto(numeroMesa, mesa.nome || "");
  const itensBanco = await buscarItensPedidoAberto(pedidoAberto.id);

  mesa.nome = pedidoAberto.nome_cliente || mesa.nome || "";
  mesa.itens = itensBanco.map(converterItemBancoParaMesa);

  salvarMesas();

  return mesa;
}

async function carregarComandasAbertasDoBanco() {
  if (typeof carregarComandasAbertas !== "function") {
    console.warn("carregarComandasAbertas não encontrado. Usando mesas locais.");
    return;
  }

  try {
    const comandas = await carregarComandasAbertas();

    comandas.forEach(comanda => {
      const mesa = encontrarMesa(comanda.mesa);
      if (!mesa) return;

      mesa.nome = comanda.nome_cliente || "";

      const itens = Array.isArray(comanda.itens_pedido_aberto)
        ? comanda.itens_pedido_aberto
        : [];

      mesa.itens = itens.map(converterItemBancoParaMesa);
    });

    salvarMesas();
    renderMesas();

    if (mesaSelecionada) {
      const mesaAtual = encontrarMesa(mesaSelecionada);
      if (mesaAtual) renderPainel(mesaAtual);
    }
  } catch (erro) {
    console.error("Erro ao carregar comandas abertas do banco:", erro);
  }
}

async function adicionarItemNaComandaViva(numeroMesa, item) {
  const mesa = encontrarMesa(numeroMesa);
  if (!mesa) return;

  try {
    if (typeof salvarItemPedidoAberto !== "function") {
      throw new Error("pedido-aberto.js não foi carregado.");
    }

    await salvarItemPedidoAberto(numeroMesa, item);
    await sincronizarMesaComBanco(numeroMesa);
  } catch (erro) {
    console.error("Erro ao salvar item no banco. Salvando localmente:", erro);

    mesa.itens.push({
      ...item,
      id: item.id || `local-${Date.now()}`
    });

    salvarMesas();
  }

  const mesaAtualizada = encontrarMesa(numeroMesa);

  if (mesaAtualizada) {
    renderPainel(mesaAtualizada);
    renderMesas();
  }
}

function renderPainelVazio() {
  painel.innerHTML = `
    <div class="painel-vazio">
      Selecione uma mesa para abrir a comanda
    </div>
  `;
}

function atualizarResumoMesas() {
  const totalMesasEl = document.getElementById("totalMesas");
  const mesasLivresEl = document.getElementById("mesasLivres");
  const mesasOcupadasEl = document.getElementById("mesasOcupadas");

  const livres = mesas.filter(m => m.itens.length === 0 && !m.nome).length;
  const ocupadas = mesas.length - livres;

  if (totalMesasEl) totalMesasEl.textContent = mesas.length;
  if (mesasLivresEl) mesasLivresEl.textContent = livres;
  if (mesasOcupadasEl) mesasOcupadasEl.textContent = ocupadas;
}

function renderMesas() {
  if (!containerMesas) return;

  containerMesas.innerHTML = "";

  mesas.forEach(mesa => {
    const total = calcularTotal(mesa);
    const ocupada = mesa.itens.length > 0 || mesa.nome;

    const div = document.createElement("div");
    div.classList.add("mesa", ocupada ? "ocupada" : "livre");

    if (mesa.numero === mesaSelecionada) div.classList.add("ativa");

    div.innerHTML = `
      <strong>Mesa ${mesa.numero}</strong>
      ${mesa.nome ? `<span>${mesa.nome}</span>` : ""}
      ${ocupada ? `<small>${formatarMoeda(total)}</small>` : `<small>Livre</small>`}
    `;

    div.onclick = () => abrirMesa(mesa.numero);
    containerMesas.appendChild(div);
  });

  atualizarResumoMesas();
}

async function abrirMesa(numero) {
  mesaSelecionada = numero;

  const mesa = encontrarMesa(numero);
  if (!mesa) return;

  painel.innerHTML = `
    <div class="painel-vazio">
      Carregando comanda da Mesa ${numero}...
    </div>
  `;

  try {
    await sincronizarMesaComBanco(numero);
  } catch (erro) {
    console.error("Erro ao abrir mesa no banco:", erro);
    mostrarToast("Usando comanda local. Verifique conexão/Supabase.");
  }

  const mesaAtualizada = encontrarMesa(numero);

  renderPainel(mesaAtualizada);
  renderMesas();

  setTimeout(() => {
    document.querySelector(".input-busca-produto")?.focus();
  }, 80);
}

async function atualizarNomeMesa(numero, valor) {
  const mesa = encontrarMesa(numero);
  if (!mesa) return;

  mesa.nome = valor.trim();

  salvarMesas();
  renderMesas();

  try {
    if (typeof atualizarNomePedidoAberto === "function") {
      await atualizarNomePedidoAberto(numero, mesa.nome);
    }
  } catch (erro) {
    console.error("Erro ao atualizar nome no banco:", erro);
  }
}

function renderPainel(mesa) {
  if (!mesa) {
    renderPainelVazio();
    return;
  }

  const total = calcularTotal(mesa);

  painel.innerHTML = `
    <div class="painel-topo">
      <div class="topo-esquerda">
        <h3>Mesa ${mesa.numero}</h3>

        <input
          class="input-cliente"
          type="text"
          placeholder="Nome do cliente (opcional)"
          value="${mesa.nome || ""}"
          oninput="atualizarNomeMesa(${mesa.numero}, this.value)"
        />
      </div>

      <div class="topo-direita">
        <div class="total-box">
          <span>Total parcial</span>
          <strong>${formatarMoeda(total)}</strong>
        </div>

        ${
          mesa.itens.length > 0
            ? `
              <button class="btn-imprimir" onclick="imprimirComandaCozinha(${mesa.numero})">
                🧑‍🍳 Cozinha
              </button>

              <button class="btn-imprimir" onclick="imprimirComandaCliente(${mesa.numero})">
                🧾 Cliente
              </button>

              <button class="btn-fechar" onclick="fecharMesa(${mesa.numero})">
                Fechar Mesa
              </button>
            `
            : `
              <button class="btn-remover" onclick="liberarMesa(${mesa.numero})">
                Liberar Mesa
              </button>
            `
        }
      </div>
    </div>

    <input 
      class="input-busca-produto"
      type="text" 
      placeholder="🔍 Buscar produto..." 
      value="${buscaAtual}"
      oninput="filtrarProdutos(this.value, ${mesa.numero})"
    >

    <div class="area-itens">
      <h4>Itens consumidos</h4>

      ${
        mesa.itens.length === 0
          ? `<p class="vazio">Nenhum item adicionado nesta mesa.</p>`
          : `
            <div class="lista-itens">
              ${mesa.itens.map(item => `
                <div class="item-comanda">
                  <div>
                    <strong>${item.quantidade}x ${item.nome}</strong>
                    ${item.tamanho ? `<span>${item.tamanho}</span>` : ""}
                    ${item.observacao ? `<span>${item.observacao}</span>` : ""}
                    <span>${formatarMoeda(item.preco)} cada</span>
                  </div>

                  <div class="item-acoes">
                    <strong>${formatarMoeda(item.preco * item.quantidade)}</strong>
                    <button onclick='diminuirItem(${mesa.numero}, ${JSON.stringify(item.id)})'>-</button>
                    <button onclick='aumentarItem(${mesa.numero}, ${JSON.stringify(item.id)})'>+</button>
                    <button class="btn-remover" onclick='removerItem(${mesa.numero}, ${JSON.stringify(item.id)})'>Remover</button>
                  </div>
                </div>
              `).join("")}
            </div>
          `
      }
    </div>

    <div class="area-produtos-titulo">
      <h4>Adicionar produtos</h4>
    </div>

    ${renderFiltros(mesa.numero)}

    <div id="lista-produtos">
      ${renderProdutosFiltrados(mesa.numero)}
    </div>
  `;
}

async function aumentarItem(numeroMesa, idProduto) {
  const mesa = encontrarMesa(numeroMesa);
  if (!mesa) return;

  const item = mesa.itens.find(i => i.id === idProduto);
  if (!item) return;

  const novaQuantidade = Number(item.quantidade || 1) + 1;

  try {
    if (item.origemBanco && typeof atualizarQuantidadeItemAberto === "function") {
      await atualizarQuantidadeItemAberto(idProduto, novaQuantidade);
      await sincronizarMesaComBanco(numeroMesa);
    } else {
      item.quantidade = novaQuantidade;
    }
  } catch (erro) {
    console.error("Erro ao aumentar item no banco:", erro);
    item.quantidade = novaQuantidade;
  }

  salvarMesas();

  const mesaAtualizada = encontrarMesa(numeroMesa);
  renderPainel(mesaAtualizada);
  renderMesas();
}

async function diminuirItem(numeroMesa, idProduto) {
  const mesa = encontrarMesa(numeroMesa);
  if (!mesa) return;

  const item = mesa.itens.find(i => i.id === idProduto);
  if (!item) return;

  const novaQuantidade = Number(item.quantidade || 1) - 1;

  try {
    if (item.origemBanco && typeof atualizarQuantidadeItemAberto === "function") {
      await atualizarQuantidadeItemAberto(idProduto, novaQuantidade);
      await sincronizarMesaComBanco(numeroMesa);
    } else {
      if (novaQuantidade <= 0) {
        mesa.itens = mesa.itens.filter(i => i.id !== idProduto);
      } else {
        item.quantidade = novaQuantidade;
      }
    }
  } catch (erro) {
    console.error("Erro ao diminuir item no banco:", erro);

    if (novaQuantidade <= 0) {
      mesa.itens = mesa.itens.filter(i => i.id !== idProduto);
    } else {
      item.quantidade = novaQuantidade;
    }
  }

  salvarMesas();

  const mesaAtualizada = encontrarMesa(numeroMesa);
  renderPainel(mesaAtualizada);
  renderMesas();
}

function removerItem(numeroMesa, idProduto) {
  const mesa = encontrarMesa(numeroMesa);
  if (!mesa) return;

  confirmarAcao(
    "Remover item?",
    "Deseja realmente remover este item da comanda?",
    "Remover",
    async () => {
      const item = mesa.itens.find(i => i.id === idProduto);

      try {
        if (item && item.origemBanco && typeof removerItemPedidoAberto === "function") {
          await removerItemPedidoAberto(idProduto);
          await sincronizarMesaComBanco(numeroMesa);
        } else {
          mesa.itens = mesa.itens.filter(i => i.id !== idProduto);
        }
      } catch (erro) {
        console.error("Erro ao remover item no banco:", erro);
        mesa.itens = mesa.itens.filter(i => i.id !== idProduto);
      }

      salvarMesas();

      const mesaAtualizada = encontrarMesa(numeroMesa);
      renderPainel(mesaAtualizada);
      renderMesas();

      mostrarToast("Item removido da comanda");
    }
  );
}

async function adicionarItemSimples(numeroMesa, produto) {
  const item = {
    id: produto.id,
    produto_id: produto.id,
    nome: produto.nome,
    tamanho: "",
    observacao: "",
    preco: Number(produto.preco || 0),
    quantidade: 1
  };

  await adicionarItemNaComandaViva(numeroMesa, item);
  feedbackItemAdicionado(produto.nome);
}

async function confirmarVariacaoProduto() {
  if (!modalVariacao) return;

  const produto = modalVariacao.produto;
  const opcao = produto.tamanhos[modalVariacao.tamanhoIndex];

  const item = {
    id: `${produto.id}-${modalVariacao.tamanhoIndex}`,
    produto_id: produto.id,
    nome: produto.nome,
    tamanho: opcao.label,
    observacao: opcao.label,
    preco: Number(opcao.preco || 0),
    quantidade: 1
  };

  await adicionarItemNaComandaViva(modalVariacao.numeroMesa, item);

  feedbackItemAdicionado(opcao.label);
  fecharModalVariacao();
}

async function confirmarPizza() {
  if (!modalPizza) return;

  if (modalPizza.tipo === "meia" && !modalPizza.pizza2) {
    alert("Selecione o segundo sabor da pizza.");
    return;
  }

  const tamanho = modalPizza.pizza1.tamanhos[modalPizza.tamanhoIndex];

  const adicionais = modalPizza.adicionais
    .map(id => ADICIONAIS_PIZZA.find(e => e.id === id))
    .filter(Boolean);

  let nome = "";
  let observacao = "";

  if (modalPizza.tipo === "inteira") {
    nome = `Pizza ${modalPizza.pizza1.nome} - ${tamanho.label}`;
  } else {
    nome = `Pizza Meio a Meio - ${tamanho.label}`;
    observacao = `${modalPizza.pizza1.nome} / ${modalPizza.pizza2.nome}`;
  }

  if (adicionais.length > 0) {
    observacao += `${observacao ? " | " : ""}Adicionais: ${adicionais.map(a => a.nome).join(", ")}`;
  }

  const item = {
    id: `pizza-${Date.now()}`,
    produto_id: modalPizza.pizza1.id,
    nome,
    tamanho: tamanho.label,
    observacao,
    preco: Number(calcularPrecoModalPizza() || 0),
    quantidade: 1
  };

  await adicionarItemNaComandaViva(modalPizza.numeroMesa, item);

  feedbackItemAdicionado(nome);
  fecharModalPizza();
}

function liberarMesa(numero) {
  const mesa = encontrarMesa(numero);
  if (!mesa) return;

  confirmarAcao(
    "Liberar mesa?",
    "Todos os dados desta mesa serão apagados. Deseja continuar?",
    "Liberar mesa",
    async () => {
      try {
        if (typeof buscarPedidoAbertoPorMesa === "function" && typeof supabaseClient !== "undefined") {
          const pedidoAberto = await buscarPedidoAbertoPorMesa(numero);

          if (pedidoAberto) {
            await supabaseClient
              .from("pedidos_abertos")
              .update({ status: "cancelado" })
              .eq("id", pedidoAberto.id);
          }
        }
      } catch (erro) {
        console.error("Erro ao cancelar comanda aberta no banco:", erro);
      }

      mesa.nome = "";
      mesa.itens = [];

      salvarMesas();

      mesaSelecionada = null;
      renderPainelVazio();
      renderMesas();

      mostrarToast(`Mesa ${numero} liberada`);
    }
  );
}

function fecharMesa(numero) {
  const mesa = encontrarMesa(numero);

  if (!mesa || mesa.itens.length === 0) {
    alert("Mesa vazia");
    return;
  }

  abrirModalFechamento(mesa);
}

function montarResumoItensFechamento(mesa) {
  if (!mesa || !Array.isArray(mesa.itens) || mesa.itens.length === 0) {
    return `<div style="color:#9a3412;">Nenhum item encontrado.</div>`;
  }

  return mesa.itens.map(item => {
    const qtd = Number(item.quantidade || 1);
    const preco = Number(item.preco || 0);
    const subtotal = qtd * preco;

    return `
      <div style="
        display:flex;
        justify-content:space-between;
        gap:12px;
        padding:9px 0;
        border-bottom:1px dashed #fed7aa;
      ">
        <div style="min-width:0;">
          <strong>${qtd}x ${item.nome}</strong>
          ${item.tamanho ? `<div style="font-size:13px;color:#9a3412;margin-top:2px;">${item.tamanho}</div>` : ""}
          ${item.observacao ? `<div style="font-size:13px;color:#9a3412;margin-top:2px;">${item.observacao}</div>` : ""}
        </div>

        <strong style="white-space:nowrap;">
          ${formatarMoeda(subtotal)}
        </strong>
      </div>
    `;
  }).join("");
}

function abrirModalFechamento(mesa) {
  const total = calcularTotal(mesa);

  const modalExistente = document.getElementById("modal-fechamento");
  if (modalExistente) modalExistente.remove();

  const modal = document.createElement("div");
  modal.id = "modal-fechamento";
  modal.className = "modal-pizza-overlay";

  modal.innerHTML = `
    <div class="modal-pizza-card">
      <div class="modal-pizza-header">
        <div>
          <h2>Fechar Mesa ${mesa.numero}</h2>
          <p>Escolha a forma de pagamento</p>
        </div>

        <button onclick="fecharModalFechamento()">×</button>
      </div>

      <div class="modal-pizza-section">
        <h3>Total da conta</h3>

        <div class="total-box" style="width:100%; margin-bottom:16px;">
          <span>Total final</span>
          <strong>${formatarMoeda(total)}</strong>
        </div>

        <div id="confirmacao-fechamento" style="display:none; margin-bottom:16px; padding:14px; border-radius:14px; background:#fff7ed; border:1px solid #fed7aa;">
          <strong>Confirmar fechamento?</strong>
          <div id="texto-confirmacao-fechamento" style="margin:8px 0 0; color:#7c2d12; line-height:1.5;"></div>
        </div>

        <div class="modal-opcoes" id="opcoes-pagamento">
          <button onclick="prepararConfirmacaoFechamento(${mesa.numero}, 'Dinheiro')">
            💵 Dinheiro
          </button>

          <button onclick="prepararConfirmacaoFechamento(${mesa.numero}, 'Cartão')">
            💳 Cartão
          </button>

          <button onclick="prepararConfirmacaoFechamento(${mesa.numero}, 'Pix')">
            🔁 Pix
          </button>
        </div>

        <div id="acoes-confirmacao-fechamento" style="display:none; gap:12px; margin-top:16px;">
          <button class="btn-remover" type="button" onclick="cancelarConfirmacaoFechamento()">
            Cancelar
          </button>

          <button class="btn-fechar" type="button" id="btnConfirmarFechamentoFinal">
            Confirmar fechamento
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function prepararConfirmacaoFechamento(numeroMesa, formaPagamento) {
  const mesa = encontrarMesa(numeroMesa);
  if (!mesa) return;

  const total = calcularTotal(mesa);

  const box = document.getElementById("confirmacao-fechamento");
  const texto = document.getElementById("texto-confirmacao-fechamento");
  const opcoes = document.getElementById("opcoes-pagamento");
  const acoes = document.getElementById("acoes-confirmacao-fechamento");
  const btn = document.getElementById("btnConfirmarFechamentoFinal");

  if (!box || !texto || !opcoes || !acoes || !btn) return;

  texto.innerHTML = `
    <div style="margin-bottom:12px;">
      Mesa <strong>${numeroMesa}</strong><br>
      Pagamento: <strong>${formaPagamento}</strong>
    </div>

    <div style="margin:12px 0 6px;">
      <strong>Itens da comanda:</strong>
    </div>

    <div style="margin-bottom:12px;">
      ${montarResumoItensFechamento(mesa)}
    </div>

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-top:12px;
      padding-top:12px;
      border-top:2px solid #fb923c;
      font-size:17px;
    ">
      <strong>Total final</strong>
      <strong>${formatarMoeda(total)}</strong>
    </div>

    <div style="margin-top:14px;">
      A comanda será finalizada e enviada para o painel de pedidos.
    </div>
  `;

  box.style.display = "block";
  opcoes.style.display = "none";
  acoes.style.display = "flex";

  btn.onclick = () => confirmarFechamentoMesa(numeroMesa, formaPagamento);
}

function cancelarConfirmacaoFechamento() {
  const box = document.getElementById("confirmacao-fechamento");
  const opcoes = document.getElementById("opcoes-pagamento");
  const acoes = document.getElementById("acoes-confirmacao-fechamento");

  if (box) box.style.display = "none";
  if (opcoes) opcoes.style.display = "grid";
  if (acoes) acoes.style.display = "none";
}

function fecharModalFechamento() {
  const modal = document.getElementById("modal-fechamento");
  if (modal) modal.remove();
}

async function confirmarFechamentoMesa(numeroMesa, formaPagamento) {
  const mesa = encontrarMesa(numeroMesa);

  if (!mesa || mesa.itens.length === 0) {
    alert("Mesa vazia");
    return;
  }

  const btn = document.getElementById("btnConfirmarFechamentoFinal");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Finalizando...";
    }

    if (typeof fecharPedidoAberto !== "function") {
      throw new Error("Arquivo pedido-aberto.js não foi carregado.");
    }

    await fecharPedidoAberto(numeroMesa, formaPagamento);

    try {
      if (typeof imprimirFechamentoMesa === "function") {
        imprimirFechamentoMesa(mesa, formaPagamento);
      }
    } catch (erroImpressao) {
      console.warn("Mesa finalizada, mas houve erro na impressão:", erroImpressao);
      mostrarToast("Mesa finalizada. A impressão falhou, mas o pedido foi salvo.");
    }

    mesa.nome = "";
    mesa.itens = [];

    salvarMesas();
    fecharModalFechamento();

    mesaSelecionada = null;
    renderPainelVazio();
    renderMesas();

    if (typeof carregarPedidos === "function") {
      carregarPedidos(true);
    }

    mostrarToast(`✔ Mesa ${numeroMesa} finalizada - ${formaPagamento}`);
  } catch (erro) {
    console.error("Erro ao fechar pedido aberto:", erro);

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Confirmar fechamento";
    }

    alert(
      "Não foi possível finalizar a mesa agora.\n\n" +
      "A comanda NÃO foi apagada.\n\n" +
      "Verifique o Supabase/conexão e tente novamente.\n\n" +
      (erro.message || erro)
    );
  }
}

function iniciarRealtimeMesas() {
  if (realtimeMesasIniciado) return;
  if (typeof supabaseClient === "undefined") return;

  realtimeMesasIniciado = true;

  try {
    supabaseClient
      .channel("comandas-vivas-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos_abertos"
        },
        async () => {
          await carregarComandasAbertasDoBanco();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itens_pedido_aberto"
        },
        async () => {
          await carregarComandasAbertasDoBanco();
        }
      )
      .subscribe();
  } catch (erro) {
    console.error("Erro ao iniciar realtime das mesas:", erro);
  }
}

async function initMesas() {
  if (!containerMesas || !painel) return;

  renderMesas();
  renderPainelVazio();

  await carregarComandasAbertasDoBanco();
  iniciarRealtimeMesas();
}

initMesas();

window.criarMesasIniciais = criarMesasIniciais;
window.carregarMesas = carregarMesas;
window.salvarMesas = salvarMesas;
window.formatarMoeda = formatarMoeda;
window.calcularTotal = calcularTotal;
window.renderPainelVazio = renderPainelVazio;
window.atualizarResumoMesas = atualizarResumoMesas;
window.renderMesas = renderMesas;
window.abrirMesa = abrirMesa;
window.atualizarNomeMesa = atualizarNomeMesa;
window.renderPainel = renderPainel;
window.aumentarItem = aumentarItem;
window.diminuirItem = diminuirItem;
window.removerItem = removerItem;
window.liberarMesa = liberarMesa;
window.fecharMesa = fecharMesa;
window.montarResumoItensFechamento = montarResumoItensFechamento;
window.abrirModalFechamento = abrirModalFechamento;
window.prepararConfirmacaoFechamento = prepararConfirmacaoFechamento;
window.cancelarConfirmacaoFechamento = cancelarConfirmacaoFechamento;
window.fecharModalFechamento = fecharModalFechamento;
window.confirmarFechamentoMesa = confirmarFechamentoMesa;
window.adicionarItemSimples = adicionarItemSimples;
window.confirmarVariacaoProduto = confirmarVariacaoProduto;
window.confirmarPizza = confirmarPizza;
window.initMesas = initMesas;