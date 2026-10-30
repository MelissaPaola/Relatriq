// ==================================================
// 1. ELEMENTOS DA PÁGINA E VARIÁVEIS
// ==================================================
const btnNova = document.getElementById("btnNova");
const inputArquivo = document.getElementById("arquivo");
const areaUpload = document.getElementById("areaUpload");
const mensagem = document.getElementById("mensagem");
const corpoTabela = document.getElementById("corpoTabela");
const semPlanilhas = document.getElementById("semPlanilhas");
const detalhes = document.getElementById("detalhes");
const caixaPrevia = document.getElementById("caixaPrevia");
const infoPlanilha = document.getElementById("infoPlanilha");
const tabelaPrevia = document.getElementById("tabelaPrevia");

// Caminho do seu ícone (confira o nome do arquivo)
const ICONE_EXCEL = "assets/exel.png";

// Lista de planilhas (vem do navegador) e qual está selecionada
let planilhas = carregarLista();
let selecionada = null;


// ==================================================
// 2. GUARDAR E LER A LISTA (localStorage)
// ==================================================
function carregarLista() {
    const texto = localStorage.getItem("listaPlanilhas");

    if (texto) {
        return JSON.parse(texto);   // texto → lista
    }

    return [];
}

// Devolve true se deu certo, false se estourou o limite do navegador
function salvarLista() {
    try {
        localStorage.setItem("listaPlanilhas", JSON.stringify(planilhas));
        return true;
    } catch (erro) {
        return false;
    }
}


// ==================================================
// 3. FUNÇÕES AUXILIARES
// ==================================================

// 2500000 → "2,4 MB"   |   51200 → "50,0 KB"
function formatarTamanho(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1).replace(".", ",") + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

// "22/10/2026 14:23"
function agora() {
    const hoje = new Date();
    const dia = hoje.toLocaleDateString("pt-BR");
    const hora = hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return dia + " " + hora;
}

function mostrarSucesso(texto) {
    mensagem.className = "sucesso";
    mensagem.textContent = texto;
}

function mostrarErro(texto) {
    mensagem.className = "erro";
    mensagem.textContent = texto;
}

// Acha uma planilha da lista pelo nome
function acharPlanilha(nome) {
    return planilhas.find(function (item) {
        return item.nome === nome;
    });
}


// ==================================================
// 4. ENVIAR PLANILHA (botão, clique na área e arrastar)
// ==================================================

// Botão "Nova Planilha" e clique na área tracejada abrem o seletor
btnNova.addEventListener("click", function () {
    inputArquivo.click();
});

areaUpload.addEventListener("click", function () {
    inputArquivo.click();
});

// Quando o usuário escolhe o arquivo
inputArquivo.addEventListener("change", function () {
    const arquivo = inputArquivo.files[0];

    if (arquivo) {
        lerArquivo(arquivo);
    }

    inputArquivo.value = "";   // permite escolher o mesmo arquivo de novo
});

// Arquivo em cima da área
areaUpload.addEventListener("dragover", function (evento) {
    evento.preventDefault();               // sem isso o navegador não deixa soltar
    areaUpload.classList.add("arrastando");
});

// Arquivo saiu de cima da área
areaUpload.addEventListener("dragleave", function () {
    areaUpload.classList.remove("arrastando");
});

// Arquivo foi solto
areaUpload.addEventListener("drop", function (evento) {
    evento.preventDefault();               // sem isso o navegador abriria o arquivo
    areaUpload.classList.remove("arrastando");

    const arquivo = evento.dataTransfer.files[0];

    if (arquivo) {
        lerArquivo(arquivo);
    }
});

function lerArquivo(arquivo) {
    const nome = arquivo.name.toLowerCase();

    if (!nome.endsWith(".xlsx") && !nome.endsWith(".xls")) {
        mostrarErro("Formato inválido. Envie um arquivo .xlsx ou .xls.");
        return;
    }

    const leitor = new FileReader();

    leitor.onload = function (evento) {
        try {
            const bytes = new Uint8Array(evento.target.result);
            const livro = XLSX.read(bytes, { type: "array" });
            const aba = livro.Sheets[livro.SheetNames[0]];   // primeira aba
            const linhas = XLSX.utils.sheet_to_json(aba, { defval: "" });

            if (linhas.length === 0) {
                mostrarErro("A planilha está vazia.");
                return;
            }

            adicionarPlanilha(arquivo, Object.keys(linhas[0]), linhas);

        } catch (erro) {
            mostrarErro("Não consegui ler esse arquivo. Ele pode estar corrompido.");
        }
    };

    leitor.readAsArrayBuffer(arquivo);
}

