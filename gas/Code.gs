// ============================================================
// CODE.GS - GOOGLE APPS SCRIPT BACKEND ENGINE
// Tracer Study SMAS PGRI 1 Banjarbaru
// ============================================================

// --- SPREADSHEET CONFIGURATION ---
// 1. Jika Apps Script dibuka langsung dari Google Sheet (menu Ekstensi -> Apps Script), biarkan SPREADSHEET_ID = "";
// 2. Jika Anda membuat Apps Script secara Standalone di script.google.com, isi SPREADSHEET_ID di bawah ini.
// Contoh: var SPREADSHEET_ID = "1aBcXyZ_8901234567890abcdefg";
var SPREADSHEET_ID = "";

function getDB() {
  var ss = null;
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch(e) {
      Logger.log("Error opening spreadsheet by ID: " + e.toString());
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    throw new Error(
      "Spreadsheet tidak ditemukan!\n" +
      "👉 Jika Anda membuat Apps Script di script.google.com (Standalone), harap isi variabel SPREADSHEET_ID di baris 9 file Code.gs dengan ID Google Sheet Anda.\n" +
      "👉 Atau jalankan fungsi setupSpreadsheet() untuk membuat Google Sheet baru secara otomatis."
    );
  }
  return ss;
}

// --- SPREADSHEET SETUP & INITIALIZATION ---
function setupSpreadsheet() {
  var ss = null;
  
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch(e) {}
  }
  
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  // Jika tetap null (karena dijalankan dari standalone Apps Script tanpa ID), buat Google Sheet baru otomatis!
  if (!ss) {
    ss = SpreadsheetApp.create("Database Tracer Study SMAS PGRI 1 Banjarbaru");
    Logger.log("Spreadsheet Baru Berhasil Dibuat!");
    Logger.log("ID Spreadsheet: " + ss.getId());
    Logger.log("URL Spreadsheet: " + ss.getUrl());
  }
  
  // Sheet Definitions with Headers
  var sheetsDef = {
    "Alumni": ["id_alumni", "nisn", "nik", "nama", "jk", "tempat_lahir", "tanggal_lahir", "hp", "tahun_lulus", "created_at"],
    "Tracer": ["id_tracer", "id_alumni", "tahun_tracer", "status_tracer", "nilai_ijazah", "created_at"],
    "Pekerjaan": ["id_pekerjaan", "id_tracer", "id_alumni", "nama_tempat_usaha", "kode_bidang_usaha", "bidang_usaha_label", "kode_jenis_pekerjaan", "jenis_pekerjaan_label", "kode_penghasilan", "penghasilan_label", "tgl_mulai_kerja"],
    "Kuliah": ["id_kuliah", "id_tracer", "id_alumni", "nama_pt", "prodi", "tgl_mulai_kuliah"],
    "RefBidangUsaha": ["kode", "label"],
    "RefJenisPekerjaan": ["kode", "label"],
    "RefTingkatPenghasilan": ["kode", "label"]
  };

  for (var name in sheetsDef) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(sheetsDef[name]);
      sheet.getRange(1, 1, 1, sheetsDef[name].length).setFontWeight("bold").setBackground("#e2e8f0");
    }
  }

  var msg = "Setup Spreadsheet Berhasil! ID: " + ss.getId() + " | URL: " + ss.getUrl();
  Logger.log(msg);
  return msg;
}

