/**
 * Brute-Force ve Hız Sınırlama (Rate Limiting) Servisi
 * IP ve Kullanıcı Bazlı Kilitlenme Mekanizması (5 Hatalı Deneme -> 15 Dakika Engel)
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 dakika
const WINDOW_DURATION = 15 * 60 * 1000; // 15 dakika

// IP ve Kullanıcı bazlı deneme takip haritaları
const ipFailures = new Map(); // ip => { count, lockedUntil, windowStart }
const userFailures = new Map(); // identifier => { count, lockedUntil, windowStart }
const generalLimits = new Map(); // ip => { count, windowStart }

// Periyodik olarak süresi dolan kayıtları temizle (10 dakikada bir)
const rateCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of ipFailures.entries()) {
    if (now > data.lockedUntil && (now - data.windowStart > WINDOW_DURATION)) {
      ipFailures.delete(key);
    }
  }
  for (const [key, data] of userFailures.entries()) {
    if (now > data.lockedUntil && (now - data.windowStart > WINDOW_DURATION)) {
      userFailures.delete(key);
    }
  }
  for (const [key, data] of generalLimits.entries()) {
    if (now - data.windowStart > 60 * 1000) {
      generalLimits.delete(key);
    }
  }
}, 10 * 60 * 1000);
if (rateCleanupTimer.unref) rateCleanupTimer.unref();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim().replace(/^::ffff:/, '');
  }
  return (req.ip || req.socket?.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
}

/**
 * Genel API İstek Limiti (IP başına dakikada maksimum 150 istek)
 */
function generalApiRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();

  let record = generalLimits.get(ip);
  if (!record || now - record.windowStart > 60 * 1000) {
    generalLimits.set(ip, { count: 1, windowStart: now });
    return next();
  }

  record.count++;
  if (record.count > 150) {
    const waitSeconds = Math.ceil((60 * 1000 - (now - record.windowStart)) / 1000);
    res.setHeader('Retry-After', waitSeconds);
    return res.status(429).json({
      error: "Hız Sınırı Aşıldı: Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: waitSeconds
    });
  }

  next();
}

/**
 * Giriş / Kimlik Doğrulama Kilit Kontrolü Middleware
 * İstek işlenmeden önce IP veya kullanıcının kilitli olup olmadığını denetler
 */
function authBruteForceCheck(req, res, next) {
  const ip = getClientIp(req);
  const identifier = (req.body?.identifier || req.body?.email || req.body?.username || '').trim().toLowerCase();
  const now = Date.now();

  // 1. IP Kilidi Kontrolü
  const ipData = ipFailures.get(ip);
  if (ipData && ipData.lockedUntil && now < ipData.lockedUntil) {
    const remainingSeconds = Math.ceil((ipData.lockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    res.setHeader('Retry-After', remainingSeconds);
    return res.status(429).json({
      error: `Güvenlik Uyarısı (Brute-Force Koruması): Çok sayıda hatalı deneme nedeniyle IP adresiniz geçici olarak engellenmiştir. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`,
      code: "IP_BLOCKED_BRUTE_FORCE",
      retryAfter: remainingSeconds
    });
  }

  // 2. Kullanıcı/Hesap Kilidi Kontrolü
  if (identifier) {
    const userData = userFailures.get(identifier);
    if (userData && userData.lockedUntil && now < userData.lockedUntil) {
      const remainingSeconds = Math.ceil((userData.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      res.setHeader('Retry-After', remainingSeconds);
      return res.status(429).json({
        error: `Güvenlik Uyarısı: Bu hesap art arda gelen hatalı denemeler sebebiyle koruma altına alınmıştır. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`,
        code: "ACCOUNT_LOCKED_BRUTE_FORCE",
        retryAfter: remainingSeconds
      });
    }
  }

  next();
}

/**
 * Hatalı giriş denemesini kaydeder
 */
function recordFailedAuth(req, identifier = '') {
  const ip = getClientIp(req);
  const cleanId = (identifier || '').trim().toLowerCase();
  const now = Date.now();

  // 1. IP Kaydını Güncelle
  let ipData = ipFailures.get(ip);
  if (!ipData || now - ipData.windowStart > WINDOW_DURATION) {
    ipData = { count: 1, lockedUntil: 0, windowStart: now };
  } else {
    ipData.count++;
  }

  if (ipData.count >= MAX_FAILED_ATTEMPTS) {
    ipData.lockedUntil = now + LOCKOUT_DURATION;
    console.warn(`[BRUTE-FORCE BLOKAJI] ${ip} IP adresi 5 hatalı deneme sonrası 15 dakika kilitlendi!`);
  }
  ipFailures.set(ip, ipData);

  // 2. Kullanıcı Kaydını Güncelle
  if (cleanId) {
    let userData = userFailures.get(cleanId);
    if (!userData || now - userData.windowStart > WINDOW_DURATION) {
      userData = { count: 1, lockedUntil: 0, windowStart: now };
    } else {
      userData.count++;
    }

    if (userData.count >= MAX_FAILED_ATTEMPTS) {
      userData.lockedUntil = now + LOCKOUT_DURATION;
      console.warn(`[BRUTE-FORCE BLOKAJI] '${cleanId}' hesabı 5 hatalı deneme sonrası 15 dakika kilitlendi!`);
    }
    userFailures.set(cleanId, userData);
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - ipData.count);
  return {
    isLocked: ipData.count >= MAX_FAILED_ATTEMPTS,
    remainingAttempts,
    lockoutDurationMinutes: Math.round(LOCKOUT_DURATION / (60 * 1000))
  };
}

/**
 * Başarılı giriş sonrası sayaçları sıfırlar
 */
function recordSuccessfulAuth(req, identifier = '') {
  const ip = getClientIp(req);
  const cleanId = (identifier || '').trim().toLowerCase();

  ipFailures.delete(ip);
  if (cleanId) {
    userFailures.delete(cleanId);
  }
}

module.exports = {
  generalApiRateLimiter,
  authBruteForceCheck,
  recordFailedAuth,
  recordSuccessfulAuth,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION
};
