const express = require('express');
const router = express.Router();
const { enviarComando, handleModo } = require('../../controller/serial')
const Connection = require('../../Connection/index')

// Definindo uma rota simples
const rotas =
  router.post('/', (req, res) => {
    const { action } = req.body;
    console.log(action)
    enviarComando(action)
    res.status(200).json({ menssage: 'deu bom' })
  });


router.get('/listen', (req, res) => {
  Connection.query('select * from Register_umidade;',
    function (err, results, fields) {
      console.log(results); // results contains rows returned by server
      res.status(200).json({ results })
    }
  )
})



router.post('/edit', (req, res) => {
  const { umidadeIdeal, umidadeMin, umidadeMax, planta } = req.body;
  Connection.query(
    `UPDATE presets SET umidade_ideal = ${umidadeIdeal}, umidade_min = ${umidadeMin}, umidade_max = ${umidadeMax}, planta = '${planta}';`,
    function (err, results, fields) {
      if (err) {
        console.error('Erro ao atualizar configurações:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        console.log('Configurações atualizadas com sucesso');
        res.status(200).json({ message: 'Configurações atualizadas com sucesso' });
      }
    }
  );
});

router.get('/hora-register', (req, res) => {
  const dataAtual = new Date();
  // Obtenha apenas a hora em formato de string (HH:MM:SS)
  const horaAtualCompleta = dataAtual.toLocaleTimeString();
  // Extraia os dois primeiros dígitos da hora
  const horaAtual = horaAtualCompleta.slice(0, 2);

  Connection.query(`SELECT id, umidade FROM 24horas WHERE id >= ${horaAtual} OR id < ${horaAtual} ORDER BY CASE WHEN id >= ${horaAtual} THEN 1 ELSE 2 END, id;`,
    function (err, results, fields) {
      console.log(results); // results contains rows returned by server
      res.status(200).json({ results })
    }
  )
})


//SELECT id, umidade FROM 24horas WHERE id >= ? OR id < ? ORDER BY CASE WHEN id >= ? THEN 1 ELSE 2 END, id;


router.get('/ligar', (req, res) => {
  enviarComando('ligar\n')
  res.status(200).json({ status: "Enviado com sucesso" })
})
router.get('/desligar', (req, res) => {
  enviarComando('desligar\n')
  res.status(200).json({ status: "Enviado com sucesso" })
})

router.get('/reservatorio', async (req, res) => {
  try {
    Connection.query(`select * from reservatorio`,
      function (err, results, fields) {
        const data = results
        console.log(results); // results contains rows returned by server
        const porcentagemGasta = data[0].quantidade_gasta / data[0].capacidade_total * 100
        const porcentagemRestante = data[0].quantidade_disponivel / data[0].capacidade_total * 100
        res.status(200).json({ gasta: porcentagemGasta.toFixed(2), disponivel: porcentagemRestante.toFixed(2) })
      })
  } catch (error) {
    console.error('Erro ao buscar dados do reservatório:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do reservatório' });
  }
});

router.get('/presets', async (req, res) => {
  try {
    Connection.query(`select * from presets`,
      function (err, results, fields) {
        const data = results
        console.log(results); // results contains rows returned by server
        res.status(200).json({ data })
      })
  } catch (error) {
    console.error('Erro ao buscar dados do reservatório:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do reservatório' });
  }
});

router.post('/set-modo', (req, res) => {
  const { modo } = req.body;
  handleModo(modo, res);
});



// Exportando o objeto de roteador
module.exports = rotas;
