// ============================================================
//  booking.js — Multi-step booking flow logic
// ============================================================

let state = {
  checkIn: null,
  checkOut: null,
  jumlahTamu: 2,
  selectedKamar: null,
  guest: null,         // { id_guest, nama_lengkap, email, ... }
  isNewGuest: false,
  idReservasi: null,
  grandTotal: 0,
  metodeBayar: null,
};

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setMinDates();

  // Ambil parameter dari URL jika dari homepage search
  const params = new URLSearchParams(window.location.search);
  if (params.get('check_in')) {
    document.getElementById('b-checkin').value = params.get('check_in');
    document.getElementById('b-checkout').value = params.get('check_out');
    document.getElementById('b-tamu').value = params.get('tamu') || 2;
    cariKamar();
  }
});

// ─── STEP NAVIGATION ──────────────────────────────────────
function goToStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active');
    if (i + 1 < n) s.classList.add('done');
    else s.classList.remove('done');
  });
  document.getElementById(`panel-${n}`).classList.add('active');
  document.getElementById(`step-ind-${n}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep2() {
  if (!state.selectedKamar) {
    showToast('Pilih kamar terlebih dahulu', 'error');
    return;
  }
  if (!state.checkIn || !state.checkOut) {
    showToast('Masukkan tanggal check-in dan check-out', 'error');
    return;
  }
  goToStep(2);
}

async function goToStep3() {
  const email = document.getElementById('g-email').value.trim();
  if (!email) { showToast('Email wajib diisi', 'error'); return; }

  // Kalau guest belum dicek, paksa cek dulu
  if (!state.guest && !state.isNewGuest) {
    showToast('Klik tombol "Cek" untuk verifikasi email', 'error');
    return;
  }

  // Validasi form jika tamu baru
  if (state.isNewGuest) {
    const nama = document.getElementById('g-nama').value.trim();
    if (!nama) { showToast('Nama lengkap wajib diisi', 'error'); return; }
  }

  // Buat reservasi di DB
  const btn = document.querySelector('#panel-2 .btn-primary');
  btn.textContent = 'Memproses...';
  btn.disabled = true;

  try {
    // 1. Daftarkan tamu baru jika perlu
    if (state.isNewGuest) {
      const guestData = {
        nama_lengkap:   document.getElementById('g-nama').value.trim(),
        email,
        no_telepon:     document.getElementById('g-telp').value.trim(),
        no_identitas:   document.getElementById('g-identitas').value.trim(),
        kewarganegaraan: document.getElementById('g-warga').value.trim() || 'Indonesia',
      };
      state.guest = await API.daftarGuest(guestData);
      showToast('Data tamu berhasil didaftarkan', 'success');
    }

    // 2. Buat reservasi
    const jumlahMalam = hitungMalam(state.checkIn, state.checkOut);
    const res = await API.buatReservasi({
      id_guest: state.guest.ID_GUEST || state.guest.id_guest,
      tanggal_check_in: state.checkIn,
      tanggal_check_out: state.checkOut,
      jumlah_tamu: state.jumlahTamu,
      sumber_booking: document.getElementById('g-sumber').value,
      catatan: document.getElementById('g-catatan').value.trim(),
      kamar_list: [{
        id_kamar: state.selectedKamar.ID_KAMAR || state.selectedKamar.id_kamar,
        harga_per_malam: state.selectedKamar.HARGA_PER_MALAM || state.selectedKamar.harga_per_malam,
      }]
    });

    state.idReservasi = res.id_reservasi;
    state.grandTotal = (state.selectedKamar.HARGA_PER_MALAM || state.selectedKamar.harga_per_malam) * jumlahMalam;

    renderTagihanPreview();
    goToStep(3);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Lanjut →';
    btn.disabled = false;
  }
}

// ─── CARI KAMAR ──────────────────────────────────────────
async function cariKamar() {
  const ci = document.getElementById('b-checkin').value;
  const co = document.getElementById('b-checkout').value;
  const tamu = parseInt(document.getElementById('b-tamu').value);

  if (!ci || !co) { showToast('Masukkan tanggal check-in dan check-out', 'error'); return; }
  if (new Date(co) <= new Date(ci)) { showToast('Check-out harus setelah check-in', 'error'); return; }

  state.checkIn = ci;
  state.checkOut = co;
  state.jumlahTamu = tamu;

  const container = document.getElementById('kamar-list');
  container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Mencari kamar tersedia...</p></div>`;

  try {
    const kamarList = await API.getKamarTersedia(ci, co);
    renderKamarList(kamarList);
    updateSummary();
  } catch (err) {
    container.innerHTML = `<div class="loading"><p style="color:var(--error)">${err.message}</p></div>`;
  }
}

