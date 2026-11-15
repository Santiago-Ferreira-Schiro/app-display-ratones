// #region crear servidor 
// Crear un servidor HTTP
var http = require("http");
var httpServer = http.createServer();

// Crear servidor WS
// Necesita tener instalado el módulo websocket:
// npm install websocket
var WebSocketServer = require("websocket").server; // instalar previamente: npm install websocket
var wsServer = new WebSocketServer({
	httpServer: httpServer
});

// Iniciar el servidor HTTP en un puerto
var puerto = 4444;
httpServer.listen(puerto, function () {
	console.log("Servidor de WebSocket iniciado en puerto:", puerto);
});
//#endregion
var usuariosConectados = []; // array de los clientes que se conectan
const { crearLooming } = require("./looming.js");
const looming = crearLooming(usuariosConectados);

// Esperar a clientes...
wsServer.on("request", function (request) { // este callback se ejecuta cuando llega una nueva conexión de un cliente
	//#region conectarse
	var connection = request.accept("conectarse", request.origin); // aceptar conexión
	var usuario = { // creo un nuevo usuario
		connection: connection,
		id: null,
		tipo: null
	};
    
	usuariosConectados.push(usuario); 
	console.log("Usuario conectado. Ahora son:", usuariosConectados.length);
	//#endregion

	//atendemos mensajes entrantes
	connection.on("message", function (message) { // mensaje recibido del cliente

		if (message.type === "utf8") { // es un mensaje de texto
			console.log("Mensaje recibido de usuario: " + message.utf8Data);
			var msg = JSON.parse(message.utf8Data); // pasar de cadena a objeto

			var tablet = usuariosConectados.find(u => u.tipo == "tablet");
			var telefono = usuariosConectados.find(u => u.tipo == "telefono");

			switch (msg.operacion) {

				case "identificarse":
					// busco otra entrada con el mismo id que no sea esta conexión
					const indiceViejo = usuariosConectados.findIndex(
						u => u.id == msg.id && u !== usuario
					);

					if (indiceViejo !== -1) {
						// mismo dispositivo reconectando: cierro la conexión vieja y la quito
						usuariosConectados[indiceViejo].connection.close();
						usuariosConectados.splice(indiceViejo, 1);
					}

					usuario.id = msg.id;
					usuario.tipo = msg.tipo;
					console.log("Usuario identificado:", usuario.id, "Ahora son:", usuariosConectados.length);
				break;

				
				default:
					looming.manejarMensaje(msg);
			}
		}
	});

	connection.on("close", function () {
		const i = usuariosConectados.indexOf(usuario);
		if (i !== -1) usuariosConectados.splice(i, 1);
		console.log("Usuario desconectado. Ahora son:", usuariosConectados.length);
	});
	
});



//#region funciones auxiliares
//#endregion