function adicionarPlanilha(arquivo, colunas, linhas) {
    const listaAntiga = planilhas;

    // Se já existe uma com o mesmo nome, ela é substituída
    planilhas = planilhas.filter(function (item) {
        return item.nome !== arquivo.name;
    });

    // unshift coloca no começo da lista
    planilhas.unshift({
        nome: arquivo.name,
        tamanho: arquivo.size,
        data: agora(),
        ativo: true,
        colunas: colunas,
        linhas: linhas
    });

    // Se não coube no navegador, volta a lista como estava
    if (!salvarLista()) {
        planilhas = listaAntiga;
        mostrarErro("Arquivo grande demais para guardar no navegador (limite de cerca de 5 MB).");
        return;
    }

    mostrarSucesso("✔ " + arquivo.name + " carregada com sucesso.");
    selecionar(arquivo.name);
}


// ==================================================
// 5. SELECIONAR (a planilha que a página Limpeza vai usar)
// ==================================================
function selecionar(nome) {
    const item = acharPlanilha(nome);

    if (!item) {
        return;
    }

    selecionada = nome;

    // A página Limpeza lê "planilhaAtual", então copiamos para lá
    try {
        localStorage.setItem("planilhaAtual", JSON.stringify({
            nome: item.nome,
            colunas: item.colunas,
            linhas: item.linhas
        }));
    } catch (erro) {
        mostrarErro("Planilha lida, mas grande demais para usar nas outras páginas.");
    }

    desenharTudo();
}


// ==================================================
// 6. DESENHAR A LISTA DE PLANILHAS
// ==================================================
function desenharTabela() {
    corpoTabela.innerHTML = "";
    semPlanilhas.hidden = planilhas.length > 0;   // mostra o aviso se a lista está vazia

    planilhas.forEach(function (item) {
        const tr = document.createElement("tr");
        tr.className = "linha";

        if (item.nome === selecionada) {
            tr.classList.add("selecionada");
        }

        // Estrutura da linha (os textos entram depois com textContent, por segurança)
        tr.innerHTML =
            '<td class="celula-nome"><img src="' + ICONE_EXCEL + '" class="mini-excel" alt=""><span class="nome"></span></td>' +
            '<td class="tam"></td>' +
            '<td class="data"></td>' +
            '<td><button class="status" title="Clique para ativar ou desativar"></button></td>' +
            '<td>' +
                '<button class="acao baixar" title="Baixar">⬇</button>' +
                '<button class="acao editar" title="Renomear">✎</button>' +
                '<button class="acao excluir" title="Excluir">🗑</button>' +
            '</td>';

        tr.querySelector(".nome").textContent = item.nome;
        tr.querySelector(".tam").textContent = formatarTamanho(item.tamanho);
        tr.querySelector(".data").textContent = item.data;

        // Botão de status: "Ativo" (verde) ou "Inativo" (cinza)
        const botaoStatus = tr.querySelector(".status");
        botaoStatus.textContent = item.ativo ? "Ativo" : "Inativo";

        if (!item.ativo) {
            botaoStatus.classList.add("inativo");
        }

        // ----- Cliques -----
        // Clicar na linha seleciona a planilha
        tr.addEventListener("click", function () {
            selecionar(item.nome);
        });

        // stopPropagation() evita que o clique no botão também selecione a linha
        botaoStatus.addEventListener("click", function (evento) {
            evento.stopPropagation();
            alternarStatus(item.nome);
        });

        tr.querySelector(".baixar").addEventListener("click", function (evento) {
            evento.stopPropagation();
            baixarPlanilha(item.nome);
        });

        tr.querySelector(".editar").addEventListener("click", function (evento) {
            evento.stopPropagation();
            renomearPlanilha(item.nome);
        });

        tr.querySelector(".excluir").addEventListener("click", function (evento) {
            evento.stopPropagation();
            excluirPlanilha(item.nome);
        });

        corpoTabela.appendChild(tr);
    });
}


// ==================================================
// 7. AÇÕES DOS BOTÕES
// ==================================================
function alternarStatus(nome) {
    const item = acharPlanilha(nome);
    item.ativo = !item.ativo;     // vira o contrário: true ↔ false
    salvarLista();
    desenharTudo();
}

function baixarPlanilha(nome) {
    const item = acharPlanilha(nome);

    // Monta um arquivo Excel novo com os dados guardados
    const aba = XLSX.utils.json_to_sheet(item.linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, aba, "Planilha1");

    // Garante a extensão .xlsx no arquivo baixado
    XLSX.writeFile(livro, item.nome.replace(/\.xls$/i, ".xlsx"));
}

