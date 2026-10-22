// document.getElementById("x") procura na página o elemento com id="x"
// "const" cria uma variável que guarda esse elemento
const inputArquivo = document.getElementById("arquivo");
const areaUpload = document.getElementById("areaUpload");
const mensagem = document.getElementById("mensagem");
const listaRecentes = document.getElementById("listaRecentes");
const caixaPrevia = document.getElementById("caixaPrevia");
const infoPlanilha = document.getElementById("infoPlanilha");
const tabelaPrevia = document.getElementById("tabelaPrevia");


// --- Escolher pelo botão "Selecionar arquivo" ---
// "change" acontece quando o usuário escolhe um arquivo
inputArquivo.addEventListener("change", function () {
    const arquivo = inputArquivo.files[0];   // files[0] = o primeiro arquivo escolhido

    if (arquivo) {
        lerArquivo(arquivo);
    }

    inputArquivo.value = "";  // limpa, para poder escolher o mesmo arquivo de novo
});

// --- Clicar na área tracejada também abre a janela de arquivos ---
areaUpload.addEventListener("click", function () {
    inputArquivo.click();
});

// --- Arrastar e soltar ---
// Quando o arquivo está em cima da área
areaUpload.addEventListener("dragover", function (evento) {
    evento.preventDefault();               // sem isso o navegador não deixa soltar
    areaUpload.classList.add("arrastando");
});

// Quando o arquivo sai de cima da área
areaUpload.addEventListener("dragleave", function () {
    areaUpload.classList.remove("arrastando");
});

// Quando o usuário solta o arquivo
areaUpload.addEventListener("drop", function (evento) {
    evento.preventDefault();               // sem isso o navegador abriria o arquivo em outra aba
    areaUpload.classList.remove("arrastando");

    const arquivo = evento.dataTransfer.files[0];

    if (arquivo) {
        lerArquivo(arquivo);
    }
});
function lerArquivo(arquivo) {
    // Confere se é Excel
    const nome = arquivo.name.toLowerCase();

    if (!nome.endsWith(".xlsx") && !nome.endsWith(".xls")) {
        mostrarErro("Formato inválido. Envie um arquivo .xlsx ou .xls.");
        return;   // para a função aqui
    }

    // FileReader é o "leitor de arquivos" do navegador
    const leitor = new FileReader();

    // Esta função roda quando o arquivo terminar de ser lido
    leitor.onload = function (evento) {
        try {
            // 1. Transforma o conteúdo em bytes
            const bytes = new Uint8Array(evento.target.result);

            // 2. O SheetJS abre o arquivo Excel
            const planilha = XLSX.read(bytes, { type: "array" });

            // 3. Pega a primeira aba
            const nomeDaAba = planilha.SheetNames[0];
            const aba = planilha.Sheets[nomeDaAba];

            // 4. Converte a aba em uma lista de objetos, um por linha:
            //    [ {Produto: "Notebook", Qtd: 1}, {Produto: "Mouse", Qtd: 5} ]
            const linhas = XLSX.utils.sheet_to_json(aba, { defval: "" });

            if (linhas.length === 0) {
                mostrarErro("A planilha está vazia.");
                return;
            }

            // 5. Os nomes das colunas são as chaves do primeiro objeto
            const colunas = Object.keys(linhas[0]);

            // 6. Mostra, avisa e guarda
            mostrarPrevia(linhas, colunas, arquivo.name);
            mostrarSucesso("✔ " + arquivo.name + " carregada com sucesso.");
            salvarRecente(arquivo.name);
            guardarPlanilhaAtual(arquivo.name, colunas, linhas);

        } catch (erro) {
            mostrarErro("Não consegui ler esse arquivo. Ele pode estar corrompido.");
        }
    };


    // Manda o leitor começar. Quando terminar, chama o onload acima
    leitor.readAsArrayBuffer(arquivo);
}
function mostrarPrevia(linhas, colunas, nomeDoArquivo) {
    infoPlanilha.textContent =
        nomeDoArquivo + " — " + linhas.length + " linhas e " + colunas.length + " colunas (mostrando as 5 primeiras)";

    tabelaPrevia.innerHTML = "";   // limpa a tabela antes de montar outra

    // Linha do cabeçalho
    const linhaCabecalho = document.createElement("tr");

    colunas.forEach(function (coluna) {
        const th = document.createElement("th");
        th.textContent = coluna;
        linhaCabecalho.appendChild(th);
    });

    tabelaPrevia.appendChild(linhaCabecalho);

    // Só as 5 primeiras linhas de dados
    linhas.slice(0, 5).forEach(function (linha) {
        const tr = document.createElement("tr");

        colunas.forEach(function (coluna) {
            const td = document.createElement("td");
            td.textContent = linha[coluna];
            tr.appendChild(td);
        });

        tabelaPrevia.appendChild(tr);
    });

    caixaPrevia.hidden = false;   // mostra a caixa que estava escondida
}
// Gera "22/10/2026 • 14:30"
function agora() {
    const hoje = new Date();
    const dia = hoje.toLocaleDateString("pt-BR");
    const hora = hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return dia + " • " + hora;
}

// Lê a lista guardada no navegador (ou uma lista vazia, se não houver)
function carregarRecentes() {
    const texto = localStorage.getItem("recentes");

    if (texto) {
        return JSON.parse(texto);   // transforma o texto de volta em lista
    }

    return [];
}

// Adiciona uma planilha no começo da lista e guarda
function salvarRecente(nomeDoArquivo) {
    let recentes = carregarRecentes();

    // Se já existe uma com o mesmo nome, tira a antiga (evita repetir)
    recentes = recentes.filter(function (item) {
        return item.nome !== nomeDoArquivo;
    });

    // unshift coloca no começo
    recentes.unshift({ nome: nomeDoArquivo, data: agora() });

    // Guarda só as 4 mais recentes
    recentes = recentes.slice(0, 4);

    // localStorage só guarda texto, por isso JSON.stringify
    localStorage.setItem("recentes", JSON.stringify(recentes));

    mostrarRecentes();
}

// Desenha a lista na tela
function mostrarRecentes() {
    const recentes = carregarRecentes();

    listaRecentes.innerHTML = "";

    if (recentes.length === 0) {
        listaRecentes.innerHTML = '<p class="vazio">Nenhuma planilha enviada ainda.</p>';
        return;
    }

    recentes.forEach(function (item) {
        const div = document.createElement("div");
        div.className = "arquivo";
        div.innerHTML = '<span class="mini-excel">X</span><div><strong></strong><small></small></div>';

        div.querySelector("strong").textContent = item.nome;
        div.querySelector("small").textContent = "Última atualização: " + item.data;

        listaRecentes.appendChild(div);
    });
}


// Guarda os dados da planilha para as páginas Limpeza, Relatórios e Exportar usarem depois
function guardarPlanilhaAtual(nomeDoArquivo, colunas, linhas) {
    try {
        localStorage.setItem("planilhaAtual", JSON.stringify({
            nome: nomeDoArquivo,
            colunas: colunas,
            linhas: linhas
        }));
    } catch (erro) {
        // O localStorage tem limite (cerca de 5 MB). Se o arquivo for grande demais, cai aqui
        mostrarErro("Arquivo lido, mas é grande demais para ser guardado entre páginas.");
    }
}
function mostrarSucesso(texto) {
    mensagem.className = "sucesso";
    mensagem.textContent = texto;
}

function mostrarErro(texto) {
    mensagem.className = "erro";
    mensagem.textContent = texto;
}

// Ao abrir a página, desenha a lista de recentes que já estava guardada
mostrarRecentes();