// objetos/circulo.js
// Estímulo visual "looming": un disco que se expande desde el centro de la pantalla.
// Portado de Loomin_test_with_contrast_variation.ipynb (turtle).
//
// Equivalencias con el notebook:
//   wn.bgcolor("#7f7f7f")            -> FONDO_GRIS en la pantalla de estímulos
//   max_diam / vel                   -> diamMax (px) / duracion (ms) de la expansión
//   disco.st() ... disco.ht()        -> mostrar / ocultar el disco
//   time.sleep(0.5) tras expandir    -> pausa (ms) con el disco ya grande
//   while rep < 3                    -> repeticiones

const FONDO_GRIS = "#7f7f7f";

const looming = (function () {

    // Pantalla completa gris que tapa el resto de la app mientras dura la sesión
    const pantalla = document.createElement("div");
    Object.assign(pantalla.style, {
        position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
        background: FONDO_GRIS, zIndex: "9999", display: "none",
        overflow: "hidden", pointerEvents: "none"
    });

    // El disco tiene siempre el tamaño máximo y se anima con scale (rápido, va por GPU)
    const disco = document.createElement("div");
    Object.assign(disco.style, {
        position: "absolute", top: "50%", left: "50%",
        borderRadius: "50%", background: "#000",
        display: "none", willChange: "transform"
    });

    pantalla.appendChild(disco);
    document.body.appendChild(pantalla);

    let cancelado = false;

    function esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Una expansión. Devuelve la duración real en ms.
    function expandir(color, diamMax, duracion) {
        return new Promise(resolve => {
            const escalaInicial = 2 / diamMax; // el notebook parte de 0.1 * 20px = 2px

            disco.style.background = color;
            disco.style.width = disco.style.height = diamMax + "px";
            disco.style.transform = `translate(-50%, -50%) scale(${escalaInicial})`;
            disco.style.display = "block";

            const inicio = performance.now();

            function frame(ahora) {
                const t = Math.min((ahora - inicio) / duracion, 1);
                const escala = escalaInicial + (1 - escalaInicial) * t; // crecimiento lineal
                disco.style.transform = `translate(-50%, -50%) scale(${escala})`;

                if (t < 1 && !cancelado) {
                    requestAnimationFrame(frame);
                } else {
                    resolve(Math.round(performance.now() - inicio));
                }
            }
            requestAnimationFrame(frame);
        });
    }

    return {
        prepararPantalla() {
            cancelado = false;
            disco.style.display = "none";
            pantalla.style.display = "block";
        },

        cerrarPantalla() {
            cancelado = true;
            disco.style.display = "none";
            pantalla.style.display = "none";
        },

        cancelar() {
            cancelado = true;
        },

        // Equivale a estimulo(color, diam_max, incremento) del notebook.
        // Devuelve los tiempos reales de cada expansión.
        async estimulo({ color, diamMax, duracion = 500, pausa = 500, intervalo = 500, repeticiones = 3 }) {
            cancelado = false;
            if (!diamMax) diamMax = Math.max(window.innerWidth, window.innerHeight);

            const tiempos = [];
            for (let rep = 0; rep < repeticiones && !cancelado; rep++) {
                tiempos.push(await expandir(color, diamMax, duracion));
                await esperar(pausa);
                disco.style.display = "none";
                if (rep < repeticiones - 1 && !cancelado) await esperar(intervalo);
            }
        return tiempos;
}
    };
})();
