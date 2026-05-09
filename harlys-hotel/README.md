# 🏨 Harlys Residence — Hotel Booking Website

Website booking hotel full-stack dengan Node.js + Express + Oracle DB.

---

## 📁 Struktur Folder

```
harlys-hotel/
├── backend/
│   ├── server.js        ← Express API server
│   ├── db.js            ← Konfigurasi koneksi Oracle
│   └── package.json
└── frontend/
    ├── index.html       ← Homepage
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── api.js       ← Helper fetch ke backend
    │   ├── main.js      ← Logic homepage
    │   └── booking.js   ← Logic halaman booking
    └── pages/
        ├── booking.html       ← Multi-step booking
        └── cek-reservasi.html ← Cek status reservasi
```

---

## ⚙️ Cara Setup & Menjalankan

### 1. Install Node.js
Download di https://nodejs.org (versi 18+ direkomendasikan)

### 2. Install dependencies backend
```bash
cd harlys-hotel/backend
npm install
```

### 3. Konfigurasi koneksi Oracle
Edit file `backend/db.js`, sesuaikan bagian ini:
```js
const dbConfig = {
  user: 'YOUR_USERNAME',       // username Oracle kamu (biasanya: system atau hr)
  password: 'YOUR_PASSWORD',   // password Oracle kamu
  connectString: 'localhost/XE', // sesuaikan dengan service name Oracle-mu
};
```

> **Tips cek connectString:**
> Di SQL Developer → klik kanan koneksi → Properties
> - Hostname: biasanya `localhost`
> - Port: biasanya `1521`
> - Service Name: biasanya `XE` atau `ORCL`
> - Format: `hostname:port/servicename` → contoh: `localhost:1521/XE`

### 4. (Opsional) Oracle Instant Client
Jika muncul error `DPI-1047` saat start server, kamu perlu Oracle Instant Client:
1. Download di: https://www.oracle.com/database/technologies/instant-client/downloads.html
2. Extract ke folder, misal: `C:\oracle\instantclient_21_3`
3. Uncomment baris ini di `db.js`:
```js
oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_3' });
```

### 5. Jalankan backend server
```bash
cd harlys-hotel/backend
node server.js
```
Seharusnya muncul:
```
🏨  Harlys Residence API
✅  Server berjalan di http://localhost:3000
```

### 6. Buka website
Buka file `frontend/index.html` langsung di browser.
> Double-click file-nya, atau drag ke Chrome/Firefox.

---

## 🌐 Halaman Website

| Halaman | File | Fitur |
|---------|------|-------|
| Homepage | `index.html` | Tampilan hotel, grid tipe kamar, search kamar |
| Booking | `pages/booking.html` | Multi-step: pilih kamar → data tamu → bayar → selesai |
| Cek Reservasi | `pages/cek-reservasi.html` | Cari by ID reservasi atau by email tamu |

---

## 🔌 API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/tipe-kamar` | Semua tipe kamar |
| GET | `/api/kamar/tersedia?check_in=&check_out=` | Kamar tersedia |
| GET | `/api/guest/cari?email=` | Cari tamu by email |
| POST | `/api/guest` | Daftar tamu baru |
| POST | `/api/reservasi` | Buat reservasi |
| GET | `/api/reservasi/:id/tagihan` | Detail tagihan |
| GET | `/api/reservasi/guest/:email` | Riwayat reservasi |
| POST | `/api/pembayaran` | Proses pembayaran |
| GET | `/api/dashboard/statistik` | Statistik ringkasan |

---

## ❓ Troubleshooting

**Error: Cannot connect to Oracle**
→ Pastikan Oracle Database sudah running di SQL Developer

**Error: CORS**
→ Pastikan backend sudah jalan di `localhost:3000`

**Kamar tidak muncul di homepage**
→ Cek apakah seed data sudah di-run (INSERT tipe kamar & kamar)
