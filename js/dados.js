'use strict';

/* ══════════════════════════════════════════════
   DADOS.JS — configurações, cardápio e estado global
══════════════════════════════════════════════ */

/* ── Configurações ── */
const ADMIN_PASSWORD  = 'marcelo2026';
const WHATSAPP_NUMBER = '5524999057453';

const TAXAS_ENTREGA = {
  'vista alegre': 3,
  'vila nova': 5,
  'agua comprida': 6,
  'saudade': 7,
  'vila maria': 8,
  'vila brigida': 6,
  'vila coringa': 7,
  'ano bom': 15,
  'centro': 15,
  'boa vista': 10,
};

const CATS = [
  { key: 'salgadas', label: '🍕 Pizzas Salgadas' },
  { key: 'doces', label: '🍫 Pizzas Doces' },
  { key: 'esfihas', label: '🥙 Esfihas' },
  { key: 'adicionais', label: '➕ Adicionais' },
  { key: 'bebidas', label: '🥤 Bebidas' },
];

/* ── Construtores de produto ── */
function pizza(id, cat, nome, desc, p30, p35, img = '') {
  return {
    id,
    cat,
    nome,
    desc,
    img,
    aceitaMeio: cat === 'salgadas' || cat === 'doces',
    tamanhos: [
      { label: 'Média (30cm)', preco: p30 },
      { label: 'Maracanã (35cm)', preco: p35 },
    ]
  };
}

function simples(id, cat, nome, desc, preco, img = '') {
  return {
    id,
    cat,
    nome,
    desc,
    img,
    aceitaMeio: false,
    tamanhos: [{ label: 'Unidade', preco }]
  };
}

function variacao(id, cat, nome, desc, opcoes, img = '') {
  return {
    id,
    cat,
    nome,
    desc,
    img,
    aceitaMeio: false,
    tamanhos: opcoes
  };
}

