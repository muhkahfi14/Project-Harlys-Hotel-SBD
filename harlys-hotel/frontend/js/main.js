// ============================================================
//  main.js — Homepage logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setMinDates();
  loadRoomsGrid();
});

// ── Load tipe kamar di homepage ───────────────────────────
async function loadRoomsGrid() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;

  try {
    const tipeKamar = await API.getTipeKamar();
    grid.innerHTML = '';

    tipeKamar.forEach((tipe, i) => {
      const imgSrc = getRoomImage(tipe.NAMA_TIPE); // pakai dari api.js
      const card = document.createElement('div');
      card.className = 'room-card';
      card.style.animationDelay = `${i * 0.1}s`;
      card.innerHTML = `
        <div class="room-card-img">
          <img src="${imgSrc}" alt="${tipe.NAMA_TIPE}" onerror="this.parentElement.innerHTML='🛏️'" />
        </div>
        <div class="room-card-body">
          <div class="room-card-type">Kamar</div>
          <div class="room-card-name">${tipe.NAMA_TIPE}</div>
          <div class="room-card-desc">${tipe.DESKRIPSI || ''}</div>
          <div class="room-card-footer">
            <div class="room-price">
              ${formatRupiah(tipe.HARGA_PER_MALAM)}<span>/malam</span>
            </div>
            <div class="room-cap">👤 Maks. ${tipe.KAPASITAS} tamu</div>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        window.location.href = 'pages/booking.html';
      });
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="loading" style="grid-column:1/-1">
      <p>Tidak bisa terhubung ke server.<br/>Pastikan backend sudah berjalan di localhost:3007</p>
    </div>`;
  }
}

// ── Search form di homepage ───────────────────────────────
function searchRooms(e) {
  e.preventDefault();
  const ci = document.getElementById('s-checkin').value;
  const co = document.getElementById('s-checkout').value;
  const tamu = document.getElementById('s-tamu').value;

  if (new Date(co) <= new Date(ci)) {
    showToast('Tanggal check-out harus setelah check-in', 'error');
    return;
  }

  window.location.href = `pages/booking.html?check_in=${ci}&check_out=${co}&tamu=${tamu}`;
}
