require('dotenv').config();
const dns = require('dns');

// Docker / Render / Linux ortamlarında IPv6 siyah delik zaman aşımlarını engelle
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const db = require('./database');
const emailService = require('./emailService');
const multer = require('multer');

// Güvenlik Middleware ve Servisleri (WHMCS / Kurumsal Seviye)
const { securityHeadersMiddleware } = require('./middleware/securityHeaders');
const { wafMiddleware } = require('./middleware/wafSanitizer');
const { csrfProtectionMiddleware, handleGetCsrfToken } = require('./middleware/csrfProtection');
const { 
  sessionMiddleware, 
  createSession, 
  regenerateSession, 
  destroySession, 
  requireAuth, 
  requireAdmin,
  getClientIp 
} = require('./middleware/sessionManager');
const { 
  generalApiRateLimiter, 
  authBruteForceCheck, 
  recordFailedAuth, 
  recordSuccessfulAuth,
  unblockIp,
  getBlockedIps 
} = require('./middleware/rateLimiter');
const { encodeHtml, encodeHtmlAttr } = require('./middleware/encoder');

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

// 1. Katı Güvenlik Başlıkları (HSTS, CSP, X-Frame-Options: SAMEORIGIN, nosniff, Referrer-Policy)
app.use(securityHeadersMiddleware);

// 2. Çerez Ayrıştırıcı (Cookie-Parser)
app.use(cookieParser());

// 3. CORS Yapılandırması (Cross-Origin Resource Sharing)
app.use(cors({
  origin: [
    'https://ozdersatranc.web.app',
    'https://satranc-b83d1.web.app',
    'https://ozdersatranc.onrender.com',
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true
}));

// 4. İstek Gövdesi Ayrıştırıcıları
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 5. Genel Hız Sınırlama (Rate Limiting - DDoS ve DoS koruması)
app.use(generalApiRateLimiter);

// 6. WAF Seviyesi Girdi Dezenfeksiyonu ve Tehdit Engelleme (SQLi, XSS, Path Traversal)
app.use(wafMiddleware);

// 7. WHMCS Seviye Oturum Doğrulama ve Hijacking Koruması
app.use(sessionMiddleware);

// 8. Güvenli Yönlendirme (Open-Redirect Engeli)
app.use((req, res, next) => {
  const originalRedirect = res.redirect.bind(res);
  res.safeRedirect = function (targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') return originalRedirect('/');
    const trimmed = targetUrl.trim();
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
      console.warn('[Güvenlik Engeli] Zararlı şema yönlendirmesi engellendi:', trimmed);
      return originalRedirect('/');
    }
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return originalRedirect(trimmed);
    }
    try {
      const parsed = new URL(trimmed);
      const safeOrigins = ['ozdersatranc.web.app', 'satranc-b83d1.web.app', 'ozdersatranc.onrender.com', 'localhost'];
      if (safeOrigins.includes(parsed.hostname)) {
        return originalRedirect(trimmed);
      }
    } catch (e) {}
    console.warn('[Güvenlik Engeli] Yetkisiz harici open-redirect engellendi:', trimmed);
    return originalRedirect('/');
  };

  next();
});

// 9. CSRF Belirteci Alma Uç Noktası (Durum değiştirmeyen GET isteği)
app.get('/api/csrf-token', handleGetCsrfToken);

// 10. Katı CSRF Koruması (POST, PUT, DELETE, PATCH isteklerinde Double Submit & HMAC doğrulaması)
app.use(csrfProtectionMiddleware);

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

// Render.com Uyanık Tutma ve Sağlık Kontrol Uç Noktası
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OZDER Satranc Toplulugu API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    storage: {
      dataDir: db.getDataDir ? db.getDataDir() : 'default',
      hasPersistentDisk: db.hasPersistentDisk ? db.hasPersistentDisk() : false
    },
    email: {
      configured: emailService.isSmtpConfigured()
    }
  });
});

