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

        {/* Sağ: Profil İkonu & Dropdown */}
        <div style={{ position: 'relative' }}>
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

          {/* Profil Dropdown (Dark Theme) */}
          {isDrawerOpen && (
            <>
              {/* Invisible Backdrop for click-outside */}
              <div 
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99998
                }}
              />
              
              <div style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '260px',
                background: '#111111',
                borderRadius: '8px',
                border: '1px solid #2a2a2a',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 99999,
                padding: '12px 0',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}>
                <style>{`
                  @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  .dark-menu-item {
                    display: flex;
                    alignItems: center;
                    gap: 12px;
                    padding: 10px 16px;
                    background: transparent;
                    border: none;
                    color: #e5e5e5;
                    font-size: 14px;
                    text-align: left;
                    cursor: pointer;
                    width: 100%;
                    font-family: inherit;
                  }
                  .dark-menu-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                  }
                `}</style>
                
                {currentUser ? (
                  <>
                    <div style={{ padding: '0 16px 12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #2a2a2a', marginBottom: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: currentUser.avatar ? 'transparent' : '#f3e8ff',
                        color: '#9333ea',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        overflow: 'hidden'
                      }}>
                        {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          currentUser.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {currentUser.email || (currentUser.chessUsername + "@lichess.org")}
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => { setCurrentPage('profile'); setIsDrawerOpen(false); }} className="dark-menu-item">
                      <span style={{ fontSize: '16px' }}>⚙️</span> Account settings
                    </button>
                    
                    {/* Admin Item */}
                    <button onClick={() => { setCurrentPage('admin'); setIsDrawerOpen(false); }} className="dark-menu-item" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: '16px' }}>👑</span> Yönetici Paneli
                      </div>
                      <span style={{ fontSize: '18px', color: '#666' }}>›</span>
                    </button>

                    {/* Placeholder for Theme as requested by screenshot match */}
                    <button onClick={() => {}} className="dark-menu-item" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: '16px' }}>🖥️</span> Theme
                      </div>
                      <span style={{ fontSize: '18px', color: '#666' }}>›</span>
                    </button>
                    
                    <div style={{ height: '1px', background: '#2a2a2a', margin: '8px 0' }} />
                    
                    <button onClick={() => { onLogout(); setIsDrawerOpen(false); }} className="dark-menu-item">
                      <span style={{ fontSize: '16px', transform: 'scaleX(-1)', display: 'inline-block' }}>🚪</span> Sign out
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '0 16px' }}>
                    <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>Giriş yapmadınız.</p>
                    <button onClick={() => { setCurrentPage('auth'); setIsDrawerOpen(false); }} style={{ width: '100%', padding: '10px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>


    </nav>
  );
}
