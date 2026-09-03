import React, { useState, useMemo } from 'react';

export default function Database({ leaders, tournaments }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTournament, setSelectedTournament] = useState(null); // id of selected tournament
  const [tourTab, setTourTab] = useState('standings'); // standings | fixtures

  const filterLeaders = (list) => {
    if (!list) return [];
    return list.filter(player => 
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const calculateStandings = (tournament) => {
    if (!tournament || !tournament.rounds) return [];
    
    const playersMap = {}; // { userId: { name, rating, points, opponents: [], bh: 0 } }

    tournament.rounds.forEach(r => {
      r.pairings?.forEach(p => {
        if (!p.whiteId) return; // bye without opponent, ignore for now
        
        // Ensure both players exist in map
        if (p.whiteId && !playersMap[p.whiteId]) playersMap[p.whiteId] = { id: p.whiteId, name: 'Oyuncu ' + p.whiteId, rating: 1500, points: 0, opponents: [] };
        if (p.blackId && !playersMap[p.blackId]) playersMap[p.blackId] = { id: p.blackId, name: 'Oyuncu ' + p.blackId, rating: 1500, points: 0, opponents: [] };

        if (p.result === 'white' && p.whiteId) {
          playersMap[p.whiteId].points += 1;
        } else if (p.result === 'black' && p.blackId) {
          playersMap[p.blackId].points += 1;
        } else if (p.result === 'draw') {
          if (p.whiteId) playersMap[p.whiteId].points += 0.5;
          if (p.blackId) playersMap[p.blackId].points += 0.5;
        }

        if (p.whiteId && p.blackId) {
          playersMap[p.whiteId].opponents.push(p.blackId);
          playersMap[p.blackId].opponents.push(p.whiteId);
        }
      });
    });

    // Calculate BH (Buchholz)
    const standings = Object.values(playersMap);
    standings.forEach(p => {
      let bh = 0;
      p.opponents.forEach(oppId => {
        if (playersMap[oppId]) bh += playersMap[oppId].points;
      });
      p.bh = bh;
    });

    // Sort by Points DESC, then BH DESC
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.bh - a.bh;
    });

    return standings;
  };

  if (selectedTournament) {
    const tour = tournaments.find(t => t.id === selectedTournament);
    const standings = calculateStandings(tour);

    return (
      <div className="animate-fade-in" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <button 
          onClick={() => setSelectedTournament(null)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', fontSize: '15px' }}
        >
          &larr; Geri Dön
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', fontWeight: 800 }}>{tour?.title}</h2>
          {tour?.status === 'active' && (
            <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
              Devam Ediyor
            </span>
          )}
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)' }}>
          <button 
            onClick={() => setTourTab('standings')}
            style={{ flex: 1, padding: '16px', background: tourTab === 'standings' ? 'rgba(0,0,0,0.05)' : 'transparent', border: 'none', borderBottom: tourTab === 'standings' ? '2px solid var(--accent-primary)' : 'none', color: tourTab === 'standings' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-title)', cursor: 'pointer' }}>
            Sıralama
          </button>
          <button 
            onClick={() => setTourTab('fixtures')}
            style={{ flex: 1, padding: '16px', background: tourTab === 'fixtures' ? 'rgba(0,0,0,0.05)' : 'transparent', border: 'none', borderBottom: tourTab === 'fixtures' ? '2px solid var(--accent-primary)' : 'none', color: tourTab === 'fixtures' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-title)', cursor: 'pointer' }}>
            Fikstür & Sonuçlar
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
          {tourTab === 'standings' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px', fontWeight: 700 }}>#</th>
                  <th style={{ padding: '16px', fontWeight: 700 }}>Oyuncu ID</th>
                  <th style={{ padding: '16px', fontWeight: 700 }}>Rating</th>
                  <th style={{ padding: '16px', fontWeight: 700 }}>Puan</th>
                  <th style={{ padding: '16px', fontWeight: 700 }}>BH</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Henüz maç oynanmadı veya kayıt bulunmuyor.</td></tr>
                ) : (
                  standings.map((player, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--panel-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{idx + 1}</td>
                      <td style={{ padding: '16px', fontFamily: 'monospace' }}>{player.id}</td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{player.rating}</td>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{player.points}</td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{player.bh}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tourTab === 'fixtures' && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {tour?.rounds?.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Fikstür henüz oluşturulmadı.</p>
              ) : (
                tour?.rounds?.map((round, idx) => (
                  <div key={idx}>
                    <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: 800, marginBottom: '16px', color: 'var(--accent-secondary)' }}>Tur {round.roundNumber}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {round.pairings?.map((match, midx) => (
                        <div key={midx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', padding: '12px 16px', borderRadius: '8px' }}>
                          <span style={{ fontWeight: 600, flex: 1, textAlign: 'right' }}>{match.whiteId} (B)</span>
                          <span style={{ margin: '0 16px', padding: '4px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', fontWeight: 700, fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {match.result === 'white' ? '1 - 0' : match.result === 'black' ? '0 - 1' : match.result === 'draw' ? '½ - ½' : 'vs'}
                          </span>
                          <span style={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>{match.blackId ? match.blackId + ' (S)' : 'BYE'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasChampions = leaders?.champions && leaders.champions.length > 0;
  const hasActive = leaders?.activePlayers && leaders.activePlayers.length > 0;
  const hasRates = leaders?.highestWinRates && leaders.highestWinRates.length > 0;
  const hasStreaks = leaders?.winStreaks && leaders.winStreaks.length > 0;

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Page Header */}
      <section style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '38px', fontWeight: 800 }}>
          📊 <span className="text-gradient">ozder</span> Satranç Veritabanı
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
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '14px 20px',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
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
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏆 En Çok Şampiyon Olanlar
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasChampions ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Henüz şampiyonluk kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.champions).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{player.points} ELO ({player.titles} Kupa)</span>
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
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{player.matches} Maç</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card: Highest Win Rates / ELO Rankings */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: '#059669', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🚀 En Yüksek ELO Puanı
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasRates ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Puan kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.highestWinRates).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: '#059669', fontWeight: 'bold' }}>{player.rate} ELO</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card: Win Streaks */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, color: '#0284c7', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 En Uzun Galibiyet Serisi
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasStreaks ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Seri kaydı bulunmuyor.</p>
            ) : (
              filterLeaders(leaders.winStreaks).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{idx + 1}. {player.name}</span>
                  <span style={{ color: '#0284c7', fontWeight: 'bold' }}>{player.streak} Galibiyet</span>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* Tournaments List Section */}
      <section className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
          🏁 Turnuva Arşivi
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tournaments?.map((tour, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-color)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '16px 20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 800 }}>
                  {tour.title}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 600 }}>
                  📅 Tarih: {tour.date} • 📍 {tour.location}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={() => setSelectedTournament(tour.id)}
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sonuçları İncele &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
