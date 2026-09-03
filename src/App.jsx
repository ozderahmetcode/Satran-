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
    registrations: []
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

    // Tam Zamanlı Veri Güncelleme (Her 5 saniyede bir veritabanını yeniler)
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  const handleUpdateProfile = (updatedProfile) => {
    if (!currentUser) return;
    const newUserData = { ...currentUser, ...updatedProfile };
    setCurrentUser(newUserData);
    localStorage.setItem('currentUser', JSON.stringify(newUserData));
    // Not: Gerçek bir uygulamada bu veriler API'ye POST edilip DB'ye yazılmalıdır.
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
          />
        );
      case 'admin':
        return (
          <AdminPanel 
            registrations={data.registrations} 
            users={data.users}
            onRegisterUpdate={handleRegisterUpdate}
            tournaments={data.tournaments}
            onAddTournament={handleAddTournament}
            messages={data.messages}
            onMessagesUpdate={handleMessagesUpdate}
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
        return <Matchmaking currentUser={currentUser} onGoToAuth={() => setCurrentPage('auth')} />;
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07090e' }}>
      
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
