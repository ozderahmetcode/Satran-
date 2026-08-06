import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Database from './pages/Database';
import AdminPanel from './pages/AdminPanel';
import Auth from './pages/Auth';
import Contact from './pages/Contact';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null); // Giriş yapmış kullanıcı bilgileri
  const [data, setData] = useState({
    stats: {},
    users: [],
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
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    loadData(); // Verileri yeniden çek (üyeler listesi güncellenmiş olabilir)
    setCurrentPage('event'); // Başarıyla giriş yapınca direkt buluşma sayfasına at
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('home');
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
          />
        );
      case 'auth':
        return (
          <Auth 
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'contact':
        return <Contact />;
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
        background: '#07090e'
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
      
      {/* Navbar ve Üye Oturum Göstergesi */}
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      {currentUser && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.05)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.1)',
          padding: '8px 0',
          fontSize: '13px',
          color: 'var(--accent-secondary)',
          textAlign: 'center'
        }}>
          Giriş yapılan hesap: <strong>{currentUser.name} (@{currentUser.chessUsername})</strong> • 
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              marginLeft: '8px',
              textDecoration: 'underline',
              fontWeight: 600
            }}
          >
            Çıkış Yap
          </button>
        </div>
      )}

      <main className="container" style={{ flex: 1, marginTop: '20px' }}>
        {renderPage()}
      </main>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
