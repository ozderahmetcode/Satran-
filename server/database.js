const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Yeni Kullanıcı ve Çoklu Kayıt Modeli
const defaultData = {
  stats: {
    organizedTournaments: 1,
    gamesPlayed: 0,
    registeredPlayers: 0
  },
  users: [], // { id, name, email, password, phone, chessUsername, verified, verificationCode }
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
      maxQuota: 20
    }
  ],
  registrations: [] // { tournamentId, userId, registrationDate }
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

module.exports = {
  getData: () => readDB(),
  
  // Kullanıcı işlemleri
  registerUser: (newUser) => {
    const db = readDB();
    const emailExists = db.users.some(u => u.email === newUser.email);
    if (emailExists) return { error: "Bu e-posta adresi zaten kayıtlı." };

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const user = {
      id: db.users.length + 1,
      ...newUser,
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
    return { success: true, user: { id: user.id, name: user.name, email: user.email, chessUsername: user.chessUsername, phone: user.phone } };
  },

  // Turnuva Kayıt İşlemleri
  registerForTournament: (tournamentId, userId) => {
    const db = readDB();
    const tournament = db.tournaments.find(t => t.id === parseInt(tournamentId));
    if (!tournament) return { error: "Turnuva bulunamadı." };

    // Zaten kayıtlı mı kontrolü
    const alreadyRegistered = db.registrations.some(r => r.tournamentId === parseInt(tournamentId) && r.userId === parseInt(userId));
    if (alreadyRegistered) return { error: "Bu turnuvaya zaten kayıtlısınız." };

    // Kontenjan kontrolü
    const currentRegs = db.registrations.filter(r => r.tournamentId === parseInt(tournamentId)).length;
    if (currentRegs >= tournament.maxQuota) return { error: "Kontenjan dolu." };

    db.registrations.push({
      tournamentId: parseInt(tournamentId),
      userId: parseInt(userId),
      registrationDate: new Date().toISOString()
    });
    
    db.stats.registeredPlayers = db.registrations.length;
    writeDB(db);
    return { success: true, registrations: db.registrations };
  },

  cancelTournamentRegistration: (tournamentId, userId) => {
    const db = readDB();
    db.registrations = db.registrations.filter(r => !(r.tournamentId === parseInt(tournamentId) && r.userId === parseInt(userId)));
    db.stats.registeredPlayers = db.registrations.length;
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
      status: "active"
    };
    db.tournaments.unshift(tournament);
    db.stats.organizedTournaments = db.tournaments.length;
    writeDB(db);
    return db.tournaments;
  }
};
