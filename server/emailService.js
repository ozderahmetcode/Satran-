const nodemailer = require('nodemailer');
const dns = require('dns');

// Docker / Render / Linux ortamında IPv6 siyah delik (blackhole) zaman aşımını engellemek için
// DNS çözümlemesini zorunlu IPv4 (IPv4-first) olarak ayarla.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * E-Posta Servisi (OZDER Satranç Topluluğu)
 * IPv4 Zorlamalı, Akıllı Port Fallback'li (465 SSL -> 587 STARTTLS) E-Posta Motoru
 */

function isSmtpConfigured() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  return Boolean(user && pass && user.length > 3 && pass.length > 6);
}

/**
 * Belirtilen port ve güvenlik ayarları ile tek kullanımlık (stateless/taze) Transporter oluşturur.
 * Havuz (pool: true) yerine doğrudan soket kullanımı container ortamlarında ölü soket kilitlenmelerini önler.
 */
function createDirectTransport(port, secure) {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
    family: 4, // Linux container ortamında IPv4'e zorla
    connectionTimeout: 6000, // 6 saniye bağlantı zaman aşımı
    greetingTimeout: 6000,   // 6 saniye karşılama zaman aşımı
    socketTimeout: 8000,     // 8 saniye soket zaman aşımı
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Şifre Sıfırlama E-Postası Gönder (Akıllı Port Failover ile)
 * @param {string} toEmail Alıcı e-posta adresi
 * @param {string} recipientName Alıcı adı
 * @param {string} resetCode 6 haneli güvenlik kodu
 * @returns {Promise<{success: boolean, sent?: boolean, messageId?: string, error?: string}>}
 */
async function sendPasswordResetEmail(toEmail, recipientName, resetCode) {
  if (!isSmtpConfigured()) {
    console.error(`[E-Posta Hatası] SMTP yapılandırılmamış. Gönderilemedi: ${toEmail}`);
    return {
      success: false,
      error: 'E-posta sunucusu (SMTP) henüz yapılandırılmamış.'
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

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
    text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`,
    html: htmlContent
  };

  // 1. Önce Port 465 (SSL) ile dene
  try {
    console.log(`[E-Posta] Port 465 (SSL/IPv4) ile gönderiliyor: ${toEmail}`);
    const transport465 = createDirectTransport(465, true);
    const info = await transport465.sendMail(mailOptions);
    console.log(`[E-Posta Başarılı - Port 465] ${toEmail} adresine e-posta ulaştı. ID: ${info.messageId}`);
    return {
      success: true,
      sent: true,
      messageId: info.messageId
    };
  } catch (err465) {
    console.warn(`[E-Posta Uyarısı] Port 465 başarısız oldu (${err465.message}). Port 587 (STARTTLS) deneniyor...`);
    
    // 2. Port 465 başarısız olursa hemen Port 587 (STARTTLS) ile dene
    try {
      console.log(`[E-Posta] Port 587 (STARTTLS/IPv4) ile deneniyor: ${toEmail}`);
      const transport587 = createDirectTransport(587, false);
      const info = await transport587.sendMail(mailOptions);
      console.log(`[E-Posta Başarılı - Port 587] ${toEmail} adresine e-posta ulaştı. ID: ${info.messageId}`);
      return {
        success: true,
        sent: true,
        messageId: info.messageId
      };
    } catch (err587) {
      console.error(`[E-Posta Hatası - Port 587 de başarısız] ${toEmail}:`, err587.message);
      return {
        success: false,
        error: `E-posta gönderimi başarısız oldu (465: ${err465.message}, 587: ${err587.message})`
      };
    }
  }
}

/**
 * Soket Seviyesinde Ham TCP Bağlantı Testi
 */
function testRawTcp(host, port, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const net = require('net');
    const start = Date.now();
    let resolved = false;

    try {
      const socket = net.createConnection({ host, port, family: 4 });
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          const time = Date.now() - start;
          socket.destroy();
          resolve({ status: 'CONNECTED', timeMs: time });
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ status: 'TIMEOUT', timeMs: Date.now() - start });
        }
      });

      socket.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          resolve({ status: 'ERROR', message: err.message, code: err.code, timeMs: Date.now() - start });
        }
      });
    } catch (e) {
      resolve({ status: 'EXCEPTION', message: e.message });
    }
  });
}

/**
 * Teşhis Fonksiyonu: SMTP Bağlantısını ve Portları Test Et
 */
async function testSmtpConnection() {
  const results = {
    isConfigured: isSmtpConfigured(),
    user: (process.env.SMTP_USER || '').trim(),
    dnsLookup: null,
    tcp_google_443: null,
    tcp_smtp_465: null,
    tcp_smtp_587: null,
    nodemailer_465: null,
    nodemailer_587: null
  };

  try {
    const addresses = await new Promise((res, rej) => {
      dns.resolve4('smtp.gmail.com', (err, addrs) => err ? rej(err) : res(addrs));
    });
    results.dnsLookup = addresses;
  } catch (e) {
    results.dnsLookup = `DNS Error: ${e.message}`;
  }

  // Kontrol: Render dışarı HTTPS (443) açabiliyor mu?
  results.tcp_google_443 = await testRawTcp('google.com', 443, 5000);
  // Port 465 testi
  results.tcp_smtp_465 = await testRawTcp('smtp.gmail.com', 465, 6000);
  // Port 587 testi
  results.tcp_smtp_587 = await testRawTcp('smtp.gmail.com', 587, 6000);

  if (results.isConfigured) {
    try {
      const t465 = createDirectTransport(465, true);
      await t465.verify();
      results.nodemailer_465 = 'OK';
    } catch (err) {
      results.nodemailer_465 = err.message;
    }

    try {
      const t587 = createDirectTransport(587, false);
      await t587.verify();
      results.nodemailer_587 = 'OK';
    } catch (err) {
      results.nodemailer_587 = err.message;
    }
  }

  return results;
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
  testSmtpConnection
};

