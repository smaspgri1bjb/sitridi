// ============================================================
// APP.JS - CORE FRONTEND ENGINE
// Tracer Study SMAS PGRI 1 Banjarbaru
// ============================================================

// --- INITIAL STATE ---
let currentCaptcha = "";
let activeAlumniSession = null;
let currentSelectedStatus = "";
let parsedCSVData = [];
let chartInstances = {};

// Default Local Storage Keys
const GAS_URL_KEY = "TRACER_PGRI1_GAS_URL";
const DEFAULT_PIN = "123456";

// Offline Seed Database (Fallback when GAS URL is not yet connected)
let localDatabase = {
  alumni: [
    { id_alumni: "id-001", nisn: "0051234567", nik: "6372011234560001", nama: "Ahmad Rizky Pratama", jk: "L", tempat_lahir: "Banjarbaru", tanggal_lahir: "2006-05-14", hp: "08125556677", tahun_lulus: "2024" },
    { id_alumni: "id-002", nisn: "0051234568", nik: "6372011234560002", nama: "Siti Nurhaliza", jk: "P", tempat_lahir: "Martapura", tanggal_lahir: "2006-08-20", hp: "08138889900", tahun_lulus: "2024" },
    { id_alumni: "id-003", nisn: "0051234569", nik: "6372011234560003", nama: "Budi Santoso", jk: "L", tempat_lahir: "Banjarmasin", tanggal_lahir: "2005-11-03", hp: "08527771122", tahun_lulus: "2023" },
    { id_alumni: "id-004", nisn: "0051234570", nik: "6372011234560004", nama: "Dewi Anggraini", jk: "P", tempat_lahir: "Banjarbaru", tanggal_lahir: "2006-01-18", hp: "08573334455", tahun_lulus: "2024" },
    { id_alumni: "id-005", nisn: "0051234571", nik: "6372011234560005", nama: "Muhammad Ridwan", jk: "L", tempat_lahir: "Pelaihari", tanggal_lahir: "2005-09-30", hp: "08964445566", tahun_lulus: "2023" }
  ],
  tracer: [
    { id_tracer: "tr-001", id_alumni: "id-001", tahun_tracer: 2025, status_tracer: "Bekerja + Kuliah", nilai_ijazah: "88.50", created_at: "2025-06-10" },
    { id_tracer: "tr-002", id_alumni: "id-002", tahun_tracer: 2025, status_tracer: "Kuliah", nilai_ijazah: "90.25", created_at: "2025-07-01" },
    { id_tracer: "tr-003", id_alumni: "id-003", tahun_tracer: 2024, status_tracer: "Bekerja", nilai_ijazah: "84.00", created_at: "2024-08-15" }
  ],
  pekerjaan: [
    { id_pekerjaan: "pk-001", id_tracer: "tr-001", id_alumni: "id-001", nama_tempat_usaha: "PT Borneo Cyber Tech", kode_bidang_usaha: "BU-56", bidang_usaha_label: "Kegiatan Pemrograman", kode_jenis_pekerjaan: "JP-07", jenis_pekerjaan_label: "Karyawan Swasta", kode_penghasilan: 4, penghasilan_label: "Rp. 2,000,000 - Rp. 4,999,999", tgl_mulai_kerja: "2024-09-01" },
    { id_pekerjaan: "pk-002", id_tracer: "tr-003", id_alumni: "id-003", nama_tempat_usaha: "CV Banjar Kreatif", kode_bidang_usaha: "BU-76", bidang_usaha_label: "Periklanan dan Penelitian Pasar", kode_jenis_pekerjaan: "JP-10", jenis_pekerjaan_label: "Wiraswasta", kode_penghasilan: 3, penghasilan_label: "Rp. 1,000,000 - Rp. 1,999,999", tgl_mulai_kerja: "2023-11-01" }
  ],
  kuliah: [
    { id_kuliah: "kl-001", id_tracer: "tr-001", id_alumni: "id-001", nama_pt: "Universitas Lambung Mangkurat", prodi: "Teknik Informatika", tgl_mulai_kuliah: "2024-08-15" },
    { id_kuliah: "kl-002", id_tracer: "tr-002", id_alumni: "id-002", nama_pt: "Politeknik Negeri Banjarmasin", prodi: "Akuntansi Publik", tgl_mulai_kuliah: "2024-09-01" }
  ]
};

