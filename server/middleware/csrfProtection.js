const crypto = require('crypto');
const db = require('../database');

/**
 * Katı CSRF (Cross-Site Request Forgery) Koruma Servisi
 * Double Submit Cookie + HMAC Kriptografik İmza Doğrulama
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'ozder_chess_csrf_secret_salt_2026_whmcs_sec';
const CSRF_COOKIE_NAME = 'ozder_csrf_token';

/**
 * Kriptografik olarak güvenli, imzalı CSRF token üretir
 * @param {string} [sessionId]
 * @returns {string} token
 */
function generateCsrfToken(sessionId = '') {
  const salt = crypto.randomBytes(24).toString('hex');
  const timestamp = Date.now().toString(36);
  const rawPayload = `${salt}:${timestamp}:${sessionId}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(rawPayload)
    .digest('hex');
  
  return `${rawPayload}.${signature}`;
}

/**
 * CSRF tokeninin imzasını ve geçerliliğini doğrular
 * @param {string} token 
 * @param {string} [expectedSessionId]
 * @returns {boolean}
 */
function verifyCsrfToken(token, expectedSessionId = null) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [rawPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(rawPayload)
    .digest('hex');

  // Zamanlama saldırılarına karşı güvenli karşılaştırma (timing-safe comparison)
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return false;
  }

  // Session id bağlamı kontrolü (varsa)
  if (expectedSessionId) {
    const payloadParts = rawPayload.split(':');
    if (payloadParts.length >= 3 && payloadParts[2] && payloadParts[2] !== expectedSessionId) {
      return false;
    }
  }

  return true;
}

/**
 * CSRF Token Alma Uç Noktası (GET /api/csrf-token)
 */
function handleGetCsrfToken(req, res) {
  const sessionId = req.cookies?.ozder_session || '';
  const token = generateCsrfToken(sessionId);

  // Cookie olarak ayarla
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend JavaScript (Double Submit) okuyabilmeli
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 saat geçerli
  });

  res.json({
    success: true,
    csrfToken: token
  });
}

/**
 * Express CSRF Doğrulama Middleware
 * POST, PUT, DELETE, PATCH isteklerinde token varlığını ve doğruluğunu zorunlu kılar.
 */
function csrfProtectionMiddleware(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // İstemciden gelen CSRF tokeni al (Header veya Body)
  const clientToken = 
    req.headers['x-csrf-token'] || 
    req.headers['csrf-token'] || 
    req.headers['x-xsrf-token'] ||
    req.body?._csrf;

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Bilinmiyor';
  const userAgent = req.headers['user-agent'] || 'Bilinmiyor';

  if (!clientToken) {
    console.warn(`[CSRF REDDİ] ${clientIp} - ${req.method} ${req.originalUrl} isteğinde CSRF token bulunamadı.`);

    db.recordSecurityLog({
      type: 'CSRF_EKSİK',
      severity: 'MEDIUM',
      ip: clientIp,
      userAgent,
      method: req.method,
      path: req.originalUrl || req.url,
      details: 'Durum değiştiren işlemde (POST/PUT/DELETE) zorunlu CSRF güvenlik tokeni bulunamadı.',
      threatPayload: 'EKSİK_TOKEN'
    });

    return res.status(403).json({
      error: "Erişim Engellendi (403 Forbidden): CSRF güvenlik belirteci eksik.",
      code: "CSRF_TOKEN_MISSING"
    });
  }

  // Cookie'deki token ile karşılaştır (Double Submit Cookie)
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const sessionId = req.cookies?.ozder_session || '';

  // 1. Kriptografik imza doğrulaması
  const isValidSignature = verifyCsrfToken(clientToken, sessionId);
  if (!isValidSignature) {
    console.warn(`[CSRF REDDİ] ${clientIp} - ${req.method} ${req.originalUrl} isteğinde geçersiz CSRF imzası tespit edildi.`);

    db.recordSecurityLog({
      type: 'CSRF_SAHTE_TOKEN',
      severity: 'HIGH',
      ip: clientIp,
      userAgent,
      method: req.method,
      path: req.originalUrl || req.url,
      details: 'Sahte veya kriptografik imzası bozulmuş/geçersiz CSRF tokeni tespit edildi.',
      threatPayload: String(clientToken).substring(0, 100)
    });

    return res.status(403).json({
      error: "Erişim Engellendi (403 Forbidden): CSRF güvenlik belirteci doğrulanamadı veya sahte.",
      code: "CSRF_TOKEN_INVALID"
    });
  }

  // 2. Eğer cookie token mevcutsa birebir eşleşme şartı
  if (cookieToken && cookieToken !== clientToken) {
    console.warn(`[CSRF REDDİ] ${clientIp} - Cookie token ile header token eşleşmedi.`);

    db.recordSecurityLog({
      type: 'CSRF_UYUŞMAZLIK',
      severity: 'HIGH',
      ip: clientIp,
      userAgent,
      method: req.method,
      path: req.originalUrl || req.url,
      details: 'Double-submit çerez tokeni ile HTTP başlığındaki token uyuşmuyor.',
      threatPayload: `Header: ${String(clientToken).substring(0, 30)}... | Cookie: ${String(cookieToken).substring(0, 30)}...`
    });

    return res.status(403).json({
      error: "Erişim Engellendi (403 Forbidden): CSRF belirteci çerez ile uyuşmuyor.",
      code: "CSRF_TOKEN_MISMATCH"
    });
  }

  next();
}

module.exports = {
  generateCsrfToken,
  verifyCsrfToken,
  handleGetCsrfToken,
  csrfProtectionMiddleware,
  CSRF_COOKIE_NAME
};