function renderKamarList(list) {
  const container = document.getElementById('kamar-list');
  if (!list.length) {
    container.innerHTML = `<div class="loading"><p>Tidak ada kamar tersedia untuk tanggal yang dipilih.</p></div>`;
    return;
  }

  const malam = hitungMalam(state.checkIn, state.checkOut);
  container.innerHTML = `
    <p style="color:var(--text-light);margin-bottom:16px;font-size:13px;">
      ${list.length} kamar tersedia · ${malam} malam
    </p>
    <div class="available-rooms" id="avail-rooms"></div>
  `;

  const grid = document.getElementById('avail-rooms');
  list.forEach(kamar => {
    const div = document.createElement('div');
    div.className = 'avail-room-card';
    div.dataset.id = kamar.ID_KAMAR;
    div.innerHTML = `
      <div class="avail-room-img"><img src="${getRoomImage(kamar.NAMA_TIPE)}" alt="${kamar.NAMA_TIPE}" onerror="this.parentElement.innerHTML='🛏️'" /></div>
      <div class="avail-room-info">
        <div class="room-badge">${kamar.NAMA_TIPE}</div>
        <div class="avail-room-name">Kamar ${kamar.NOMOR_KAMAR}</div>
        <div class="avail-room-detail">Lantai ${kamar.LANTAI} · Maks. ${kamar.KAPASITAS} tamu</div>
      </div>
      <div>
        <div class="avail-room-price">
          ${formatRupiah(kamar.HARGA_PER_MALAM)}<span>/malam</span>
        </div>
        <div style="font-size:12px;color:var(--text-light);text-align:right;margin-top:4px;">
          Total: ${formatRupiah(kamar.HARGA_PER_MALAM * malam)}
        </div>
      </div>
    `;
    div.addEventListener('click', () => selectKamar(kamar, div));
    grid.appendChild(div);
  });
}

