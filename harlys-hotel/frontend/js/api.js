// ============================================================
//  api.js — Centralized API calls ke backend Express
// ============================================================

// ============================================================
//  Ganti URL ini setelah backend kamu sudah di-deploy online
//  Contoh: const API_BASE = 'https://harlys-hotel.railway.app/api';
// ============================================================
const API_BASE = 'http://localhost:3007/api';

const API = {

  // ── Tipe Kamar ──────────────────────────────────────────
  async getTipeKamar() {
    const res = await fetch(`${API_BASE}/tipe-kamar`);
    if (!res.ok) throw new Error('Gagal memuat tipe kamar');
    return res.json();
  },

  // ── Kamar Tersedia ───────────────────────────────────────
  async getKamarTersedia(checkIn, checkOut) {
    const res = await fetch(`${API_BASE}/kamar/tersedia?check_in=${checkIn}&check_out=${checkOut}`);
    if (!res.ok) throw new Error('Gagal memuat data kamar');
    return res.json();
  },

  // ── Guest ────────────────────────────────────────────────
  async cariGuest(email) {
    const res = await fetch(`${API_BASE}/guest/cari?email=${encodeURIComponent(email)}`);
    if (res.status === 404) return null; // Tamu belum terdaftar — bukan error fatal
    if (!res.ok) throw new Error('Gagal mencari data tamu');
    return res.json();
  },

  async daftarGuest(data) {
    const res = await fetch(`${API_BASE}/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal mendaftarkan tamu');
    return body;
  },

  // ── Reservasi ────────────────────────────────────────────
  async buatReservasi(data) {
    const res = await fetch(`${API_BASE}/reservasi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal membuat reservasi');
    return body;
  },

  async getTagihan(idReservasi) {
    const res = await fetch(`${API_BASE}/reservasi/${idReservasi}/tagihan`);
    if (!res.ok) throw new Error('Reservasi tidak ditemukan');
    return res.json();
  },

  async getRiwayatReservasi(email) {
    const res = await fetch(`${API_BASE}/reservasi/guest/${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Gagal memuat riwayat reservasi');
    return res.json();
  },

  // ── Pembayaran ───────────────────────────────────────────
  async bayar(data) {
    const res = await fetch(`${API_BASE}/pembayaran`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal melakukan pembayaran');
    return body;
  },

  // ── Dashboard ────────────────────────────────────────────
  async getStatistik() {
    const res = await fetch(`${API_BASE}/dashboard/statistik`);
    if (!res.ok) throw new Error('Gagal memuat statistik');
    return res.json();
  },

};

// ── Helpers ──────────────────────────────────────────────────

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function hitungMalam(checkIn, checkOut) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return Math.round((co - ci) / (1000 * 60 * 60 * 24));
}

function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function getRoomEmoji(namaTipe) {
  if (!namaTipe) return '🛏️';
  const t = namaTipe.toLowerCase();
  if (t.includes('deluxe')) return '👑';
  if (t.includes('double')) return '🛏️';
  if (t.includes('twin'))   return '🛏️';
  return '🏨';
}

// Set min date untuk input tanggal
function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(el => {
    if (el.id.includes('checkout') || el.id.includes('co')) {
      el.min = tomorrow;
    } else {
      el.min = today;
    }
  });
}

// Deteksi apakah sedang di folder pages/ atau root frontend/
function getRoomImage(namaTipe) {
  const isInPages = window.location.pathname.includes('/pages/');
  const base = isInPages ? '../img/' : 'img/';
  if (!namaTipe) return base + 'kamar-standard.jpg';
  const t = namaTipe.toLowerCase();
  if (t.includes('deluxe')) return base + 'kamar-superior-deluxe.jpg';
  if (t.includes('double')) return base + 'kamar-superior-double.jpg';
  if (t.includes('twin'))   return base + 'kamar-superior-twin.jpg';
  return base + 'kamar-standard.jpg';
}
