require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const db = require('./database');
const multer = require('multer');

// Uploads dizinini oluştur
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Statik yükleme klasörü
app.use('/uploads', express.static(uploadsDir));

// Nodemailer SMTP Yapılandırması
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
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

// Mesaj Rotaları
app.post('/api/messages', (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Tüm alanlar zorunludur." });
    }
    const messages = db.saveMessage({ name, email, message });
    res.status(201).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: "Mesaj gönderilirken hata oluştu." });
  }
});

app.delete('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const messages = db.deleteMessage(id);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: "Mesaj silinirken hata oluştu." });
  }
});

// E-posta Doğrulama ve Kimlik Doğrulama API Rotaları
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, chessUsername, elo } = req.body;
    if (!name || !email || !password || !phone || !chessUsername) {
      return res.status(400).json({ error: "Lütfen tüm zorunlu alanları doldurun." });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return res.status(400).json({ error: "Telefon numarası formatı geçersizdir." });
    }

    const result = db.registerUser({ name, email, password, phone: cleanPhone, chessUsername, elo });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    console.log(`[E-Posta Doğrulama Kodu] Kime: ${email} -> Kod: ${result.code}`);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const mailOptions = {
        from: `"OZDER Satranç Topluluğu" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${result.code} - OZDER E-posta Doğrulama Kodu`,
        html: `
          <div style="background-color: #07090e; color: #f8fafc; padding: 40px; font-family: 'Inter', sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: 1px;">OZDER SATRANÇ</h2>
              <p style="color: #0ea5e9; font-size: 14px; margin: 5px 0 0 0; letter-spacing: 2px;">TOPLULUK DOĞRULAMA SERVİSİ</p>
            </div>
            <div style="background: rgba(13, 18, 30, 0.7); padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); text-align: center;">
              <p style="font-size: 16px; margin-bottom: 20px;">Merhaba <strong>${name}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                OZDER Satranç topluluğuna katıldığınız için teşekkür ederiz! Kaydınızı tamamlamak ve turnuvalara katılım sağlamak için aşağıdaki 6 haneli doğrulama kodunu kullanın:
              </p>
              <div style="background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); color: white; font-size: 32px; font-weight: bold; padding: 16px 24px; border-radius: 8px; display: inline-block; letter-spacing: 6px; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
                ${result.code}
              </div>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px; line-height: 1.5;">
              Bu e-posta OZDER satranç topluluğu kayıt işlemi doğrultusunda gönderilmiştir.<br />
              Ümraniye X Cafe • Sosyal Satranç Kültürü
            </p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error("Nodemailer e-posta gönderme hatası:", err);
      }
    }

    res.status(201).json({ 
      success: true, 
      message: "Doğrulama kodu gönderildi.", 
      email, 
      testCode: process.env.SMTP_USER ? undefined : result.code
    });
  } catch (error) {
    res.status(500).json({ error: "Kayıt sırasında bir hata oluştu." });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const { email, code } = req.body;
    const result = db.verifyUser(email, code);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Doğrulama sırasında bir hata oluştu." });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = db.loginUser(email, password);
    if (result.error) {
      return res.status(400).json({ error: result.error, requiresVerification: result.requiresVerification });
    }
    res.json({ success: true, user: result.user });
  } catch (error) {
    res.status(500).json({ error: "Giriş yapılırken bir hata oluştu." });
  }
});

// Profil ve Kullanıcı Ayarları
app.post('/api/users/:id/profile', upload.single('avatarFile'), (req, res) => {
  try {
    const { id } = req.params;
    const { phone, bio, matchmakingSettings } = req.body;
    
    let avatarUrl = req.body.avatarUrl; // Keep existing if not changed
    if (req.file) {
      avatarUrl = '/uploads/' + req.file.filename;
    }
    
    let parsedSettings = undefined;
    if (matchmakingSettings) {
      parsedSettings = JSON.parse(matchmakingSettings);
    }
    
    const result = db.updateUserProfile(id, { phone, bio, avatar: avatarUrl, matchmakingSettings: parsedSettings });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, user: result.user });
  } catch (error) {
    res.status(500).json({ error: "Profil güncellenirken hata oluştu." });
  }
});

// Turnuvaya Özel Kayıt Rotaları (Ad Soyad ve chessUsername artık parametredir)
app.post('/api/register', (req, res) => {
  try {
    const { tournamentId, userId, name, chessUsername } = req.body;
    if (!tournamentId || !userId || !name || !chessUsername) {
      return res.status(400).json({ error: "Turnuva ID, Kullanıcı ID, İsim ve Satranç Adı zorunludur." });
    }

    const result = db.registerForTournament(tournamentId, userId, name, chessUsername);
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
    const { title, date, time, location, fee, maxQuota, totalRounds } = req.body;

    if (!title || !date || !time || !location || !maxQuota) {
      return res.status(400).json({ error: "Lütfen zorunlu alanları doldurun." });
    }

    const tournaments = db.createTournament({ title, date, time, location, fee: fee || "Ücretsiz", maxQuota: parseInt(maxQuota), totalRounds: totalRounds || 5 });
    res.status(201).json({ success: true, tournaments });
  } catch (error) {
    res.status(500).json({ error: "Turnuva oluşturulurken hata oluştu." });
  }
});

// Eşleştirme ve Tur Sonuç API Rotaları
app.post('/api/tournaments/:id/pairings', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.generateNextRound(id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments });
  } catch (error) {
    res.status(500).json({ error: "Eşleştirme oluşturulurken hata oluştu." });
  }
});

app.post('/api/tournaments/:id/rounds/:round/results', (req, res) => {
  try {
    const { id, round } = req.params;
    const { results } = req.body;
    const result = db.submitRoundResults(id, round, results);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, tournaments: result.tournaments, users: result.users });
  } catch (error) {
    res.status(500).json({ error: "Sonuçlar girilirken hata oluştu." });
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
