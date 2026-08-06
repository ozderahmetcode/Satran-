import React from 'react';

export default function Navbar({ currentPage, setCurrentPage }) {
  return (
    <nav style={{
      background: 'rgba(7, 9, 14, 0.8)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--panel-border)',
      padding: '18px 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <div 
          onClick={() => setCurrentPage('home')}
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: '28px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{
            background: 'var(--gradient-gold)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>özder</span>
          <span style={{ fontSize: '15px', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '1px' }}>CLUB</span>
        </div>

        {/* Links */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center'
        }}>
          {[
            { id: 'home', label: 'Ana Sayfa' },
            { id: 'event', label: 'Buluşmalar 🏆' },
            { id: 'database', label: 'İstatistikler' },
            { id: 'create', label: 'Etkinlik Oluştur' },
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
