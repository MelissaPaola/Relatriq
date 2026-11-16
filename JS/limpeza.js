const aviso = document.getElementById("avisoSemPlanilha");
const conteudo = document.getElementById("conteudoLimpeza");
const mensagem = document.getElementById("mensagem");
const tituloPrevia = document.getElementById("tituloPrevia");
const infoPlanilha = document.getElementById("infoPlanilha");
const tabelaPrevia = document.getElementById("tabelaPrevia");

function lerPlanilhaAtual() {
    const texto = localStorage.getItem("planilhaAtual");

    if (texto) {
        return JSON.parse(texto); 
    }

    return null;                 
}

const dados = lerPlanilhaAtual();

function removerEspacos() {
    let corrigidas = 0;

    dados.linhas.forEach(function (linha) {
        dados.colunas.forEach(function (coluna) {
            const valor = linha[coluna];

            if (typeof valor === "string") {
                const limpo = valor.trim().replace(/\s+/g, " ");

                if (limpo !== valor) {
                    linha[coluna] = limpo;
                    corrigidas++;
                }
            }
        });
    });

    return corrigidas;
}

function removerDuplicadas() {
    const antes = dados.linhas.length;
    const jaVistas = new Set();

    dados.linhas = dados.linhas.filter(function (linha) {
        const chave = JSON.stringify(linha);

        if (jaVistas.has(chave)) {
            return false;   
        }

        jaVistas.add(chave);
        return true;
    });

    return antes - dados.linhas.length;
}

function textoParaNumero(texto) {
    const t = texto.replace("R$", "").trim();
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
        return Number(t.replace(/\./g, "").replace(",", "."));
    }

    if (/^-?\d+,\d+$/.test(t)) {
        return Number(t.replace(",", "."));
    }

    if (/^-?\d+(\.\d+)?$/.test(t)) {
        return Number(t);
    }

    return null; 
}

function converterTextosEmNumeros() {
    let convertidos = 0;

    dados.linhas.forEach(function (linha) {
        dados.colunas.forEach(function (coluna) {
            const valor = linha[coluna];

            if (typeof valor === "string") {
                const numero = textoParaNumero(valor);

                if (numero !== null) {
                    linha[coluna] = numero;
                    convertidos++;
                }
            }
        });
    });

    return convertidos;
}

function finalizar(quantidade, textoSucesso, textoNenhum) {

    if (quantidade === 0) {
        mensagem.className = "vazio";
        mensagem.textContent = textoNenhum;
        return;
    }

    localStorage.setItem("planilhaAtual", JSON.stringify(dados));

    mostrarPrevia();

    mensagem.className = "sucesso";
    mensagem.textContent = "✔ " + quantidade + textoSucesso;
}


function mostrarPrevia() {
    const total = dados.linhas.length;
    const mostradas = Math.min(40, total);  
    tituloPrevia.textContent = "Prévia (" + mostradas + " linhas)";
    infoPlanilha.textContent =
        dados.nome + " — " + total + " linhas e " + dados.colunas.length + " colunas";
    tabelaPrevia.innerHTML = "";  
    const cabecalho = document.createElement("tr");

    dados.colunas.forEach(function (coluna) {
        const th = document.createElement("th");
        th.textContent = coluna;
        cabecalho.appendChild(th);
    });

    tabelaPrevia.appendChild(cabecalho);

    dados.linhas.slice(0, 40).forEach(function (linha) {
        const tr = document.createElement("tr");

        dados.colunas.forEach(function (coluna) {
            const td = document.createElement("td");
            td.textContent = linha[coluna];
            tr.appendChild(td);
        });

        tabelaPrevia.appendChild(tr);
    });
}

document.getElementById("btnEspacos").addEventListener("click", function () {
    finalizar(removerEspacos(), " célula(s) corrigida(s).", "Nenhum espaço extra encontrado.");
});

document.getElementById("btnVazias").addEventListener("click", function () {
    finalizar(removerLinhasVazias(), " linha(s) vazia(s) removida(s).", "Nenhuma linha vazia encontrada.");
});

document.getElementById("btnDuplicadas").addEventListener("click", function () {
    finalizar(removerDuplicadas(), " linha(s) duplicada(s) removida(s).", "Nenhuma linha duplicada encontrada.");
});

document.getElementById("btnNumeros").addEventListener("click", function () {
    finalizar(converterTextosEmNumeros(), " valor(es) convertido(s) em número.", "Nenhum texto para converter.");
});

if (dados === null) {
    aviso.hidden = false;    
} else {
    conteudo.hidden = false;
    mostrarPrevia();
}