import DOMPurify from 'dompurify';

/**
 * Kullanıcı kaynaklı girdileri güvenli metne dönüştürür (HTML tag ve zararlı scriptleri temizler)
 * @param {string} dirty 
 * @returns {string}
 */
export function sanitizeText(dirty) {
  if (dirty === null || dirty === undefined) return '';
  const str = String(dirty);
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // Tüm HTML taglerini sil
    ALLOWED_ATTR: []
  }).trim();
}

/**
 * Zengin metin (Rich Text) render edilmesi gereken alanlar için güvenli sanitize fonksiyonu
 * @param {string} dirtyHtml 
 * @returns {string}
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(String(dirtyHtml), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });
}

/**
 * URL'leri doğrular ve javascript:, data:, vbscript: gibi tehlikeli şemaları engeller
 * @param {string} rawUrl 
 * @param {string} fallback 
 * @returns {string}
 */
export function sanitizeUrl(rawUrl, fallback = '#') {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const clean = rawUrl.trim();
  
  // javascript:, data:, vbscript: gibi tehlikeli pseudo protokolleri engelle
  const dangerousProtocols = /^(javascript|data|vbscript):/i;
  if (dangerousProtocols.test(clean)) {
    console.warn('[Güvenlik Uyarısı] Tehlikeli URL protokolü engellendi:', clean);
    return fallback;
  }
  
  // Yalnızca http, https, mailto veya güvenli göreli yollara izin ver
  const safeProtocols = /^(https?:\/\/|mailto:|\/)/i;
  if (!safeProtocols.test(clean)) {
    return fallback;
  }

  return clean;
}

/**
 * Satranç kullanıcı adlarını güvenli karakter kümesiyle sınırlar
 * @param {string} username 
 * @returns {string}
 */
export function sanitizeChessUsername(username) {
  if (!username) return '';
  const clean = String(username).trim();
  // Sadece alfanümerik, tire, alt çizgi ve nokta izinli
  if (!/^[a-zA-Z0-9_.-]{1,35}$/.test(clean)) {
    return encodeURIComponent(clean);
  }
  return clean;
}
