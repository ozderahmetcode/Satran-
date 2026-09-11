import React, { useState, useRef } from 'react';

export default function AdminPanel({ 
  registrations, 
  users = [], 
  onUsersUpdate, 
  activeUsersCount = 1, 
  activeUsersList = [], 
  analytics = {},
  onRegisterUpdate, 
  tournaments, 
  onAddTournament, 
  messages = [], 
  onMessagesUpdate,
  spamReports = [],
  onReloadData
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('ozder_admin_authenticated') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // users | analytics | registrations | events | tournaments | messages | spam | backup

  // Veritabanı Yedekleme & Geri Yükleme State'leri
  const restoreFileInputRef = useRef(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState({ type: '', text: '' });

  const handleDownloadBackup = async () => {
    try {
      setIsDownloadingBackup(true);
      setBackupStatus({ type: '', text: '' });
      const response = await fetch('/api/admin/backup');
      if (!response.ok) throw new Error('Yedek alınamadı.');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nowStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `ozdersatranc_yedek_${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus({ type: 'success', text: `Yedek (${nowStr}) başarıyla indirildi!` });
    } catch (err) {
      setBackupStatus({ type: 'error', text: 'Yedek indirilirken bir hata oluştu.' });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleFileSelectForRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const uCount = Array.isArray(parsed.users) ? parsed.users.length : 0;
        const tCount = Array.isArray(parsed.tournaments) ? parsed.tournaments.length : 0;
        const rCount = Array.isArray(parsed.registrations) ? parsed.registrations.length : 0;

        const confirmed = window.confirm(
          `⚠️ DİKKAT: Seçilen Yedek Dosyasında Bulunan Veriler:\n\n` +
          `• ${uCount} Kayıtlı Kullanıcı\n` +
          `• ${tCount} Turnuva\n` +
          `• ${rCount} Turnuva Başvurusu\n\n` +
          `Bu işlem mevcut veritabanındaki kayıtların üzerine yazacaktır.\nDevam etmek istediğinize emin misiniz?`
        );

        if (!confirmed) {
          if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
          return;
        }

        setIsRestoringBackup(true);
        setBackupStatus({ type: '', text: '' });
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        const result = await res.json();
        if (res.ok) {
          setBackupStatus({ type: 'success', text: 'Veritabanı yedeği başarıyla geri yüklendi!' });
          if (onReloadData) await onReloadData();
          alert('Harika! Veritabanı yedeği başarıyla geri yüklendi.');
        } else {
          setBackupStatus({ type: 'error', text: result.error || 'Geri yükleme başarısız oldu.' });
          alert('Hata: ' + (result.error || 'Geri yükleme başarısız.'));
        }
      } catch (err) {
        setBackupStatus({ type: 'error', text: 'Geçersiz JSON dosyası seçildi.' });
        alert('Seçilen dosya geçerli bir OZDER JSON yedek dosyası değil.');
      } finally {
        setIsRestoringBackup(false);
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Süreyi okunabilir formata dönüştüren yardımcı (saniye -> Saat, Dakika, Saniye)
  const formatDuration = (totalSeconds) => {
    const sec = Math.max(0, Math.round(Number(totalSeconds) || 0));
    if (sec === 0) return '0 sn';
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} sa`);
    if (minutes > 0) parts.push(`${minutes} dk`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sn`);
    return parts.join(' ');
  };

  // Arama & Filtreleme
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('all'); // all | verified | unverified

  // Kullanıcı Düzenleme State'i
  const [editingUser, setEditingUser] = useState(null);
  const [editUserFormData, setEditUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    chessUsername: '',
    elo: 1500,
    verified: true
  });

  const openEditUserModal = (u) => {
    setEditingUser(u);
    setEditUserFormData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      chessUsername: u.chessUsername || '',
      elo: u.elo || 1500,
      verified: u.verified !== false
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserFormData)
      });
      const result = await response.json();
      if (response.ok) {
        if (onUsersUpdate) onUsersUpdate(result.users);
        setEditingUser(null);
        alert("Kullanıcı bilgileri başarıyla güncellendi!");
      } else {
        alert(result.error || "Güncelleme başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  const handleDeleteUserAccount = async (userId, userName) => {
    if (!window.confirm(`"${userName}" adlı kullanıcıyı ve ilgili turnuva kayıtlarını kalıcı olarak SİLMEK istediğinize emin misiniz?`)) return;

    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok) {
        if (onUsersUpdate) onUsersUpdate(result.users, result.registrations);
        alert("Kullanıcı hesabı tamamen silindi.");
      } else {
        alert(result.error || "Silme başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  // CSV / Excel Veri Dışa Aktarma
  const exportUsersToCSV = () => {
    if (!users || users.length === 0) {
      alert("Dışa aktarılacak kullanıcı bulunmuyor.");
      return;
    }
    const headers = ["ID", "Ad Soyad", "E-Posta", "Telefon", "Satranç Kullanıcı Adı", "ELO Puanı", "Sitede Geçirilen Süre", "Giriş/Ziyaret Sayısı", "Doğrulandı Mı"];
    const rows = users.map(u => [
      `"${u.id}"`,
      `"${u.name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.chessUsername || ''}"`,
      u.elo || 1500,
      `"${formatDuration(u.totalTimeSpentSeconds || 0)}"`,
      u.visitCount || 0,
      u.verified !== false ? "Evet" : "Hayır"
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `OZDER_Kullanici_Listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRegistrationsToCSV = () => {
    if (!registrations || registrations.length === 0) {
      alert("Dışa aktarılacak kayıt bulunmuyor.");
      return;
    }
    const headers = ["Turnuva Başlığı", "Katılımcı Adı", "Satranç Kullanıcı Adı", "Telefon", "Kayıt Tarihi"];
    const rows = registrations.map(r => {
      const tour = tournaments.find(t => t.id === r.tournamentId) || { title: `Turnuva #${r.tournamentId}` };
      const user = users.find(u => u.id === r.userId) || { name: r.name, phone: '-', chessUsername: r.chessUsername };
      return [
        `"${tour.title}"`,
        `"${user.name || r.name || ''}"`,
        `"${user.chessUsername || r.chessUsername || ''}"`,
        `"${user.phone || ''}"`,
        `"${r.registrationDate || '-'}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `OZDER_Turnuva_Kayitlari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Eşleştirme Yönetimi Seçili Turnuva
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [roundResults, setRoundResults] = useState({}); // { [matchKey]: result }
  const [swissViewTab, setSwissViewTab] = useState('pairings'); // pairings | standings

  // Cafe Manuel Misafir Ekleme State'i
  const [guestName, setGuestName] = useState('');
  const [guestElo, setGuestElo] = useState('1500');
  const [guestLoading, setGuestLoading] = useState(false);

  const handleAddGuestParticipant = async (e, tourId) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert("Lütfen misafir oyuncunun Adını ve Soyadını yazın.");
      return;
    }

    setGuestLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tourId}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestName.trim(),
          elo: parseInt(guestElo) || 1500
        })
      });
      const result = await response.json();
      if (response.ok) {
        if (onUsersUpdate) onUsersUpdate(result.users, result.registrations);
        else if (onRegisterUpdate) onRegisterUpdate(result.registrations);
        setGuestName('');
        setGuestElo('1500');
        alert("Cafeden misafir oyuncu turnuvaya başarıyla eklendi!");
      } else {
        alert(result.error || "Misafir eklenemedi.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    } finally {
      setGuestLoading(false);
    }
  };

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
      try {
        sessionStorage.setItem('ozder_admin_authenticated', 'true');
      } catch (e) {}
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

  const [editingTour, setEditingTour] = useState(null); // Düzenlenen turnuva objesi veya null
  const [editFormData, setEditFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    fee: '',
    maxQuota: '',
    totalRounds: '',
    status: 'active'
  });

  const handleCancelTournament = async (tourId) => {
    if (!window.confirm("Bu turnuvayı İPTAL ETMEK istediğinize emin misiniz? Durumu 'İptal Edildi' olarak güncellenecektir.")) return;

    try {
      const response = await fetch(`/api/tournaments/${tourId}/cancel`, { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        onAddTournament(result.tournaments);
        alert("Turnuva başarıyla iptal edildi.");
      } else {
        alert(result.error || "İptal işlemi başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  const handleDeleteTournament = async (tourId) => {
    if (!window.confirm("Bu turnuvayı ve ilgili tüm kayıtları tamamen SİLMEK istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;

    try {
      const response = await fetch(`/api/tournaments/${tourId}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok) {
        onAddTournament(result.tournaments);
        if (result.registrations) {
          onRegisterUpdate(result.registrations);
        }
        if (selectedTourId === tourId) {
          setSelectedTourId(null);
        }
        alert("Turnuva tamamen silindi.");
      } else {
        alert(result.error || "Silme işlemi başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
    }
  };

  const openEditModal = (tour) => {
    setEditingTour(tour);
    setEditFormData({
      title: tour.title || '',
      date: tour.date || '',
      time: tour.time || '',
      location: tour.location || '',
      fee: tour.fee || '',
      maxQuota: tour.maxQuota || '20',
      totalRounds: tour.totalRounds || '5',
      status: tour.status || 'active'
    });
  };

  const handleUpdateTournament = async (e) => {
    e.preventDefault();
    if (!editingTour) return;

    try {
      const response = await fetch(`/api/tournaments/${editingTour.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const result = await response.json();
      if (response.ok) {
        onAddTournament(result.tournaments);
        setEditingTour(null);
        alert("Turnuva bilgileri başarıyla güncellendi!");
      } else {
        alert(result.error || "Güncelleme başarısız.");
      }
    } catch (error) {
      alert("Sunucu bağlantı hatası.");
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
            style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}
          />
          <input
            type="password"
            required
            placeholder="Yönetici Giriş Şifresi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={handleDownloadBackup}
            disabled={isDownloadingBackup}
            className="btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Tüm veritabanı yedeğini anında bilgisayara indir"
          >
            📥 {isDownloadingBackup ? 'İndiriliyor...' : 'Hızlı Yedek İndir'}
          </button>
          <button 
            onClick={() => {
              setIsAuthenticated(false);
              try {
                sessionStorage.removeItem('ozder_admin_authenticated');
              } catch (e) {}
            }} 
            className="btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Güvenli Çıkış
          </button>
        </div>
      </section>

      {/* KPI / Dashboard Metrik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            👥
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOPLAM ÜYE SAYISI</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>{users.length}</div>
            <div style={{ fontSize: '11px', color: '#10b981' }}>Kayıtlı ve onaylı hesaplar</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', position: 'relative' }}>
            🟢
            <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ŞU AN SİTEDE AKTİF</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>{activeUsersCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Canlı çevrimiçi kullanıcı</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            ⏱️
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOPLAM GEÇİRİLEN SÜRE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6' }}>
              {formatDuration(analytics.totalTimeSpentSeconds || 0)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Toplam Ziyaret: {analytics.totalVisits || 0}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            🏆
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOPLAM TURNUVA</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>{tournaments.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tournaments.filter(t => t.status === 'active').length} aktif kayıt açık</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            📝
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOPLAM KATILIM KAYDI</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>{registrations.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Turnuva masa başvuruları</div>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { id: 'users', label: `Kullanıcılar (${users.length}) 👥` },
          { id: 'analytics', label: `Ziyaret & Süre Analitiği 📊` },
          { id: 'registrations', label: `Katılımcı Kayıtları (${registrations.length}) 📋` },
          { id: 'events', label: `Etkinlik & Turnuva Yönetimi (${tournaments.length}) 📅` },
          { id: 'tournaments', label: 'Eşleştirme Sistemi ♟️' },
          { id: 'messages', label: `Gelen Mesajlar (${messages.length}) ✉️` },
          { id: 'spam', label: `Spam & Şikayetler (${spamReports.filter(s => s.status === 'pending').length} bekleyen) ⚠️` },
          { id: 'backup', label: '💾 Veritabanı & Yedekleme' }
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

      {/* Tab Content: Users & Active Status */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Users Live Monitor Card */}
          <div className="glass-panel" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  🟢 Canlı Ziyaretçi & Aktif Kullanıcı Monitörü ({activeUsersCount})
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Otomatik yenileniyor (Her 5 saniyede)</span>
            </div>

            {activeUsersList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Şu an en az 1 aktif kullanıcı sitede geziniyor.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {activeUsersList.map((session, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid var(--panel-border)',
                    fontSize: '13px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{session.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sayfa: {session.page}</div>
                      <div style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 600, marginTop: '2px' }}>
                        ⏱️ Oturum: {formatDuration(session.sessionSeconds || 0)}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Çevrimiçi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered Users Table */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700 }}>
                  👤 Kayıtlı Topluluk Üyeleri ({users.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  Üye arayabilir, bilgilerini ve ELO puanlarını güncelleyebilir veya Excel/CSV olarak indirebilirsiniz.
                </p>
              </div>

              {/* Dışa Aktarma & Hızlı Butonlar */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={exportUsersToCSV}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  📥 Üye Listesini İndir (Excel/CSV)
                </button>
              </div>
            </div>

            {/* Arama & Filtre Çubuğu */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 İsim, e-posta, telefon veya satranç adı ara..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '240px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <select
                value={userFilterRole}
                onChange={(e) => setUserFilterRole(e.target.value)}
                style={{
                  background: 'var(--bg-color)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              >
                <option value="all">Tüm Üyeler ({users.length})</option>
                <option value="verified">Sadece Doğrulanmışlar ({users.filter(u => u.verified !== false).length})</option>
                <option value="unverified">Doğrulama Bekleyenler ({users.filter(u => u.verified === false).length})</option>
              </select>
            </div>

            {(() => {
              const filteredUsers = users.filter(u => {
                const term = userSearchTerm.toLowerCase();
                const matchesSearch = 
                  (u.name && u.name.toLowerCase().includes(term)) ||
                  (u.email && u.email.toLowerCase().includes(term)) ||
                  (u.phone && u.phone.toLowerCase().includes(term)) ||
                  (u.chessUsername && u.chessUsername.toLowerCase().includes(term));
                
                if (!matchesSearch) return false;
                if (userFilterRole === 'verified') return u.verified !== false;
                if (userFilterRole === 'unverified') return u.verified === false;
                return true;
              });

              if (filteredUsers.length === 0) {
                return <p style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '16px 0' }}>Aradığınız kriterlere uygun üye bulunamadı.</p>;
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '12px 10px' }}>Üye</th>
                        <th style={{ padding: '12px 10px' }}>E-posta</th>
                        <th style={{ padding: '12px 10px' }}>Telefon</th>
                        <th style={{ padding: '12px 10px' }}>Satranç Platformu</th>
                        <th style={{ padding: '12px 10px' }}>ELO</th>
                        <th style={{ padding: '12px 10px' }}>Sitede Geçirilen Süre</th>
                        <th style={{ padding: '12px 10px' }}>Durum</th>
                        <th style={{ padding: '12px 10px' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--gradient-gold)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '13px'
                              }}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{u.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {u.username ? `@${u.username}` : `ID: ${u.id}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--text-primary)' }}>{u.email}</td>
                          <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{u.phone || '-'}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>@{u.chessUsername || '-'}</span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{u.elo || 1500}</span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '13px' }}>
                              ⏱️ {formatDuration(u.totalTimeSpentSeconds || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {u.visitCount || 0} giriş
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: u.verified !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: u.verified !== false ? '#10b981' : '#ef4444'
                            }}>
                              {u.verified !== false ? '✓ Doğrulandı' : 'Beklemede'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => openEditUserModal(u)}
                                style={{
                                  background: 'rgba(14, 165, 233, 0.1)',
                                  color: '#0ea5e9',
                                  border: '1px solid rgba(14, 165, 233, 0.25)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                ✏️ Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteUserAccount(u.id, u.name)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                🗑️ Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab Content: Analytics & Visits */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Üst Analitik Özet Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOPLAM SİTEDE KALINAN SÜRE</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0ea5e9', marginTop: '6px' }}>
                {formatDuration(analytics.totalTimeSpentSeconds || 0)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Tüm ziyaretçi ve üyelerin kümülatif süresi
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOPLAM GİRİŞ / ZİYARET</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                {analytics.totalVisits || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Başlatılan toplam tekil oturum sayısı
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>ORTALAMA ZİYARET SÜRESİ</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                {analytics.totalVisits > 0 
                  ? formatDuration(Math.round((analytics.totalTimeSpentSeconds || 0) / analytics.totalVisits))
                  : '0 sn'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Oturum başına düşen ortalama süre
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>ŞU AN CANLI OTURUMLAR</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#8b5cf6', marginTop: '6px' }}>
                {activeUsersCount} Aktif
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Son 35 saniyede sinyal veren cihazlar
              </div>
            </div>
          </div>

          {/* Dönemsel Giriş Sayıları Paneli: Saatlik, Günlük, Haftalık, Aylık, Yıllık */}
          <div className="glass-panel">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700 }}>
                📅 Dönemsel Siteye Giriş Sayıları
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                Sitenize saatlik, günlük, haftalık, aylık ve yıllık olarak kaç kez giriş yapıldığını buradan takip edebilirsiniz.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Günlük Girişler */}
              <div style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📆</span> Günlük Girişler
                </h4>
                {Object.keys(analytics.daily || {}).length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Henüz kayıtlı günlük giriş yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {Object.entries(analytics.daily || {})
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 10)
                      .map(([date, count]) => (
                        <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.04)' }}>
                          <span style={{ fontWeight: 600 }}>{date}</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                            {count} Ziyaret
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Saatlik Girişler (Son Saatler) */}
              <div style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏰</span> Saatlik Girişler
                </h4>
                {Object.keys(analytics.hourly || {}).length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Henüz saatlik veri oluşmadı.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {Object.entries(analytics.hourly || {})
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 10)
                      .map(([hour, count]) => (
                        <div key={hour} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.04)' }}>
                          <span style={{ fontWeight: 600 }}>{hour}</span>
                          <span style={{ fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                            {count} Giriş
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Haftalık Girişler */}
              <div style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📊</span> Haftalık Girişler
                </h4>
                {Object.keys(analytics.weekly || {}).length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Henüz haftalık veri oluşmadı.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {Object.entries(analytics.weekly || {})
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 10)
                      .map(([week, count]) => (
                        <div key={week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.04)' }}>
                          <span style={{ fontWeight: 600 }}>{week}. Hafta</span>
                          <span style={{ fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                            {count} Giriş
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Aylık & Yıllık Girişler */}
              <div style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🗓️</span> Aylık ve Yıllık Girişler
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>AY BAZINDA</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                      {Object.entries(analytics.monthly || {})
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([month, count]) => (
                          <div key={month} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            <span>{month}</span>
                            <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{count} Giriş</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>YIL BAZINDA</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(analytics.yearly || {})
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([year, count]) => (
                          <div key={year} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            <span>{year} Yılı</span>
                            <span style={{ fontWeight: 700, color: '#0ea5e9' }}>{count} Giriş</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Sitede En Çok Vakit Geçiren Üyeler Sıralaması */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              🏆 Sitede En Çok Vakit Geçiren Üyeler
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 10px' }}>Sıra</th>
                    <th style={{ padding: '12px 10px' }}>Üye Adı</th>
                    <th style={{ padding: '12px 10px' }}>Kullanıcı Adı</th>
                    <th style={{ padding: '12px 10px' }}>Sitede Geçirdiği Toplam Süre</th>
                    <th style={{ padding: '12px 10px' }}>Giriş Sayısı</th>
                    <th style={{ padding: '12px 10px' }}>Son Görülme</th>
                  </tr>
                </thead>
                <tbody>
                  {[...users]
                    .sort((a, b) => (b.totalTimeSpentSeconds || 0) - (a.totalTimeSpentSeconds || 0))
                    .map((u, idx) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: idx < 3 ? '#f59e0b' : 'var(--text-secondary)' }}>
                          {idx === 0 ? '🥇 1.' : idx === 1 ? '🥈 2.' : idx === 2 ? '🥉 3.' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: '12px 10px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {u.username ? `@${u.username}` : '-'}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ fontWeight: 800, color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '13px' }}>
                            ⏱️ {formatDuration(u.totalTimeSpentSeconds || 0)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {u.visitCount || 0} Giriş
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('tr-TR') : 'Kayıtlı'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab Content: Registrations */}
      {activeTab === 'registrations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Table */}
          <div className="glass-panel" style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                Buluşma Katılım Kayıtları ({registrations.length})
              </h3>
              {registrations.length > 0 && (
                <button
                  onClick={exportRegistrationsToCSV}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  📥 Kayıtları İndir (Excel/CSV)
                </button>
              )}
            </div>
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
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{matchedUser.name}</span>
                              {(matchedUser.isGuest || reg.isGuest || matchedUser.name?.includes('(Misafir)')) && (
                                <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  ☕ Misafir
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>@{matchedUser.chessUsername} ({matchedUser.elo || 1500} ELO)</div>
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
                <input type="text" required placeholder="1. X Cafe Hızlı Satranç..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tarih *</label>
                  <input type="text" required placeholder="15.08.2026" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Saat *</label>
                  <input type="text" required placeholder="15:00" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Konum *</label>
                <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ücret</label>
                  <input type="text" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: e.target.value })} style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Kontenjan</label>
                  <input type="number" required value={formData.maxQuota} onChange={(e) => setFormData({ ...formData, maxQuota: e.target.value })} style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tur Sayısı</label>
                  <select value={formData.totalRounds} onChange={(e) => setFormData({ ...formData, totalRounds: e.target.value })} style={{ width: '100%', background: '#0d121e', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Tur</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Etkinlik Yayınla</button>
            </form>

            {/* Hızlı Turnuva Listesi & Düzenleme / İptal Alanı */}
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                📋 Etkinlik Listesi & Hızlı İşlemler
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tournaments.map(t => (
                  <div key={t.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: t.status === 'cancelled' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--panel-border)',
                    fontSize: '13px',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{t.title}</span>
                        {t.status === 'cancelled' && (
                          <span style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>İptal</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>📅 {t.date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(t)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        ✏️ Düzenle
                      </button>
                      {t.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelTournament(t.id)}
                          style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          🚫 İptal Et
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Events & Tournaments Management (Düzenleme, İptal, Silme) */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700 }}>
                  📅 Mevcut Turnuvalar ve Etkinlikler ({tournaments.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  Buradan turnuvaları düzenleyebilir, iptal edebilir veya tamamen kaldırabilirsiniz.
                </p>
              </div>
            </div>

            {tournaments.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Henüz açılmış bir etkinlik veya turnuva bulunmuyor.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tournaments.map(t => {
                  const regCount = registrations.filter(r => r.tournamentId === t.id).length;
                  const isCancelled = t.status === 'cancelled';
                  const isCompleted = t.status === 'completed';

                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isCancelled ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255,255,255,0.02)',
                        padding: '20px',
                        border: isCancelled ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--panel-border)',
                        borderRadius: '12px',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h4 style={{ fontWeight: 700, fontSize: '17px', margin: 0 }}>{t.title}</h4>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isCancelled 
                              ? 'rgba(239, 68, 68, 0.15)' 
                              : isCompleted 
                              ? 'rgba(245, 158, 11, 0.15)' 
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isCancelled 
                              ? '#ef4444' 
                              : isCompleted 
                              ? '#f59e0b' 
                              : '#10b981'
                          }}>
                            {isCancelled ? '❌ İPTAL EDİLDİ' : isCompleted ? `🏆 BİTTİ (${t.champion})` : '🟢 AKTİF (Kayıt Açık)'}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                          📍 {t.location} &nbsp;|&nbsp; 📅 {t.date} {t.time} &nbsp;|&nbsp; 💰 {t.fee} <br />
                          👥 Kayıt: <strong>{regCount} / {t.maxQuota}</strong> kişi &nbsp;|&nbsp; ♟️ {t.totalRounds || 5} Tur (Oynanan: {t.rounds?.length || 0})
                        </p>
                      </div>

                      {/* İşlem Butonları */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openEditModal(t)}
                          className="btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          ✏️ Düzenle
                        </button>

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelTournament(t.id)}
                            style={{
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            🚫 İptal Et
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteTournament(t.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Düzenleme Modalı */}
      {editingTour && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800 }}>
                ✏️ Turnuvayı / Etkinliği Düzenle
              </h3>
              <button
                onClick={() => setEditingTour(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Turnuva Başlığı *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tarih *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Saat *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Konum *</label>
                <input
                  type="text"
                  required
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ücret</label>
                  <input
                    type="text"
                    value={editFormData.fee}
                    onChange={(e) => setEditFormData({ ...editFormData, fee: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Kontenjan</label>
                  <input
                    type="number"
                    required
                    value={editFormData.maxQuota}
                    onChange={(e) => setEditFormData({ ...editFormData, maxQuota: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tur Sayısı</label>
                  <select
                    value={editFormData.totalRounds}
                    onChange={(e) => setEditFormData({ ...editFormData, totalRounds: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Tur</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Durum</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="active">🟢 Aktif (Kayıt Açık)</option>
                    <option value="cancelled">🚫 İptal Edildi</option>
                    <option value="completed">🏆 Tamamlandı</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTour(null)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kullanıcı Düzenleme Modalı */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800 }}>
                👤 Üye Bilgilerini Düzenle
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ad Soyad *</label>
                <input
                  type="text"
                  required
                  value={editUserFormData.name}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, name: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>E-Posta *</label>
                  <input
                    type="email"
                    required
                    value={editUserFormData.email}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, email: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Telefon</label>
                  <input
                    type="text"
                    value={editUserFormData.phone}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, phone: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Satranç Kullanıcı Adı</label>
                  <input
                    type="text"
                    value={editUserFormData.chessUsername}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, chessUsername: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>ELO Puanı</label>
                  <input
                    type="number"
                    value={editUserFormData.elo}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, elo: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hesap Doğrulama Durumu</label>
                <select
                  value={editUserFormData.verified ? 'true' : 'false'}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, verified: e.target.value === 'true' })}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="true">✓ Doğrulanmış Hesap</option>
                  <option value="false">⏳ Doğrulama Bekliyor / Askıda</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Kaydet
                </button>
              </div>
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
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', border: '1px solid var(--panel-border)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontWeight: 700 }}>{t.title}</h4>
                        {t.status === 'cancelled' && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>İptal Edildi</span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📅 {t.date} • Durum: {t.status === 'active' ? 'Devam Ediyor' : t.status === 'cancelled' ? 'İptal Edildi' : 'Tamamlandı (Şampiyon: ' + t.champion + ')'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEditModal(t)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        ✏️ Düzenle
                      </button>
                      {t.status !== 'cancelled' && (
                        <button onClick={() => handleCancelTournament(t.id)} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                          🚫 İptal Et
                        </button>
                      )}
                      <button onClick={() => setSelectedTourId(t.id)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                        Eşleştirmeleri Yönet
                      </button>
                    </div>
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
              const isCompleted = currentTour.status === 'completed';

              const calculateTourStandings = (tour) => {
                if (!tour) return [];
                const playersMap = {};

                const tourRegs = registrations?.filter(r => r.tournamentId === tour.id) || [];
                tourRegs.forEach(r => {
                  const u = users.find(user => String(user.id) === String(r.userId));
                  const displayName = r.name || u?.name || u?.chessUsername || u?.username || r.userId;
                  const elo = u?.elo || 1500;
                  playersMap[r.userId] = {
                    id: r.userId,
                    name: displayName,
                    elo: elo,
                    points: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    opponents: [],
                    bh: 0
                  };
                });

                tour.rounds?.forEach(r => {
                  r.pairings?.forEach(p => {
                    [p.whiteId, p.blackId].forEach(id => {
                      if (!id) return;
                      if (!playersMap[id]) {
                        const u = users.find(user => String(user.id) === String(id));
                        const reg = tourRegs.find(regItem => String(regItem.userId) === String(id));
                        const displayName = reg?.name || u?.name || u?.chessUsername || u?.username || id;
                        playersMap[id] = {
                          id: id,
                          name: displayName,
                          elo: u?.elo || 1500,
                          points: 0,
                          wins: 0,
                          draws: 0,
                          losses: 0,
                          opponents: [],
                          bh: 0
                        };
                      }
                    });

                    if (p.result === 'white' && p.whiteId) {
                      if (playersMap[p.whiteId]) {
                        playersMap[p.whiteId].points += 1;
                        playersMap[p.whiteId].wins += 1;
                      }
                      if (p.blackId && playersMap[p.blackId]) playersMap[p.blackId].losses += 1;
                    } else if (p.result === 'black') {
                      if (p.blackId && playersMap[p.blackId]) {
                        playersMap[p.blackId].points += 1;
                        playersMap[p.blackId].wins += 1;
                      }
                      if (p.whiteId && playersMap[p.whiteId]) playersMap[p.whiteId].losses += 1;
                    } else if (p.result === 'draw') {
                      if (p.whiteId && playersMap[p.whiteId]) {
                        playersMap[p.whiteId].points += 0.5;
                        playersMap[p.whiteId].draws += 1;
                      }
                      if (p.blackId && playersMap[p.blackId]) {
                        playersMap[p.blackId].points += 0.5;
                        playersMap[p.blackId].draws += 1;
                      }
                    }

                    if (p.whiteId && p.blackId) {
                      if (playersMap[p.whiteId]) playersMap[p.whiteId].opponents.push(p.blackId);
                      if (playersMap[p.blackId]) playersMap[p.blackId].opponents.push(p.whiteId);
                    }
                  });
                });

                const standings = Object.values(playersMap);
                standings.forEach(p => {
                  let bh = 0;
                  p.opponents.forEach(oppId => {
                    if (playersMap[oppId]) bh += playersMap[oppId].points;
                  });
                  p.bh = bh;
                });

                standings.sort((a, b) => {
                  if (b.points !== a.points) return b.points - a.points;
                  if (b.bh !== a.bh) return b.bh - a.bh;
                  return (b.elo || 0) - (a.elo || 0);
                });

                return standings;
              };

              const tourStandings = calculateTourStandings(currentTour);

              const renderStandingsTable = (title) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800, margin: 0 }}>
                      {title}
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Toplam {tourStandings.length} Oyuncu Sıralandı
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--panel-border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>Derece</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>Oyuncu (Ad Soyad)</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>Rating</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>Toplam Puan</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>BH (Buchholz)</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>G / B / M</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700 }}>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tourStandings.length === 0 ? (
                          <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Henüz maç oynanmadı veya kayıt bulunmuyor.</td></tr>
                        ) : (
                          tourStandings.map((p, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === tourStandings.length - 1 && tourStandings.length > 1;
                            return (
                              <tr key={p.id || idx} style={{
                                borderBottom: '1px solid var(--panel-border)',
                                background: isFirst ? 'rgba(245, 158, 11, 0.12)' : isLast ? 'rgba(239, 68, 68, 0.04)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'
                              }}>
                                <td style={{ padding: '14px 16px', fontWeight: 800 }}>
                                  {idx === 0 ? '🥇 1.' : idx === 1 ? '🥈 2.' : idx === 2 ? '🥉 3.' : `${idx + 1}.`}
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: 700, color: isFirst ? 'var(--accent-secondary)' : 'inherit' }}>
                                  {p.name}
                                </td>
                                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{p.elo}</td>
                                <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '15px' }}>{p.points}</td>
                                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{p.bh}</td>
                                <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                  <span style={{ color: '#10b981', fontWeight: 600 }}>{p.wins}G</span> - <span style={{ color: '#f59e0b', fontWeight: 600 }}>{p.draws}B</span> - <span style={{ color: '#ef4444', fontWeight: 600 }}>{p.losses}M</span>
                                </td>
                                <td style={{ padding: '14px 16px' }}>
                                  {isFirst ? (
                                    <span style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                                      🏆 1. (ŞAMPİYON)
                                    </span>
                                  ) : isLast ? (
                                    <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                      Sonuncu ({idx + 1}.)
                                    </span>
                                  ) : (
                                    <span style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                      {idx + 1}. Sıra
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );

              return (
                <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <button onClick={() => setSelectedTourId(null)} className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}>
                    ← Turnuva Listesine Dön
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{ fontWeight: 800, margin: 0 }}>{currentTour.title}</h2>
                        {isCompleted ? (
                          <span style={{ background: 'var(--gradient-gold)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                            🏆 TAMAMLANDI
                          </span>
                        ) : (
                          <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                            🟢 DEVAM EDİYOR
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
                        Toplam Tur: {currentTour.totalRounds} • Mevcut Tur: {roundsCount} / {currentTour.totalRounds} • Katılımcı: {registrations.filter(r => r.tournamentId === currentTour.id).length} Kişi
                      </p>
                    </div>
                  </div>

                  {/* Tamamlanmış Turnuva Görünümü: Şampiyon Kartı ve Sıralama Tablosu */}
                  {isCompleted ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: '16px',
                        padding: '28px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-secondary)', margin: 0 }}>
                          Turnuva Başarıyla Tamamlandı!
                        </h3>
                        <p style={{ fontSize: '18px', fontWeight: 800, marginTop: '10px', color: 'var(--text-primary)' }}>
                          Şampiyon: <span style={{ color: 'var(--accent-primary)' }}>{currentTour.champion}</span> 🥇
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0 }}>
                          Tüm turlar oynandı, puanlar hesaplandı ve etkinlik resmen sonlandı.
                        </p>
                      </div>

                      {/* 1. den Sonuncuya Sıralama Tablosu */}
                      {renderStandingsTable('🏁 Turnuva Nihai Sıralaması (Kim Birinci, Kim Sonuncu)')}

                      {/* Geçmiş Tur Eşleşmelerini İnceleme */}
                      {roundsCount > 0 && (
                        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '24px' }}>
                          <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                            📋 Oynanan Turlar ve Maç Sonuçları
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {currentTour.rounds.map((round, rIdx) => (
                              <div key={rIdx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '16px' }}>
                                <strong style={{ display: 'block', marginBottom: '12px', color: 'var(--accent-secondary)' }}>Tur {round.roundNumber}</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {round.pairings?.map((match, mIdx) => {
                                    const wU = users.find(u => u.id === match.whiteId) || registrations.find(r => r.userId === match.whiteId) || { name: match.whiteId };
                                    const bU = users.find(u => u.id === match.blackId) || registrations.find(r => r.userId === match.blackId) || { name: match.blackId };
                                    return (
                                      <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                                        <span style={{ fontWeight: 600, flex: 1, textAlign: 'right' }}>⚪ {wU.name}</span>
                                        <span style={{ margin: '0 16px', padding: '3px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', fontWeight: 800 }}>
                                          {match.result === 'white' ? '1 - 0' : match.result === 'black' ? '0 - 1' : match.result === 'draw' ? '½ - ½' : 'vs'}
                                        </span>
                                        <span style={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>⚫ {match.blackId ? bU.name : 'Bay (Boşta)'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Aktif Turnuva Görünümü */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Navigasyon Sekmesi: Eşleştirmeler vs Canlı Sıralama */}
                      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)' }}>
                        <button
                          onClick={() => setSwissViewTab('pairings')}
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: swissViewTab === 'pairings' ? 'rgba(0,0,0,0.04)' : 'transparent',
                            border: 'none',
                            borderBottom: swissViewTab === 'pairings' ? '2px solid var(--accent-primary)' : 'none',
                            color: swissViewTab === 'pairings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-title)',
                            cursor: 'pointer'
                          }}
                        >
                          ♟️ {roundsCount === 0 ? 'Turnuvayı Başlat' : `Tur #${roundsCount} Eşleştirmeleri`}
                        </button>
                        <button
                          onClick={() => setSwissViewTab('standings')}
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: swissViewTab === 'standings' ? 'rgba(0,0,0,0.04)' : 'transparent',
                            border: 'none',
                            borderBottom: swissViewTab === 'standings' ? '2px solid var(--accent-primary)' : 'none',
                            color: swissViewTab === 'standings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-title)',
                            cursor: 'pointer'
                          }}
                        >
                          📊 Canlı Sıralama & Puan Durumu ({tourStandings.length})
                        </button>
                      </div>

                      {swissViewTab === 'standings' ? (
                        renderStandingsTable('📊 Güncel Puan Durumu ve Sıralama (1. den Sonuncuya)')
                      ) : (
                        <>
                          {/* Cafeden Manuel / Misafir Katılımcı Ekleme Alanı */}
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '12px',
                            padding: '20px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '20px' }}>☕</span>
                              <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#f59e0b', margin: 0 }}>
                                Cafeden Manuel Oyuncu / Misafir Ekle
                              </h4>
                              <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                Geçici Turnuva Katılımı
                              </span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                              Kafede olup siteye üye olmadan turnuvaya katılmak isteyen oyuncuları anında ekleyebilirsiniz. Maç sonuçları katılımcıların ELO'sunu normal etkiler; turnuva bittiğinde misafir hesaplar otomatik temizlenir.
                            </p>
                            
                            <form onSubmit={(e) => handleAddGuestParticipant(e, currentTour.id)} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                              <div style={{ flex: '2', minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                  Oyuncu Adı Soyadı *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Örn: Ahmet Can"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
                                />
                              </div>
                              <div style={{ flex: '1', minWidth: '130px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                  Başlangıç ELO
                                </label>
                                <input
                                  type="number"
                                  placeholder="1500"
                                  value={guestElo}
                                  onChange={(e) => setGuestElo(e.target.value)}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
                                />
                              </div>
                              <div>
                                <button
                                  type="submit"
                                  disabled={guestLoading}
                                  className="btn-primary"
                                  style={{
                                    padding: '10px 20px',
                                    fontSize: '13px',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none',
                                    cursor: guestLoading ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  {guestLoading ? 'Ekleniyor...' : '+ Misafiri Turnuvaya Ekle'}
                                </button>
                              </div>
                            </form>

                            {/* Turnuvaya Kayıtlı Oyuncu Listesi Özeti */}
                            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed rgba(245, 158, 11, 0.2)' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Mevcut Katılımcılar ({registrations.filter(r => r.tournamentId === currentTour.id).length}): </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {registrations.filter(r => r.tournamentId === currentTour.id).map((r, i) => {
                                  const u = users.find(user => user.id === r.userId);
                                  const isGuest = u?.isGuest || r.isGuest || r.name?.includes('(Misafir)');
                                  return (
                                    <span key={i} style={{
                                      fontSize: '12px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: isGuest ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)',
                                      color: isGuest ? '#f59e0b' : 'var(--text-primary)',
                                      border: isGuest ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--panel-border)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      {isGuest ? '☕' : '👤'} {r.name || u?.name} ({u?.elo || 1500})
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Round Pairing Control */}
                          {roundsCount === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px' }}>
                              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Turnuva henüz başlatılmadı. Cafeden gelen misafirleri ekledikten sonra 1. Tur eşleştirmelerini başlatabilirsiniz.</p>
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
                                  const wUser = users.find(u => u.id === pairing.whiteId) || registrations.find(r => r.userId === pairing.whiteId) || { name: 'Bay (Boşta)' };
                                  const bUser = users.find(u => u.id === pairing.blackId) || registrations.find(r => r.userId === pairing.blackId) || { name: 'Bay (Boşta)' };
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
                                          <strong style={{ color: 'var(--text-primary)' }}>⚪ Beyaz:</strong> {wUser.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({wUser.elo || 1500} ELO)</span>
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
                                      {roundsCount === currentTour.totalRounds ? "🏆 Turnuvayı Kapat ve Şampiyonu Belirle" : `${roundsCount + 1}. Tur Eşleştirmelerini Oluştur`}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
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

      {/* Tab Content: Spam & Abuse Reports */}
      {activeTab === 'spam' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                ⚠️ Spam ve Uygunsuzluk Bildirimleri ({spamReports.length})
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Oyuncuların "Rakip Bul" ve mesajlaşma ekranlarından yaptığı şikayetler.
              </p>
            </div>
            <button 
              onClick={onReloadData}
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              🔄 Yenile
            </button>
          </div>

          {spamReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Henüz herhangi bir spam veya uygunsuzluk şikayeti bildirilmedi.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {spamReports.map(report => {
                const isPending = report.status === 'pending';
                return (
                  <div 
                    key={report.id} 
                    style={{
                      background: isPending ? 'rgba(239, 68, 68, 0.03)' : '#fff',
                      border: `1px solid ${isPending ? 'rgba(239, 68, 68, 0.3)' : 'var(--panel-border)'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          background: isPending ? '#ef4444' : '#10b981',
                          color: '#fff'
                        }}>
                          {isPending ? '⏳ İnceleniyor / Beklemede' : '✅ Çözüldü'}
                        </span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                          Şikayet Edilen: <span style={{ color: '#ef4444' }}>{report.targetUserName || `ID #${report.targetUserId}`}</span>
                        </strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          (Bildiren: <b>{report.reporterName || `ID #${report.reporterId}`}</b>)
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {new Date(report.createdAt).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                      <div><b>Sebep / Başlık:</b> {report.reason}</div>
                      {report.details && (
                        <div style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                          <b>Açıklama:</b> {report.details}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      {isPending && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/spam-reports/${report.id}/resolve`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ adminNote: 'İncelendi ve kapatıldı.' })
                              });
                              if (res.ok) {
                                if (onReloadData) onReloadData();
                                alert("Şikayet 'Çözüldü' olarak işaretlendi.");
                              }
                            } catch (err) {
                              alert("İşlem başarısız.");
                            }
                          }}
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', background: '#10b981', borderColor: '#10b981' }}
                        >
                          ✓ İncelendi / Çözüldü İşaretle
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUserAccount(report.targetUserId, report.targetUserName || 'Kullanıcı')}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        🚫 Şikayet Edilen Hesabı Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Database Backup & Restore */}
      {activeTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Message */}
          {backupStatus.text && (
            <div style={{
              padding: '14px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: backupStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: backupStatus.type === 'success' ? '#10b981' : '#ef4444',
              border: `1px solid ${backupStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              <span>{backupStatus.type === 'success' ? '✅ ' : '❌ '}{backupStatus.text}</span>
              <button 
                onClick={() => setBackupStatus({ type: '', text: '' })}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Intro Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              🛡️
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
                Veri Güvenliği ve Yedekleme Merkezi
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                Sitenizdeki tüm kayıtlı kullanıcıları, turnuvaları, maç geçmişlerini, kura sonuçlarını ve gelen mesajları tek tıkla bilgisayarınıza indirebilir; gerektiğinde saniyeler içinde geri yükleyebilirsiniz.
              </p>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Card 1: Yedek İndir */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📥</span>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                    Veritabanı Yedeğini İndir
                  </h4>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                  Şu anki güncel veritabanını eksiksiz olarak standart <code>.json</code> dosyası formatında bilgisayarınıza kaydeder.
                </p>

                <div style={{ background: 'var(--bg-color)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Kayıtlı Oyuncu:</span>
                    <strong>{users.length} kişi</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Turnuva Sayısı:</span>
                    <strong>{tournaments.length} adet</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Masa Başvuruları:</span>
                    <strong>{registrations.length} başvuru</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Gelen Mesajlar:</span>
                    <strong>{messages.length} mesaj</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadBackup}
                disabled={isDownloadingBackup}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
              >
                {isDownloadingBackup ? '⏳ Hazırlanıyor...' : '📥 Yedeği Şimdi İndir (.json)'}
              </button>
            </div>

            {/* Card 2: Yedeği Geri Yükle */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📤</span>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                    Yedeği Geri Yükle
                  </h4>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                  Daha önce indirdiğiniz bir <code>.json</code> yedek dosyasını seçerek sitenin tüm kullanıcılarını ve turnuvalarını geri yükleyebilirsiniz.
                </p>

                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ⚠️ <strong style={{ color: '#ef4444' }}>Önemli Not:</strong> Yükleme yaptığınızda mevcut canlı veritabanı seçtiğiniz dosyadaki verilerle güncellenir.
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={restoreFileInputRef}
                  onChange={handleFileSelectForRestore}
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => {
                    if (restoreFileInputRef.current) restoreFileInputRef.current.click();
                  }}
                  disabled={isRestoringBackup}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', borderColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
                >
                  {isRestoringBackup ? '⏳ Yükleniyor...' : '📂 Yedek Dosyası Seç (.json)'}
                </button>
              </div>
            </div>

          </div>

          {/* Information & Best Practices */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(14, 165, 233, 0.03)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💡 Verilerinizi Koruma Tavsiyeleri
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li><strong>Büyük Turnuvalardan Sonra:</strong> Turnuva bittiğinde ve şampiyon belirlendiğinde tek tıkla yedek indirmeniz önerilir.</li>
              <li><strong>Sitede Güncelleme Yapılmadan Önce:</strong> Yeni bir özellik eklenmeden önce yedek almak her zaman en güvenli yoldur.</li>
              <li><strong>Sunucu Yenilenirse:</strong> Render gibi bulut servisleri yeniden başladığında elinizdeki en güncel JSON yedeğini "Yedeği Geri Yükle" butonuyla yükleyerek 1 saniyede her şeyi eski haline getirebilirsiniz.</li>
            </ul>
          </div>

        </div>
      )}

    </div>
  );
}