// --- ON DOM LOAD INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
  refreshCaptcha();
  loadSavedGasUrl();
  renderAnalytics();
  renderAdminAlumniTable();
});

// --- PROPER CASE CONVERTER UTILITY ---
// Converts string to Proper Case (Title Case)
function toProperCase(str) {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function autoProperCase(inputElement) {
  if (inputElement && inputElement.value) {
    inputElement.value = toProperCase(inputElement.value);
  }
}

// --- TAB SWITCHER ENGINE ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`tab-btn-${tabId}`);

  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'beranda') {
    renderAnalytics();
  }
}

function scrollToStats() {
  document.getElementById('stats-summary').scrollIntoView({ behavior: 'smooth' });
}

// --- POPULATE DROPDOWNS FROM DATA-REFERENSI.JS ---
function initDropdowns() {
  // Bidang Usaha
  const buSelect = document.getElementById('kerja-bidang');
  if (buSelect && typeof bidangUsahaList !== 'undefined') {
    buSelect.innerHTML = `<option value="">-- Pilih Bidang Usaha --</option>` +
      bidangUsahaList.map(item => `<option value="${item.kode}" data-label="${item.label}">${item.label}</option>`).join('');
  }

  // Jenis Pekerjaan
  const jpSelect = document.getElementById('kerja-jenis');
  if (jpSelect && typeof jenisPekerjaanList !== 'undefined') {
    jpSelect.innerHTML = `<option value="">-- Pilih Status Pekerjaan --</option>` +
      jenisPekerjaanList.map(item => `<option value="${item.kode}" data-label="${item.label}">${item.label}</option>`).join('');
  }

  // Tingkat Penghasilan (7 Dapodik classes)
  const tpSelect = document.getElementById('kerja-penghasilan');
  if (tpSelect && typeof tingkatPenghasilanList !== 'undefined') {
    tpSelect.innerHTML = `<option value="">-- Pilih Rentang Penghasilan --</option>` +
      tingkatPenghasilanList.map(item => `<option value="${item.kode}" data-label="${item.label}">${item.label}</option>`).join('');
  }
}

// --- CAPTCHA GENERATOR ---
function refreshCaptcha() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentCaptcha = result;
  const captchaBox = document.getElementById('captcha-box');
  if (captchaBox) captchaBox.textContent = currentCaptcha;
  
  const captchaInput = document.getElementById('verify-captcha');
  if (captchaInput) captchaInput.value = "";
}

// --- ALUMNI AUTH VERIFICATION ---
async function handleAlumniVerify(event) {
  event.preventDefault();
  
  const nisn = document.getElementById('verify-nisn').value.trim();
  const tglLahir = document.getElementById('verify-tgl').value;
  const captchaInput = document.getElementById('verify-captcha').value.trim().toUpperCase();

  if (captchaInput !== currentCaptcha) {
    showToast("⚠️ Kode captcha tidak sesuai. Silakan coba lagi.", "danger");
    refreshCaptcha();
    return;
  }

  showToast("🔍 Memverifikasi data alumni...", "info");

  const gasUrl = getGasUrl();
  let result = null;

  if (gasUrl) {
    try {
      const response = await fetch(`${gasUrl}?action=verifyAlumni&nisn=${encodeURIComponent(nisn)}&tanggal_lahir=${encodeURIComponent(tglLahir)}`);
      result = await response.json();
    } catch (err) {
      console.warn("GAS Connection failed, using offline fallback verification.", err);
      result = offlineVerifyAlumni(nisn, tglLahir);
    }
  } else {
    result = offlineVerifyAlumni(nisn, tglLahir);
  }

  if (result && result.status === "success") {
    activeAlumniSession = result.alumni;
    showToast(`✅ Verifikasi berhasil! Selamat datang ${result.alumni.nama}`, "success");
    unlockAlumniForm(result.alumni, result.tracerHistory || []);
  } else {
    showToast(`❌ ${result.message || 'Data tidak ditemukan'}`, "danger");
    refreshCaptcha();
  }
}

