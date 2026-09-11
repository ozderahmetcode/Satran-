const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Render.com Kalıcı Disk ve Yerel Geliştirme Dizin Algılama
const RENDER_DISK = process.env.RENDER_DISK_PATH || (fs.existsSync('/var/data') ? '/var/data' : null);
const DATA_DIR = RENDER_DISK ? path.join(RENDER_DISK, 'satranc_data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'db_backup_latest.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'auto_backups');

let memoryCache = null;
let writeCounter = 0;
let mongoClient = null;
let mongoDb = null;

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
  spamReports: [],
  securityLogs: [],
  passwordResets: [],
  analytics: {
    totalTimeSpentSeconds: 0,
    totalVisits: 0,
    hourly: {},
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {},
    activeSessions: {}
  }
};

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }

  let needsRecovery = false;
  if (!fs.existsSync(DB_FILE)) {
    needsRecovery = true;
  } else {
    try {
      const stats = fs.statSync(DB_FILE);
      if (stats.size === 0) needsRecovery = true;
    } catch (e) {
      needsRecovery = true;
    }
  }

  if (needsRecovery) {
    // 1. En güncel yedek dosyasından (db_backup_latest.json) kurtarmayı dene
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const backupRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
        if (backupRaw && backupRaw.trim().length > 10) {
          JSON.parse(backupRaw); // doğrula
          fs.writeFileSync(DB_FILE, backupRaw, 'utf-8');
          console.log('[Veritabanı Kurtarma] db.json en son yedekten (db_backup_latest.json) başarıyla geri yüklendi.');
          return;
        }
      } catch (e) {
        console.warn('[Veritabanı Kurtarma] db_backup_latest.json okunamadı:', e.message);
      }
    }

    // 2. Anlık otomatik yedeklerden (snapshots) en sonuncusunu bulmayı dene
    try {
      const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.startsWith('snapshot_') && f.endsWith('.json'));
      if (files.length > 0) {
        files.sort().reverse(); // en yeni snapshot
        const latestSnap = path.join(SNAPSHOTS_DIR, files[0]);
        const snapRaw = fs.readFileSync(latestSnap, 'utf-8');
        JSON.parse(snapRaw);
        fs.writeFileSync(DB_FILE, snapRaw, 'utf-8');
        console.log(`[Veritabanı Kurtarma] db.json ${files[0]} yedeğinden başarıyla kurtarıldı.`);
        return;
      }
    } catch (e) {
      console.warn('[Veritabanı Kurtarma] Snapshots kontrolü hatası:', e.message);
    }

    // 3. Hiçbir yedek bulunamazsa varsayılan verilerle başlat
    console.log('[Veritabanı Başlatma] Yeni db.json oluşturuluyor...');
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    try {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    } catch (e) {}
  }
}

