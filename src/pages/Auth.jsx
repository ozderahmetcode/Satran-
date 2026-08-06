import React, { useState } from 'react';

export default function Auth({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // login | register | verify
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    chessUsername: ''
  });
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [testCodeTip, setTestCodeTip] = useState(''); // Test için ekranda kodu göstereceğiz
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
        setVerifyEmail(formData.email);
        setActiveTab('verify');
        setInfoMsg('6 Haneli doğrulama kodu gönderildi.');
        if (result.testCode) {
          setTestCodeTip(result.testCode);
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

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, code: verificationCode })
      });
      const result = await response.json();

      if (response.ok) {
        setInfoMsg('E-posta doğrulandı! Şimdi giriş yapabilirsiniz.');
        setActiveTab('login');
        setFormData({ ...formData, email: verifyEmail, password: '' });
      } else {
        setErrorMsg(result.error || 'Doğrulama başarısız.');
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
        if (result.requiresVerification) {
          setVerifyEmail(formData.email);
          setActiveTab('verify');
          setErrorMsg('Lütfen önce e-posta adresinizi doğrulayın.');
        } else {
          setErrorMsg(result.error || 'Giriş başarısız.');
        }
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
      {activeTab !== 'verify' && (
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
      )}

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
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }}
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
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none' }}
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
              placeholder="Örn: Ahmet Özder"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }}
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
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Telefon Numarası *</label>
            <input
              type="tel"
              required
              placeholder="0555 555 55 55"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }}
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
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }}
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
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
            {loading ? 'Kayıt Yapılıyor...' : 'Üye Ol ve Doğrulama Kodu Al'}
          </button>
        </form>
      )}

      {/* Verify Screen */}
      {activeTab === 'verify' && (
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700 }}>E-posta Adresini Doğrula</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            <strong>{verifyEmail}</strong> adresine gönderilen 6 haneli kodu girin.
          </p>

          {testCodeTip && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px dashed var(--accent-secondary)', color: 'var(--accent-secondary)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
              🧪 <strong>Test Doğrulama Kodu:</strong> {testCodeTip}
            </div>
          )}

          <input
            type="text"
            required
            maxLength="6"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none', textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
          />

          <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center' }}>
            {loading ? 'Doğrulanıyor...' : 'Kodu Onayla'}
          </button>
        </form>
      )}

    </div>
  );
}
