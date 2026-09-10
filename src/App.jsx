import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Database from './pages/Database';
import AdminPanel from './pages/AdminPanel';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import Matchmaking from './pages/Matchmaking';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null); // Giriş yapmış kullanıcı bilgileri
  const [data, setData] = useState({
    stats: {},
    users: [],
    messages: [],
    leaders: {},
    tournaments: [],
    registrations: [],
    matchRequests: [],
    directMessages: [],
    spamReports: []
  });
  const [loading, setLoading] = useState(true);

  // API'den verileri yükleme fonksiyonu
  const loadData = async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const result = await response.json();
        setData(result);

        // Giriş yapmış kullanıcının ELO veya ad bilgilerini de güncel tut
        if (currentUser) {
          const matchedUser = result.users.find(u => u.id === currentUser.id);
          if (matchedUser) {
            const updatedUser = { ...currentUser, ...matchedUser };
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }
      }
    } catch (error) {
      console.error("Veriler yüklenirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Varsa yerel tarayıcı oturumunu geri yükle
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // Client kimliği oluştur / al
    let clientId = localStorage.getItem('ozder_client_id');
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ozder_client_id', clientId);
    }

    // Heartbeat ve Süre Takibi
    let lastBeatTime = Date.now();
    let isFirstSignal = true;

    const sendHeartbeat = () => {
      try {
        const now = Date.now();
        const diffSeconds = Math.round((now - lastBeatTime) / 1000);
        lastBeatTime = now;

        // Admin kontrolü: Admin panelindeyken veya admin girişi yapılmışken süre/ziyaret sayılmaz
        const isAdminLoggedIn = sessionStorage.getItem('ozder_admin_authenticated') === 'true';
        const isInAdminPanel = currentPage === 'admin';
        const isAdmin = isAdminLoggedIn || isInAdminPanel;

        // Sekme arka planda çok uzun kaldıysa en fazla 30 saniye ekle
        // Admin ise deltaSeconds 0 ve isNewSession false gönderilir (süreyi etkilemez)
        const deltaSeconds = (isFirstSignal || isAdmin) ? 0 : Math.min(30, Math.max(0, diffSeconds));
        const sendAsNewSession = isFirstSignal && !isAdmin;
        isFirstSignal = false;

        const u = localStorage.getItem('currentUser');
        const parsed = u ? JSON.parse(u) : null;

        fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            userId: parsed?.id || null,
            name: parsed?.name || (isAdmin ? 'Yönetici' : 'Ziyaretçi'),
            page: currentPage === 'admin' ? 'Yönetici Paneli' : currentPage,
            deltaSeconds,
            isNewSession: sendAsNewSession,
            isAdmin
          })
        }).catch(() => {});
      } catch (e) {}
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 10000); // 10 saniyede bir hassas süre ve aktiflik sinyali

    // Tam Zamanlı Veri Güncelleme (Her 5 saniyede bir veritabanını yeniler)
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [currentPage]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    loadData(); // Verileri yeniden çek
    setCurrentPage('event'); // Başarıyla giriş yapınca direkt buluşma sayfasına at
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('home');
  };

  const handleUpdateProfile = async (formData) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'POST',
        body: formData // FormData direkt gönderilir, Content-Type tarayıcı tarafından belirlenir
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        loadData();
      } else {
        alert(data.error || "Profil güncellenemedi.");
      }
    } catch (err) {
      console.error(err);
      alert("Sunucuya bağlanılamadı.");
    }
  };

  const handleRegisterUpdate = (updatedRegistrations) => {
    setData(prev => ({
      ...prev,
      registrations: updatedRegistrations,
      stats: {
        ...prev.stats,
        registeredPlayers: updatedRegistrations.length
      }
    }));
  };

  const handleMessagesUpdate = (updatedMessages) => {
    setData(prev => ({
      ...prev,
      messages: updatedMessages
    }));
  };

  const handleAddTournament = (updatedTournaments) => {
    setData(prev => ({
      ...prev,
      tournaments: updatedTournaments,
      stats: {
        ...prev.stats,
        organizedTournaments: updatedTournaments.length
      }
    }));
  };

  const handleUsersUpdate = (updatedUsers, updatedRegistrations) => {
    setData(prev => ({
      ...prev,
      users: updatedUsers,
      ...(updatedRegistrations ? {
        registrations: updatedRegistrations,
        stats: {
          ...prev.stats,
          registeredPlayers: updatedRegistrations.length
        }
      } : {})
    }));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            stats={data.stats} 
            leaders={data.leaders} 
            setCurrentPage={setCurrentPage} 
          />
        );
      case 'event':
        return (
          <EventDetail 
            tournaments={data.tournaments}
            registrations={data.registrations} 
            users={data.users}
            currentUser={currentUser}
            onRegisterUpdate={handleRegisterUpdate}
            onGoToAuth={() => setCurrentPage('auth')}
          />
        );
      case 'database':
        return (
          <Database 
            leaders={data.leaders} 
            tournaments={data.tournaments} 
            users={data.users}
            registrations={data.registrations}
          />
        );
      case 'admin':
        return (
          <AdminPanel 
            registrations={data.registrations} 
            users={data.users}
            onUsersUpdate={handleUsersUpdate}
            activeUsersCount={data.activeUsersCount || 1}
            activeUsersList={data.activeUsersList || []}
            analytics={data.analytics || {}}
            onRegisterUpdate={handleRegisterUpdate}
            tournaments={data.tournaments}
            onAddTournament={handleAddTournament}
            messages={data.messages}
            onMessagesUpdate={handleMessagesUpdate}
            spamReports={data.spamReports || []}
            onReloadData={loadData}
          />
        );
      case 'auth':
        return (
          <Auth 
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'profile':
        return (
          <Profile 
            currentUser={currentUser}
            registrations={data.registrations}
            tournaments={data.tournaments}
            onUpdateProfile={handleUpdateProfile}
          />
        );
      case 'contact':
        return <Contact />;
      case 'matchmaking':
        return (
          <Matchmaking 
            currentUser={currentUser} 
            users={data.users} 
            matchRequests={data.matchRequests || []}
            directMessages={data.directMessages || []}
            onGoToAuth={() => setCurrentPage('auth')} 
            onUpdateProfile={handleUpdateProfile}
            onReloadData={loadData}
          />
        );
      case 'faq':
        return <FAQ setCurrentPage={setCurrentPage} />;
      case 'terms':
        return <Terms />;
      default:
        return <Home stats={data.stats} leaders={data.leaders} setCurrentPage={setCurrentPage} />;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'var(--font-title)',
        fontSize: '20px',
        color: 'var(--accent-secondary)',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--bg-color)'
      }}>
        <div>Yükleniyor...</div>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--accent-secondary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)' }}>
      
      {/* Navbar ve Profil çekmecesi */}
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="container" style={{ flex: 1, marginTop: '20px' }}>
        {renderPage()}
      </main>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
