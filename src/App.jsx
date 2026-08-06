import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Database from './pages/Database';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [data, setData] = useState({
    stats: {},
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
  }, []);

  const handleRegister = (updatedRegistrations) => {
    setData(prev => ({
      ...prev,
      registrations: updatedRegistrations,
      stats: {
        ...prev.stats,
        registeredPlayers: prev.stats.registeredPlayers + 1
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
            registrations={data.registrations} 
            onRegister={handleRegister} 
          />
        );
      case 'database':
        return (
          <Database 
            leaders={data.leaders} 
            tournaments={data.tournaments} 
          />
        );
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
        color: 'var(--accent-primary)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>Loading...</div>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--accent-primary)',
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="container" style={{ flex: 1, marginTop: '20px' }}>
        {renderPage()}
      </main>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
