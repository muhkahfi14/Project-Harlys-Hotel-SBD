// ─────────────────────────────────────────────────────────────────
//  server.js — Harlys Residence Hotel Backend
//  PostgreSQL (Supabase) via pg | Express
//  Jalankan: node server.js
// ─────────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3007;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ─── Koneksi PostgreSQL (Supabase) ───────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // wajib untuk Supabase
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// ─── Health check ─────────────────────────────────────────────────
app.get('/', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', message: 'Harlys Residence API — PostgreSQL terhubung ✓', port: PORT });
  } catch (e) {
    res.status(500).json({ status: 'error', message: 'Koneksi DB gagal: ' + e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/dashboard/statistik
app.get('/api/dashboard/statistik', async (req, res) => {
  try {
    const rPend = await query(`
      SELECT COALESCE(SUM(jumlah_bayar), 0) AS pendapatan_bulan_ini
      FROM pembayaran
      WHERE status_bayar = 'LUNAS'
      AND DATE_TRUNC('month', tanggal_bayar) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    const rKamar = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'TERISI'      THEN 1 ELSE 0 END) AS terisi,
        SUM(CASE WHEN status = 'TERSEDIA'    THEN 1 ELSE 0 END) AS tersedia,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance
      FROM kamar
    `);
    const rRes = await query(`
      SELECT COUNT(*) AS reservasi_aktif
      FROM reservasi
      WHERE status_reservasi IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
    `);
    const rTamu = await query(`SELECT COUNT(*) AS total_tamu FROM guest`);

    const kamarRow = rKamar.rows[0];
    res.json({
      pendapatan_bulan_ini : parseFloat(rPend.rows[0].pendapatan_bulan_ini),
      reservasi_aktif      : parseInt(rRes.rows[0].reservasi_aktif),
      total_tamu           : parseInt(rTamu.rows[0].total_tamu),
      kamar: {
        TOTAL      : parseInt(kamarRow.total),
        TERISI     : parseInt(kamarRow.terisi),
        TERSEDIA   : parseInt(kamarRow.tersedia),
        MAINTENANCE: parseInt(kamarRow.maintenance),
      },
    });
  } catch (e) {
    console.error('/api/dashboard/statistik error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dashboard/kamar-terisi
app.get('/api/dashboard/kamar-terisi', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        k.nomor_kamar,
        t.nama_tipe,
        g.nama_lengkap,
        r.id_reservasi,
        r.tanggal_check_in,
        r.tanggal_check_out
      FROM kamar k
      JOIN detail_reservasi d ON k.id_kamar    = d.id_kamar
      JOIN reservasi r        ON d.id_reservasi = r.id_reservasi
      JOIN guest g            ON r.id_guest     = g.id_guest
      JOIN tipe_kamar t       ON k.id_tipe      = t.id_tipe
      WHERE r.status_reservasi = 'CHECKED_IN'
      AND CURRENT_DATE BETWEEN r.tanggal_check_in AND r.tanggal_check_out
      ORDER BY r.tanggal_check_out
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/dashboard/kamar-terisi error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dashboard/pendapatan
app.get('/api/dashboard/pendapatan', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        TO_CHAR(tanggal_bayar, 'YYYY-MM') AS bulan,
        COUNT(DISTINCT id_reservasi)       AS jumlah_reservasi,
        SUM(jumlah_bayar)                  AS total_pendapatan
      FROM pembayaran
      WHERE status_bayar = 'LUNAS'
      GROUP BY TO_CHAR(tanggal_bayar, 'YYYY-MM')
      ORDER BY bulan DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/dashboard/pendapatan error:', e);
    res.status(500).json({ error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  GUEST ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/guest/cari?email=xxx
app.get('/api/guest/cari', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Parameter email wajib diisi' });
  try {
    const result = await query(
      `SELECT id_guest, nama_lengkap, email, no_telepon, no_identitas, kewarganegaraan, tanggal_daftar
       FROM guest WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Tamu tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('/api/guest/cari error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/guest
app.post('/api/guest', async (req, res) => {
  const { nama_lengkap, email, no_telepon, no_identitas, kewarganegaraan } = req.body;
  if (!nama_lengkap || !email) return res.status(400).json({ error: 'nama_lengkap dan email wajib diisi' });
  try {
    // Cek apakah email sudah ada
    const cek = await query(`SELECT * FROM guest WHERE LOWER(email) = LOWER($1)`, [email]);
    if (cek.rows.length > 0) return res.json(cek.rows[0]);

    const result = await query(
      `INSERT INTO guest (nama_lengkap, email, no_telepon, no_identitas, kewarganegaraan)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'Indonesia'))
       RETURNING *`,
      [nama_lengkap, email, no_telepon || null, no_identitas || null, kewarganegaraan || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error('/api/guest POST error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/reservasi/guest/:email
app.get('/api/reservasi/guest/:email', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        r.id_reservasi,
        r.tanggal_check_in,
        r.tanggal_check_out,
        r.status_reservasi,
        COALESCE(SUM(d.subtotal), 0) AS total_kamar
      FROM reservasi r
      JOIN guest g               ON r.id_guest    = g.id_guest
      LEFT JOIN detail_reservasi d ON r.id_reservasi = d.id_reservasi
      WHERE LOWER(g.email) = LOWER($1)
      GROUP BY r.id_reservasi, r.tanggal_check_in, r.tanggal_check_out, r.status_reservasi
      ORDER BY r.id_reservasi DESC
    `, [req.params.email]);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/reservasi/guest error:', e);
    res.status(500).json({ error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  RESERVASI ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/reservasi
app.get('/api/reservasi', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        r.id_reservasi,
        g.nama_lengkap,
        g.email,
        k.nomor_kamar,
        t.nama_tipe,
        r.tanggal_check_in,
        r.tanggal_check_out,
        r.status_reservasi,
        COALESCE(SUM(d.subtotal), 0) AS total_kamar
      FROM reservasi r
      JOIN guest g                ON r.id_guest    = g.id_guest
      LEFT JOIN detail_reservasi d ON r.id_reservasi = d.id_reservasi
      LEFT JOIN kamar k            ON d.id_kamar    = k.id_kamar
      LEFT JOIN tipe_kamar t       ON k.id_tipe     = t.id_tipe
      GROUP BY r.id_reservasi, g.nama_lengkap, g.email,
               k.nomor_kamar, t.nama_tipe,
               r.tanggal_check_in, r.tanggal_check_out, r.status_reservasi
      ORDER BY r.id_reservasi DESC
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/reservasi GET error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/reservasi
app.post('/api/reservasi', async (req, res) => {
  const { id_guest, tanggal_check_in, tanggal_check_out, jumlah_tamu, sumber_booking, catatan, kamar_list } = req.body;
  if (!id_guest || !tanggal_check_in || !tanggal_check_out)
    return res.status(400).json({ error: 'id_guest, tanggal_check_in, tanggal_check_out wajib diisi' });
  if (!kamar_list || !kamar_list.length)
    return res.status(400).json({ error: 'kamar_list tidak boleh kosong' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ci = new Date(tanggal_check_in);
    const co = new Date(tanggal_check_out);
    const totalMalam = Math.round((co - ci) / (1000 * 60 * 60 * 24));
    if (totalMalam <= 0) return res.status(400).json({ error: 'tanggal_check_out harus setelah tanggal_check_in' });

    const validSumber = ['LANGSUNG', 'TELEPON', 'AGODA', 'TRAVELOKA', 'TIKET_COM', 'LAINNYA'];
    const sumber = validSumber.includes(sumber_booking) ? sumber_booking : 'LAINNYA';

    const rsvResult = await client.query(
      `INSERT INTO reservasi (id_guest, tanggal_check_in, tanggal_check_out, jumlah_tamu, sumber_booking, catatan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_reservasi`,
      [id_guest, tanggal_check_in, tanggal_check_out, jumlah_tamu || 1, sumber, catatan || null]
    );
    const idReservasi = rsvResult.rows[0].id_reservasi;

    for (const kamar of kamar_list) {
      await client.query(
        `INSERT INTO detail_reservasi (id_reservasi, id_kamar, harga_per_malam, total_malam)
         VALUES ($1, $2, $3, $4)`,
        [idReservasi, kamar.id_kamar, kamar.harga_per_malam, totalMalam]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, id_reservasi: idReservasi });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('/api/reservasi POST error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// GET /api/reservasi/:id/tagihan
app.get('/api/reservasi/:id/tagihan', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        r.id_reservasi,
        g.nama_lengkap,
        g.email,
        r.tanggal_check_in,
        r.tanggal_check_out,
        r.status_reservasi,
        COALESCE(SUM(d.subtotal), 0) AS total_kamar,
        COALESCE((SELECT SUM(f.biaya) FROM fasilitas f WHERE f.id_reservasi = r.id_reservasi), 0) AS total_fasilitas,
        COALESCE(SUM(d.subtotal), 0)
          + COALESCE((SELECT SUM(f.biaya) FROM fasilitas f WHERE f.id_reservasi = r.id_reservasi), 0) AS grand_total
      FROM reservasi r
      JOIN guest g               ON r.id_guest    = g.id_guest
      LEFT JOIN detail_reservasi d ON r.id_reservasi = d.id_reservasi
      WHERE r.id_reservasi = $1
      GROUP BY r.id_reservasi, g.nama_lengkap, g.email,
               r.tanggal_check_in, r.tanggal_check_out, r.status_reservasi
    `, [parseInt(req.params.id)]);

    if (!result.rows.length) return res.status(404).json({ error: 'Reservasi tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('/api/reservasi/:id/tagihan error:', e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH status reservasi
async function updateStatusReservasi(req, res, newStatus) {
  try {
    const result = await query(
      `UPDATE reservasi SET status_reservasi = $1 WHERE id_reservasi = $2`,
      [newStatus, parseInt(req.params.id)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Reservasi tidak ditemukan' });

    // Update status kamar otomatis
    if (newStatus === 'CHECKED_IN') {
      await query(`
        UPDATE kamar SET status = 'TERISI'
        WHERE id_kamar IN (SELECT id_kamar FROM detail_reservasi WHERE id_reservasi = $1)
      `, [parseInt(req.params.id)]);
    } else if (newStatus === 'CHECKED_OUT' || newStatus === 'CANCELLED') {
      await query(`
        UPDATE kamar SET status = 'TERSEDIA'
        WHERE id_kamar IN (SELECT id_kamar FROM detail_reservasi WHERE id_reservasi = $1)
      `, [parseInt(req.params.id)]);
    }

    res.json({ success: true, id_reservasi: parseInt(req.params.id), status: newStatus });
  } catch (e) {
    console.error(`PATCH reservasi status error:`, e);
    res.status(500).json({ error: e.message });
  }
}

app.patch('/api/reservasi/:id/konfirmasi', (req, res) => updateStatusReservasi(req, res, 'CONFIRMED'));
app.patch('/api/reservasi/:id/checkin',    (req, res) => updateStatusReservasi(req, res, 'CHECKED_IN'));
app.patch('/api/reservasi/:id/checkout',   (req, res) => updateStatusReservasi(req, res, 'CHECKED_OUT'));
app.patch('/api/reservasi/:id/batal',      (req, res) => updateStatusReservasi(req, res, 'CANCELLED'));


// ═══════════════════════════════════════════════════════════════════
//  KAMAR ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/kamar/tersedia?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
app.get('/api/kamar/tersedia', async (req, res) => {
  const { check_in, check_out } = req.query;
  if (!check_in || !check_out) return res.status(400).json({ error: 'check_in dan check_out wajib diisi' });
  try {
    const result = await query(`
      SELECT
        k.id_kamar,
        k.nomor_kamar,
        k.lantai,
        t.nama_tipe,
        t.harga_per_malam,
        t.kapasitas
      FROM kamar k
      JOIN tipe_kamar t ON k.id_tipe = t.id_tipe
      WHERE k.status = 'TERSEDIA'
      AND k.id_kamar NOT IN (
        SELECT d.id_kamar
        FROM detail_reservasi d
        JOIN reservasi r ON d.id_reservasi = r.id_reservasi
        WHERE r.status_reservasi IN ('CONFIRMED', 'CHECKED_IN')
        AND NOT (
          r.tanggal_check_out <= $1::date OR
          r.tanggal_check_in  >= $2::date
        )
      )
      ORDER BY t.harga_per_malam, k.nomor_kamar
    `, [check_in, check_out]);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/kamar/tersedia error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/kamar
app.get('/api/kamar', async (req, res) => {
  try {
    const result = await query(`
      SELECT k.id_kamar, k.nomor_kamar, k.lantai, k.status, k.keterangan,
             t.nama_tipe, t.harga_per_malam, t.kapasitas
      FROM kamar k
      JOIN tipe_kamar t ON k.id_tipe = t.id_tipe
      ORDER BY k.nomor_kamar
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/kamar error:', e);
    res.status(500).json({ error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  TIPE KAMAR ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/tipe-kamar', async (req, res) => {
  try {
    const result = await query(`
      SELECT id_tipe, nama_tipe, harga_per_malam, kapasitas, deskripsi
      FROM tipe_kamar
      ORDER BY harga_per_malam
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/tipe-kamar error:', e);
    res.status(500).json({ error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  PEMBAYARAN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// POST /api/pembayaran
app.post('/api/pembayaran', async (req, res) => {
  const { id_reservasi, jumlah_bayar, metode_bayar, status_bayar } = req.body;
  if (!id_reservasi || !jumlah_bayar || !metode_bayar)
    return res.status(400).json({ error: 'id_reservasi, jumlah_bayar, dan metode_bayar wajib diisi' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cekRes = await client.query(
      `SELECT id_reservasi, status_reservasi FROM reservasi WHERE id_reservasi = $1`,
      [parseInt(id_reservasi)]
    );
    if (!cekRes.rows.length) return res.status(404).json({ error: 'Reservasi tidak ditemukan' });

    const statusBayar = status_bayar || 'LUNAS';
    const result = await client.query(
      `INSERT INTO pembayaran (id_reservasi, jumlah_bayar, metode_bayar, status_bayar, tanggal_bayar)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id_pembayaran`,
      [parseInt(id_reservasi), parseFloat(jumlah_bayar), metode_bayar || 'TUNAI', statusBayar]
    );

    if (statusBayar === 'LUNAS') {
      await client.query(
        `UPDATE reservasi SET status_reservasi = 'CONFIRMED'
         WHERE id_reservasi = $1 AND status_reservasi = 'PENDING'`,
        [parseInt(id_reservasi)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      id_pembayaran: result.rows[0].id_pembayaran,
      id_reservasi: parseInt(id_reservasi),
      status_bayar: statusBayar,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('/api/pembayaran POST error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// GET /api/pembayaran/:id_reservasi
app.get('/api/pembayaran/:id_reservasi', async (req, res) => {
  try {
    const result = await query(`
      SELECT id_pembayaran, id_reservasi, jumlah_bayar, metode_bayar, status_bayar, tanggal_bayar
      FROM pembayaran
      WHERE id_reservasi = $1
      ORDER BY tanggal_bayar DESC
    `, [parseInt(req.params.id_reservasi)]);
    res.json(result.rows);
  } catch (e) {
    console.error('/api/pembayaran GET error:', e);
    res.status(500).json({ error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Harlys Residence API — PORT ${PORT}           ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  console.log(`  Health : http://localhost:${PORT}/`);
  console.log(`  Stats  : http://localhost:${PORT}/api/dashboard/statistik\n`);
});
