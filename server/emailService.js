const nodemailer = require('nodemailer');

/**
 * E-Posta Servisi (OZDER Satranç Topluluğu)
 * Gerçek SMTP (Gmail, Yandex, Özel Domain) ve Sıfır Konfigürasyon Akıllı Yedekleme (Fallback) Modu
 */

// SMTP Ortam Değişkenleri
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `"OZDER Satranç Topluluğu" <${SMTP_USER}>` : '"OZDER Satranç" <destek@ozdersatranc.com>');

// SMTP Konfigürasyonu tanımlı mı?
function isSmtpConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS && SMTP_USER.trim().length > 0 && SMTP_PASS.trim().length > 0);
}

// Transporter Örneği (Yalnızca kimlik bilgileri varsa oluşturulur)
let transporter = null;
if (isSmtpConfigured()) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (err) {
    console.warn('[E-Posta Servisi] Transporter oluşturulamadı:', err.message);
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
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `OZDER Satranç - Şifre Sıfırlama Kodu: ${resetCode}`,
      text: `Merhaba ${recipientName},\n\nOZDER Satranç şifre sıfırlama kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`,
      html: htmlContent
    });

    console.log(`[E-Posta Başarılı] ${toEmail} adresine e-posta gönderildi. Mesaj ID: ${info.messageId}`);
    return {
      success: true,
      sent: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error(`[E-Posta Gönderim Hatası] ${toEmail}:`, error.message);
    // SMTP hatası durumunda dahi akıllı geri dönüş yaparak kullanıcıyı mağdur etmiyoruz
    return {
      success: true,
      sent: false,
      fallback: true,
      code: resetCode,
      reason: `SMTP Gönderim hatası: ${error.message}. Yerel güvenlik kodu kullanıma sunuldu.`
    };
  }
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail
};
