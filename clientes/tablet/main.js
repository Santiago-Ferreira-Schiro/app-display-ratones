// main.js de la tablet

// nos conectamos al servidor ws, la tablet tiene id = 1
conectarseServidor(1, "tablet");

let estimuloEnCurso = false;

// El servidor pide mostrar la pantalla gris de estímulos
alRecibir("prepararPantalla", function () {
    looming.prepararPantalla();
});

// El servidor pide cerrarla y volver a la app
alRecibir("finalizarPantalla", function () {
    looming.cancelar();
    looming.cerrarPantalla();
    estimuloEnCurso = false;
});

// El servidor pide lanzar un estímulo: { idEstimulo, color, diamMax, duracion, pausa, repeticiones }
alRecibir("estimulo", async function (msg) {
    if (estimuloEnCurso) {
        enviar({ operacion: "estimuloRechazado", idEstimulo: msg.idEstimulo });
        return;
    }
    estimuloEnCurso = true;

    // por si la tablet se recargó o reconectó a mitad de sesión y la pantalla gris no estaba puesta
    looming.prepararPantalla();

    enviar({ operacion: "estimuloIniciado", idEstimulo: msg.idEstimulo });

    const tiempos = await looming.estimulo(msg);

    estimuloEnCurso = false;
    enviar({
        operacion: "estimuloTerminado",
        idEstimulo: msg.idEstimulo,
        color: msg.color,
        tiemposMs: tiempos
    });
});
