import React, { useState } from 'react';
import { sanitizeUrl, sanitizeChessUsername } from '../utils/security';

export default function EventDetail({ tournaments, registrations, users = [], currentUser, onRegisterUpdate, onGoToAuth }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedTourId, setCopiedTourId] = useState(null);

  // WhatsApp Paylaşım URL'i Oluşturucu
  const getWhatsAppShareUrl = (t) => {
    const siteUrl = window.location.origin;
    const text = `🏆 *OZDER Satranç Topluluğu Buluşması!* ♟️\n\n` +
      `✨ *${t.title}*\n` +
      `📅 *Tarih:* ${t.date} • Saat: ${t.time}\n` +
      `📍 *Yer:* ${t.location}\n` +
      `💰 *Katılım:* ${t.fee}\n` +
      `👥 *Kontenjan:* ${t.maxQuota} Kişi\n\n` +
      `Detayları incelemek ve hemen kaydolmak için:\n` +
      `${siteUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  // Bağlantıyı Panoya Kopyalama
  const copyTournamentLink = (tourId) => {
    const siteUrl = window.location.origin;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(siteUrl);
      setCopiedTourId(tourId);
      setTimeout(() => setCopiedTourId(null), 2500);
    }
  };

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
          userId: currentUser.id,
          name: currentUser.name,
          chessUsername: currentUser.chessUsername
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
            const isTourFinished = tour.status === 'completed' || 
              (tour.champion && tour.champion !== 'Bekleniyor...') ||
              (tour.rounds && tour.rounds.length >= tour.totalRounds && tour.rounds.length > 0 && !tour.rounds[tour.rounds.length - 1]?.pairings?.some(p => p.result === 'pending'));

            return (
              <div key={tour.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div>
                  <span style={{
                    background: tour.status === 'cancelled' 
                      ? '#ef4444' 
                      : isTourFinished 
                      ? 'rgba(0,0,0,0.05)'
                      : 'var(--accent-primary)',
                    color: tour.status === 'cancelled' || !isTourFinished ? '#fff' : 'var(--text-secondary)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {tour.status === 'cancelled' ? 'İPTAL EDİLDİ' : isTourFinished ? 'TAMAMLANDI' : 'KAYITLAR AÇIK'}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginTop: '12px', fontWeight: 700 }}>
                    {tour.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                    📅 {tour.date} • 🕒 {tour.time} <br />
                    📍 {tour.location}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Kontenjan: <strong>{regs.length} / {tour.maxQuota}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={getWhatsAppShareUrl(tour)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Arkadaşlarınla WhatsApp'ta Paylaş"
                      style={{
                        background: '#25D366',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      Paylaş
                    </a>
                    <button onClick={() => setSelectedTournamentId(tour.id)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                      Detayları Gör
                    </button>
                  </div>
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

  const isFinished = tour.status === 'completed' || 
    (tour.champion && tour.champion !== 'Bekleniyor...') ||
    (tour.rounds && tour.rounds.length >= tour.totalRounds && tour.rounds.length > 0 && !tour.rounds[tour.rounds.length - 1]?.pairings?.some(p => p.result === 'pending'));

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <button onClick={() => { setSelectedTournamentId(null); setErrorMsg(''); }} className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}>
        ← Tüm Buluşmalara Dön
      </button>

      <section className="glass-panel" style={{
        background: '#ffffff',
        padding: '36px',
        position: 'relative'
      }}>
        <span style={{ 
          background: tour.status === 'cancelled' ? '#ef4444' : isFinished ? 'rgba(0,0,0,0.06)' : 'var(--gradient-gold)', 
          color: tour.status === 'cancelled' || !isFinished ? '#fff' : 'var(--text-secondary)', 
          padding: '4px 10px', 
          borderRadius: '6px', 
          fontSize: '12px', 
          fontWeight: 700 
        }}>
          {tour.status === 'cancelled' ? 'İPTAL EDİLDİ' : isFinished ? '🏁 ETKİNLİK TAMAMLANDI' : 'ETKİNLİK DETAYLARI'}
        </span>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800, marginTop: '16px' }}>
          {tour.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
          📍 {tour.location} • 📅 {tour.date} • 🕒 {tour.time}
        </p>

        {/* WhatsApp ve Bağlantı Paylaşım Çubuğu */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid var(--panel-border)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Etkinliği Paylaş:
          </span>
          <a
            href={getWhatsAppShareUrl(tour)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#25D366',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp ile Paylaş
          </a>
          <button
            type="button"
            onClick={() => copyTournamentLink(tour.id)}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: copiedTourId === tour.id ? '#ecfdf5' : '#ffffff',
              borderColor: copiedTourId === tour.id ? '#10b981' : 'var(--panel-border)',
              color: copiedTourId === tour.id ? '#059669' : 'var(--text-primary)'
            }}
          >
            <span>{copiedTourId === tour.id ? '✓' : '🔗'}</span>
            {copiedTourId === tour.id ? 'Bağlantı Kopyalandı!' : 'Bağlantıyı Kopyala'}
          </button>
        </div>
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
            <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
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
            
            {tour.status === 'cancelled' ? (
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444' }}>
                <p style={{ fontWeight: 700, margin: 0 }}>🚫 Bu etkinlik organizatör tarafından iptal edilmiştir.</p>
                <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>Yeni kayıt alınmamaktadır.</p>
              </div>
            ) : isFinished ? (
              isRegistered ? (
                <div style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--text-primary)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏁🏆</div>
                  <p style={{ fontWeight: 800, fontSize: '17px', color: 'var(--accent-primary)', margin: 0 }}>
                    Bu Etkinlik & Turnuva Tamamlandı
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', marginBottom: '4px' }}>
                    ✓ Bu turnuvaya katıldınız.
                  </p>
                  {tour.champion && tour.champion !== 'Bekleniyor...' && (
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
                      Şampiyon: <strong style={{ color: 'var(--accent-secondary)' }}>{tour.champion}</strong> ♟️
                    </p>
                  )}
                  <p style={{ fontSize: '13px', margin: '10px 0 0 0', color: 'var(--text-secondary)' }}>
                    Etkinlik ve maçlar sona erdiği için kayıt iptali veya yeni kayıt yapılamaz. Nihai sıralama ve maç sonuçlarını İstatistikler & Arşiv sayfasından inceleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--text-primary)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏁🏆</div>
                  <p style={{ fontWeight: 800, fontSize: '17px', color: 'var(--accent-secondary)', margin: 0 }}>
                    Bu Etkinlik & Turnuva Tamamlandı!
                  </p>
                  {tour.champion && tour.champion !== 'Bekleniyor...' && (
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 0 0', color: 'var(--text-primary)' }}>
                      Şampiyon: <strong>{tour.champion}</strong> ♟️
                    </p>
                  )}
                  <p style={{ fontSize: '13px', margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
                    Etkinlik ve turnuva sona erdiği için yeni katılım kabul edilmemektedir. Sıralamayı ve fikstürü Arşiv sayfasından inceleyebilirsiniz.
                  </p>
                </div>
              )
            ) : !currentUser ? (
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
                  const displayName = reg.name || "Katılımcı";
                  const matchedUser = users?.find(u => String(u.id) === String(reg.userId));
                  const chessPlatform = reg.chessPlatform || matchedUser?.chessPlatform || 'chess.com';
                  const chessUsername = reg.chessUsername || matchedUser?.chessUsername;

                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.02)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{idx + 1}. {displayName}</div>
                        {chessUsername && (
                          <a
                            href={sanitizeUrl(chessPlatform === 'lichess' ? `https://lichess.org/@/${sanitizeChessUsername(chessUsername)}` : `https://www.chess.com/member/${sanitizeChessUsername(chessUsername)}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: chessPlatform === 'lichess' ? '#4b5563' : '#15803d',
                              background: chessPlatform === 'lichess' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontWeight: 600,
                              marginTop: '3px'
                            }}
                            title={`${chessPlatform === 'lichess' ? 'Lichess' : 'Chess.com'} Profiline Git`}
                          >
                            <span>{chessPlatform === 'lichess' ? '♘ Lichess:' : '♟️ Chess.com:'}</span>
                            <span>@{chessUsername} ↗</span>
                          </a>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>Aktif</span>
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
