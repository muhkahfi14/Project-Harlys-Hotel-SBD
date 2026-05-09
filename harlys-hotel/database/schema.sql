-- ============================================================
--  schema.sql — Harlys Hotel Database Schema (PostgreSQL)
--  Jalankan di Supabase: SQL Editor → paste seluruh isi file ini
-- ============================================================

-- ── Hapus tabel lama jika ada (urutan penting!) ─────────────
DROP TABLE IF EXISTS fasilitas        CASCADE;
DROP TABLE IF EXISTS pembayaran       CASCADE;
DROP TABLE IF EXISTS detail_reservasi CASCADE;
DROP TABLE IF EXISTS reservasi        CASCADE;
DROP TABLE IF EXISTS kamar            CASCADE;
DROP TABLE IF EXISTS tipe_kamar       CASCADE;
DROP TABLE IF EXISTS guest            CASCADE;

-- ── TIPE KAMAR ───────────────────────────────────────────────
CREATE TABLE tipe_kamar (
  id_tipe         SERIAL PRIMARY KEY,
  nama_tipe       VARCHAR(50)   NOT NULL,
  harga_per_malam NUMERIC(12,2) NOT NULL,
  kapasitas       INT           NOT NULL DEFAULT 2,
  deskripsi       TEXT
);

-- ── KAMAR ────────────────────────────────────────────────────
CREATE TABLE kamar (
  id_kamar    SERIAL PRIMARY KEY,
  id_tipe     INT NOT NULL REFERENCES tipe_kamar(id_tipe),
  nomor_kamar VARCHAR(10) NOT NULL UNIQUE,
  lantai      INT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'TERSEDIA'
              CHECK (status IN ('TERSEDIA', 'TERISI', 'MAINTENANCE')),
  keterangan  TEXT
);

-- ── GUEST ────────────────────────────────────────────────────
CREATE TABLE guest (
  id_guest        SERIAL PRIMARY KEY,
  nama_lengkap    VARCHAR(100) NOT NULL,
  email           VARCHAR(100) NOT NULL UNIQUE,
  no_telepon      VARCHAR(20),
  no_identitas    VARCHAR(30),
  kewarganegaraan VARCHAR(50) DEFAULT 'Indonesia',
  tanggal_daftar  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── RESERVASI ────────────────────────────────────────────────
CREATE TABLE reservasi (
  id_reservasi      SERIAL PRIMARY KEY,
  id_guest          INT NOT NULL REFERENCES guest(id_guest),
  tanggal_check_in  DATE NOT NULL,
  tanggal_check_out DATE NOT NULL,
  jumlah_tamu       INT NOT NULL DEFAULT 1,
  status_reservasi  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status_reservasi IN ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED')),
  sumber_booking    VARCHAR(20) DEFAULT 'LANGSUNG'
                    CHECK (sumber_booking IN ('LANGSUNG','TELEPON','AGODA','TRAVELOKA','TIKET_COM','LAINNYA')),
  catatan           TEXT,
  tanggal_reservasi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── DETAIL RESERVASI ─────────────────────────────────────────
CREATE TABLE detail_reservasi (
  id_detail       SERIAL PRIMARY KEY,
  id_reservasi    INT NOT NULL REFERENCES reservasi(id_reservasi) ON DELETE CASCADE,
  id_kamar        INT NOT NULL REFERENCES kamar(id_kamar),
  harga_per_malam NUMERIC(12,2) NOT NULL,
  total_malam     INT NOT NULL,
  subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (harga_per_malam * total_malam) STORED
);

-- ── FASILITAS ────────────────────────────────────────────────
CREATE TABLE fasilitas (
  id_fasilitas   SERIAL PRIMARY KEY,
  id_reservasi   INT NOT NULL REFERENCES reservasi(id_reservasi) ON DELETE CASCADE,
  nama_fasilitas VARCHAR(100) NOT NULL,
  biaya          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tanggal        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── PEMBAYARAN ───────────────────────────────────────────────
CREATE TABLE pembayaran (
  id_pembayaran SERIAL PRIMARY KEY,
  id_reservasi  INT NOT NULL REFERENCES reservasi(id_reservasi),
  jumlah_bayar  NUMERIC(12,2) NOT NULL,
  metode_bayar  VARCHAR(20) DEFAULT 'TUNAI'
                CHECK (metode_bayar IN ('TUNAI','TRANSFER','KARTU_KREDIT','KARTU_DEBIT','QRIS')),
  status_bayar  VARCHAR(20) DEFAULT 'LUNAS'
                CHECK (status_bayar IN ('LUNAS','DP','BELUM_BAYAR')),
  tanggal_bayar TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  DATA AWAL (SEED)
-- ============================================================

INSERT INTO tipe_kamar (nama_tipe, harga_per_malam, kapasitas, deskripsi) VALUES
('Standard',        350000, 2, 'Kamar standar dengan fasilitas dasar, cocok untuk perjalanan bisnis singkat.'),
('Superior Twin',   450000, 2, 'Kamar superior dengan 2 tempat tidur single, ideal untuk 2 orang.'),
('Superior Double', 500000, 2, 'Kamar superior dengan 1 tempat tidur double, cocok untuk pasangan.'),
('Superior Deluxe', 650000, 3, 'Kamar deluxe luas dengan pemandangan terbaik dan fasilitas premium.');

INSERT INTO kamar (id_tipe, nomor_kamar, lantai, status) VALUES
(1, '101', 1, 'TERSEDIA'),
(1, '102', 1, 'TERSEDIA'),
(1, '103', 1, 'TERSEDIA'),
(2, '201', 2, 'TERSEDIA'),
(2, '202', 2, 'TERSEDIA'),
(3, '203', 2, 'TERSEDIA'),
(3, '204', 2, 'TERSEDIA'),
(4, '301', 3, 'TERSEDIA'),
(4, '302', 3, 'TERSEDIA'),
(1, '104', 1, 'MAINTENANCE');
