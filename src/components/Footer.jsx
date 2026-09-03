import React from 'react';

export default function Footer({ setCurrentPage }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--panel-border)',
      background: 'var(--panel-bg)',
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
          }}>ozder</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>satranç topluluğu</span>
        </div>

        <div style={{
          display: 'flex',
          gap: '32px'
        }}>
          <button onClick={() => setCurrentPage('terms')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Gizlilik Politikası</button>
          <button onClick={() => setCurrentPage('terms')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Kullanım Şartları ve İptal/İade Politikası</button>
          <button onClick={() => setCurrentPage('contact')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>İletişim</button>
        </div>

        <div style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}>
          © 2026 ozder. Tüm hakları saklıdır. Ümraniye Tilda Cafe iş birliğiyle.
        </div>
      </div>
    </footer>
  );
}
