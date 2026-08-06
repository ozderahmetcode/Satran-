import React, { useState } from 'react';

export default function EventDetail({ tournaments, registrations, currentUser, onRegisterUpdate, onGoToAuth }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Belirli turnuvaya ait kayıtları filtrele
  const getTournamentRegistrations = (tourId) => {
    return registrations?.filter(r => r.tournamentId === parseInt(tourId)) || [];
  };

  const handleRegister = async (tourId) => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: parseInt(tourId),
          userId: currentUser.id
        })
      });
      const result = await response.json();

      if (response.ok) {
        onRegisterUpdate(result.registrations);
      } else {
        setErrorMsg(result.error || 'Kayıt sırasında hata oluştu.');
      }
    } catch (error) {
      setErrorMsg('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (tourId) => {
    if (!currentUser) return;
    if (!window.confirm("Kaydınızı iptal etmek istediğinize emin misiniz?")) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`/api/register/${tourId}/${currentUser.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (response.ok) {
        onRegisterUpdate(result.registrations);
      } else {
        setErrorMsg(result.error || 'İptal edilemedi.');
      }
    } catch (error) {
      setErrorMsg('Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };

  // Turnuva Seçilmediyse: Liste Görünümü
  if (!selectedTournamentId) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '36px', fontWeight: 800 }}>
            🏆 Satranç Buluşmalarımız
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Katılmak istediğiniz etkinliği seçerek detayları görüntüleyin ve kaydolun.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {tournaments.map((tour) => {
            const regs = getTournamentRegistrations(tour.id);
            const isFull = regs.length >= tour.maxQuota;

            return (
              <div key={tour.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div>
                  <span style={{
                    background: tour.status === 'active' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {tour.status === 'active' ? 'KAYITLAR AÇIK' : 'TAMAMLANDI'}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginTop: '12px', fontWeight: 700 }}>
                    {tour.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                    📅 {tour.date} • 🕒 {tour.time} <br />
                    📍 {tour.location}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Kontenjan: <strong>{regs.length} / {tour.maxQuota}</strong>
                  </span>
                  <button onClick={() => setSelectedTournamentId(tour.id)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Detayları Gör
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Turnuva Seçildiyse: Detay ve Kayıt Görünümü
  const tour = tournaments.find(t => t.id === selectedTournamentId);
  const regs = getTournamentRegistrations(tour.id);
  const isRegistered = currentUser && regs.some(r => r.userId === currentUser.id);
  const isFull = regs.length >= tour.maxQuota;

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <button onClick={() => { setSelectedTournamentId(null); setErrorMsg(''); }} className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}>
        ← Tüm Buluşmalara Dön
      </button>

      <section className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(13, 18, 30, 0.9) 0%, rgba(245, 158, 11, 0.08) 100%)',
        padding: '36px',
        position: 'relative'
      }}>
        <span style={{ background: 'var(--gradient-gold)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
          ETKİNLİK DETAYLARI
        </span>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800, marginTop: '16px' }}>
          {tour.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
          📍 {tour.location} • 📅 {tour.date} • 🕒 {tour.time}
        </p>
      </section>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        
        {/* Left Column: Info & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Kontenjan Bilgisi</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Kayıtlı Oyuncu: {regs.length}</span>
              <span>Kalan Yer: {Math.max(0, tour.maxQuota - regs.length)} / {tour.maxQuota}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                background: 'var(--gradient-gold)',
                width: `${Math.min(100, (regs.length / tour.maxQuota) * 100)}%`,
                height: '100%',
                borderRadius: '10px'
              }} />
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700 }}>Buluşma Şartları</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>• 💳 Katılım Bedeli: {tour.fee}</div>
              <div>• ♟️ Format: 15+3 Dostluk Maçı (5 Tur)</div>
              <div>• ☕ Mekan ikramları katılım ücretine dahildir.</div>
            </div>
          </div>
        </div>

        {/* Right Column: Register Action / Attendees */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Action Box */}
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Turnuva Katılımı</h3>
            
            {!currentUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Bu etkinliğe kayıt olmak için önce hesabınıza giriş yapmalısınız.
                </p>
                <button onClick={onGoToAuth} className="btn-primary" style={{ justifyContent: 'center' }}>
                  Giriş Yap / Üye Ol
                </button>
              </div>
            ) : isRegistered ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  ✓ Bu turnuvaya başarıyla kaydoldunuz!
                </p>
                <button 
                  onClick={() => handleCancelRegistration(tour.id)} 
                  disabled={loading}
                  className="btn-secondary" 
                  style={{ justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444' }}
                >
                  {loading ? 'İşlem yapılıyor...' : 'Kaydımı İptal Et'}
                </button>
              </div>
            ) : isFull ? (
              <p style={{ color: '#ef4444', fontWeight: 600 }}>
                Kontenjan Dolmuştur!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Hesabınız açık: <strong>{currentUser.name}</strong> adına tek tıkla kaydınızı tamamlayın.
                </p>
                <button 
                  onClick={() => handleRegister(tour.id)} 
                  disabled={loading}
                  className="btn-primary" 
                  style={{ justifyContent: 'center' }}
                >
                  {loading ? 'Kaydediliyor...' : 'Turnuvaya Katıl'}
                </button>
              </div>
            )}
          </div>

          {/* Attendees List */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              Katılımcı Listesi ({regs.length})
            </h3>
            {regs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Henüz kayıtlı katılımcı bulunmamaktadır.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {regs.map((reg, idx) => {
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{idx + 1}. Katılımcı</span>
                      <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>Lichess/Chess.com Aktif</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
