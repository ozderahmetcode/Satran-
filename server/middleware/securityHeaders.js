const helmet = require('helmet');

/**
 * Katı Güvenlik Başlıkları (HTTP Security Headers) Middleware
 * HSTS, CSP, X-Frame-Options (SAMEORIGIN), X-Content-Type-Options, Referrer-Policy
 */

const helmetConfig = helmet({
  // 1. Content Security Policy (CSP)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [
        "'self'",
        "https://ozdersatranc.onrender.com",
        "https://ozdersatranc.web.app",
        "https://satranc-b83d1.web.app"
      ],
      scriptSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'",
        "https://ozdersatranc.onrender.com",
        "https://ozdersatranc.web.app",
        "https://satranc-b83d1.web.app"
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  // 2. X-Content-Type-Options: nosniff
  xContentTypeOptions: true,

  // 3. X-Frame-Options: SAMEORIGIN
  xFrameOptions: { action: 'sameorigin' },

  // 4. Referrer-Policy: strict-origin-when-cross-origin
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // 5. Strict-Transport-Security (HSTS): max-age=31536000; includeSubDomains
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },

  crossOriginEmbedderPolicy: false
});

/**
 * Ek başlıkları garanti altına alan güvenlik middleware'i
 */
function securityHeadersMiddleware(req, res, next) {
  helmetConfig(req, res, () => {
    // Katı HTTP Başlıklarını doğrudan ayarla
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
}

module.exports = {
  securityHeadersMiddleware
};
