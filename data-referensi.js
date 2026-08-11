// ============================================================
// DATA-REFERENSI.JS
// Data referensi dropdown — Aplikasi Tracer Study
// SMAS PGRI 1 Banjarbaru
//
// Sumber tunggal (source of truth) untuk daftar ini adalah sheet
// "RefBidangUsaha" / "RefJenisPekerjaan" / "RefTingkatPenghasilan"
// di Spreadsheet. File ini adalah salinan statis untuk dropdown
// di frontend — jika admin mengubah sheet Referensi, jalankan
// generateReferensiJS() di Apps Script untuk mendapatkan versi
// terbaru dan tempel ulang di sini.
//
// Catatan pembersihan dari data asli:
// - "Perdagangan Mobil dan Sepeda Motor 342" -> dibuang angka "342"
//   (sisa artefak, bukan bagian nama bidang usaha)
// - Daftar penghasilan: dipakai HANYA 7 kode resmi Dapodik.
//   3 entri tambahan ("< Rp1.000.000", dst.) dibuang karena
//   formatnya berbeda & rentangnya tumpang tindih dengan 7 kode
//   resmi -> berisiko merusak keakuratan statistik nanti.
// ============================================================

// --- BIDANG USAHA (selaras KBLI / Dapodik) ---
const bidangUsahaList = [
  "Administrasi Pemerintahan, Pertahanan",
  "Angkutan Air",
  "Angkutan Darat dan Melalui Saluran Pipa",
  "Angkutan Udara",
  "Asuransi dan Dana Pensiun",
  "Ind. Alat Angkutan Lainnya",
  "Ind. Bahan Kimia",
  "Ind. Barang Galian Bukan Logam",
  "Ind. Barang Logam, Bukan Mesin",
  "Ind. Farmasi",
  "Ind. Furnitur",
  "Ind. Kayu, dan Gabus",
  "Ind. Kendaraan Bermotor",
  "Ind. Kertas dan Barang dari Kertas",
  "Ind. Komputer, Brg Elektronik dan Optik",
  "Ind. Kulit, dan Alas Kaki",
  "Ind. Logam Dasar",
  "Ind. Makanan",
  "Ind. Mesin dan Perlengkapan ytdl",
  "Ind. Minuman",
  "Ind. Pakaian Jadi",
  "Ind. Peralatan Listrik",
  "Ind. Pencetakan dan Repr. Media Rekaman",
  "Ind. Pengolahan Lainnya",
  "Ind. Pengolahan Tembakau",
  "Ind. Prod Bt Bara, Kilang Minyak Bumi",
  "Ind. Karet dan Plastik",
  "Ind. Tekstil",
  "Jasa Administrasi Kantor",
  "Jasa Agen Perjalanan",
  "Jasa Arsitektur dan Teknik Sipil",
  "Jasa Keamanan dan Penyelidikan",
  "Jasa Kegiatan Sosial di Dalam Panti",
  "Jasa Kegiatan Sosial di Luar Panti",
  "Jasa Kesehatan Hewan",
  "Jasa Kesehatan Manusia",
  "Jasa Ketenagakerjaan",
  "Jasa Keuangan",
  "Jasa Hukum dan Akuntansi",
  "Jasa Pendidikan",
  "Jasa Pengelolaan Sampah Lain",
  "Jasa Penunjang Jasa Keuangan",
  "Jasa Perorangan Lainnya",
  "Jasa Perorangan yg Melayani Rmh Tangga",
  "Jasa Persewaan",
  "Jasa Pertambangan",
  "Jasa Profesional, Ilmiah dan Teknis",
  "Jasa Reparasi Komputer",
  "Jasa Reparasi Mesin",
  "Jasa Untuk Gedung dan Pertamanan",
  "Kegiatan Hiburan, Kesenian",
  "Kegiatan Jasa Informasi",
  "Kegiatan Keanggotaan Organisasi",
  "Kegiatan Konsultansi Manajemen",
  "Kegiatan Olahraga dan Rekreasi",
  "Kegiatan Pemrograman",
  "Keg. Badan Internasional lain",
  "Keg. Rmh Tangga yang Digunakan Sendiri",
  "Kehutanan dan Penebangan Kayu",
  "Konstruksi Bangunan Sipil",
  "Konstruksi Gedung",
  "Konstruksi Khusus",
  "Penelitian Ilmu Pengetahuan",
  "Pengadaan Air",
  "Pengadaan Listrik, Gas, Uap",
  "Pengelolaan Limbah",
  "Pengelolaan Sampah dan Daur Ulang",
  "Penerbitan",
  "Penyediaan Akomodasi",
  "Penyediaan Makanan dan Minuman",
  "Penyiaran dan Pemrograman",
  "Perdagangan Besar, Bukan Mobil",
  "Perdagangan Eceran, Bukan Mobil",
  "Perdagangan Mobil dan Sepeda Motor",
  "Pergudangan dan Jasa Penunjang Angkutan",
  "Periklanan dan Penelitian Pasar",
  "Perikanan",
  "Perpustakaan, Arsip, Museum",
  "Pertanian, Peternakan, Perburuan",
  "Pos dan Kurir",
  "Produksi Video dan Musik",
  "Real Estat",
  "Telekomunikasi",
  "Tmbg Batu Bara dan Lignit",
  "Tmbg Bijih Logam",
  "Tmbg dan Penggalian Lainnya",
  "Tmbg Mnyk Bumi, Gas Alam, Panas Bumi",
].map((label, i) => ({ kode: "BU-" + String(i + 1).padStart(2, "0"), label }));

// --- JENIS PEKERJAAN / STATUS PEKERJAAN ---
const jenisPekerjaanList = [
  "Tidak bekerja",
  "Nelayan",
  "Petani",
  "Peternak",
  "PNS/TNI/Polri",
  "Karyawan BUMN",
  "Karyawan Swasta",
  "Pedagang Kecil",
  "Pedagang Besar",
  "Wiraswasta",
  "Wirausaha",
  "Buruh",
  "Tenaga Kerja Indonesia",
  "Pensiunan",
  "Tidak dapat diterapkan",
  "Sudah Meninggal",
  "Lainnya",
].map((label, i) => ({ kode: "JP-" + String(i + 1).padStart(2, "0"), label }));

// --- TINGKAT PENGHASILAN (7 kode resmi Dapodik) ---
const tingkatPenghasilanList = [
  { kode: 1, label: "Kurang dari Rp. 500,000" },
  { kode: 2, label: "Rp. 500,000 - Rp. 999,999" },
  { kode: 3, label: "Rp. 1,000,000 - Rp. 1,999,999" },
  { kode: 4, label: "Rp. 2,000,000 - Rp. 4,999,999" },
  { kode: 5, label: "Rp. 5,000,000 - Rp. 20,000,000" },
  { kode: 6, label: "Lebih dari Rp. 20,000,000" },
  { kode: 7, label: "Tidak Berpenghasilan" },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bidangUsahaList, jenisPekerjaanList, tingkatPenghasilanList };
}
