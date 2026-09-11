const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');
const https = require('https');
const { URL } = require('url');

// Docker / Render / Linux ortamında IPv6 siyah delik zaman aşımlarını engellemek için
// DNS çözümlemesini zorunlu IPv4 (IPv4-first) olarak ayarla.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * E-Posta Servisi (OZDER Satranç Topluluğu)
 * Hibrit Çoklu Katmanlı E-Posta Motoru:
 * 1. Brevo API (HTTPS Port 443 - Bulut Güvenlik Duvarı Tanımaz, Hem Gmail Hem Temp Mail'e Kesin Teslimat)
 * 2. Google Apps Script Webhook (HTTPS Port 443 - ozderahmetcode@gmail.com ile doğrudan teslimat)
 * 3. Resend API (HTTPS Port 443)
 * 4. Doğrudan Gmail SMTP (Port 465 SSL / Port 587 STARTTLS) - Yerel geliştirme ve açık portlar için
 */

function isSmtpConfigured() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  const hasBrevo = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim());
  const hasGoogleScript = Boolean(process.env.GMAIL_WEBHOOK_URL && process.env.GMAIL_WEBHOOK_URL.trim());
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  return Boolean(hasBrevo || hasGoogleScript || hasResend || (user && pass && user.length > 3 && pass.length > 6));
}

/**
 * Soket Seviyesinde Hızlı Ham TCP Bağlantı Kontrolü
 */
function checkPortOpen(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, family: 4 });
    let resolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('error', () => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
  });
}

/**
 * Brevo (Sendinblue) HTTPS REST API üzerinden E-Posta Gönderimi (Port 443 - Engel Tanımaz)
 * Günde 300 ücretsiz e-posta sunar; Gmail ve geçici e-postalar dahil her adrese iletir.
 */
async function sendViaBrevo(apiKey, toEmail, recipientName, resetCode, htmlContent) {
  return new Promise((resolve, reject) => {
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'ozderahmetcode@gmail.com').trim();
    const senderName = (process.env.BREVO_SENDER_NAME || 'OZDER Satranç Topluluğu').trim();

    const postData = JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail.trim(), name: recipientName || 'Satranç Sever' }],
      subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
      htmlContent: htmlContent,
      textContent: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`
    });

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, sent: true, messageId: parsed.messageId, provider: 'brevo' });
          } else {
            const errDetail = parsed.message || parsed.code || `HTTP ${res.statusCode}`;
            console.error(`[Brevo Hatası]: ${errDetail}`);
            reject(new Error(`Brevo API Hatası: ${errDetail}`));
          }
        } catch (e) {
          reject(new Error(`Brevo Yanıtı Ayrıştırılamadı (HTTP ${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('Brevo API zaman aşımı (10 saniye)')); });
    req.write(postData);
    req.end();
  });
}

/**
 * Brevo API Anahtarı Doğruluk ve Hesap Kontrolü (Teşhis için)
 */
function testBrevoAccount(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/account',
      method: 'GET',
      headers: {
        'api-key': apiKey.trim(),
        'Accept': 'application/json'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, email: parsed.email, plan: parsed.plan && parsed.plan[0] ? parsed.plan[0].type : 'active' });
          } else {
            resolve({ success: false, error: parsed.message || `HTTP ${res.statusCode}` });
          }
        } catch (e) {
          resolve({ success: false, error: 'JSON ayrıştırma hatası' });
        }
      });
    });

    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Zaman aşımı' }); });
    req.end();
  });
}

/**
 * Google Apps Script Webhook üzerinden E-Posta Gönderimi (Port 443 - HTTPS)
 * ozderahmetcode@gmail.com hesabına bağlı Google Apps Script ile %100 doğrudan Gmail gönderimi!
 */
function sendViaGoogleScript(webhookUrl, toEmail, recipientName, resetCode, htmlContent) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      to: toEmail.trim(),
      name: recipientName || 'Satranç Sever',
      subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
      html: htmlContent,
      text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`
    });

    const executeRequest = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Çok fazla yönlendirme (Google Script)'));
      }
      const u = new URL(currentUrl);
      const req = https.request({
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 12000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return executeRequest(res.headers.location, redirectCount + 1);
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, sent: true, provider: 'google_script' });
          } else {
            reject(new Error(`Google Script HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Google Script zaman aşımı')); });
      req.write(postData);
      req.end();
    };

    executeRequest(webhookUrl);
  });
}