function selectKamar(kamar, el) {
  document.querySelectorAll('.avail-room-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedKamar = kamar;
  updateSummary();
}

// ─── CEK / DAFTAR GUEST ──────────────────────────────────
async function cekGuest() {
  const email = document.getElementById('g-email').value.trim();
  if (!email) { showToast('Masukkan email terlebih dahulu', 'error'); return; }

  try {
    const guest = await API.cariGuest(email);
    const form = document.getElementById('guest-form');
    form.style.display = 'block';

    if (guest) {
      // Tamu sudah terdaftar — isi form dengan data lama (readonly)
      state.guest = guest;
      state.isNewGuest = false;
      document.getElementById('g-nama').value = guest.NAMA_LENGKAP || '';
      document.getElementById('g-telp').value = guest.NO_TELEPON || '';
      document.getElementById('g-identitas').value = guest.NO_IDENTITAS || '';
      document.getElementById('g-warga').value = guest.KEWARGANEGARAAN || 'Indonesia';
      ['g-nama','g-telp','g-identitas','g-warga'].forEach(id => {
        document.getElementById(id).readOnly = true;
        document.getElementById(id).style.background = 'var(--cream)';
      });
      showToast(`Selamat datang kembali, ${guest.NAMA_LENGKAP}!`, 'success');
    } else {
      // Tamu baru — form kosong, bisa diisi
      state.guest = null;
      state.isNewGuest = true;
      ['g-nama','g-telp','g-identitas','g-warga'].forEach(id => {
        document.getElementById(id).readOnly = false;
        document.getElementById(id).style.background = '';
        document.getElementById(id).value = '';
      });
      document.getElementById('g-warga').value = 'Indonesia';
      showToast('Email belum terdaftar. Silakan lengkapi data Anda.', 'info');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── PEMBAYARAN ───────────────────────────────────────────
function pilihMetode(el) {
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  state.metodeBayar = el.dataset.value;
}

function renderTagihanPreview() {
  const el = document.getElementById('tagihan-preview');
  const malam = hitungMalam(state.checkIn, state.checkOut);
  const harga = state.selectedKamar.HARGA_PER_MALAM || state.selectedKamar.harga_per_malam;
  const nama = state.selectedKamar.NAMA_TIPE || state.selectedKamar.nama_tipe;

  el.innerHTML = `
    <div style="background:var(--cream);border-radius:var(--radius-lg);padding:24px;">
      <div style="font-family:var(--font-display);font-size:18px;margin-bottom:16px;color:var(--dark);">
        Detail Tagihan
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>ID Reservasi</span><span style="font-weight:600;">#${state.idReservasi}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>Kamar</span><span>${nama} · No. ${state.selectedKamar.NOMOR_KAMAR || '-'}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>Check-In</span><span>${formatTanggal(state.checkIn)}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>Check-Out</span><span>${formatTanggal(state.checkOut)}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>${formatRupiah(harga)} × ${malam} malam</span><span>${formatRupiah(harga * malam)}</span>
      </div>
      <div class="summary-item total" style="color:var(--dark);border-top:1px solid var(--border);padding-top:16px;margin-top:8px;">
        <span style="font-weight:600;">Total Pembayaran</span>
        <span style="color:var(--gold);font-family:var(--font-display);font-size:24px;">${formatRupiah(state.grandTotal)}</span>
      </div>
    </div>
  `;
}

async function prosesBayar() {
  if (!state.metodeBayar) { showToast('Pilih metode pembayaran', 'error'); return; }

  const btn = document.querySelector('#panel-3 .btn-primary');
  btn.textContent = 'Memproses...';
  btn.disabled = true;

  try {
    await API.bayar({
      id_reservasi: state.idReservasi,
      jumlah_bayar: state.grandTotal,
      metode_bayar: state.metodeBayar,
      status_bayar: 'LUNAS',
    });

    // Tampilkan detail sukses
    const guestNama = state.guest?.NAMA_LENGKAP || state.guest?.nama_lengkap || '';
    document.getElementById('success-detail').innerHTML = `
      <div class="summary-item" style="color:var(--text);">
        <span>ID Reservasi</span><span style="font-weight:600;">#${state.idReservasi}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>Nama Tamu</span><span>${guestNama}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>Check-In</span><span>${formatTanggal(state.checkIn)}</span>
      </div>
      <div class="summary-item" style="color:var(--text);">
        <span>Check-Out</span><span>${formatTanggal(state.checkOut)}</span>
      </div>
      <div class="summary-item" style="color:var(--text);padding-top:12px;border-top:1px solid var(--border);margin-top:8px;">
        <span style="font-weight:600;">Total Dibayar</span>
        <span style="color:var(--gold);font-family:var(--font-display);font-size:22px;">${formatRupiah(state.grandTotal)}</span>
      </div>
    `;

    goToStep(4);
    showToast('Pembayaran berhasil! Reservasi dikonfirmasi.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Bayar & Konfirmasi';
    btn.disabled = false;
  }
}

// ─── SUMMARY SIDEBAR ──────────────────────────────────────
function updateSummary() {
  const el = document.getElementById('summary-content');
  if (!state.selectedKamar || !state.checkIn || !state.checkOut) {
    el.innerHTML = `<div class="summary-empty">Belum ada kamar dipilih</div>`;
    return;
  }

  const malam = hitungMalam(state.checkIn, state.checkOut);
  const harga = state.selectedKamar.HARGA_PER_MALAM || state.selectedKamar.harga_per_malam;
  const nama = state.selectedKamar.NAMA_TIPE || state.selectedKamar.nama_tipe;

  el.innerHTML = `
    <div class="summary-item">
      <span>Kamar</span>
      <span>${nama}</span>
    </div>
    <div class="summary-item">
      <span>Check-In</span>
      <span>${formatTanggal(state.checkIn)}</span>
    </div>
    <div class="summary-item">
      <span>Check-Out</span>
      <span>${formatTanggal(state.checkOut)}</span>
    </div>
    <div class="summary-item">
      <span>Durasi</span>
      <span>${malam} malam</span>
    </div>
    <div class="summary-item">
      <span>Tamu</span>
      <span>${state.jumlahTamu} orang</span>
    </div>
    <div class="summary-item total">
      <span>Estimasi Total</span>
      <span>${formatRupiah(harga * malam)}</span>
    </div>
  `;
}
