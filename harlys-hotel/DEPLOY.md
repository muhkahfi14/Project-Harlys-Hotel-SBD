# 🚀 Panduan Upload ke GitHub & Deploy Online
## Harlys Hotel — Node.js + Oracle DB

---

## ✅ Apa yang Sudah Disiapkan

| File | Keterangan |
|------|-----------|
| `.gitignore` | Mencegah `node_modules` dan `.env` terupload ke GitHub |
| `backend/.env` | Menyimpan password database (JANGAN di-commit!) |
| `backend/.env.example` | Template `.env` yang aman untuk di-commit |
| `backend/db.js` | Sudah diubah — baca kredensial dari `.env` |
| `backend/server.js` | Sudah diubah — PORT, CORS, dan DB dari `.env` |

---

## 📁 TAHAP 1 — Upload ke GitHub

### 1.1 Buat Repository Baru di GitHub
1. Buka [github.com](https://github.com) → login
2. Klik tombol **"New"** (hijau) di pojok kiri atas
3. Isi:
   - **Repository name**: `harlys-hotel`
   - Pilih **Public** atau **Private**
   - ❌ Jangan centang "Initialize with README"
4. Klik **"Create repository"**

### 1.2 Push dari Komputermu
Buka terminal/CMD, masuk ke folder `harlys-hotel`:

```bash
cd path/ke/folder/harlys-hotel

# Inisialisasi git
git init

# Tambahkan semua file (node_modules dan .env otomatis diabaikan)
git add .

# Commit pertama
git commit -m "Initial commit - Harlys Hotel"

# Rename branch ke main
git branch -M main

# Sambungkan ke GitHub (ganti USERNAME dengan username GitHub kamu)
git remote add origin https://github.com/USERNAME/harlys-hotel.git

# Upload!
git push -u origin main
```

### ✔️ Cek apakah berhasil
Buka `https://github.com/USERNAME/harlys-hotel` — kamu harusnya melihat file proyek tanpa folder `node_modules`.

---

## ☁️ TAHAP 2 — Deploy Online

### Arsitektur Deploy

```
[Browser Pengguna]
       │
       ▼
[Frontend — Vercel/GitHub Pages]  ──→  [Backend — Railway]  ──→  [Oracle Cloud DB]
 HTML / CSS / JS                         Node.js + Express          Oracle ATP Free
```

---

### 🎨 Deploy Frontend (Vercel) — GRATIS

1. Buka [vercel.com](https://vercel.com) → login dengan akun GitHub
2. Klik **"Add New Project"**
3. Import repository `harlys-hotel`
4. Di bagian **"Root Directory"**, set ke `frontend`
5. Klik **Deploy**

Kamu akan dapat URL seperti: `https://harlys-hotel.vercel.app`

---

### ⚙️ Deploy Backend (Railway) — GRATIS (ada free tier)

1. Buka [railway.app](https://railway.app) → login dengan GitHub
2. Klik **"New Project"** → **"Deploy from GitHub repo"**
3. Pilih `harlys-hotel`
4. Set **Root Directory** ke `backend`
5. Tambahkan **Environment Variables** (klik tab "Variables"):
   ```
   DB_USER         = SYSTEM
   DB_PASSWORD     = (password Oracle Cloud kamu nanti)
   DB_CONNECT_STRING = (connection string Oracle Cloud kamu nanti)
   PORT            = 3007
   FRONTEND_URL    = https://harlys-hotel.vercel.app
   ```
6. Railway akan otomatis menjalankan `npm start`

Kamu akan dapat URL seperti: `https://harlys-hotel.railway.app`

---

### 🗄️ Database Oracle Cloud (GRATIS Selamanya!)

1. Daftar di [cloud.oracle.com](https://cloud.oracle.com) (butuh kartu kredit, tapi tidak ditagih)
2. Buat **Autonomous Transaction Processing (ATP)** → pilih tier **Always Free**
3. Download **Wallet** (file zip koneksi database)
4. Dari wallet, ambil `connection string` dan masukkan ke Railway environment variables

---

### 🔗 Update URL Backend di Frontend

Setelah backend Railway-mu aktif, buka file:
`frontend/js/api.js`

Ubah baris ini:
```javascript
const API_BASE = 'http://localhost:3007/api';
```
Menjadi:
```javascript
const API_BASE = 'https://harlys-hotel.railway.app/api';
```

Lalu commit dan push lagi — Vercel akan otomatis update.

---

## 🔒 Keamanan Penting

- ❌ **Jangan pernah** commit file `.env` ke GitHub
- ✅ Gunakan **Environment Variables** di Railway untuk menyimpan password
- ✅ File `.env.example` boleh di-commit sebagai template
- 🔄 Ganti password Oracle default (`UjangInam2521`) dengan password yang lebih kuat

---

## 📞 Butuh Bantuan?

Tanya ke Claude di [claude.ai](https://claude.ai) jika mengalami error saat deploy!
