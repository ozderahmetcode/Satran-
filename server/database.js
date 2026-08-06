const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Varsayılan mock veriler (Özder satranç topluluğu için şampiyonlar, aktif oyuncular vb.)
const defaultData = {
  stats: {
    organizedTournaments: 114,
    gamesPlayed: 7240,
    registeredPlayers: 948
  },
  leaders: {
    champions: [
      { name: "Özder Gültekin", titles: 8, points: 2400 },
      { name: "Ufuk Yılmaz", titles: 5, points: 2150 },
      { name: "Fatih Alaybeyoğlu", titles: 4, points: 2050 },
      { name: "FM Emirhan Tarlabaşı", titles: 3, points: 2200 },
      { name: "Beymurat", titles: 3, points: 1980 }
    ],
    activePlayers: [
      { name: "İlker Kaya", matches: 346, winRate: "%58" },
      { name: "trendyolkurye", matches: 269, winRate: "%52" },
      { name: "İsmail Ege Yıldız", matches: 192, winRate: "%60" },
      { name: "Özder Gültekin", matches: 175, winRate: "%75" },
      { name: "Gökhan Hulki Cevher", matches: 156, winRate: "%48" }
    ],
    highestWinRates: [
      { name: "IM Bahadır Özen", rate: "%100", matches: 12 },
      { name: "Batuhan Çil", rate: "%100", matches: 10 },
      { name: "FM Ari Kiremitciyan", rate: "%100", matches: 15 },
      { name: "FM Emirhan Tarlabaşı", rate: "%95", matches: 40 },
      { name: "Erkin Tahaoğlu", rate: "%93", matches: 28 }
    ],
    winStreaks: [
      { name: "Arda Arsun", streak: 23 },
      { name: "FM Emirhan Tarlabaşı", streak: 17 },
      { name: "Beymurat", streak: 16 },
      { name: "Burak Sakallıoğlu", streak: 16 },
      { name: "Bora Özgen", streak: 15 }
    ]
  },
  tournaments: [
    { id: 114, title: "114. Tilda Cafe Satranç Buluşması", date: "08.08.2026", time: "15:00", location: "Ümraniye Tilda Cafe", fee: "300 TL", champion: "Bekleniyor...", status: "active" },
    { id: 113, title: "113. Cafe Satranç 10+5 Rapid", date: "06.08.2026", champion: "Özder Gültekin", players: 36, status: "completed" },
    { id: 112, title: "112. Cafe Satranç 15+3 Blitz", date: "03.08.2026", champion: "Altay Kılıç", players: 34, status: "completed" },
    { id: 111, title: "111. Cafe Satranç 5+3 Blitz", date: "01.08.2026", champion: "Canberk İnan", players: 44, status: "completed" },
    { id: 110, title: "110. Cafe Satranç 5+3 Blitz", date: "28.07.2026", champion: "Fatih Alaybeyoğlu", players: 36, status: "completed" }
  ],
  registrations: [
    { name: "Özder Gültekin", chessUsername: "ozder_chess", phone: "05555555555", elo: "2100", registrationDate: "2026-08-06T12:00:00Z" }
  ]
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
    db.stats.registeredPlayers += 1;
    writeDB(db);
    return db.registrations;
  }
};
