import React, { useState } from 'react';

export default function Matchmaking({ currentUser, users = [], onGoToAuth, onUpdateProfile }) {
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('find'); // find, requests, matches
  const [searchTerm, setSearchTerm] = useState('');

  const [isLookingForMatch, setIsLookingForMatch] = useState(currentUser?.matchmakingSettings?.isActive || false);
  const [matchType, setMatchType] = useState(currentUser?.matchmakingSettings?.type || 'Farketmez (Online & Yüz Yüze)');
  const [availability, setAvailability] = useState(currentUser?.matchmakingSettings?.availability || 'Her Zaman Müsaitim');
  const [note, setNote] = useState(currentUser?.matchmakingSettings?.note || '');

  // Sadece matchmaking ayarı aktif olan ve gerçek kullanıcıları listele
  const availablePlayers = users.filter(u => {
    if (currentUser && String(u.id) === String(currentUser.id)) return false;
    return u.matchmakingSettings && u.matchmakingSettings.isActive === true;
  });

  const handleSaveStatus = async () => {
    if (!currentUser) return onGoToAuth();
    try {
      const formData = new FormData();
      const settings = { isActive: isLookingForMatch, type: matchType, availability, note };
      formData.append('matchmakingSettings', JSON.stringify(settings));
      
      const response = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        alert("Durumunuz başarıyla kaydedildi!");
        if (onUpdateProfile) {
           onUpdateProfile(data.user);
        }
      } else {
        alert(data.error || "Kaydedilemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Top Toggle & Settings Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: 'var(--panel-bg)', border: '1px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
            <input 
              type="checkbox" 
              checked={isLookingForMatch}
              onChange={(e) => setIsLookingForMatch(e.target.checked)}
              style={{ width: '40px', height: '24px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }} 
            />
            <span style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)' }}>Satranç Oynamak İstiyorum</span>
          </label>
        </div>
        
        {isLookingForMatch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px', animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <select 
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}>
                <option>Farketmez (Online & Yüz Yüze)</option>
                <option>Sadece Online</option>
                <option>Sadece Yüz Yüze</option>
              </select>
              <select 
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}>
                <option>Her Zaman Müsaitim</option>
                <option>Hafta Sonu Müsaitim</option>
                <option>Sadece Akşamları</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kısa bir not (Örn: Kadıköy civarı, Lichess 1500 vb.)" 
                style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontWeight: 500 }} 
              />
              <button 
                onClick={handleSaveStatus}
                style={{ padding: '0 32px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                Durumu Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
          SİSTEM NASIL ÇALIŞIR?
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '14px', fontWeight: 600 }}>
          <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '6px 12px', borderRadius: '20px' }}>1. Durumunu aç</span>
          <span style={{ color: 'var(--text-secondary)' }}>&gt;</span>
          <span style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '20px' }}>2. Filtreyle rakip bul</span>
          <span style={{ color: 'var(--text-secondary)' }}>&gt;</span>
          <span style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '20px' }}>3. Oyun isteği gönder</span>
          <span style={{ color: 'var(--text-secondary)' }}>&gt;</span>
          <span style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '20px' }}>4. Eşleş ve iletişime geç</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '16px' }}>
          Kabul edilen eşleşmelerde WhatsApp veya e-posta ile anında bağlantı kurabilirsiniz.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)' }}>
        <button 
          onClick={() => setActiveTab('find')}
          style={{ flex: 1, padding: '16px', background: activeTab === 'find' ? 'rgba(0,0,0,0.05)' : 'transparent', border: 'none', borderBottom: activeTab === 'find' ? '2px solid var(--accent-primary)' : 'none', color: activeTab === 'find' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-title)', cursor: 'pointer' }}>
          Oyuncu Bul
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ flex: 1, padding: '16px', background: activeTab === 'requests' ? 'rgba(0,0,0,0.05)' : 'transparent', border: 'none', borderBottom: activeTab === 'requests' ? '2px solid var(--accent-primary)' : 'none', color: activeTab === 'requests' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-title)', cursor: 'pointer' }}>
          İstekler
        </button>
        <button 
          onClick={() => setActiveTab('matches')}
          style={{ flex: 1, padding: '16px', background: activeTab === 'matches' ? 'rgba(0,0,0,0.05)' : 'transparent', border: 'none', borderBottom: activeTab === 'matches' ? '2px solid var(--accent-primary)' : 'none', color: activeTab === 'matches' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-title)', cursor: 'pointer' }}>
          Eşleşmeler
        </button>
      </div>

      {activeTab === 'find' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="İsim ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }} />
            <select style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}>
              <option>Tüm Oyun Türleri</option>
              <option>Online</option>
              <option>Yüz Yüze</option>
            </select>
            <select style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}>
              <option>Tüm Zamanlar</option>
              <option>Akşamları</option>
              <option>Hafta Sonu</option>
            </select>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {availablePlayers
              .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(p => (
              <div key={p.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', padding: '32px 24px', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
                {/* ELO Badge */}
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  {p.elo || 1500}
                </div>
                
                {/* Avatar */}
                <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: p.avatar ? 'transparent' : 'var(--gradient-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#fff', position: 'relative', border: p.avatar ? '2px solid var(--panel-border)' : 'none', overflow: 'hidden' }}>
                  {p.avatar ? (
                    <img src={p.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                  {/* Online Status Indicator could go here */}
                </div>
                
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</h3>
                
                {/* Preference Tags */}
                <div style={{ display: 'flex', gap: '8px', margin: '16px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderRadius: '16px', fontWeight: 700 }}>
                    {p.matchmakingSettings?.type === 'Sadece Online' ? 'Sadece Online' : p.matchmakingSettings?.type === 'Sadece Yüz Yüze' ? 'Sadece Yüz Yüze' : 'Online / Yüz Yüze'}
                  </span>
                  <span style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(0, 0, 0, 0.05)', color: 'var(--text-secondary)', borderRadius: '16px', fontWeight: 700 }}>
                    {p.matchmakingSettings?.availability === 'Hafta Sonu Müsaitim' ? 'Hafta Sonu' : p.matchmakingSettings?.availability === 'Sadece Akşamları' ? 'Akşamları' : 'Her Zaman'}
                  </span>
                </div>
                
                {/* Note */}
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '24px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  "{p.matchmakingSettings?.note || 'Satranç oynamak için rakip arıyor.'}"
                </p>

                <button 
                  onClick={() => currentUser ? alert('İstek gönderildi!') : onGoToAuth()}
                  style={{ width: '100%', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Oyun İsteği
                </button>
              </div>
            ))}
            
            {availablePlayers.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Sistemde henüz eşleşilecek başka oyuncu bulunmuyor.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Henüz gelen veya giden bir oyun isteğiniz bulunmuyor.</p>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Henüz kabul edilmiş bir eşleşmeniz bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}