/**
 * Resend HTTPS REST API üzerinden E-Posta Gönderimi (Port 443)
 */
async function sendViaResend(apiKey, toEmail, recipientName, resetCode, htmlContent) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      from: 'OZDER Satranc <onboarding@resend.dev>',
      to: [toEmail.trim()],
      subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
      html: htmlContent,
      text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, sent: true, messageId: parsed.id, provider: 'resend' });
          } else {
            reject(new Error(parsed.message || `Resend HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Resend Yanıtı Ayrıştırılamadı: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('Resend API zaman aşımı')); });
    req.write(postData);
    req.end();
  });
}

/**
 * Belirtilen port ile tek kullanımlık Nodemailer Transporter oluşturur
 */
function createDirectTransport(port, secure) {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
    family: 4,
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 6000,
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Şifre Sıfırlama E-Postası Gönder (Hibrit & Kesintisiz Bulut Korumalı)
 * @param {string} toEmail Alıcı e-posta adresi
 * @param {string} recipientName Alıcı adı
 * @param {string} resetCode 6 haneli güvenlik kodu
 * @returns {Promise<{success: boolean, sent?: boolean, messageId?: string, provider?: string, error?: string, code?: string}>}
 */
async function sendPasswordResetEmail(toEmail, recipientName, resetCode) {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      error: 'E-posta servisi henüz yapılandırılmamış (BREVO_API_KEY veya SMTP bilgileri eksik).',
      code: 'NOT_CONFIGURED'
    };
  }

  const user = (process.env.SMTP_USER || '').trim();
  const fromAddress = process.env.SMTP_FROM || `"OZDER Satranç Topluluğu" <${user}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 32px 24px; }
        .pin-box { background: #f1f5f9; border: 2px dashed #0ea5e9; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .pin-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; }
        .warning { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>OZDER SOSYAL SATRANÇ</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Şifre Kurtarma ve Doğrulama</p>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Merhaba <strong>${recipientName || 'Satranç Sever'}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            OZDER Satranç hesabınız için şifre sıfırlama talebinde bulunuldu. Hesabınıza yeniden erişmek için aşağıdaki 6 haneli güvenlik kodunu kullanabilirsiniz:
          </p>
          
          <div class="pin-box">
            <div style="font-size: 12px; font-weight: 700; color: #0ea5e9; text-transform: uppercase; margin-bottom: 6px;">Doğrulama Kodunuz</div>
            <div class="pin-code">${resetCode}</div>
          </div>

          <p class="warning">
            ⚠️ Bu kod <strong>15 dakika</strong> boyunca geçerlidir. Bu işlemi siz başlatmadıysanız bu e-postayı güvenle yok sayabilirsiniz.
          </p>
        </div>
        <div class="footer">
          © 2026 OZDER Satranç Topluluğu • Ümraniye X Cafe Buluşmaları
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. ÖNCELİK: Brevo HTTPS REST API (Port 443 - Bulut Engeli Tanımaz, Hem Gmail Hem Temp Mail'e Kesin Teslimat)
  if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) {
    try {
      console.log(`[E-Posta] Brevo HTTPS API (Port 443) ile gönderiliyor: ${toEmail}`);
      const res = await sendViaBrevo(process.env.BREVO_API_KEY, toEmail, recipientName, resetCode, htmlContent);
      console.log(`[E-Posta Başarılı - Brevo] ${toEmail} ID: ${res.messageId}`);
      return res;
    } catch (e) {
      console.warn(`[E-Posta] Brevo başarısız oldu: ${e.message}`);
    }
  }

  // 2. ÖNCELİK: Google Apps Script Webhook (Port 443 - ozderahmetcode@gmail.com ile doğrudan teslimat)
  if (process.env.GMAIL_WEBHOOK_URL && process.env.GMAIL_WEBHOOK_URL.trim()) {
    try {
      console.log(`[E-Posta] Google Apps Script Webhook (Port 443) ile gönderiliyor: ${toEmail}`);
      const res = await sendViaGoogleScript(process.env.GMAIL_WEBHOOK_URL, toEmail, recipientName, resetCode, htmlContent);
      console.log(`[E-Posta Başarılı - Google Script] ${toEmail}`);
      return res;
    } catch (e) {
      console.warn(`[E-Posta] Google Apps Script başarısız oldu: ${e.message}`);
    }
  }

  // 3. ÖNCELİK: Resend HTTPS REST API (Port 443)
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    try {
      console.log(`[E-Posta] Resend HTTPS API (Port 443) ile gönderiliyor: ${toEmail}`);
      const res = await sendViaResend(process.env.RESEND_API_KEY, toEmail, recipientName, resetCode, htmlContent);
      console.log(`[E-Posta Başarılı - Resend] ${toEmail} ID: ${res.messageId}`);
      return res;
    } catch (e) {
      console.warn(`[E-Posta] Resend başarısız oldu: ${e.message}`);
    }
  }

  // 4. ÖNCELİK: Doğrudan Gmail SMTP (Port 465 SSL / Port 587 STARTTLS)
  // Soket seviyesinde port kontrolü ile zaman aşımı engellenir
  console.log('[E-Posta] SMTP Port 465/587 erişilebilirliği test ediliyor...');
  const port465Open = await checkPortOpen('smtp.gmail.com', 465, 2000);
  let port587Open = false;

  if (port465Open) {
    try {
      console.log(`[E-Posta] Port 465 (SSL/IPv4) ile gönderiliyor: ${toEmail}`);
      const transport465 = createDirectTransport(465, true);
      const info = await transport465.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
        text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`,
        html: htmlContent
      });
      console.log(`[E-Posta Başarılı - Port 465] ${toEmail} ID: ${info.messageId}`);
      return { success: true, sent: true, messageId: info.messageId, provider: 'gmail_smtp_465' };
    } catch (err465) {
      console.warn(`[E-Posta] Port 465 hata verdi: ${err465.message}`);
    }
  } else {
    // Port 465 kapalıysa Port 587'yi hızlıca kontrol et
    port587Open = await checkPortOpen('smtp.gmail.com', 587, 2000);
    if (port587Open) {
      try {
        console.log(`[E-Posta] Port 587 (STARTTLS/IPv4) ile gönderiliyor: ${toEmail}`);
        const transport587 = createDirectTransport(587, false);
        const info = await transport587.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
          text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`,
          html: htmlContent
        });
        console.log(`[E-Posta Başarılı - Port 587] ${toEmail} ID: ${info.messageId}`);
        return { success: true, sent: true, messageId: info.messageId, provider: 'gmail_smtp_587' };
      } catch (err587) {
        console.warn(`[E-Posta] Port 587 hata verdi: ${err587.message}`);
      }
    }
  }

  // Hem Port 465 hem Port 587 kapalıysa (Render.com free tier kısıtlaması)
  console.error('[E-Posta Uyarısı] Sunucu güvenlik duvarı (Render.com) giden SMTP portlarını (465/587) engelliyor.');
  return {
    success: false,
    code: 'PORT_BLOCKED_BY_HOST',
    error: 'Sunucu bulut güvenlik duvarı (Render.com) giden SMTP portlarını (465/587) engelliyor. E-posta teslimatı için BREVO_API_KEY tanımlanmalıdır.'
  };
}

