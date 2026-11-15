// servidor/looming.js
const fs = require("fs");

// ---------- Parámetros del protocolo (Calanni et al., 2024) ----------
const ACLIMATACION_MS    = 5 * 60 * 1000;  // 5 min en la arena antes del primer estímulo
const ENTRE_ESTIMULOS_MS = 30 * 1000;      // ≥ 30 s entre estímulos
// Para probar rápido, bajalos temporalmente (por ejemplo 5000 y 3000).

const LISTAS = {
    MiceArena:     ["#494949", "#4b4b4b", "#5a5a5a", "#606060", "#646464", "#696969"],
    Arena_Marqui:  ["#494949", "#575757", "#606060", "#666666", "#6c6c6c", "#727272"],
    RatsArena:     ["#5a5a5a", "#606060", "#646464", "#696969", "#6e6e6e"],
    Testing:       ["#494949", "#5a5a5a", "#606060", "#696969", "#6e6e6e", "#727272"]
};

// Ratas: 5 contrastes × 3 = 15. Ratones: 6 contrastes × 4 = 24.
const ESPECIES = {
    rata:  { lista: "RatsArena", repeticiones: 3 },
    raton: { lista: "MiceArena", repeticiones: 4 }   // o "Arena_Marqui"
};

// ---------- Calibración: completala con las mediciones del fotómetro ----------
const CALIBRACION = {
    Ib: null,   // irradiancia del fondo solo (#7f7f7f)
    Id: {       // irradiancia de cada gris con el disco a pantalla completa
        // "#494949": 0.00,
        // "#4b4b4b": 0.00,
    }
};

function michelson(color) {
    const Id = CALIBRACION.Id[color], Ib = CALIBRACION.Ib;
    if (Id == null || Ib == null) return "";
    // el disco es más oscuro que el fondo: se usa el valor absoluto para que el MI sea positivo
    return (Math.abs(Id - Ib) * 100 / (Id + Ib)).toFixed(2);
}

function limpiar(x) {   // evita que una coma o un salto de línea rompa el CSV
    return String(x == null ? "" : x).replace(/[,\r\n]/g, " ");
}

function crearLooming(usuariosConectados) {

    let sesion = null;

    function enviarA(tipo, datos) {
        const u = usuariosConectados.find(u => u.tipo === tipo);
        if (!u) {
            console.log("No hay ningún", tipo, "conectado");
            return false;
        }
        u.connection.sendUTF(JSON.stringify(datos));
        return true;
    }

    function segundosDesdeInicio() {
        return Math.round((Date.now() - sesion.inicio) / 10) / 100;
    }

    function iniciarSesion(msg) {
        const especie = ESPECIES[msg.especie];
        const nombreLista = msg.colores || (especie && especie.lista);
        const lista = Array.isArray(nombreLista) ? nombreLista : LISTAS[nombreLista];
        if (!lista) {
            enviarA("telefono", { operacion: "error", detalle: "Lista de colores desconocida" });
            return;
        }

        const animal = String(msg.animal || "sin_id").replace(/[^\w-]/g, "_");
        const repeticiones = msg.repeticiones || (especie ? especie.repeticiones : 3);

        let pendientes = [];
        for (let i = 0; i < repeticiones; i++) pendientes = pendientes.concat(lista);

        // datos del animal, que se repiten en cada fila del CSV
        const meta = [animal, msg.especie, msg.sexo, msg.edad, msg.genotipo, msg.zt].map(limpiar);

        const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const archivo = animal + "_" + fecha + ".csv";   // la fecha evita sobrescribir sesiones previas
        fs.writeFileSync(archivo,
            "animal,especie,sexo,edad,genotipo,zt,estimulo,color,mi,tiempo_s,respuesta,positiva,tiempos_ms\n");

        sesion = {
            archivo, pendientes, meta,
            inicio: Date.now(),
            actual: null,
            diamMax: msg.diamMax || null,
            contador: 0,
            disponibleDesde: Date.now() + ACLIMATACION_MS   // aclimatación de 5 min
        };

        enviarA("tablet", { operacion: "prepararPantalla" });
        enviarA("telefono", { operacion: "sesionIniciada", total: pendientes.length });
        enviarA("telefono", { operacion: "disponibleEn", ms: ACLIMATACION_MS });
    }

    function siguienteEstimulo() {
        if (!sesion) return;
        if (sesion.actual) {
            enviarA("telefono", { operacion: "error", detalle: "Falta registrar la respuesta anterior" });
            return;
        }
        if (sesion.pendientes.length === 0) return finalizar();

        const falta = sesion.disponibleDesde - Date.now();
        if (falta > 0) {
            enviarA("telefono", { operacion: "error", detalle: "Espera " + Math.ceil(falta / 1000) + " s" });
            return;
        }

        const i = Math.floor(Math.random() * sesion.pendientes.length);
        const color = sesion.pendientes.splice(i, 1)[0];

        sesion.contador++;
        sesion.actual = {
            idEstimulo: sesion.contador,
            color: color,
            tiempo: segundosDesdeInicio(),   // se corrige al recibir estimuloIniciado
            tiemposMs: []
        };

        enviarA("tablet", {
            operacion: "estimulo",
            idEstimulo: sesion.actual.idEstimulo,
            color: color,
            diamMax: sesion.diamMax,
            duracion: 500,
            pausa: 500,
            intervalo: 500,
            repeticiones: 3
        });
    }

    function respuesta(msg) {
        if (!sesion || !sesion.actual) return;

        const { idEstimulo, color, tiempo, tiemposMs } = sesion.actual;
        const valor = limpiar(msg.valor);
        const positiva = (valor !== "" && valor !== "0") ? 1 : 0;   // cualquier respuesta cuenta como positiva

        const fila = [...sesion.meta, idEstimulo, color, michelson(color), tiempo,
                      valor, positiva, tiemposMs.join("|")];
        fs.appendFileSync(sesion.archivo, fila.join(",") + "\n");
        sesion.actual = null;

        enviarA("telefono", { operacion: "quedan", cantidad: sesion.pendientes.length });
        if (sesion.pendientes.length === 0) finalizar();
    }

    function finalizar() {
        enviarA("tablet", { operacion: "finalizarPantalla" });
        enviarA("telefono", { operacion: "sesionFinalizada", archivo: sesion.archivo });
        console.log("Fin de sesión. Archivo creado:", sesion.archivo);
        sesion = null;
    }

    function manejarMensaje(msg) {
        switch (msg.operacion) {
            case "iniciarSesion":      iniciarSesion(msg); return true;
            case "siguienteEstimulo":  siguienteEstimulo(); return true;
            case "respuesta":          respuesta(msg); return true;

            case "estimuloIniciado":
                if (sesion && sesion.actual) sesion.actual.tiempo = segundosDesdeInicio();   // inicio real
                enviarA("telefono", msg);
                return true;

            case "estimuloTerminado":
                if (sesion && sesion.actual) {
                    sesion.actual.tiemposMs = msg.tiemposMs || [];
                    sesion.disponibleDesde = Date.now() + ENTRE_ESTIMULOS_MS;   // empieza la espera de 30 s
                    enviarA("telefono", { operacion: "disponibleEn", ms: ENTRE_ESTIMULOS_MS });
                }
                enviarA("telefono", msg);
                return true;

            case "estimuloRechazado":
                if (sesion && sesion.actual) {
                    sesion.pendientes.push(sesion.actual.color);
                    sesion.actual = null;
                }
                enviarA("telefono", msg);
                return true;
        }
        return false;
    }

    return { manejarMensaje };
}

module.exports = { crearLooming };