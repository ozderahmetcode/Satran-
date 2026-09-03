import React, { useState, useMemo } from 'react';

export default function Profile({ currentUser, registrations, tournaments, onUpdateProfile }) {
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats | history | settings
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    chessUsername: currentUser?.chessUsername || '',
    bio: currentUser?.bio || 'Satranç tutkunu. OZDER etkinliklerine katılıyor.',
    avatarUrl: currentUser?.avatar || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Create a ref for the hidden file input
  const fileInputRef = React.useRef(null);
  
  // Local preview URL
  const previewUrl = avatarFile ? URL.createObjectURL(avatarFile) : null;

  // -------------------- STATS CALCULATION --------------------
  const stats = useMemo(() => {
    if (!currentUser) return null;
    const uid = String(currentUser.id);

    let gamesPlayed = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;

    let whiteGames = 0;
    let whiteWins = 0;
    let blackGames = 0;
    let blackWins = 0;

    const opponents = {}; // { opponentId: { name: '', matches: 0, wins: 0, losses: 0 } }

    tournaments.forEach(t => {
      t.rounds?.forEach(r => {
        r.pairings?.forEach(p => {
          const isWhite = String(p.whiteId) === uid;
          const isBlack = String(p.blackId) === uid;
          
          if (!isWhite && !isBlack) return;
          if (p.result === 'pending') return;

          gamesPlayed++;

          let myResult = ''; // 'win', 'loss', 'draw'
          if (p.result === 'draw') {
            draws++;
            myResult = 'draw';
          } else if ((isWhite && p.result === 'white') || (isBlack && p.result === 'black')) {
            wins++;
            myResult = 'win';
            if (isWhite) whiteWins++;
            if (isBlack) blackWins++;
          } else {
            losses++;
            myResult = 'loss';
          }

          if (isWhite) whiteGames++;
          if (isBlack) blackGames++;

          // Ezelî rakip analizi (Eğer rakip ID varsa ve null değilse)
          const oppId = isWhite ? p.blackId : p.whiteId;
          if (oppId) {
            if (!opponents[oppId]) {
              opponents[oppId] = { matches: 0, wins: 0, losses: 0, name: 'Bilinmeyen' };
            }
            opponents[oppId].matches++;
            if (myResult === 'win') opponents[oppId].wins++;
            if (myResult === 'loss') opponents[oppId].losses++;
          }
        });
      });
    });

    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const whiteWinRate = whiteGames > 0 ? Math.round((whiteWins / whiteGames) * 100) : 0;
    const blackWinRate = blackGames > 0 ? Math.round((blackWins / blackGames) * 100) : 0;

    // Ezelî rakip (en çok maç yapılan)
    let archenemy = null;
    let maxOpponentMatches = 0;
    Object.keys(opponents).forEach(oid => {
      if (opponents[oid].matches > maxOpponentMatches) {
        maxOpponentMatches = opponents[oid].matches;
        archenemy = { id: oid, ...opponents[oid] };
      }
    });

    // Korkulu rüya (en çok mağlup olunan)
    let nightmare = null;
    let maxLosses = 0;
    Object.keys(opponents).forEach(oid => {
      if (opponents[oid].losses > maxLosses) {
        maxLosses = opponents[oid].losses;
        nightmare = { id: oid, ...opponents[oid] };
      }
    });

    return {
      gamesPlayed, wins, draws, losses, winRate,
      whiteGames, whiteWinRate,
      blackGames, blackWinRate,
      archenemy, nightmare
    };
  }, [currentUser, tournaments]);
  // -----------------------------------------------------------

  if (!currentUser) {
    return (
      <div className="glass-panel text-center" style={{ margin: '80px auto', maxWidth: '400px' }}>
        <h3>Oturum Açılmadı</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Profilinizi görüntülemek için lütfen giriş yapın.</p>
      </div>
    );
  }

  // Oyuncunun katıldığı turnuvaları filtreleme
  const myRegistrations = registrations.filter(r => String(r.userId) === String(currentUser.id));
  const myTournaments = tournaments.filter(t => myRegistrations.some(r => r.tournamentId === t.id));

  // Şampiyonluk sayıları hesaplama
  const championshipCount = tournaments.filter(t => String(t.champion) === String(currentUser.name)).length; // Basit isim eşleşmesi geçici çözüm. Geliştirilebilir.

  const handleUpdateInfo = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', profileData.name);
    formData.append('phone', profileData.phone);
    formData.append('chessUsername', profileData.chessUsername);
    formData.append('bio', profileData.bio);
    if (profileData.avatarUrl) formData.append('avatarUrl', profileData.avatarUrl);
    if (avatarFile) formData.append('avatarFile', avatarFile);

    onUpdateProfile(formData);
    setStatusMsg('Profil bilgileri güncelleniyor...');
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
        background: 'var(--panel-bg)',
        border: '1px solid var(--accent-primary)'
      }}>
        {/* Avatar */}
        <div 
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: (previewUrl || currentUser.avatar) ? 'transparent' : 'var(--gradient-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(217, 119, 6, 0.2)',
          overflow: 'hidden',
          border: (previewUrl || currentUser.avatar) ? '2px solid var(--accent-primary)' : 'none',
          cursor: 'pointer',
          position: 'relative'
        }}>
          {(previewUrl || currentUser.avatar) ? (
            <img src={previewUrl || currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            currentUser.name.charAt(0).toUpperCase()
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', ':hover': { opacity: 1 } }}>
             <span style={{ fontSize: '24px' }}>📷</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{currentUser.name}</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              📈 ELO: {currentUser.elo || 1500}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
              ♟️ {myTournaments.length} Turnuva
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
              🎮 {stats?.gamesPlayed || 0} Maç
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px', fontStyle: 'italic' }}>
            "{profileData.bio}"
          </p>
        </div>

        {/* Medals Standings */}
        <div style={{ display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.02)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>🥇</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#d97706' }}>{championshipCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>ŞAMPİYON</div>
          </div>
        </div>
      </section>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'stats', label: '📊 İstatistikler' },
          { id: 'history', label: '🕰️ Turnuva Geçmişi' },
          { id: 'settings', label: '⚙️ Ayarlar' }
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>GENEL PERFORMANS</h5>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '36px', color: 'var(--accent-primary)', lineHeight: 1 }}>%{stats.winRate}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>Kazanma Oranı</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                  <div style={{ color: '#059669' }}>Kazanılan: {stats.wins}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>Berabere: {stats.draws}</div>
                  <div style={{ color: '#dc2626' }}>Kaybedilen: {stats.losses}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>RENK ANALİZİ</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', fontSize: '14px', fontWeight: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚪ Beyaz (W: {stats.whiteWinRate}%)</span>
                  <span>{stats.whiteGames} Maç</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.whiteWinRate}%`, height: '100%', background: 'var(--accent-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span>⚫ Siyah (W: {stats.blackWinRate}%)</span>
                  <span>{stats.blackGames} Maç</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.blackWinRate}%`, height: '100%', background: 'var(--accent-secondary)' }} />
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>EZELİ RAKİP</h5>
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginTop: '12px', fontWeight: 800 }}>
                {stats.archenemy ? `Rakip ID: ${stats.archenemy.id.substring(0,6)}...` : 'Bekleniyor'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                {stats.archenemy ? `Toplam Maç: ${stats.archenemy.matches} (W: ${stats.archenemy.wins}, L: ${stats.archenemy.losses})` : 'Yeterli veri yok'}
              </p>
            </div>

            <div className="glass-panel">
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>KORKULU RÜYA</h5>
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginTop: '12px', fontWeight: 800 }}>
                {stats.nightmare ? `Rakip ID: ${stats.nightmare.id.substring(0,6)}...` : 'Henüz Yok'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                {stats.nightmare ? `Kaybedilen Maç: ${stats.nightmare.losses}` : 'Seri mağlubiyet yok'}
              </p>
            </div>
          </div>
          
        </div>
      )}

      {/* Tab Content: History */}
      {activeSubTab === 'history' && (
        <div className="glass-panel animate-fade-in">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
            Turnuva Geçmişi
          </h3>
          {myTournaments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Henüz hiçbir turnuvaya katılmadınız.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myTournaments.map(tour => (
                <div key={tour.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <h4 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{tour.title}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>📅 {tour.date} • 📍 {tour.location}</p>
                  </div>
                  <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
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
            <div style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', color: '#059669', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: 700 }}>
              {statusMsg}
            </div>
          )}

          <form onSubmit={handleUpdateInfo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Ad Soyad</label>
              <input
                type="text"
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Telefon</label>
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
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Satranç Kullanıcı Adı (Lichess/Chess.com)</label>
                <input
                  type="text"
                  required
                  value={profileData.chessUsername}
                  onChange={(e) => setProfileData({ ...profileData, chessUsername: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Profil Fotoğrafı (Dosya Seç)</label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => setAvatarFile(e.target.files[0])}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600, display: 'none' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Cihazınızdan bir resim dosyası seçin. Yeni resim yüklendiğinde eski resim değişecektir.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Hakkımda</label>
              <textarea
                rows="3"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontWeight: 600 }}
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
