import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheets Proxy API to bypass CORS
  app.get("/api/sheets-proxy", async (req, res) => {
    const { url, raw } = req.query;
    const isRaw = raw === "true";

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing 'url' parameter" });
      return;
    }

    try {
      console.log(`[Proxy] Fetching Google Sheets URL: ${url} (raw=${isRaw})`);

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
        console.log(`[Proxy] Detected Google Spreadsheet ID: ${spreadsheetId}`);

        // Extract GID and sheetName dynamically if present in the pasted link
        const gidMatch = url.match(/[?&]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : null;

        const sheetMatch = url.match(/[?&]sheet=([^&]+)/);
        const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1]) : null;

        const potentialUrls: string[] = [];

        // Prioritize explicit GID or sheetName specified by the user
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

          // Add standard sheet tabs and general sheet fallbacks to cover all bases
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
            console.log(`[Proxy] Trying to fetch CSV from: ${csvUrl}`);
            const csvResponse = await fetch(csvUrl, {
              headers: { "User-Agent": "PROYEKMON-Server-Proxy" }
            });

            if (!csvResponse.ok) {
              console.log(`[Proxy] CSV URL returned non-OK status: ${csvResponse.status}`);
              if (csvResponse.status === 401 || csvResponse.status === 403) {
                isPrivate = true;
              }
              lastErrorMessage = `HTTP Error ${csvResponse.status}: ${csvResponse.statusText}`;
              continue;
            }

            const contentType = csvResponse.headers.get("content-type") || "";
            const csvText = await csvResponse.text();
            const trimmedText = csvText.trim();

            // Check if this is actually an HTML page (Google login, warning, or private restriction screen)
            const isHtml = 
              contentType.includes("text/html") || 
              trimmedText.startsWith("<") || 
              trimmedText.includes("<!DOCTYPE") || 
              trimmedText.includes("html") || 
              trimmedText.includes("google-signin") || 
              trimmedText.includes("ServiceLogin");

            if (isHtml) {
              console.log(`[Proxy] CSV URL returned HTML content. This indicates privacy restrictions or redirect.`);
              isPrivate = true;
              continue; // Try next URL or fail with helpful message
            }

            // Parse CSV lines
            const rows = parseCSV(csvText);
            
            if (rows.length > 0) {
              if (isRaw) {
                console.log(`[Proxy] Successfully fetched and parsed ${rows.length} raw rows from ${csvUrl}`);
                res.json({ source: "raw-csv", data: rows });
                return;
              }

              const mappedData = transformCSVRows(rows);
              
              // Double check we actually successfully mapped at least some records
              if (mappedData.length > 0) {
                console.log(`[Proxy] Successfully fetched and parsed ${mappedData.length} rows directly as CSV from ${csvUrl}`);
                res.json({ source: "google-spreadsheet-csv", data: mappedData });
                return;
              } else {
                console.log(`[Proxy] Web CSV fetched but returned 0 valid rows with standard headers. CSV starts with: ${trimmedText.substring(0, 100)}`);
                lastErrorMessage = "File Google Spreadsheet tersambung, tetapi tidak ditemukan kolom header yang sesuai (seperti BLN, JENIS, PEKERJAAN, STATUS, NAMA LOP, dll). Pastikan kolom header berada di baris-baris awal sheet Anda.";
              }
            }
          } catch (err: any) {
            console.error(`[Proxy] Failed fetching ${csvUrl}:`, err);
            lastErrorMessage = err.message || String(err);
          }
        }

        if (isPrivate) {
          res.status(403).json({
            error: "File Google Spreadsheet Anda bersifat privat (tidak dapat diakses oleh server proxy). Silakan buka file spreadsheet Anda, klik tombol 'Bagikan' (Share) di kanan atas, ubah Akses Umum menjadi 'Siapa saja yang memiliki link' (Anyone with the link) sebagai Pengakses Lihat (Viewer), lalu klik tombol 'Koneksikan' kembali."
          });
          return;
        }

        res.status(400).json({
          error: lastErrorMessage || "Gagal mengambil data dari Google Spreadsheet. Pastikan Spreadsheet Anda sudah dibagikan sebagai publik (Anyone with the link) dan memiliki format baris data yang lengkap."
        });
        return;
      }

      // Default fetch for Google Apps Script Web App
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "PROYEKMON-Server-Proxy"
        },
        redirect: "follow"
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
        throw new Error("Tanggapan berupa halaman HTML, bukan data JSON. Hal ini biasanya karena Apps Script Anda dikonfigurasi secara privat ('Hanya saya') atau belum menyelesaikan otorisasi akses.\n\n💡 TIPS REKOMENDASI: Anda sebenarnya TIDAK memerlukan kode Google Apps Script sama sekali! Cukup masukkan LINK SPREADSHEET GOOGLE Anda secara langsung (contoh: https://docs.google.com/spreadsheets/d/xxx/edit), pastikan akses link diatur ke 'Anyone with link / Siapa saja yang memiliki link sebagai Viewer/Pengakses', lalu klik tombol Koneksikan!");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Tanggapan dari script bukan format JSON yang valid. Pastikan fungsi doGet pada script Anda mengembalikan ContentService.createTextOutput menggunakan format JSON string dari objek dengan properti data.");
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Proxy Error]:", error);
      res.status(500).json({
        error: `Koneksi gagal melalui server proxy: ${error.message || error}`
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini Executive Summary Generation Endpoint
  app.post("/api/executive-summary", async (req, res) => {
    try {
      const stats = req.body;
      if (!stats) {
        res.status(400).json({ error: "Missing statistical data payload." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: "API Key Gemini tidak terdeteksi di server. Silakan atur GEMINI_API_KEY Anda di Settings > Secrets."
        });
        return;
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const promptHtml = `As a professional Chief Financial Officer (CFO) & Operations Lead, analyze the following project data and write an executive summary report in Indonesian:
      - Total LOPs: ${stats.totalProjects}
      - Total BOQ: ${stats.totalBOQ}
      - Material Cost: ${stats.totalMaterial}
      - Service (Jasa) Cost: ${stats.totalJasa}
      - SITAC Cost: ${stats.totalSitac}
      
      Status Breakdown:
      ${JSON.stringify(stats.statusBreakdown, null, 2)}
      
      Sector Performance Breakdown (DKU QE, DKU OSP, MHR, TA):
      ${JSON.stringify(stats.sectorBreakdown, null, 2)}

      Please structure your response into these concise sections:
      1. 📌 **RINGKASAN UTAMA**: Overall financial state and active milestones performance.
      2. 📊 **ANALISIS SEKTORAL**: Direct insights regarding DKU OSP (which earns 100% of BOQ), DKU QE/TA (potential 60% panjar), and MHR (which has additional SITAC and 15% retention/25% maharani splits). Mention specifically which sector contributes the most.
      3. ⚠️ **DILEMA & ACCELERATION RADAR**: Highlight potential risks from projects currently stuck in "PLAN" or "PEMBERKASAN" statuses, detailing how moving them to "BERKAS DONE" can bolster the cash flow.
      4. 💡 **REKOMENDASI EKSEKUTIF**: Provide 2-3 precise and realistic actions for the logistics and financial coordination teams to optimize cash in for this month.

      Ensure the output is written in formal, professional Indonesian, with clear formatting, using bullet points and appropriate bold highlights. No greeting greetings, just start directly with the title. Keep it exceptionally readable, authoritative, and direct.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptHtml,
      });

      const summaryText = response.text || "Gagal menghasilkan ringkasan eksekutif.";
      res.json({ text: summaryText });
    } catch (e: any) {
      console.error("[Gemini Error]:", e);
      res.status(500).json({ error: e.message || "Gagal berinteraksi dengan API Gemini." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

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

// Safely convert parsed CSV lines into typed JSON data structures matching types.ts
function transformCSVRows(rows: string[][]): any[] {
  if (rows.length < 2) return [];
  
  // Find which row contains the header by matching known aliases
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

  // We inspect starting from top rows (up to 15 rows)
  const rowsToSearch = Math.min(rows.length, 15);
  for (let r = 0; r < rowsToSearch; r++) {
    const rowTokens = rows[r].map(c => c.trim().toUpperCase());
    let score = 0;
    for (const aliases of targetAliases) {
      if (rowTokens.some(tok => aliases.includes(tok) || aliases.some(alias => tok.includes(alias)))) {
        score++;
      }
    }
    // We want a high match score. Let's say we need at least 3 matched columns to be considered a header row.
    if (score >= 3 && score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  console.log(`[Proxy] Detected header row at index ${headerRowIndex} with score ${maxScore}`);
  
  const headers = rows[headerRowIndex].map(h => h.trim().toUpperCase());
  
  const findHeaderIndex = (aliases: string[]) => {
    // Exact match first
    let index = headers.findIndex(h => aliases.includes(h));
    if (index !== -1) return index;
    // Substring match as fallback
    return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
  };

  // Find indices for standard headers with aliases for safety
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
    
    // Skip empty filler rows
    const firstCol = row[0] || "";
    if (firstCol === "" && row.every(val => val === "")) {
      continue;
    }

    const bln = idxBln !== -1 ? row[idxBln] : "";
    if (!bln || bln === "BLN" || bln === "BULAN" || bln === "") continue; // Skip header replica or empty row

    const material = sanitizeNumber(idxMaterial !== -1 ? row[idxMaterial] : "0");
    const jasa = sanitizeNumber(idxJasa !== -1 ? row[idxJasa] : "0");
    const sitac = sanitizeNumber(idxSitac !== -1 ? row[idxSitac] : "0");
    const jumlah = material + jasa; // Total BOQ: Material + Jasa
    
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

function sanitizeNumber(val: any): number {
  if (val === "" || val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim();
  if (str === "" || str === "-") return 0;
  
  // Remove currency prefix and spaces
  str = str.replace(/(Rp|\$|EUR|IDR)\s?/gi, "");
  
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  
  if (lastComma > lastDot && (lastComma === str.length - 3 || lastComma === str.length - 2)) {
    // Indonesian style: 12.345.678,00 -> remove dot, change comma to dot
    str = str.replace(/\./g, "").replace(/,/g, ".");
  } else if (lastDot > lastComma && (lastDot === str.length - 3 || lastDot === str.length - 2)) {
    // English style: 12,345,678.00 -> remove comma
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

startServer();