// SMTP Bağlantı Teşhis Uç Noktası
app.get('/api/health/smtp', async (req, res) => {
  try {
    const diagnostic = await emailService.testSmtpConnection();
    res.json(diagnostic);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
app.post('/api/auth/register', authBruteForceCheck, async (req, res) => {
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

    // Başarılı kayıt: Denemeleri sıfırla ve güvenli oturum oluştur
    recordSuccessfulAuth(req, username);
    const session = createSession(res, result.user, req, 'user');

    res.status(201).json({ 
      success: true, 
      message: "Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.", 
      user: result.user,
      sessionId: session.id
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

// Standart Kullanıcı Girişi (Brute-Force & Session Hardening Korumalı)
app.post('/api/auth/login', authBruteForceCheck, (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;
    if (!loginId || !password) {
      return res.status(400).json({ error: "Lütfen kullanıcı adı / e-posta ve şifrenizi girin." });
    }
    const result = db.loginUser(loginId, password);
    if (result.error) {
      const failInfo = recordFailedAuth(req, loginId);
      let errorMsg = result.error;
      if (failInfo.isLocked) {
        errorMsg = `Güvenlik Uyarısı (Brute-Force): 5 hatalı deneme sebebiyle IP/hesap ${failInfo.lockoutDurationMinutes} dakika süreyle engellenmiştir.`;
      } else if (failInfo.remainingAttempts <= 3) {
        errorMsg += ` (Kalan deneme hakkı: ${failInfo.remainingAttempts})`;
      }
      return res.status(400).json({ 
        error: errorMsg, 
        requiresVerification: result.requiresVerification,
        remainingAttempts: failInfo.remainingAttempts,
        isLocked: failInfo.isLocked
      });
    }

    // Başarılı Giriş: Hatalı deneme sayaçlarını sıfırla
    recordSuccessfulAuth(req, loginId);

    // WHMCS Tipi Zırhlı Oturum (IP & User-Agent Binding + Session Fixation Koruması)
    const session = createSession(res, result.user, req, 'user');

    res.json({ 
      success: true, 
      user: result.user,
      sessionId: session.id
    });
  } catch (error) {
    res.status(500).json({ error: "Giriş yapılırken bir hata oluştu." });
  }
});

// Yönetici (Admin) Giriş Uç Noktası (Brute-Force & Session Hardening Korumalı)
app.post('/api/auth/admin-login', authBruteForceCheck, (req, res) => {
  try {
    const { username, password } = req.body;
    const inputUser = (username || '').trim().toLowerCase();
    const inputPass = (password || '').trim();

    const validAdminUsers = ['admin', 'ozder', 'ozderahmet'];
    const validAdminPass = ['Ozderahmet123.', 'Ozderahmet123', 'ozderahmet123.', 'ozderahmet123'];

    if (validAdminUsers.includes(inputUser) && validAdminPass.includes(inputPass)) {
      recordSuccessfulAuth(req, inputUser);
      const adminUser = {
        id: 'admin_' + inputUser,
        username: inputUser,
        name: 'Yönetici (' + inputUser + ')',
        role: 'admin',
        isAdmin: true
      };

      // Zırhlı Yönetici Oturumu Oluştur
      const session = createSession(res, adminUser, req, 'admin');

      return res.json({
        success: true,
        message: "Yönetici girişi başarıyla doğrulandı.",
        user: adminUser,
        sessionId: session.id
      });
    }

    const failInfo = recordFailedAuth(req, inputUser);
    let errorMsg = 'Hatalı yönetici kullanıcı adı veya şifre!';
    if (failInfo.isLocked) {
      errorMsg = `Güvenlik Uyarısı (Brute-Force): Çok fazla hatalı yönetici girişi denendi. IP adresiniz ${failInfo.lockoutDurationMinutes} dakika süreyle kilitlendi.`;
    } else if (failInfo.remainingAttempts <= 3) {
      errorMsg += ` (Kalan deneme hakkı: ${failInfo.remainingAttempts})`;
    }

    return res.status(400).json({
      error: errorMsg,
      remainingAttempts: failInfo.remainingAttempts,
      isLocked: failInfo.isLocked
    });
  } catch (error) {
    res.status(500).json({ error: "Yönetici girişi sırasında bir hata oluştu." });
  }
});

// Güvenli Çıkış (Oturumu ve Çerezleri Tamamen İmha Et)
app.post('/api/auth/logout', (req, res) => {
  destroySession(req, res);
  res.json({ success: true, message: "Oturum güvenle sonlandırıldı." });
});

// Şifremi Unuttum (Kurtarma Kodu Talebi - Gerçek E-Posta + Akıllı Fallback)
app.post('/api/auth/forgot-password', authBruteForceCheck, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: "Lütfen kayıtlı e-posta adresinizi veya kullanıcı adınızı girin." });
    }

    const result = db.createPasswordResetCode(identifier.trim());
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const { user, code } = result;

    // E-posta gönderim servisini tetikle
    const emailResult = await emailService.sendPasswordResetEmail(user.email, user.name, code);

    if (!emailResult.success) {
      console.warn('[Şifre Kurtarma Uyarısı] E-posta gönderilemedi:', emailResult.error);
      const errMsg = emailResult.code === 'PORT_BLOCKED_BY_HOST'
        ? 'Sunucu bulut güvenlik duvarı (Render.com) giden SMTP portlarını (465/587) engelliyor. E-posta için HTTPS destekli RESEND_API_KEY veya BREVO_API_KEY tanımlanmalıdır. Lütfen yönetici ile iletişime geçiniz.'
        : `E-posta gönderilemedi: ${emailResult.error || 'SMTP Hatası'}.`;

      return res.status(503).json({ 
        error: errMsg,
        code: emailResult.code || 'EMAIL_FAILED'
      });
    }

    // E-posta maskeleme (güvenlik ve gizlilik için, örn: a***n@gmail.com)
    let maskedEmail = user.email;
    if (user.email.includes('@')) {
      const [localPart, domain] = user.email.split('@');
      const maskedLocal = localPart.length <= 2 
        ? localPart[0] + '*' 
        : localPart[0] + '*'.repeat(Math.max(1, localPart.length - 2)) + localPart[localPart.length - 1];
      maskedEmail = `${maskedLocal}@${domain}`;
    }

    res.json({
      success: true,
      message: `6 haneli doğrulama kodu ${maskedEmail} adresinize gönderildi. Lütfen gelen kutunuzu (ve spam klasörünüzü) kontrol edin.`,
      maskedEmail
    });
  } catch (error) {
    console.error('[Şifremi Unuttum Hatası]:', error);
    res.status(500).json({ error: "Şifre kurtarma işlemi sırasında sunucu hatası oluştu." });
  }
});

// Yeni Şifre Belirleme (Kodu Doğrula ve Şifreyi Güncelle)
app.post('/api/auth/reset-password', authBruteForceCheck, (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;
    if (!identifier || !code || !newPassword) {
      return res.status(400).json({ error: "Lütfen tüm alanları (kullanıcı adı/e-posta, 6 haneli kod ve yeni şifre) doldurun." });
    }

    const result = db.verifyAndResetPassword(identifier, code, newPassword);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Başarılı sıfırlamada kilit/deneme sayaçlarını sıfırla
    recordSuccessfulAuth(req, identifier);

    res.json(result);
  } catch (error) {
    console.error('[Şifre Sıfırlama Hatası]:', error);
    res.status(500).json({ error: "Şifre güncellenirken sunucu hatası oluştu." });
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

// Şifre Değiştirme Rotası (Session Fixation Koruması ile Oturum Yenileme)
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

    // Session Fixation Koruması: Şifre değiştiğinde oturum kimliğini derhal yenile
    regenerateSession(req, res, { id });

    res.json({ success: true, message: "Şifreniz başarıyla değiştirildi ve oturum kimliğiniz güvenle yenilendi." });
  } catch (error) {
    res.status(500).json({ error: "Şifre değiştirilirken bir hata oluştu." });
  }
});

