import React, { useState, useMemo } from 'react';
import { sanitizeUrl, sanitizeChessUsername } from '../utils/security';

export default function Database({ leaders, tournaments, users = [], registrations = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTournament, setSelectedTournament] = useState(null); // id of selected tournament
  const [tourTab, setTourTab] = useState('standings'); // standings | fixtures

  const filterLeaders = (list) => {
    if (!list) return [];
    return list.filter(player => 
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getPlayerName = (playerId) => {
    if (!playerId) return 'Bay (Boşta)';
    const user = users.find(u => String(u.id) === String(playerId));
    const reg = registrations.find(r => String(r.userId) === String(playerId));
    return user?.name || reg?.name || user?.chessUsername || user?.username || reg?.chessUsername || playerId;
  };

  const calculateStandings = (tournament) => {
    if (!tournament || !tournament.rounds) return [];
    
    const playersMap = {}; // { userId: { id, name, rating, points, opponents: [], bh: 0 } }

    const resolvePlayer = (id) => {
      const u = users.find(user => String(user.id) === String(id));
      const reg = registrations.find(r => (r.tournamentId === tournament.id || !r.tournamentId) && String(r.userId) === String(id));
      const displayName = u?.name || reg?.name || u?.chessUsername || u?.username || reg?.chessUsername || id;
      const elo = u?.elo || 1500;
      return { id, name: displayName, rating: elo, points: 0, opponents: [] };
    };

    tournament.rounds.forEach(r => {
      r.pairings?.forEach(p => {
        if (!p.whiteId) return;
        
        // Ensure both players exist in map
        if (p.whiteId && !playersMap[p.whiteId]) playersMap[p.whiteId] = resolvePlayer(p.whiteId);
        if (p.blackId && !playersMap[p.blackId]) playersMap[p.blackId] = resolvePlayer(p.blackId);

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

  // Tamamlanan turnuvalar arşivi: İptal olanları katma, sadece bitenleri dahil et
  const archivedTournaments = useMemo(() => {
    if (!tournaments) return [];
    return tournaments.filter(t => {
      // İptal edilenleri katma
      if (t.status === 'cancelled') return false;
      // Biten turnuvalar: status === 'completed', şampiyonu belirlenmiş veya tüm turları tamamlanmış
      const isFinished = t.status === 'completed' || 
        (t.champion && t.champion !== 'Bekleniyor...' && t.champion !== 'Belirsiz') ||
        (t.rounds && t.rounds.length >= t.totalRounds && t.rounds.length > 0 && !t.rounds[t.rounds.length - 1]?.pairings?.some(p => p.result === 'pending'));
      return isFinished;
    });
  }, [tournaments]);

  // Liderlik tabloları verisi: Sunucu leaders verisi boş ise yerel turnuva/maç verisinden dinamik hesapla
  const effectiveLeaders = useMemo(() => {
    // 1. Şampiyonlar
    let champions = leaders?.champions && leaders.champions.length > 0 ? leaders.champions : [];
    if (champions.length === 0 && tournaments) {
      const champMap = {};
      tournaments.forEach(t => {
        if (t.status !== 'cancelled') {
          const isDone = t.status === 'completed' || (t.champion && t.champion !== 'Bekleniyor...' && t.champion !== 'Belirsiz');
          if (isDone && t.champion && t.champion !== 'Bekleniyor...' && t.champion !== 'Belirsiz') {
            const name = t.champion;
            const u = users.find(usr => usr.name === name || usr.chessUsername === name || usr.username === name);
            const elo = u?.elo || 1500;
            if (!champMap[name]) {
              champMap[name] = { name, titles: 1, points: elo };
            } else {
              champMap[name].titles += 1;
              if (u?.elo) champMap[name].points = u.elo;
            }
          }
        }
      });
      champions = Object.values(champMap).sort((a, b) => b.titles !== a.titles ? b.titles - a.titles : b.points - a.points);
    }

    // Oyuncu verileri ve maç geçmişi
    const playerStats = {};
    users.forEach(u => {
      playerStats[String(u.id)] = {
        id: String(u.id),
        name: u.name || u.chessUsername || u.username || 'Oyuncu',
        elo: u.elo || 1500,
        matchesPlayed: 0,
        matchesWon: 0,
        currentStreak: 0,
        maxStreak: 0
      };
    });

    registrations.forEach(r => {
      const uid = String(r.userId);
      if (!playerStats[uid]) {
        playerStats[uid] = {
          id: uid,
          name: r.name || r.chessUsername || uid,
          elo: 1500,
          matchesPlayed: 0,
          matchesWon: 0,
          currentStreak: 0,
          maxStreak: 0
        };
      }
    });

    tournaments?.forEach(t => {
      if (t.status === 'cancelled') return;
      t.rounds?.forEach(round => {
        round.pairings?.forEach(p => {
          if (!p.result || p.result === 'pending') return;
          const wId = String(p.whiteId);
          const bId = p.blackId ? String(p.blackId) : null;

          if (wId && !playerStats[wId]) {
            const reg = registrations.find(r => String(r.userId) === wId);
            playerStats[wId] = { id: wId, name: reg?.name || wId, elo: 1500, matchesPlayed: 0, matchesWon: 0, currentStreak: 0, maxStreak: 0 };
          }
          if (bId && !playerStats[bId]) {
            const reg = registrations.find(r => String(r.userId) === bId);
            playerStats[bId] = { id: bId, name: reg?.name || bId, elo: 1500, matchesPlayed: 0, matchesWon: 0, currentStreak: 0, maxStreak: 0 };
          }

          if (playerStats[wId]) playerStats[wId].matchesPlayed += 1;
          if (bId && playerStats[bId]) playerStats[bId].matchesPlayed += 1;

          if (p.result === 'white') {
            if (playerStats[wId]) {
              playerStats[wId].matchesWon += 1;
              playerStats[wId].currentStreak += 1;
              if (playerStats[wId].currentStreak > playerStats[wId].maxStreak) {
                playerStats[wId].maxStreak = playerStats[wId].currentStreak;
              }
            }
            if (bId && playerStats[bId]) playerStats[bId].currentStreak = 0;
          } else if (p.result === 'black') {
            if (bId && playerStats[bId]) {
              playerStats[bId].matchesWon += 1;
              playerStats[bId].currentStreak += 1;
              if (playerStats[bId].currentStreak > playerStats[bId].maxStreak) {
                playerStats[bId].maxStreak = playerStats[bId].currentStreak;
              }
            }
            if (playerStats[wId]) playerStats[wId].currentStreak = 0;
          } else if (p.result === 'draw') {
            if (playerStats[wId]) playerStats[wId].currentStreak = 0;
            if (bId && playerStats[bId]) playerStats[bId].currentStreak = 0;
          }
        });
      });
    });

    const allPlayers = Object.values(playerStats);

    // 2. EN AKTİF OYUNCULAR
    let activePlayers = leaders?.activePlayers && leaders.activePlayers.length > 0 ? leaders.activePlayers : [];
    if (activePlayers.length === 0) {
      activePlayers = allPlayers
        .filter(p => p.matchesPlayed > 0)
        .sort((a, b) => b.matchesPlayed !== a.matchesPlayed ? b.matchesPlayed - a.matchesPlayed : b.matchesWon - a.matchesWon)
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          matches: p.matchesPlayed,
          winRate: p.matchesPlayed > 0 ? `%${Math.round((p.matchesWon / p.matchesPlayed) * 100)}` : '%0'
        }));
    }

    // 3. EN YÜKSEK ELO PUANI (Sadece turnuvaya kaydolmuş veya en az 1 maç oynamış oyuncular)
    let highestWinRates = leaders?.highestWinRates && leaders.highestWinRates.length > 0 ? leaders.highestWinRates : [];
    if (highestWinRates.length === 0) {
      const activeOrRegPool = allPlayers.filter(p => p.matchesPlayed > 0 || registrations.some(r => String(r.userId) === p.id));
      highestWinRates = activeOrRegPool
        .sort((a, b) => (b.elo || 1500) - (a.elo || 1500))
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          rate: p.elo || 1500,
          matches: p.matchesPlayed
        }));
    }

    // 4. EN UZUN GALİBİYET SERİSİ
    let winStreaks = leaders?.winStreaks && leaders.winStreaks.length > 0 ? leaders.winStreaks : [];
    if (winStreaks.length === 0) {
      winStreaks = allPlayers
        .filter(p => p.maxStreak > 0 || p.currentStreak > 0)
        .sort((a, b) => Math.max(b.maxStreak, b.currentStreak) - Math.max(a.maxStreak, a.currentStreak))
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          streak: Math.max(p.maxStreak, p.currentStreak)
        }));
    }

    return {
      champions,
      activePlayers,
      highestWinRates,
      winStreaks
    };
  }, [leaders, tournaments, users, registrations]);

  const renderChessBadge = (playerName) => {
    const matchedUser = users?.find(u => u.name === playerName || u.chessUsername === playerName || u.username === playerName);
    if (!matchedUser || !matchedUser.chessUsername) return null;
    const platform = matchedUser.chessPlatform === 'lichess' ? 'lichess' : 'chess.com';
    const chUser = sanitizeChessUsername(matchedUser.chessUsername);
    const rawUrl = platform === 'lichess' ? `https://lichess.org/@/${chUser}` : `https://www.chess.com/member/${chUser}`;
    const url = sanitizeUrl(rawUrl);
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '11px',
          color: platform === 'lichess' ? '#4b5563' : '#15803d',
          background: platform === 'lichess' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(22, 163, 74, 0.1)',
          padding: '2px 6px',
          borderRadius: '5px',
          textDecoration: 'none',
          fontWeight: 600,
          marginLeft: '6px'
        }}
        title={`${platform === 'lichess' ? 'Lichess' : 'Chess.com'} Profilini İncele`}
      >
        <span>{platform === 'lichess' ? '♘' : '♟️'}</span>
        <span>@{chUser} ↗</span>
      </a>
    );
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
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', fontWeight: 800 }}>{tour?.title}</h2>
            {tour?.champion && tour?.champion !== 'Bekleniyor...' && tour?.champion !== 'Belirsiz' && (
              <p style={{ color: 'var(--accent-secondary)', fontWeight: 700, margin: '4px 0 0 0', fontSize: '15px' }}>
                🏆 Şampiyon: {tour.champion}
              </p>
            )}
          </div>
          <span style={{ background: 'var(--gradient-gold)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
            🏆 Tamamlandı
          </span>
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
                  <th style={{ padding: '16px', fontWeight: 700 }}>Oyuncu (Ad Soyad / Kullanıcı Adı)</th>
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
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid var(--panel-border)', 
                      background: idx === 0 ? 'rgba(245, 158, 11, 0.08)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' 
                    }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                      </td>
                      <td style={{ padding: '16px', fontWeight: 600, color: idx === 0 ? 'var(--accent-secondary)' : 'inherit' }}>
                        <span style={{ verticalAlign: 'middle' }}>{player.name}</span>
                        {renderChessBadge(player.name)}
                      </td>
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
                          <span style={{ fontWeight: 600, flex: 1, textAlign: 'right' }}>{getPlayerName(match.whiteId)} (B)</span>
                          <span style={{ margin: '0 16px', padding: '4px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', fontWeight: 700, fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {match.result === 'white' ? '1 - 0' : match.result === 'black' ? '0 - 1' : match.result === 'draw' ? '½ - ½' : 'vs'}
                          </span>
                          <span style={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>{match.blackId ? getPlayerName(match.blackId) + ' (S)' : 'BYE'}</span>
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

  const hasChampions = effectiveLeaders.champions && effectiveLeaders.champions.length > 0;
  const hasActive = effectiveLeaders.activePlayers && effectiveLeaders.activePlayers.length > 0;
  const hasRates = effectiveLeaders.highestWinRates && effectiveLeaders.highestWinRates.length > 0;
  const hasStreaks = effectiveLeaders.winStreaks && effectiveLeaders.winStreaks.length > 0;

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Page Header */}
      <section style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '38px', fontWeight: 800 }}>
          📊 <span className="text-gradient">OZDER</span> İstatistikler & Arşiv
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
              filterLeaders(effectiveLeaders.champions).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                    {idx + 1}. {player.name} {renderChessBadge(player.name)}
                  </span>
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
              filterLeaders(effectiveLeaders.activePlayers).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                    {idx + 1}. {player.name} {renderChessBadge(player.name)}
                  </span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{player.matches} Maç {player.winRate && `(${player.winRate})`}</span>
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
              filterLeaders(effectiveLeaders.highestWinRates).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                    {idx + 1}. {player.name} {renderChessBadge(player.name)}
                  </span>
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
              filterLeaders(effectiveLeaders.winStreaks).map((player, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                    {idx + 1}. {player.name} {renderChessBadge(player.name)}
                  </span>
                  <span style={{ color: '#0284c7', fontWeight: 'bold' }}>{player.streak} Galibiyet</span>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* Tournaments List Section */}
      <section className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 800, margin: 0 }}>
              🏁 Turnuva Arşivi
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: 0 }}>
              Tamamlanan buluşmaların nihai sıralamaları, şampiyonları ve oynanan tur sonuçları.
            </p>
          </div>
          {archivedTournaments.length > 0 && (
            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-primary)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
              {archivedTournaments.length} Tamamlanan Turnuva
            </span>
          )}
        </div>
        
        {archivedTournaments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px dashed var(--panel-border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>♟️</div>
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>Henüz Tamamlanmış Turnuva Arşivde Yok</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '450px', margin: '6px auto 0 auto' }}>
              Aktif etkinliklerde turlar tamamlandığında veya şampiyon belirlendiğinde sonuçlar otomatik olarak bu arşive eklenir. İptal edilen etkinlikler arşive dahil edilmez.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {archivedTournaments.map((tour, idx) => {
              const tourRegs = registrations.filter(r => r.tournamentId === tour.id);
              const tourPlayersCount = tourRegs.length > 0 ? tourRegs.length : (calculateStandings(tour).length);

              return (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '14px',
                  padding: '18px 24px',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: 'var(--gradient-gold)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                        🏆 TAMAMLANDI
                      </span>
                      <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 800, margin: 0 }}>
                        {tour.title}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span>📅 Tarih: <strong style={{ color: 'var(--text-primary)' }}>{tour.date}</strong></span>
                      <span>📍 Konum: <strong style={{ color: 'var(--text-primary)' }}>{tour.location}</strong></span>
                      <span>👥 Katılımcı: <strong style={{ color: 'var(--text-primary)' }}>{tourPlayersCount} Kişi</strong></span>
                      <span>♟️ Tur: <strong style={{ color: 'var(--text-primary)' }}>{tour.rounds?.length || tour.totalRounds} Tur Oynandı</strong></span>
                    </div>

                    {tour.champion && tour.champion !== 'Bekleniyor...' && tour.champion !== 'Belirsiz' && (
                      <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                        🥇 Turnuva Şampiyonu: <strong>{tour.champion}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                      onClick={() => setSelectedTournament(tour.id)}
                      className="btn-primary"
                      style={{
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    >
                      Sonuçları ve Sıralamayı İncele &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