/**
 * Teşhis Fonksiyonu: SMTP ve HTTPS API Bağlantı Testi
 */
async function testSmtpConnection() {
  const results = {
    isConfigured: isSmtpConfigured(),
    user: (process.env.SMTP_USER || '').trim(),
    hasBrevo: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()),
    brevoStatus: null,
    hasGoogleScript: Boolean(process.env.GMAIL_WEBHOOK_URL && process.env.GMAIL_WEBHOOK_URL.trim()),
    hasResend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()),
    tcp_google_443: null,
    tcp_smtp_465: null,
    tcp_smtp_587: null
  };

  results.tcp_google_443 = await checkPortOpen('google.com', 443, 2500) ? 'OPEN' : 'BLOCKED';
  results.tcp_smtp_465 = await checkPortOpen('smtp.gmail.com', 465, 2500) ? 'OPEN' : 'BLOCKED';
  results.tcp_smtp_587 = await checkPortOpen('smtp.gmail.com', 587, 2500) ? 'OPEN' : 'BLOCKED';

  if (results.hasBrevo) {
    const brevoCheck = await testBrevoAccount(process.env.BREVO_API_KEY);
    results.brevoStatus = brevoCheck.success ? `BAĞLANDI (${brevoCheck.email})` : `HATA: ${brevoCheck.error}`;
  }

  return results;
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
  testSmtpConnection
};