function offlineVerifyAlumni(nisn, tglLahir) {
  const alumni = localDatabase.alumni.find(a => a.nisn === nisn && a.tanggal_lahir === tglLahir);
  if (alumni) {
    const tracerHistory = localDatabase.tracer
      .filter(t => t.id_alumni === alumni.id_alumni)
      .sort((a, b) => b.tahun_tracer - a.tahun_tracer);

    return {
      status: "success",
      alumni: alumni,
      tracerHistory: tracerHistory
    };
  }
  return { status: "error", message: "Data NISN / Tanggal Lahir tidak cocok dengan data registrasi sekolah." };
}

function unlockAlumniForm(alumni, history) {
  document.getElementById('alumni-auth-card').style.display = 'none';
  document.getElementById('alumni-form-card').style.display = 'block';

  document.getElementById('prof-nama').textContent = alumni.nama;
  document.getElementById('prof-nisn').textContent = alumni.nisn;
  document.getElementById('prof-jk').textContent = alumni.jk === 'L' ? 'Laki-laki' : 'Perempuan';
  document.getElementById('prof-thn').textContent = alumni.tahun_lulus;
  document.getElementById('prof-hp').textContent = alumni.hp || '-';

  renderTimelineHistory(history);
}

function resetAlumniSession() {
  activeAlumniSession = null;
  document.getElementById('form-verify').reset();
  document.getElementById('form-tracer-submit').reset();
  document.getElementById('alumni-auth-card').style.display = 'block';
  document.getElementById('alumni-form-card').style.display = 'none';
  refreshCaptcha();
  showToast("🔒 Sesi alumni telah keluar", "info");
}

// --- STATUS CHOICE SELECTION & DYNAMIC PANELS ---
function selectStatus(statusType) {
  currentSelectedStatus = statusType;
  document.getElementById('selected-status').value = statusType;

  // Highlight card
  document.querySelectorAll('.status-option').forEach(el => el.classList.remove('selected'));
  if (statusType === 'Bekerja') document.getElementById('opt-bekerja').classList.add('selected');
  if (statusType === 'Kuliah') document.getElementById('opt-kuliah').classList.add('selected');
  if (statusType === 'Bekerja + Kuliah') document.getElementById('opt-bekerja-kuliah').classList.add('selected');
  if (statusType === 'Belum') document.getElementById('opt-belum').classList.add('selected');

  // Dynamic Panels logic
  const panelKerja = document.getElementById('panel-pekerjaan');
  const panelKuliah = document.getElementById('panel-kuliah');

  if (statusType === 'Bekerja') {
    panelKerja.classList.add('active');
    panelKuliah.classList.remove('active');
  } else if (statusType === 'Kuliah') {
    panelKuliah.classList.add('active');
    panelKerja.classList.remove('active');
  } else if (statusType === 'Bekerja + Kuliah') {
    panelKerja.classList.add('active');
    panelKuliah.classList.add('active');
  } else {
    panelKerja.classList.remove('active');
    panelKuliah.classList.remove('active');
  }
}

