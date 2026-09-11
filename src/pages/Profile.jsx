import React, { useState, useMemo, useEffect, useRef } from 'react';

export default function Profile({ currentUser, registrations, tournaments, onUpdateProfile }) {
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats | history | settings
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    chessPlatform: currentUser?.chessPlatform || 'chess.com',
    chessUsername: currentUser?.chessUsername || '',
    bio: currentUser?.bio || 'Satranç tutkunu. OZDER etkinliklerine katılıyor.',
    avatarUrl: currentUser?.avatar || ''
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  
  // Create a ref for the hidden file input
  const fileInputRef = useRef(null);

  // currentUser güncellendiğinde local state'i senkronize et
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        chessPlatform: currentUser.chessPlatform || 'lichess',
        chessUsername: currentUser.chessUsername || '',
        bio: currentUser.bio || 'Satranç tutkunu. OZDER etkinliklerine katılıyor.',
        avatarUrl: currentUser.avatar || ''
      });
      setAvatarError(false);
    }
  }, [currentUser]);

  // Görseli canvas ile sıkıştırıp Base64 Data URL'e çeviren yardımcı fonksiyon
  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // WebP veya JPEG formatında hafif Base64 oluştur
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Fotoğraf seçildiği an otomatik olarak kaydedip yükleme
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya boyutu kontrolü (10MB üst sınır)
    if (file.size > 10 * 1024 * 1024) {
      alert("Lütfen 10 MB'dan küçük bir fotoğraf seçin.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setStatusMsg('Fotoğraf işleniyor ve yükleniyor...');

      // Optimize edilmiş Base64 görsel oluştur
      const base64Avatar = await compressImage(file, 400, 400, 0.88);

      // Doğrudan FormData ile sunucuya anında kaydet
      const formData = new FormData();
      formData.append('name', profileData.name || currentUser?.name || '');
      if (currentUser?.email) formData.append('email', currentUser.email);
      formData.append('phone', profileData.phone || currentUser?.phone || '');
      formData.append('chessUsername', profileData.chessUsername || currentUser?.chessUsername || '');
      formData.append('bio', profileData.bio || currentUser?.bio || '');
      formData.append('avatarUrl', base64Avatar);

      // Ayrıca dosyayı multipart olarak da ekle
      formData.append('avatarFile', file);

      await onUpdateProfile(formData);

      setProfileData(prev => ({ ...prev, avatarUrl: base64Avatar }));
      setStatusMsg('Profil fotoğrafınız başarıyla güncellendi ve kaydedildi! 🎉');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error("Fotoğraf yükleme hatası:", err);
      alert("Fotoğraf yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsUploadingAvatar(false);
      // Inputu sıfırla ki aynı fotoğrafı tekrar seçebilsin
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    try {
      setStatusMsg('Profil bilgileri güncelleniyor...');
      const formData = new FormData();
      formData.append('name', profileData.name);
      if (currentUser.email) formData.append('email', currentUser.email);
      formData.append('phone', profileData.phone);
      formData.append('chessPlatform', profileData.chessPlatform);
      formData.append('chessUsername', profileData.chessUsername);
      formData.append('bio', profileData.bio);
      if (profileData.avatarUrl) formData.append('avatarUrl', profileData.avatarUrl);

      await onUpdateProfile(formData);
      setStatusMsg('Profil başarıyla güncellendi! ✅');
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err) {
      setStatusMsg('Güncelleme sırasında hata oluştu.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordMsg({ type: 'error', text: 'Lütfen mevcut ve yeni şifrenizi girin.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Yeni şifreler birbiriyle uyuşmuyor.' });
      return;
    }

    if (passwordData.newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'Yeni şifreniz en az 4 karakter olmalıdır.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: data.message || 'Şifreniz başarıyla değiştirildi! ✅' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Şifre değiştirilemedi.' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Sunucuya bağlanılamadı.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {statusMsg && (
        <div style={{
          background: statusMsg.includes('hata') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: statusMsg.includes('hata') ? '#ef4444' : '#059669',
          border: `1px solid ${statusMsg.includes('hata') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>{statusMsg.includes('hata') ? '⚠️' : '✨'}</span>
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <section className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        flexWrap: 'wrap',
        background: 'var(--panel-bg)',
        border: '1px solid var(--accent-primary)'
      }}>
        <div 
          style={{ position: 'relative', cursor: isUploadingAvatar ? 'wait' : 'pointer' }} 
          onClick={() => !isUploadingAvatar && fileInputRef.current && fileInputRef.current.click()}
          title="Fotoğrafı Değiştirmek İçin Tıklayın"
        >
          {/* Avatar Cemberi */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: ((profileData.avatarUrl || currentUser.avatar) && !avatarError) ? 'transparent' : 'var(--gradient-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(217, 119, 6, 0.2)',
            overflow: 'hidden',
            border: ((profileData.avatarUrl || currentUser.avatar) && !avatarError) ? '2px solid var(--accent-primary)' : 'none',
            position: 'relative'
          }}>
            {((profileData.avatarUrl || currentUser.avatar) && !avatarError) ? (
              <img 
                src={profileData.avatarUrl || currentUser.avatar} 
                alt="" 
                onError={() => setAvatarError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
            )}

            {/* Yükleme veya Üzerine Gelme Efekti */}
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              background: isUploadingAvatar ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              opacity: isUploadingAvatar ? 1 : 0, 
              transition: 'opacity 0.2s',
              color: '#fff'
            }}
            onMouseEnter={(e) => { if (!isUploadingAvatar) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (!isUploadingAvatar) e.currentTarget.style.opacity = '0'; }}
            >
              {isUploadingAvatar ? (
                <span style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>⏳</span>
              ) : (
                <>
                  <span style={{ fontSize: '24px' }}>📷</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>DEĞİŞTİR</span>
                </>
              )}
            </div>
          </div>
          
          {/* Küçük Kamera İkonu (Her Zaman Görünür Rozet) */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            background: 'var(--accent-primary)',
            color: '#fff',
            border: '2px solid var(--panel-bg)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 10
          }}>
            <span style={{ fontSize: '14px' }}>📷</span>
          </div>
        </div>
        
        {/* Hidden File Input for Avatar - ALWAYS IN DOM */}
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{currentUser.name}</h2>
            {currentUser.username && (
              <span style={{ fontSize: '15px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                @{currentUser.username}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              📈 ELO: {currentUser.elo || 1500}
            </span>
            {currentUser.chessUsername && (
              <a
                href={currentUser.chessPlatform === 'lichess' ? `https://lichess.org/@/${currentUser.chessUsername}` : `https://www.chess.com/member/${currentUser.chessUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: currentUser.chessPlatform === 'lichess' ? 'rgba(107, 114, 128, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                  color: currentUser.chessPlatform === 'lichess' ? '#4b5563' : '#15803d',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title={`${currentUser.chessPlatform === 'lichess' ? 'Lichess' : 'Chess.com'} Profilini Aç`}
              >
                <span>{currentUser.chessPlatform === 'lichess' ? '♘ Lichess' : '♟️ Chess.com'}</span>
                <span>@{currentUser.chessUsername} ↗</span>
              </a>
            )}
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
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Bölüm 1: Profil Bilgilerini Düzenle */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              Profil Bilgilerini Düzenle
            </h3>

            {statusMsg && (
              <div style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', color: '#059669', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: 700 }}>
                {statusMsg}
              </div>
            )}

            <form onSubmit={handleUpdateInfo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Kullanıcı Adı (Salt Okunur / Değiştirilemez) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Kullanıcı Adı
                  </label>
                  <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
                    🔒 Kullanıcı adı değiştirilemez
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    @
                  </span>
                  <input
                    type="text"
                    disabled
                    value={currentUser.username || 'belirtilmemis'}
                    style={{ width: '100%', paddingLeft: '32px', background: 'rgba(0,0,0,0.04)', border: '1px solid var(--panel-border)', borderRadius: '8px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '12px', color: 'var(--text-secondary)', outline: 'none', fontWeight: 700, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>E-posta</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email || ''}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.04)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-secondary)', outline: 'none', fontWeight: 600, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Satranç Platformu ve Kullanıcı Adı (İsteğe Bağlı) */}
              <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Satranç Platformu & Kullanıcı Adı
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    İsteğe Bağlı
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                  <select
                    value={profileData.chessPlatform}
                    onChange={(e) => setProfileData({ ...profileData, chessPlatform: e.target.value })}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600, fontSize: '13px' }}
                  >
                    <option value="chess.com">Chess.com</option>
                    <option value="lichess">Lichess.org</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Satranç kullanıcı adınız (opsiyonel)"
                    value={profileData.chessUsername}
                    onChange={(e) => setProfileData({ ...profileData, chessUsername: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600, fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Profil fotoğrafınızı değiştirmek için yukarıdaki avatarınıza tıklayın.
                </p>
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

          <div style={{ height: '1px', background: 'var(--panel-border)' }} />

          {/* Bölüm 2: Şifre Değiştirme */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              🔒 Şifre Değiştir
            </h3>

            {passwordMsg.text && (
              <div style={{
                background: passwordMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${passwordMsg.type === 'error' ? '#ef4444' : 'var(--accent-primary)'}`,
                color: passwordMsg.type === 'error' ? '#ef4444' : 'var(--accent-primary)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: 600
              }}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Mevcut Şifre
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Yeni Şifre
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="En az 4 karakter"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Yeni Şifre (Tekrar)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Yeni şifrenizi doğrulayın"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={passwordLoading}
                className="btn-secondary" 
                style={{ justifyContent: 'center', marginTop: '4px', background: 'var(--accent-primary)', color: '#fff', border: 'none' }}
              >
                {passwordLoading ? 'Şifre Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
