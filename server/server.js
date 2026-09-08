require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const db = require('./database');
const multer = require('multer');

// Uploads dizinini oluştur
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Statik yükleme klasörü
app.use('/uploads', express.static(uploadsDir));

// Canlı / Aktif Kullanıcı Takibi (Son 35 saniye içinde sinyal gönderenler)
// activeSessions Map: key => { lastSeen, firstSeen, userId, name, page, durationSeconds }
const activeSessions = new Map();

// Kullanıcı sinyal (heartbeat/ping) ve analitik kayıt ucu
app.post('/api/heartbeat', (req, res) => {
  try {
    const { clientId, userId, name, page, deltaSeconds = 0, isNewSession = false } = req.body;
    const now = Date.now();
    const key = clientId || (userId ? `user_${userId}` : req.ip);

    let session = activeSessions.get(key);
    let sessionIsNew = isNewSession;

    if (!session || (now - session.lastSeen > 5 * 60 * 1000)) { // 5 dakikadan uzun kopukluk yeni oturum sayılır
      sessionIsNew = true;
      session = {
        firstSeen: now,
        lastSeen: now,
        userId: userId || null,
        name: name || 'Ziyaretçi',
        page: page || 'Ana Sayfa',
        durationSeconds: 0
      };
    } else {
      const addedSec = Math.max(0, Math.min(60, Math.round(Number(deltaSeconds) || 0)));
      session.lastSeen = now;
      session.durationSeconds = (session.durationSeconds || 0) + addedSec;
      session.page = page || session.page;
      if (userId) session.userId = userId;
      if (name && name !== 'Ziyaretçi') session.name = name;
    }
    activeSessions.set(key, session);

    // Veritabanına analitik ve süre bilgilerini kaydet
    const result = db.recordHeartbeatAndAnalytics({
      clientId: key,
      userId: userId || session.userId,
      name: session.name,
      page: session.page,
      deltaSeconds,
      isNewSession: sessionIsNew,
      isAdmin: Boolean(req.body.isAdmin)
    });

    res.json({ 
      success: true, 
      sessionSeconds: session.durationSeconds,
      userTimeSpent: result.updatedUser ? result.updatedUser.totalTimeSpentSeconds : undefined
    });
  } catch (error) {
    res.status(500).json({ error: "Heartbeat error" });
  }
});

function getActiveUsersCount() {
  const now = Date.now();
  const threshold = 35 * 1000; // 35 saniye
  let count = 0;
  const activeList = [];

  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastSeen < threshold) {
      count++;
      // Oturum süresini hesapla
      const currentSessionDuration = Math.round((now - session.firstSeen) / 1000);
      activeList.push({
        ...session,
        sessionSeconds: Math.max(session.durationSeconds || 0, currentSessionDuration)
      });
    } else if (now - session.lastSeen > 10 * 60 * 1000) {
      // 10 dakikadır yanıt vermeyen eski oturumları temizle
      activeSessions.delete(key);
    }
  }

  return {
    count: Math.max(1, count),
    activeList
  };
}

// Nodemailer SMTP Yapılandırması
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

// API Rotaları
app.get('/api/data', (req, res) => {
  try {
    const data = db.getData();
    const { count: activeCount, activeList } = getActiveUsersCount();
    res.json({
      ...data,
      activeUsersCount: activeCount,
      activeUsersList: activeList
    });
  } catch (error) {
    res.status(500).json({ error: "Veriler alınırken bir hata oluştu." });
  }
});

// Mesaj Rotaları
app.post('/api/messages', (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Tüm alanlar zorunludur." });
    }
    const messages = db.saveMessage({ name, email, message });
    res.status(201).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: "Mesaj gönderilirken hata oluştu." });
  }
});

app.delete('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const messages = db.deleteMessage(id);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: "Mesaj silinirken hata oluştu." });
  }
});

