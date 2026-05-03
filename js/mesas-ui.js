function confirmarAcao(titulo, descricao, textoConfirmar, callback) {
  const modalExistente = document.querySelector(".modal-confirmacao");
  if (modalExistente) modalExistente.remove();

  const modal = document.createElement("div");
  modal.className = "modal-confirmacao";

  modal.innerHTML = `
    <div class="modal-confirmacao-card">
      <h3>${titulo}</h3>
      <p>${descricao}</p>

      <div class="modal-confirmacao-acoes">
        <button class="btn-cancelar" type="button">Cancelar</button>
        <button class="btn-confirmar" type="button">${textoConfirmar}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".btn-cancelar").onclick = () => {
    modal.remove();
  };

  modal.querySelector(".btn-confirmar").onclick = () => {
    modal.remove();
    callback();
  };

  modal.onclick = (event) => {
    if (event.target === modal) modal.remove();
  };
}

function mostrarToast(mensagem) {
  const toastExistente = document.querySelector(".toast-sistema");
  if (toastExistente) toastExistente.remove();

  const toast = document.createElement("div");
  toast.className = "toast-sistema";
  toast.textContent = mensagem;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("mostrar");
  }, 50);

  setTimeout(() => {
    toast.remove();
  }, 1800);
}

function tocarSomConfirmacao() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.12);
  } catch {
    console.log("Som não reproduzido.");
  }
}

function feedbackItemAdicionado(nomeProduto) {
  mostrarToast(`✔ ${nomeProduto} adicionado`);
  tocarSomConfirmacao();
}


/* EXPOSIÇÃO GLOBAL - NECESSÁRIA COM <script> SEM MÓDULOS */
window.confirmarAcao = confirmarAcao;
window.mostrarToast = mostrarToast;
window.tocarSomConfirmacao = tocarSomConfirmacao;
window.feedbackItemAdicionado = feedbackItemAdicionado;
