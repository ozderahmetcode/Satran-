import React, { useState } from 'react';

export default function Matchmaking({ currentUser, users = [], onGoToAuth }) {
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('find'); // find, requests, matches
  const [searchTerm, setSearchTerm] = useState('');

  // Sadece gerçek kullanıcıları listele, giriş yapmış kullanıcıyı hariç tut
  const availablePlayers = users.filter(u => !currentUser || String(u.id) !== String(currentUser.id));


  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Top Toggle */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
          <input type="checkbox" style={{ width: '24px', height: '24px', accentColor: 'var(--accent-primary)' }} />
          <span style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '18px' }}>Satranç Oynamak İstiyorum</span>
        </label>
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
              <div key={p.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', padding: '30px 20px' }}>
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {p.elo || 1500}
                </div>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--gradient-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#fff', position: 'relative' }}>
                  {p.avatar ? (
                    <img src={p.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                  <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '14px', height: '14px', background: '#10b981', borderRadius: '50%', border: '2px solid #fff' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700 }}>{p.name}</h3>
                
                <div style={{ display: 'flex', gap: '8px', margin: '12px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(217,119,6,0.1)', color: 'var(--accent-secondary)', borderRadius: '12px', fontWeight: 600 }}>Satranç Oyuncusu</span>
                </div>
                
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '20px', minHeight: '40px' }}>
                  "{p.bio || 'Satranç tutkunu. OZDER etkinliklerine katılıyor.'}"
                </p>

                <button 
                  onClick={() => currentUser ? alert('İstek gönderildi!') : onGoToAuth()}
                  style={{ width: '100%', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
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