// Kimlik Doğrulama API Rotaları (E-Posta veya Kullanıcı Adı ile Giriş)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password, phone, chessPlatform, chessUsername, elo } = req.body;
    if (!name || !username || !email || !password || !phone) {
      return res.status(400).json({ error: "Lütfen tüm zorunlu alanları (Ad Soyad, Kullanıcı Adı, E-posta, Telefon, Şifre) doldurun." });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return res.status(400).json({ error: "Telefon numarası formatı geçersizdir." });
    }

    const result = db.registerUser({ 
      name, 
      username, 
      email, 
      password, 
      phone: cleanPhone, 
      chessPlatform: chessPlatform || 'chess.com',
      chessUsername: chessUsername || '', 
      elo 
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ 
      success: true, 
      message: "Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.", 
      user: result.user
    });
  } catch (error) {
    res.status(500).json({ error: "Kayıt sırasında bir hata oluştu." });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const { email, code } = req.body;
    const result = db.verifyUser(email, code);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Doğrulama sırasında bir hata oluştu." });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;
    if (!loginId || !password) {
      return res.status(400).json({ error: "Lütfen kullanıcı adı / e-posta ve şifrenizi girin." });
    }
    const result = db.loginUser(loginId, password);
    if (result.error) {
      return res.status(400).json({ error: result.error, requiresVerification: result.requiresVerification });
    }
    res.json({ success: true, user: result.user });
  } catch (error) {
    res.status(500).json({ error: "Giriş yapılırken bir hata oluştu." });
  }
});

// Profil ve Kullanıcı Ayarları
app.post('/api/users/:id/profile', upload.single('avatarFile'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, chessPlatform, chessUsername, bio, matchmakingSettings } = req.body;
    
    let avatarUrl = req.body.avatarUrl; // Keep existing if not changed
    if (req.file) {
      avatarUrl = '/uploads/' + req.file.filename;
    }
    
    let parsedSettings = undefined;
    if (matchmakingSettings) {
      parsedSettings = JSON.parse(matchmakingSettings);
    }
    
    const result = db.updateUserProfile(id, { 
      name, 
      email, 
      phone, 
      chessPlatform,
      chessUsername, 
      bio, 
      avatar: avatarUrl, 
      matchmakingSettings: parsedSettings 
    });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, user: result.user });
  } catch (error) {
    res.status(500).json({ error: "Profil güncellenirken hata oluştu." });
  }
});

// Şifre Değiştirme Rotası
app.post('/api/users/:id/change-password', (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Mevcut şifre ve yeni şifre alanları zorunludur." });
    }
    const result = db.changePassword(id, currentPassword, newPassword);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: "Şifreniz başarıyla değiştirildi." });
  } catch (error) {
    res.status(500).json({ error: "Şifre değiştirilirken bir hata oluştu." });
  }
});

// Admin: Kullanıcı Düzenleme
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, chessUsername, elo, verified } = req.body;
    const result = db.adminUpdateUser(id, { name, email, phone, chessUsername, elo, verified });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, users: result.users });
  } catch (error) {
    res.status(500).json({ error: "Kullanıcı güncellenirken hata oluştu." });
  }
});

// Admin: Kullanıcıyı Tamamen Silme
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.deleteUser(id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, users: result.users, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Kullanıcı silinirken hata oluştu." });
  }
});

// Turnuvaya Özel Kayıt Rotaları
app.post('/api/register', (req, res) => {
  try {
    const { tournamentId, userId, name, chessUsername } = req.body;
    if (!tournamentId || !userId || !name) {
      return res.status(400).json({ error: "Turnuva ID, Kullanıcı ID ve İsim zorunludur." });
    }

    const result = db.registerForTournament(tournamentId, userId, name, chessUsername || '');
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({ success: true, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Turnuvaya kayıt sırasında hata oluştu." });
  }
});

app.delete('/api/register/:tournamentId/:userId', (req, res) => {
  try {
    const { tournamentId, userId } = req.params;
    const result = db.cancelTournamentRegistration(tournamentId, userId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Kayıt iptal edilirken hata oluştu." });
  }
});

// Cafe Manuel Misafir Oyuncu Ekleme
app.post('/api/tournaments/:id/guest', (req, res) => {
  try {
    const { id } = req.params;
    const { name, elo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Misafir oyuncu Adı Soyadı zorunludur." });
    }

    const result = db.registerGuestParticipant(id, name.trim(), elo);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({ success: true, users: result.users, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Misafir eklenirken hata oluştu." });
  }
});

app.post('/api/tournaments', (req, res) => {
  try {
    const { title, date, time, location, fee, maxQuota, totalRounds } = req.body;

    if (!title || !date || !time || !location || !maxQuota) {
      return res.status(400).json({ error: "Lütfen zorunlu alanları doldurun." });
    }

    const tournaments = db.createTournament({ title, date, time, location, fee: fee || "Ücretsiz", maxQuota: parseInt(maxQuota), totalRounds: totalRounds || 5 });
    res.status(201).json({ success: true, tournaments });
  } catch (error) {
    res.status(500).json({ error: "Turnuva oluşturulurken hata oluştu." });
  }
});

// Turnuva Güncelleme / Düzenleme
app.put('/api/tournaments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, time, location, fee, maxQuota, totalRounds, status } = req.body;

    const result = db.updateTournament(id, {
      title,
      date,
      time,
      location,
      fee,
      maxQuota,
      totalRounds,
      status
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments });
  } catch (error) {
    res.status(500).json({ error: "Turnuva güncellenirken hata oluştu." });
  }
});

// Turnuva İptal Etme
app.post('/api/tournaments/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.cancelTournament(id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments });
  } catch (error) {
    res.status(500).json({ error: "Turnuva iptal edilirken hata oluştu." });
  }
});

// Turnuva Tamamen Silme
app.delete('/api/tournaments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.deleteTournament(id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Turnuva silinirken hata oluştu." });
  }
});

