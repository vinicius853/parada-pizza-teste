const CHOPP_LOCAL = [
  { id: "chopp-caneca", nome: "Chopp Caneca", preco: 12, categoria: "🍺 Chopp", tipo: "simples" },
  { id: "chopp-tulipa", nome: "Chopp Tulipa", preco: 8, categoria: "🍺 Chopp", tipo: "simples" },
  { id: "chopp-vinho-caneca", nome: "Chopp de Vinho Caneca", preco: 15, categoria: "🍺 Chopp", tipo: "simples" },
  { id: "chopp-vinho-tulipa", nome: "Chopp de Vinho Tulipa", preco: 10, categoria: "🍺 Chopp", tipo: "simples" }
];

const ADICIONAIS_PIZZA = [
  { id: "bacon", nome: "Bacon", preco: 10 },
  { id: "cheddar", nome: "Cheddar", preco: 8 },
  { id: "catupiry", nome: "Catupiry", preco: 8 },
  { id: "mussarela", nome: "Queijo Mussarela", preco: 10 },
  { id: "cream-cheese", nome: "Cream Cheese", preco: 10 }
];

function montarProdutosMesa() {
  const produtosCardapio = CARDAPIO.flatMap((produto) => {
    const categoriaEncontrada = CATS.find((cat) => cat.key === produto.cat);
    const isPizza = produto.cat === "salgadas" || produto.cat === "doces";

    if (isPizza) {
      return [{
        id: `pizza-${produto.id}`,
        cardapioId: produto.id,
        nome: produto.nome,
        tamanhos: produto.tamanhos,
        categoria: categoriaEncontrada ? categoriaEncontrada.label : produto.cat,
        tipo: "pizza",
        catOriginal: produto.cat
      }];
    }

    if (produto.tamanhos.length > 1) {
      return [{
        id: `variacao-${produto.id}`,
        cardapioId: produto.id,
        nome: produto.nome,
        desc: produto.desc,
        tamanhos: produto.tamanhos,
        categoria: categoriaEncontrada ? categoriaEncontrada.label : produto.cat,
        tipo: "variacao",
        catOriginal: produto.cat
      }];
    }

    return produto.tamanhos.map((tamanho, index) => ({
      id: `cardapio-${produto.id}-${index}`,
      nome: `${produto.nome} - ${tamanho.label}`,
      preco: tamanho.preco,
      categoria: categoriaEncontrada ? categoriaEncontrada.label : produto.cat,
      tipo: "simples",
      catOriginal: produto.cat
    }));
  });

  return [...produtosCardapio, ...CHOPP_LOCAL];
}

function renderFiltros(numeroMesa) {
  const filtros = [
    { id: "todos", label: "Todos" },
    { id: "salgadas", label: "🍕 Salgadas" },
    { id: "doces", label: "🍫 Doces" },
    { id: "bebidas", label: "🥤 Bebidas" },
    { id: "chopp", label: "🍺 Chopp" },
    { id: "adicionais", label: "➕ Adicionais" }
  ];

  return `
    <div class="filtros-produtos">
      ${filtros.map(filtro => `
        <button 
          class="${filtroMesasAtual === filtro.id ? "ativo" : ""}"
          onclick="aplicarFiltro('${filtro.id}', ${numeroMesa})"
        >
          ${filtro.label}
        </button>
      `).join("")}
    </div>
  `;
}

function aplicarFiltro(filtro, numeroMesa) {
  filtroMesasAtual = filtro;

  document.getElementById("lista-produtos").innerHTML = renderProdutosFiltrados(numeroMesa);

  document.querySelectorAll(".filtros-produtos button").forEach((btn) => {
    btn.classList.remove("ativo");
  });

  document.querySelectorAll(".filtros-produtos button").forEach((btn) => {
    if (btn.textContent.toLowerCase().includes(textoFiltroBotao(filtro))) {
      btn.classList.add("ativo");
    }
  });
}

function textoFiltroBotao(filtro) {
  const mapa = {
    todos: "todos",
    salgadas: "salgadas",
    doces: "doces",
    bebidas: "bebidas",
    chopp: "chopp",
    adicionais: "adicionais"
  };

  return mapa[filtro] || "todos";
}

function filtrarProdutos(texto, numeroMesa) {
  buscaAtual = texto.toLowerCase();
  document.getElementById("lista-produtos").innerHTML = renderProdutosFiltrados(numeroMesa);
}

