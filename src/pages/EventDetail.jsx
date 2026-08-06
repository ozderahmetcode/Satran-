import React, { useState } from 'react';

export default function EventDetail({ registrations, onRegister }) {
  const [formData, setFormData] = useState({
    name: '',
    chessUsername: '',
    phone: '',
    elo: ''
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const maxQuota = 20;
  const currentCount = registrations?.length || 0;
  const spotsLeft = Math.max(0, maxQuota - currentCount);
  const fillPercentage = Math.min(100, (currentCount / maxQuota) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    if (!formData.name || !formData.chessUsername || !formData.phone) {
      setStatusMsg({ type: 'error', text: 'Lütfen zorunlu alanları (*) doldurun.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setStatusMsg({ type: 'success', text: 'Tebrikler! Kaydınız başarıyla tamamlandı.' });
        onRegister(result.registrations);
        setFormData({ name: '', chessUsername: '', phone: '', elo: '' });
      } else {
        setStatusMsg({ type: 'error', text: result.error || 'Kayıt sırasında bir hata oluştu.' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Event Header Banner */}
      <section className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(22, 24, 30, 0.9) 0%, rgba(139, 92, 246, 0.15) 100%)',
        padding: '48px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span style={{
            background: 'var(--gradient-glow)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px'
          }}>YAKLAŞAN SOSYAL BULUŞMA</span>
          
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '42px', fontWeight: 800, marginTop: '20px' }}>
            114. Tilda Cafe Satranç Buluşması (15+3)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0 auto' }}>
            Ümraniye'nin gözde mekanı Tilda Cafe'de sıcacık kahve eşliğinde yeni insanlarla tanışın, satranç oynayın ve sosyalleşin.
          </p>
        </div>
      </section>

      {/* Main Grid: Details vs Form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px'
      }}>
        
        {/* Info Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Card: Quota Status */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Kontenjan Durumu
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              <span>Kayıtlı: {currentCount} Oyuncu</span>
              <span>Kalan Yer: {spotsLeft} / {maxQuota}</span>
            </div>
            {/* Progress Bar */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
              <div style={{
                background: 'var(--gradient-glow)',
                width: `${fillPercentage}%`,
                height: '100%',
                borderRadius: '10px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* Card: Details Details */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700 }}>
              Etkinlik Detayları
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: "📍 Konum", val: "Ümraniye Tilda Cafe (İstiklal Mh. Anafartalar Cd.)" },
                { label: "📅 Tarih", val: "08 Ağustos 2026, Cumartesi" },
                { label: "🕒 Saat", val: "15:00 (Toplanma başlangıcı 14:30)" },
                { label: "♟️ Format", val: "15 dakika + 3 saniye eklemeli (5 Tur Dostluk Maçı)" },
                { label: "☕ Sosyalleşme", val: "Herkes davetlidir; ana amaç tanışmak, sohbet etmek ve satranç kültürünü paylaşmaktır." },
                { label: "💳 Katılım Bedeli", val: "300 TL (Mekan ikramları dahildir)" }
              ].map((info, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600 }}>{info.label}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginTop: '4px' }}>{info.val}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Form Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Card: Register Form */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              Hemen Kaydol ve Yerini Garanti Altına Al
            </h3>

            {statusMsg.text && (
              <div style={{
                background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${statusMsg.type === 'success' ? 'var(--accent-primary)' : '#ef4444'}`,
                color: statusMsg.type === 'success' ? 'var(--accent-primary)' : '#ef4444',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '20px',
                fontWeight: 500
              }}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Özder Gültekin"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Satranç Platformu Kullanıcı Adı (Lichess/Chess.com) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: ozder_chess"
                  value={formData.chessUsername}
                  onChange={(e) => setFormData({ ...formData, chessUsername: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Telefon Numarası *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Örn: 0555 555 5555"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Tahmini Elo Puanı / Seviye (Opsiyonel)
                </label>
                <input
                  type="number"
                  placeholder="Örn: 1500 (Bilinmiyorsa boş bırakın)"
                  value={formData.elo}
                  onChange={(e) => setFormData({ ...formData, elo: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol ve Katıl'}
              </button>
            </form>
          </div>

          {/* List of Registered Players */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              👥 Katılımcılar ({currentCount})
            </h3>
            
            {currentCount === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Henüz kayıt bulunmamaktadır. İlk siz kaydolun!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                {registrations.map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{player.name}</span>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{player.chessUsername}</div>
                    </div>
                    {player.elo && (
                      <span style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: 'var(--accent-secondary)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        Elo: {player.elo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
