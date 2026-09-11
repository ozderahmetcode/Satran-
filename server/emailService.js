const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');
const https = require('https');

// Docker / Render / Linux ortamında IPv6 siyah delik zaman aşımlarını engellemek için
// DNS çözümlemesini zorunlu IPv4 (IPv4-first) olarak ayarla.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * E-Posta Servisi (OZDER Satranç Topluluğu)
 * Hibrit E-Posta Motoru:
 * 1. Resend API (HTTPS Port 443 - Bulut Güvenlik Duvarlarını %100 Aşar)
 * 2. Brevo API (HTTPS Port 443)
 * 3. Doğrudan Gmail SMTP (Port 465 SSL / Port 587 STARTTLS) - Hızlı port kontrolü ile
 */

function isSmtpConfigured() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const hasBrevo = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim());
  return Boolean(hasResend || hasBrevo || (user && pass && user.length > 3 && pass.length > 6));
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
 * Resend HTTPS REST API üzerinden E-Posta Gönderimi (Port 443 - Engel Tanımaz)
 */
async function sendViaResend(apiKey, toEmail, recipientName, resetCode, htmlContent) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      from: 'OZDER Satranc <onboarding@resend.dev>',
      to: [toEmail],
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
            resolve({ success: true, sent: true, messageId: parsed.id });
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
 * Brevo (Sendinblue) HTTPS REST API üzerinden E-Posta Gönderimi (Port 443)
 */
async function sendViaBrevo(apiKey, toEmail, recipientName, resetCode, htmlContent) {
  return new Promise((resolve, reject) => {
    const senderEmail = (process.env.SMTP_USER || 'info@ozdersatranc.com').trim();
    const postData = JSON.stringify({
      sender: { name: 'OZDER Satranç Topluluğu', email: senderEmail },
      to: [{ email: toEmail, name: recipientName || 'Satranç Sever' }],
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
            resolve({ success: true, sent: true, messageId: parsed.messageId });
          } else {
            reject(new Error(parsed.message || `Brevo HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Brevo Yanıtı Ayrıştırılamadı: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('Brevo API zaman aşımı')); });
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
 * Şifre Sıfırlama E-Postası Gönder (Hibrit & Zaman Aşımı Korumalı)
 * @param {string} toEmail Alıcı e-posta adresi
 * @param {string} recipientName Alıcı adı
 * @param {string} resetCode 6 haneli güvenlik kodu
 * @returns {Promise<{success: boolean, sent?: boolean, messageId?: string, error?: string, code?: string}>}
 */
async function sendPasswordResetEmail(toEmail, recipientName, resetCode) {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      error: 'E-posta servisi henüz yapılandırılmamış.',
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

  // 1. ÖNCELİK: Resend HTTPS REST API (Port 443)
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    try {
      console.log(`[E-Posta] Resend HTTPS API (Port 443) ile gönderiliyor: ${toEmail}`);
      const res = await sendViaResend(process.env.RESEND_API_KEY, toEmail, recipientName, resetCode, htmlContent);
      console.log(`[E-Posta Başarılı - Resend] ${toEmail} ID: ${res.messageId}`);
      return res;
    } catch (e) {
      console.warn(`[E-Posta] Resend başarısız: ${e.message}`);
    }
  }

  // 2. ÖNCELİK: Brevo HTTPS REST API (Port 443)
  if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) {
    try {
      console.log(`[E-Posta] Brevo HTTPS API (Port 443) ile gönderiliyor: ${toEmail}`);
      const res = await sendViaBrevo(process.env.BREVO_API_KEY, toEmail, recipientName, resetCode, htmlContent);
      console.log(`[E-Posta Başarılı - Brevo] ${toEmail} ID: ${res.messageId}`);
      return res;
    } catch (e) {
      console.warn(`[E-Posta] Brevo başarısız: ${e.message}`);
    }
  }

  // 3. ÖNCELİK: Doğrudan Gmail SMTP (Port 465 SSL / Port 587 STARTTLS)
  // Önce hızlıca portun açık olup olmadığını kontrol et (2 saniye limit).
  // Bu sayede Render.com gibi SMTP portlarını engelleyen ortamlarda kullanıcı asla 25-40 saniye beklemez!
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
      return { success: true, sent: true, messageId: info.messageId };
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
        return { success: true, sent: true, messageId: info.messageId };
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
    error: 'Sunucu güvenlik duvarı giden SMTP portlarını (465/587) engelliyor.'
  };
}

/**
 * Teşhis Fonksiyonu: SMTP ve HTTPS API Bağlantı Testi
 */
async function testSmtpConnection() {
  const results = {
    isConfigured: isSmtpConfigured(),
    user: (process.env.SMTP_USER || '').trim(),
    hasResend: Boolean(process.env.RESEND_API_KEY),
    hasBrevo: Boolean(process.env.BREVO_API_KEY),
    tcp_google_443: null,
    tcp_smtp_465: null,
    tcp_smtp_587: null
  };

  results.tcp_google_443 = await checkPortOpen('google.com', 443, 2500) ? 'OPEN' : 'BLOCKED';
  results.tcp_smtp_465 = await checkPortOpen('smtp.gmail.com', 465, 2500) ? 'OPEN' : 'BLOCKED';
  results.tcp_smtp_587 = await checkPortOpen('smtp.gmail.com', 587, 2500) ? 'OPEN' : 'BLOCKED';

  return results;
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
  testSmtpConnection
};
