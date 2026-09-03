import React, { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setErrorMsg('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', message: '' });
      } else {
        const result = await response.json();
        setErrorMsg(result.error || 'Mesaj gönderilemedi.');
      }
    } catch (error) {
      setErrorMsg('Sunucu bağlantı hatası.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      <section style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '38px', fontWeight: 800 }}>
          📞 İletişim & Konum Bilgileri
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Bizimle iletişime geçin, turnuva sponsorluğu veya topluluk buluşmaları hakkında bilgi alın.
        </p>
      </section>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '32px'
      }}>
        {/* Contact Info Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 700, color: 'var(--accent-secondary)' }}>
            📍 Buluşma Noktamız
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Adres</h4>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>X Cafe (Ümraniye)</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Adres:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>İstiklal Mahallesi, Anafartalar Caddesi, Ümraniye / İstanbul</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>E-posta:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>iletisim@ozderchess.com</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Telefon / WhatsApp:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>+90 555 555 55 55</p>
            </div>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
            ✉️ Bize Mesaj Gönderin
          </h3>

          {success && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
              fontWeight: 500
            }}>
              Mesajınız başarıyla iletildi! En kısa sürede dönüş yapacağız.
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
              fontWeight: 500
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Adınız Soyadınız</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  background: '#fff',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>E-posta Adresiniz</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  background: '#fff',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mesajınız</label>
              <textarea
                required
                rows="4"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              Mesajı Gönder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
