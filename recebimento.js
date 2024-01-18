const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const amqp = require('amqplib');
const ping = require('ping');

const amqpServerUrl = 'amqp://W4nuCL2HK09PrG8H:7NXYX2gGYHGxCIBKoN3UtsLfRh@trends.injetoras.tcsapp.com.br:5672';
const amqpQueue = 'measurements';
const nomeUsuario = 'W4nuCL2HK09PrG8H';
const senha = '7NXYX2gGYHGxCIBKoN3UtsLfRh';

const FILTRO = 0.03;
const LIMIAR_TENSAO = 28000;
const LIMIAR_CORRENTE = 28000;

let tensaoAnterior = 0;
let correnteAnterior = 0;

const ID_TENSAO = 33;
const ID_CORRENTE = 32;

let isAMQPConnected = false;
let amqpChannelInfo = null;

const buffer = [];

const port = new SerialPort('/dev/ttyUSB0', { baudRate: 9600 }); // Ajuste para a porta serial correta
const parser = port.pipe(new Readline({ delimiter: '\n' }));

const setupAMQPConnection = async (serverUrl) => {
  try {
    const amqpConnection = await amqp.connect(serverUrl);
    let channel = await amqpConnection.createChannel();

    console.log('Conectado ao servidor AMQP');

    amqpConnection.on('error', (err) => {
      console.error('Erro na conexão AMQP:', err);
      isAMQPConnected = false;
      channel = null;
      processBuffer();
    });

    return { amqpConnection, channel };
  } catch (error) {
    console.error('Erro ao configurar a conexão AMQP:', error);
    isAMQPConnected = false;
    return null;
  }
};

const initAMQPConnection = async () => {
  while (!amqpChannelInfo) {
    amqpChannelInfo = await setupAMQPConnection(amqpServerUrl);
    if (!amqpChannelInfo) {
      console.log('Tentando reconectar ao servidor AMQP em 5 segundos...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  isAMQPConnected = true; // Defina como verdadeiro após a conexão inicial
};

initAMQPConnection();

const checkInternet = () => {
  return new Promise((resolve) => {
    const targetHost = 'www.google.com';
    ping.sys.probe(targetHost, (isAlive) => {
      resolve(isAlive);
    });
  });
};

const data = {
  tensaoAnterior: 0,
  correnteAnterior: 0,
};

const sendToAMQP = async (idVariavel, valor, dataHora) => {
  try {
    if (!amqpChannelInfo || !isAMQPConnected) {
      console.error('A conexão AMQP não está disponível. Armazenando mensagem no buffer.');
      buffer.push({ idVariavel, valor, dataHora });
      return;
    }

    let { amqpConnection, channel } = amqpChannelInfo;

    if (!channel) {
      console.log('Reconectando ao servidor AMQP...');
      amqpChannelInfo = await setupAMQPConnection(amqpServerUrl);
      if (!amqpChannelInfo) {
        console.error('Falha ao reconectar à conexão AMQP.');
        return;
      }

      ({ channel } = amqpChannelInfo);
    }

    const mensagem = {
      id_variavel: idVariavel,
      valor: parseFloat(valor.toFixed(2)),
      data_hora: parseFloat(dataHora.toFixed(3)),
    };

    channel.sendToQueue(amqpQueue, Buffer.from(JSON.stringify(mensagem)));
    //console.log('Mensagem enviada para a fila AMQP:', mensagem);
  } catch (error) {
    //console.error('Erro ao enviar mensagem para a fila AMQP:', error);
  }
};

const processBuffer = async () => {
  while (buffer.length > 0) {
    const { idVariavel, valor, dataHora } = buffer.shift();
    await sendToAMQP(idVariavel, valor, dataHora);
  }
};

// Adicione esta lógica na função startSerialPortRead
const startSerialPortRead = () => {
  parser.on('data', (data) => {
    // Processar os dados recebidos da porta serial
    // Exemplo: console.log('Dados recebidos:', data);
    
    // Divida os dados recebidos em variáveis de tensão e corrente
    const [prefix, value] = data.split(':');
    const numericValue = parseFloat(value);

    if (prefix === 'T') {
      // Dados de tensão recebidos
      tensaoAnterior = numericValue;
    } else if (prefix === 'C') {
      // Dados de corrente recebidos
      correnteAnterior = numericValue;
    } else {
      // Ignorar dados desconhecidos
      console.warn('Dados desconhecidos recebidos:', data);
    }
  });
};

const startMeasurementLoop = async () => {
  // Remova as partes relacionadas ao I2C

  // Inicie a leitura da porta serial
  startSerialPortRead();
};

// Função para criar um atraso
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
module.exports = { startMeasurementLoop, data };
