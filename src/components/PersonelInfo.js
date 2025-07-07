import React, { useState, useEffect } from 'react';

const API_URL = 'http://172.20.10.2:8080/api/data'; // Flask endpoint

const PersonnelInfo = () => {
  const [personnelData, setPersonnelData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setPersonnelData(data);
      } catch (err) {
        console.error('Veri çekme hatası:', err);
      }
      setLoading(false);
    };

    fetchPersonnel();
    const interval = setInterval(fetchPersonnel, 5000); // 5 sn'de bir güncelle

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="info-content" style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gap: '20px' }}>
        {personnelData.map((data, index) => (
          <div key={index} style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '15px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'auto 1fr',
              gap: '10px',
              fontSize: '0.9rem'
            }}>
              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Personel Adı-Soyadı:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{`${data.name}`}</div>
              
              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Çalıştığı Kurum:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.company}</div>
              
              <div className="info-label" style={{ color: 'var(--accent-color)' }}>İstenen Malzeme:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.material}</div>
              
              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Miktar:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.amount}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Konum Bilgisi:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.location}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Tarih:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{new Date(data.created_at).toLocaleString('tr-TR')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonnelInfo; 