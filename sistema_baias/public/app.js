document.addEventListener('DOMContentLoaded', () => {

    // --- Variáveis de Estado ---
    let fullData = {}; // Armazena o JSON completo
    let isAdmin = false; // Flag de controle de acesso
    let loginModalInstance; // Instância do modal do Bootstrap

    // --- Seletores de Elementos ---
    const filters = {
        setor: document.getElementById('filter-setor'),
        modelo: document.getElementById('filter-modelo'),
        codigoTipo: document.getElementById('display-codigo-tipo'),
        type: document.getElementById('filter-type'),
        baia: document.getElementById('filter-baia')
    };
    const itemList = document.getElementById('item-list');
    
    // Controles de Admin
    const adminControls = document.getElementById('admin-controls');
    const loginButton = document.getElementById('admin-login-button');
    const logoutButton = document.getElementById('admin-logout-button');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginModalEl = document.getElementById('loginModal');
    
    // Botões de Ação Admin
    const btnAddItem = document.getElementById('btn-add-item');
    const btnAddBaia = document.getElementById('btn-add-baia');
    const btnDeleteBaia = document.getElementById('btn-delete-baia');

    // --- Funções Auxiliares ---

    /**
     * Reseta e preenche um <select> com opções
     * @param {HTMLSelectElement} select - O elemento dropdown
     * @param {string[]} options - Array de strings para as opções
     * @param {string} placeholder - Texto inicial (ex: "Selecione...")
     */
    function populateDropdown(select, options, placeholder) {
        select.innerHTML = ''; // Limpa opções antigas
        select.disabled = options.length === 0;

        // Adiciona o placeholder
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = "";
        placeholderOpt.textContent = placeholder || `Selecione um ${select.id.split('-')[1]}...`;
        placeholderOpt.selected = true;
        placeholderOpt.disabled = true;
        select.appendChild(placeholderOpt);

        // Adiciona as opções
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }

    /** Limpa os dropdowns filhos e a lista de itens */
    function clearFiltersFrom(level) {
        switch (level) {
            case 'setor':
                populateDropdown(filters.modelo, [], 'Selecione um Setor...');
                filters.codigoTipo.value = '';
                // fall-through
            case 'modelo':
                populateDropdown(filters.type, [], 'Selecione um Modelo...');
                // fall-through
            case 'type':
                populateDropdown(filters.baia, [], 'Selecione um Type...');
                // fall-through
            case 'baia':
                renderItems(null); // Limpa a lista de itens
        }
    }

    /** Renderiza a lista de itens na tela */
    function renderItems(items) {
        itemList.innerHTML = '';
        if (!items) {
            itemList.innerHTML = '<li class="list-group-item text-muted">Selecione todos os filtros para ver os itens.</li>';
            return;
        }
        if (items.length === 0) {
            itemList.innerHTML = '<li class="list-group-item text-info">Esta baia está vazia.</li>';
            return;
        }

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = item;

            // Se for admin, adiciona botão de deletar
            if (isAdmin) {
                li.classList.add('admin-item');
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.onclick = () => handleDeleteItem(index);
                li.appendChild(deleteBtn);
            }
            itemList.appendChild(li);
        });
    }

    /** Atualiza a UI com base no status de admin */
    function updateAdminUI() {
        if (isAdmin) {
            loginButton.style.display = 'none';
            logoutButton.style.display = 'block';
            adminControls.style.display = 'block';
        } else {
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            adminControls.style.display = 'none';
        }
        // Re-renderiza a lista de itens para mostrar/esconder botões
        handleBaiaChange();
    }
    
    // --- Funções de API ---

    /** Salva o objeto 'fullData' completo no backend */
    async function saveData() {
        if (!isAdmin) {
            alert('Erro: Tentativa de salvar sem permissão.');
            return;
        }
        try {
            const response = await fetch('/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullData)
            });
            if (!response.ok) {
                throw new Error('Falha ao salvar os dados no servidor.');
            }
            console.log('Dados salvos com sucesso.');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar os dados. Verifique o console.');
        }
    }

    /** Carrega os dados iniciais do backend */
    async function loadInitialData() {
        try {
            const response = await fetch('/api/data');
            fullData = await response.json();
            const setores = Object.keys(fullData);
            populateDropdown(filters.setor, setores, 'Selecione um Setor...');
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            itemList.innerHTML = '<li class="list-group-item text-danger">Falha ao carregar dados do servidor.</li>';
        }
    }

    /** Verifica o status de login no backend */
    async function checkAdminStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            isAdmin = data.isAdmin;
        } catch (error) {
            isAdmin = false;
        } finally {
            updateAdminUI();
        }
    }
    
    // --- Lógica de Filtros (Cascata) ---

    function handleSetorChange() {
        const setor = filters.setor.value;
        clearFiltersFrom('setor');
        if (setor && fullData[setor]) {
            const modelos = Object.keys(fullData[setor]);
            populateDropdown(filters.modelo, modelos, 'Selecione um Modelo...');
        }
    }

    function handleModeloChange() {
        const setor = filters.setor.value;
        const modelo = filters.modelo.value;
        clearFiltersFrom('modelo');
        if (modelo && fullData[setor]?.[modelo]) {
            const modeloData = fullData[setor][modelo];
            filters.codigoTipo.value = modeloData.codigo_tipo || 'N/A';
            const types = Object.keys(modeloData.types);
            populateDropdown(filters.type, types, 'Selecione um Type...');
        }
    }

    function handleTypeChange() {
        const setor = filters.setor.value;
        const modelo = filters.modelo.value;
        const type = filters.type.value;
        clearFiltersFrom('type');
        if (type && fullData[setor]?.[modelo]?.types[type]) {
            const baias = Object.keys(fullData[setor][modelo].types[type].baias);
            populateDropdown(filters.baia, baias, 'Selecione uma Baia...');
        }
    }

    function handleBaiaChange() {
        const setor = filters.setor.value;
        const modelo = filters.modelo.value;
        const type = filters.type.value;
        const baia = filters.baia.value;
        clearFiltersFrom('baia');
        
        if (baia && fullData[setor]?.[modelo]?.types[type]?.baias[baia]) {
            const items = fullData[setor][modelo].types[type].baias[baia];
            renderItems(items);
        } else {
            renderItems(null); // Limpa se a baia não for válida
        }
    }

    // --- Lógica de Admin ---

    async function handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        loginError.style.display = 'none';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            if (response.ok) {
                isAdmin = true;
                updateAdminUI();
                loginModalInstance.hide();
                loginForm.reset();
            } else {
                const data = await response.json();
                loginError.textContent = data.error || 'Senha incorreta';
                loginError.style.display = 'block';
                isAdmin = false;
            }
        } catch (error) {
            loginError.textContent = 'Erro de conexão com o servidor.';
            loginError.style.display = 'block';
        }
    }

    async function handleLogout() {
        await fetch('/api/logout');
        isAdmin = false;
        updateAdminUI();
    }

    // Ações de Edição
    function getSelectedPath() {
        const setor = filters.setor.value;
        const modelo = filters.modelo.value;
        const type = filters.type.value;
        const baia = filters.baia.value;

        if (!setor || !modelo || !type) {
            alert('Selecione Setor, Modelo e Type para realizar esta ação.');
            return null;
        }
        
        const typeRef = fullData[setor]?.[modelo]?.types[type];
        if (!typeRef) return null;

        return { setor, modelo, type, baia, typeRef };
    }

    // Adicionar Item
    async function handleAddItem() {
        const path = getSelectedPath();
        if (!path.baia) {
            alert('Selecione uma Baia para adicionar um item.');
            return;
        }
        
        const newItem = prompt('Digite o nome do novo Part Number (Item):');
        if (newItem) {
            path.typeRef.baias[path.baia].push(newItem);
            await saveData();
            renderItems(path.typeRef.baias[path.baia]); // Re-renderiza a lista
        }
    }

    // Deletar Item
    async function handleDeleteItem(index) {
        const path = getSelectedPath();
        if (!path.baia) return; // Segurança

        const item = path.typeRef.baias[path.baia][index];
        if (confirm(`Tem certeza que deseja remover o item "${item}"?`)) {
            path.typeRef.baias[path.baia].splice(index, 1);
            await saveData();
            renderItems(path.typeRef.baias[path.baia]); // Re-renderiza
        }
    }

    // Adicionar Baia
    async function handleAddBaia() {
        const path = getSelectedPath();
        if (!path) return; // Já foi alertado

        const newBaiaName = prompt('Digite o nome da nova Baia (ex: "Baia 06"):');
        if (newBaiaName) {
            if (path.typeRef.baias[newBaiaName]) {
                alert('Erro: Uma baia com este nome já existe.');
                return;
            }
            // Cria a nova baia com uma lista vazia
            path.typeRef.baias[newBaiaName] = [];
            await saveData();
            
            // Recarrega o dropdown de baias
            const baias = Object.keys(path.typeRef.baias);
            populateDropdown(filters.baia, baias, 'Selecione uma Baia...');
            filters.baia.value = newBaiaName; // Seleciona a nova baia
            renderItems([]); // Renderiza a lista vazia
        }
    }

    // Deletar Baia
    async function handleDeleteBaia() {
        const path = getSelectedPath();
        if (!path.baia) {
            alert('Selecione a Baia que deseja remover.');
            return;
        }

        if (confirm(`Tem certeza que deseja REMOVER PERMANENTEMENTE a "${path.baia}" e todos os seus itens?`)) {
            delete path.typeRef.baias[path.baia];
            await saveData();

            // Recarrega o dropdown de baias e limpa a seleção
            const baias = Object.keys(path.typeRef.baias);
            populateDropdown(filters.baia, baias, 'Selecione uma Baia...');
            clearFiltersFrom('baia');
        }
    }

    // --- Inicialização ---
    function init() {
        // Instancia o modal
        loginModalInstance = new bootstrap.Modal(loginModalEl);

        // Event Listeners dos Filtros
        filters.setor.addEventListener('change', handleSetorChange);
        filters.modelo.addEventListener('change', handleModeloChange);
        filters.type.addEventListener('change', handleTypeChange);
        filters.baia.addEventListener('change', handleBaiaChange);
        
        // Event Listeners de Admin
        loginForm.addEventListener('submit', handleLogin);
        logoutButton.addEventListener('click', handleLogout);
        
        btnAddItem.addEventListener('click', handleAddItem);
        btnAddBaia.addEventListener('click', handleAddBaia);
        btnDeleteBaia.addEventListener('click', handleDeleteBaia);

        // Carrega dados e status
        checkAdminStatus();
        loadInitialData();
    }

    init();
});