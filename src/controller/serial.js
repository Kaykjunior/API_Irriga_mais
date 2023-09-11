const SerialPort = require('serialport').SerialPort;
const { DelimiterParser } = require('@serialport/parser-delimiter');
const Connection = require('../Connection');
const socketIo = require('socket.io');
const cors = require('cors'); // Importe a biblioteca cors




const port = new SerialPort({
    path: 'COM7',
    baudRate: 9600
});
let finallRegister = 0;

const HandleRegister = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });


    const parser = port.pipe(new DelimiterParser({ delimiter: '\n' }));

    parser.on('data', async function (data) {
        var enc = new TextDecoder();
        var arr = new Uint8Array(data);
        var ready = enc.decode(arr);
        var umidadeValue = parseInt(ready.match(/\d+/)[0]);
        var umidadePercent = 100 - ((umidadeValue - 429) / (1024 - 429)) * 100;
        umidadePercent = Math.max(0, Math.min(100, umidadePercent));
        umidadePercent = Math.round(umidadePercent);

        // Buscar os dados de umidade ideais, mínimos e máximos do banco de dados
        const query = "SELECT umidade_ideal, umidade_min, umidade_max, planta FROM presets WHERE id_preset = 1";
        Connection.query(query, async function (error, results) {
            if (error) {
                console.error('Erro ao buscar dados de umidade:', error);
                return;
            }
            const umidadeIdeal = results[0].umidade_ideal;
            const umidadeMin = results[0].umidade_min;
            const umidadeMax = results[0].umidade_max;
            // ... (restante do código)

        });

        io.emit('umidade', umidadePercent);

        console.log(`umidade: ${umidadePercent}%  umidade alta`);

        const dataAtual = new Date();
        // Obtenha apenas a hora em formato de string (HH:MM:SS)
        const horaAtualCompleta = dataAtual.toLocaleTimeString();
        // Extraia os dois primeiros dígitos da hora
        const horaAtual = horaAtualCompleta.slice(0, 2);
        if (horaAtual != finallRegister) {
            try {
                const queryFinallRegister = "UPDATE 24horas SET umidade=? where id=?;"
                const queryData = [umidadePercent, horaAtual];
                Connection.execute(queryFinallRegister, queryData)
                console.log(horaAtual); // Isso imprimirá os dois primeiros dígitos da hora
                finallRegister = horaAtual;
            } catch (error) {
                console.log(error)
            }
        } else {
            console.log('tá na hora já')
        }

    });
    // ... (restante do código)

};

const enviarComando = (comando) => {
    port.write(comando, (err) => {
        if (err) {
            console.error('Erro ao enviar comando:', err);
        } else {
            console.log(`Comando "${comando}" enviado com sucesso`);
        }
    });

};
module.exports = {
    HandleRegister,
    enviarComando
};