// --- UTILITY FUNCTIONS ---
function generateUUID() {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

function formatDate(dateObj) {
  if (!dateObj) return "";
  if (typeof dateObj === 'string') return dateObj;
  var d = new Date(dateObj);
  var month = '' + (d.getMonth() + 1);
  var day = '' + d.getDate();
  var year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

function toProperCase(str) {
  if (!str) return "";
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// --- HTTP GET ROUTER ---
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || "getAnalytics";
    
    if (action === "verifyAlumni") {
      return jsonResponse(verifyAlumni(params.nisn, params.tanggal_lahir));
    } else if (action === "getAnalytics") {
      return jsonResponse(getAnalyticsData(params.tahun_lulus));
    } else if (action === "getReferensiJS") {
      return ContentService.createTextOutput(generateReferensiJS())
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else if (action === "getAllAlumni") {
      return jsonResponse(getAllAlumniData());
    } else {
      return jsonResponse({ status: "success", message: "Tracer Study API SMAS PGRI 1 Banjarbaru Active" });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// --- HTTP POST ROUTER ---
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;

    if (action === "submitTracer") {
      return jsonResponse(submitTracerData(contents.payload));
    } else if (action === "importAlumniCSV") {
      return jsonResponse(importAlumniCSV(contents.alumniList));
    } else {
      return jsonResponse({ status: "error", message: "Invalid POST action" });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- ALUMNI VERIFICATION ---
function verifyAlumni(nisn, tglLahir) {
  if (!nisn || !tglLahir) {
    return { status: "error", message: "NISN dan Tanggal Lahir wajib diisi." };
  }

  var ss = getDB();
  var sheet = ss.getSheetByName("Alumni");
  if (!sheet) return { status: "error", message: "Sheet 'Alumni' belum dibuat. Jalankan setupSpreadsheet() terlebih dahulu." };
  
  var data = sheet.getDataRange().getValues();
  var cleanNisn = String(nisn).trim();
  var cleanTgl = String(tglLahir).trim();

  for (var i = 1; i < data.length; i++) {
    var rowNisn = String(data[i][1]).trim();
    var rowTgl = formatDate(data[i][6]);

    if (rowNisn === cleanNisn && (rowTgl === cleanTgl || String(data[i][6]).trim() === cleanTgl)) {
      var alumni = {
        id_alumni: data[i][0],
        nisn: data[i][1],
        nik: data[i][2],
        nama: data[i][3],
        jk: data[i][4],
        tempat_lahir: data[i][5],
        tanggal_lahir: rowTgl,
        hp: data[i][7],
        tahun_lulus: data[i][8]
      };
      
      var tracerHistory = getAlumniTracerHistory(alumni.id_alumni);
      
      return {
        status: "success",
        alumni: alumni,
        tracerHistory: tracerHistory
      };
    }
  }

  return { status: "error", message: "Data Alumni tidak ditemukan. Pastikan NISN dan Tanggal Lahir sesuai dengan data sekolah." };
}

// --- TRACER SUBMISSION PROCESSOR ---
function submitTracerData(payload) {
  var ss = getDB();
  
  var tracerSheet = ss.getSheetByName("Tracer");
  var kerjaSheet = ss.getSheetByName("Pekerjaan");
  var kuliahSheet = ss.getSheetByName("Kuliah");

  var id_tracer = generateUUID();
  var nowStr = new Date().toISOString();
  
  var status = payload.status_tracer; // "Bekerja", "Kuliah", "Bekerja + Kuliah", "Belum"
  
  // 1. Append Tracer Record
  tracerSheet.appendRow([
    id_tracer,
    payload.id_alumni,
    payload.tahun_tracer || new Date().getFullYear(),
    status,
    payload.nilai_ijazah || "",
    nowStr
  ]);

  // 2. Append Pekerjaan if status includes Bekerja
  if (status === "Bekerja" || status === "Bekerja + Kuliah") {
    var p = payload.pekerjaan || {};
    kerjaSheet.appendRow([
      generateUUID(),
      id_tracer,
      payload.id_alumni,
      toProperCase(p.nama_tempat_usaha || ""),
      p.kode_bidang_usaha || "",
      p.bidang_usaha_label || "",
      p.kode_jenis_pekerjaan || "",
      p.jenis_pekerjaan_label || "",
      p.kode_penghasilan || "",
      p.penghasilan_label || "",
      formatDate(p.tgl_mulai_kerja)
    ]);
  }

  // 3. Append Kuliah if status includes Kuliah
  if (status === "Kuliah" || status === "Bekerja + Kuliah") {
    var k = payload.kuliah || {};
    kuliahSheet.appendRow([
      generateUUID(),
      id_tracer,
      payload.id_alumni,
      toProperCase(k.nama_pt || ""),
      toProperCase(k.prodi || ""),
      formatDate(k.tgl_mulai_kuliah)
    ]);
  }

  return { status: "success", message: "Data tracer berhasil disimpan!", id_tracer: id_tracer };
}

// --- HISTORICAL TRACER QUERY ---
function getAlumniTracerHistory(id_alumni) {
  var ss = getDB();
  var tracerSheet = ss.getSheetByName("Tracer");
  if (!tracerSheet) return [];

  var data = tracerSheet.getDataRange().getValues();
  var history = [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(id_alumni)) {
      history.push({
        id_tracer: data[i][0],
        tahun_tracer: data[i][2],
        status_tracer: data[i][3],
        nilai_ijazah: data[i][4],
        created_at: data[i][5]
      });
    }
  }
  
  history.sort(function(a, b) { return b.tahun_tracer - a.tahun_tracer; });
  return history;
}

// --- BULK ALUMNI CSV IMPORT ---
function importAlumniCSV(alumniList) {
  if (!alumniList || !alumniList.length) {
    return { status: "error", message: "Data import kosong." };
  }

  var ss = getDB();
  var sheet = ss.getSheetByName("Alumni");
  var existingData = sheet.getDataRange().getValues();
  var nisnMap = {};

  for (var i = 1; i < existingData.length; i++) {
    nisnMap[String(existingData[i][1]).trim()] = i + 1;
  }

  var insertedCount = 0;
  var updatedCount = 0;
  var nowStr = new Date().toISOString();

  alumniList.forEach(function(item) {
    var cleanNisn = String(item.nisn || "").trim();
    if (!cleanNisn) return;

    var rowValues = [
      item.id_alumni || generateUUID(),
      cleanNisn,
      String(item.nik || "").trim(),
      toProperCase(item.nama || ""),
      String(item.jk || "L").toUpperCase().trim(),
      toProperCase(item.tempat_lahir || ""),
      formatDate(item.tanggal_lahir),
      String(item.hp || "").trim(),
      String(item.tahun_lulus || new Date().getFullYear()).trim(),
      nowStr
    ];

    if (nisnMap[cleanNisn]) {
      var rowIdx = nisnMap[cleanNisn];
      sheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
      updatedCount++;
    } else {
      sheet.appendRow(rowValues);
      insertedCount++;
    }
  });

  return {
    status: "success",
    message: "Import berhasil! " + insertedCount + " alumni baru ditambahkan, " + updatedCount + " alumni diperbarui."
  };
}

// --- ANALYTICS & STATS AGGREGATION ---
function getAnalyticsData(tahunFilter) {
  var ss = getDB();
  var alumniSheet = ss.getSheetByName("Alumni");
  var tracerSheet = ss.getSheetByName("Tracer");
  var kerjaSheet = ss.getSheetByName("Pekerjaan");

  if (!alumniSheet || !tracerSheet) {
    return { status: "error", message: "Database sheet belum lengkap." };
  }

  var alumniData = alumniSheet.getDataRange().getValues();
  var tracerData = tracerSheet.getDataRange().getValues();
  var kerjaData = kerjaSheet ? kerjaSheet.getDataRange().getValues() : [];

  var totalAlumni = Math.max(0, alumniData.length - 1);
  var statusCounts = { "Bekerja": 0, "Kuliah": 0, "Bekerja + Kuliah": 0, "Belum": 0 };
  var bidangUsahaCounts = {};
  var penghasilanCounts = {};

  var latestTracerByAlumni = {};
  for (var i = 1; i < tracerData.length; i++) {
    var idAlumni = String(tracerData[i][1]);
    var thnTracer = Number(tracerData[i][2]);
    
    if (!latestTracerByAlumni[idAlumni] || thnTracer >= latestTracerByAlumni[idAlumni].tahun_tracer) {
      latestTracerByAlumni[idAlumni] = {
        id_tracer: tracerData[i][0],
        status: tracerData[i][3],
        tahun_tracer: thnTracer
      };
    }
  }

  for (var key in latestTracerByAlumni) {
    var st = latestTracerByAlumni[key].status;
    if (statusCounts[st] !== undefined) {
      statusCounts[st]++;
    }
  }

  for (var k = 1; k < kerjaData.length; k++) {
    var bu = kerjaData[k][5] || "Lainnya";
    var pgh = kerjaData[k][9] || "Tidak Ditentukan";

    bidangUsahaCounts[bu] = (bidangUsahaCounts[bu] || 0) + 1;
    penghasilanCounts[pgh] = (penghasilanCounts[pgh] || 0) + 1;
  }

  return {
    status: "success",
    totalAlumni: totalAlumni,
    totalTracerSubmitted: Object.keys(latestTracerByAlumni).length,
    statusCounts: statusCounts,
    bidangUsahaCounts: bidangUsahaCounts,
    penghasilanCounts: penghasilanCounts
  };
}

// --- ALL ALUMNI DATA FOR ADMIN ---
function getAllAlumniData() {
  var ss = getDB();
  var alumniSheet = ss.getSheetByName("Alumni");
  var tracerSheet = ss.getSheetByName("Tracer");

  if (!alumniSheet) return { status: "success", data: [] };

  var alumniRows = alumniSheet.getDataRange().getValues();
  var tracerRows = tracerSheet ? tracerSheet.getDataRange().getValues() : [];

  var latestTracer = {};
  for (var t = 1; t < tracerRows.length; t++) {
    var alumniId = String(tracerRows[t][1]);
    latestTracer[alumniId] = tracerRows[t][3];
  }

  var result = [];
  for (var i = 1; i < alumniRows.length; i++) {
    var id = String(alumniRows[i][0]);
    result.push({
      id_alumni: id,
      nisn: alumniRows[i][1],
      nama: alumniRows[i][3],
      jk: alumniRows[i][4],
      tahun_lulus: alumniRows[i][8],
      hp: alumniRows[i][7],
      status_tracer: latestTracer[id] || "Belum Mengisi"
    });
  }

  return { status: "success", data: result };
}

// --- GENERATE DATA-REFERENSI.JS SNIPPET FROM SPREADSHEET ---
function generateReferensiJS() {
  var ss = getDB();
  var buSheet = ss.getSheetByName("RefBidangUsaha");
  var jpSheet = ss.getSheetByName("RefJenisPekerjaan");
  var tpSheet = ss.getSheetByName("RefTingkatPenghasilan");

  var buData = buSheet ? buSheet.getDataRange().getValues() : [];
  var jpData = jpSheet ? jpSheet.getDataRange().getValues() : [];
  var tpData = tpSheet ? tpSheet.getDataRange().getValues() : [];

  var jsContent = "// Dynamic Reference Generator - SMAS PGRI 1 Banjarbaru\n";
  jsContent += "const bidangUsahaList = " + JSON.stringify(buData.slice(1).map(function(r){ return { kode: r[0], label: r[1] }; }), null, 2) + ";\n\n";
  jsContent += "const jenisPekerjaanList = " + JSON.stringify(jpData.slice(1).map(function(r){ return { kode: r[0], label: r[1] }; }), null, 2) + ";\n\n";
  jsContent += "const tingkatPenghasilanList = " + JSON.stringify(tpData.slice(1).map(function(r){ return { kode: r[0], label: r[1] }; }), null, 2) + ";\n";

  return jsContent;
}
