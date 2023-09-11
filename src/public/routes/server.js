const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rotas = require('./router');
const {HandleRegister} = require('../../controller/serial')
const app = express();
const port = 3000;
const UpServer = () =>{
    
const server = http.createServer(app); // Criar o servidor HTTP a partir do Express

app.use(express.json());
app.use(cors());
app.use(rotas);

// Configurar o WebSocket para enviar dados de umidade
HandleRegister(server);

server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

}

module.exports = UpServer;