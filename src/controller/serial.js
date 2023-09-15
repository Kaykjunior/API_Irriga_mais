const SerialPort = require('serialport').SerialPort;
const { DelimiterParser } = require('@serialport/parser-delimiter');
const Connection = require('../Connection');
const socketIo = require('socket.io');
const cors = require('cors'); // Importe a biblioteca cors
let tempoInicio = null;
let tempoFim = null;
let statusIrrigacao = 'DESLIGADA'
const taxaBomba = 170; // Taxa de bombeamento em litros por hora
let quantidadeAguaGasta = 0; // Inicializa a quantidade de água gasta em litros
let umidadeIdeal
let umidadeMin
let umidadeMax
let modoIrriga;

const SetAferi = (data) => {
    const insertUmidade = 'INSERT INTO Register_umidade (number_resisten) VALUES (?)';
    const insertValues = [data];
    Connection.execute(insertUmidade, insertValues);
}
Connection.query(`select * from modo`, function (err, results, fields) {
    if (err) {
        // Trate qualquer erro de consulta aqui, se necessário
        console.error(err);
        return;
    }

    // Supondo que o resultado é um array com um único objeto
    if (results.length > 0) {
        const modo = results[0].modo;

        // Verifique o valor do modo e atribua ao estado modoIrrigacao
        if (modo === 'automatico' || modo === 'manual') {
            modoIrriga = modo;
            modoIrriga = modo;
        } else {
            // Lida com valores inesperados, se necessário
            console.error('Valor de modo inesperado:', modo);
        }
    } else {
        // Lida com a situação em que não há resultados, se necessário
        console.error('Nenhum resultado encontrado na consulta.');
    }
});




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



        var match = ready.match(/\d+/);
        if (match !== null) {
            var umidadeValue = parseInt(match[0]);
            // Resto do seu código

            var umidadeValue = parseInt(ready.match(/\d+/)[0]);
            var umidadePercent = 100 - ((umidadeValue - 429) / (1024 - 429)) * 100;
            umidadePercent = Math.max(0, Math.min(100, umidadePercent));
            umidadePercent = Math.round(umidadePercent);
            SetAferi(umidadePercent);   
            // Buscar os dados de umidade ideais, mínimos e máximos do banco de dados
            const query = "SELECT umidade_ideal, umidade_min, umidade_max, planta FROM presets WHERE id_preset = 1";
            Connection.query(query, async function (error, results) {
                if (error) {
                    console.error('Erro ao buscar dados de umidade:', error);
                    return;
                }
                umidadeIdeal = results[0].umidade_ideal;
                umidadeMin = results[0].umidade_min;
                umidadeMax = results[0].umidade_max;
                // ... (restante do código)

            });
        } else {
            console.log('Nenhum dígito encontrado em "ready".');
        }

        io.emit('umidade', umidadePercent);
        io.emit('statusIrrigacao', statusIrrigacao);
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


        if (modoIrriga === 'automatico') {
            console.log(modoIrriga)
            if (umidadePercent < umidadeIdeal) {
                if (statusIrrigacao === 'DESLIGADA') {
                    enviarComando('ligar\n'); // Ligue a irrigação
                }
            } else if (umidadePercent >= umidadeIdeal) {
                if (statusIrrigacao === 'LIGADA') {
                    enviarComando('desligar\n'); // Desligue a irrigação
                }
            }
        }



    });
    // ... (restante do código)


};


const enviarComando = (comando) => {
    if (comando === 'ligar\n') {
        port.write(comando, (err) => {
            if (err) {
                console.error('Erro ao enviar comando:', err);
            } else {
                console.log(`Comando "${comando}" enviado com sucesso`);
                statusIrrigacao = "LIGADA"
            }
        });

        if (tempoInicio === null) {
            tempoInicio = new Date();
            console.log('Bomba ligada. Hora de início:', tempoInicio);
        } else {
            console.log('A bomba já estava ligada.');
        }
    } else if (comando === 'desligar\n') {
        port.write(comando, (err) => {
            if (err) {
                console.error('Erro ao enviar comando:', err);
            } else {
                console.log(`Comando "${comando}" enviado com sucesso`);
                statusIrrigacao = "DESLIGADA"
            }
        });

        if (tempoInicio !== null) {
            tempoFim = new Date();
            console.log('Bomba desligada. Hora de término:', tempoFim);
            // Calcula o tempo decorrido em horas
            const tempoDecorrido = (tempoFim - tempoInicio) / 3600000; // Tempo decorrido em horas
            // Calcula a quantidade de água gasta em litros
            const quantidadeAguaUsada = tempoDecorrido * taxaBomba;
            quantidadeAguaGasta += quantidadeAguaUsada;
            console.log('Quantidade de água gasta:', quantidadeAguaUsada.toFixed(2), 'litros');
            const update = "UPDATE reservatorio SET quantidade_gasta = quantidade_gasta + ?, quantidade_disponivel = quantidade_disponivel - ? WHERE id = 1 && quantidade_disponivel >= ?;"
            const updateData = [quantidadeAguaGasta.toFixed(2), quantidadeAguaGasta.toFixed(2), quantidadeAguaGasta.toFixed(2)]
            Connection.execute(update, updateData)
            // Limpa o tempo de início para permitir uma nova medição
            tempoInicio = null;
        } else {
            console.log('A bomba já estava desligada.');
        }
    } else {
        console.log('Comando desconhecido');
    }
};

const handleModo = (comando, res) => {
    try {
        Connection.query(
            `UPDATE modo SET modo = '${comando}';`,
            function (err, results, fields) {
                if (err) {
                    console.error('Erro ao atualizar configurações:', err);
                } else {
                    modoIrriga = comando
                    console.log('Configurações atualizadas com sucesso');
                    res.status(200).json({ error: 'Mudado com sucesso' });
                }
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};


module.exports = {
    HandleRegister,
    enviarComando,
    handleModo
};