// --- TRACER SUBMIT HANDLER ---
async function handleTracerSubmit(event) {
  event.preventDefault();

  if (!activeAlumniSession) {
    showToast("⚠️ Silakan verifikasi identitas alumni terlebih dahulu", "danger");
    return;
  }

  if (!currentSelectedStatus) {
    showToast("⚠️ Harap pilih status Anda (Bekerja / Kuliah / Bekerja+Kuliah / Belum)", "danger");
    return;
  }

  const nilaiIjazah = document.getElementById('input-nilai-ijazah').value;
  const currentYear = new Date().getFullYear();

  // Construct Payload
  const payload = {
    id_alumni: activeAlumniSession.id_alumni,
    nisn: activeAlumniSession.nisn,
    tahun_tracer: currentYear,
    status_tracer: currentSelectedStatus,
    nilai_ijazah: nilaiIjazah,
    pekerjaan: {},
    kuliah: {}
  };

  // If Bekerja or Bekerja + Kuliah
  if (currentSelectedStatus === 'Bekerja' || currentSelectedStatus === 'Bekerja + Kuliah') {
    const namaUsaha = document.getElementById('kerja-nama').value.trim();
    const buSelect = document.getElementById('kerja-bidang');
    const jpSelect = document.getElementById('kerja-jenis');
    const tpSelect = document.getElementById('kerja-penghasilan');

    payload.pekerjaan = {
      nama_tempat_usaha: toProperCase(namaUsaha),
      kode_bidang_usaha: buSelect.value,
      bidang_usaha_label: buSelect.options[buSelect.selectedIndex]?.dataset?.label || "",
      kode_jenis_pekerjaan: jpSelect.value,
      jenis_pekerjaan_label: jpSelect.options[jpSelect.selectedIndex]?.dataset?.label || "",
      kode_penghasilan: tpSelect.value,
      penghasilan_label: tpSelect.options[tpSelect.selectedIndex]?.dataset?.label || "",
      tgl_mulai_kerja: document.getElementById('kerja-tgl').value
    };
  }

  // If Kuliah or Bekerja + Kuliah
  if (currentSelectedStatus === 'Kuliah' || currentSelectedStatus === 'Bekerja + Kuliah') {
    payload.kuliah = {
      nama_pt: toProperCase(document.getElementById('kuliah-pt').value.trim()),
      prodi: toProperCase(document.getElementById('kuliah-prodi').value.trim()),
      tgl_mulai_kuliah: document.getElementById('kuliah-tgl').value
    };
  }

  showToast("💾 Menyimpan data tracer study...", "info");

  const gasUrl = getGasUrl();
  let response = null;

  if (gasUrl) {
    try {
      const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitTracer", payload: payload })
      });
      response = await res.json();
    } catch (err) {
      console.warn("GAS Post failed, saving locally in mock db.", err);
      response = saveTracerOffline(payload);
    }
  } else {
    response = saveTracerOffline(payload);
  }

  if (response && response.status === "success") {
    showToast("🎉 Terima kasih! Data Tracer Study Anda telah berhasil disimpan.", "success");
    
    // Add to history UI directly
    const newTracerItem = {
      tahun_tracer: currentYear,
      status_tracer: currentSelectedStatus,
      nilai_ijazah: nilaiIjazah,
      created_at: new Date().toISOString()
    };
    appendTimelineItem(newTracerItem);
  } else {
    showToast("❌ Gagal menyimpan data tracer: " + (response.message || ""), "danger");
  }
}

function saveTracerOffline(payload) {
  const newId = "tr-" + Date.now();
  localDatabase.tracer.push({
    id_tracer: newId,
    id_alumni: payload.id_alumni,
    tahun_tracer: payload.tahun_tracer,
    status_tracer: payload.status_tracer,
    nilai_ijazah: payload.nilai_ijazah,
    created_at: new Date().toISOString()
  });

  if (payload.pekerjaan && payload.pekerjaan.nama_tempat_usaha) {
    localDatabase.pekerjaan.push({
      id_pekerjaan: "pk-" + Date.now(),
      id_tracer: newId,
      id_alumni: payload.id_alumni,
      ...payload.pekerjaan
    });
  }

  if (payload.kuliah && payload.kuliah.nama_pt) {
    localDatabase.kuliah.push({
      id_kuliah: "kl-" + Date.now(),
      id_tracer: newId,
      id_alumni: payload.id_alumni,
      ...payload.kuliah
    });
  }

  return { status: "success", id_tracer: newId };
}

// --- TIMELINE RENDERER FOR LONGITUDINAL STUDY ---
function renderTimelineHistory(history) {
  const container = document.getElementById('tracer-history-timeline');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Belum ada riwayat survey tracer sebelumnya. Pengisian ini akan menjadi rekam jejak pertama Anda.</p>`;
    return;
  }

  container.innerHTML = history.map(item => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem;">
          <span>Tracer Study Tahun ${item.tahun_tracer}</span>
          <span class="badge badge-${getBadgeClass(item.status_tracer)}">${item.status_tracer}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Nilai Ijazah: <strong>${item.nilai_ijazah || '-'}</strong> | Tgl Input: ${new Date(item.created_at).toLocaleDateString('id-ID')}
        </div>
      </div>
    </div>
  `).join('');
}

