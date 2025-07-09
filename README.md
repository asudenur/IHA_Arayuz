# İHA Dashboard

Bu proje, Mission Planner ve SITL üzerinden gelen İHA telemetri verilerini gerçek zamanlı olarak web arayüzünde görüntülemek için geliştirilmiştir.

## Kurulum

1. Backend için gerekli paketleri yükleyin:
```bash
cd backend
npm install
```

2. Firebase Service Account anahtarınızı indirin:
   - Firebase Console'a gidin
   - Proje ayarlarına gidin
   - "Service accounts" sekmesine tıklayın
   - "Generate New Private Key" butonuna tıklayın
   - İndirilen dosyayı `backend/firebase-service-account.json` olarak kaydedin

3. Frontend için gerekli paketleri yükleyin:
```bash
cd frontend
npm install
```

## Çalıştırma

1. Mission Planner'ı başlatın ve SITL'i UDP port 14550 üzerinden bağlayın

2. Backend sunucusunu başlatın:
```bash
cd backend
npm start
```

3. Frontend uygulamasını başlatın:
```bash
cd frontend
npm start
```

## Özellikler

- İHA'nın tüm verilerinin işlenmesi
- Firebase Firestore Database üzerinden veri senkronizasyonu
