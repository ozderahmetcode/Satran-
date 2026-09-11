const nodemailer = require('nodemailer');

/**
 * E-Posta Servisi (OZDER Satranç Topluluğu)
 * Gerçek SMTP (Gmail, Yandex, Özel Domain) ve Sıfır Konfigürasyon Akıllı Yedekleme (Fallback) Modu
 */

// SMTP Konfigürasyonu tanımlı mı?
function isSmtpConfigured() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  return Boolean(user && pass && user.length > 3 && pass.length > 6);
}

// Transporter Örneği (Dinamik Oluşturucu)
let cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!isSmtpConfigured()) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  try {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
      tls: { rejectUnauthorized: false }
    });
    return cachedTransporter;
  } catch (err) {
    console.warn('[E-Posta Servisi] Transporter oluşturulamadı:', err.message);
    return null;
  }
}

/**
 * Şifre Sıfırlama E-Postası Gönder
 * @param {string} toEmail Alıcı e-posta adresi
 * @param {string} recipientName Alıcı adı
 * @param {string} resetCode 6 haneli güvenlik kodu
 * @returns {Promise<{success: boolean, sent: boolean, code?: string, reason?: string}>}
 */
async function sendPasswordResetEmail(toEmail, recipientName, resetCode) {
  const transporter = getTransporter();

  // SMTP henüz ayarlanmamışsa güvenli fallback motoru çalışır
  if (!isSmtpConfigured() || !transporter) {
    console.log(`[E-Posta Fallback] SMTP henüz yapılandırılmadı. ${toEmail} (${recipientName}) için doğrulama kodu üretildi: [ ${resetCode} ]`);
    return {
      success: true,
      sent: false,
      fallback: true,
      code: resetCode,
      reason: 'SMTP sunucu ayarları henüz girilmediği için yerel doğrulama motoru devrede.'
    };
  }

  const fromAddress = process.env.SMTP_FROM || `"OZDER Satranç Topluluğu" <${process.env.SMTP_USER || 'destek@ozdersatranc.com'}>`;

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

  try {
    const sendPromise = transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
      text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`,
      html: htmlContent
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 5000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log(`[E-Posta Başarılı] ${toEmail} adresine e-posta gönderildi. Mesaj ID: ${info.messageId}`);
    return {
      success: true,
      sent: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.warn(`[E-Posta Gönderim Uyarısı] ${toEmail}: ${error.message}. Güvenli yerel PIN motoruna geçiliyor.`);
    // SMTP hatası veya zaman aşımında akıllı yerel PIN koduna anında geri dön
    return {
      success: true,
      sent: false,
      fallback: true,
      code: resetCode,
      reason: error.message === 'SMTP_TIMEOUT' 
        ? 'Bulut sunucu SMTP zaman aşımı (Port engeli).' 
        : `SMTP hatası: ${error.message}`
    };
  }
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail
};
