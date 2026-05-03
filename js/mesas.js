const STORAGE_KEY = "paradaPizzaMesasV1";

let mesas = carregarMesas();
let modalPizza = null;
let modalVariacao = null;
let filtroMesasAtual = "todos";
let buscaAtual = "";
let mesaSelecionada = null;

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
    return JSON.parse(dados);
  } catch {
    return criarMesasIniciais();
  }
}

function salvarMesas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mesas));
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calcularTotal(mesa) {
  return mesa.itens.reduce((total, item) => total + item.preco * item.quantidade, 0);
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

  const livres = mesas.filter((m) => m.itens.length === 0 && !m.nome).length;
  const ocupadas = mesas.length - livres;

  if (totalMesasEl) totalMesasEl.textContent = mesas.length;
  if (mesasLivresEl) mesasLivresEl.textContent = livres;
  if (mesasOcupadasEl) mesasOcupadasEl.textContent = ocupadas;
}

function renderMesas() {
  containerMesas.innerHTML = "";

  mesas.forEach((mesa) => {
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

function abrirMesa(numero) {
  mesaSelecionada = numero;

  const mesa = mesas.find((m) => m.numero === numero);
  renderPainel(mesa);
  renderMesas();

  setTimeout(() => {
    document.querySelector(".input-busca-produto")?.focus();
  }, 80);
}

function atualizarNomeMesa(numero, valor) {
  const mesa = mesas.find((m) => m.numero === numero);
  mesa.nome = valor.trim();

  salvarMesas();
  renderMesas();
}

function renderPainel(mesa) {
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

function aumentarItem(numeroMesa, idProduto) {
  const mesa = mesas.find(m => m.numero === numeroMesa);
  const item = mesa.itens.find(i => i.id === idProduto);

  if (!item) return;

  item.quantidade++;

  salvarMesas();
  renderPainel(mesa);
  renderMesas();
}

function diminuirItem(numeroMesa, idProduto) {
  const mesa = mesas.find(m => m.numero === numeroMesa);
  const item = mesa.itens.find(i => i.id === idProduto);

  if (!item) return;

  item.quantidade--;

  if (item.quantidade <= 0) {
    mesa.itens = mesa.itens.filter(i => i.id !== idProduto);
  }

  salvarMesas();
  renderPainel(mesa);
  renderMesas();
}

function removerItem(numeroMesa, idProduto) {
  const mesa = mesas.find(m => m.numero === numeroMesa);

  confirmarAcao(
    "Remover item?",
    "Deseja realmente remover este item da comanda?",
    "Remover",
    () => {
      mesa.itens = mesa.itens.filter(i => i.id !== idProduto);

      salvarMesas();
      renderPainel(mesa);
      renderMesas();

      mostrarToast("Item removido da comanda");
    }
  );
}

function liberarMesa(numero) {
  const mesa = mesas.find(m => m.numero === numero);

  confirmarAcao(
    "Liberar mesa?",
    "Todos os dados desta mesa serão apagados. Deseja continuar?",
    "Liberar mesa",
    () => {
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
  const mesa = mesas.find(m => m.numero === numero);

  if (!mesa || mesa.itens.length === 0) {
    alert("Mesa vazia");
    return;
  }

  abrirModalFechamento(mesa);
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

        <div class="modal-opcoes">
          <button onclick="confirmarFechamentoMesa(${mesa.numero}, 'Dinheiro')">
            💵 Dinheiro
          </button>

          <button onclick="confirmarFechamentoMesa(${mesa.numero}, 'Cartão')">
            💳 Cartão
          </button>

          <button onclick="confirmarFechamentoMesa(${mesa.numero}, 'Pix')">
            🔁 Pix
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function fecharModalFechamento() {
  const modal = document.getElementById("modal-fechamento");
  if (modal) modal.remove();
}

function confirmarFechamentoMesa(numeroMesa, formaPagamento) {
  const mesa = mesas.find(m => m.numero === numeroMesa);

  if (!mesa || mesa.itens.length === 0) {
    alert("Mesa vazia");
    return;
  }

  imprimirFechamentoMesa(mesa, formaPagamento);

  mesa.nome = "";
  mesa.itens = [];

  salvarMesas();
  fecharModalFechamento();

  mesaSelecionada = null;
  renderPainelVazio();
  renderMesas();

  mostrarToast(`✔ Mesa ${numeroMesa} fechada - ${formaPagamento}`);
}

function initMesas() {
  if (!containerMesas || !painel) return;

  renderMesas();
  renderPainelVazio();
}

initMesas();
window.initMesas = initMesas;


/* EXPOSIÇÃO GLOBAL - NECESSÁRIA COM <script> SEM MÓDULOS */
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
window.abrirModalFechamento = abrirModalFechamento;
window.fecharModalFechamento = fecharModalFechamento;
window.confirmarFechamentoMesa = confirmarFechamentoMesa;
