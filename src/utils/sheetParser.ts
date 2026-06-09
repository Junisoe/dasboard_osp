export function parseCSVDirect(text: string): string[][] {
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

export function transformCSVRowsDirect(rows: string[][]): any[] {
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
    ["JUMLAH", "TOTAL", "SUM"]
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

  if (maxScore < 3) {
    return [];
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

    const material = sanitizeNumberDirect(idxMaterial !== -1 ? row[idxMaterial] : "0");
    const jasa = sanitizeNumberDirect(idxJasa !== -1 ? row[idxJasa] : "0");
    const sitac = sanitizeNumberDirect(idxSitac !== -1 ? row[idxSitac] : "0");
    const jumlah = material + jasa;
    
    const rawPekerjaan = idxPekerjaan !== -1 ? String(row[idxPekerjaan]).trim().toUpperCase() : "";
    const pekerjaanStr = rawPekerjaan === "DKU" ? "DKU QE" : rawPekerjaan;

    let panjar60 = 0;
    let panjarSitac = 0;
    let pelunasan15 = 0;
    let pendapatanMaharani = 0;

    const isMhr = pekerjaanStr === "MHR";
    const isDkuOrTa = pekerjaanStr === "DKU QE" || pekerjaanStr === "TA";
    const isDkuOsp = pekerjaanStr === "DKU OSP";

    if (isDkuOsp) {
      panjar60 = sanitizeNumberDirect(idxPanjar60 !== -1 ? row[idxPanjar60] : "0");
      if (panjar60 === 0 && jumlah > 0) {
        panjar60 = jumlah; // 100% of BOQ for DKU OSP
      }
    } else if (isMhr || isDkuOrTa) {
      panjar60 = sanitizeNumberDirect(idxPanjar60 !== -1 ? row[idxPanjar60] : "0");
      if (panjar60 === 0 && jumlah > 0) {
        panjar60 = Math.round(jumlah * 0.60);
      }
    }

    if (isMhr) {
      panjarSitac = sanitizeNumberDirect(idxPanjarSitac !== -1 ? row[idxPanjarSitac] : "0");
      pelunasan15 = sanitizeNumberDirect(idxPelunasan15 !== -1 ? row[idxPelunasan15] : "0");
      pendapatanMaharani = sanitizeNumberDirect(idxPendapatanMaharani !== -1 ? row[idxPendapatanMaharani] : "0");

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
      pekerjaan: pekerjaanStr,
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

export function sanitizeNumberDirect(val: any): number {
  if (val === "" || val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim();
  if (str === "" || str === "-") return 0;
  
  str = str.replace(/(Rp|\$|EUR|IDR)\s?/gi, "");
  
  const hasComma = str.includes(",");
  const hasDot = str.includes(".");
  
  if (hasComma && hasDot) {
    // Determine decimal separator based on which one is the last separator
    const lastCommaIdx = str.lastIndexOf(",");
    const lastDotIdx = str.lastIndexOf(".");
    if (lastCommaIdx > lastDotIdx) {
      // Indonesian format: 1.532.060,00 -> remove dots, replace comma with dot decimal
      str = str.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // US/English format: 1,532,060.00 -> remove commas, keep the dot
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Multiple commas: e.g. "1,500,000" -> thousands separators
      str = str.replace(/,/g, "");
    } else {
      // Single comma: check if it is followed by exactly 3 digits
      const parts = str.split(",");
      if (parts[1] && parts[1].length === 3) {
        // e.g. "5,500" or "14,630" -> thousands separator because there is no other logical meaning in monetary prices
        str = str.replace(/,/g, "");
      } else {
        // e.g. "12,5" or "1,5" -> decimal separator
        str = str.replace(/,/g, ".");
      }
    }
  } else if (hasDot) {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots: e.g. "1.500.000" -> thousands separators
      str = str.replace(/\./g, "");
    } else {
      // Single dot: check if it is followed by exactly 3 digits
      const parts = str.split(".");
      if (parts[1] && parts[1].length === 3) {
        // e.g. "5.500" or "14.630" or "44.810" -> thousands separator
        str = str.replace(/\./g, "");
      } else {
        // e.g. "1.5" or "12.5" -> decimal separator
      }
    }
  }
  
  const sanitized = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

export interface DesignatorDetail {
  id: string;
  code: string;
  description: string;
  unit: string;
  rateMaterial: number;
  rateJasa: number;
  volume: number;
  amountMaterial: number;
  amountJasa: number;
  amountTotal: number;
}

export function getDetailSheetNameForProject(pekerjaan: string, boq: string, jenis: string): string {
  const pk = (pekerjaan || "").toUpperCase().trim();
  const bq = (boq || "").toUpperCase().trim();
  const jn = (jenis || "").toUpperCase().trim();

  // 1. MHR specific routes (check first so that MHR projects never fall back to simpler string-includes rules)
  if (pk === "MHR") {
    if (bq.includes("OSP LAMA")) {
      return "MHR OSP LAMA";
    }
    if (bq.includes("OSP BARU") || jn.includes("HEM")) {
      return "MHR OSP BARU";
    }
    if (bq.includes("MTEL LAMA") || bq.includes("MITRATEL LAMA")) {
      return "MHR MTEL LAMA";
    }
    if (bq.includes("MTEL BARU") || bq.includes("MITRATEL BARU")) {
      return "MHR MTEL BARU";
    }
  }

  // 2. DKU OSP sub-tab mapping
  if (pk === "DKU OSP" || bq.includes("DKU OSP") || pk.includes("DKU OSP")) {
    return "DKU OSP";
  }

  // 3. DKU QE (and legacy DKU) sub-tab mapping
  if (pk === "DKU QE" || pk === "DKU" || bq.includes("DKU QE") || pk.includes("DKU QE") || bq === "DKU" || pk.includes("DKU")) {
    return "DKU QE";
  }

  // 4. Exact match rules for TA, LA
  if (pk === "TA" || bq === "TA") {
    return "TA";
  }
  if (pk === "LA" || bq === "LA") {
    return "LA";
  }

  // 5. String includes fallback for TA, LA
  if (pk.includes("TA") || bq.includes("TA")) {
    return "TA";
  }
  // Be extremely careful not to let "OSP LAMA" match "LA"
  if ((pk.includes("LA") || bq.includes("LA")) && !bq.includes("LAMA")) {
    return "LA";
  }

  // Fallback to DKU QE
  return "DKU QE";
}

export function parseDesignatorSheetRows(rows: string[][], lopName: string): DesignatorDetail[] {
  if (rows.length < 1) return [];

  // 1. Find the header row
  // We look for a row containing typical designator code headers, search first 10 rows
  let headerRowIndex = 0;
  let maxScore = -1;
  const designatorKeywords = ["DESIGNATOR", "KODE", "CODE", "URAIAN", "SATUAN", "DESKRIPSI", "UNIT"];

  const searchRange = Math.min(rows.length, 10);
  for (let r = 0; r < searchRange; r++) {
    const rowTokens = rows[r].map(c => String(c).toUpperCase());
    let score = 0;
    for (const kw of designatorKeywords) {
      if (rowTokens.some(tok => tok.includes(kw))) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  const headerRow = rows[headerRowIndex] || [];
  const headers = headerRow.map(h => String(h).trim().toUpperCase());

  // 2. Find column matching our project (LOP) Name
  let targetColIdx = -1;
  const cleanLopName = lopName.trim().toUpperCase();

  // Try direct substring match in headers
  for (let c = 0; c < headerRow.length; c++) {
    const val = (headerRow[c] || "").trim().toUpperCase();
    if (val && (val.includes(cleanLopName) || cleanLopName.includes(val))) {
      targetColIdx = c;
      break;
    }
  }

  // If not found, try alphanumeric clean match to bypass typo or special formatting
  const cleanAlphanumeric = (s: string) => s.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (targetColIdx === -1) {
    const compLop = cleanAlphanumeric(lopName);
    if (compLop) {
      for (let c = 0; c < headerRow.length; c++) {
        const val = cleanAlphanumeric(headerRow[c] || "");
        if (val && (val.includes(compLop) || compLop.includes(val))) {
          targetColIdx = c;
          break;
        }
      }
    }
  }

  // If still not matched, return empty or try to see if there is any column.
  if (targetColIdx === -1) {
    console.warn(`[sheetParser] Column matching LOP "${lopName}" not found in sheet headers:`, headers);
    return [];
  }

  // 3. Find structural field column indices in this tab using exceptionally robust alphanumeric cleansing
  const cleanStr = (s: string) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

  const findHeaderIndex = (aliases: string[], fallback: number) => {
    const cleanAliases = aliases.map(cleanStr);
    
    // 1. Try exact cleaned match
    let idx = headers.findIndex(h => cleanAliases.includes(cleanStr(h)));
    if (idx !== -1) return idx;
    
    // 2. Try cleaned substring match
    idx = headers.findIndex(h => {
      const ch = cleanStr(h);
      if (!ch) return false;
      return cleanAliases.some(alias => ch.includes(alias) || alias.includes(ch));
    });
    return idx !== -1 ? idx : fallback;
  };

  // Find designator code column - fallback is index 1 (Column B: Desinator)
  const idxCode = findHeaderIndex(["DESIGNATOR", "DESINATOR", "KODE", "CODE", "DESIGNATOR MITRATEL"], 1);
  // Find project description column - fallback is index 2 (Column C: Uraian Pekerjaan)
  const idxDesc = findHeaderIndex(["URAIAN PEKERJAAN", "URAIAN", "DESCRIPTION", "DESKRIPSI", "PEKERJAAN"], 2);
  // Find unit column - fallback is index 3 (Column D: Satuan)
  const idxUnit = findHeaderIndex(["SATUAN", "UNIT"], 3);
  // Find unit price material column - fallback is index 4 (Column E: Material)
  const idxRateMat = findHeaderIndex(["PAKET 5 MATERIAL", "HARGA SATUAN (PAKET-5) MATERIAL", "MATERIAL", "HARGA SATUAN MATERIAL", "PAKET 5   MATERIAL"], 4);
  // Find unit price jasa column - fallback is index 5 (Column F: Jasa)
  const idxRateJas = findHeaderIndex(["JASA", "SERVICE", "SERVICES", "HARGA SATUAN JASA"], 5);

  const list: DesignatorDetail[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= targetColIdx) continue;

    const code = String(row[idxCode] || "").trim();
    const desc = String(row[idxDesc] || "").trim();
    if (!code && !desc) continue; // Skip totally empty spacer lines

    // Filter out rows that are actually total sum rows or header duplicates
    if (code.toUpperCase() === "TOTAL" || desc.toUpperCase().includes("TOTAL") || code.toUpperCase().includes("DESIGNATOR")) {
      continue;
    }

    const volumeStr = row[targetColIdx] || "";
    const volume = sanitizeNumberDirect(volumeStr);
    
    // Ignore rows where this project is not using this designator (volume is 0 or -)
    if (volume <= 0) continue;

    const rateMat = sanitizeNumberDirect(row[idxRateMat] || "0");
    const rateJas = sanitizeNumberDirect(row[idxRateJas] || "0");

    const amountMaterial = volume * rateMat;
    const amountJasa = volume * rateJas;
    const amountTotal = amountMaterial + amountJasa;

    list.push({
      id: String(i),
      code: code || "N/A",
      description: desc || "Uraian Pekerjaan",
      unit: String(row[idxUnit] || "").trim() || "pcs",
      rateMaterial: rateMat,
      rateJasa: rateJas,
      volume,
      amountMaterial,
      amountJasa,
      amountTotal
    });
  }

  return list;
}

