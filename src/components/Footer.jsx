import React from 'react';

export default function Footer({ setCurrentPage }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--panel-border)',
      background: 'rgba(11, 12, 16, 0.95)',
      padding: '48px 0 24px 0',
      marginTop: '80px'
    }}>
      <div className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          fontFamily: 'var(--font-title)',
          fontSize: '24px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            background: 'var(--gradient-glow)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>özder</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>satranç topluluğu</span>
        </div>

        <div style={{
          display: 'flex',
          gap: '32px'
        }}>
          <a href="#privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Gizlilik Politikası</a>
          <a href="#terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Kullanım Şartları</a>
          <a href="#contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>İletişim</a>
        </div>

        <div style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}>
          © 2026 özder. Tüm hakları saklıdır. Ümraniye Tilda Cafe iş birliğiyle.
        </div>
      </div>
    </footer>
  );
}
