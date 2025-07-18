const dgram = require('dgram');
const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const cors = require('cors');
const https = require('https');

// Firebase REST API yapılandırması
const FIREBASE_API_KEY = "AIzaSyDrP1xO_QhJGuGIbEjEbvjRx15juqePcFg";
const FIREBASE_PROJECT_ID = "ihaa-a717d";

// Firebase'e veri yazma fonksiyonu
async function writeToFirebase(collection, document, data) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${document}`;
    
    const postData = JSON.stringify({
        fields: Object.keys(data).reduce((acc, key) => {
            const value = data[key];
            if (typeof value === 'number') {
                acc[key] = { doubleValue: value };
            } else if (typeof value === 'string') {
                acc[key] = { stringValue: value };
            } else if (typeof value === 'boolean') {
                acc[key] = { booleanValue: value };
            }
            return acc;
        }, {})
    });

    const options = {
        hostname: 'firestore.googleapis.com',
        port: 443,
        path: `/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${document}?key=${FIREBASE_API_KEY}`,
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

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

// UDP verilerini dinle ve Firebase'e yaz
socket.on('message', (msg, rinfo) => {
    try {
        const data = JSON.parse(msg.toString());
        console.log(`[${new Date().toLocaleString()}] UDP'den veri alındı:`, data.type);
        
        // Veriyi Firebase'e yaz
        if (data.type && data.data) {
            let collectionName = 'IHAData';
            let documentName = data.type.toLowerCase();
            
            // IHA2 verileri için farklı collection kullan
            if (data.type.endsWith('2')) {
                collectionName = 'IHA2Data';
                documentName = data.type.toLowerCase().replace('2', '');
            }
            
            writeToFirebase(collectionName, documentName, data.data)
                .then(() => {
                    console.log(`[${new Date().toLocaleString()}] ${data.type} verisi Firebase'e yazıldı (${collectionName}/${documentName})`);
                })
                .catch((error) => {
                    console.error(`[${new Date().toLocaleString()}] Firebase yazma hatası:`, error.message);
                });
        }
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] UDP veri işleme hatası:`, error);
    }
});

// Socket olaylarını dinle
socket.on('listening', () => {
  const address = socket.address();
  console.log(`[${new Date().toLocaleString()}] UDP dinleyici başlatıldı: ${address.address}:${address.port}`);

  // Python bridge'i başlat
  const pythonBridge = spawn('python3', ['mavlink_bridge.py'], {
    cwd: __dirname
  });

  pythonBridge.stdout.on('data', (data) => {
    // Python'dan gelen logları göster
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