function appendTimelineItem(item) {
  const container = document.getElementById('tracer-history-timeline');
  if (!container) return;

  const html = `
    <div class="timeline-item" style="animation: fadeIn 0.4s ease-out;">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem;">
          <span>Tracer Study Tahun ${item.tahun_tracer} (Baru)</span>
          <span class="badge badge-${getBadgeClass(item.status_tracer)}">${item.status_tracer}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Nilai Ijazah: <strong>${item.nilai_ijazah || '-'}</strong> | Tgl Input: Hari Ini
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('afterbegin', html);
}

function getBadgeClass(status) {
  if (status === 'Bekerja') return 'bekerja';
  if (status === 'Kuliah') return 'kuliah';
  if (status === 'Bekerja + Kuliah') return 'bekerja-kuliah';
  return 'belum';
}

// --- ANALYTICS & CHARTS RENDERING ENGINE ---
async function renderAnalytics() {
  const gasUrl = getGasUrl();
  let data = null;

  if (gasUrl) {
    try {
      const res = await fetch(`${gasUrl}?action=getAnalytics`);
      data = await res.json();
    } catch (e) {
      console.warn("GAS Analytics fetch failed, utilizing local db.", e);
      data = calculateOfflineAnalytics();
    }
  } else {
    data = calculateOfflineAnalytics();
  }

  if (!data || data.status !== "success") return;

  // KPI Summary
  const total = data.totalAlumni || 1;
  const counts = data.statusCounts || { "Bekerja": 0, "Kuliah": 0, "Bekerja + Kuliah": 0, "Belum": 0 };

  const pctBekerja = ((counts["Bekerja"] / total) * 100).toFixed(1);
  const pctKuliah = ((counts["Kuliah"] / total) * 100).toFixed(1);
  const pctBk = ((counts["Bekerja + Kuliah"] / total) * 100).toFixed(1);
  const pctBelum = ((counts["Belum"] / total) * 100).toFixed(1);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-bekerja').textContent = `${pctBekerja}%`;
  document.getElementById('stat-bekerja-count').textContent = `${counts["Bekerja"]} alumni`;

  document.getElementById('stat-kuliah').textContent = `${pctKuliah}%`;
  document.getElementById('stat-kuliah-count').textContent = `${counts["Kuliah"]} alumni`;

  document.getElementById('stat-bekerja-kuliah').textContent = `${pctBk}%`;
  document.getElementById('stat-bekerja-kuliah-count').textContent = `${counts["Bekerja + Kuliah"]} alumni`;

  document.getElementById('stat-belum').textContent = `${pctBelum}%`;
  document.getElementById('stat-belum-count').textContent = `${counts["Belum"]} alumni`;

  // Render Chart 1: Status Pie Chart
  renderStatusChart(counts);

  // Render Chart 2: Income Distribution
  renderPenghasilanChart(data.penghasilanCounts || {});

  // Render Chart 3: Bidang Usaha Distribution
  renderBidangUsahaChart(data.bidangUsahaCounts || {});
}

function calculateOfflineAnalytics() {
  const totalAlumni = localDatabase.alumni.length;
  const statusCounts = { "Bekerja": 0, "Kuliah": 0, "Bekerja + Kuliah": 0, "Belum": 0 };
  const bidangUsahaCounts = {};
  const penghasilanCounts = {};

  // Group latest tracer
  const latestTracer = {};
  localDatabase.tracer.forEach(t => {
    if (!latestTracer[t.id_alumni] || t.tahun_tracer > latestTracer[t.id_alumni].tahun_tracer) {
      latestTracer[t.id_alumni] = t;
    }
  });

  Object.values(latestTracer).forEach(t => {
    if (statusCounts[t.status_tracer] !== undefined) {
      statusCounts[t.status_tracer]++;
    }
  });

  // Calculate un-submitted as Belum
  const submittedCount = Object.keys(latestTracer).length;
  statusCounts["Belum"] += Math.max(0, totalAlumni - submittedCount);

  localDatabase.pekerjaan.forEach(p => {
    const bu = p.bidang_usaha_label || "Lainnya";
    const pgh = p.penghasilan_label || "Tidak Berpenghasilan";
    bidangUsahaCounts[bu] = (bidangUsahaCounts[bu] || 0) + 1;
    penghasilanCounts[pgh] = (penghasilanCounts[pgh] || 0) + 1;
  });

  return {
    status: "success",
    totalAlumni: totalAlumni,
    statusCounts: statusCounts,
    bidangUsahaCounts: bidangUsahaCounts,
    penghasilanCounts: penghasilanCounts
  };
}

// Chart 1: Doughnut Status
function renderStatusChart(counts) {
  const ctx = document.getElementById('chartStatus')?.getContext('2d');
  if (!ctx) return;

  if (chartInstances.status) chartInstances.status.destroy();

  chartInstances.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Bekerja', 'Kuliah', 'Bekerja + Kuliah', 'Belum Bekerja/Kuliah'],
      datasets: [{
        data: [counts["Bekerja"], counts["Kuliah"], counts["Bekerja + Kuliah"], counts["Belum"]],
        backgroundColor: ['#10b981', '#1e40af', '#8b5cf6', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Chart 2: Income Bar Chart
function renderPenghasilanChart(incomeCounts) {
  const ctx = document.getElementById('chartPenghasilan')?.getContext('2d');
  if (!ctx) return;

  if (chartInstances.income) chartInstances.income.destroy();

  const labels = tingkatPenghasilanList.map(t => t.label);
  const dataValues = labels.map(lbl => incomeCounts[lbl] || 0);

  chartInstances.income = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Alumni',
        data: dataValues,
        backgroundColor: '#06b6d4',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

// Chart 3: Bidang Usaha Bar Chart
function renderBidangUsahaChart(buCounts) {
  const ctx = document.getElementById('chartBidangUsaha')?.getContext('2d');
  if (!ctx) return;

  if (chartInstances.bu) chartInstances.bu.destroy();

  let sortedKeys = Object.keys(buCounts).sort((a, b) => buCounts[b] - buCounts[a]).slice(0, 10);
  if (sortedKeys.length === 0) {
    sortedKeys = ["Kegiatan Pemrograman", "Periklanan dan Penelitian Pasar", "Jasa Pendidikan", "Perdagangan Eceran"];
  }

  const dataValues = sortedKeys.map(k => buCounts[k] || 1);

  chartInstances.bu = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedKeys,
      datasets: [{
        label: 'Jumlah Alumni',
        data: dataValues,
        backgroundColor: '#1d4ed8',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

// --- ADMIN PORTAL LOGIC ---
function handleAdminAuth(event) {
  event.preventDefault();
  const pin = document.getElementById('admin-pin').value;
  
  if (pin === DEFAULT_PIN || pin === "admin") {
    document.getElementById('admin-auth-card').style.display = 'none';
    document.getElementById('admin-main-portal').style.display = 'block';
    showToast("🔓 Login Admin Berhasil", "success");
    renderAdminAlumniTable();
  } else {
    showToast("❌ PIN Administrator salah", "danger");
  }
}

function loadSavedGasUrl() {
  const url = localStorage.getItem(GAS_URL_KEY) || "";
  const input = document.getElementById('gas-url-input');
  if (input) input.value = url;
}

function getGasUrl() {
  return localStorage.getItem(GAS_URL_KEY) || "";
}

function saveGasUrl() {
  const url = document.getElementById('gas-url-input').value.trim();
  localStorage.setItem(GAS_URL_KEY, url);
  showToast("⚙️ URL Apps Script berhasil disimpan", "success");
}

async function testGasConnection() {
  const url = getGasUrl();
  if (!url) {
    showToast("⚠️ URL Apps Script belum diisi", "danger");
    return;
  }
  showToast("📡 Menguji koneksi GAS...", "info");
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "success") {
      showToast("✅ Koneksi Apps Script Terhubung Berhasil!", "success");
    } else {
      showToast("⚠️ Respon Apps Script: " + data.message, "warning");
    }
  } catch (err) {
    showToast("❌ Gagal terhubung ke URL Apps Script", "danger");
  }
}

// --- CSV IMPORTER ENGINE ---
function handleCSVSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");
  if (lines.length <= 1) {
    showToast("⚠️ File CSV kosong atau tidak valid", "danger");
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  parsedCSVData = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length >= 2) {
      parsedCSVData.push({
        nisn: values[0] || "",
        nama: toProperCase(values[1] || ""),
        jk: (values[2] || "L").toUpperCase(),
        tempat_lahir: toProperCase(values[3] || ""),
        tanggal_lahir: values[4] || "",
        nik: values[5] || "",
        hp: values[6] || "",
        tahun_lulus: values[7] || new Date().getFullYear().toString()
      });
    }
  }

  document.getElementById('csv-count').textContent = parsedCSVData.length;
  const tbody = document.getElementById('csv-preview-body');
  tbody.innerHTML = parsedCSVData.slice(0, 5).map(item => `
    <tr>
      <td>${item.nisn}</td>
      <td>${item.nama}</td>
      <td>${item.jk}</td>
      <td>${item.tanggal_lahir}</td>
      <td>${item.tahun_lulus}</td>
      <td>${item.hp}</td>
    </tr>
  `).join('');

  document.getElementById('csv-preview-container').style.display = 'block';
  showToast(`📄 ${parsedCSVData.length} data CSV berhasil dimuat`, "info");
}

async function processCSVImport() {
  if (!parsedCSVData || parsedCSVData.length === 0) {
    showToast("⚠️ Tidak ada data CSV untuk diimpor", "danger");
    return;
  }

  const gasUrl = getGasUrl();
  showToast("🚀 Mengimpor data alumni ke database...", "info");

  if (gasUrl) {
    try {
      const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "importAlumniCSV", alumniList: parsedCSVData })
      });
      const result = await res.json();
      if (result.status === "success") {
        showToast(`🎉 ${result.message}`, "success");
      } else {
        showToast(`❌ Gagal: ${result.message}`, "danger");
      }
    } catch (e) {
      console.warn("GAS Import failed, importing into local db.", e);
      importLocalCSV();
    }
  } else {
    importLocalCSV();
  }

  document.getElementById('csv-preview-container').style.display = 'none';
  renderAdminAlumniTable();
}

function importLocalCSV() {
  let inserted = 0;
  parsedCSVData.forEach(item => {
    const idx = localDatabase.alumni.findIndex(a => a.nisn === item.nisn);
    if (idx >= 0) {
      localDatabase.alumni[idx] = { ...localDatabase.alumni[idx], ...item };
    } else {
      localDatabase.alumni.push({ id_alumni: "id-" + Date.now(), ...item });
      inserted++;
    }
  });
  showToast(`🎉 Import Lokal Berhasil! ${inserted} alumni baru ditambahkan.`, "success");
}

function downloadSampleCSV() {
  const sampleText = `nisn,nama,jk,tempat_lahir,tanggal_lahir,nik,hp,tahun_lulus
0059998881,Budi Santoso,L,Banjarbaru,2006-03-12,6372010001,08123456789,2024
0059998882,Siti Aminah,P,Martapura,2006-07-25,6372010002,08198765432,2024`;

  const blob = new Blob([sampleText], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_import_alumni_pgri1.csv';
  a.click();
}

// --- ADMIN ALUMNI DATA TABLE RENDERER ---
async function renderAdminAlumniTable() {
  const tbody = document.getElementById('alumni-table-body');
  if (!tbody) return;

  let alumniList = localDatabase.alumni;
  let latestTracerMap = {};

  localDatabase.tracer.forEach(t => {
    latestTracerMap[t.id_alumni] = t.status_tracer;
  });

  tbody.innerHTML = alumniList.map((item, index) => {
    const st = latestTracerMap[item.id_alumni] || "Belum Mengisi";
    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.nisn}</strong></td>
        <td>${item.nama}</td>
        <td>${item.jk}</td>
        <td>${item.tahun_lulus}</td>
        <td>${item.hp || '-'}</td>
        <td><span class="badge badge-${getBadgeClass(st)}">${st}</span></td>
      </tr>
    `;
  }).join('');
}

function filterAlumniTable() {
  const query = document.getElementById('table-search').value.toLowerCase();
  const rows = document.querySelectorAll('#alumni-table-body tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

function exportAlumniCSV() {
  let csv = "No,NISN,Nama,JK,Tahun Lulus,HP,Status Tracer\n";
  localDatabase.alumni.forEach((a, idx) => {
    const tracer = localDatabase.tracer.find(t => t.id_alumni === a.id_alumni);
    const st = tracer ? tracer.status_tracer : "Belum Mengisi";
    csv += `"${idx + 1}","${a.nisn}","${a.nama}","${a.jk}","${a.tahun_lulus}","${a.hp || ''}","${st}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export_tracer_alumni_pgri1.csv';
  a.click();
  showToast("📊 File CSV alumni berhasil di-export", "success");
}

// --- TOAST SYSTEM ---
function showToast(message, type = "info") {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