// Eşleştirme ve Tur Sonuç API Rotaları
app.post('/api/tournaments/:id/pairings', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.generateNextRound(id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments });
  } catch (error) {
    res.status(500).json({ error: "Eşleştirme oluşturulurken hata oluştu." });
  }
});

app.post('/api/tournaments/:id/rounds/:round/results', (req, res) => {
  try {
    const { id, round } = req.params;
    const { results } = req.body;
    const result = db.submitRoundResults(id, round, results);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments, users: result.users });
  } catch (error) {
    res.status(500).json({ error: "Sonuçlar girilirken hata oluştu." });
  }
});

// =================== RAKİP BULMA / OYUN İSTEĞİ, MESAJLAŞMA & SPAM ROTALARI ===================
// Oyun İsteği Gönderme
app.post('/api/match-requests', (req, res) => {
  try {
    const { fromUser, toUserId, message } = req.body;
    if (!fromUser || !fromUser.id || !toUserId) {
      return res.status(400).json({ error: "Gönderen kullanıcı ve hedef oyuncu bilgisi zorunludur." });
    }
    const result = db.sendMatchRequest(fromUser, toUserId, message);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "İstek gönderilirken hata oluştu." });
  }
});

// Oyun İsteğine Cevap Verme (accept, reject, cancel)
app.put('/api/match-requests/:id/respond', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, action } = req.body;
    if (!userId || !action) {
      return res.status(400).json({ error: "Kullanıcı ID ve işlem (action) belirtilmelidir." });
    }
    const result = db.respondMatchRequest(userId, id, action);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "İstek yanıtlanırken hata oluştu." });
  }
});

// Mesaj Gönderme
app.post('/api/direct-messages', (req, res) => {
  try {
    const { senderId, receiverId, text, senderName, receiverName } = req.body;
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: "Gönderen, alıcı ve mesaj metni zorunludur." });
    }
    const result = db.sendDirectMessage(senderId, receiverId, text, senderName, receiverName);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Mesaj iletilirken hata oluştu." });
  }
});

// Kullanıcıyı Engelle / Engeli Kaldır
app.post('/api/users/:targetUserId/toggle-block', (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { currentUserId } = req.body;
    if (!currentUserId) {
      return res.status(400).json({ error: "Kullanıcı kimliği zorunludur." });
    }
    const result = db.blockUserToggle(currentUserId, targetUserId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Engelleme işlemi sırasında hata oluştu." });
  }
});

// Spam & Uygunsuzluk Bildirimi
app.post('/api/spam-reports', (req, res) => {
  try {
    const { reporterUser, targetUserId, reason, details } = req.body;
    if (!reporterUser || !targetUserId) {
      return res.status(400).json({ error: "Bildiren ve şikayet edilen kullanıcı bilgisi zorunludur." });
    }
    const result = db.reportSpam(reporterUser, targetUserId, reason, details);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Şikayet iletilirken hata oluştu." });
  }
});

// Admin: Spam Raporunu Çözüldü Olarak İşaretle
app.put('/api/spam-reports/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.resolveSpamReport(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Rapor güncellenirken hata oluştu." });
  }
});

// React Build Statik Dosyalarını Sunma
app.use(express.static(path.join(__dirname, '../dist')));

// Tüm istekleri React Router'a yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} portunda aktif.`);
});
