import React, { useState } from 'react';

export default function CreateEvent({ onAddTournament, setCurrentPage }) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: 'Ümraniye X Cafe',
    fee: '300 TL',
    maxQuota: '20'
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    if (!formData.title || !formData.date || !formData.time || !formData.location || !formData.maxQuota) {
      setStatusMsg({ type: 'error', text: 'Lütfen tüm zorunlu alanları doldurun.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setStatusMsg({ type: 'success', text: 'Etkinlik başarıyla oluşturuldu!' });
        onAddTournament(result.tournaments);
        setTimeout(() => {
          setCurrentPage('event');
        }, 1500);
      } else {
        setStatusMsg({ type: 'error', text: result.error || 'Etkinlik oluşturulurken hata oluştu.' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Sunucuya bağlanılamadı.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>
        📢 Yeni Satranç Etkinliği Oluştur
      </h2>

      {statusMsg.text && (
        <div style={{
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${statusMsg.type === 'success' ? 'var(--accent-primary)' : '#ef4444'}`,
          color: statusMsg.type === 'success' ? 'var(--accent-primary)' : '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '20px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
            Etkinlik Başlığı *
          </label>
          <input
            type="text"
            required
            placeholder="Örn: 2. X Cafe Hızlı Satranç Turnuvası"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{
              width: '100%',
              background: '#fff',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
              Tarih *
            </label>
            <input
              type="text"
              required
              placeholder="Örn: 15.08.2026"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{
                width: '100%',
                background: '#fff',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
              Saat *
            </label>
            <input
              type="text"
              required
              placeholder="Örn: 15:00"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
            Mekan Konumu *
          </label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
              Katılım Ücreti
            </label>
            <input
              type="text"
              placeholder="Örn: 300 TL"
              value={formData.fee}
              onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
              Kontenjan Limit *
            </label>
            <input
              type="number"
              required
              value={formData.maxQuota}
              onChange={(e) => setFormData({ ...formData, maxQuota: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
          {loading ? 'Oluşturuluyor...' : 'Etkinliği Yayınla'}
        </button>
      </form>
    </div>
  );
}