/* ── Cardápio completo ── */
const CARDAPIO = [

  /* ─── Pizzas Salgadas ─── */
  pizza(1, 'salgadas', 'Mussarela', 'Molho, mussarela, azeitona e orégano', 35, 43),
  pizza(2, 'salgadas', 'Queijo e Presunto', 'Molho, presunto, mussarela, azeitona e orégano', 35, 45),
  pizza(3, 'salgadas', 'Calabresa', 'Molho, mussarela, calabresa, azeitona, cebola e orégano', 38, 48),
  pizza(4, 'salgadas', 'Peperone', 'Molho, mussarela, peperone, azeitona e orégano', 40, 50),
  pizza(5, 'salgadas', 'Lombo Canadense', 'Molho, mussarela, lombo canadense, catupiry e orégano', 40, 50),
  pizza(6, 'salgadas', 'Portuguesa', 'Molho, presunto, queijo, tomate, milho, calabresa, azeitona, palmito, ovo, cebola e orégano', 45, 55),
  pizza(7, 'salgadas', 'Frango com Catupiry', 'Molho, mussarela, frango, catupiry e orégano', 45, 55),
  pizza(8, 'salgadas', 'A Moda da Casa', 'Molho, tomate, milho, calabresa, azeitona, palmito, ovo, frango, catupiry e orégano', 50, 60),
  pizza(9, 'salgadas', 'Marguerita', 'Molho, mussarela, tomate, manjericão e orégano', 38, 45),
  pizza(10, 'salgadas', '4 Queijos', 'Molho, mussarela, catupiry, cheddar, parmesão, azeitona e orégano', 40, 50),
  pizza(11, 'salgadas', 'FranBacon', 'Molho, mussarela, frango, catupiry, bacon e orégano', 50, 60),
  pizza(12, 'salgadas', 'Napolitana', 'Molho, queijo, presunto, calabresa e orégano', 38, 48),
  pizza(13, 'salgadas', 'Alho e Óleo', 'Molho, mussarela, alho frito, azeite e orégano', 40, 50),
  pizza(14, 'salgadas', 'Caipira', 'Molho, mussarela, frango, milho, catupiry e orégano', 45, 55),
  pizza(15, 'salgadas', 'Brócolis com Bacon', 'Molho, mussarela, brócolis, bacon, azeitona e orégano', 40, 50),
  pizza(16, 'salgadas', 'Baiana', 'Molho, mussarela, calabresa, pimenta, cebola e orégano', 40, 50),
  pizza(17, 'salgadas', 'Tomate Seco e Rúcula', 'Molho, mussarela, rúcula, tomate seco, catupiry e orégano', 40, 50),
  pizza(18, 'salgadas', 'Batata Frita', 'Molho, mussarela, batata frita, queijo ralado por cima', 50, 60),
  pizza(19, 'salgadas', 'Rocket', 'Qualquer sabor com batata frita no centro', 60, 70),
  pizza(20, 'salgadas', 'Vegetariana', 'Molho, tomate, mussarela, milho, ervilha, palmito, cebola e orégano', 45, 55),
  pizza(21, 'salgadas', '3 Porquinhos', 'Molho, mussarela, bacon, lombo, calabresa, azeitona e orégano', 50, 60),
  pizza(22, 'salgadas', 'Explosão da Casa', 'Molho, queijo, frango, catupiry, bacon, milho e batata palha', 50, 60),
  pizza(23, 'salgadas', 'Moda Nordestina', 'Molho, queijo, presunto, carne seca, catupiry e cebola', 50, 60),
  pizza(24, 'salgadas', 'Atum', 'Molho, queijo, atum e cebola', 50, 60),
  pizza(25, 'salgadas', 'Paulistinha', 'Molho, queijo, calabresa, catupiry, cheddar e orégano', 45, 55),
  pizza(26, 'salgadas', 'Calabresa Mineira', 'Molho, queijo, calabresa, milho, bacon e orégano', 50, 60),
  pizza(27, 'salgadas', 'Bacon', 'Molho, queijo, bacon, ovo e orégano', 50, 60),
  pizza(28, 'salgadas', 'Frango com Cheddar', 'Molho, queijo, frango, cheddar e orégano', 45, 55),

  /* ─── Pizzas Doces ─── */
  pizza(29, 'doces', 'Banana', 'Leite condensado, mussarela, banana e canela', 40, 50),
  pizza(30, 'doces', 'Brigadeiro', 'Leite condensado, brigadeiro e confete', 40, 50),
  pizza(31, 'doces', 'Beijinho', 'Leite condensado, beijinho e confete', 40, 50),
  pizza(32, 'doces', 'Prestígio', 'Leite condensado, brigadeiro, coco e confete', 40, 50),
  pizza(33, 'doces', 'Morango com Nutella', 'Leite condensado, morango e nutella', 50, 60),
  pizza(34, 'doces', 'Romeu e Julieta', 'Leite condensado, queijo, goiabada e catupiry', 40, 50),

  /* ─── Esfihas ─── */
  simples(35, 'esfihas', 'Esfihas Variadas', 'Diversos sabores disponíveis. Consulte no atendimento.', 8),

  /* ─── Adicionais ─── */
  simples(36, 'adicionais', 'Bacon', 'Adicional de bacon crocante', 10),
  simples(37, 'adicionais', 'Cheddar', 'Adicional de cheddar cremoso', 8),
  simples(38, 'adicionais', 'Catupiry', 'Adicional de catupiry original', 8),
  simples(39, 'adicionais', 'Queijo Mussarela', 'Adicional de mussarela extra', 10),
  simples(40, 'adicionais', 'Cream Cheese', 'Adicional de cream cheese', 10),

  /* ─── Bebidas ─── */
  variacao(41, 'bebidas', 'Coca-Cola 2L', 'Escolha entre tradicional ou zero açúcar', [
  { label: 'Coca-Cola Normal 2L', preco: 16 },
  { label: 'Coca-Cola Zero 2L', preco: 16 }
], 'img/cocadupla.jpg'),

simples(42, 'bebidas', 'Sprite 2L', 'Refrigerante 2 litros', 12, 'img/sprite.jpg'),
simples(43, 'bebidas', 'Fanta 2L', 'Refrigerante 2 litros', 12, 'img/fanta.jpg'),
simples(44, 'bebidas', 'Coca-Cola 1L', 'Refrigerante 1 litro', 10, 'img/coca2.jpg'),
simples(45, 'bebidas', 'Coca-Cola 600ml', 'Refrigerante 600ml', 8, 'img/coca600.jpg'),
simples(46, 'bebidas', 'Coca-Cola Lata 350ml', 'Refrigerante lata 350ml', 6, 'img/coca350.jpg'),
simples(47, 'bebidas', 'Del Valle 1,5L', 'Suco 1,5 litros', 13, 'img/delvalefrut.jpg'),
simples(48, 'bebidas', 'Del Valle Fruit 1L', 'Suco 1 litro', 8, 'img/frut1.jpg'),
simples(49, 'bebidas', 'Del Valle Caixa 1L', 'Suco 1 litro', 11, 'img/delvalecx.jpg'),
simples(50, 'bebidas', 'Matte 1,5L', 'Chá Matte 1,5 litros', 11, 'img/mate.jpg'),
simples(51, 'bebidas', 'Água 1,5L', 'Sem gás', 7, 'img/agua15.jpg'),
simples(52, 'bebidas', 'Água 510ml', 'Sem gás', 4, 'img/agua.jpg'),
simples(53, 'bebidas', 'Água com gás 510ml', 'Com gás', 5, 'img/aguagas.jpg'),
simples(54, 'bebidas', 'Sprite Lemon', 'Refrigerante sabor limão', 7, 'img/lemon.jpg'),
simples(55, 'bebidas', 'Monster 473ml', 'Energético lata 473ml', 13, 'img/energetico.jpg'),
];

/* ── Estado global da aplicação ── */
let carrinho = [];
let pedidos = JSON.parse(localStorage.getItem('pdp_pedidos') || '[]');
let numeroPedido = parseInt(localStorage.getItem('pdp_counter') || '0', 10);
let taxaEntrega = 0;

/* Estado do modal de produto */
let modalProduto = null;
let modalModo = 'inteira';
let modalTamanhoIdx = null;
let modalMetade1 = null;
let modalMetade2 = null;

/* Estado do acesso admin */
let adminClickCount = 0;
let adminLastClickTime = 0;