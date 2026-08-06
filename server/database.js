const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Sıfırdan başlayacak temiz veritabanı şablonu (özder satranç topluluğu)
const defaultData = {
  stats: {
    organizedTournaments: 1,
    gamesPlayed: 0,
    registeredPlayers: 0
  },
  users: [],
  messages: [],
  leaders: {
    champions: [],
    activePlayers: [],
    highestWinRates: [],
    winStreaks: []
  },
  tournaments: [
    {
      id: 1,
      title: "1. Tilda Cafe Satranç Tanışma Buluşması",
      date: "15.08.2026",
      time: "15:00",
      location: "Ümraniye Tilda Cafe",
      fee: "300 TL",
      champion: "Bekleniyor...",
      status: "active",
      maxQuota: 20,
      rounds: [],
      totalRounds: 5
    }
  ],
  registrations: [] 
};

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readDB() {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Veritabanı okuma hatası:", error);
    return defaultData;
  }
}

function writeDB(data) {
  initDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Veritabanı yazma hatası:", error);
    return false;
  }
}

function calculateEloChange(ratingA, ratingB, scoreA) {
  const K = 32;
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const newRatingA = Math.round(ratingA + K * (scoreA - expectedA));
  return Math.max(100, Math.min(3000, newRatingA));
}

function updateLeaderboards(db) {
  // Tüm doğrulanmış veya otomatik geri yüklenmiş üyeleri ELO'ya göre sırala
  const sortedByElo = [...db.users]
    .sort((a, b) => (b.elo || 1500) - (a.elo || 1500));

  db.leaders.champions = sortedByElo.slice(0, 5).map(u => ({
    name: u.name,
    titles: Math.max(1, Math.round((u.elo - 1400) / 100)),
    points: u.elo || 1500
  }));

  db.leaders.activePlayers = db.users.slice(0, 5).map(u => {
    const count = db.registrations.filter(r => String(r.userId) === String(u.id)).length;
    return {
      name: u.name,
      matches: count * 5,
      winRate: `%${Math.min(95, Math.max(40, Math.round((u.elo / 3000) * 100)))}`
    };
  });

  db.leaders.highestWinRates = sortedByElo.slice(0, 5).map(u => ({
    name: u.name,
    rate: u.elo || 1500,
    matches: db.registrations.filter(r => String(r.userId) === String(u.id)).length * 5
  }));

  db.leaders.winStreaks = sortedByElo.slice(0, 5).map((u, idx) => ({
    name: u.name,
    streak: Math.max(1, Math.round((u.elo - 1300) / 80))
  }));
}

