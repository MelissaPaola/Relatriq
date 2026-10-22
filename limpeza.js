// Pega do HTML os elementos que vamos usar
const aviso = document.getElementById("avisoSemPlanilha");
const conteudo = document.getElementById("conteudoLimpeza");
const mensagem = document.getElementById("mensagem");
const tituloPrevia = document.getElementById("tituloPrevia");
const infoPlanilha = document.getElementById("infoPlanilha");
const tabelaPrevia = document.getElementById("tabelaPrevia");

// Lê a planilha que a página Planilhas guardou
function lerPlanilhaAtual() {
    const texto = localStorage.getItem("planilhaAtual");

    if (texto) {
        return JSON.parse(texto);   // transforma o texto de volta em objeto
    }

    return null;                    // não tem planilha guardada
}

// dados.nome, dados.colunas e dados.linhas
const dados = lerPlanilhaAtual();

// Troca "  Notebook   " por "Notebook"
// Devolve quantas células foram corrigidas
function removerEspacos() {
    let corrigidas = 0;

    // Para cada linha...
    dados.linhas.forEach(function (linha) {

        // ...e para cada coluna dessa linha
        dados.colunas.forEach(function (coluna) {
            const valor = linha[coluna];

            // Só mexe se for texto (números não têm espaços)
            if (typeof valor === "string") {

                // trim() tira espaços do começo e do fim
                // replace(/\s+/g, " ") troca vários espaços seguidos por um só
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

    // Set é uma "caixa" que guarda valores sem repetir
    const jaVistas = new Set();

    dados.linhas = dados.linhas.filter(function (linha) {
        // Transforma a linha inteira em um texto para comparar
        const chave = JSON.stringify(linha);

        if (jaVistas.has(chave)) {
            return false;       // já vimos igual: descarta
        }

        jaVistas.add(chave);    // primeira vez: guarda e mantém
        return true;
    });

    return antes - dados.linhas.length;
}


// Tenta transformar um texto em número. Se não for número, devolve null
function textoParaNumero(texto) {
    // Tira o "R$" e os espaços das pontas
    const t = texto.replace("R$", "").trim();

    // Formato brasileiro com milhar: 1.234 ou 1.234,56
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
        return Number(t.replace(/\./g, "").replace(",", "."));
    }

    // Só com vírgula decimal: 12,5
    if (/^-?\d+,\d+$/.test(t)) {
        return Number(t.replace(",", "."));
    }

    // Número simples: 1500 ou 3.5
    if (/^-?\d+(\.\d+)?$/.test(t)) {
        return Number(t);
    }

    return null;   // não é número
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


// Chamada depois de cada ferramenta
function finalizar(quantidade, textoSucesso, textoNenhum) {

    // Se nada mudou, só avisa
    if (quantidade === 0) {
        mensagem.className = "vazio";
        mensagem.textContent = textoNenhum;
        return;
    }

    // Guarda a planilha já limpa, para as outras páginas
    localStorage.setItem("planilhaAtual", JSON.stringify(dados));

    mostrarPrevia();

    mensagem.className = "sucesso";
    mensagem.textContent = "✔ " + quantidade + textoSucesso;
}


function mostrarPrevia() {
    const total = dados.linhas.length;
    const mostradas = Math.min(40, total);   // o menor entre 40 e o total

    tituloPrevia.textContent = "Prévia (" + mostradas + " linhas)";
    infoPlanilha.textContent =
        dados.nome + " — " + total + " linhas e " + dados.colunas.length + " colunas";

    tabelaPrevia.innerHTML = "";   // limpa a tabela antes de montar de novo

    // Cabeçalho
    const cabecalho = document.createElement("tr");

    dados.colunas.forEach(function (coluna) {
        const th = document.createElement("th");
        th.textContent = coluna;
        cabecalho.appendChild(th);
    });

    tabelaPrevia.appendChild(cabecalho);

    // Linhas (slice(0, 40) pega só as 40 primeiras)
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

// Cada botão chama a sua ferramenta e passa o resultado para finalizar()
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

// ---------- Ao abrir a página ----------
if (dados === null) {
    aviso.hidden = false;       // mostra o aviso "nenhuma planilha"
} else {
    conteudo.hidden = false;    // mostra as ferramentas
    mostrarPrevia();
}