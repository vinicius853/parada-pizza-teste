'use strict';

async function login() {
  const email = document.getElementById('emailInput').value.trim();
  const senha = document.getElementById('senhaInput').value.trim();
  const erroEl = document.getElementById('erroLogin');

  erroEl.textContent = '';

  if (!email || !senha) {
    erroEl.textContent = 'Preencha e-mail e senha.';
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    erroEl.textContent = 'E-mail ou senha inválidos.';
    return;
  }

  iniciarSistema();
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

function iniciarSistema() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appOperacional').style.display = 'block';

  if (typeof iniciarPedidos === 'function') iniciarPedidos();
}

async function verificarSessao() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    iniciarSistema();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const senhaInput = document.getElementById('senhaInput');

  if (senhaInput) {
    senhaInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') login();
    });
  }

  verificarSessao();
});

window.login = login;
window.logout = logout;