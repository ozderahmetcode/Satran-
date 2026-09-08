const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Sıfırdan başlayacak temiz veritabanı şablonu (OZDER satranç topluluğu)
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
      title: "1. X Cafe Satranç Tanışma Buluşması",
      date: "15.08.2026",
      time: "15:00",
      location: "Ümraniye X Cafe",
      fee: "300 TL",
      champion: "Bekleniyor...",
      status: "active",
      maxQuota: 20,
      rounds: [],
      totalRounds: 5
    }
  ],
  registrations: [],
  matchRequests: [],
  directMessages: [],
  spamReports: []
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
    const parsed = JSON.parse(data);
    let changed = false;
    if (Array.isArray(parsed.users)) {
      parsed.users.forEach(u => {
        if (u.verified === false) {
          u.verified = true;
          changed = true;
        }
      });
    }
    if (!Array.isArray(parsed.matchRequests)) {
      parsed.matchRequests = [];
      changed = true;
    }
    if (!Array.isArray(parsed.directMessages)) {
      parsed.directMessages = [];
      changed = true;
    }
    if (!Array.isArray(parsed.spamReports)) {
      parsed.spamReports = [];
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
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
  // Yalnızca turnuvalara katılmış ve maç yapmış oyuncuları filtrele
  const activeUsers = db.users.filter(u => {
    return db.registrations.some(r => String(r.userId) === String(u.id));
  });

  const sortedByElo = [...activeUsers].sort((a, b) => (b.elo || 1500) - (a.elo || 1500));

  // Şampiyonlar (Sadece gerçek kupası olanlar, şu an kupa sistemi yoksa boş kalır)
  db.leaders.champions = sortedByElo.filter(u => u.titles > 0).map(u => ({
    name: u.name,
    titles: u.titles || 0,
    points: u.elo || 1500
  }));

  // En aktif oyuncular
  db.leaders.activePlayers = sortedByElo.slice(0, 5).map(u => {
    const matches = (u.matchesPlayed || 0);
    return {
      name: u.name,
      matches: matches,
      winRate: matches > 0 ? `%${Math.round(( (u.matchesWon || 0) / matches) * 100)}` : '%0'
    };
  }).filter(u => u.matches > 0);

  // En yüksek ELO
  db.leaders.highestWinRates = sortedByElo.slice(0, 5).map(u => ({
    name: u.name,
    rate: u.elo || 1500,
    matches: (u.matchesPlayed || 0)
  })).filter(u => u.matches > 0);

  // Galibiyet Serisi
  db.leaders.winStreaks = sortedByElo.slice(0, 5).map(u => ({
    name: u.name,
    streak: u.currentStreak || 0
  })).filter(u => u.streak > 0);
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

    const uniqueUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const user = {
      id: uniqueUserId,
      ...newUser,
      elo: newUser.elo ? parseInt(newUser.elo) : 1500,
      verified: true
    };
    db.users.push(user);
    updateLeaderboards(db);
    writeDB(db);
    return { success: true, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, chessUsername: user.chessUsername, bio: user.bio, avatar: user.avatar, matchmakingSettings: user.matchmakingSettings } };
  },

  verifyUser: (email, code) => {
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return { error: "Kullanıcı bulunamadı." };
    user.verified = true;
    updateLeaderboards(db);
    writeDB(db);
    return { success: true };
  },

  loginUser: (email, password) => {
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return { error: "Hatalı e-posta veya kullanıcı bulunamadı." };
    if (user.password !== password) return { error: "Şifre yanlış." };
    return { success: true, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, chessUsername: user.chessUsername, bio: user.bio, avatar: user.avatar, matchmakingSettings: user.matchmakingSettings } };
  },

  updateUserProfile: (userId, updates) => {
    const db = readDB();
    let userIndex = db.users.findIndex(u => String(u.id) === String(userId));
    
    // Otomatik Üye Kurtarma: Kullanıcı silinmiş veya eski oturum kalmışsa otomatik veritabanına ekle
    if (userIndex === -1 && updates.email) {
      userIndex = db.users.findIndex(u => u.email === updates.email);
    }
    if (userIndex === -1) {
      const newUser = {
        id: String(userId),
        name: updates.name || "Satranç Oyuncusu",
        email: updates.email || `${userId}@ozderchess.com`,
        password: 'password_auto',
        phone: updates.phone || '05555555555',
        chessUsername: updates.chessUsername || 'oyuncu',
        elo: 1500,
        verified: true,
        bio: updates.bio || '',
        avatar: updates.avatar || '',
        matchmakingSettings: updates.matchmakingSettings || { isActive: false }
      };
      db.users.push(newUser);
      userIndex = db.users.length - 1;
    }

    const user = db.users[userIndex];
    
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.chessUsername !== undefined) user.chessUsername = updates.chessUsername;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if (updates.matchmakingSettings !== undefined) user.matchmakingSettings = updates.matchmakingSettings;

    writeDB(db);
    return { success: true, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, chessUsername: user.chessUsername, bio: user.bio, avatar: user.avatar, matchmakingSettings: user.matchmakingSettings } };
  },

  adminUpdateUser: (userId, updates) => {
    const db = readDB();
    const userIndex = db.users.findIndex(u => String(u.id) === String(userId));
    if (userIndex === -1) return { error: "Kullanıcı bulunamadı." };

    const user = db.users[userIndex];
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.chessUsername !== undefined) user.chessUsername = updates.chessUsername;
    if (updates.elo !== undefined) user.elo = parseInt(updates.elo);
    if (updates.verified !== undefined) user.verified = Boolean(updates.verified);

    updateLeaderboards(db);
    writeDB(db);
    return { success: true, users: db.users };
  },

  deleteUser: (userId) => {
    const db = readDB();
    const uId = String(userId);
    db.users = db.users.filter(u => String(u.id) !== uId);
    db.registrations = db.registrations.filter(r => String(r.userId) !== uId);
    db.stats.registeredPlayers = db.registrations.length;
    updateLeaderboards(db);
    writeDB(db);
    return { success: true, users: db.users, registrations: db.registrations };
  },

  registerForTournament: (tournamentId, userId, name, chessUsername) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };
    if (tournament.status === 'cancelled') return { error: "Bu turnuva iptal edilmiştir, kayıt yapılamaz." };

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

  registerGuestParticipant: (tournamentId, guestName, initialElo = 1500) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };
    if (tournament.status === 'cancelled') return { error: "Bu turnuva iptal edilmiştir, kayıt yapılamaz." };

    const currentRegs = db.registrations.filter(r => r.tournamentId === parseInt(tournamentId)).length;
    if (currentRegs >= tournament.maxQuota) return { error: "Kontenjan dolu." };

    const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const guestUser = {
      id: guestId,
      name: guestName.trim() + " (Misafir)",
      email: `${guestId}@cafe.ozder`,
      password: 'guest_no_login',
      phone: '-',
      chessUsername: 'misafir',
      elo: parseInt(initialElo) || 1500,
      verified: true,
      isGuest: true,
      tournamentId: parseInt(tournamentId)
    };

    db.users.push(guestUser);
    db.registrations.push({
      tournamentId: parseInt(tournamentId),
      userId: guestId,
      name: guestUser.name,
      chessUsername: 'misafir',
      isGuest: true,
      registrationDate: new Date().toISOString()
    });

    db.stats.registeredPlayers = db.registrations.length;
    updateLeaderboards(db);
    writeDB(db);
    return { success: true, users: db.users, registrations: db.registrations };
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

  updateTournament: (tournamentId, updates) => {
    const db = readDB();
    const index = db.tournaments.findIndex(t => t.id === parseInt(tournamentId));
    if (index === -1) return { error: "Turnuva bulunamadı." };

    const current = db.tournaments[index];
    db.tournaments[index] = {
      ...current,
      title: updates.title !== undefined ? updates.title : current.title,
      date: updates.date !== undefined ? updates.date : current.date,
      time: updates.time !== undefined ? updates.time : current.time,
      location: updates.location !== undefined ? updates.location : current.location,
      fee: updates.fee !== undefined ? updates.fee : current.fee,
      maxQuota: updates.maxQuota !== undefined ? parseInt(updates.maxQuota) : current.maxQuota,
      totalRounds: updates.totalRounds !== undefined ? parseInt(updates.totalRounds) : current.totalRounds,
      status: updates.status !== undefined ? updates.status : current.status
    };

    writeDB(db);
    return { success: true, tournaments: db.tournaments };
  },

  cancelTournament: (tournamentId) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };

    tournament.status = "cancelled";
    writeDB(db);
    return { success: true, tournaments: db.tournaments };
  },

  deleteTournament: (tournamentId) => {
    const db = readDB();
    const id = parseInt(tournamentId);
    db.tournaments = db.tournaments.filter(t => t.id !== id);
    db.registrations = db.registrations.filter(r => r.tournamentId !== id);
    db.stats.organizedTournaments = db.tournaments.length;
    db.stats.registeredPlayers = db.registrations.length;
    updateLeaderboards(db);
    writeDB(db);
    return { success: true, tournaments: db.tournaments, registrations: db.registrations };
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

      // Turnuva bittiğinde misafir (geçici cafe oyuncusu) profillerini temizle
      db.users = db.users.filter(u => !u.isGuest);

      updateLeaderboards(db);
      writeDB(db);
      return { success: true, message: "Turnuva tamamlandı! Misafir hesaplar temizlendi.", tournaments: db.tournaments, users: db.users };
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
  },

  // =================== RAKİP BULMA / EŞLEŞME İSTEKLERİ & MESAJLAŞMA ===================
  sendMatchRequest: (fromUser, toUserId, message = '') => {
    const db = readDB();
    const toUser = db.users.find(u => String(u.id) === String(toUserId));
    if (!toUser) return { error: "İstek gönderilecek oyuncu bulunamadı." };
    if (String(fromUser.id) === String(toUserId)) return { error: "Kendinize oyun isteği gönderemezsiniz." };

    // Engelleme kontrolü (eğer hedef kullanıcı göndereni engellediyse)
    if (Array.isArray(toUser.blockedUsers) && toUser.blockedUsers.includes(String(fromUser.id))) {
      return { error: "Bu kullanıcıya şu an istek gönderemezsiniz." };
    }

    const existingPending = db.matchRequests.find(r => 
      String(r.fromUserId) === String(fromUser.id) && 
      String(r.toUserId) === String(toUserId) && 
      r.status === 'pending'
    );
    if (existingPending) {
      return { error: "Bu oyuncuya zaten bekleyen bir oyun isteğiniz bulunuyor." };
    }

    const request = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      fromUserId: String(fromUser.id),
      fromUserName: fromUser.name,
      fromUserChess: fromUser.chessUsername || '',
      fromUserElo: fromUser.elo || 1500,
      fromUserAvatar: fromUser.avatar || '',
      toUserId: String(toUserId),
      toUserName: toUser.name,
      toUserChess: toUser.chessUsername || '',
      toUserElo: toUser.elo || 1500,
      toUserAvatar: toUser.avatar || '',
      message: message.trim() || 'Seninle satranç oynamak istiyorum!',
      status: 'pending', // 'pending', 'accepted', 'rejected', 'cancelled'
      createdAt: new Date().toISOString()
    };

    db.matchRequests.unshift(request);
    writeDB(db);
    return { success: true, request, matchRequests: db.matchRequests };
  },

  respondMatchRequest: (userId, requestId, action) => { // action: 'accept' | 'reject' | 'cancel'
    const db = readDB();
    const request = db.matchRequests.find(r => r.id === requestId);
    if (!request) return { error: "İstek bulunamadı." };

    if (action === 'cancel') {
      if (String(request.fromUserId) !== String(userId)) {
        return { error: "Sadece kendi gönderdiğiniz isteği iptal edebilirsiniz." };
      }
      request.status = 'cancelled';
    } else {
      if (String(request.toUserId) !== String(userId)) {
        return { error: "Bu istek size ait değil." };
      }
      if (action === 'accept') {
        request.status = 'accepted';
        request.acceptedAt = new Date().toISOString();
      } else {
        request.status = 'rejected';
      }
    }

    writeDB(db);
    return { success: true, request, matchRequests: db.matchRequests };
  },

  sendDirectMessage: (senderId, receiverId, text, senderNameFallback = '', receiverNameFallback = '') => {
    const db = readDB();
    if (!text || !text.trim()) return { error: "Mesaj boş olamaz." };

    const sId = String(senderId);
    const rId = String(receiverId);

    // Eşleşme kontrolü: İki kullanıcı arasında kabul edilmiş en az 1 matchRequest olmalıdır (id veya isim eşleşmesiyle)
    const matchedReq = db.matchRequests.find(r => 
      r.status === 'accepted' && 
      ((String(r.fromUserId) === sId && String(r.toUserId) === rId) ||
       (String(r.fromUserId) === rId && String(r.toUserId) === sId) ||
       (r.fromUserName === sId && r.toUserName === rId) ||
       (r.fromUserName === rId && r.toUserName === sId))
    );

    if (!matchedReq) {
      return { error: "Mesajlaşabilmek için oyun isteğinin kabul edilmiş olması gerekir." };
    }

    let sender = db.users.find(u => String(u.id) === sId || u.name === sId || (u.chessUsername && u.chessUsername === sId));
    let receiver = db.users.find(u => String(u.id) === rId || u.name === rId || (u.chessUsername && u.chessUsername === rId));

    // Eğer kullanıcı veritabanında yoksa (örn. sunucu restart sonrası veya isimle referans edilmişse), request bilgilerinden tamamla
    if (!sender) {
      const isFrom = String(matchedReq.fromUserId) === sId || matchedReq.fromUserName === sId;
      const sName = senderNameFallback || (isFrom ? matchedReq.fromUserName : matchedReq.toUserName) || sId;
      sender = {
        id: sId,
        name: sName,
        chessUsername: isFrom ? matchedReq.fromUserChess : matchedReq.toUserChess,
        avatar: isFrom ? matchedReq.fromUserAvatar : matchedReq.toUserAvatar,
        blockedUsers: []
      };
      db.users.push(sender);
    }

    if (!receiver) {
      const isTo = String(matchedReq.toUserId) === rId || matchedReq.toUserName === rId;
      const rName = receiverNameFallback || (isTo ? matchedReq.toUserName : matchedReq.fromUserName) || rId;
      receiver = {
        id: rId,
        name: rName,
        chessUsername: isTo ? matchedReq.toUserChess : matchedReq.fromUserChess,
        avatar: isTo ? matchedReq.toUserAvatar : matchedReq.fromUserAvatar,
        blockedUsers: []
      };
      db.users.push(receiver);
    }

    // Engelleme kontrolü
    if (Array.isArray(receiver.blockedUsers) && receiver.blockedUsers.includes(sId)) {
      return { error: "Bu kullanıcı tarafından engellendiğiniz için mesaj gönderilemiyor." };
    }
    if (Array.isArray(sender.blockedUsers) && sender.blockedUsers.includes(rId)) {
      return { error: "Engellediğiniz kullanıcıya mesaj gönderemezsiniz. Önce engeli kaldırın." };
    }

    const newMsg = {
      id: 'dm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: sId,
      senderName: sender.name,
      receiverId: rId,
      receiverName: receiver.name,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    db.directMessages.push(newMsg);
    writeDB(db);
    return { success: true, message: newMsg, directMessages: db.directMessages };
  },

  blockUserToggle: (currentUserId, targetUserId) => {
    const db = readDB();
    const user = db.users.find(u => String(u.id) === String(currentUserId));
    if (!user) return { error: "Kullanıcı bulunamadı." };

    if (!Array.isArray(user.blockedUsers)) {
      user.blockedUsers = [];
    }

    const tId = String(targetUserId);
    const index = user.blockedUsers.indexOf(tId);
    let isBlocked = false;

    if (index === -1) {
      user.blockedUsers.push(tId);
      isBlocked = true;
    } else {
      user.blockedUsers.splice(index, 1);
      isBlocked = false;
    }

    writeDB(db);
    return { success: true, isBlocked, blockedUsers: user.blockedUsers, user };
  },

  reportSpam: (reporterUser, targetUserId, reason, details = '') => {
    const db = readDB();
    const targetUser = db.users.find(u => String(u.id) === String(targetUserId));
    if (!targetUser) return { error: "Şikayet edilen kullanıcı bulunamadı." };

    const report = {
      id: 'spam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      reporterId: String(reporterUser.id),
      reporterName: reporterUser.name,
      reporterEmail: reporterUser.email || '',
      targetUserId: String(targetUserId),
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email || '',
      reason: reason || 'Uygunsuz Davranış / Spam',
      details: details.trim(),
      date: new Date().toISOString(),
      status: 'pending' // 'pending', 'resolved'
    };

    db.spamReports.unshift(report);
    writeDB(db);
    return { success: true, report, spamReports: db.spamReports };
  },

  resolveSpamReport: (reportId) => {
    const db = readDB();
    const rep = db.spamReports.find(r => r.id === reportId);
    if (rep) {
      rep.status = 'resolved';
      writeDB(db);
    }
    return { success: true, spamReports: db.spamReports };
  }
};
