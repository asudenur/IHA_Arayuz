const dgram = require('dgram');
const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const cors = require('cors');

// Komutlar için API sunucusu
const commandApp = express();
commandApp.use(cors());
commandApp.use(express.json());

const COMMAND_API_PORT = 4000;
const PYTHON_COMMAND_HOST = '127.0.0.1';
const PYTHON_COMMAND_PORT = 14553;
const commandSocket = dgram.createSocket('udp4');

commandApp.post('/api/command', (req, res) => {
    const command = req.body;
    if (!command || !command.command) {
        return res.status(400).json({ message: 'Geçersiz komut formatı' });
    }

    console.log(`[${new Date().toLocaleString()}] API'den komut alındı:`, command);
    const message = Buffer.from(JSON.stringify(command));

    commandSocket.send(message, PYTHON_COMMAND_PORT, PYTHON_COMMAND_HOST, (err) => {
        if (err) {
            console.error(`[${new Date().toLocaleString()}] Python'a komut gönderme hatası:`, err);
            return res.status(500).json({ message: 'Komut araca gönderilemedi' });
        }
        console.log(`[${new Date().toLocaleString()}] Komut başarıyla Python'a gönderildi:`, command);
        res.status(200).json({ message: 'Komut gönderildi' });
    });
});

commandApp.listen(COMMAND_API_PORT, () => {
    console.log(`[${new Date().toLocaleString()}] Komut API sunucusu ${COMMAND_API_PORT} portunda başlatıldı.`);
});

// UDP socket oluştur
const socket = dgram.createSocket('udp4');

// Socket olaylarını dinle
socket.on('listening', () => {
  const address = socket.address();
  console.log(`[${new Date().toLocaleString()}] UDP dinleyici başlatıldı: ${address.address}:${address.port}`);

  // Python bridge'i başlat
  const pythonBridge = spawn('python3', ['mavlink_bridge.py'], {
    cwd: __dirname
  });

  pythonBridge.stdout.on('data', (data) => {
    // Sadece logla, Firestore'a yazma yok
    console.log(data.toString());
  });

  pythonBridge.stderr.on('data', (data) => {
    console.error('Python hatası:', data.toString());
  });

  pythonBridge.on('close', (code) => {
    console.log(`Python bridge kapandı (kod: ${code})`);
  });
});

// Hata yönetimi
socket.on('error', (err) => {
  console.error(`[${new Date().toLocaleString()}] UDP Bağlantı hatası:`, err);
});

// Soketi 14552 portuna bağla
socket.bind(14552, '0.0.0.0', () => {
  console.log(`[${new Date().toLocaleString()}] UDP dinleyici 14552 portunda başlatıldı`);
});

// Uygulama kapatıldığında temiz bir şekilde çıkış yap
process.on('SIGINT', async () => {
  console.log('\nUygulama kapatılıyor...');
  socket.close(() => {
    console.log('UDP bağlantısı kapatıldı');
    process.exit(0);
  });
});
