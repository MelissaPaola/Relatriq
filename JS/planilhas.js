
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

const ICONE_EXCEL = "assets/exel.png";

let planilhas = carregarLista();
let selecionada = null;

function carregarLista() {
    const texto = localStorage.getItem("listaPlanilhas");

    if (texto) {
        return JSON.parse(texto); 
    }

    return [];
}

function salvarLista() {
    try {
        localStorage.setItem("listaPlanilhas", JSON.stringify(planilhas));
        return true;
    } catch (erro) {
        return false;
    }
}



function formatarTamanho(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1).replace(".", ",") + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

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


btnNova.addEventListener("click", function () {
    inputArquivo.click();
});

areaUpload.addEventListener("click", function () {
    inputArquivo.click();
});

inputArquivo.addEventListener("change", function () {
    const arquivo = inputArquivo.files[0];

    if (arquivo) {
        lerArquivo(arquivo);
    }

    inputArquivo.value = ""; 
});

areaUpload.addEventListener("dragover", function (evento) {
    evento.preventDefault();       
    areaUpload.classList.add("arrastando");
});

areaUpload.addEventListener("dragleave", function () {
    areaUpload.classList.remove("arrastando");
});

areaUpload.addEventListener("drop", function (evento) {
    evento.preventDefault();   
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
            const aba = livro.Sheets[livro.SheetNames[0]];
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

    planilhas = planilhas.filter(function (item) {
        return item.nome !== arquivo.name;
    });

    planilhas.unshift({
        nome: arquivo.name,
        tamanho: arquivo.size,
        data: agora(),
        ativo: true,
        colunas: colunas,
        linhas: linhas
    });

    if (!salvarLista()) {
        planilhas = listaAntiga;
        mostrarErro("Arquivo grande demais para guardar no navegador (limite de cerca de 5 MB).");
        return;
    }

    mostrarSucesso("✔ " + arquivo.name + " carregada com sucesso.");
    selecionar(arquivo.name);
}

function selecionar(nome) {
    const item = acharPlanilha(nome);

    if (!item) {
        return;
    }

    selecionada = nome;

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

function desenharTabela() {
    corpoTabela.innerHTML = "";
    semPlanilhas.hidden = planilhas.length > 0;

    planilhas.forEach(function (item) {
        const tr = document.createElement("tr");
        tr.className = "linha";

        if (item.nome === selecionada) {
            tr.classList.add("selecionada");
        }

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
        const botaoStatus = tr.querySelector(".status");
        botaoStatus.textContent = item.ativo ? "Ativo" : "Inativo";

        if (!item.ativo) {
            botaoStatus.classList.add("inativo");
        }

        tr.addEventListener("click", function () {
            selecionar(item.nome);
        });

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

function alternarStatus(nome) {
    const item = acharPlanilha(nome);
    item.ativo = !item.ativo; 
    salvarLista();
    desenharTudo();
}

function baixarPlanilha(nome) {
    const item = acharPlanilha(nome);
    const aba = XLSX.utils.json_to_sheet(item.linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, aba, "Planilha1");
    XLSX.writeFile(livro, item.nome.replace(/\.xls$/i, ".xlsx"));
}

function renomearPlanilha(nome) {
    const item = acharPlanilha(nome);
    let novoNome = prompt("Novo nome da planilha:", item.nome);

    if (novoNome === null) {
        return;              
    }

    novoNome = novoNome.trim();

    if (novoNome === "") {
        mostrarErro("O nome não pode ficar vazio.");
        return;
    }

    if (!/\.xlsx?$/i.test(novoNome)) {
        novoNome = novoNome + ".xlsx";
    }

    if (novoNome !== nome && acharPlanilha(novoNome)) {
        mostrarErro("Já existe uma planilha com esse nome.");
        return;
    }

    item.nome = novoNome;
    salvarLista();

    if (selecionada === nome) {
        selecionar(novoNome);
    } else {
        desenharTudo();
    }

    mostrarSucesso("✔ Planilha renomeada para " + novoNome + ".");
}

function excluirPlanilha(nome) {

    if (!confirm('Excluir a planilha "' + nome + '"?')) {
        return;
    }

    planilhas = planilhas.filter(function (item) {
        return item.nome !== nome;
    });

    salvarLista();

    if (selecionada === nome) {
        selecionada = null;
        localStorage.removeItem("planilhaAtual");
    }

    desenharTudo();
    mostrarSucesso("✔ Planilha excluída.");
}

function desenharCards() {
    const ativas = planilhas.filter(function (item) {
        return item.ativo;
    }).length;

    document.getElementById("totalPlanilhas").textContent = planilhas.length;
    document.getElementById("totalAtivas").textContent = ativas;
    document.getElementById("totalInativas").textContent = planilhas.length - ativas;
    const usado = JSON.stringify(planilhas).length;
    document.getElementById("espacoUsado").textContent = formatarTamanho(usado);
}

function desenharDetalhes() {
    const item = selecionada ? acharPlanilha(selecionada) : null;
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

function desenharTudo() {
    desenharCards();
    desenharTabela();
    desenharDetalhes();
}

const atual = JSON.parse(localStorage.getItem("planilhaAtual") || "null");

if (atual && acharPlanilha(atual.nome)) {
    selecionada = atual.nome;
}

desenharTudo();