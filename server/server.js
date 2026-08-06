const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Nodemailer SMTP Yapılandırması
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '', // Gönderici e-posta adresi
    pass: process.env.SMTP_PASS || ''  // SMTP şifresi veya uygulama şifresi
  }
});

// API Rotaları
app.get('/api/data', (req, res) => {
  try {
    const data = db.getData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Veriler alınırken bir hata oluştu." });
  }
});

// E-posta Doğrulama ve Kimlik Doğrulama API Rotaları
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, chessUsername } = req.body;
    if (!name || !email || !password || !phone || !chessUsername) {
      return res.status(400).json({ error: "Lütfen tüm zorunlu alanları doldurun." });
    }

    // Telefon Numarası Sayısal Karakter Kontrolü ve 10/11 Hane Kontrolü
    const cleanPhone = phone.replace(/\D/g, ''); // Sadece rakamları al
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return res.status(400).json({ error: "Telefon numarası formatı geçersizdir. Örn: 05554443322 veya 5554443322" });
    }

    const result = db.registerUser({ name, email, password, phone: cleanPhone, chessUsername });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Konsola doğrulama kodunu yazalım (testler için)
    console.log(`[E-Posta Doğrulama Kodu] Kime: ${email} -> Kod: ${result.code}`);

    // E-postayı resmi olarak gönderme denemesi
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const mailOptions = {
        from: `"özder Satranç Topluluğu" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${result.code} - özder E-posta Doğrulama Kodu`,
        html: `
          <div style="background-color: #07090e; color: #f8fafc; padding: 40px; font-family: 'Inter', sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: 1px;">ÖZDER SATRANÇ</h2>
              <p style="color: #0ea5e9; font-size: 14px; margin: 5px 0 0 0; letter-spacing: 2px;">TOPLULUK DOĞRULAMA SERVİSİ</p>
            </div>
            <div style="background: rgba(13, 18, 30, 0.7); padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
              <p style="font-size: 16px; margin-bottom: 20px;">Merhaba <strong>${name}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                özder Satranç topluluğuna katıldığınız için teşekkür ederiz! Kaydınızı tamamlamak ve turnuvalara katılım sağlamak için aşağıdaki 6 haneli doğrulama kodunu kullanın:
              </p>
              <div style="background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); color: white; font-size: 32px; font-weight: bold; padding: 16px 24px; border-radius: 8px; display: inline-block; letter-spacing: 6px; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
                ${result.code}
              </div>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px; line-height: 1.5;">
              Bu e-posta özder satranç topluluğu kayıt işlemi doğrultusunda gönderilmiştir.<br />
              Ümraniye Tilda Cafe • Sosyal Satranç Kültürü
            </p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`E-posta başarıyla gönderildi: ${email}`);
      } catch (err) {
        console.error("Nodemailer e-posta gönderme hatası:", err);
      }
    }

    res.status(201).json({ 
      success: true, 
      message: "Doğrulama kodu gönderildi.", 
      email, 
      testCode: process.env.SMTP_USER ? undefined : result.code // SMTP kuruluysa güvenlik için kodu gizliyoruz, kurulu değilse kolay test için gönderiyoruz
    });
  } catch (error) {
    res.status(500).json({ error: "Kayıt sırasında bir hata oluştu." });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-posta ve doğrulama kodu zorunludur." });
    }

    const result = db.verifyUser(email, code);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: "E-posta doğrulandı! Giriş yapabilirsiniz." });
  } catch (error) {
    res.status(500).json({ error: "Doğrulama sırasında bir hata oluştu." });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-posta ve şifre zorunludur." });
    }

    const result = db.loginUser(email, password);
    if (result.error) {
      return res.status(400).json({ error: result.error, requiresVerification: result.requiresVerification });
    }

    res.json({ success: true, user: result.user });
  } catch (error) {
    res.status(500).json({ error: "Giriş yapılırken bir hata oluştu." });
  }
});

// Turnuvaya Özel Kayıt Rotaları
app.post('/api/register', (req, res) => {
  try {
    const { tournamentId, userId } = req.body;
    if (!tournamentId || !userId) {
      return res.status(400).json({ error: "Turnuva ID ve Kullanıcı ID zorunludur." });
    }

    const result = db.registerForTournament(tournamentId, userId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ success: true, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Turnuvaya kayıt sırasında hata oluştu." });
  }
});

app.delete('/api/register/:tournamentId/:userId', (req, res) => {
  try {
    const { tournamentId, userId } = req.params;
    const result = db.cancelTournamentRegistration(tournamentId, userId);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, registrations: result.registrations });
  } catch (error) {
    res.status(500).json({ error: "Kayıt iptal edilirken hata oluştu." });
  }
});

app.post('/api/tournaments', (req, res) => {
  try {
    const { title, date, time, location, fee, maxQuota } = req.body;

    if (!title || !date || !time || !location || !maxQuota) {
      return res.status(400).json({ error: "Lütfen zorunlu alanları doldurun." });
    }

    const tournaments = db.createTournament({ title, date, time, location, fee: fee || "Ücretsiz", maxQuota: parseInt(maxQuota) });
    res.status(201).json({ success: true, tournaments });
  } catch (error) {
    res.status(500).json({ error: "Turnuva oluşturulurken hata oluştu." });
  }
});

// React Build Statik Dosyalarını Sunma
app.use(express.static(path.join(__dirname, '../dist')));

// Tüm istekleri React Router'a yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} portunda aktif.`);
});
