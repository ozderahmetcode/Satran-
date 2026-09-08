import React, { useState } from 'react';

export default function Matchmaking({ 
  currentUser, 
  users = [], 
  matchRequests = [], 
  directMessages = [], 
  onGoToAuth, 
  onUpdateProfile,
  onReloadData 
}) {
  const [activeTab, setActiveTab] = useState('find'); // find | requests | matches
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const [isLookingForMatch, setIsLookingForMatch] = useState(currentUser?.matchmakingSettings?.isActive || false);
  const [matchType, setMatchType] = useState(currentUser?.matchmakingSettings?.type || 'Farketmez (Online & Yüz Yüze)');
  const [availability, setAvailability] = useState(currentUser?.matchmakingSettings?.availability || 'Her Zaman Müsaitim');
  const [note, setNote] = useState(currentUser?.matchmakingSettings?.note || '');

  const [requestTargetUser, setRequestTargetUser] = useState(null);
  const [requestNote, setRequestNote] = useState('Merhaba, seninle satranç oynamak istiyorum!');
  const [sendingRequest, setSendingRequest] = useState(false);

  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [spamTargetUser, setSpamTargetUser] = useState(null);
  const [spamReason, setSpamReason] = useState('Uygunsuz Mesaj / Davranış');
  const [spamDetails, setSpamDetails] = useState('');
  const [reportingSpam, setReportingSpam] = useState(false);

  const availablePlayers = users.filter(u => {
    return u.matchmakingSettings && u.matchmakingSettings.isActive === true;
  });

  const incomingRequests = matchRequests.filter(r => 
    currentUser && String(r.toUserId) === String(currentUser.id) && r.status === 'pending'
  );

  const outgoingRequests = matchRequests.filter(r => 
    currentUser && String(r.fromUserId) === String(currentUser.id)
  );

  const acceptedMatches = matchRequests.filter(r => 
    currentUser && r.status === 'accepted' && 
    (String(r.fromUserId) === String(currentUser.id) || String(r.toUserId) === String(currentUser.id))
  );

  const handleSaveStatus = async (overrideActive) => {
    if (!currentUser) return onGoToAuth();
    const activeState = overrideActive !== undefined ? overrideActive : isLookingForMatch;
    try {
      const formData = new FormData();
      const settings = { isActive: activeState, type: matchType, availability, note };
      formData.append('matchmakingSettings', JSON.stringify(settings));
      if (currentUser.name) formData.append('name', currentUser.name);
      if (currentUser.email) formData.append('email', currentUser.email);
      if (currentUser.chessUsername) formData.append('chessUsername', currentUser.chessUsername);
      if (currentUser.phone) formData.append('phone', currentUser.phone);
      
      const response = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setIsLookingForMatch(activeState);
        alert(activeState ? "Eşleşme durumunuz ve tercihleriniz başarıyla güncellendi!" : "Rakip arama durumunuz iptal edildi ve listeden çıkarıldınız.");
        if (onUpdateProfile) {
           onUpdateProfile(data.user);
        }
        if (onReloadData) onReloadData();
      } else {
        alert(data.error || "İşlem gerçekleştirilemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    }
  };

  const handleCancelStatus = async () => {
    if (!window.confirm("Rakip arama havuzundan çıkmak ve durumunuzu iptal etmek istediğinize emin misiniz?")) return;
    await handleSaveStatus(false);
  };

  const handleSendMatchRequestSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return onGoToAuth();
    if (!requestTargetUser) return;

    setSendingRequest(true);
    try {
      const response = await fetch('/api/match-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUser: currentUser,
          toUserId: requestTargetUser.id,
          message: requestNote
        })
      });
      const result = await response.json();
      if (response.ok) {
        alert(`${requestTargetUser.name} oyuncusuna oyun isteğiniz başarıyla iletildi!`);
        setRequestTargetUser(null);
        setRequestNote('Merhaba, seninle satranç oynamak istiyorum!');
        if (onReloadData) onReloadData();
        setActiveTab('requests');
      } else {
        alert(result.error || "İstek gönderilemedi.");
      }
    } catch (err) {
      alert("Sunucu bağlantı hatası.");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    if (!currentUser) return onGoToAuth();
    try {
      const response = await fetch(`/api/match-requests/${requestId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          action
        })
      });
      const result = await response.json();
      if (response.ok) {
        if (action === 'accept') {
          alert("Oyun isteğini kabul ettiniz! Eşleşmelerim sekmesinden hemen mesajlaşabilirsiniz.");
          setActiveTab('matches');
        } else if (action === 'reject') {
          alert("İstek reddedildi.");
        } else if (action === 'cancel') {
          alert("İsteğiniz iptal edildi.");
        }
        if (onReloadData) onReloadData();
      } else {
        alert(result.error || "İşlem başarısız.");
      }
    } catch (err) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser || !activeChatUser) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeChatUser.id,
          text: chatInput.trim()
        })
      });
      const result = await response.json();
      if (response.ok) {
        setChatInput('');
        if (onReloadData) onReloadData();
      } else {
        alert(result.error || "Mesaj iletilemedi.");
      }
    } catch (err) {
      alert("Mesaj gönderilirken hata oluştu.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleToggleBlock = async (targetUser) => {
    if (!currentUser) return onGoToAuth();
    const isCurrentlyBlocked = Array.isArray(currentUser.blockedUsers) && currentUser.blockedUsers.includes(String(targetUser.id));
    const confirmText = isCurrentlyBlocked 
      ? `${targetUser.name} kullanıcısının engelini kaldırmak istiyor musunuz?`
      : `${targetUser.name} kullanıcısını engellemek istiyor musunuz? Engellendiğinde size mesaj ve oyun isteği gönderemez.`;
    
    if (!window.confirm(confirmText)) return;

    try {
      const response = await fetch(`/api/users/${targetUser.id}/toggle-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id })
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.isBlocked ? `${targetUser.name} engellendi.` : `${targetUser.name} engeli kaldırıldı.`);
        if (onUpdateProfile && result.user) {
          onUpdateProfile(result.user);
        }
        if (onReloadData) onReloadData();
      } else {
        alert(result.error || "İşlem başarısız.");
      }
    } catch (err) {
      alert("Sunucu hatası.");
    }
  };

  const handleReportSpamSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return onGoToAuth();
    if (!spamTargetUser) return;

    setReportingSpam(true);
    try {
      const response = await fetch('/api/spam-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterUser: currentUser,
          targetUserId: spamTargetUser.id,
          reason: spamReason,
          details: spamDetails
        })
      });
      const result = await response.json();
      if (response.ok) {
        alert("Bildiriminiz yönetici paneline iletildi. İncelenip gerekli işlem yapılacaktır.");
        setSpamTargetUser(null);
        setSpamDetails('');
      } else {
        alert(result.error || "Bildirim iletilemedi.");
      }
    } catch (err) {
      alert("Sunucu hatası.");
    } finally {
      setReportingSpam(false);
    }
  };

  const currentChatMessages = directMessages.filter(m => 
    currentUser && activeChatUser &&
    ((String(m.senderId) === String(currentUser.id) && String(m.receiverId) === String(activeChatUser.id)) ||
     (String(m.senderId) === String(activeChatUser.id) && String(m.receiverId) === String(currentUser.id)))
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '28px',
        background: isLookingForMatch 
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.95) 100%)' 
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
        border: isLookingForMatch ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid var(--panel-border)',
        borderRadius: '20px',
        boxShadow: isLookingForMatch ? '0 12px 32px rgba(14, 165, 233, 0.12)' : '0 8px 24px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '26px',
              background: isLookingForMatch ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#cbd5e1',
              borderRadius: '20px',
              position: 'relative',
              transition: 'background 0.25s ease'
            }}>
              <input 
                type="checkbox" 
                checked={isLookingForMatch}
                onChange={(e) => {
                  const nextState = e.target.checked;
                  setIsLookingForMatch(nextState);
                }}
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <div style={{
                width: '20px',
                height: '20px',
                background: '#ffffff',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: isLookingForMatch ? '25px' : '3px',
                transition: 'left 0.25s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '22px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚔️ Rakip Bul Ve Oyna
              </span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                {isLookingForMatch ? '🟢 Durumunuz açık: Listede yer alıyorsunuz.' : '⚪ Durumunuz kapalı: Listede görünmüyorsunuz.'}
              </p>
            </div>
          </label>
        </div>
        
        {isLookingForMatch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Oyun Şekli</label>
                <select value={matchType} onChange={(e) => setMatchType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: '#fff' }}>
                  <option>Farketmez (Online & Yüz Yüze)</option>
                  <option>Sadece Online</option>
                  <option>Sadece Yüz Yüze</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Müsaitlik</label>
                <select value={availability} onChange={(e) => setAvailability(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: '#fff' }}>
                  <option>Her Zaman Müsaitim</option>
                  <option>Hafta Sonu Müsaitim</option>
                  <option>Sadece Akşamları</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notunuz..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }} />
              <button onClick={() => handleSaveStatus(true)} className="btn-primary" style={{ padding: '12px 24px', borderRadius: '10px' }}>💾 Güncelle</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', gap: '8px' }}>
        <button onClick={() => setActiveTab('find')} style={{ flex: 1, padding: '14px', background: activeTab === 'find' ? 'rgba(14, 165, 233, 0.08)' : 'transparent', border: 'none', borderBottom: activeTab === 'find' ? '3px solid var(--accent-primary)' : 'none', color: activeTab === 'find' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 800, fontSize: '15px', cursor: 'pointer', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>♟️</span> Rakip Bul ({availablePlayers.length})
        </button>
        <button onClick={() => setActiveTab('requests')} style={{ flex: 1, padding: '14px', background: activeTab === 'requests' ? 'rgba(14, 165, 233, 0.08)' : 'transparent', border: 'none', borderBottom: activeTab === 'requests' ? '3px solid var(--accent-primary)' : 'none', color: activeTab === 'requests' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 800, fontSize: '15px', cursor: 'pointer', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>📨</span> İstekler {incomingRequests.length > 0 && <span style={{ background: '#ef4444', color: '#fff', padding: '2px 7px', borderRadius: '12px', fontSize: '11px' }}>{incomingRequests.length}</span>}
        </button>
        <button onClick={() => setActiveTab('matches')} style={{ flex: 1, padding: '14px', background: activeTab === 'matches' ? 'rgba(14, 165, 233, 0.08)' : 'transparent', border: 'none', borderBottom: activeTab === 'matches' ? '3px solid var(--accent-primary)' : 'none', color: activeTab === 'matches' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 800, fontSize: '15px', cursor: 'pointer', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>💬</span> Eşleşmeler & Sohbet ({acceptedMatches.length})
        </button>
      </div>

      {activeTab === 'find' && (
        <>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="İsim ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 2, padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)' }} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
              <option value="all">Tüm Oyun Türleri</option>
              <option value="online">Sadece Online</option>
              <option value="face">Sadece Yüz Yüze</option>
            </select>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
              <option value="all">Tüm Zamanlar</option>
              <option value="aksam">Akşamları</option>
              <option value="haftasonu">Hafta Sonu</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '24px' }}>
            {availablePlayers
              .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesType = typeFilter === 'all' || (typeFilter === 'online' && p.matchmakingSettings?.type?.includes('Online')) || (typeFilter === 'face' && p.matchmakingSettings?.type?.includes('Yüz Yüze'));
                const matchesTime = timeFilter === 'all' || (timeFilter === 'aksam' && p.matchmakingSettings?.availability?.includes('Akşam')) || (timeFilter === 'haftasonu' && p.matchmakingSettings?.availability?.includes('Hafta Sonu'));
                return matchesSearch && matchesType && matchesTime;
              })
              .map(p => {
                const isMe = currentUser && String(currentUser.id) === String(p.id);
                const hasPendingWithHim = matchRequests.some(r => currentUser && String(r.fromUserId) === String(currentUser.id) && String(r.toUserId) === String(p.id) && r.status === 'pending');
                const isAlreadyMatched = matchRequests.some(r => currentUser && r.status === 'accepted' && ((String(r.fromUserId) === String(currentUser.id) && String(r.toUserId) === String(p.id)) || (String(r.fromUserId) === String(p.id) && String(r.toUserId) === String(currentUser.id))));
                const isBlocked = currentUser && Array.isArray(currentUser.blockedUsers) && currentUser.blockedUsers.includes(String(p.id));

                return (
                  <div key={p.id} className="glass-panel" style={{ padding: '28px 20px', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{p.name}</h3>
                    <p style={{ fontSize: '13px', fontStyle: 'italic' }}>"{p.matchmakingSettings?.note}"</p>
                    {isMe ? (
                      <button onClick={handleCancelStatus} style={{ padding: '8px', color: '#ef4444' }}>🚫 Listeden Çık</button>
                    ) : isAlreadyMatched ? (
                      <button onClick={() => { setActiveChatUser(p); setActiveTab('matches'); }} className="btn-primary" style={{ padding: '10px' }}>💬 Sohbet Et</button>
                    ) : hasPendingWithHim ? (
                      <button disabled style={{ padding: '10px', background: '#eee' }}>⏳ İstek Gönderildi</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => currentUser ? setRequestTargetUser(p) : onGoToAuth()} className="btn-primary" style={{ padding: '10px' }}>⚔️ İstek Gönder</button>
                        <button onClick={() => setSpamTargetUser(p)} style={{ padding: '10px', color: '#ef4444' }}>⚠️</button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>📥 Gelen İstekler ({incomingRequests.length})</h3>
            {incomingRequests.map(req => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
                <div>{req.fromUserName}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleRespondRequest(req.id, 'accept')} style={{ background: '#10b981', color: '#fff' }}>Kabul Et</button>
                  <button onClick={() => handleRespondRequest(req.id, 'reject')}>Reddet</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>🤝 Eşleşmeler</h3>
            {acceptedMatches.map(m => {
              const partnerId = String(m.fromUserId) === String(currentUser?.id) ? m.toUserId : m.fromUserId;
              const partnerName = String(m.fromUserId) === String(currentUser?.id) ? m.toUserName : m.fromUserName;
              const partnerUser = users.find(u => String(u.id) === String(partnerId)) || { id: partnerId, name: partnerName };
              return (
                <div key={m.id} onClick={() => setActiveChatUser(partnerUser)} style={{ padding: '14px', cursor: 'pointer', border: '1px solid #eee' }}>
                  {partnerName}
                </div>
              );
            })}
          </div>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            {activeChatUser ? (
              <>
                <div style={{ borderBottom: '1px solid #eee' }}>{activeChatUser.name}</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {currentChatMessages.map(msg => (
                    <div key={msg.id} style={{ textAlign: String(msg.senderId) === String(currentUser.id) ? 'right' : 'left' }}>{msg.text}</div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={{ flex: 1 }} />
                  <button type="submit">Gönder</button>
                </form>
              </>
            ) : <div>Sohbet seçin.</div>}
          </div>
        </div>
      )}

      {requestTargetUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="glass-panel" style={{ padding: '28px', background: '#fff', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{requestTargetUser.name} ile Oyun İsteği</h3>
            <form onSubmit={handleSendMatchRequestSubmit}>
              <textarea rows={3} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} style={{ width: '100%' }} />
              <button type="submit" disabled={sendingRequest}>Gönder</button>
              <button type="button" onClick={() => setRequestTargetUser(null)}>Vazgeç</button>
            </form>
          </div>
        </div>
      )}

      {spamTargetUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="glass-panel" style={{ padding: '28px', background: '#fff', borderRadius: '16px' }}>
            <h3 style={{ color: '#ef4444' }}>⚠️ Spam Bildir</h3>
            <form onSubmit={handleReportSpamSubmit}>
              <select value={spamReason} onChange={(e) => setSpamReason(e.target.value)}>
                <option>Uygunsuz Mesaj / Davranış</option>
                <option>Spam</option>
              </select>
              <textarea rows={3} value={spamDetails} onChange={(e) => setSpamDetails(e.target.value)} style={{ width: '100%' }} />
              <button type="submit">Şikayeti Bildir</button>
              <button type="button" onClick={() => setSpamTargetUser(null)}>Vazgeç</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