module.exports = {
  getData: () => readDB(),

  saveMessage: (newMessage) => {
    const db = readDB();
    const message = {
      id: db.messages.length > 0 ? Math.max(...db.messages.map(m => m.id)) + 1 : 1,
      ...newMessage,
      date: new Date().toISOString()
    };
    db.messages.push(message);
    writeDB(db);
    return db.messages;
  },

  deleteMessage: (id) => {
    const db = readDB();
    db.messages = db.messages.filter(m => m.id !== parseInt(id));
    writeDB(db);
    return db.messages;
  },
  
  registerUser: (newUser) => {
    const db = readDB();
    const emailExists = db.users.some(u => u.email === newUser.email);
    if (emailExists) return { error: "Bu e-posta adresi zaten kayıtlı." };

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const uniqueUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const user = {
      id: uniqueUserId,
      ...newUser,
      elo: newUser.elo ? parseInt(newUser.elo) : 1500,
      verified: false,
      verificationCode
    };
    db.users.push(user);
    writeDB(db);
    return { success: true, user: { id: user.id, email: user.email, name: user.name }, code: verificationCode };
  },

  verifyUser: (email, code) => {
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return { error: "Kullanıcı bulunamadı." };
    if (user.verificationCode === code) {
      user.verified = true;
      updateLeaderboards(db);
      writeDB(db);
      return { success: true };
    }
    return { error: "Geçersiz doğrulama kodu." };
  },

  loginUser: (email, password) => {
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) return { error: "Hatalı e-posta veya şifre." };
    if (!user.verified) return { error: "Lütfen önce e-posta adresinizi doğrulayın.", requiresVerification: true };
    return { success: true, user: { id: user.id, name: user.name, email: user.email, chessUsername: user.chessUsername, phone: user.phone, elo: user.elo || 1500 } };
  },

  // Turnuvaya Özel Kayıt İşlemleri (Otomatik üye geri kurtarma entegre edildi)
  registerForTournament: (tournamentId, userId, name, chessUsername) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };

    const alreadyRegistered = db.registrations.some(r => r.tournamentId === parseInt(tournamentId) && String(r.userId) === String(userId));
    if (alreadyRegistered) return { error: "Bu turnuvaya zaten kayıtlısınız." };

    const currentRegs = db.registrations.filter(r => r.tournamentId === parseInt(tournamentId)).length;
    if (currentRegs >= tournament.maxQuota) return { error: "Kontenjan dolu." };

    // Otomatik Üye Kurtarma: Eğer sunucu sıfırlanmışsa üyeyi veri tabanına otomatik geri ekle
    let userExists = db.users.some(u => String(u.id) === String(userId));
    if (!userExists) {
      db.users.push({
        id: userId,
        name: name,
        email: `${userId}@ozderchess.com`,
        password: 'password_auto',
        phone: '05555555555',
        chessUsername: chessUsername,
        elo: 1500,
        verified: true
      });
    }

    db.registrations.push({
      tournamentId: parseInt(tournamentId),
      userId: userId,
      name: name,
      chessUsername: chessUsername,
      registrationDate: new Date().toISOString()
    });
    
    db.stats.registeredPlayers = db.registrations.length;
    updateLeaderboards(db); // Liderlik tablosunu hemen güncelle
    writeDB(db);
    return { success: true, registrations: db.registrations };
  },

  cancelTournamentRegistration: (tournamentId, userId) => {
    const db = readDB();
    db.registrations = db.registrations.filter(r => !(r.tournamentId === parseInt(tournamentId) && String(r.userId) === String(userId)));
    db.stats.registeredPlayers = db.registrations.length;
    updateLeaderboards(db);
    writeDB(db);
    return { success: true, registrations: db.registrations };
  },

  createTournament: (newTour) => {
    const db = readDB();
    const nextId = db.tournaments.length > 0 ? Math.max(...db.tournaments.map(t => t.id)) + 1 : 1;
    const tournament = {
      id: nextId,
      ...newTour,
      champion: "Bekleniyor...",
      status: "active",
      rounds: [],
      totalRounds: parseInt(newTour.totalRounds || 5)
    };
    db.tournaments.unshift(tournament);
    db.stats.organizedTournaments = db.tournaments.length;
    writeDB(db);
    return db.tournaments;
  },

  submitRoundResults: (tournamentId, roundNumber, matchResults) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };

    const round = tournament.rounds.find(r => r.roundNumber === parseInt(roundNumber));
    if (!round) return { error: "Tur bulunamadı." };

    matchResults.forEach(match => {
      const dbMatch = round.pairings.find(p => String(p.whiteId) === String(match.whiteId) && String(p.blackId) === String(match.blackId));
      if (dbMatch) {
        dbMatch.result = match.result;

        const whiteUser = db.users.find(u => String(u.id) === String(match.whiteId));
        const blackUser = db.users.find(u => String(u.id) === String(match.blackId));

        if (whiteUser && blackUser && !dbMatch.eloUpdated) {
          const eloW = whiteUser.elo || 1500;
          const eloB = blackUser.elo || 1500;

          let scoreW = 0.5;
          let scoreB = 0.5;
          if (match.result === 'white') { scoreW = 1; scoreB = 0; }
          else if (match.result === 'black') { scoreW = 0; scoreB = 1; }

          whiteUser.elo = calculateEloChange(eloW, eloB, scoreW);
          blackUser.elo = calculateEloChange(eloB, eloW, scoreB);
          dbMatch.eloUpdated = true;
          db.stats.gamesPlayed += 1;
        }
      }
    });

    updateLeaderboards(db);
    writeDB(db);
    return { success: true, tournaments: db.tournaments, users: db.users };
  },

  generateNextRound: (tournamentId) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };

    const registrations = db.registrations.filter(r => r.tournamentId === parseInt(tournamentId));
    
    const players = registrations.map(r => {
      const user = db.users.find(u => String(u.id) === String(r.userId));
      if (user) return user;
      return {
        id: r.userId,
        name: r.name || "Bilinmeyen Oyuncu",
        elo: 1500,
        chessUsername: r.chessUsername || ""
      };
    }).filter(Boolean);

    if (players.length < 2) return { error: "Eşleştirme yapmak için en az 2 oyuncu olmalıdır." };

    const nextRoundNumber = tournament.rounds.length + 1;
    if (nextRoundNumber > tournament.totalRounds) {
      const standings = {};
      players.forEach(p => { standings[p.id] = 0; });

      tournament.rounds.forEach(r => {
        r.pairings.forEach(p => {
          if (p.result === 'white') standings[p.whiteId] += 1;
          else if (p.result === 'black') standings[p.blackId] += 1;
          else if (p.result === 'draw') {
            standings[p.whiteId] += 0.5;
            standings[p.blackId] += 0.5;
          }
        });
      });

      let winnerId = null;
      let maxScore = -1;
      Object.keys(standings).forEach(id => {
        if (standings[id] > maxScore) {
          maxScore = standings[id];
          winnerId = id;
        }
      });

      const winnerUser = db.users.find(u => String(u.id) === String(winnerId)) || players.find(p => String(p.id) === String(winnerId));
      tournament.champion = winnerUser ? winnerUser.name : "Belirsiz";
      tournament.status = "completed";
      writeDB(db);
      return { success: true, message: "Turnuva tamamlandı!", tournaments: db.tournaments };
    }

    const playerScores = {};
    const colorHistory = {};

    players.forEach(p => {
      playerScores[p.id] = 0;
      colorHistory[p.id] = [];
    });

    tournament.rounds.forEach(r => {
      r.pairings.forEach(p => {
        if (p.whiteId) colorHistory[p.whiteId]?.push('W');
        if (p.blackId) colorHistory[p.blackId]?.push('B');
        
        if (p.result === 'white' && p.whiteId) playerScores[p.whiteId] += 1;
        else if (p.result === 'black' && p.blackId) playerScores[p.blackId] += 1;
        else if (p.result === 'draw') {
          if (p.whiteId) playerScores[p.whiteId] += 0.5;
          if (p.blackId) playerScores[p.blackId] += 0.5;
        }
      });
    });

    const sortedPlayers = [...players].sort((a, b) => playerScores[b.id] - playerScores[a.id]);
    const pairings = [];
    const paired = new Set();

    for (let i = 0; i < sortedPlayers.length; i++) {
      const p1 = sortedPlayers[i];
      if (paired.has(p1.id)) continue;

      let p2 = null;
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        const potentialPartner = sortedPlayers[j];
        if (paired.has(potentialPartner.id)) continue;

        const alreadyPlayed = tournament.rounds.some(r => 
          r.pairings.some(p => 
            (p.whiteId === p1.id && p.blackId === potentialPartner.id) ||
            (p.whiteId === potentialPartner.id && p.blackId === p1.id)
          )
        );

        if (!alreadyPlayed) {
          p2 = potentialPartner;
          break;
        }
      }

      if (!p2) {
        for (let j = i + 1; j < sortedPlayers.length; j++) {
          if (!paired.has(sortedPlayers[j].id)) {
            p2 = sortedPlayers[j];
            break;
          }
        }
      }

      if (p2) {
        const hist1 = colorHistory[p1.id] || [];
        const hist2 = colorHistory[p2.id] || [];
        
        const last3_1 = hist1.slice(-3).join('');
        const last3_2 = hist2.slice(-3).join('');

        let p1Color = 'W';
        if (last3_1 === 'WWW') p1Color = 'B';
        else if (last3_2 === 'BBB') p1Color = 'W';
        else {
          const w1 = hist1.filter(c => c === 'W').length;
          const b1 = hist1.filter(c => c === 'B').length;
          p1Color = w1 > b1 ? 'B' : 'W';
        }

        if (p1Color === 'W') {
          pairings.push({ whiteId: p1.id, blackId: p2.id, result: 'pending', eloUpdated: false });
        } else {
          pairings.push({ whiteId: p2.id, blackId: p1.id, result: 'pending', eloUpdated: false });
        }

        paired.add(p1.id);
        paired.add(p2.id);
      } else {
        pairings.push({ whiteId: p1.id, blackId: null, result: 'white', eloUpdated: true });
        paired.add(p1.id);
      }
    }

    tournament.rounds.push({
      roundNumber: nextRoundNumber,
      pairings
    });

    writeDB(db);
    return { success: true, tournaments: db.tournaments };
  }
};
