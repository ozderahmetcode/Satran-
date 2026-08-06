import React, { useState } from 'react';

export default function Database({ leaders, tournaments }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filterLeaders = (list) => {
    if (!list) return [];
    return list.filter(player => 
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const hasChampions = leaders?.champions && leaders.champions.length > 0;
  const hasActive = leaders?.activePlayers && leaders.activePlayers.length > 0;
  const hasRates = leaders?.highestWinRates && leaders.highestWinRates.length > 0;
  const hasStreaks = leaders?.winStreaks && leaders.winStreaks.length > 0;

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Page Header */}
      <section style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '38px', fontWeight: 800 }}>
          📊 <span className="text-gradient">özder</span> Satranç Veritabanı
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Topluluğumuzdaki oyuncuların güncel performansları, turnuva geçmişleri ve liderlik tabloları.
        </p>

        {/* Search Bar */}
        <div style={{ maxWidth: '500px', margin: '24px auto 0 auto' }}>
          <input
            type="text"
            placeholder="Oyuncu adı ile arama yapın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '14px 20px',
              color: '#fff',
              fontSize: '15px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
        </div>
      </section>

      {/* Leaderboard Cards Grid */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Card: Champions */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: '#f59e0b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏆 En Çok Şampiyon Olanlar
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasChampions ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Henüz şampiyonluk kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.champions).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{player.points} ELO ({player.titles} Kupa)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card: Active Players */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ En Aktif Oyuncular
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasActive ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aktif oyuncu kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.activePlayers).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{player.matches} Maç</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card: Highest Win Rates / ELO Rankings */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🚀 En Yüksek ELO Puanı
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasRates ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Puan kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.highestWinRates).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{player.rate} ELO</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card: Win Streaks */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: '#ec4899', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 En Uzun Galibiyet Serisi
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasStreaks ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Seri kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.winStreaks).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: '#ec4899', fontWeight: 'bold' }}>{player.streak} Galibiyet</span>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* Tournaments List Section */}
      <section className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
          🏁 Son Turnuva Sonuçları
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tournaments?.map((tour, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '16px 20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 600 }}>
                  {tour.title}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  📅 Tarih: {tour.date} • 🕒 {tour.time} • 📍 Mekan: {tour.location}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {tour.status === 'active' ? (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-primary)',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>Kayıtlar Açık ({tour.totalRounds} Tur)</span>
                ) : (
                  <>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Şampiyon: <strong style={{ color: '#f59e0b' }}>{tour.champion}</strong>
                    </span>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>{tour.totalRounds} Tur</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
