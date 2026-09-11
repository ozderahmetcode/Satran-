/**
 * Kurumsal Seviye Çıktı Kodlama (Output Encoding) Servisi
 * HTML, Attribute, JavaScript ve URL bağlamlarına duyarlı güvenli kodlama
 */

/**
 * HTML Gövdesi (Body) için karakterleri HTML entity'lerine dönüştürür
 * @param {string|any} str 
 * @returns {string}
 */
function encodeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * HTML Özellikleri (Attributes) için güvenli kodlama (href, title, value vb.)
 * @param {string|any} str 
 * @returns {string}
 */
function encodeHtmlAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

/**
 * URL Parametreleri için güvenli URI kodlama
 * @param {string|any} str 
 * @returns {string}
 */
function encodeUriComponentSafe(str) {
  if (str === null || str === undefined) return '';
  try {
    return encodeURIComponent(String(str));
  } catch (e) {
    return '';
  }
}

/**
 * E-posta HTML şablonları için güvenli veri yerleştirici
 * @param {string} template 
 * @param {Object} data 
 * @returns {string}
 */
function renderEmailTemplate(template, data = {}) {
  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    const encodedValue = encodeHtml(value);
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, encodedValue);
  }
  return rendered;
}

module.exports = {
  encodeHtml,
  encodeHtmlAttr,
  encodeUriComponentSafe,
  renderEmailTemplate
};
