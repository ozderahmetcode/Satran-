import React from 'react';

export default function Navbar({ currentPage, setCurrentPage }) {
  return (
    <nav style={{
      background: 'rgba(11, 12, 16, 0.8)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--panel-border)',
      padding: '16px 0'
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
            background: 'var(--gradient-glow)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>özder</span>
          <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>satranç</span>
        </div>

        {/* Links */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center'
        }}>
          {[
            { id: 'home', label: 'Ana Sayfa' },
            { id: 'event', label: 'Tilda Buluşması 🏆' },
            { id: 'database', label: 'Veritabanı & Sıralama' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                background: 'none',
                border: 'none',
                color: currentPage === item.id ? 'var(--accent-primary)' : 'var(--text-primary)',
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
                  background: 'var(--gradient-glow)',
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
