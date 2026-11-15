// cliente_ws/main.js
// Cliente WebSocket compartido. No contiene lógica de ninguna app:
// cada app registra lo que necesita con alRecibir("operacion", funcion).

var SERVIDOR_WS = "ws://192.168.1.185:4444"; // la misma IP que usa el rpc, no localhost

var conexion = null;
var manejadores = {};

// Registra qué hacer cuando llega un mensaje con esa operación
function alRecibir(operacion, funcion) {
    manejadores[operacion] = funcion;
}

// Envía un objeto al servidor (si la conexión está abierta)
function enviar(datos) {
    if (conexion && conexion.readyState === WebSocket.OPEN) {
        conexion.send(JSON.stringify(datos));
        return true;
    }
    console.warn("No conectado, no se envió:", datos);
    return false;
}

function conectarseServidor(id, tipoUsuario) {

    conexion = new WebSocket(SERVIDOR_WS, "conectarse");

    conexion.addEventListener("open", function () {
        alert("Ya estoy conectado con el servidor");
        console.log("Ya estoy conectado con el servidor");
        enviar({ operacion: "identificarse", id: id, tipo: tipoUsuario });
    });

    conexion.addEventListener("message", function (e) {
        var msg;
        try {
            msg = JSON.parse(e.data);
        } catch (err) {
            console.warn("Mensaje no válido:", e.data);
            return;
        }

        var manejador = manejadores[msg.operacion];
        if (manejador) {
            manejador(msg);
        } else {
            console.log("Mensaje sin manejador:", msg);
        }
    });

    conexion.addEventListener("error", function (e) {
        console.error("Error WS", e);
    });

    // reconexión automática
    conexion.addEventListener("close", function () {
        console.log("Conexión cerrada, reintentando en 2 s...");
        setTimeout(function () { conectarseServidor(id, tipoUsuario); }, 2000);
    });
}
