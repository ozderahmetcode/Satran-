import React, { useState } from 'react';

export default function AdminPanel({ registrations, users = [], onRegisterUpdate, tournaments, onAddTournament, messages = [], onMessagesUpdate }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('registrations'); // registrations | tournaments | messages

  // Eşleştirme Yönetimi Seçili Turnuva
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [roundResults, setRoundResults] = useState({}); // { [matchKey]: result }

  // Turnuva Form State'i
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: 'Ümraniye X Cafe',
    fee: '300 TL',
    maxQuota: '20',
    totalRounds: '5'
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'ozder' && password === 'Ozderahmet123.') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Hatalı kullanıcı adı veya şifre! Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteUser = async (tournamentId, userId) => {
    if (!window.confirm("Bu katılımcı kaydını turnuvadan silmek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`/api/register/${tournamentId}/${userId}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok) {
        onRegisterUpdate(result.registrations);
      } else {
        alert(result.error || "Silme işlemi başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    try {
      const response = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok) {
        onMessagesUpdate(result.messages);
      }
    } catch (error) {
      alert("Mesaj silinemedi.");
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (response.ok) {
        setStatusMsg({ type: 'success', text: 'Yeni etkinlik ve turnuva başarıyla oluşturuldu!' });
        onAddTournament(result.tournaments);
        setFormData({
          title: '',
          date: '',
          time: '',
          location: 'Ümraniye X Cafe',
          fee: '300 TL',
          maxQuota: '20',
          totalRounds: '5'
        });
      } else {
        setStatusMsg({ type: 'error', text: result.error || 'Hata oluştu.' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Sunucu bağlantı hatası.' });
    } finally {
      setLoading(false);
    }
  };

  // İsviçre Sistemi Eşleştirme Oluşturma
  const handleGeneratePairings = async (tourId) => {
    try {
      const response = await fetch(`/api/tournaments/${tourId}/pairings`, { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        onAddTournament(result.tournaments);
        setRoundResults({});
      } else {
        alert(result.error || "Eşleştirme oluşturulamadı.");
      }
    } catch (error) {
      alert("Bağlantı hatası.");
    }
  };

  // Tur Sonuçlarını Kaydetme ve ELO Puanlarını Hesaplama
  const handleSubmitResults = async (tourId, roundNumber, pairings) => {
    const resultsPayload = pairings.map(p => {
      const matchKey = `${p.whiteId}-${p.blackId}`;
      const result = roundResults[matchKey] || p.result;
      return {
        whiteId: p.whiteId,
        blackId: p.blackId,
        result: result // 'white' | 'black' | 'draw'
      };
    });

    const hasPending = resultsPayload.some(r => r.result === 'pending');
    if (hasPending) {
      alert("Lütfen tüm maçların sonucunu girin.");
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tourId}/rounds/${roundNumber}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsPayload })
      });
      const result = await response.json();
      if (response.ok) {
        onAddTournament(result.tournaments);
        alert("Sonuçlar kaydedildi ve ELO puanları güncellendi!");
      } else {
        alert(result.error || "Hata oluştu.");
      }
    } catch (error) {
      alert("Bağlantı hatası.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>
          🔐 Yönetici Girişi
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Yönetici paneline erişmek için bilgilerinizi girin.
        </p>

        {authError && (
          <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            required
            placeholder="Yönetici Kullanıcı Adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px 16px', color: '#fff', outline: 'none', textAlign: 'center' }}
          />
          <input
            type="password"
            required
            placeholder="Yönetici Giriş Şifresi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px 16px', color: '#fff', outline: 'none', textAlign: 'center' }}
          />
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Header */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '32px', fontWeight: 800 }}>
            👑 OZDER Yönetim Paneli
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Katılımcı listelerini yönetin, turnuvaları eşleştirin ve mesajları okuyun.
          </p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          Güvenli Çıkış
        </button>
      </section>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { id: 'registrations', label: 'Katılımcı Kayıtları 👥' },
          { id: 'tournaments', label: 'Eşleştirme & Turnuva Yönetimi ♟️' },
          { id: 'messages', label: `Gelen Mesajlar (${messages.length}) ✉️` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedTourId(null); }}
            className={activeTab === tab.id ? "btn-primary" : "btn-secondary"}
            style={{ padding: '10px 18px', fontSize: '14px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Registrations */}
      {activeTab === 'registrations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Table */}
          <div className="glass-panel" style={{ flex: 2 }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              Buluşma Katılım Kayıtları ({registrations.length})
            </h3>
            {registrations.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Henüz kayıtlı katılımcı bulunmuyor.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px' }}>Katılımcı</th>
                      <th style={{ padding: '12px 8px' }}>Turnuva</th>
                      <th style={{ padding: '12px 8px' }}>Telefon</th>
                      <th style={{ padding: '12px 8px' }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg, idx) => {
                      const matchedUser = users.find(u => u.id === reg.userId) || { name: "Bilinmeyen Üye", phone: "-", chessUsername: "-" };
                      const matchedTour = tournaments.find(t => t.id === reg.tournamentId) || { title: `Turnuva #${reg.tournamentId}` };

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600 }}>{matchedUser.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>@{matchedUser.chessUsername}</div>
                          </td>
                          <td style={{ padding: '12px 8px', color: 'var(--accent-secondary)' }}>{matchedTour.title}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{matchedUser.phone}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <button onClick={() => handleDeleteUser(reg.tournamentId, reg.userId)} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Sil</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create Tournament */}
          <div className="glass-panel" style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              📢 Yeni Etkinlik Oluştur
            </h3>
            <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Başlık *</label>
                <input type="text" required placeholder="1. X Cafe Hızlı Satranç..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tarih *</label>
                  <input type="text" required placeholder="15.08.2026" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Saat *</label>
                  <input type="text" required placeholder="15:00" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Konum *</label>
                <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ücret</label>
                  <input type="text" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: e.target.value })} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Kontenjan</label>
                  <input type="number" required value={formData.maxQuota} onChange={(e) => setFormData({ ...formData, maxQuota: e.target.value })} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tur Sayısı</label>
                  <select value={formData.totalRounds} onChange={(e) => setFormData({ ...formData, totalRounds: e.target.value })} style={{ width: '100%', background: '#0d121e', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: '#fff', outline: 'none' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Tur</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Etkinlik Yayınla</button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: Tournaments Swiss System Management */}
      {activeTab === 'tournaments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!selectedTourId ? (
            <div className="glass-panel">
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Eşleştirme İçin Turnuva Seçin</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tournaments.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', border: '1px solid var(--panel-border)', borderRadius: '12px' }}>
                    <div>
                      <h4 style={{ fontWeight: 700 }}>{t.title}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📅 {t.date} • Durum: {t.status === 'active' ? 'Devam Ediyor' : 'Tamamlandı (Şampiyon: ' + t.champion + ')'}</p>
                    </div>
                    <button onClick={() => setSelectedTourId(t.id)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                      Eşleştirmeleri Yönet
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            (() => {
              const currentTour = tournaments.find(t => t.id === selectedTourId);
              const roundsCount = currentTour.rounds?.length || 0;
              const activeRound = currentTour.rounds?.[roundsCount - 1];
              const isRoundPending = activeRound?.pairings?.some(p => p.result === 'pending');

              return (
                <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <button onClick={() => setSelectedTourId(null)} className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}>
                    ← Turnuva Listesine Dön
                  </button>

                  <div>
                    <h2 style={{ fontWeight: 800 }}>{currentTour.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Toplam Tur: {currentTour.totalRounds} • Mevcut Tur: {roundsCount} / {currentTour.totalRounds}</p>
                  </div>

                  {/* Round Pairing Control */}
                  {roundsCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Turnuva henüz başlatılmadı. 1. Tur eşleştirmelerini başlatabilirsiniz.</p>
                      <button onClick={() => handleGeneratePairings(currentTour.id)} className="btn-primary">
                        1. Tur Eşleştirmelerini Oluştur
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '20px' }}>
                        Tur #{roundsCount} Eşleştirmeleri
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {activeRound.pairings.map((pairing, idx) => {
                          const wUser = users.find(u => u.id === pairing.whiteId) || { name: 'Bay (Boşta)' };
                          const bUser = users.find(u => u.id === pairing.blackId) || { name: 'Bay (Boşta)' };
                          const matchKey = `${pairing.whiteId}-${pairing.blackId}`;

                          return (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'rgba(255,255,255,0.02)',
                              padding: '16px 20px',
                              borderRadius: '12px',
                              border: '1px solid var(--panel-border)',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1 }}>
                                <div style={{ width: '45%' }}>
                                  <strong style={{ color: '#fff' }}>⚪ Beyaz:</strong> {wUser.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({wUser.elo || 1500} ELO)</span>
                                </div>
                                <div style={{ fontSize: '18px' }}>vs</div>
                                <div style={{ width: '45%' }}>
                                  <strong style={{ color: 'var(--text-secondary)' }}>⚫ Siyah:</strong> {bUser.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({bUser.elo || 1500} ELO)</span>
                                </div>
                              </div>

                              {pairing.blackId === null ? (
                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>Bay Geçti (1 Puan)</span>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {[
                                    { id: 'white', label: 'Beyaz Kazandı' },
                                    { id: 'draw', label: 'Berabere' },
                                    { id: 'black', label: 'Siyah Kazandı' }
                                  ].map(btn => (
                                    <button
                                      key={btn.id}
                                      onClick={() => setRoundResults({ ...roundResults, [matchKey]: btn.id })}
                                      className={(roundResults[matchKey] || pairing.result) === btn.id ? "btn-primary" : "btn-secondary"}
                                      style={{ padding: '6px 12px', fontSize: '12px' }}
                                    >
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Submit / Next Round Button */}
                      <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
                        {isRoundPending ? (
                          <button
                            onClick={() => handleSubmitResults(currentTour.id, roundsCount, activeRound.pairings)}
                            className="btn-primary"
                          >
                            Tur Sonuçlarını Onayla ve ELO Hesapla
                          </button>
                        ) : (
                          currentTour.status === 'active' && (
                            <button
                              onClick={() => handleGeneratePairings(currentTour.id)}
                              className="btn-primary"
                              style={{ background: 'var(--gradient-gold)' }}
                            >
                              {roundsCount === currentTour.totalRounds ? "Turnuvayı Kapat ve Şampiyonu Belirle" : `${roundsCount + 1}. Tur Eşleştirmelerini Oluştur`}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab Content: Contact Messages */}
      {activeTab === 'messages' && (
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
            ✉️ Gelen İletişim Mesajları ({messages.length})
          </h3>

          {messages.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gelen kutunuz boş.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map(msg => (
                <div key={msg.id} style={{
                  background: '#fff',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '24px'
                }}>
                  <div style={{ flex: 1, padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <strong>{msg.name} ({msg.email})</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(msg.date).toLocaleString('tr-TR')}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                  </div>
                  <button onClick={() => handleDeleteMessage(msg.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>Sil</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
