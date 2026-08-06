# özder | Sosyal Satranç Topluluğu ve Etkinlik Kayıt Platformu

Bu proje, **Ümraniye Tilda Cafe** satranç buluşmalarının tanıtımı, katılım kaydı ve topluluk liderlik tablolarının sergilenmesi amacıyla tasarlanmış premium bir web uygulamasıdır.

Koyu tema tasarımı, cam morfizmi (glassmorphism) ve mikro animasyonlarla zenginleştirilmiş olup, **Render.com** ve **GitHub** ile tam uyumludur.

---

## 🛠️ Yerel Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları takip edin:

1. **Bağımlılıkları Kurun**:
   ```bash
   npm install
   ```

2. **Geliştirme Modunda Çalıştırın**:
   ```bash
   npm run dev
   ```
   *Bu komut hem frontend (Vite) hem de backend (Express) sunucunuzu ayağa kaldıracaktır.*

3. **Tarayıcıda Açın**:
   [http://localhost:3000](http://localhost:3000) adresine giderek uygulamayı görüntüleyebilirsiniz.

---

## 🚀 Render.com Ücretsiz Sürümünde Dağıtım (Deployment)

Projeyi Render.com üzerinde ücretsiz olarak yayına almak için:

1. Projeyi kendi **GitHub** hesabınızda yeni bir depoya (repository) yükleyin:
   ```bash
   git init
   git add .
   git commit -m "ilk kurulum: özder satranç topluluğu"
   git remote add origin HESABINIZIN_GITHUB_LINKI
   git branch -M main
   git push -u origin main
   ```

2. [Render.com](https://render.com) adresine giriş yapın ve **New +** butonuna tıklayarak **Web Service** seçeneğini seçin.

3. GitHub deponuzu bağlayın.

4. Yapılandırma ayarlarını aşağıdaki gibi düzenleyin:
   - **Name**: `ozder-chess` (veya dilediğiniz bir isim)
   - **Environment**: `Node`
   - **Region**: Size en yakın bölge (örn. `Frankfurt`)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

5. **Deploy Web Service** butonuna basarak kurulumu tamamlayın. Render size özel ücretsiz bir alt alan adı (`https://ozder-chess.onrender.com`) verecektir.

---

## 🌟 Teknolojiler ve Yapı
- **Frontend**: React, Vite
- **Backend**: Node.js, Express.js
- **Veritabanı**: Taşınabilir JSON Dosya Tabanlı Sistem (SQLite eşdeğeri, sıfır yapılandırma)
- **Tasarım**: Modern Vanilla CSS, Google Fonts (Outfit & Inter)
