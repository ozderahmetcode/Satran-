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

app.post('/api/register', (req, res) => {
  try {
    const { name, chessUsername, phone, elo } = req.body;

    if (!name || !chessUsername || !phone) {
      return res.status(400).json({ error: "Lütfen zorunlu alanları doldurun." });
    }

    const registrations = db.saveRegistration({ name, chessUsername, phone, elo });
    res.status(201).json({ success: true, registrations });
  } catch (error) {
    res.status(500).json({ error: "Kayıt işlemi sırasında bir hata oluştu." });
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
