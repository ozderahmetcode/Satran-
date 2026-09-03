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
          color: '#fff'
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
      background: 'rgba(7, 9, 14, 0.85)',
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
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--panel-border)',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '18px',
            transition: 'border-color 0.2s',
            justifySelf: 'end'
          }}
        >
          {currentUser ? currentUser.name.charAt(0).toUpperCase() : '👤'}
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
            width: '290px',
            background: '#0c0f17',
            borderLeft: '1px solid var(--panel-border)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            zIndex: 999,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '18px' }}>Hesap & Menü</span>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {currentUser ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Giriş Yapılan Hesap</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{currentUser.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '12px' }}>@{currentUser.chessUsername}</div>
                  
                  <button
                    onClick={() => { setCurrentPage('profile'); setIsDrawerOpen(false); }}
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '10px 14px', justifyContent: 'center' }}
                  >
                    Profilimi Görüntüle 👤
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
              <div className="mobile-nav-links" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hızlı Menü</span>
                {mainLinks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentPage(item.id); setIsDrawerOpen(false); }}
                    style={{
                      background: currentPage === item.id ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      border: 'none',
                      color: currentPage === item.id ? 'var(--accent-secondary)' : 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      transition: 'background 0.2s'
                    }}
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
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#fff',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>Yönetici Paneli 👑</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Şifreli</span>
                </button>
              </div>
            </div>

            {currentUser && (
              <button 
                onClick={() => { onLogout(); setIsDrawerOpen(false); }}
                className="btn-secondary" 
                style={{ justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444' }}
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
