export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script - Real-time API Endpoint untuk Dashboard Monitoring Proyek
 * 
 * Petunjuk Penggunaan:
 * 1. Buka Google Spreadsheet data Anda.
 * 2. Klik menu 'Ekstensi' (Extensions) > 'Apps Script'.
 * 3. Hapus kode bawaan jika ada, lalu paste kode di bawah ini.
 * 4. Klik ikon Simpan (Save).
 * 5. Klik tombol 'Terapkan' (Deploy) > 'Penerapan baru' (New deployment).
 * 6. Pilih jenis: 'Aplikasi web' (Web app).
 * 7. Atur konfigurasi:
 *    - Deskripsi: API Dashboard LOP
 *    - Jalankan sebagai (Execute as): Diri Anda sendiri (Me)
 *    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
 * 8. Klik 'Terapkan' (Deploy). Anda akan dimintai otorisasi akses, berikan semua izin.
 * 9. Salin URL Aplikasi Web yang dihasilkan, lalu masukkan ke kolom "URL API Google Sheets" di Dashboard Anda!
 */

function doGet(e) {
  var sheetName = "REKAP"; // Prioritas sheet 'REKAP' sesuai instruksi user
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  }
  if (!sheet) {
    // Jika tidak ditemukan, default ke sheet pertama
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  }
  
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  if (values.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Sheet kosong atau hanya berisi file header saja"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = values[0].map(function(h) {
    return String(h).trim().toUpperCase();
  });
  
  var formattedData = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    
    // Skip if the row is entirely empty
    var isEmptyRow = row.every(function(val) {
      return val === "" || val === null || val === undefined;
    });
    if (isEmptyRow) continue;
    
    var obj = { id: String(i) };
    
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var cellValue = row[j];
      
      // Map Indonesian spreadheet columns to React API structure
      if (header === "BLN" || header === "BULAN") {
        obj.bln = String(cellValue).toUpperCase();
      } else if (header === "JENIS") {
        obj.jenis = String(cellValue).toUpperCase();
      } else if (header === "PEKERJAAN") {
        obj.pekerjaan = String(cellValue).toUpperCase();
      } else if (header === "BOQ") {
        obj.boq = String(cellValue).toUpperCase();
      } else if (header === "STATUS") {
        obj.status = String(cellValue).toUpperCase();
      } else if (header === "NAMA LOP" || header === "LOP" || header === "NAMA_LOP") {
        obj.namaLop = String(cellValue);
      } else if (header === "MATRIAL" || header === "MATERIAL") {
        obj.material = sanitizeNumber(cellValue);
      } else if (header === "JASA") {
        obj.jasa = sanitizeNumber(cellValue);
      } else if (header === "SITAC") {
        obj.sitac = sanitizeNumber(cellValue);
      } else if (header === "JUMLAH") {
        obj.jumlah = sanitizeNumber(cellValue);
      } else if (header === "PANJAR 60%" || header === "PANJAR 60" || header === "PANJAR") {
        obj.panjar60 = sanitizeNumber(cellValue);
      } else if (header === "PANJAR SITAC") {
        obj.panjarSitac = sanitizeNumber(cellValue);
      } else if (header === "PELUNASAN 15%" || header === "PELUNASAN 15" || header === "PELUNASAN") {
        obj.pelunasan15 = sanitizeNumber(cellValue);
      } else if (header === "PENDAPATAN MAHARANI 25%" || header === "PENDAPATAN MAHARANI") {
        obj.pendapatanMaharani = sanitizeNumber(cellValue);
      } else if (header === "TANGGAL PANJAR" || header === "TANGGAL") {
        if (cellValue instanceof Date) {
          obj.tanggalPanjar = Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
        } else {
          obj.tanggalPanjar = String(cellValue);
        }
      }
    }
    
    // Auto-calculate jumlah if not provided
    if (obj.jumlah === undefined || obj.jumlah === null || obj.jumlah === 0) {
      obj.jumlah = (obj.material || 0) + (obj.jasa || 0) + (obj.sitac || 0);
    }
    
    // Auto-calculate payment percentages if they are missing but jumlah exists
    if (obj.jumlah > 0) {
      if (obj.panjar60 === undefined || obj.panjar60 === null || obj.panjar60 === 0) {
        obj.panjar60 = Math.round(obj.jumlah * 0.6);
      }
      if (obj.pelunasan15 === undefined || obj.pelunasan15 === null || obj.pelunasan15 === 0) {
        obj.pelunasan15 = Math.round(obj.jumlah * 0.15);
      }
      if (obj.pendapatanMaharani === undefined || obj.pendapatanMaharani === null || obj.pendapatanMaharani === 0) {
        obj.pendapatanMaharani = Math.round(obj.jumlah * 0.25);
      }
    }
    
    formattedData.push(obj);
  }
  
  // Format Output JSON dengan mendukung CORS secara mandiri melalui redirect Apps Script
  var output = JSON.stringify({
    timestamp: new Date().toISOString(),
    totalRows: formattedData.length,
    data: formattedData
  });
  
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeNumber(val) {
  if (val === "" || val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  var str = String(val).trim();
  if (str === "" || str === "-") return 0;
  
  var hasComma = str.indexOf(",") !== -1;
  var hasDot = str.indexOf(".") !== -1;
  
  if (hasComma && !hasDot) {
    var occurrence = (str.match(/,/g) || []).length;
    if (occurrence > 1) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(/,/g, ".");
    }
  } else if (hasDot) {
    var dotOccurrence = (str.match(/\./g) || []).length;
    if (dotOccurrence > 1) {
      str = str.replace(/\./g, "");
    } else {
      var parts = str.split(".");
      if (parts[1] && parts[1].length === 3) {
        str = str.replace(/\./g, "");
      }
    }
  }
  
  var sanitized = str.replace(/[^0-9.-]/g, "");
  var num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}
`;
