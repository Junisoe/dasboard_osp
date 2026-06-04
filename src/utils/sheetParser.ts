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
    
    const pekerjaanStr = idxPekerjaan !== -1 ? String(row[idxPekerjaan]).trim().toUpperCase() : "";

    let panjar60 = 0;
    let panjarSitac = 0;
    let pelunasan15 = 0;
    let pendapatanMaharani = 0;

    if (pekerjaanStr === "MHR") {
      panjar60 = sanitizeNumberDirect(idxPanjar60 !== -1 ? row[idxPanjar60] : "0");
      panjarSitac = sanitizeNumberDirect(idxPanjarSitac !== -1 ? row[idxPanjarSitac] : "0");
      pelunasan15 = sanitizeNumberDirect(idxPelunasan15 !== -1 ? row[idxPelunasan15] : "0");
      pendapatanMaharani = sanitizeNumberDirect(idxPendapatanMaharani !== -1 ? row[idxPendapatanMaharani] : "0");

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

export function sanitizeNumberDirect(val: any): number {
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
