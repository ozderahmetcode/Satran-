import React, { useState } from 'react';

export default function Auth({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // login | register
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    chessUsername: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (response.ok) {
        if (result.user && onLoginSuccess) {
          onLoginSuccess(result.user);
        } else {
          setInfoMsg('Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.');
          setActiveTab('login');
        }
      } else {
        setErrorMsg(result.error || 'Kayıt başarısız.');
      }
    } catch (error) {
      setErrorMsg('Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const result = await response.json();

      if (response.ok) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.error || 'Giriş başarısız.');
      }
    } catch (error) {
      setErrorMsg('Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '450px', margin: '60px auto' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', marginBottom: '24px' }}>
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '12px 0',
              color: activeTab === 'login' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'login' ? '2px solid var(--accent-secondary)' : 'none'
            }}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '12px 0',
              color: activeTab === 'register' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'register' ? '2px solid var(--accent-secondary)' : 'none'
            }}
          >
            Üye Ol
          </button>
        </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
          {infoMsg}
        </div>
      )}

      {/* Login Screen */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>E-posta Adresi</label>
            <input
              type="email"
              required
              placeholder="eposta@adresiniz.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Şifre</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      )}

      {/* Register Screen */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ad Soyad *</label>
            <input
              type="text"
              required
              placeholder="Örn: Ahmet Ozder"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>E-posta Adresi *</label>
            <input
              type="email"
              required
              placeholder="eposta@adresiniz.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Telefon Numarası *</label>
            <input
              type="tel"
              required
              placeholder="Örn: 05554443322 veya 5554443322"
              value={formData.phone}
              onChange={(e) => {
                const onlyNums = e.target.value.replace(/\D/g, ''); // Sadece rakamları al
                if (onlyNums.length <= 11) {
                  setFormData({ ...formData, phone: onlyNums });
                }
              }}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Chess.com / Lichess Kullanıcı Adı *</label>
            <input
              type="text"
              required
              placeholder="Örn: ozder_chess"
              value={formData.chessUsername}
              onChange={(e) => setFormData({ ...formData, chessUsername: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Şifre *</label>
            <input
              type="password"
              required
              placeholder="Şifreniz"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
            {loading ? 'Kayıt Yapılıyor...' : 'Hemen Üye Ol'}
          </button>
        </form>
      )}

    </div>
  );
}
