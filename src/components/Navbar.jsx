import React from 'react';

// Paylaştığınız logoyu temsil eden özgün SVG Logo Bileşeni
export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '1px',
          color: '#fff'
        }}>ÖZDER</span>
        <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '2px' }}>SATRANÇ</span>
      </div>
    </div>
  );
}

export default function Navbar({ currentPage, setCurrentPage }) {
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
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo Bölümü */}
        <div onClick={() => setCurrentPage('home')} style={{ cursor: 'pointer' }}>
          <Logo />
        </div>

        {/* Linkler */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center'
        }}>
          {[
            { id: 'home', label: 'Ana Sayfa' },
            { id: 'event', label: 'Buluşmalar 🏆' },
            { id: 'database', label: 'İstatistikler' },
            { id: 'admin', label: 'Yönetim Paneli 🔐' },
            { id: 'contact', label: 'İletişim' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                background: 'none',
                border: 'none',
                color: currentPage === item.id ? 'var(--accent-secondary)' : 'var(--text-primary)',
                fontFamily: 'var(--font-title)',
                fontSize: '14px',
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
      </div>
    </nav>
  );
}
