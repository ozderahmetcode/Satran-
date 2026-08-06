import React, { useState } from 'react';

export default function Profile({ currentUser, registrations, tournaments, onUpdateProfile }) {
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats | history | settings
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    chessUsername: currentUser?.chessUsername || '',
    bio: 'Satranç tutkunu. Ümraniye Tilda Cafe buluşmalarına katılıyor.'
  });
  const [passwordData, setPasswordData] = useState({ current: '', next: '', confirm: '' });
  const [statusMsg, setStatusMsg] = useState('');

  if (!currentUser) {
    return (
      <div className="glass-panel text-center" style={{ margin: '80px auto', maxWidth: '400px' }}>
        <h3>Oturum Açılmadı</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Profilinizi görüntülemek için lütfen giriş yapın.</p>
      </div>
    );
  }

  // Oyuncunun katıldığı turnuvaları filtreleme
  const myRegistrations = registrations.filter(r => r.userId === currentUser.id);
  const myTournaments = tournaments.filter(t => myRegistrations.some(r => r.tournamentId === t.id));

  // Şampiyonluk sayıları hesaplama
  const championshipCount = tournaments.filter(t => t.champion === currentUser.name).length;

  const handleUpdateInfo = (e) => {
    e.preventDefault();
    onUpdateProfile(profileData);
    setStatusMsg('Profil bilgileri başarıyla güncellendi!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Profile Header Card */}
      <section className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(13, 18, 30, 0.9) 0%, rgba(245, 158, 11, 0.05) 100%)'
      }}>
        {/* Avatar */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'var(--gradient-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)'
        }}>
          {currentUser.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800 }}>{currentUser.name}</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              📈 ELO: {currentUser.elo || 1500}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              ♟️ {myTournaments.length} Turnuva Katılımı
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px', fontStyle: 'italic' }}>
            "{profileData.bio}"
          </p>
        </div>

        {/* Medals Standings */}
        <div style={{ display: 'flex', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>🥇</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#f59e0b' }}>{championshipCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ŞAMPİYONLUK</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--panel-border)', paddingLeft: '20px' }}>
            <div style={{ fontSize: '24px' }}>🥈</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-secondary)' }}>0</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>İKİNCİLİK</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--panel-border)', paddingLeft: '20px' }}>
            <div style={{ fontSize: '24px' }}>🥉</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#b45309' }}>0</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ÜÇÜNCÜLÜK</div>
          </div>
        </div>
      </section>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'stats', label: '📊 İstatistikler' },
          { id: 'history', label: '🕰️ Turnuva Geçmişi' },
          { id: 'settings', label: '⚙️ Profil Ayarları' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id); setStatusMsg(''); }}
            className={activeSubTab === tab.id ? "btn-primary" : "btn-secondary"}
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Stats */}
      {activeSubTab === 'stats' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* ELO Development chart mock */}
          <div className="glass-panel">
            <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, marginBottom: '16px' }}>ELO GELİŞİM GRAFİĞİ</h4>
            <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8%', paddingBottom: '20px', borderBottom: '2px solid rgba(255,255,255,0.05)', position: 'relative' }}>
              <div style={{ height: '50%', width: '10%', background: 'var(--accent-primary)', opacity: 0.7, borderRadius: '4px 4px 0 0' }} />
              <div style={{ height: '55%', width: '10%', background: 'var(--accent-primary)', opacity: 0.7, borderRadius: '4px 4px 0 0' }} />
              <div style={{ height: '70%', width: '10%', background: 'var(--accent-primary)', opacity: 0.7, borderRadius: '4px 4px 0 0' }} />
              <div style={{ height: '65%', width: '10%', background: 'var(--accent-primary)', opacity: 0.7, borderRadius: '4px 4px 0 0' }} />
              <div style={{ height: '85%', width: '10%', background: 'var(--accent-secondary)', borderRadius: '4px 4px 0 0' }} />
              <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>Güncel: {currentUser.elo || 1500} ELO</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <span>Turnuva #1</span>
              <span>Turnuva #2</span>
              <span>Turnuva #3</span>
              <span>Turnuva #4</span>
              <span>Turnuva #5 (Son)</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>KAZANMA ORANI</h5>
              <h3 style={{ fontSize: '28px', color: 'var(--accent-primary)', marginTop: '8px' }}>%52</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Dengeli performans</p>
            </div>
            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>RENK ANALİZİ</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
                <div>⚪ Beyaz: %50</div>
                <div>⚫ Siyah: %54</div>
              </div>
            </div>
            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>EZELİ RAKİP</h5>
              <h3 style={{ fontSize: '20px', color: '#fff', marginTop: '8px' }}>Bekleniyor</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Karşılaşma kaydı yok</p>
            </div>
            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>KORKULU RÜYA</h5>
              <h3 style={{ fontSize: '20px', color: '#fff', marginTop: '8px' }}>Henüz Yok</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Mağlubiyet serisi bulunmuyor</p>
            </div>
          </div>

        </div>
      )}

      {/* Tab Content: History */}
      {activeSubTab === 'history' && (
        <div className="glass-panel animate-fade-in">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
            Buluşma Katılım Kayıtlarınız
          </h3>
          {myTournaments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Henüz hiçbir turnuvaya kayıt olmadınız.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myTournaments.map(tour => (
                <div key={tour.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <h4 style={{ fontWeight: 700 }}>{tour.title}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>📅 {tour.date} • 🕒 {tour.time} • 📍 {tour.location}</p>
                  </div>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                    Kayıtlı
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Settings */}
      {activeSubTab === 'settings' && (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
            Profil Bilgilerini Düzenle
          </h3>

          {statusMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
              {statusMsg}
            </div>
          )}

          <form onSubmit={handleUpdateInfo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ad Soyad</label>
              <input
                type="text"
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Telefon</label>
                <input
                  type="text"
                  required
                  value={profileData.phone}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, '');
                    if (onlyNums.length <= 11) {
                      setProfileData({ ...profileData, phone: onlyNums });
                    }
                  }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Chess/Lichess Adı</label>
                <input
                  type="text"
                  required
                  value={profileData.chessUsername}
                  onChange={(e) => setProfileData({ ...profileData, chessUsername: e.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Biyografi</label>
              <textarea
                rows="3"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none', resize: 'none' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              Değişiklikleri Kaydet
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
