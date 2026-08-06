const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone, chessUsername } = req.body;
    if (!name || !email || !password || !phone || !chessUsername) {
      return res.status(400).json({ error: "Lütfen tüm zorunlu alanları doldurun." });
    }

    const result = db.registerUser({ name, email, password, phone, chessUsername });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Konsola doğrulama kodunu yazalım (SMTP kurulumu olmayan testler için kolaylık)
    console.log(`[E-Posta Doğrulama Kodu] Kime: ${email} -> Kod: ${result.code}`);

    // Geliştirme/Deneme sürümü için kodu cevaba ekliyoruz (kullanıcı ekranda görebilsin diye)
    res.status(201).json({ success: true, message: "Doğrulama kodu gönderildi.", email, testCode: result.code });
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