function obterProdutosFiltrados() {
  return produtos.filter((p) => {
    const textoBusca = [
      p.nome,
      p.desc || "",
      ...(p.tamanhos || []).map((t) => t.label)
    ].join(" ").toLowerCase();

    const passaBusca = !buscaAtual || textoBusca.includes(buscaAtual);

    let passaFiltro = true;

    if (filtroMesasAtual === "salgadas") passaFiltro = p.catOriginal === "salgadas";
    if (filtroMesasAtual === "doces") passaFiltro = p.catOriginal === "doces";
    if (filtroMesasAtual === "bebidas") passaFiltro = p.catOriginal === "bebidas" || p.categoria.includes("Bebidas");
    if (filtroMesasAtual === "chopp") passaFiltro = p.categoria.includes("Chopp");
    if (filtroMesasAtual === "adicionais") passaFiltro = p.catOriginal === "adicionais" || p.categoria.includes("Adicionais");

    return passaBusca && passaFiltro;
  });
}

function renderProdutosFiltrados(numeroMesa) {
  const lista = obterProdutosFiltrados();

  if (lista.length === 0) {
    return `<p class="vazio">Nenhum produto encontrado.</p>`;
  }

  if (filtroMesasAtual !== "todos" || buscaAtual) {
    return renderProdutosPorLista(lista, numeroMesa);
  }

  return renderProdutosPorCategoria(numeroMesa, lista);
}

function textoProdutoMesa(produto) {
  if (produto.tipo === "pizza") return "Escolher tamanho, sabor e adicionais";
  if (produto.tipo === "variacao") return produto.desc || "Escolha a opção";
  return produto.categoria || "Produto";
}

function precoProdutoMesa(produto) {
  if (produto.tipo === "pizza") return "Configurar";
  if (produto.tipo === "variacao") return "";
  return formatarMoeda(produto.preco);
}

function renderVariacoesProdutoMesa(produto) {
  if (produto.tipo !== "variacao") return "";

  return produto.tamanhos.map((tamanho) => `
    <span class="linha-variacao-produto">
      ${tamanho.label} <span class="preco">${formatarMoeda(tamanho.preco)}</span>
    </span>
  `).join("");
}

function renderBotaoProduto(produto, numeroMesa) {
  return `
    <button onclick='addProduto(${numeroMesa}, ${JSON.stringify(produto.id)})'>
      <div class="info">
        <strong>${produto.nome}</strong>
        <span>${textoProdutoMesa(produto)}</span>
        ${produto.tipo === "variacao"
          ? renderVariacoesProdutoMesa(produto)
          : `<span class="preco">${precoProdutoMesa(produto)}</span>`
        }
      </div>

      <div class="btn-add">+</div>
    </button>
  `;
}

function renderProdutosPorLista(lista, numeroMesa) {
  return `
    <div class="produtos">
      ${lista.map(p => renderBotaoProduto(p, numeroMesa)).join("")}
    </div>
  `;
}

