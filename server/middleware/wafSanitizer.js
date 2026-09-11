/**
 * WAF (Web Application Firewall) Seviyesi Girdi Dezenfeksiyonu ve Tehdit Engelleme
 * SQL Injection, XSS, Path Traversal ve Zararlı Yük Taraması
 */
const db = require('../database');

// SQL Injection Kalıpları (Tautology, Union, Stacked Queries, Veritabanı Fonksiyonları, Yorum Satırları)
const SQLI_PATTERNS = [
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  /\bSELECT\b.+\bFROM\b/i,
  /\bINSERT\s+INTO\b.+\bVALUES\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bDROP\s+(TABLE|DATABASE|VIEW|PROCEDURE)\b/i,
  /\bALTER\s+(TABLE|DATABASE)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\bEXEC(UTE)?\s*\(?/i,
  /\b(OR|AND)\s+['"]?(\d+|[a-zA-Z0-9_]+)['"]?\s*=\s*['"]?\2/i, // '1'='1' or 'a'='a'
  /\b(OR|AND)\s+1\s*=\s*1\b/i,
  /\b(OR|AND)\s+true\b/i,
  /\bWAITFOR\s+DELAY\b/i,
  /\b(SLEEP|BENCHMARK|LOAD_FILE|HEX|CHAR)\s*\(/i,
  /\b--[\s\r\n]+/, // SQL comment --
  /\/\*[\s\S]*?\*\// // SQL block comment /* ... */
];

// XSS (Cross-Site Scripting) Kalıpları
const XSS_PATTERNS = [
  /<\s*(script|iframe|object|embed|applet|meta|link|base|style|frameset|xml)\b[^>]*>/i,
  /<\s*\/\s*(script|iframe|object|embed|applet|meta|link|base|style|frameset|xml)\s*>/i,
  /\bon\w+\s*=\s*(['"]?)[^'"]*\1/i, // onerror=, onload=, onclick= vs.
  /(javascript|vbscript|data\s*:\s*text\/html)/i,
  /expression\s*\(/i, // CSS IE expression
  /behavior\s*:/i,
  /<[^>]+(src|href|data)\s*=\s*['"]?\s*javascript:/i
];

// Path Traversal Kalıpları
const PATH_TRAVERSAL_PATTERNS = [
  /(?:\.{2}[\/\\])+/
];

/**
 * Bir metin dizesinin zararlı kalıplar barındırıp barındırmadığını test eder
 * @param {string} value 
 * @returns {{ isThreat: boolean, type: string, pattern: string }}
 */
function detectThreat(value) {
  if (typeof value !== 'string') return { isThreat: false };

  // 1. SQL Injection Kontrolü
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(value)) {
      return { isThreat: true, type: 'SQL_INJECTION', pattern: pattern.toString() };
    }
  }

  // 2. XSS Kontrolü
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return { isThreat: true, type: 'XSS_ATTACK', pattern: pattern.toString() };
    }
  }

  // 3. Path Traversal Kontrolü
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      return { isThreat: true, type: 'PATH_TRAVERSAL', pattern: pattern.toString() };
    }
  }

  return { isThreat: false };
}

/**
 * Nesneleri ve dizileri özyinelemeli olarak kontrol eder ve temizler
 * @param {any} target 
 * @param {string} currentPath 
 * @returns {{ sanitized: any, violation: { key: string, type: string } | null }}
 */
function inspectAndSanitize(target, currentPath = '') {
  if (typeof target === 'string') {
    // Null byte ve tehlikeli kontrol karakterlerini temizle
    const cleanString = target.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    const threat = detectThreat(cleanString);
    if (threat.isThreat) {
      return {
        sanitized: cleanString,
        violation: { key: currentPath, type: threat.type, pattern: threat.pattern }
      };
    }
    return { sanitized: cleanString, violation: null };
  }

  if (Array.isArray(target)) {
    const sanitizedArray = [];
    for (let i = 0; i < target.length; i++) {
      const res = inspectAndSanitize(target[i], `${currentPath}[${i}]`);
      if (res.violation) return res;
      sanitizedArray.push(res.sanitized);
    }
    return { sanitized: sanitizedArray, violation: null };
  }

  if (target !== null && typeof target === 'object') {
    const sanitizedObj = {};
    for (const key of Object.keys(target)) {
      // Anahtar adında da zararlı karakter kontrolü
      const keyThreat = detectThreat(key);
      if (keyThreat.isThreat) {
        return {
          sanitized: target,
          violation: { key: `${currentPath}.${key}`, type: keyThreat.type }
        };
      }

      const res = inspectAndSanitize(target[key], currentPath ? `${currentPath}.${key}` : key);
      if (res.violation) return res;
      sanitizedObj[key] = res.sanitized;
    }
    return { sanitized: sanitizedObj, violation: null };
  }

  return { sanitized: target, violation: null };
}