// Admin: Kullanıcı Düzenleme
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, chessPlatform, chessUsername, elo, verified } = req.body;
    const result = db.adminUpdateUser(id, { name, email, phone, chessPlatform, chessUsername, elo, verified });
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

// Admin: Veritabanı Tam Yedeğini İndir (JSON)
app.get('/api/admin/backup', (req, res) => {
  try {
    const data = db.backupDB();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ozdersatranc_yedek_${new Date().toISOString().split('T')[0]}.json`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Yedek oluşturulurken bir hata oluştu." });
  }
});

// Admin: Veritabanı Yedeğini Geri Yükle (JSON)
app.post('/api/admin/restore', (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: "Geçersiz veya boş yedek verisi." });
    }
    const result = db.restoreDB(backupData);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: "Veritabanı başarıyla geri yüklendi!", data: result.data });
  } catch (error) {
    res.status(500).json({ error: "Yedek geri yüklenirken sunucu hatası oluştu." });
  }
});

// ================= SİBER GÜVENLİK VE SALDIRI GÜNLÜĞÜ (WAF / IDS) APİ =================
// Güvenlik Günlüklerini ve Kilitli IP'leri Getir
app.get('/api/admin/security-logs', (req, res) => {
  try {
    const logs = db.getSecurityLogs();
    const blockedIps = getBlockedIps();

    // İstatistik özeti oluştur
    const byType = {};
    logs.forEach(l => {
      byType[l.type] = (byType[l.type] || 0) + 1;
    });

    res.json({
      success: true,
      logs,
      blockedIps,
      stats: {
        totalThreats: logs.length,
        blockedIpCount: blockedIps.length,
        byType,
        lastThreat: logs[0] || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Güvenlik kayıtları alınamadı." });
  }
});

// Güvenlik Günlüklerini Temizle
app.delete('/api/admin/security-logs', (req, res) => {
  try {
    const logs = db.clearSecurityLogs();
    res.json({ success: true, message: "Tüm güvenlik kayıtları temizlendi.", logs });
  } catch (error) {
    res.status(500).json({ error: "Kayıtlar temizlenirken hata oluştu." });
  }
});

// Tekil Güvenlik Kaydını Sil
app.delete('/api/admin/security-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const logs = db.deleteSecurityLog(id);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: "Kayıt silinirken hata oluştu." });
  }
});

// Kilitli Bir IP'nin Engelini Manuel Kaldır
app.post('/api/admin/unblock-ip', (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ error: "IP adresi belirtilmelidir." });
    }
    const unblocked = unblockIp(ip);
    const blockedIps = getBlockedIps();
    res.json({ 
      success: true, 
      message: unblocked ? `${ip} adresinin engeli kaldırıldı.` : `${ip} adresi kilitli listesinde bulunamadı.`, 
      blockedIps 
    });
  } catch (error) {
    res.status(500).json({ error: "IP engeli kaldırılırken hata oluştu." });
  }
});

// React Build Statik Dosyalarını Sunma
app.use(express.static(path.join(__dirname, '../dist')));

// Tüm istekleri React Router'a yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

function startKeepAliveWorker() {
  // Render.com free-tier 15 dakikalık hareketsizlikte uyku moduna geçer.
  // Her 9 dakikada bir otomatik GET /api/health isteği atarak servisi daima uyanık ve sıcak tutar.
  const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://ozdersatranc.onrender.com';
  const PING_INTERVAL = 9 * 60 * 1000; // 9 dakika (540 saniye)

  console.log(`[Render KeepAlive] Uyanık tutma servisi devrede. Hedef: ${targetUrl}/api/health (9 dakikalık döngü)`);

  setInterval(() => {
    try {
      const pingUrl = `${targetUrl.replace(/\/$/, '')}/api/health`;
      const client = pingUrl.startsWith('https') ? require('https') : require('http');
      client.get(pingUrl, (res) => {
        console.log(`[KeepAlive Ping] Sunucu uyanık tutuldu (${new Date().toLocaleTimeString('tr-TR')}) - Status: ${res.statusCode}`);
      }).on('error', (err) => {
        // Ağ gecikmesi veya başlangıç
      });
    } catch (e) {}
  }, PING_INTERVAL);
}

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} portunda aktif.`);
  startKeepAliveWorker();
});