function getWeekString(d = new Date()) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-H${String(weekNum).padStart(2, '0')}`;
}

function readDB() {
  if (memoryCache) return memoryCache;
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
        if (typeof u.totalTimeSpentSeconds !== 'number') {
          u.totalTimeSpentSeconds = 0;
          changed = true;
        }
        if (typeof u.visitCount !== 'number') {
          u.visitCount = 0;
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
    if (!Array.isArray(parsed.securityLogs)) {
      parsed.securityLogs = [];
      changed = true;
    }
    if (!Array.isArray(parsed.passwordResets)) {
      parsed.passwordResets = [];
      changed = true;
    }
    if (!parsed.analytics || typeof parsed.analytics !== 'object') {
      parsed.analytics = {
        totalTimeSpentSeconds: 0,
        totalVisits: 0,
        hourly: {},
        daily: {},
        weekly: {},
        monthly: {},
        yearly: {},
        activeSessions: {}
      };
      changed = true;
    } else {
      if (typeof parsed.analytics.totalTimeSpentSeconds !== 'number') parsed.analytics.totalTimeSpentSeconds = 0;
      if (typeof parsed.analytics.totalVisits !== 'number') parsed.analytics.totalVisits = 0;
      if (!parsed.analytics.hourly) parsed.analytics.hourly = {};
      if (!parsed.analytics.daily) parsed.analytics.daily = {};
      if (!parsed.analytics.weekly) parsed.analytics.weekly = {};
      if (!parsed.analytics.monthly) parsed.analytics.monthly = {};
      if (!parsed.analytics.yearly) parsed.analytics.yearly = {};
    }
    updateLeaderboards(parsed);
    if (changed) {
      writeDB(parsed);
    }
    memoryCache = parsed;
    return parsed;
  } catch (error) {
    console.error("Veritabanı okuma hatası:", error);
    if (memoryCache) return memoryCache;
    return defaultData;
  }
}

function writeDB(data) {
  memoryCache = data;
  
  // Asenkron olarak MongoDB'ye kaydet
  if (mongoDb) {
    mongoDb.collection('app_state').updateOne(
      { _id: 'main_db' },
      { $set: { data: data } },
      { upsert: true }
    ).catch(err => console.error('[MongoDB] Senkronizasyon hatası:', err));
  }

  initDB();
  try {
    const rawData = JSON.stringify(data, null, 2);
    // 1. Güvenli atomik yazma (.tmp yazılıp rename edilir)
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, rawData, 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);

    // 2. Eş zamanlı en güncel yedek dosyasına kopyala
    try {
      fs.writeFileSync(BACKUP_FILE, rawData, 'utf-8');
    } catch (err) {
      console.warn('[Yedekleme Uyarısı] db_backup_latest yazılamadı:', err.message);
    }

    // 3. Periyodik Snapshot Rotasyonu (Her 15 yazmada bir)
    writeCounter++;
    if (writeCounter % 15 === 0) {
      try {
        const snapFile = path.join(SNAPSHOTS_DIR, `snapshot_${Date.now()}.json`);
        fs.writeFileSync(snapFile, rawData, 'utf-8');
        // 10'dan fazla snapshot varsa en eskilerini temizle
        const allSnaps = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.startsWith('snapshot_') && f.endsWith('.json')).sort();
        while (allSnaps.length > 10) {
          const oldFile = allSnaps.shift();
          try { fs.unlinkSync(path.join(SNAPSHOTS_DIR, oldFile)); } catch (e) {}
        }
      } catch (e) {
        console.warn('[Snapshot Hatası]:', e.message);
      }
    }

    memoryCache = data;
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
  if (!db.leaders || typeof db.leaders !== 'object') {
    db.leaders = {
      champions: [],
      activePlayers: [],
      highestWinRates: [],
      winStreaks: []
    };
  }

  // 1. ŞAMPİYONLAR:
  // Tamamlanan turnuvalardaki şampiyonları tara (iptal edilenleri hariç tut)
  const championStats = {};
  if (Array.isArray(db.tournaments)) {
    db.tournaments.forEach(t => {
      // İptal edilenleri hariç tut; sadece tamamlanan veya şampiyonu belirlenmiş olanları al
      const isCompleted = t.status === 'completed' || (t.champion && t.champion !== 'Bekleniyor...' && t.champion !== 'Belirsiz');
      if (t.status !== 'cancelled' && isCompleted) {
        const champName = t.champion;
        if (champName && champName !== 'Bekleniyor...' && champName !== 'Belirsiz') {
          const matchedUser = db.users?.find(u => u.name === champName || u.chessUsername === champName || u.username === champName);
          const elo = matchedUser?.elo || 1500;
          if (!championStats[champName]) {
            championStats[champName] = {
              name: champName,
              titles: 1,
              points: elo
            };
          } else {
            championStats[champName].titles += 1;
            if (matchedUser?.elo) championStats[champName].points = matchedUser.elo;
          }
        }
      }
    });
  }

  db.leaders.champions = Object.values(championStats)
    .sort((a, b) => b.titles !== a.titles ? b.titles - a.titles : b.points - a.points);

  // 2. OYUNCU İSTATİSTİKLERİ:
  // Maç sayıları, galibiyetler, galibiyet serileri
  const playerStats = {};

  if (Array.isArray(db.users)) {
    db.users.forEach(u => {
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
  }

  if (Array.isArray(db.registrations)) {
    db.registrations.forEach(r => {
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
  }

  // Turnuvalardaki oynanmış maçları (result !== 'pending') tara (İptal olan turnuvaları hariç tut)
  let totalGamesCount = 0;
  if (Array.isArray(db.tournaments)) {
    db.tournaments.forEach(t => {
      if (t.status === 'cancelled') return;
      t.rounds?.forEach(round => {
        round.pairings?.forEach(p => {
          if (!p.result || p.result === 'pending') return;
          totalGamesCount += 1;

          const wId = String(p.whiteId);
          const bId = p.blackId ? String(p.blackId) : null;

          if (wId && !playerStats[wId]) {
            const reg = db.registrations?.find(r => String(r.userId) === wId);
            playerStats[wId] = { id: wId, name: reg?.name || wId, elo: 1500, matchesPlayed: 0, matchesWon: 0, currentStreak: 0, maxStreak: 0 };
          }
          if (bId && !playerStats[bId]) {
            const reg = db.registrations?.find(r => String(r.userId) === bId);
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
            if (bId && playerStats[bId]) {
              playerStats[bId].currentStreak = 0;
            }
          } else if (p.result === 'black') {
            if (bId && playerStats[bId]) {
              playerStats[bId].matchesWon += 1;
              playerStats[bId].currentStreak += 1;
              if (playerStats[bId].currentStreak > playerStats[bId].maxStreak) {
                playerStats[bId].maxStreak = playerStats[bId].currentStreak;
              }
            }
            if (playerStats[wId]) {
              playerStats[wId].currentStreak = 0;
            }
          } else if (p.result === 'draw') {
            if (playerStats[wId]) playerStats[wId].currentStreak = 0;
            if (bId && playerStats[bId]) playerStats[bId].currentStreak = 0;
          }
        });
      });
    });
  }

  const allPlayers = Object.values(playerStats);

  // 3. EN AKTİF OYUNCULAR (En çok maç yapanlar)
  db.leaders.activePlayers = allPlayers
    .filter(p => p.matchesPlayed > 0)
    .sort((a, b) => b.matchesPlayed !== a.matchesPlayed ? b.matchesPlayed - a.matchesPlayed : b.matchesWon - a.matchesWon)
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      matches: p.matchesPlayed,
      winRate: p.matchesPlayed > 0 ? `%${Math.round((p.matchesWon / p.matchesPlayed) * 100)}` : '%0'
    }));

  // 4. EN YÜKSEK ELO PUANI
  const activeOrRegPool = allPlayers.filter(p => p.matchesPlayed > 0 || db.registrations?.some(r => String(r.userId) === p.id));
  const eloPool = activeOrRegPool.length > 0 ? activeOrRegPool : allPlayers;
  db.leaders.highestWinRates = eloPool
    .sort((a, b) => (b.elo || 1500) - (a.elo || 1500))
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      rate: p.elo || 1500,
      matches: p.matchesPlayed
    }));

  // 5. EN UZUN GALİBİYET SERİSİ
  db.leaders.winStreaks = allPlayers
    .filter(p => p.maxStreak > 0 || p.currentStreak > 0)
    .sort((a, b) => Math.max(b.maxStreak, b.currentStreak) - Math.max(a.maxStreak, a.currentStreak))
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      streak: Math.max(p.maxStreak, p.currentStreak)
    }));

  // İstatistikleri de güncelle
  if (db.stats) {
    db.stats.gamesPlayed = totalGamesCount;
    db.stats.organizedTournaments = db.tournaments ? db.tournaments.filter(t => t.status !== 'cancelled').length : 0;
    db.stats.registeredPlayers = db.registrations ? db.registrations.length : 0;
  }
}

module.exports = {
  connectToMongo: async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log('[MongoDB] MONGODB_URI bulunamadı, sadece yerel db.json kullanılacak.');
      readDB(); // Yerel dosyadan yükle
      return;
    }
    try {
      console.log('[MongoDB] Atlas kümesine bağlanılıyor...');
      mongoClient = new MongoClient(uri);
      await mongoClient.connect();
      mongoDb = mongoClient.db('ozderchess');
      console.log('[MongoDB] Bağlantı başarılı!');
      
      const collection = mongoDb.collection('app_state');
      const doc = await collection.findOne({ _id: 'main_db' });
      
      if (doc && doc.data) {
        memoryCache = doc.data;
        console.log('[MongoDB] Veriler buluttan hafızaya başarıyla yüklendi.');
      } else {
        console.log('[MongoDB] Bulutta veri bulunamadı. Yerel veriler buluta aktarılıyor...');
        const localData = readDB();
        await collection.updateOne(
          { _id: 'main_db' },
          { $set: { data: localData } },
          { upsert: true }
        );
        console.log('[MongoDB] Yerel veriler buluta aktarıldı.');
      }
    } catch (err) {
      console.error('[MongoDB] Bağlantı veya okuma hatası:', err);
      readDB(); // Hata durumunda yerel fallback
    }
  },

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
    const cleanEmail = (newUser.email || '').trim().toLowerCase();
    const cleanUsername = (newUser.username || '').trim().toLowerCase();

    if (!cleanUsername) {
      return { error: "Kullanıcı adı oluşturulması zorunludur." };
    }

    // Kullanıcı adı geçerlilik kontrolü (yalnızca harf, rakam, alt çizgi, nokta ve tire, min 3 karakter)
    if (!/^[a-zA-Z0-9_.-]{3,25}$/.test(cleanUsername)) {
      return { error: "Kullanıcı adı 3-25 karakter arasında olmalı ve Türkçe özel karakter/boşluk içermemelidir." };
    }

    const emailExists = db.users.some(u => (u.email || '').trim().toLowerCase() === cleanEmail);
    if (emailExists) return { error: "Bu e-posta adresi zaten kayıtlı." };

    const usernameExists = db.users.some(u => (u.username || '').trim().toLowerCase() === cleanUsername);
    if (usernameExists) return { error: "Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı seçin." };

    const uniqueUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const user = {
      id: uniqueUserId,
      ...newUser,
      username: cleanUsername,
      email: cleanEmail,
      chessPlatform: newUser.chessPlatform || 'chess.com',
      chessUsername: newUser.chessUsername ? newUser.chessUsername.trim() : '',
      elo: newUser.elo ? parseInt(newUser.elo) : 1500,
      verified: true
    };
    db.users.push(user);
    updateLeaderboards(db);
    writeDB(db);
    return { 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        name: user.name, 
        phone: user.phone, 
        chessPlatform: user.chessPlatform,
        chessUsername: user.chessUsername, 
        bio: user.bio, 
        avatar: user.avatar, 
        matchmakingSettings: user.matchmakingSettings 
      } 
    };
  },

  verifyUser: (email, code) => {
    const db = readDB();
    const user = db.users.find(u => (u.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase());
    if (!user) return { error: "Kullanıcı bulunamadı." };
    user.verified = true;
    updateLeaderboards(db);
    writeDB(db);
    return { success: true };
  },

  loginUser: (identifier, password) => {
    const db = readDB();
    const cleanId = (identifier || '').trim().toLowerCase();
    
    // E-posta veya Kullanıcı adı ile eşleşme
    const user = db.users.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanId) || 
      (u.username && u.username.trim().toLowerCase() === cleanId)
    );

    if (!user) return { error: "Hatalı e-posta/kullanıcı adı veya kullanıcı bulunamadı." };
    if (user.password !== password) return { error: "Şifre yanlış." };
    return { 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username || '', 
        email: user.email, 
        name: user.name, 
        phone: user.phone, 
        chessPlatform: user.chessPlatform || 'chess.com',
        chessUsername: user.chessUsername || '', 
        bio: user.bio, 
        avatar: user.avatar, 
        matchmakingSettings: user.matchmakingSettings 
      } 
    };
  },

  changePassword: (userId, currentPassword, newPassword) => {
    const db = readDB();
    const user = db.users.find(u => String(u.id) === String(userId));
    if (!user) return { error: "Kullanıcı bulunamadı." };
    if (user.password !== currentPassword) {
      return { error: "Mevcut şifrenizi yanlış girdiniz." };
    }
    if (!newPassword || newPassword.length < 4) {
      return { error: "Yeni şifre en az 4 karakterden oluşmalıdır." };
    }
    user.password = newPassword;
    writeDB(db);
    return { success: true };
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
        username: updates.username || `user_${Date.now().toString(36)}`,
        name: updates.name || "Satranç Oyuncusu",
        email: updates.email || `${userId}@ozderchess.com`,
        password: 'password_auto',
        phone: updates.phone || '05555555555',
        chessPlatform: updates.chessPlatform || 'chess.com',
        chessUsername: updates.chessUsername || '',
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
    
    // NOT: username ASLA güncellenemez (sadece kayıt olurken oluşturulur)
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.chessPlatform !== undefined) user.chessPlatform = updates.chessPlatform;
    if (updates.chessUsername !== undefined) user.chessUsername = updates.chessUsername;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if (updates.matchmakingSettings !== undefined) user.matchmakingSettings = updates.matchmakingSettings;

    // Kullanıcının güncellenen avatar ve isim bilgisini tüm bekleyen/kabul edilmiş eşleşme isteklerinde senkronize et
    if (Array.isArray(db.matchRequests)) {
      db.matchRequests.forEach(req => {
        if (String(req.fromUserId) === String(user.id)) {
          if (user.avatar) req.fromUserAvatar = user.avatar;
          if (user.name) req.fromUserName = user.name;
          if (user.chessUsername) req.fromUserChess = user.chessUsername;
        }
        if (String(req.toUserId) === String(user.id)) {
          if (user.avatar) req.toUserAvatar = user.avatar;
          if (user.name) req.toUserName = user.name;
          if (user.chessUsername) req.toUserChess = user.chessUsername;
        }
      });
    }

    writeDB(db);
    return { 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username || '', 
        email: user.email, 
        name: user.name, 
        phone: user.phone, 
        chessPlatform: user.chessPlatform || 'chess.com',
        chessUsername: user.chessUsername || '', 
        bio: user.bio, 
        avatar: user.avatar, 
        matchmakingSettings: user.matchmakingSettings 
      } 
    };
  },

  adminUpdateUser: (userId, updates) => {
    const db = readDB();
    const userIndex = db.users.findIndex(u => String(u.id) === String(userId));
    if (userIndex === -1) return { error: "Kullanıcı bulunamadı." };

    const user = db.users[userIndex];
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.chessPlatform !== undefined) user.chessPlatform = updates.chessPlatform;
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
    if (tournament.status === 'completed') return { error: "Bu turnuva tamamlanmıştır, yeni kayıt kabul edilmemektedir." };

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
    if (tournament.status === 'completed') return { error: "Bu turnuva tamamlanmıştır, misafir eklenemez." };

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
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (tournament) {
      const isFinished = tournament.status === 'completed' || 
        tournament.status === 'cancelled' ||
        (tournament.champion && tournament.champion !== 'Bekleniyor...') ||
        (tournament.rounds && tournament.rounds.length >= tournament.totalRounds && tournament.rounds.length > 0 && !tournament.rounds[tournament.rounds.length - 1]?.pairings?.some(p => p.result === 'pending'));
      
      if (isFinished) {
        return { error: "Tamamlanmış veya sona ermiş turnuvalarda kayıt iptal edilemez." };
      }
    }

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

    // Eğer son tur oynandıysa ve tüm maçların sonucu girildiyse, turnuvayı otomatik olarak tamamla ve şampiyonu belirle
    const isLastRound = parseInt(roundNumber) >= tournament.totalRounds;
    const allMatchesCompleted = round.pairings.every(p => p.result && p.result !== 'pending');
    if (isLastRound && allMatchesCompleted) {
      const registrations = db.registrations.filter(r => r.tournamentId === parseInt(tournamentId));
      const players = registrations.map(r => {
        const user = db.users.find(u => String(u.id) === String(r.userId));
        if (user) return user;
        return { id: r.userId, name: r.name || "Bilinmeyen Oyuncu", elo: 1500 };
      }).filter(Boolean);

      const standings = {};
      players.forEach(p => { standings[p.id] = 0; });

      tournament.rounds.forEach(r => {
        r.pairings.forEach(p => {
          if (p.result === 'white') standings[p.whiteId] = (standings[p.whiteId] || 0) + 1;
          else if (p.result === 'black') standings[p.blackId] = (standings[p.blackId] || 0) + 1;
          else if (p.result === 'draw') {
            standings[p.whiteId] = (standings[p.whiteId] || 0) + 0.5;
            standings[p.blackId] = (standings[p.blackId] || 0) + 0.5;
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

      // Misafir hesapları temizle
      db.users = db.users.filter(u => !u.isGuest);
    }

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
  },

  // Ziyaret & Süre Analitiği Kaydı
  recordHeartbeatAndAnalytics: ({ clientId, userId, name, page, deltaSeconds = 0, isNewSession = false, isAdmin = false }) => {
    const db = readDB();
    const now = new Date();
    const sec = Math.max(0, Math.min(60, Math.round(Number(deltaSeconds) || 0)));

    // Eğer admin panelindeyse veya yönetici oturumuysa genel ziyaretçi süresini ve sayaçları etkilemez
    if (isAdmin || page === 'Yönetici Paneli' || page === 'admin') {
      return {
        success: true,
        analytics: db.analytics,
        updatedUser: null
      };
    }

    // 1. Toplam geçirilen süre
    if (sec > 0) {
      db.analytics.totalTimeSpentSeconds = (db.analytics.totalTimeSpentSeconds || 0) + sec;
    }

    // 2. Yeni Ziyaret/Giriş Kaydı (Saatlik, Günlük, Haftalık, Aylık, Yıllık)
    if (isNewSession) {
      db.analytics.totalVisits = (db.analytics.totalVisits || 0) + 1;

      const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:00`;
      const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const weekKey = getWeekString(now);
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = `${now.getFullYear()}`;

      db.analytics.hourly[hourKey] = (db.analytics.hourly[hourKey] || 0) + 1;
      db.analytics.daily[dayKey] = (db.analytics.daily[dayKey] || 0) + 1;
      db.analytics.weekly[weekKey] = (db.analytics.weekly[weekKey] || 0) + 1;
      db.analytics.monthly[monthKey] = (db.analytics.monthly[monthKey] || 0) + 1;
      db.analytics.yearly[yearKey] = (db.analytics.yearly[yearKey] || 0) + 1;
    }

    // 3. Kullanıcı Bazlı Süre ve Oturum Sayısı Takibi
    let updatedUser = null;
    if (userId) {
      const user = db.users.find(u => String(u.id) === String(userId));
      if (user) {
        if (sec > 0) {
          user.totalTimeSpentSeconds = (user.totalTimeSpentSeconds || 0) + sec;
        }
        if (isNewSession) {
          user.visitCount = (user.visitCount || 0) + 1;
        }
        user.lastActiveAt = now.toISOString();
        updatedUser = {
          id: user.id,
          name: user.name,
          totalTimeSpentSeconds: user.totalTimeSpentSeconds,
          visitCount: user.visitCount
        };
      }
    }

    writeDB(db);
    return {
      success: true,
      analytics: db.analytics,
      updatedUser
    };
  },

  getAnalytics: () => {
    const db = readDB();
    return db.analytics || {};
  },

  backupDB: () => {
    return readDB();
  },

  restoreDB: (backupData) => {
    if (!backupData || typeof backupData !== 'object') {
      return { error: "Geçersiz veya bozuk yedek verisi." };
    }
    
    // Güvenli şablon ile birleştir
    const restored = {
      ...defaultData,
      ...backupData,
      stats: { ...defaultData.stats, ...(backupData.stats || {}) },
      leaders: { ...defaultData.leaders, ...(backupData.leaders || {}) },
      analytics: { ...defaultData.analytics, ...(backupData.analytics || {}) }
    };

    if (!Array.isArray(restored.users)) restored.users = [];
    if (!Array.isArray(restored.tournaments)) restored.tournaments = [];
    if (!Array.isArray(restored.registrations)) restored.registrations = [];
    if (!Array.isArray(restored.messages)) restored.messages = [];
    if (!Array.isArray(restored.matchRequests)) restored.matchRequests = [];
    if (!Array.isArray(restored.directMessages)) restored.directMessages = [];
    if (!Array.isArray(restored.spamReports)) restored.spamReports = [];
    if (!Array.isArray(restored.securityLogs)) restored.securityLogs = [];

    // İstatistik ve liderlik tablosunu yeniden hesapla
    updateLeaderboards(restored);

    const ok = writeDB(restored);
    if (!ok) {
      return { error: "Yedek dosyaya yazılamadı." };
    }
    return { success: true, data: restored };
  },

  // ================= SİBER GÜVENLİK VE SALDIRI GÜNLÜĞÜ (WAF / IDS) =================
  recordSecurityLog: ({ type, ip, userAgent, method, path, details, threatPayload, severity = 'HIGH' }) => {
    try {
      const db = readDB();
      if (!Array.isArray(db.securityLogs)) {
        db.securityLogs = [];
      }

      let cleanPayload = '';
      if (typeof threatPayload === 'string') {
        cleanPayload = threatPayload.substring(0, 1000);
      } else if (threatPayload !== undefined && threatPayload !== null) {
        try {
          cleanPayload = JSON.stringify(threatPayload).substring(0, 1000);
        } catch (e) {
          cleanPayload = String(threatPayload).substring(0, 1000);
        }
      }

      const logEntry = {
        id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        type: type || 'GENEL_GÜVENLİK_İHLALİ',
        severity: severity || 'HIGH', // CRITICAL, HIGH, MEDIUM, LOW
        ip: ip || 'Bilinmiyor',
        userAgent: userAgent || 'Bilinmiyor',
        method: (method || 'GET').toUpperCase(),
        path: path || '/',
        details: details || '',
        threatPayload: cleanPayload
      };

      // En yeni kayıt en başta (Maksimum 500 kayıt tut)
      db.securityLogs.unshift(logEntry);
      if (db.securityLogs.length > 500) {
        db.securityLogs = db.securityLogs.slice(0, 500);
      }

      writeDB(db);
      return logEntry;
    } catch (err) {
      console.error('[DB Güvenlik Kaydı Hatası]:', err);
      return null;
    }
  },

  getSecurityLogs: () => {
    const db = readDB();
    return db.securityLogs || [];
  },

  clearSecurityLogs: () => {
    const db = readDB();
    db.securityLogs = [];
    writeDB(db);
    return [];
  },

  deleteSecurityLog: (id) => {
    const db = readDB();
    db.securityLogs = (db.securityLogs || []).filter(log => log.id !== id);
    writeDB(db);
    return db.securityLogs;
  },

  // ================= DEPOLAMA VE DİSK DURUMU =================
  getDataDir: () => DATA_DIR,
  hasPersistentDisk: () => Boolean(RENDER_DISK),

  // ================= ŞİFRE SIFIRLAMA VE KURTARMA SİSTEMİ =================
  createPasswordResetCode: (identifier) => {
    const db = readDB();
    const cleanId = (identifier || '').trim().toLowerCase();

    // Kullanıcıyı e-posta veya kullanıcı adı ile bul
    const user = db.users.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanId) || 
      (u.username && u.username.trim().toLowerCase() === cleanId)
    );

    if (!user) {
      return { error: "Bu kullanıcı adı veya e-posta ile kayıtlı bir hesap bulunamadı." };
    }

    if (!Array.isArray(db.passwordResets)) {
      db.passwordResets = [];
    }

    // 6 Haneli Kriptografik Güvenli PIN Kodu (Örn: 482915)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 dakika geçerli

    // Eski kullanılmamış talepleri temizle
    db.passwordResets = db.passwordResets.filter(r => r.userId !== user.id || r.used);

    const resetRecord = {
      id: 'reset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: user.id,
      email: user.email,
      username: user.username,
      code,
      expiresAt,
      createdAt: new Date().toISOString(),
      used: false
    };

    db.passwordResets.push(resetRecord);

    // Güvenlik Günlüğüne de kaydet (Yönetici panelinden izlenebilir)
    if (Array.isArray(db.securityLogs)) {
      db.securityLogs.unshift({
        id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        type: 'ŞİFRE_KURTARMA_KODU',
        severity: 'LOW',
        ip: 'Sistem',
        userAgent: 'Internal/Auth',
        method: 'POST',
        path: '/api/auth/forgot-password',
        details: `Kullanıcı: ${user.username} (${user.email}) için 15 dakika geçerli kod üretildi: [ ${code} ]`,
        threatPayload: `PIN: ${code}`
      });
      if (db.securityLogs.length > 500) db.securityLogs = db.securityLogs.slice(0, 500);
    }

    writeDB(db);

    return {
      success: true,
      code,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email
      }
    };
  },

  verifyAndResetPassword: (identifier, code, newPassword) => {
    const db = readDB();
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return { error: "Lütfen 6 haneli doğrulama kodunu eksiksiz girin." };
    }

    if (!newPassword || newPassword.length < 6) {
      return { error: "Yeni şifre en az 6 karakter uzunluğunda olmalıdır." };
    }

    const user = db.users.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanId) || 
      (u.username && u.username.trim().toLowerCase() === cleanId)
    );

    if (!user) {
      return { error: "Kullanıcı bulunamadı." };
    }

    if (!Array.isArray(db.passwordResets)) {
      db.passwordResets = [];
    }

    // Aktif, süresi dolmamış ve kullanılmamış talebi bul
    const now = Date.now();
    const resetRecord = db.passwordResets.find(r => 
      r.userId === user.id && 
      r.code === cleanCode && 
      !r.used && 
      r.expiresAt > now
    );

    if (!resetRecord) {
      return { error: "Girdiğiniz güvenlik kodu geçersiz veya 15 dakikalık süresi dolmuş. Lütfen tekrar kod isteyin." };
    }

    // Şifreyi güncelle ve kodu kullanıldı olarak işaretle
    user.password = newPassword;
    resetRecord.used = true;

    // Başarılı sıfırlama güvenlik günlüğü
    if (Array.isArray(db.securityLogs)) {
      db.securityLogs.unshift({
        id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        type: 'ŞİFRE_BAŞARIYLA_GÜNCELLENDİ',
        severity: 'LOW',
        ip: 'Sistem',
        userAgent: 'Internal/Auth',
        method: 'POST',
        path: '/api/auth/reset-password',
        details: `Kullanıcı: ${user.username} (${user.email}) şifresini başarıyla yeniledi.`,
        threatPayload: ''
      });
      if (db.securityLogs.length > 500) db.securityLogs = db.securityLogs.slice(0, 500);
    }

    writeDB(db);

    return {
      success: true,
      message: "Şifreniz başarıyla sıfırlandı! Artık yeni şifreniz ile giriş yapabilirsiniz."
    };
  }
};

