import React, { useState } from 'react';

export default function Auth({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // login | register
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerData, setRegisterData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    chessPlatform: 'chess.com',
    chessUsername: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    // Temel istemci kontrolleri
    if (!registerData.name.trim() || !registerData.username.trim() || !registerData.email.trim() || !registerData.phone.trim() || !registerData.password) {
      setErrorMsg('Lütfen tüm zorunlu (*) alanları doldurun.');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]{3,25}$/.test(registerData.username.trim())) {
      setErrorMsg('Kullanıcı adı 3-25 karakter arasında olmalı ve yalnızca harf, rakam, alt çizgi (_), tire (-) içerebilir.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerData,
          username: registerData.username.trim().toLowerCase(),
          email: registerData.email.trim().toLowerCase()
        })
      });
      const result = await response.json();

      if (response.ok) {
        if (result.user && onLoginSuccess) {
          onLoginSuccess(result.user);
        } else {
          setInfoMsg('Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.');
          setLoginIdentifier(registerData.username || registerData.email);
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
        body: JSON.stringify({ 
          identifier: loginIdentifier.trim(), 
          password: loginPassword 
        })
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
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '480px', margin: '60px auto' }}>
      
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
              fontWeight: 700,
              fontSize: '15px',
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
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              borderBottom: activeTab === 'register' ? '2px solid var(--accent-secondary)' : 'none'
            }}
          >
            Üye Ol
          </button>
        </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>
          {infoMsg}
        </div>
      )}

      {/* Login Screen */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              E-posta veya Kullanıcı Adı
            </label>
            <input
              type="text"
              required
              placeholder="kullanıcı_adı veya ornek@email.com"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Şifre
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Ad Soyad <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Ahmet Özder"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Kullanıcı Adı <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                (Sadece kayıt anında belirlenir, sonradan değişmez)
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                @
              </span>
              <input
                type="text"
                required
                placeholder="ornek_kullanici"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                style={{ width: '100%', paddingLeft: '32px', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', paddingRight: '10px', paddingTop: '10px', paddingBottom: '10px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              E-posta Adresi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              required
              placeholder="eposta@adresiniz.com"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Telefon Numarası <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="Örn: 05554443322 veya 5554443322"
              value={registerData.phone}
              onChange={(e) => {
                const onlyNums = e.target.value.replace(/\D/g, '');
                if (onlyNums.length <= 11) {
                  setRegisterData({ ...registerData, phone: onlyNums });
                }
              }}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          {/* Chess Platform & Username (Optional) */}
          <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Satranç Hesabı
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                İsteğe Bağlı
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
              <select
                value={registerData.chessPlatform}
                onChange={(e) => setRegisterData({ ...registerData, chessPlatform: e.target.value })}
                style={{ background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600, fontSize: '13px' }}
              >
                <option value="chess.com">Chess.com</option>
                <option value="lichess">Lichess.org</option>
              </select>
              <input
                type="text"
                placeholder="Kullanıcı adınız (opsiyonel)"
                value={registerData.chessUsername}
                onChange={(e) => setRegisterData({ ...registerData, chessUsername: e.target.value })}
                style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
              >
              </input>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Şifre <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              style={{ width: '100%', background: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
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
