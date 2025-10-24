document.addEventListener("DOMContentLoaded", () => {
  // --- Estado da Aplicação ---
  let fullData = {};
  let isAdmin = false;
  let currentSelections = {
    setor: null,
    modelo: null,
    codigoTipo: null,
    type: null,
    baia: null,
  };

  // --- Seletores DOM ---
  const selects = {
    setor: document.getElementById("select-setor"),
    modelo: document.getElementById("select-modelo"),
    codigoTipo: document.getElementById("select-codigo-tipo"),
    type: document.getElementById("select-type"),
    baia: document.getElementById("select-baia"),
  };
  const itemList = document.getElementById("item-list");
  const authButton = document.getElementById("auth-button");
  const adminOnlyElements = document.querySelectorAll(".admin-only");

  // Forms Admin
  const formAddItem = document.getElementById("form-add-item");
  const inputNewItem = document.getElementById("input-new-item");

  // Botões Admin Hierarquia
  const inputNewHierarchy = document.getElementById("input-new-hierarchy");
  const btnAddBaia = document.getElementById("btn-add-baia");
  const btnAddType = document.getElementById("btn-add-type");
  const btnAddCodigo = document.getElementById("btn-add-codigo");

  // Botões Edição Baia
  const btnEditBaia = document.getElementById("btn-edit-baia");
  const btnDeleteBaia = document.getElementById("btn-delete-baia");

  // --- Funções de API ---

  /** Salva o objeto de dados *inteiro* no backend */
  async function saveData() {
    if (!isAdmin) return;
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullData),
      });
      if (!response.ok) throw new Error("Falha ao salvar");
      console.log("Dados salvos com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("ERRO: Não foi possível salvar os dados. Verifique o console.");
    }
  }

  /** Carrega os dados iniciais do backend */
  async function loadInitialData() {
    try {
      const response = await fetch("/api/data");
      fullData = await response.json();
      populateSetores();
      checkLoginStatus();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      itemList.innerHTML =
        '<li class="list-group-item list-group-item-danger">Erro ao carregar dados do servidor.</li>';
    }
  }

  // --- Funções de Autenticação ---

  async function checkLoginStatus() {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      isAdmin = data.is_admin;
      updateAdminUI();
    } catch (error) {
      console.error("Erro ao verificar status:", error);
    }
  }

  function login() {
    const password = prompt("Digite a senha de administrador:");
    if (!password) return;

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          isAdmin = true;
          alert("Login efetuado com sucesso!");
        } else {
          isAdmin = false;
          alert(`Falha no login: ${data.error}`);
        }
        updateAdminUI();
      });
  }

  function logout() {
    fetch("/api/logout", { method: "POST" }).then(() => {
      isAdmin = false;
      alert("Você saiu do modo admin.");
      updateAdminUI();
    });
  }

  /** Atualiza a UI para modo Admin ou Operador */
  function updateAdminUI() {
    if (isAdmin) {
      authButton.textContent = "Sair do modo Admin";
      authButton.classList.replace("btn-outline-secondary", "btn-danger");
      adminOnlyElements.forEach((el) => (el.style.display = "block")); // ou 'flex', etc.
      document.body.classList.add("admin-mode");
    } else {
      authButton.textContent = "🔐 Entrar como Admin";
      authButton.classList.replace("btn-danger", "btn-outline-secondary");
      adminOnlyElements.forEach((el) => (el.style.display = "none"));
      document.body.classList.remove("admin-mode");
    }
    // Atualiza a lista de itens para mostrar/ocultar botões de exclusão
    displayItems();
  }

  // --- Funções de Filtro (Cascading) ---

  function clearSelect(select, defaultOption = true) {
    select.innerHTML = defaultOption
      ? '<option value="">Selecione...</option>'
      : "";
    select.disabled = true;
  }

  function populateSelect(select, options) {
    options.forEach((option) => {
      select.add(new Option(option, option));
    });
    select.disabled = false;
  }

  function populateSetores() {
    clearSelect(selects.setor, false);
    populateSelect(selects.setor, Object.keys(fullData));
  }

  selects.setor.addEventListener("change", () => {
    currentSelections.setor = selects.setor.value;
    currentSelections.modelo = null;
    clearSelect(selects.modelo);
    clearSelect(selects.codigoTipo);
    clearSelect(selects.type);
    clearSelect(selects.baia);
    resetItemList();
    if (currentSelections.setor) {
      const modelos = Object.keys(fullData[currentSelections.setor]);
      populateSelect(selects.modelo, modelos);
    }
    updateAdminButtonsState();
  });

  selects.modelo.addEventListener("change", () => {
    currentSelections.modelo = selects.modelo.value;
    currentSelections.codigoTipo = null;
    clearSelect(selects.codigoTipo);
    clearSelect(selects.type);
    clearSelect(selects.baia);
    resetItemList();
    if (currentSelections.modelo) {
      const codigos = Object.keys(
        fullData[currentSelections.setor][currentSelections.modelo]
      );
      populateSelect(selects.codigoTipo, codigos);
    }
    updateAdminButtonsState();
  });

  selects.codigoTipo.addEventListener("change", () => {
    currentSelections.codigoTipo = selects.codigoTipo.value;
    currentSelections.type = null;
    clearSelect(selects.type);
    clearSelect(selects.baia);
    resetItemList();
    if (currentSelections.codigoTipo) {
      const types = Object.keys(
        fullData[currentSelections.setor][currentSelections.modelo][
          currentSelections.codigoTipo
        ].types
      );
      populateSelect(selects.type, types);
    }
    updateAdminButtonsState();
  });

  selects.type.addEventListener("change", () => {
    currentSelections.type = selects.type.value;
    currentSelections.baia = null;
    clearSelect(selects.baia);
    resetItemList();
    if (currentSelections.type) {
      const baias = Object.keys(
        fullData[currentSelections.setor][currentSelections.modelo][
          currentSelections.codigoTipo
        ].types[currentSelections.type].baias
      );
      populateSelect(selects.baia, baias);
    }
    updateAdminButtonsState();
  });

  selects.baia.addEventListener("change", () => {
    currentSelections.baia = selects.baia.value;
    displayItems();
    updateAdminButtonsState();
  });

  // --- Funções de Exibição de Itens ---

  function resetItemList() {
    itemList.innerHTML =
      '<li class="list-group-item text-muted">Selecione todos os filtros para ver os itens.</li>';
  }

  function getSelectedItems() {
    const { setor, modelo, codigoTipo, type, baia } = currentSelections;
    if (setor && modelo && codigoTipo && type && baia) {
      try {
        return fullData[setor][modelo][codigoTipo].types[type].baias[baia];
      } catch (e) {
        console.error("Caminho de dados inválido:", currentSelections);
        return null;
      }
    }
    return null;
  }

  function displayItems() {
    const items = getSelectedItems();
    if (items) {
      itemList.innerHTML = "";
      if (items.length === 0) {
        itemList.innerHTML =
          '<li class="list-group-item text-muted">Esta baia está vazia.</li>';
      }
      items.forEach((item) => {
        const li = document.createElement("li");
        li.className =
          "list-group-item d-flex justify-content-between align-items-center";
        li.textContent = item;

        if (isAdmin) {
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-danger btn-sm delete-item-btn";
          deleteBtn.textContent = "X";
          deleteBtn.onclick = () => deleteItem(item);
          li.appendChild(deleteBtn);
        }
        itemList.appendChild(li);
      });
    } else {
      resetItemList();
    }
  }

  // --- Funções de Ação (Admin) ---

  function updateAdminButtonsState() {
    const { setor, modelo, codigoTipo, type, baia } = currentSelections;
    btnAddCodigo.disabled = !modelo;
    btnAddType.disabled = !codigoTipo;
    btnAddBaia.disabled = !type;
    btnEditBaia.disabled = !baia;
    btnDeleteBaia.disabled = !baia;
  }

  // Adicionar Part Number
  formAddItem.addEventListener("submit", (e) => {
    e.preventDefault();
    const newItemName = inputNewItem.value.trim();
    if (!newItemName || !currentSelections.baia) return;

    const items = getSelectedItems();
    if (items && !items.includes(newItemName)) {
      items.push(newItemName);
      displayItems();
      saveData();
      inputNewItem.value = "";
    } else {
      alert("Item já existe ou baia não selecionada.");
    }
  });

  // Deletar Part Number
  function deleteItem(itemName) {
    if (!confirm(`Tem certeza que deseja excluir o item "${itemName}"?`))
      return;

    const items = getSelectedItems();
    if (items) {
      const index = items.indexOf(itemName);
      if (index > -1) {
        items.splice(index, 1);
        displayItems();
        saveData();
      }
    }
  }

  // Adicionar Baia
  btnAddBaia.addEventListener("click", () => {
    const newName = inputNewHierarchy.value.trim();
    if (!newName || !currentSelections.type) return;

    const baias =
      fullData[currentSelections.setor][currentSelections.modelo][
        currentSelections.codigoTipo
      ].types[currentSelections.type].baias;
    if (baias[newName]) {
      alert("Esta baia já existe.");
      return;
    }
    baias[newName] = []; // Cria nova baia com lista vazia
    saveData();

    // Recarrega o select de baias
    const currentType = currentSelections.type;
    selects.type.dispatchEvent(new Event("change"));
    selects.baia.value = newName;
    currentSelections.baia = newName;
    displayItems();
    updateAdminButtonsState();
    inputNewHierarchy.value = "";
  });

  // Adicionar Type
  btnAddType.addEventListener("click", () => {
    const newName = inputNewHierarchy.value.trim();
    if (!newName || !currentSelections.codigoTipo) return;

    const types =
      fullData[currentSelections.setor][currentSelections.modelo][
        currentSelections.codigoTipo
      ].types;
    if (types[newName]) {
      alert("Este Type já existe.");
      return;
    }
    types[newName] = { baias: {} }; // Cria novo type
    saveData();
    selects.codigoTipo.dispatchEvent(new Event("change"));
    selects.type.value = newName;
    selects.type.dispatchEvent(new Event("change"));
    inputNewHierarchy.value = "";
  });

  // Adicionar Código Tipo
  btnAddCodigo.addEventListener("click", () => {
    const newName = inputNewHierarchy.value.trim();
    if (!newName || !currentSelections.modelo) return;

    const modeloObj =
      fullData[currentSelections.setor][currentSelections.modelo];
    if (modeloObj[newName]) {
      alert("Este Código Tipo já existe.");
      return;
    }
    modeloObj[newName] = { types: {} }; // Cria novo código
    saveData();
    selects.modelo.dispatchEvent(new Event("change"));
    selects.codigoTipo.value = newName;
    selects.codigoTipo.dispatchEvent(new Event("change"));
    inputNewHierarchy.value = "";
  });

  // Editar nome da Baia
  btnEditBaia.addEventListener("click", () => {
    const { setor, modelo, codigoTipo, type, baia } = currentSelections;
    if (!baia) return;

    const newName = prompt(`Digite o novo nome para "${baia}":`, baia);
    if (!newName || newName === baia) return;

    const baias = fullData[setor][modelo][codigoTipo].types[type].baias;
    if (baias[newName]) {
      alert("Uma baia com esse nome já existe.");
      return;
    }

    // Copia os dados para a nova chave e apaga a antiga
    baias[newName] = baias[baia];
    delete baias[baia];

    saveData();

    // Recarrega o select e seleciona o novo nome
    currentSelections.baia = newName;
    selects.type.dispatchEvent(new Event("change"));
    selects.baia.value = newName;
  });

  // Excluir Baia
  btnDeleteBaia.addEventListener("click", () => {
    const { setor, modelo, codigoTipo, type, baia } = currentSelections;
    if (!baia) return;

    if (
      !confirm(
        `TEM CERTEZA que deseja excluir a BAIA "${baia}" e TODOS os seus itens?`
      )
    )
      return;

    const baias = fullData[setor][modelo][codigoTipo].types[type].baias;
    delete baias[baia];
    saveData();

    // Recarrega o select
    currentSelections.baia = null;
    selects.type.dispatchEvent(new Event("change"));
  });

  // --- Event Listeners Globais ---
  authButton.addEventListener("click", () => {
    if (isAdmin) {
      logout();
    } else {
      login();
    }
  });

  // --- Inicialização ---
  loadInitialData();
});
