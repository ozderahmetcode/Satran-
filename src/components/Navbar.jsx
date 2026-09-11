import React, { useState, useEffect } from 'react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.avatar]);

  const mainLinks = [
    { id: 'home', label: 'Ana Sayfa', icon: '🏠' },
    { id: 'event', label: 'Etkinlikler', icon: '🏆' },
    { id: 'database', label: 'İstatistikler & Arşiv', icon: '📊' },
    { id: 'matchmaking', label: 'Rakip Bul', icon: '⚔️' },
    { id: 'faq', label: 'Merak Edilenler', icon: '❓' },
    { id: 'contact', label: 'İletişim', icon: '📞' }
  ];

  const handleNavClick = (pageId) => {
    setCurrentPage(pageId);
    setIsDrawerOpen(false);
    setIsMobileMenuOpen(false);
  };

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
        <div onClick={() => handleNavClick('home')} style={{ cursor: 'pointer', justifySelf: 'start' }}>
          <Logo />
        </div>

        {/* Orta: Masaüstü Menü Linkleri (992px ve altında CSS ile gizlenir) */}
        <div className="desktop-nav" style={{
          display: 'flex',
          gap: '28px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {mainLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
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

        {/* Sağ: İkonlar (Profil İkonu & Mobil Menü Hamburger Butonu) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          
          {/* Mobil Menü Hamburger Butonu (992px ve altı telefon/tabletler için) */}
          <button
            className="mobile-menu-btn"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsDrawerOpen(false);
            }}
            aria-label="Mobil Menüyü Aç"
            style={{
              background: isMobileMenuOpen ? 'rgba(14, 165, 233, 0.12)' : 'rgba(0,0,0,0.04)',
              border: '1px solid var(--panel-border)',
              borderRadius: '10px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '20px',
              fontWeight: 800,
              transition: 'all 0.2s ease'
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Profil İkonu Button */}
          <button
            onClick={() => {
              setIsDrawerOpen(!isDrawerOpen);
              setIsMobileMenuOpen(false);
            }}
            style={{
              background: (currentUser?.avatar && !avatarError) ? 'transparent' : 'rgba(0,0,0,0.05)',
              border: '1px solid var(--panel-border)',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: (currentUser?.avatar && !avatarError) ? 'inherit' : '18px',
              fontWeight: 700,
              transition: 'border-color 0.2s',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {currentUser ? (
              (currentUser.avatar && !avatarError) ? (
                <img 
                  src={currentUser.avatar} 
                  alt="" 
                  onError={() => setAvatarError(true)} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
              )
            ) : (
              '👤'
            )}
          </button>

          {/* Profil Dropdown */}
          {isDrawerOpen && (
            <>
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
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid var(--panel-border)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
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
                  .user-menu-item {
                    display: flex;
                    alignItems: center;
                    gap: 12px;
                    padding: 10px 16px;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-size: 14px;
                    font-weight: 600;
                    text-align: left;
                    cursor: pointer;
                    width: 100%;
                    font-family: var(--font-body);
                    transition: all 0.15s ease;
                  }
                  .user-menu-item:hover {
                    background: rgba(14, 165, 233, 0.08);
                    color: var(--accent-primary);
                  }
                `}</style>
                
                {currentUser ? (
                  <>
                    <div style={{ padding: '0 16px 12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--panel-border)', marginBottom: '8px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: (currentUser.avatar && !avatarError) ? 'transparent' : 'var(--gradient-gold)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.08)'
                      }}>
                        {currentUser.avatar && !avatarError ? (
                          <img 
                            src={currentUser.avatar} 
                            alt="" 
                            onError={() => setAvatarError(true)} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
                        )}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontFamily: 'var(--font-title)' }}>
                          {currentUser.username ? `@${currentUser.username}` : (currentUser.email || currentUser.name)}
                        </div>
                        {currentUser.username && currentUser.email && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {currentUser.email}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button onClick={() => handleNavClick('profile')} className="user-menu-item">
                      <span style={{ fontSize: '16px' }}>⚙️</span> Hesap Ayarları
                    </button>
                    
                    <button onClick={() => handleNavClick('admin')} className="user-menu-item" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: '16px' }}>👑</span> Yönetici Paneli
                      </div>
                      <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>›</span>
                    </button>
                    
                    <div style={{ height: '1px', background: 'var(--panel-border)', margin: '8px 0' }} />
                    
                    <button onClick={() => { onLogout(); setIsDrawerOpen(false); }} className="user-menu-item" style={{ color: '#ef4444' }}>
                      <span style={{ fontSize: '16px', transform: 'scaleX(-1)', display: 'inline-block' }}>🚪</span> Çıkış Yap
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '8px 16px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>Giriş yapmadınız.</p>
                    <button 
                      onClick={() => handleNavClick('auth')} 
                      className="btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', fontSize: '13px', marginBottom: '8px' }}
                    >
                      Giriş Yap / Kayıt Ol
                    </button>

                    <div style={{ height: '1px', background: 'var(--panel-border)', margin: '10px 0' }} />

                    <button 
                      onClick={() => handleNavClick('admin')} 
                      className="user-menu-item" 
                      style={{ 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        background: 'rgba(217, 119, 6, 0.08)', 
                        border: '1px solid rgba(217, 119, 6, 0.25)', 
                        color: '#b45309', 
                        justifyContent: 'space-between',
                        fontWeight: 700
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>👑</span>
                        <span>Yönetici Girişi</span>
                      </div>
                      <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>›</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOBİL GEZİNTİ ÇEKMECESİ (Mobil & Tablet cihazlar için tam ekran genişliğinde açılır menü) */}
      {isMobileMenuOpen && (
        <>
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 99990
            }}
          />

          <div 
            className="mobile-nav-drawer"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#ffffff',
              borderBottom: '1px solid var(--panel-border)',
              boxShadow: '0 20px 30px rgba(0,0,0,0.15)',
              zIndex: 99995,
              padding: '16px 24px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'slideDownMobile 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <style>{`
              @keyframes slideDownMobile {
                from { opacity: 0; transform: translateY(-12px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .mobile-link-btn {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 12px 16px;
                background: rgba(248, 250, 252, 0.8);
                border: 1px solid var(--panel-border);
                border-radius: 10px;
                color: var(--text-primary);
                font-family: var(--font-title);
                font-size: 15px;
                font-weight: 600;
                text-align: left;
                cursor: pointer;
                width: 100%;
                transition: all 0.2s ease;
              }
              .mobile-link-btn.active {
                background: rgba(14, 165, 233, 0.1);
                border-color: var(--accent-primary);
                color: var(--accent-primary);
                font-weight: 700;
              }
            `}</style>

            {mainLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`mobile-link-btn ${currentPage === item.id ? 'active' : ''}`}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            {!currentUser && (
              <button
                onClick={() => handleNavClick('auth')}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px', padding: '14px', fontSize: '15px' }}
              >
                🔑 Giriş Yap / Kayıt Ol
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