/**
 * Express WAF Middleware
 * GET, POST, PUT, DELETE, PATCH isteklerinde gelen verileri inceler ve tehditleri engeller.
 */
function wafMiddleware(req, res, next) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Bilinmiyor';

  // 1. Query parametrelerini denetle
  if (req.query && Object.keys(req.query).length > 0) {
    const qResult = inspectAndSanitize(req.query, 'query');
    if (qResult.violation) {
      console.warn(`[WAF ENGELİ] ${clientIp} IP adresinden ${req.method} ${req.originalUrl} isteğinde ${qResult.violation.type} tespit edildi! Alan: ${qResult.violation.key}`);
      
      // Yönetici paneli için veritabanına kaydet
      db.recordSecurityLog({
        type: qResult.violation.type,
        severity: qResult.violation.type === 'SQL_INJECTION' ? 'CRITICAL' : 'HIGH',
        ip: clientIp,
        userAgent,
        method: req.method,
        path: req.originalUrl || req.url,
        details: `URL Sorgusunda (Query) ${qResult.violation.type} tespit edildi. Parametre: ${qResult.violation.key}`,
        threatPayload: qResult.violation.pattern || req.query[qResult.violation.key]
      });

      return res.status(400).json({
        error: "Güvenlik Engeli (WAF): İstek geçersiz veya potansiyel zararlı karakterler barındırıyor.",
        code: "WAF_BLOCKED",
        threatType: qResult.violation.type,
        field: qResult.violation.key
      });
    }
    req.query = qResult.sanitized;
  }

  // 2. URL Parametrelerini denetle
  if (req.params && Object.keys(req.params).length > 0) {
    const pResult = inspectAndSanitize(req.params, 'params');
    if (pResult.violation) {
      console.warn(`[WAF ENGELİ] ${clientIp} IP adresinden URL parametresinde ${pResult.violation.type} tespit edildi! Alan: ${pResult.violation.key}`);

      db.recordSecurityLog({
        type: pResult.violation.type,
        severity: pResult.violation.type === 'SQL_INJECTION' ? 'CRITICAL' : 'HIGH',
        ip: clientIp,
        userAgent,
        method: req.method,
        path: req.originalUrl || req.url,
        details: `URL Parametresinde ${pResult.violation.type} tespit edildi. Alan: ${pResult.violation.key}`,
        threatPayload: pResult.violation.pattern || req.params[pResult.violation.key]
      });

      return res.status(400).json({
        error: "Güvenlik Engeli (WAF): İstek parametresi geçersiz.",
        code: "WAF_BLOCKED",
        threatType: pResult.violation.type
      });
    }
    req.params = pResult.sanitized;
  }

  // 3. Body içeriğini denetle
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    // Veritabanı geri yükleme yedeği harici tüm body alanlarını sıkı WAF testine sok
    const isBackupRestore = req.path === '/api/admin/restore';
    if (!isBackupRestore) {
      const bResult = inspectAndSanitize(req.body, 'body');
      if (bResult.violation) {
        console.warn(`[WAF ENGELİ] ${clientIp} IP adresinden istek gövdesinde ${bResult.violation.type} tespit edildi! Alan: ${bResult.violation.key}`);

        db.recordSecurityLog({
          type: bResult.violation.type,
          severity: bResult.violation.type === 'SQL_INJECTION' ? 'CRITICAL' : 'HIGH',
          ip: clientIp,
          userAgent,
          method: req.method,
          path: req.originalUrl || req.url,
          details: `İstek Gövdesinde (Body) ${bResult.violation.type} tespit edildi. Alan: ${bResult.violation.key}`,
          threatPayload: bResult.violation.pattern || req.body[bResult.violation.key]
        });

        return res.status(400).json({
          error: "Güvenlik Engeli (WAF): Gönderilen veride güvenlik ihlali tespit edildi.",
          code: "WAF_BLOCKED",
          threatType: bResult.violation.type,
          field: bResult.violation.key
        });
      }
      req.body = bResult.sanitized;
    }
  }

  next();
}

module.exports = {
  wafMiddleware,
  detectThreat,
  inspectAndSanitize
};
