conectarseServidor(2, "telefono");

const estado = document.getElementById("estado");
const btnSiguiente = document.getElementById("btnSiguiente");



document.getElementById("btnCirculoMaximo").addEventListener("click", function () {
    enviar({
        operacion: "circuloMaximo",
        color: document.getElementById("gris").value
    });
});


