(function () {
    const CHAVE = "relatriq-tema";
    const html = document.documentElement;

    function lerTema() {
        try {
            return localStorage.getItem(CHAVE);
        } catch (erro) {
            return null;
        }
    }

    function guardarTema(valor) {
        try {
            localStorage.setItem(CHAVE, valor);
        } catch (erro) {
        }
    }

    function aplicarTema(escuro) {
        html.classList.toggle("escuro", escuro);
    }

    const guardado = lerTema();
    const sistemaEscuro =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    aplicarTema(guardado ? guardado === "escuro" : sistemaEscuro);

    document.addEventListener("DOMContentLoaded", function () {
        const caixa = document.getElementById("tema");

        if (!caixa) {
            return;
        }

        caixa.checked = html.classList.contains("escuro");

        caixa.addEventListener("change", function () {
            aplicarTema(caixa.checked);
            guardarTema(caixa.checked ? "escuro" : "claro");
        });
    });

    window.addEventListener("storage", function (evento) {
        if (evento.key === CHAVE) {
            aplicarTema(evento.newValue === "escuro");

            const caixa = document.getElementById("tema");
            if (caixa) {
                caixa.checked = evento.newValue === "escuro";
            }
        }
    });
})();