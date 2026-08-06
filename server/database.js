const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Sıfırdan başlayacak temiz veritabanı şablonu (özder satranç topluluğu)
const defaultData = {
  stats: {
    organizedTournaments: 0,
    gamesPlayed: 0,
    registeredPlayers: 0
  },
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

module.exports = {
  getData: () => readDB(),
  saveRegistration: (newReg) => {
    const db = readDB();
    db.registrations.push({
      ...newReg,
      registrationDate: new Date().toISOString()
    });
    db.stats.registeredPlayers = db.registrations.length;
    writeDB(db);
    return db.registrations;
  },
  deleteRegistration: (phone) => {
    const db = readDB();
    db.registrations = db.registrations.filter(reg => reg.phone !== phone);
    db.stats.registeredPlayers = db.registrations.length;
    writeDB(db);
    return db.registrations;
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
