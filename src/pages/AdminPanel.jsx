import React, { useState } from 'react';

export default function AdminPanel({ registrations, users = [], onRegisterUpdate, tournaments, onAddTournament }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Turnuva Form State'i
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: 'Ümraniye Tilda Cafe',
    fee: '300 TL',
    maxQuota: '20'
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (password.toLowerCase() === 'özder123' || password === 'admin') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Hatalı şifre! Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteUser = async (tournamentId, userId) => {
    if (!window.confirm("Bu katılımcı kaydını turnuvadan silmek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`/api/register/${tournamentId}/${userId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (response.ok) {
        onRegisterUpdate(result.registrations);
      } else {
        alert(result.error || "Silme işlemi başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (response.ok) {
        setStatusMsg({ type: 'success', text: 'Yeni etkinlik başarıyla oluşturuldu ve yayınlandı!' });
        onAddTournament(result.tournaments);
        setFormData({
          title: '',
          date: '',
          time: '',
          location: 'Ümraniye Tilda Cafe',
          fee: '300 TL',
          maxQuota: '20'
        });
      } else {
        setStatusMsg({ type: 'error', text: result.error || 'Hata oluştu.' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Sunucu bağlantı hatası.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>
          🔐 Yönetici Girişi
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Yönetici paneline erişmek için lütfen şifrenizi girin.
        </p>

        {authError && (
          <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="password"
            required
            placeholder="Giriş Şifresi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              outline: 'none',
              textAlign: 'center'
            }}
          />
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800 }}>
            👑 özder Yönetim Paneli
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Katılımcı listelerini yönetin ve yeni satranç etkinlikleri oluşturun.
          </p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          Güvenli Çıkış
        </button>
      </section>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px'
      }}>
        
        {/* Left Column: Registered Users */}
        <div className="glass-panel" style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700 }}>
            👥 Etkinlik Katılımcı Kayıtları ({registrations.length})
          </h3>

          {registrations.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Henüz kayıtlı katılımcı bulunmuyor.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 8px' }}>Katılımcı / Hesap</th>
                    <th style={{ padding: '12px 8px' }}>Turnuva</th>
                    <th style={{ padding: '12px 8px' }}>Telefon</th>
                    <th style={{ padding: '12px 8px', textRight: 'true' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => {
                    const matchedUser = users.find(u => u.id === reg.userId) || { name: "Bilinmeyen Üye", phone: "-", chessUsername: "-" };
                    const matchedTour = tournaments.find(t => t.id === reg.tournamentId) || { title: `Turnuva #${reg.tournamentId}` };

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{matchedUser.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>@{matchedUser.chessUsername}</div>
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--accent-secondary)', fontWeight: 500 }}>{matchedTour.title}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{matchedUser.phone}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <button 
                            onClick={() => handleDeleteUser(reg.tournamentId, reg.userId)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Create Tournament */}
        <div className="glass-panel" style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
            📢 Yeni Etkinlik Oluştur
          </h3>

          {statusMsg.text && (
            <div style={{
              background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMsg.type === 'success' ? 'var(--accent-primary)' : '#ef4444'}`,
              color: statusMsg.type === 'success' ? 'var(--accent-primary)' : '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              fontWeight: 500
            }}>
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Etkinlik Başlığı *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: 2. Tilda Cafe Hızlı Satranç Turnuvası"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Tarih *
                </label>
                <input
                  type="text"
                  required
                  placeholder="15.08.2026"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Saat *
                </label>
                <input
                  type="text"
                  required
                  placeholder="15:00"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                  padding: '10px 12px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Katılım Ücreti
                </label>
                <input
                  type="text"
                  placeholder="300 TL"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                    padding: '10px 12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
              {loading ? 'Oluşturuluyor...' : 'Etkinlik Yayınla'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
