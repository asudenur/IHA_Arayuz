import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, IconButton, Drawer } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { 
  positionDoc, 
  position2Doc,
  attitudeDoc,
  statusDoc,
  gpsDoc,
  batteryDoc,
  personelDoc,
  attitude2Doc,
  status2Doc,
  gps2Doc,
  battery2Doc
} from './firebase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import PersonIcon from '@mui/icons-material/Person';
import PersonelInfo from './components/PersonelInfo';
import VideoStream from './components/VideoStream';
import { captiveDb } from './firebase/captivePortalConfig';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Map center updater component
const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-time">Time: {label}s</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-item" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(2)}°
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [telemetryData, setTelemetryData] = useState({
    position: null,
    position2: null,
    attitude: null,
    attitude2: null,
    status: null,
    status2: null,
    gps: null,
    gps2: null,
    battery: null,
    battery2: null,
    personel: null
  });
  const [batteryWarning, setBatteryWarning] = useState(false);
  const [graphData, setGraphData] = useState([]);
  const maxDataPoints = 150;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const defaultPosition = [39.9334, 32.8597];//////////////////////////////////////////////////
  const [isPersonInfoOpen, setIsPersonInfoOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const sendCommand = async (command, payload = {}) => {
    try {
      const body = { command, ...payload };
      console.log('Komut gönderiliyor:', body);
      const response = await fetch('http://localhost:4000/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.ok) {
        console.log('Komut başarıyla gönderildi:', result.message);
      } else {
        console.error('Komut gönderme hatası:', result.message);
      }
    } catch (error) {
      console.error('API isteği başarısız:', error);
    }
  };

  useEffect(() => {
    console.log("Dashboard bileşeni yüklendi");
    const unsubscribers = [];

    const setupFirestoreListener = (docRef, dataType, errorMessage) => {
      try {
        console.log(`${dataType} verisi için dinleyici oluşturuluyor...`);
        const unsubscribe = onSnapshot(docRef, 
          (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              console.log(`${dataType} verisi alındı:`, data);
              setTelemetryData(prev => ({
                ...prev,
                [dataType.toLowerCase()]: data
              }));
            } else {
              console.log(`${dataType} verisi bulunamadı`);
            }
          },
          (error) => {
            console.error(`${dataType} verisi dinleme hatası:`, error);
            setError(`${errorMessage}: ${error.message}`);
          }
        );
        unsubscribers.push(unsubscribe);
      } catch (error) {
        console.error(`${dataType} listener kurulum hatası:`, error);
        setError(`${errorMessage}: ${error.message}`);
      }
    };

    try {
      setupFirestoreListener(positionDoc, 'Position', 'Konum verisi alınamadı');
      setupFirestoreListener(attitudeDoc, 'Attitude', 'Attitude verisi alınamadı');
      setupFirestoreListener(statusDoc, 'Status', 'Durum verisi alınamadı');
      setupFirestoreListener(gpsDoc, 'GPS', 'GPS verisi alınamadı');
      setupFirestoreListener(batteryDoc, 'Battery', 'Batarya verisi alınamadı');
      setupFirestoreListener(personelDoc, 'Personel', 'Personel verisi alınamadı');

      setLoading(false);
    } catch (error) {
      console.error('Firestore bağlantı hatası:', error);
      setError('Firestore bağlantısı kurulamadı: ' + error.message);
      setLoading(false);
    }

    return () => {
      console.log('Dashboard bileşeni kaldırılıyor, dinleyiciler temizleniyor');
      unsubscribers.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Dinleyici temizleme hatası:', error);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (telemetryData.battery && telemetryData.battery.remaining < 20) {
      if (!batteryWarning) setBatteryWarning(true);
    } else {
      if (batteryWarning) setBatteryWarning(false);
    }
  }, [telemetryData.battery, batteryWarning]);

  // İkinci İHA için konum dinleyicisi
  useEffect(() => {
    const unsubscribe = onSnapshot(position2Doc, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('IHA2 konum verisi alındı:', data);
          setTelemetryData(prev => ({
            ...prev,
            position2: data
          }));
        }
      },
      (error) => {
        console.error('IHA2 konum verisi dinleme hatası:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (telemetryData.attitude) {
      setGraphData(prevData => {
        const newData = [...prevData, {
          time: new Date().getTime(),
          roll: telemetryData.attitude.roll,
          pitch: telemetryData.attitude.pitch,
          yaw: telemetryData.attitude.yaw,
          rollTarget: 0,
          pitchTarget: 0,
          yawTarget: 0
        }];

        if (newData.length > maxDataPoints) {
          return newData.slice(-maxDataPoints);
        }
        return newData;
      });
    }
  }, [telemetryData.attitude]);

  // En son personel kaydının konumunu haritada göster
  useEffect(() => {
    const q = query(
      collection(captiveDb, 'malzemeKayitlari'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setTelemetryData(prev => ({
          ...prev,
          personel: {
            lat: parseFloat(data.latitude),
            lon: parseFloat(data.longitude)
          }
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // IHA2 için diğer verileri dinle
  useEffect(() => {
    const unsubAtt = onSnapshot(attitude2Doc, (doc) => {
      if (doc.exists()) {
        setTelemetryData(prev => ({ ...prev, attitude2: doc.data() }));
      }
    });
    const unsubBat = onSnapshot(battery2Doc, (doc) => {
      if (doc.exists()) {
        setTelemetryData(prev => ({ ...prev, battery2: doc.data() }));
      }
    });
    const unsubGps = onSnapshot(gps2Doc, (doc) => {
      if (doc.exists()) {
        setTelemetryData(prev => ({ ...prev, gps2: doc.data() }));
      }
    });
    const unsubStatus = onSnapshot(status2Doc, (doc) => {
      if (doc.exists()) {
        setTelemetryData(prev => ({ ...prev, status2: doc.data() }));
      }
    });
    return () => {
      unsubAtt();
      unsubBat();
      unsubGps();
      unsubStatus();
    };
  }, []);

  // Bildirimleri güncelle
  useEffect(() => {
    const newNotifications = [];
    if (telemetryData.battery && telemetryData.battery.remaining < 20) {
      newNotifications.push({
        id: 'bat1',
        type: 'battery',
        message: `Haberleşme İHA: Batarya Seviyesi Kritik! (${telemetryData.battery.remaining}%)`
      });
    }
    if (telemetryData.status && !telemetryData.status.safety_switch) {
      newNotifications.push({
        id: 'switch1',
        type: 'switch',
        message: 'Haberleşme İHA: Switch Kapalı! Lütfen açınız.'
      });
    }
    if (telemetryData.battery2 && telemetryData.battery2.remaining < 20) {
      newNotifications.push({
        id: 'bat2',
        type: 'battery',
        message: `Taşıma İHA: Batarya Seviyesi Kritik! (${telemetryData.battery2.remaining}%)`
      });
    }
    if (telemetryData.status2 && !telemetryData.status2.safety_switch) {
      newNotifications.push({
        id: 'switch2',
        type: 'switch',
        message: 'Taşıma İHA: Switch Kapalı! Lütfen açınız.'
      });
    }
    setNotifications(newNotifications);
  }, [telemetryData.battery, telemetryData.status, telemetryData.battery2, telemetryData.status2]);

  const handleCloseNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} thickness={4} />
        <Typography className="loading-text">
          Telemetri verileri yükleniyor...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="error-container">
        <Typography className="error-title">
          Bağlantı Hatası
        </Typography>
        <Typography className="error-message">
          {error}
        </Typography>s
      </Box>
    );
  }

  const mapPosition = telemetryData.position ? 
    [telemetryData.position.lat, telemetryData.position.lon] : 
    defaultPosition;

  const formatValue = (value, decimals = 1) => {
    if (value === null || value === undefined) return '0';
    return typeof value === 'number' ? value.toFixed(decimals) : '0';
  };

  const droneIcon = L.icon({
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35]
  });

  const personIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png', // Basit bir personel ikonu
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35]
  });

  return (
    <div className="dashboard-container">
      <div style={{ position: 'absolute', top: 60, left: 0, width: '100%', zIndex: 2000 }}>
        {notifications.map((notif, idx) => (
          <div
            key={notif.id}
            className={notif.type === 'battery' ? 'battery-warning-banner' : 'switch-warning-banner'}
            style={{ top: `${60 + idx * 48}px`, position: 'absolute', width: '100%' }}
          >
            {notif.message}
            <span
              style={{ float: 'right', marginLeft: 16, cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => handleCloseNotification(notif.id)}
            >
              ×
            </span>
          </div>
        ))}
      </div>
      <div className="dashboard-header">
        <div>İHA KONTROL ARAYÜZÜ</div>
        <IconButton
          onClick={() => setIsPersonInfoOpen(true)}
          className="person-info-button"
        >
          <PersonIcon />
        </IconButton>
      </div>

      <div className="dashboard-content">
        {/* Sol Bölüm - IHA1 Göstergeleri */}
        <div className="left-section">
          <div className="map-container">
            <MapContainer
              key={mapPosition.join(',')}
              center={mapPosition}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                maxZoom={20}
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                attribution="Google Satellite"
              />
              {/* IHA1 Marker */}
              {telemetryData.position && (
                <Marker 
                  position={[telemetryData.position.lat, telemetryData.position.lon]} 
                  icon={droneIcon}
                >
                  <Popup>
                    <div className="map-popup">
                      <div className="popup-header">IHA 1 Konumu</div>
                      <div className="popup-content">
                        <div className="popup-row">
                          <span>Enlem:</span>
                          <span>{telemetryData.position.lat.toFixed(6)}°</span>
                        </div>
                        <div className="popup-row">
                          <span>Boylam:</span>
                          <span>{telemetryData.position.lon.toFixed(6)}°</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* IHA2 Marker */}
              {telemetryData.position2 && (
                <Marker 
                  position={[telemetryData.position2.lat, telemetryData.position2.lon]} 
                  icon={droneIcon}
                >
                  <Popup>
                    <div className="map-popup">
                      <div className="popup-header">IHA 2 Konumu</div>
                      <div className="popup-content">
                        <div className="popup-row">
                          <span>Enlem:</span>
                          <span>{telemetryData.position2.lat.toFixed(6)}°</span>
                        </div>
                        <div className="popup-row">
                          <span>Boylam:</span>
                          <span>{telemetryData.position2.lon.toFixed(6)}°</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Personel Marker */}
              {telemetryData.personel && telemetryData.personel.lat && (
                <Marker
                  position={[telemetryData.personel.lat, telemetryData.personel.lon]}
                  icon={personIcon}
                >
                  <Popup>
                    <div className="map-popup">
                      <div className="popup-header">Personel Konumu</div>
                      <div className="popup-content">
                        <div className="popup-row">
                          <span>Enlem:</span>
                          <span>{telemetryData.personel.lat.toFixed(6)}°</span>
                        </div>
                        <div className="popup-row">
                          <span>Boylam:</span>
                          <span>{telemetryData.personel.lon.toFixed(6)}°</span>
                        </div>
                      </div>
                      <div className="popup-actions">
                        <button
                          onClick={() => sendCommand('GOTO_LOCATION', {
                            target: 2, // IHA 2'yi hedefle
                            lat: telemetryData.personel.lat,
                            lon: telemetryData.personel.lon,
                            alt: 15 // Hedef irtifa (metre)
                          })}
                          className="popup-button"
                        >
                          IHA 2'yi Buraya Gönder
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* IHA 2 ve Personel Arasındaki Çizgi */}
              {telemetryData.position2 && telemetryData.personel && telemetryData.personel.lat && (
                <Polyline
                  positions={[
                    [telemetryData.position2.lat, telemetryData.position2.lon],
                    [telemetryData.personel.lat, telemetryData.personel.lon]
                  ]}
                  color="#00ffff"
                  weight={2}
                  dashArray="10, 10"
                />
              )}
              
              <MapUpdater center={mapPosition} />
            </MapContainer>
          </div>

          {/* Gösterge Panelleri */}
          <div className="instruments-grid">
            <div className="panel-title-in">Haberleşme İHA</div>
            {/* IHA1 göstergeleri */}
            <div className="instrument airspeed">
              <div className="instrument-marks"></div>
              <div className="instrument-dial">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((speed) => (
                  <div
                    key={speed}
                    className="speed-mark"
                    style={{
                      transform: `rotate(${(speed / 24) * 180 - 90}deg)`
                    }}
                  >
                    <span style={{ transform: `rotate(${-((speed / 24) * 180 - 90)}deg)` }}>
                      {speed}
                    </span>
                  </div>
                ))}
                <div
                  className="instrument-needle"
                  style={{
                    transform: `rotate(${Math.min((telemetryData.position?.ground_speed || 0) / 24 * 180 - 90, 90)}deg)`
                  }}
                ></div>
              </div>
              <div className="instrument-value">
                {formatValue(telemetryData.position?.ground_speed)}
              </div>
              <div className="instrument-label">HIZ (m/s)</div>
            </div>
            <div className="instrument altitude">
              <div className="instrument-marks"></div>
              <div className="instrument-dial">
                {[0, 5, 10, 15, 20, 25, 30, 35].map((alt) => (
                  <div
                    key={alt}
                    className="speed-mark"
                    style={{
                      transform: `rotate(${(alt / 35) * 180 - 90}deg)`
                    }}
                  >
                    <span style={{ transform: `rotate(${-((alt / 35) * 180 - 90)}deg)` }}>
                      {alt}
                    </span>
                  </div>
                ))}
                <div
                  className="instrument-needle"
                  style={{
                    transform: `rotate(${Math.min((telemetryData.position?.relative_alt || 0) / 35 * 180 - 90, 90)}deg)`
                  }}
                ></div>
              </div>
              <div className="instrument-value">
                {formatValue(telemetryData.position?.relative_alt)}
              </div>
              <div className="instrument-label">ALT (m)</div>
            </div>
            <div className="instrument battery">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.battery?.remaining, 0)}%
              </div>
              <div className="instrument-sub-value">
                {formatValue(telemetryData.battery?.voltage, 1)}V
              </div>
              <div className="instrument-label">BATARYA</div>
            </div>
            <div className="instrument gps">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {telemetryData.gps?.fix_type || '0'}
              </div>
              <div className="instrument-sub-value">
                {telemetryData.gps?.satellites_visible || '0'} SAT
              </div>
              <div className="instrument-label">GPS</div>
            </div>
            <div className="instrument heading">
              <div className="instrument-marks"></div>
              <div className="heading-compass">
                <div className="heading-marker north"></div>
                <div className="heading-marker south"></div>
                <div className="heading-marker east"></div>
                <div className="heading-marker west"></div>
                <div
                  className="instrument-needle"
                  style={{
                    transform: `rotate(${telemetryData.attitude?.yaw || 0}deg)`
                  }}
                ></div>
              </div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude?.yaw)}°
              </div>
              <div className="instrument-label">YÖN</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude?.roll)}°
              </div>
              <div className="instrument-label">ROLL</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude?.pitch)}°
              </div>
              <div className="instrument-label">PITCH</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude?.yaw)}°
              </div>
              <div className="instrument-label">YAW</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.position?.ground_speed)}
              </div>
              <div className="instrument-label">GROUND SPEED</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.gps?.hdop, 2)}
              </div>
              <div className="instrument-label">HDOP</div>
            </div>
            <div className="flight-mode-status inside-panel">
              <button
                onClick={() => sendCommand(telemetryData.status?.armed ? 'DISARM' : 'ARM')}
                className={`command-button full-width ${telemetryData.status?.armed ? 'is-armed' : 'is-disarmed'}`}
              >
                <span className="status-label">ARM DURUMU:</span>
                <span className="status-value">
                  {telemetryData.status?.armed ? 'ARMED' : 'DISARMED'}
                </span>
              </button>
              <div className="mode-control-wrapper">
                <span className="status-label">UÇUŞ MODU:</span>
                <select
                  value={telemetryData.status?.mode || ''}
                  onChange={(e) => sendCommand('SET_MODE', { mode: e.target.value })}
                  className="mode-select-panel"
                >
                  <option value="" disabled>UNKNOWN</option>
                  <option value="STABILIZE">STABILIZE</option>
                  <option value="ALT_HOLD">ALT HOLD</option>
                  <option value="LOITER">LOITER</option>
                  <option value="RTL">RTL</option>
                  <option value="LAND">LAND</option>
                  <option value="POSHOLD">POS HOLD</option>
                  <option value="GUIDED">GUIDED</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orta Bölüm - Tuning Graph ve ARM/Uçuş Modu */}
        <div className="center-section">
          <div className="tuning-section">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={graphData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                style={{ backgroundColor: 'transparent' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 255, 0.1)" />
                <XAxis
                  dataKey="time"
                  stroke="#fff"
                  tickFormatter={(time) => Math.round((time - graphData[0]?.time || 0) / 1000)}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  label={{ 
                    value: 'Time (seconds)', 
                    position: 'bottom',
                    fill: 'var(--text-secondary)',
                    fontSize: 12,
                    offset: 0
                  }}
                />
                <YAxis
                  stroke="#fff"
                  domain={[-180, 180]}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  label={{ 
                    value: 'Angle (degrees)', 
                    angle: -90, 
                    position: 'insideLeft',
                    fill: 'var(--text-secondary)',
                    fontSize: 12,
                    offset: 10
                  }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  contentStyle={{
                    backgroundColor: 'rgba(26, 26, 26, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(5px)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)'
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.1)" />
                <Line
                  type="monotone"
                  dataKey="roll"
                  name="Roll"
                  stroke="#ff0000"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="pitch"
                  name="Pitch"
                  stroke="#00ff00"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="yaw"
                  name="Yaw"
                  stroke="#0000ff"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="rollTarget"
                  name="Roll Target"
                  stroke="rgba(255, 0, 0, 0.3)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="pitchTarget"
                  name="Pitch Target"
                  stroke="rgba(0, 255, 0, 0.3)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="yawTarget"
                  name="Yaw Target"
                  stroke="rgba(0, 0, 255, 0.3)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sağ Bölüm - IHA2 Göstergeleri */}
        <div className="right-section">
          <div className="camera-container">
            <div className="camera-header">
              <span>İHA KAMERA GÖRÜNTÜSÜ</span>
            </div>
            <div className="camera-feed">
              <VideoStream />
            </div>
            <div className="camera-controls">
              <div className="camera-info">
                <span>FPS: 30</span>
                <span>Çözünürlük: 1280x720</span>
              </div>
            </div>
          </div>

          <Drawer
            anchor="right"
            open={isPersonInfoOpen}
            onClose={() => setIsPersonInfoOpen(false)}
            classes={{
              paper: 'person-info-drawer'
            }}
          >
            <div className="person-info-content">
              <div className="info-header">
                <span>PERSONEL BİLGİLERİ</span>
                <IconButton
                  onClick={() => setIsPersonInfoOpen(false)}
                  className="close-button"
                >
                  ×
                </IconButton>
              </div>
              <PersonelInfo />
            </div>
          </Drawer>

          {/* Gösterge Panelleri */}
          <div className="instruments-grid">
            <div className="panel-title-in">Taşıma İHA</div>
            <div className="instrument airspeed">
              <div className="instrument-marks"></div>
              <div className="instrument-dial">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((speed) => (
                  <div
                    key={speed}
                    className="speed-mark"
                    style={{
                      transform: `rotate(${(speed / 24) * 180 - 90}deg)`
                    }}
                  >
                    <span style={{ transform: `rotate(${-((speed / 24) * 180 - 90)}deg)` }}>
                      {speed}
                    </span>
                  </div>
                ))}
                <div
                  className="instrument-needle"
                  style={{
                    transform: `rotate(${Math.min((telemetryData.position2?.ground_speed || 0) / 24 * 180 - 90, 90)}deg)`
                  }}
                ></div>
              </div>
              <div className="instrument-value">
                {formatValue(telemetryData.position2?.ground_speed)}
              </div>
              <div className="instrument-label">HIZ (m/s)</div>
            </div>
            <div className="instrument altitude">
              <div className="instrument-marks"></div>
              <div className="instrument-dial">
                {[0, 5, 10, 15, 20, 25, 30, 35].map((alt) => (
                  <div
                    key={alt}
                    className="speed-mark"
                    style={{
                      transform: `rotate(${(alt / 35) * 180 - 90}deg)`
                    }}
                  >
                    <span style={{ transform: `rotate(${-((alt / 35) * 180 - 90)}deg)` }}>
                      {alt}
                    </span>
                  </div>
                ))}
                <div
                  className="instrument-needle"
                  style={{
                    transform: `rotate(${Math.min((telemetryData.position2?.relative_alt || 0) / 35 * 180 - 90, 90)}deg)`
                  }}
                ></div>
              </div>
              <div className="instrument-value">
                {formatValue(telemetryData.position2?.relative_alt)}
              </div>
              <div className="instrument-label">ALT (m)</div>
            </div>
            <div className="instrument battery">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.battery2?.remaining, 0)}%
              </div>
              <div className="instrument-sub-value">
                {formatValue(telemetryData.battery2?.voltage, 1)}V
              </div>
              <div className="instrument-label">BATARYA</div>
            </div>
            <div className="instrument gps">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {telemetryData.gps2?.fix_type || '0'}
              </div>
              <div className="instrument-sub-value">
                {telemetryData.gps2?.satellites_visible || '0'} SAT
              </div>
              <div className="instrument-label">GPS</div>
            </div>
            <div className="instrument heading">
              <div className="instrument-marks"></div>
              <div className="heading-compass">
                <div className="heading-marker north"></div>
                <div className="heading-marker south"></div>
                <div className="heading-marker east"></div>
                <div className="heading-marker west"></div>
                <div
                  className="instrument-needle"
                  style={{
                    transform: `rotate(${telemetryData.attitude2?.yaw || 0}deg)`
                  }}
                ></div>
              </div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude2?.yaw)}°
              </div>
              <div className="instrument-label">YÖN</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude2?.roll)}°
              </div>
              <div className="instrument-label">ROLL</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude2?.pitch)}°
              </div>
              <div className="instrument-label">PITCH</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.attitude2?.yaw)}°
              </div>
              <div className="instrument-label">YAW</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                  {formatValue(telemetryData.position2?.ground_speed)}
              </div>
              <div className="instrument-label">GROUND SPEED</div>
            </div>
            <div className="instrument">
              <div className="instrument-marks"></div>
              <div className="instrument-value">
                {formatValue(telemetryData.gps2?.hdop, 2)}
              </div>
              <div className="instrument-label">HDOP</div>
            </div>
            <div className="flight-mode-status inside-panel">
              <button
                onClick={() => sendCommand(telemetryData.status2?.armed ? 'DISARM' : 'ARM')}
                className={`command-button full-width ${telemetryData.status2?.armed ? 'is-armed' : 'is-disarmed'}`}
              >
                <span className="status-label">ARM DURUMU:</span>
                <span className="status-value">
                  {telemetryData.status2?.armed ? 'ARMED' : 'DISARMED'}
                </span>
              </button>
              <div className="mode-control-wrapper">
                <span className="status-label">UÇUŞ MODU:</span>
                <select
                  value={telemetryData.status2?.mode || ''}
                  onChange={(e) => sendCommand('SET_MODE', { mode: e.target.value, target: 2 })}
                  className="mode-select-panel"
                >
                  <option value="" disabled>UNKNOWN</option>
                  <option value="STABILIZE">STABILIZE</option>
                  <option value="ALT_HOLD">ALT HOLD</option>
                  <option value="LOITER">LOITER</option>
                  <option value="RTL">RTL</option>
                  <option value="LAND">LAND</option>
                  <option value="POSHOLD">POS HOLD</option>
                  <option value="GUIDED">GUIDED</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


