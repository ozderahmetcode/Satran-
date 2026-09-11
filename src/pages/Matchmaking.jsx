import React, { useState, useEffect, useRef } from 'react';
import { sanitizeUrl, sanitizeChessUsername } from '../utils/security';

export default function Matchmaking({ 
  currentUser, 
  users = [], 
  matchRequests = [], 
  directMessages = [], 
  onGoToAuth, 
  onUpdateProfile,
  onReloadData 
}) {
  const [activeTab, setActiveTab] = useState('find'); // 'find' | 'requests' | 'matches'
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const [isLookingForMatch, setIsLookingForMatch] = useState(currentUser?.matchmakingSettings?.isActive || false);
  const [matchType, setMatchType] = useState(currentUser?.matchmakingSettings?.type || 'Farketmez (Online & Yüz Yüze)');
  const [availability, setAvailability] = useState(currentUser?.matchmakingSettings?.availability || 'Her Zaman Müsaitim');
  const [note, setNote] = useState(currentUser?.matchmakingSettings?.note || '');

  // Oyun İsteği Modalı
  const [requestTargetUser, setRequestTargetUser] = useState(null);
  const [requestNote, setRequestNote] = useState('Merhaba, seninle satranç oynamak istiyorum!');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Aktif Sohbet
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef(null);

  // Spam Bildir Modalı (Sadece Mesajlaşma / Sohbet içinden açılır)
  const [spamTargetUser, setSpamTargetUser] = useState(null);
  const [spamReason, setSpamReason] = useState('Uygunsuz Mesaj / Davranış');
  const [spamDetails, setSpamDetails] = useState('');
  const [reportingSpam, setReportingSpam] = useState(false);

  // Aktif kullanıcı değiştikçe ayarları senkronize et
  useEffect(() => {
    if (currentUser?.matchmakingSettings) {
      setIsLookingForMatch(Boolean(currentUser.matchmakingSettings.isActive));
      if (currentUser.matchmakingSettings.type) setMatchType(currentUser.matchmakingSettings.type);
      if (currentUser.matchmakingSettings.availability) setAvailability(currentUser.matchmakingSettings.availability);
      if (currentUser.matchmakingSettings.note !== undefined) setNote(currentUser.matchmakingSettings.note);
    }
  }, [currentUser]);

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

  // Otomatik olarak ilk kabul edilmiş eşleşmeyi seç
  useEffect(() => {
    if (activeTab === 'matches' && !activeChatUser && acceptedMatches.length > 0) {
      const firstMatch = acceptedMatches[0];
      const partnerId = String(firstMatch.fromUserId) === String(currentUser?.id) ? firstMatch.toUserId : firstMatch.fromUserId;
      const partnerName = String(firstMatch.fromUserId) === String(currentUser?.id) ? firstMatch.toUserName : firstMatch.fromUserName;
      const partnerUser = users.find(u => String(u.id) === String(partnerId)) || { 
        id: partnerId, 
        name: partnerName,
        elo: String(firstMatch.fromUserId) === String(currentUser?.id) ? firstMatch.toUserElo : firstMatch.fromUserElo,
        avatar: String(firstMatch.fromUserId) === String(currentUser?.id) ? firstMatch.toUserAvatar : firstMatch.fromUserAvatar,
        chessUsername: String(firstMatch.fromUserId) === String(currentUser?.id) ? firstMatch.toUserChess : firstMatch.fromUserChess
      };
      setActiveChatUser(partnerUser);
    }
  }, [activeTab, acceptedMatches, activeChatUser, currentUser, users]);

  // Yeni mesaj geldiğinde veya chat açıldığında en alta kaydır
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [directMessages, activeChatUser]);

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
          alert("Oyun isteğini kabul ettiniz! Eşleşmeler & Sohbet sekmesinden hemen mesajlaşabilirsiniz.");
          if (onReloadData) await onReloadData();
          setActiveTab('matches');
        } else if (action === 'reject') {
          alert("İstek reddedildi.");
          if (onReloadData) onReloadData();
        } else if (action === 'cancel') {
          alert("İsteğiniz iptal edildi.");
          if (onReloadData) onReloadData();
        }
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

    const messageText = chatInput.trim();
    setSendingMessage(true);
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          receiverId: activeChatUser.id,
          receiverName: activeChatUser.name,
          text: messageText
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
      alert("Mesaj gönderilirken sunucu hatası oluştu.");
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

  // Aktif konuşmadaki mesajlar
  const currentChatMessages = directMessages.filter(m => 
    currentUser && activeChatUser &&
    ((String(m.senderId) === String(currentUser.id) && String(m.receiverId) === String(activeChatUser.id)) ||
     (String(m.senderId) === String(activeChatUser.id) && String(m.receiverId) === String(currentUser.id)))
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const isPartnerBlocked = currentUser && activeChatUser && Array.isArray(currentUser.blockedUsers) && currentUser.blockedUsers.includes(String(activeChatUser.id));

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Banner: Status & Quick Settings */}
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
                  if (currentUser) {
                    handleSaveStatus(nextState);
                  } else {
                    onGoToAuth();
                  }
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
                {isLookingForMatch 
                  ? '🟢 Durumunuz açık: Diğer oyuncular sizi bulup maç teklif edebilir.' 
                  : '⚪ Durumunuz kapalı: Eşleşme listesinde görünmüyorsunuz.'}
              </p>
            </div>
          </label>

          {currentUser && isLookingForMatch && (
            <button 
              onClick={handleCancelStatus}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
            >
              🚫 Kendini Listeden Çıkar
            </button>
          )}
        </div>

        {isLookingForMatch && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px dashed rgba(14, 165, 233, 0.2)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Oyun Tercihi</label>
                <select 
                  value={matchType} 
                  onChange={(e) => setMatchType(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: '#fff', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                >
                  <option>Farketmez (Online & Yüz Yüze)</option>
                  <option>Sadece Online</option>
                  <option>Sadece Yüz Yüze</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Müsaitlik Durumu</label>
                <select 
                  value={availability} 
                  onChange={(e) => setAvailability(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: '#fff', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                >
                  <option>Her Zaman Müsaitim</option>
                  <option>Hafta Sonu Müsaitim</option>
                  <option>Sadece Akşamları</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Rakiplerine iletmek istediğin kısa not (örn: 'Rapid maçlar arıyorum, 10 dk.')" 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: '#fff', color: 'var(--text-primary)', fontSize: '14px' }}
              />
              <button 
                onClick={() => handleSaveStatus(true)}
                className="btn-primary" 
                style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 800 }}
              >
                💾 Ayarları Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', gap: '8px' }}>
        <button 
          onClick={() => setActiveTab('find')}
          style={{ 
            flex: 1, 
            padding: '16px', 
            background: activeTab === 'find' ? 'rgba(14, 165, 233, 0.08)' : 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'find' ? '3px solid var(--accent-primary)' : 'none', 
            color: activeTab === 'find' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            fontWeight: 800, 
            fontSize: '15px', 
            fontFamily: 'var(--font-title)', 
            cursor: 'pointer', 
            borderRadius: '12px 12px 0 0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>♟️</span> Rakip Bul ({availablePlayers.length})
        </button>

        <button 
          onClick={() => setActiveTab('requests')}
          style={{ 
            flex: 1, 
            padding: '16px', 
            background: activeTab === 'requests' ? 'rgba(14, 165, 233, 0.08)' : 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'requests' ? '3px solid var(--accent-primary)' : 'none', 
            color: activeTab === 'requests' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            fontWeight: 800, 
            fontSize: '15px', 
            fontFamily: 'var(--font-title)', 
            cursor: 'pointer', 
            borderRadius: '12px 12px 0 0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>📨</span> İstekler
          {incomingRequests.length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('matches')}
          style={{ 
            flex: 1, 
            padding: '16px', 
            background: activeTab === 'matches' ? 'rgba(14, 165, 233, 0.08)' : 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'matches' ? '3px solid var(--accent-primary)' : 'none', 
            color: activeTab === 'matches' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            fontWeight: 800, 
            fontSize: '15px', 
            fontFamily: 'var(--font-title)', 
            cursor: 'pointer', 
            borderRadius: '12px 12px 0 0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>💬</span> Eşleşmeler & Sohbet ({acceptedMatches.length})
        </button>
      </div>

      {/* TAB 1: RAKİP BUL (Orijinal estetik kart tasarımı - commit 7db1740) */}
      {activeTab === 'find' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="İsim veya kullanıcı adı ile ara..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ flex: 2, minWidth: '220px', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)', fontSize: '14px' }} 
            />
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)} 
              style={{ flex: 1, minWidth: '160px', padding: '14px', borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}
            >
              <option value="all">Tüm Oyun Türleri</option>
              <option value="online">Sadece Online</option>
              <option value="face">Sadece Yüz Yüze</option>
            </select>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)} 
              style={{ flex: 1, minWidth: '160px', padding: '14px', borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="aksam">Akşamları</option>
              <option value="haftasonu">Hafta Sonu</option>
            </select>
          </div>

          {/* Player Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {availablePlayers
              .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.chessUsername && p.chessUsername.toLowerCase().includes(searchTerm.toLowerCase()));
                const matchesType = typeFilter === 'all' || 
                  (typeFilter === 'online' && p.matchmakingSettings?.type?.includes('Online')) || 
                  (typeFilter === 'face' && p.matchmakingSettings?.type?.includes('Yüz Yüze'));
                const matchesTime = timeFilter === 'all' || 
                  (timeFilter === 'aksam' && p.matchmakingSettings?.availability?.includes('Akşam')) || 
                  (timeFilter === 'haftasonu' && p.matchmakingSettings?.availability?.includes('Hafta Sonu'));
                return matchesSearch && matchesType && matchesTime;
              })
              .map(p => {
                const isMe = currentUser && String(currentUser.id) === String(p.id);
                const hasPendingWithHim = matchRequests.some(r => 
                  currentUser && String(r.fromUserId) === String(currentUser.id) && String(r.toUserId) === String(p.id) && r.status === 'pending'
                );
                const isAlreadyMatched = matchRequests.some(r => 
                  currentUser && r.status === 'accepted' && 
                  ((String(r.fromUserId) === String(currentUser.id) && String(r.toUserId) === String(p.id)) || 
                   (String(r.fromUserId) === String(p.id) && String(r.toUserId) === String(currentUser.id)))
                );

                return (
                  <div 
                    key={p.id} 
                    className="glass-panel" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      textAlign: 'center', 
                      position: 'relative', 
                      padding: '32px 24px', 
                      background: 'var(--panel-bg)', 
                      borderRadius: '16px', 
                      border: '1px solid var(--panel-border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* ELO Badge */}
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                      ⚡ {p.elo || 1500} ELO
                    </div>
                    
                    {/* Large Avatar */}
                    <div style={{ 
                      width: '88px', 
                      height: '88px', 
                      borderRadius: '50%', 
                      background: p.avatar ? 'transparent' : 'var(--gradient-gold)', 
                      marginBottom: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '32px', 
                      color: '#fff', 
                      position: 'relative', 
                      border: p.avatar ? '2px solid var(--panel-border)' : 'none', 
                      overflow: 'hidden',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.08)'
                    }}>
                      {p.avatar ? (
                        <img 
                          src={p.avatar} 
                          alt="" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        p.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</h3>
                    {p.chessUsername ? (
                      <a
                        href={sanitizeUrl(p.chessPlatform === 'lichess' ? `https://lichess.org/@/${sanitizeChessUsername(p.chessUsername)}` : `https://www.chess.com/member/${sanitizeChessUsername(p.chessUsername)}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: p.chessPlatform === 'lichess' ? '#4b5563' : '#15803d',
                          background: p.chessPlatform === 'lichess' ? 'rgba(107, 114, 128, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          marginTop: '4px'
                        }}
                        title={`${p.chessPlatform === 'lichess' ? 'Lichess' : 'Chess.com'} Profiline Git`}
                      >
                        <span>{p.chessPlatform === 'lichess' ? '♘ Lichess' : '♟️ Chess.com'}</span>
                        <span>@{p.chessUsername} ↗</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Satranç hesabı belirtilmemiş</span>
                    )}
                    
                    {/* Preference Tags */}
                    <div style={{ display: 'flex', gap: '8px', margin: '16px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderRadius: '16px', fontWeight: 700 }}>
                        {p.matchmakingSettings?.type === 'Sadece Online' ? 'Sadece Online' : p.matchmakingSettings?.type === 'Sadece Yüz Yüze' ? 'Sadece Yüz Yüze' : 'Online / Yüz Yüze'}
                      </span>
                      <span style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(0, 0, 0, 0.05)', color: 'var(--text-secondary)', borderRadius: '16px', fontWeight: 700 }}>
                        {p.matchmakingSettings?.availability === 'Hafta Sonu Müsaitim' ? 'Hafta Sonu' : p.matchmakingSettings?.availability === 'Sadece Akşamları' ? 'Akşamları' : 'Her Zaman'}
                      </span>
                    </div>
                    
                    {/* Note */}
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '24px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.4' }}>
                      "{p.matchmakingSettings?.note || 'Satranç oynamak için rakip arıyor.'}"
                    </p>

                    {/* Action Button */}
                    {isMe ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '10px 14px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '10px', fontWeight: 700, fontSize: '13px' }}>
                          👤 Bu Senin Profilin
                        </div>
                        <button 
                          onClick={handleCancelStatus}
                          style={{ width: '100%', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          🚫 Kendini Listeden Çıkar
                        </button>
                      </div>
                    ) : isAlreadyMatched ? (
                      <button 
                        onClick={() => {
                          setActiveChatUser(p);
                          setActiveTab('matches');
                        }}
                        style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                      >
                        <span>💬</span> Sohbet Et
                      </button>
                    ) : hasPendingWithHim ? (
                      <button 
                        disabled
                        style={{ width: '100%', background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'not-allowed' }}
                      >
                        ⏳ İstek Gönderildi
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          if (!currentUser) return onGoToAuth();
                          setRequestTargetUser(p);
                        }}
                        style={{ width: '100%', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.92'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        ⚔️ Oyun İsteği
                      </button>
                    )}
                  </div>
                );
              })}
            
            {availablePlayers.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', background: '#fff', borderRadius: '16px', border: '1px dashed var(--panel-border)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>♟️</div>
                <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Henüz Aktif Oyuncu Yok</h4>
                <p style={{ fontSize: '14px' }}>Şu an satranç maçı arayan oyuncu bulunmuyor. Yukarıdan kendi durumunuzu açarak ilk ilanı siz bırakabilirsiniz!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: İSTEKLER */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Incoming */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📥 Gelen Oyun İstekleri ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic', padding: '16px 0' }}>
                Bekleyen gelen bir oyun isteğiniz bulunmuyor.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {incomingRequests.map(req => (
                  <div 
                    key={req.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '16px 20px', 
                      background: '#f8fafc', 
                      borderRadius: '12px', 
                      border: '1px solid var(--panel-border)',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    {(() => {
                      const fromUserRecord = users.find(u => String(u.id) === String(req.fromUserId));
                      const liveAvatar = fromUserRecord?.avatar || req.fromUserAvatar;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: liveAvatar ? 'transparent' : 'var(--gradient-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, overflow: 'hidden', border: liveAvatar ? '1px solid var(--panel-border)' : 'none' }}>
                            {liveAvatar ? <img src={liveAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : req.fromUserName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                              {req.fromUserName} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>({fromUserRecord?.elo || req.fromUserElo || 1500} ELO)</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>"{req.message}"</p>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleRespondRequest(req.id, 'accept')} 
                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                      >
                        ✓ Kabul Et
                      </button>
                      <button 
                        onClick={() => handleRespondRequest(req.id, 'reject')} 
                        style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                      >
                        ✕ Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📤 Gönderdiğim İstekler ({outgoingRequests.length})
            </h3>
            {outgoingRequests.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic', padding: '16px 0' }}>
                Henüz kimseye oyun isteği göndermediniz.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outgoingRequests.map(req => (
                  <div 
                    key={req.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '14px 18px', 
                      background: '#f8fafc', 
                      borderRadius: '12px', 
                      border: '1px solid var(--panel-border)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{req.toUserName}</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        Durum: <b>{req.status === 'pending' ? '⏳ Beklemede' : req.status === 'accepted' ? '✅ Kabul Edildi' : '❌ Reddedildi'}</b>
                      </p>
                    </div>
                    {req.status === 'pending' && (
                      <button 
                        onClick={() => handleRespondRequest(req.id, 'cancel')}
                        style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--panel-border)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        İsteği Geri Çek
                      </button>
                    )}
                    {req.status === 'accepted' && (
                      <button 
                        onClick={() => {
                          const partnerUser = users.find(u => String(u.id) === String(req.toUserId)) || { id: req.toUserId, name: req.toUserName };
                          setActiveChatUser(partnerUser);
                          setActiveTab('matches');
                        }}
                        style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        💬 Sohbet Et
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EŞLEŞMELER & ULTRA-PREMİUM SOHBET (Mesajlaşma) */}
      {activeTab === 'matches' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '20px', minHeight: '620px', alignItems: 'stretch' }}>
          
          {/* Sol Kolon: Eşleşmeler Listesi */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🤝 Eşleşmeler ({acceptedMatches.length})
              </h3>
            </div>

            {acceptedMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Henüz aktif eşleşmeniz yok.</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Oyun isteği gönderip kabul edildiğinde burada listelenecektir.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '520px' }}>
                {acceptedMatches.map(m => {
                  const partnerId = String(m.fromUserId) === String(currentUser?.id) ? m.toUserId : m.fromUserId;
                  const partnerName = String(m.fromUserId) === String(currentUser?.id) ? m.toUserName : m.fromUserName;
                  const partnerElo = String(m.fromUserId) === String(currentUser?.id) ? m.toUserElo : m.fromUserElo;
                  const partnerAvatar = String(m.fromUserId) === String(currentUser?.id) ? m.toUserAvatar : m.fromUserAvatar;
                  const partnerChess = String(m.fromUserId) === String(currentUser?.id) ? m.toUserChess : m.fromUserChess;

                  const fullPartner = users.find(u => String(u.id) === String(partnerId)) || {
                    id: partnerId,
                    name: partnerName,
                    elo: partnerElo,
                    avatar: partnerAvatar,
                    chessUsername: partnerChess
                  };

                  const isSelected = activeChatUser && String(activeChatUser.id) === String(partnerId);

                  // Son mesaj önizlemesi
                  const msgsWithThisUser = directMessages.filter(msg => 
                    (String(msg.senderId) === String(currentUser?.id) && String(msg.receiverId) === String(partnerId)) ||
                    (String(msg.senderId) === String(partnerId) && String(msg.receiverId) === String(currentUser?.id))
                  );
                  const lastMsg = msgsWithThisUser[msgsWithThisUser.length - 1];

                  return (
                    <div 
                      key={m.id}
                      onClick={() => setActiveChatUser(fullPartner)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(14, 165, 233, 0.12)' : '#f8fafc',
                        border: isSelected ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: fullPartner.avatar ? 'transparent' : 'var(--gradient-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '18px',
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: '1px solid var(--panel-border)'
                      }}>
                        {fullPartner.avatar ? (
                          <img src={fullPartner.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          fullPartner.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fullPartner.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                            {fullPartner.elo || 1500} ELO
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastMsg ? lastMsg.text : '💬 Sohbete başla...'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sağ Kolon: Mesajlaşma Ekranı (WhatsApp/Discord Tasarımı) */}
          <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--panel-border)', background: '#fff' }}>
            {activeChatUser ? (
              <>
                {/* Sohbet Başlığı (Header) */}
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderBottom: '1px solid var(--panel-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: activeChatUser.avatar ? 'transparent' : 'var(--gradient-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '18px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {activeChatUser.avatar ? (
                        <img src={activeChatUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        activeChatUser.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {activeChatUser.name}
                        {activeChatUser.chessUsername && (
                          <a
                            href={sanitizeUrl(activeChatUser.chessPlatform === 'lichess' ? `https://lichess.org/@/${sanitizeChessUsername(activeChatUser.chessUsername)}` : `https://www.chess.com/member/${sanitizeChessUsername(activeChatUser.chessUsername)}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '11px',
                              color: activeChatUser.chessPlatform === 'lichess' ? '#4b5563' : '#15803d',
                              background: activeChatUser.chessPlatform === 'lichess' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={`${activeChatUser.chessPlatform === 'lichess' ? 'Lichess' : 'Chess.com'} Profiline Git`}
                          >
                            <span>{activeChatUser.chessPlatform === 'lichess' ? '♘ Lichess:' : '♟️ Chess.com:'}</span>
                            <span>@{activeChatUser.chessUsername} ↗</span>
                          </a>
                        )}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                        {activeChatUser.elo || 1500} ELO • Oyun Eşleşmesi
                      </div>
                    </div>
                  </div>

                  {/* Header Aksiyon Butonları: Engelle & SPAM BİLDİR */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => handleToggleBlock(activeChatUser)}
                      style={{
                        background: isPartnerBlocked ? '#ef4444' : 'rgba(0,0,0,0.04)',
                        color: isPartnerBlocked ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--panel-border)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      title="Kullanıcıyı Engelle"
                    >
                      🚫 {isPartnerBlocked ? 'Engeli Kaldır' : 'Engelle'}
                    </button>

                    <button
                      onClick={() => setSpamTargetUser(activeChatUser)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      title="Uygunsuz davranışı veya mesajı yöneticiye bildir"
                    >
                      ⚠️ Spam Bildir
                    </button>
                  </div>
                </div>

                {/* Mesaj Listesi (Scrollable Body) */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.03) 0%, #f8fafc 100%)',
                  maxHeight: '440px',
                  minHeight: '360px'
                }}>
                  {currentChatMessages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>👋</div>
                      <h5 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {activeChatUser.name} ile Henüz Mesajınız Yok
                      </h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Selam vererek satranç maçı için saat veya platform kararlaştırabilirsiniz!
                      </p>
                    </div>
                  ) : (
                    currentChatMessages.map(msg => {
                      const isMe = String(msg.senderId) === String(currentUser?.id);
                      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <div 
                          key={msg.id} 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            width: '100%'
                          }}
                        >
                          <div style={{
                            maxWidth: '75%',
                            padding: '12px 16px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMe ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#ffffff',
                            color: isMe ? '#ffffff' : 'var(--text-primary)',
                            boxShadow: isMe ? '0 4px 12px rgba(14, 165, 233, 0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                            border: isMe ? 'none' : '1px solid var(--panel-border)',
                            fontSize: '14px',
                            lineHeight: '1.45',
                            wordBreak: 'break-word'
                          }}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', padding: '0 4px' }}>
                            {timeStr}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Mesaj Gönderme Formu (Footer) */}
                <form 
                  onSubmit={handleSendMessage} 
                  style={{
                    padding: '16px 20px',
                    background: '#ffffff',
                    borderTop: '1px solid var(--panel-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <input 
                    type="text"
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    placeholder={isPartnerBlocked ? "Bu kullanıcı engellenmiş durumda." : `${activeChatUser.name} kişisine mesaj yazın...`}
                    disabled={isPartnerBlocked || sendingMessage}
                    style={{
                      flex: 1,
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: '1px solid var(--panel-border)',
                      background: isPartnerBlocked ? '#f1f5f9' : '#ffffff',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={isPartnerBlocked || sendingMessage || !chatInput.trim()}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, #0284c7 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '14px 22px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: (isPartnerBlocked || sendingMessage || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (isPartnerBlocked || sendingMessage || !chatInput.trim()) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Gönder</span>
                    <span>➤</span>
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Sohbet Seçin</h4>
                <p style={{ fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
                  Sol taraftaki eşleşmelerinizden birine tıklayarak mesajlaşmaya hemen başlayabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Oyun İsteği Gönderme */}
      {requestTargetUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: '#ffffff', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: requestTargetUser.avatar ? 'transparent' : 'var(--gradient-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', overflow: 'hidden' }}>
                {requestTargetUser.avatar ? <img src={requestTargetUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : requestTargetUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{requestTargetUser.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{requestTargetUser.elo || 1500} ELO ile Maç İsteği</span>
              </div>
            </div>

            <form onSubmit={handleSendMatchRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Davet Notunuz:</label>
                <textarea 
                  rows={3} 
                  value={requestNote} 
                  onChange={(e) => setRequestNote(e.target.value)} 
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--panel-border)', fontSize: '14px', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button 
                  type="submit" 
                  disabled={sendingRequest}
                  className="btn-primary" 
                  style={{ flex: 2, padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '14px' }}
                >
                  {sendingRequest ? 'İletiliyor...' : '⚔️ İsteği Gönder'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setRequestTargetUser(null)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SPAM / UYGUNSUZLUK BİLDİRİMİ (Sadece Mesajlaşmadan Açılır) */}
      {spamTargetUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: '#ffffff', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color: '#ef4444', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              ⚠️ Şikayet & Spam Bildir
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              <b>{spamTargetUser.name}</b> kullanıcısının mesajlaşma sırasındaki uygunsuz davranışını veya tacizini yöneticiye bildirin.
            </p>

            <form onSubmit={handleReportSpamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Şikayet Nedeni:</label>
                <select 
                  value={spamReason} 
                  onChange={(e) => setSpamReason(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)', fontSize: '14px', fontWeight: 600 }}
                >
                  <option>Uygunsuz Mesaj / Küfür / Taciz</option>
                  <option>Sürekli Rahatsız Etme / Spam</option>
                  <option>Sahte Hesap / Dolandırıcılık</option>
                  <option>Diğer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Açıklama (Opsiyonel):</label>
                <textarea 
                  rows={3} 
                  value={spamDetails} 
                  onChange={(e) => setSpamDetails(e.target.value)} 
                  placeholder="Detay veya iletilen mesajdan bir parça..."
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="submit" 
                  disabled={reportingSpam}
                  style={{ flex: 2, background: '#ef4444', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
                >
                  {reportingSpam ? 'İletiliyor...' : 'Şikayeti Bildir'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setSpamTargetUser(null)}
                  style={{ flex: 1, border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text-secondary)', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