function renomearPlanilha(nome) {
    const item = acharPlanilha(nome);

    // prompt() abre uma caixinha pedindo um texto
    let novoNome = prompt("Novo nome da planilha:", item.nome);

    if (novoNome === null) {
        return;                    // o usuário clicou em Cancelar
    }

    novoNome = novoNome.trim();

    if (novoNome === "") {
        mostrarErro("O nome não pode ficar vazio.");
        return;
    }

    // Se faltou a extensão, coloca .xlsx
    if (!/\.xlsx?$/i.test(novoNome)) {
        novoNome = novoNome + ".xlsx";
    }

    if (novoNome !== nome && acharPlanilha(novoNome)) {
        mostrarErro("Já existe uma planilha com esse nome.");
        return;
    }

    item.nome = novoNome;
    salvarLista();

    // Se era a selecionada, atualiza também a cópia usada pelas outras páginas
    if (selecionada === nome) {
        selecionar(novoNome);
    } else {
        desenharTudo();
    }

    mostrarSucesso("✔ Planilha renomeada para " + novoNome + ".");
}

function excluirPlanilha(nome) {
    // confirm() abre uma caixinha com OK e Cancelar
    if (!confirm('Excluir a planilha "' + nome + '"?')) {
        return;
    }

    planilhas = planilhas.filter(function (item) {
        return item.nome !== nome;
    });

    salvarLista();

    // Se era a selecionada, limpa também a cópia das outras páginas
    if (selecionada === nome) {
        selecionada = null;
        localStorage.removeItem("planilhaAtual");
    }

    desenharTudo();
    mostrarSucesso("✔ Planilha excluída.");
}


// ==================================================
// 8. CARDS, DETALHES E PRÉVIA
// ==================================================
function desenharCards() {
    const ativas = planilhas.filter(function (item) {
        return item.ativo;
    }).length;

    document.getElementById("totalPlanilhas").textContent = planilhas.length;
    document.getElementById("totalAtivas").textContent = ativas;
    document.getElementById("totalInativas").textContent = planilhas.length - ativas;

    // Espaço usado = tamanho do texto guardado no navegador
    const usado = JSON.stringify(planilhas).length;
    document.getElementById("espacoUsado").textContent = formatarTamanho(usado);
}

function desenharDetalhes() {
    const item = selecionada ? acharPlanilha(selecionada) : null;

    // Sem planilha selecionada, esconde o painel e a prévia
    if (!item) {
        detalhes.hidden = true;
        caixaPrevia.hidden = true;
        return;
    }

    detalhes.hidden = false;
    document.getElementById("detNome").textContent = item.nome;
    document.getElementById("detTamanho").textContent = formatarTamanho(item.tamanho);
    document.getElementById("detStatus").textContent = item.ativo ? "Ativo" : "Inativo";
    document.getElementById("detData").textContent = item.data;
    document.getElementById("detLinhas").textContent = item.linhas.length;
    document.getElementById("detColunas").textContent = item.colunas.length;

    desenharPrevia(item);
}

function desenharPrevia(item) {
    infoPlanilha.textContent =
        item.nome + " — " + item.linhas.length + " linhas e " + item.colunas.length + " colunas (mostrando as 5 primeiras)";

    tabelaPrevia.innerHTML = "";

    const cabecalho = document.createElement("tr");

    item.colunas.forEach(function (coluna) {
        const th = document.createElement("th");
        th.textContent = coluna;
        cabecalho.appendChild(th);
    });

    tabelaPrevia.appendChild(cabecalho);

    item.linhas.slice(0, 5).forEach(function (linha) {
        const tr = document.createElement("tr");

        item.colunas.forEach(function (coluna) {
            const td = document.createElement("td");
            td.textContent = linha[coluna];
            tr.appendChild(td);
        });

        tabelaPrevia.appendChild(tr);
    });

    caixaPrevia.hidden = false;
}


// ==================================================
// 9. JUNTAR TUDO E INICIAR
// ==================================================
function desenharTudo() {
    desenharCards();
    desenharTabela();
    desenharDetalhes();
}

// Ao abrir a página: se a planilha atual ainda existe na lista, já vem selecionada
const atual = JSON.parse(localStorage.getItem("planilhaAtual") || "null");

if (atual && acharPlanilha(atual.nome)) {
    selecionada = atual.nome;
}

desenharTudo();