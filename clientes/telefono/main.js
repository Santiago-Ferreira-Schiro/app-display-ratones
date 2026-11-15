conectarseServidor(2, "telefono");

const estado = document.getElementById("estado");
const btnSiguiente = document.getElementById("btnSiguiente");

// botones de respuesta según la especie: [texto, valor que se guarda]
const RESPUESTAS = {
    rata:  [["Sin respuesta", "0"], ["Head bobbing", "hb"], ["Rearing", "re"], ["Freezing", "fr"]],
    raton: [["Sin respuesta", "0"], ["Rearing", "re"], ["Freezing", "fr"], ["Running", "run"]]
};

function pintarBotones() {
    const cont = document.getElementById("botonesRespuesta");
    cont.innerHTML = "";
    RESPUESTAS[document.getElementById("especie").value].forEach(function ([texto, valor]) {
        const b = document.createElement("button");
        b.textContent = texto;
        b.addEventListener("click", function () {
            enviar({ operacion: "respuesta", valor: valor });
        });
        cont.appendChild(b);
    });
}
document.getElementById("especie").addEventListener("change", pintarBotones);
pintarBotones();

// cuenta atrás que bloquea el botón "Siguiente"
let timer = null;
function cuentaAtras(ms) {
    const fin = Date.now() + ms;
    btnSiguiente.disabled = true;
    clearInterval(timer);
    timer = setInterval(function () {
        const falta = Math.ceil((fin - Date.now()) / 1000);
        if (falta <= 0) {
            clearInterval(timer);
            btnSiguiente.disabled = false;
            btnSiguiente.textContent = "Siguiente estímulo";
        } else {
            btnSiguiente.textContent = "Siguiente estímulo (" + falta + " s)";
        }
    }, 250);
}

document.getElementById("btnIniciar").addEventListener("click", function () {
    enviar({
        operacion: "iniciarSesion",
        animal:   document.getElementById("animal").value,
        especie:  document.getElementById("especie").value,
        sexo:     document.getElementById("sexo").value,
        edad:     document.getElementById("edad").value,
        genotipo: document.getElementById("genotipo").value,
        zt:       document.getElementById("zt").value
    });
});

btnSiguiente.addEventListener("click", function () {
    enviar({ operacion: "siguienteEstimulo" });
});

alRecibir("sesionIniciada",    (msg) => estado.textContent = "Sesión iniciada. Estímulos: " + msg.total);
alRecibir("disponibleEn",      (msg) => cuentaAtras(msg.ms));
alRecibir("estimuloIniciado",  ()    => estado.textContent = "Mostrando estímulo...");
alRecibir("estimuloTerminado", ()    => estado.textContent = "Estímulo terminado. Registra la respuesta.");
alRecibir("estimuloRechazado", ()    => estado.textContent = "La tablet estaba ocupada, repite el estímulo.");
alRecibir("quedan",            (msg) => estado.textContent = "Quedan " + msg.cantidad + " estímulos");
alRecibir("sesionFinalizada",  (msg) => estado.textContent = "Fin. Archivo: " + msg.archivo);
alRecibir("error",             (msg) => estado.textContent = "Error: " + msg.detalle);