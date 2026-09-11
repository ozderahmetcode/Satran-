const crypto = require('crypto');
const db = require('../database');

/**
 * WHMCS Tipi Oturum ve Hesap Zırhlama (Session Hardening)
 * - Session Hijacking Koruması (IP ve User-Agent Binding)
 * - Session Fixation Koruması (Login/Yetki Yükseltmede Yeniden Üretim)
 * - Güvenli Çerez Standartları (HttpOnly, Secure, SameSite=Strict, Path=/)
 */

const SESSION_COOKIE_NAME = 'ozder_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 gün
const SESSION_IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 saat aktif olmama

// Bellek içi oturum deposu: sessionId => SessionObject
const sessionStore = new Map();

// Periyodik olarak eskiyen oturumları temizle (30 dakikada bir)
const sessionCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessionStore.entries()) {
    if (now - s.createdAt > SESSION_MAX_AGE || now - s.lastActivity > SESSION_IDLE_TIMEOUT) {
      sessionStore.delete(id);
    }
  }
}, 30 * 60 * 1000);
if (sessionCleanupTimer.unref) sessionCleanupTimer.unref();

/**
 * İstemci IP adresini güvenle tespit eder
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    return cleanIp(ip);
  }
  return cleanIp(req.ip || req.socket?.remoteAddress || '127.0.0.1');
}

function cleanIp(ip) {
  if (!ip) return '127.0.0.1';
  // IPv6 mapped IPv4 temizleme (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Mobil şebeke IP dalgalanmaları için IP bloğunu (Subnet) alır
 */
function getIpSubnet(ip) {
  if (ip.includes('.')) {
    // IPv4: İlk 3 oktet (/24)
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
  } else if (ip.includes(':')) {
    // IPv6: İlk 4 grup (/64)
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':');
  }
  return ip;
}

/**
 * User-Agent dizesinin SHA-256 özetini üretir
 */
function hashUserAgent(ua) {
  return crypto.createHash('sha256').update(String(ua || 'unknown_ua')).digest('hex');
}

/**
 * Çerez ayarları nesnesi
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE
  };
}

/**
 * Yeni güvenli oturum oluşturur (Session Fixation Koruması ile yeni ID)
 */
function createSession(res, user, req, role = 'user') {
  const clientIp = getClientIp(req);
  const subnet = getIpSubnet(clientIp);
  const uaHash = hashUserAgent(req.headers['user-agent']);

  // Varsa kullanıcının eski oturumlarını temizle
  for (const [id, s] of sessionStore.entries()) {
    if (s.userId === user.id && s.role === role) {
      sessionStore.delete(id);
    }
  }

  // Kriptografik rastgele Session ID üret
  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    id: sessionId,
    userId: user.id,
    username: user.username || user.name || '',
    email: user.email || '',
    role: role || (user.isAdmin ? 'admin' : 'user'),
    ip: clientIp,
    subnet: subnet,
    userAgentHash: uaHash,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  sessionStore.set(sessionId, sessionData);

  // HttpOnly, Secure, SameSite=Strict çerezi ayarla
  res.cookie(SESSION_COOKIE_NAME, sessionId, getCookieOptions());

  return sessionData;
}

/**
 * Oturumu yeniden üretir (Session Fixation Koruması - Şifre Değişimi veya Yetki Yükseltme)
 */
function regenerateSession(req, res, user, role = 'user') {
  const oldSessionId = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['x-session-id'];
  if (oldSessionId && sessionStore.has(oldSessionId)) {
    sessionStore.delete(oldSessionId);
  }
  return createSession(res, user, req, role);
}

/**
 * Oturumu sonlandırır
 */
function destroySession(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['x-session-id'];
  if (sessionId && sessionStore.has(sessionId)) {
    sessionStore.delete(sessionId);
  }
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

/**
 * Express Oturum Doğrulama ve Hijacking Koruması Middleware
 */
function sessionMiddleware(req, res, next) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['x-session-id'];

  if (!sessionId) {
    req.session = null;
    req.user = null;
    return next();
  }

  const session = sessionStore.get(sessionId);

  // Oturum bulunamadı veya süresi dolduysa
  if (!session) {
    req.session = null;
    req.user = null;
    res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
    return next();
  }

  const now = Date.now();
  if (now - session.createdAt > SESSION_MAX_AGE || now - session.lastActivity > SESSION_IDLE_TIMEOUT) {
    sessionStore.delete(sessionId);
    req.session = null;
    req.user = null;
    res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
    return next();
  }

  // ================= SESSION HIJACKING KONTROLÜ =================
  const currentIp = getClientIp(req);
  const currentSubnet = getIpSubnet(currentIp);
  const currentUaHash = hashUserAgent(req.headers['user-agent']);

  const ipMatches = (currentIp === session.ip) || (currentSubnet === session.subnet);
  const uaMatches = (currentUaHash === session.userAgentHash);

  if (!ipMatches || !uaMatches) {
    console.warn(`[GÜVENLİK ALARMI] Oturum Kaçırma (Session Hijacking) tespit edildi!`);
    console.warn(`Kullanıcı: ${session.userId} | Beklenen IP: ${session.ip}, Gelen IP: ${currentIp}`);
    console.warn(`Beklenen UA Hash: ${session.userAgentHash}, Gelen UA Hash: ${currentUaHash}`);

    // Yönetici paneline ayrıntılı hack/oturum kaçırma kaydı yaz
    db.recordSecurityLog({
      type: 'OTURUM_KAÇIRMA',
      severity: 'CRITICAL',
      ip: currentIp,
      userAgent: req.headers['user-agent'] || 'Bilinmiyor',
      method: req.method,
      path: req.originalUrl || req.url,
      details: `Oturum Kaçırma (Session Hijacking): Oturum sahibi IP (${session.ip}) ile gelen IP (${currentIp}) veya tarayıcı User-Agent bilgisi uyuşmadı. Oturum derhal sonlandırıldı.`,
      threatPayload: `Kullanıcı ID: ${session.userId} (${session.username}) | Beklenen IP: ${session.ip} | Beklenen UA: ${session.userAgentHash?.substring(0, 16)}... | Gelen UA: ${currentUaHash?.substring(0, 16)}...`
    });

    // Oturumu derhal imha et
    sessionStore.delete(sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());

    return res.status(401).json({
      error: "Güvenlik Engeli: Oturum Kaçırma (Session Hijacking) şüphesi nedeniyle oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.",
      code: "SESSION_HIJACK_DETECTED"
    });
  }

  // Oturum geçerli, son işlem zamanını güncelle
  session.lastActivity = now;
  req.session = session;
  req.user = {
    id: session.userId,
    username: session.username,
    email: session.email,
    role: session.role
  };

  next();
}

/**
 * Kimlik doğrulama zorunlu kılan koruma middleware
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.user) {
    return res.status(401).json({
      error: "Yetkisiz Erişim: Bu işlem için oturum açmanız gerekmektedir.",
      code: "AUTH_REQUIRED"
    });
  }
  next();
}

/**
 * Yönetici yetkisi zorunlu kılan koruma middleware
 */
function requireAdmin(req, res, next) {
  if (!req.session || req.user?.role !== 'admin') {
    return res.status(403).json({
      error: "Erişim Reddedildi: Yönetici yetkisi gereklidir.",
      code: "ADMIN_FORBIDDEN"
    });
  }
  next();
}

module.exports = {
  createSession,
  regenerateSession,
  destroySession,
  sessionMiddleware,
  requireAuth,
  requireAdmin,
  getClientIp,
  SESSION_COOKIE_NAME
};
