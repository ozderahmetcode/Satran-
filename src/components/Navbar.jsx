import React, { useState } from 'react';

// Paylaştığınız logoyu temsil eden özgün SVG Logo Bileşeni
export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 15C52.2091 15 54 13.2091 54 11C54 8.79086 52.2091 7 50 7C47.7909 7 46 8.79086 46 11C46 13.2091 47.7909 15 50 15Z" fill="var(--text-secondary)" />
        <path d="M68 35C68 28.3726 62.6274 23 56 23H44C37.3726 23 32 28.3726 32 35C32 40.0779 35.148 44.421 39.596 46.18C42.84 47.464 45.452 49.972 47 53.136V58H53V53.136C54.548 49.972 57.16 47.464 60.404 46.18C64.852 44.421 68 40.0779 68 35Z" fill="url(#chessGradient)" />
        <path d="M30 63H70V67H30V63Z" fill="var(--accent-primary)" />
        <path d="M25 72H75V78C75 80.2091 73.2091 82 71 82H29C26.7909 82 25 80.2091 25 78V72Z" fill="url(#chessGradient)" />
        <circle cx="50" cy="35" r="3" fill="#07090e" />
        <circle cx="44" cy="42" r="2.5" fill="#07090e" />
        <circle cx="56" cy="42" r="2.5" fill="#07090e" />
        <defs>
          <linearGradient id="chessGradient" x1="25" y1="23" x2="75" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{
          fontFamily: 'var(--font-title)',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '1px',
          color: 'var(--text-primary)'
        }}>OZDER</span>
        <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '2px' }}>SATRANÇ</span>
      </div>
    </div>
  );
}

export default function Navbar({ currentPage, setCurrentPage, currentUser, onLogout }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mainLinks = [
    { id: 'home', label: 'Ana Sayfa' },
    { id: 'event', label: 'Etkinlikler' },
    { id: 'database', label: 'Satranç Veritabanı' },
    { id: 'matchmaking', label: 'Satranç Eşlendirme' },
    { id: 'faq', label: 'Merak Edilenler' },
    { id: 'contact', label: 'İletişim' }
  ];

  return (
    <nav style={{
      background: 'var(--panel-bg)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--panel-border)',
      padding: '14px 0'
    }}>
      <div className="container navbar-container" style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center'
      }}>
        {/* Sol: Logo */}
        <div onClick={() => { setCurrentPage('home'); setIsDrawerOpen(false); }} style={{ cursor: 'pointer', justifySelf: 'start' }}>
          <Logo />
        </div>

        {/* Orta: Masaüstü Menü Linkleri (Mobilde CSS ile Gizlenecek) */}
        <div className="desktop-nav" style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {mainLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentPage(item.id); setIsDrawerOpen(false); }}
              style={{
                background: 'none',
                border: 'none',
                color: currentPage === item.id ? 'var(--accent-secondary)' : 'var(--text-primary)',
                fontFamily: 'var(--font-title)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                position: 'relative',
                padding: '6px 0'
              }}
            >
              {item.label}
              {currentPage === item.id && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--gradient-gold)',
                  borderRadius: '2px'
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Sağ: Profil İkonu */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          style={{
            background: currentUser?.avatar ? 'transparent' : 'rgba(0,0,0,0.05)',
            border: '1px solid var(--panel-border)',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: currentUser?.avatar ? 'inherit' : '18px',
            fontWeight: 700,
            transition: 'border-color 0.2s',
            justifySelf: 'end',
            padding: 0,
            overflow: 'hidden'
          }}
        >
          {currentUser ? (
            currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )
          ) : (
            '👤'
          )}
        </button>
      </div>

      {/* Sağdan Açılan Çekmece Arayüzü */}
      {isDrawerOpen && (
        <>
          <div 
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 998,
              backdropFilter: 'blur(4px)'
            }}
          />

          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '320px',
            background: '#ffffff',
            borderLeft: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
            zIndex: 999,
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '20px', color: 'var(--text-primary)' }}>Hesap & Menü</span>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                >
                  ✕
                </button>
              </div>

              {currentUser ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '28px', marginBottom: '24px', textAlign: 'center' }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: currentUser.avatar ? 'transparent' : 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.2)'
                  }}>
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '16px' }}>@{currentUser.chessUsername}</div>
                  
                  <button
                    onClick={() => { setCurrentPage('profile'); setIsDrawerOpen(false); }}
                    style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', padding: '12px 20px', width: '100%', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                  >
                    Profilimi Görüntüle <span style={{ fontSize: '16px' }}>👤</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Turnuvalara kaydolmak için giriş yapın.</p>
                  <button 
                    onClick={() => { setCurrentPage('auth'); setIsDrawerOpen(false); }}
                    className="btn-primary" 
                    style={{ justifyContent: 'center' }}
                  >
                    Giriş Yap / Üye Ol
                  </button>
                </div>
              )}

              {/* Mobil Menü Linkleri (Sadece Mobilde Görünecek) */}
              <div className="mobile-nav-links" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hızlı Menü</span>
                {mainLinks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentPage(item.id); setIsDrawerOpen(false); }}
                    style={{
                      background: currentPage === item.id ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                      border: 'none',
                      color: currentPage === item.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '15px',
                      fontWeight: currentPage === item.id ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      transition: 'background 0.2s, color 0.2s'
                    }}
                    onMouseEnter={(e) => { if (currentPage !== item.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                    onMouseLeave={(e) => { if (currentPage !== item.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Yönetici Girişi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button
                  onClick={() => { setCurrentPage('admin'); setIsDrawerOpen(false); }}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>👑</span>
                    <span>Yönetici Paneli</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', background: 'rgba(2, 132, 199, 0.1)', padding: '4px 8px', borderRadius: '12px', fontWeight: 700 }}>Yetkili</span>
                </button>
              </div>
            </div>

            {currentUser && (
              <button 
                onClick={() => { onLogout(); setIsDrawerOpen(false); }}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.05)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  color: '#ef4444',
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  marginTop: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                  e.currentTarget.style.color = '#ef4444';
                }}
              >
                Oturumu Kapat
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