function renderProdutosPorCategoria(numeroMesa, listaProdutos = produtos) {
  const categorias = [...new Set(listaProdutos.map(p => p.categoria))];

  return categorias.map(categoria => {
    const lista = listaProdutos.filter(p => p.categoria === categoria);

    return `
      <div class="categoria">
        <h5>${categoria}</h5>

        <div class="produtos">
          ${lista.map(p => renderBotaoProduto(p, numeroMesa)).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function addProduto(numeroMesa, idProduto) {
  const produto = produtos.find(p => p.id === idProduto);
  if (!produto) return;

  if (produto.tipo === "pizza") {
    abrirModalPizza(numeroMesa, produto);
    return;
  }

  if (produto.tipo === "variacao") {
    abrirModalVariacao(numeroMesa, produto);
    return;
  }

  adicionarItemSimples(numeroMesa, produto);
}

function adicionarItemSimples(numeroMesa, produto) {
  const mesa = mesas.find(m => m.numero === numeroMesa);
  const existente = mesa.itens.find(i => i.id === produto.id);

  if (existente) {
    existente.quantidade++;
  } else {
    mesa.itens.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1
    });
  }

  feedbackItemAdicionado(produto.nome);

  salvarMesas();
  renderPainel(mesa);
  renderMesas();
}

/* MODAL VARIAÇÃO */

function abrirModalVariacao(numeroMesa, produto) {
  modalVariacao = {
    numeroMesa,
    produto,
    tamanhoIndex: 0
  };

  renderModalVariacao();
}

function fecharModalVariacao() {
  modalVariacao = null;
  const modal = document.getElementById("modal-variacao");

  if (modal) modal.remove();
}

function renderModalVariacao() {
  if (!modalVariacao) return;

  let modal = document.getElementById("modal-variacao");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-variacao";
    modal.className = "modal-pizza-overlay";
    document.body.appendChild(modal);
  }

  const produto = modalVariacao.produto;
  const opcaoAtual = produto.tamanhos[modalVariacao.tamanhoIndex];

  modal.innerHTML = `
    <div class="modal-pizza-card">
      <div class="modal-pizza-header">
        <div>
          <h2>${produto.nome}</h2>
          <p>${produto.desc || "Escolha a opção para adicionar à mesa"}</p>
        </div>

        <button onclick="fecharModalVariacao()">×</button>
      </div>

      <div class="modal-pizza-section">
        <h3>Escolha a opção</h3>

        <div class="modal-opcoes">
          ${produto.tamanhos.map((tamanho, index) => `
            <button 
              class="${modalVariacao.tamanhoIndex === index ? "ativo" : ""}"
              onclick="selecionarVariacaoProduto(${index})"
            >
              <strong>${tamanho.label}</strong>
              <span>${formatarMoeda(tamanho.preco)}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="modal-pizza-footer">
        <div>
          <span>Total</span>
          <strong>${formatarMoeda(opcaoAtual.preco)}</strong>
        </div>

        <button onclick="confirmarVariacaoProduto()">Adicionar à mesa</button>
      </div>
    </div>
  `;
}

function selecionarVariacaoProduto(index) {
  modalVariacao.tamanhoIndex = index;
  renderModalVariacao();
}

function confirmarVariacaoProduto() {
  if (!modalVariacao) return;

  const produto = modalVariacao.produto;
  const opcao = produto.tamanhos[modalVariacao.tamanhoIndex];
  const mesa = mesas.find(m => m.numero === modalVariacao.numeroMesa);
  const idItem = `${produto.id}-${modalVariacao.tamanhoIndex}`;
  const existente = mesa.itens.find(i => i.id === idItem);

  if (existente) {
    existente.quantidade++;
  } else {
    mesa.itens.push({
      id: idItem,
      nome: produto.nome,
      observacao: opcao.label,
      preco: opcao.preco,
      quantidade: 1
    });
  }

  feedbackItemAdicionado(opcao.label);

  salvarMesas();
  fecharModalVariacao();
  renderPainel(mesa);
  renderMesas();
}

/* MODAL PIZZA */

function abrirModalPizza(numeroMesa, pizza) {
  modalPizza = {
    numeroMesa,
    pizza1: pizza,
    pizza2: null,
    tamanhoIndex: 0,
    tipo: "inteira",
    adicionais: []
  };

  renderModalPizza();
}

function fecharModalPizza() {
  modalPizza = null;
  const modal = document.getElementById("modal-pizza");

  if (modal) modal.remove();
}

function renderModalPizza() {
  if (!modalPizza) return;

  let modal = document.getElementById("modal-pizza");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-pizza";
    modal.className = "modal-pizza-overlay";
    document.body.appendChild(modal);
  }

  const pizzasDisponiveis = produtos.filter(p => p.tipo === "pizza");
  const pizzasSalgadas = pizzasDisponiveis.filter(p => p.catOriginal === "salgadas");
  const pizzasDoces = pizzasDisponiveis.filter(p => p.catOriginal === "doces");
  const precoAtual = calcularPrecoModalPizza();

  modal.innerHTML = `
    <div class="modal-pizza-card">
      <div class="modal-pizza-header">
        <div>
          <h2>${modalPizza.pizza1.nome}</h2>
          <p>Configure a pizza para adicionar à mesa</p>
        </div>

        <button onclick="fecharModalPizza()">×</button>
      </div>

      <div class="modal-pizza-section">
        <h3>Escolha o tamanho</h3>

        <div class="modal-opcoes">
          ${modalPizza.pizza1.tamanhos.map((t, index) => `
            <button 
              class="${modalPizza.tamanhoIndex === index ? "ativo" : ""}"
              onclick="selecionarTamanhoPizza(${index})"
            >
              <strong>${t.label}</strong>
              <span>${formatarMoeda(t.preco)}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="modal-pizza-section">
        <h3>Tipo da pizza</h3>

        <div class="modal-opcoes">
          <button 
            class="${modalPizza.tipo === "inteira" ? "ativo" : ""}"
            onclick="selecionarTipoPizza('inteira')"
          >
            Inteira
          </button>

          <button 
            class="${modalPizza.tipo === "meia" ? "ativo" : ""}"
            onclick="selecionarTipoPizza('meia')"
          >
            Meia a meio
          </button>
        </div>
      </div>

      ${
        modalPizza.tipo === "meia"
          ? `
            <div class="modal-pizza-section">
              <h3>Segundo sabor</h3>

              <select onchange="selecionarSegundoSabor(this.value)">
                <option value="">Selecione o segundo sabor</option>

                <optgroup label="🍕 Pizzas Salgadas">
                  ${pizzasSalgadas.map(p => `
                    <option value="${p.id}" ${modalPizza.pizza2?.id === p.id ? "selected" : ""}>
                      ${p.nome}
                    </option>
                  `).join("")}
                </optgroup>

                <optgroup label="🍫 Pizzas Doces">
                  ${pizzasDoces.map(p => `
                    <option value="${p.id}" ${modalPizza.pizza2?.id === p.id ? "selected" : ""}>
                      ${p.nome}
                    </option>
                  `).join("")}
                </optgroup>
              </select>
            </div>
          `
          : ""
      }

      <div class="modal-pizza-section">
        <h3>Adicionais</h3>

        <div class="modal-adicionais">
          ${ADICIONAIS_PIZZA.map(extra => `
            <label>
              <input 
                type="checkbox" 
                ${modalPizza.adicionais.includes(extra.id) ? "checked" : ""}
                onchange="toggleAdicionalPizza('${extra.id}')"
              />

              <span>${extra.nome}</span>

              <strong>+ ${formatarMoeda(extra.preco)}</strong>
            </label>
          `).join("")}
        </div>
      </div>

      <div class="modal-pizza-footer">
        <div>
          <span>Total</span>
          <strong>${formatarMoeda(precoAtual)}</strong>
        </div>

        <button onclick="confirmarPizza()">Adicionar à mesa</button>
      </div>
    </div>
  `;
}

function selecionarTamanhoPizza(index) {
  modalPizza.tamanhoIndex = index;
  renderModalPizza();
}

function selecionarTipoPizza(tipo) {
  modalPizza.tipo = tipo;

  if (tipo === "inteira") {
    modalPizza.pizza2 = null;
  }

  renderModalPizza();
}

function selecionarSegundoSabor(idPizza) {
  modalPizza.pizza2 = produtos.find(p => p.id === idPizza) || null;
  renderModalPizza();
}

function toggleAdicionalPizza(idExtra) {
  if (modalPizza.adicionais.includes(idExtra)) {
    modalPizza.adicionais = modalPizza.adicionais.filter(id => id !== idExtra);
  } else {
    modalPizza.adicionais.push(idExtra);
  }

  renderModalPizza();
}

function calcularPrecoModalPizza() {
  const preco1 = modalPizza.pizza1.tamanhos[modalPizza.tamanhoIndex].preco;
  let precoBase = preco1;

  if (modalPizza.tipo === "meia" && modalPizza.pizza2) {
    const preco2 = modalPizza.pizza2.tamanhos[modalPizza.tamanhoIndex].preco;
    precoBase = Math.max(preco1, preco2);
  }

  const precoAdicionais = modalPizza.adicionais.reduce((total, idExtra) => {
    const extra = ADICIONAIS_PIZZA.find(e => e.id === idExtra);
    return total + (extra ? extra.preco : 0);
  }, 0);

  return precoBase + precoAdicionais;
}

function confirmarPizza() {
  if (modalPizza.tipo === "meia" && !modalPizza.pizza2) {
    alert("Selecione o segundo sabor da pizza.");
    return;
  }

  const mesa = mesas.find(m => m.numero === modalPizza.numeroMesa);
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

  mesa.itens.push({
    id: `pizza-${Date.now()}`,
    nome,
    observacao,
    preco: calcularPrecoModalPizza(),
    quantidade: 1
  });

  feedbackItemAdicionado(nome);

  salvarMesas();
  fecharModalPizza();
  renderPainel(mesa);
  renderMesas();
}


/* EXPOSIÇÃO GLOBAL - NECESSÁRIA COM <script> SEM MÓDULOS */
window.montarProdutosMesa = montarProdutosMesa;
window.renderFiltros = renderFiltros;
window.aplicarFiltro = aplicarFiltro;
window.textoFiltroBotao = textoFiltroBotao;
window.filtrarProdutos = filtrarProdutos;
window.obterProdutosFiltrados = obterProdutosFiltrados;
window.renderProdutosFiltrados = renderProdutosFiltrados;
window.renderProdutosPorLista = renderProdutosPorLista;
window.renderProdutosPorCategoria = renderProdutosPorCategoria;
window.addProduto = addProduto;
window.adicionarItemSimples = adicionarItemSimples;
window.abrirModalVariacao = abrirModalVariacao;
window.fecharModalVariacao = fecharModalVariacao;
window.renderModalVariacao = renderModalVariacao;
window.selecionarVariacaoProduto = selecionarVariacaoProduto;
window.confirmarVariacaoProduto = confirmarVariacaoProduto;
window.abrirModalPizza = abrirModalPizza;
window.fecharModalPizza = fecharModalPizza;
window.renderModalPizza = renderModalPizza;
window.selecionarTamanhoPizza = selecionarTamanhoPizza;
window.selecionarTipoPizza = selecionarTipoPizza;
window.selecionarSegundoSabor = selecionarSegundoSabor;
window.toggleAdicionalPizza = toggleAdicionalPizza;
window.calcularPrecoModalPizza = calcularPrecoModalPizza;
window.confirmarPizza = confirmarPizza;
