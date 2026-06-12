// Low level CSV parser for robust sheet mapping
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== "")) {
        lines.push(row);
      }
      row = [];
      currentVal = "";
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
    } else {
      currentVal += char;
    }
  }
  
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== "")) {
      lines.push(row);
    }
  }

  return lines;
}

function sanitizeNumber(val: any): number {
  if (val === "" || val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim();
  if (str === "" || str === "-") return 0;
  
  str = str.replace(/(Rp|\$|EUR|IDR)\s?/gi, "");
  
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  
  if (lastComma > lastDot && (lastComma === str.length - 3 || lastComma === str.length - 2)) {
    str = str.replace(/\./g, "").replace(/,/g, ".");
  } else if (lastDot > lastComma && (lastDot === str.length - 3 || lastDot === str.length - 2)) {
    str = str.replace(/,/g, "");
  } else {
    const commaCount = (str.match(/,/g) || []).length;
    const dotCount = (str.match(/\./g) || []).length;
    
    if (commaCount > 1) {
      str = str.replace(/,/g, "");
    } else if (dotCount > 1) {
      str = str.replace(/\./g, "");
    } else if (commaCount === 1 && dotCount === 0) {
      const parts = str.split(",");
      if (parts[1].length === 3) {
        str = str.replace(/,/g, "");
      } else {
        str = str.replace(/,/g, ".");
      }
    } else if (dotCount === 1 && commaCount === 0) {
      const parts = str.split(".");
      if (parts[1].length === 3 && parseInt(parts[1]) % 100 === 0) {
        str = str.replace(/\./g, "");
      }
    }
  }
  
  const sanitized = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

// Safely convert parsed CSV lines into typed JSON data structures matching types.ts
function transformCSVRows(rows: string[][]): any[] {
  if (rows.length < 2) return [];
  
  let headerRowIndex = 0;
  let maxScore = -1;
  const targetAliases = [
    ["BLN", "BULAN", "MONTH"],
    ["JENIS", "CATEGORY", "TYPE"],
    ["PEKERJAAN", "JOB", "WORK"],
    ["BOQ", "BOQ TYPE"],
    ["STATUS", "PROGRESS"],
    ["NAMA LOP", "LOP", "NAMA_LOP", "PROJECT NAME", "NAMA"],
    ["MATRIAL", "MATERIAL", "BAHAN"],
    ["JASA", "SERVICES", "SERVICE"],
    ["SITAC", "SITAC COST"],
    ["JUMLAH", "TOTAL", "SUM"],
    ["PANJAR 60%", "PANJAR 60", "PANJAR", "DP 60%"],
    ["PANJAR SITAC", "SITAC 60%", "DP SITAC"],
    ["PELUNASAN 15%", "PELUNASAN 15", "PELUNASAN", "P15%"],
    ["PENDAPATAN MAHARANI 25%", "PENDAPATAN MAHARANI", "MAHARANI 25%", "M25%"],
    ["TANGGAL PANJAR", "TANGGAL", "DATE"]
  ];

  const rowsToSearch = Math.min(rows.length, 15);
  for (let r = 0; r < rowsToSearch; r++) {
    const rowTokens = rows[r].map(c => c.trim().toUpperCase());
    let score = 0;
    for (const aliases of targetAliases) {
      if (rowTokens.some(tok => aliases.includes(tok) || aliases.some(alias => tok.includes(alias)))) {
        score++;
      }
    }
    if (score >= 3 && score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }
  
  const headers = rows[headerRowIndex].map(h => h.trim().toUpperCase());
  
  const findHeaderIndex = (aliases: string[]) => {
    let index = headers.findIndex(h => aliases.includes(h));
    if (index !== -1) return index;
    return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
  };

  const idxBln = findHeaderIndex(["BLN", "BULAN", "MONTH"]);
  const idxJenis = findHeaderIndex(["JENIS", "CATEGORY", "TYPE"]);
  const idxPekerjaan = findHeaderIndex(["PEKERJAAN", "JOB", "WORK"]);
  const idxBoq = findHeaderIndex(["BOQ", "BOQ TYPE"]);
  const idxStatus = findHeaderIndex(["STATUS", "PROGRESS"]);
  const idxNamaLop = findHeaderIndex(["NAMA LOP", "LOP", "NAMA_LOP", "PROJECT NAME"]);
  const idxMaterial = findHeaderIndex(["MATRIAL", "MATERIAL", "BAHAN"]);
  const idxJasa = findHeaderIndex(["JASA", "SERVICES", "SERVICE"]);
  const idxSitac = findHeaderIndex(["SITAC", "SITAC COST"]);
  const idxJumlah = findHeaderIndex(["JUMLAH", "TOTAL", "SUM"]);
  const idxPanjar60 = findHeaderIndex(["PANJAR 60%", "PANJAR 60", "PANJAR", "DP 60%"]);
  const idxPanjarSitac = findHeaderIndex(["PANJAR SITAC", "SITAC 60%", "DP SITAC"]);
  const idxPelunasan15 = findHeaderIndex(["PELUNASAN 15%", "PELUNASAN 15", "PELUNASAN", "P15%"]);
  const idxPendapatanMaharani = findHeaderIndex(["PENDAPATAN MAHARANI 25%", "PENDAPATAN MAHARANI", "MAHARANI 25%", "M25%"]);
  const idxTanggalPanjar = findHeaderIndex(["TANGGAL PANJAR", "TANGGAL", "DATE"]);

  const results: any[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;
    
    const firstCol = row[0] || "";
    if (firstCol === "" && row.every(val => val === "")) {
      continue;
    }

    const bln = idxBln !== -1 ? row[idxBln] : "";
    if (!bln || bln === "BLN" || bln === "BULAN" || bln === "") continue;

    const material = sanitizeNumber(idxMaterial !== -1 ? row[idxMaterial] : "0");
    const jasa = sanitizeNumber(idxJasa !== -1 ? row[idxJasa] : "0");
    const sitac = sanitizeNumber(idxSitac !== -1 ? row[idxSitac] : "0");
    const jumlah = material + jasa;
    
    const pekerjaanStr = idxPekerjaan !== -1 ? String(row[idxPekerjaan]).trim().toUpperCase() : "";

    let panjar60 = 0;
    let panjarSitac = 0;
    let pelunasan15 = 0;
    let pendapatanMaharani = 0;

    if (pekerjaanStr === "MHR") {
      panjar60 = sanitizeNumber(idxPanjar60 !== -1 ? row[idxPanjar60] : "0");
      panjarSitac = sanitizeNumber(idxPanjarSitac !== -1 ? row[idxPanjarSitac] : "0");
      pelunasan15 = sanitizeNumber(idxPelunasan15 !== -1 ? row[idxPelunasan15] : "0");
      pendapatanMaharani = sanitizeNumber(idxPendapatanMaharani !== -1 ? row[idxPendapatanMaharani] : "0");

      if (panjar60 === 0 && jumlah > 0) {
        panjar60 = Math.round(jumlah * 0.60);
      }
      if (panjarSitac === 0 && sitac > 0) {
        panjarSitac = sitac;
      }
      if (pelunasan15 === 0 && jumlah > 0) {
        pelunasan15 = Math.round(jumlah * 0.15);
      }
      if (pendapatanMaharani === 0 && jumlah > 0) {
        pendapatanMaharani = Math.round(jumlah * 0.25);
      }
    }

    results.push({
      id: String(i - headerRowIndex),
      bln: bln,
      jenis: idxJenis !== -1 ? row[idxJenis] : "",
      pekerjaan: idxPekerjaan !== -1 ? row[idxPekerjaan] : "",
      boq: idxBoq !== -1 ? row[idxBoq] : "",
      status: idxStatus !== -1 ? row[idxStatus] : "",
      namaLop: idxNamaLop !== -1 ? row[idxNamaLop] : "",
      material,
      jasa,
      sitac,
      jumlah,
      panjar60,
      panjarSitac,
      pelunasan15,
      pendapatanMaharani,
      tanggalPanjar: idxTanggalPanjar !== -1 ? row[idxTanggalPanjar] : ""
    });
  }

  return results;
}

export default async function handler(req: any, res: any) {
  // CORS Headers response mapping
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
  
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const urlParam = req.query?.url || req.body?.url;
  const rawParam = req.query?.raw || req.body?.raw;
  const isRaw = rawParam === "true";

  if (!urlParam || typeof urlParam !== "string") {
    res.status(400).json({ error: "Missing 'url' parameter" });
    return;
  }

  try {
    const url = decodeURIComponent(urlParam);
    console.log(`[Vercel Serverless Proxy] Fetching Google Sheets URL: ${url} (raw=${isRaw})`);

    let spreadsheetId = "";
    if (url.includes("google.com/spreadsheets")) {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        spreadsheetId = match[1];
      }
    } else if (url.match(/^[a-zA-Z0-9-_]{40,50}$/)) {
      spreadsheetId = url.trim();
    }

    if (spreadsheetId) {
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : null;

      const sheetMatch = url.match(/[?&]sheet=([^&]+)/);
      const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1]) : null;

      const potentialUrls: string[] = [];

      if (isRaw) {
        if (sheetName) {
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`);
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`);
        } else if (gid) {
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`);
        } else {
          potentialUrls.push(url);
        }
      } else {
        if (gid) {
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`);
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
        }
        if (sheetName) {
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`);
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`);
        }

        potentialUrls.push(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=REKAP`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=REKAP`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=Sheet1`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=DATA`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=PROYEK`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=Laporan`
        );
      }

      let success = false;
      let isPrivate = false;
      let lastErrorMessage = "";

      for (const csvUrl of potentialUrls) {
        try {
          const csvResponse = await fetch(csvUrl, {
            headers: { "User-Agent": "PROYEKMON-Server-Proxy" }
          });

          if (!csvResponse.ok) {
            if (csvResponse.status === 401 || csvResponse.status === 403) {
              isPrivate = true;
            }
            lastErrorMessage = `HTTP Error ${csvResponse.status}: ${csvResponse.statusText}`;
            continue;
          }

          const contentType = csvResponse.headers.get("content-type") || "";
          const csvText = await csvResponse.text();
          const trimmedText = csvText.trim();

          const isHtml = 
            contentType.includes("text/html") || 
            trimmedText.startsWith("<") || 
            trimmedText.includes("<!DOCTYPE") || 
            trimmedText.includes("html") || 
            trimmedText.includes("google-signin") || 
            trimmedText.includes("ServiceLogin");

          if (isHtml) {
            isPrivate = true;
            continue;
          }

          const rows = parseCSV(csvText);
          
          if (rows.length > 0) {
            if (isRaw) {
              res.status(200).json({ source: "raw-csv", data: rows });
              return;
            }

            const mappedData = transformCSVRows(rows);
            
            if (mappedData.length > 0) {
              res.status(200).json({ source: "google-spreadsheet-csv", data: mappedData });
              return;
            } else {
              lastErrorMessage = "File Google Spreadsheet tersambung, tetapi tidak ditemukan kolom header yang sesuai (seperti BLN, JENIS, PEKERJAAN, STATUS, NAMA LOP, dll). Pastikan kolom header berada di baris-baris awal sheet Anda.";
            }
          }
        } catch (err: any) {
          lastErrorMessage = err.message || String(err);
        }
      }

      if (isPrivate) {
        res.status(403).json({
          error: "File Google Spreadsheet Anda bersifat privat (tidak dapat diakses oleh server proxy). Silakan buka file spreadsheet Anda, klik tombol 'Bagikan' (Share) di kanan atas, ubah Akses Umum menjadi 'Siapa saja yang memiliki link' (Anyone with the link) sebagai Viewer, lalu klik tombol 'Koneksikan' kembali."
        });
        return;
      }

      res.status(400).json({
        error: lastErrorMessage || "Gagal mengambil data dari Google Spreadsheet. Pastikan Spreadsheet Anda sudah dibagikan sebagai publik (Anyone with the link) dan memiliki format baris data yang lengkap."
      });
      return;
    }

    // Default fetch fallback
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "PROYEKMON-Server-Proxy"
      }
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script memberikan status respons: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    const trimmedText = text.trim();

    const isHtml = 
      contentType.includes("text/html") || 
      trimmedText.startsWith("<") || 
      trimmedText.includes("<!DOCTYPE") || 
      trimmedText.includes("html") || 
      trimmedText.includes("ServiceLogin") ||
      trimmedText.includes("google-signin");

    if (isHtml) {
      throw new Error("Tanggapan berupa halaman HTML, bukan data JSON. Hal ini biasanya karena Apps Script Anda dikonfigurasi secara privat ('Hanya saya') atau belum menyelesaikan otorisasi akses.\n\n💡 TIPS REKOMENDASI: Anda sebenarnya TIDAK memerlukan kode Google Apps Script sama sekali! Cukup masukkan LINK SPREADSHEET GOOGLE Anda secara langsung, pastikan akses link diatur ke 'Anyone with link / Siapa saja yang memiliki link sebagai Viewer', lalu klik tombol Koneksikan!");
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Tanggapan dari script bukan format JSON yang valid. Pastikan fungsi doGet pada script Anda mengembalikan ContentService.createTextOutput menggunakan format JSON string dari objek dengan properti data.");
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error("[Proxy Error]:", error);
    res.status(500).json({
      error: `Koneksi gagal melalui server proxy: ${error.message || error}`
    });
  }
}
