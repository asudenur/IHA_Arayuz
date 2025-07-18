import React, { useState, useEffect } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { malzemeKayitlariCol } from '../firebase/captivePortalConfig';

const PersonelInfo = () => {
  const [personnelData, setPersonnelData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(malzemeKayitlariCol, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => doc.data());
      setPersonnelData(data);
      setLoading(false);
    });
    return () => unsubscribe();
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
              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Ad:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.firstName}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Soyad:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.lastName}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Organizasyon:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.organization}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Enlem:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.latitude}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Boylam:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.longitude}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Malzeme:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.materialName}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Miktar:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.quantity}</div>

              <div className="info-label" style={{ color: 'var(--accent-color)' }}>Tarih:</div>
              <div className="info-value" style={{ color: 'var(--text-primary)' }}>{data.timestamp ? new Date(data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp).toLocaleString('tr-TR') : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonelInfo; 