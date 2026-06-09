import React, { useEffect, useState, useMemo } from "react";
import { ProjectData } from "../types";
import { parseCSVDirect, parseDesignatorSheetRows, getDetailSheetNameForProject, DesignatorDetail } from "../utils/sheetParser";
import { formatIDR } from "../utils/formatter";
import { X, Search, FileSpreadsheet, Copy, Check, Download, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DesignatorDetailModalProps {
  project: ProjectData;
  apiUrl: string;
  isLive: boolean;
  onClose: () => void;
}

export default function DesignatorDetailModal({ project, apiUrl, isLive, onClose }: DesignatorDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [designators, setDesignators] = useState<DesignatorDetail[]>([]);
  const [sheetUsed, setSheetUsed] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usingSimulated, setUsingSimulated] = useState(false);

  // Derive target sheet name for this project
  const targetSheet = useMemo(() => {
    return getDetailSheetNameForProject(project.pekerjaan, project.boq, project.jenis);
  }, [project]);

  useEffect(() => {
    setSheetUsed(targetSheet);
    
    if (!isLive || !apiUrl) {
      console.log("[DetailModal] Running in offline simulated mode, rendering simulated designators.");
      setDesignators(generateMockDesignators(project));
      setUsingSimulated(true);
      return;
    }

    const loadDesignators = async () => {
      setLoading(true);
      setErrorMsg(null);
      setUsingSimulated(false);

      let spreadsheetId = "";
      if (apiUrl.includes("google.com/spreadsheets")) {
        const match = apiUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          spreadsheetId = match[1];
        }
      } else if (apiUrl.match(/^[a-zA-Z0-9-_]{40,50}$/)) {
        spreadsheetId = apiUrl.trim();
      }

      if (!spreadsheetId) {
        console.warn("[DetailModal] Spreadsheet ID could not be extracted from URL. Loading mock data.");
        setDesignators(generateMockDesignators(project));
        setUsingSimulated(true);
        setLoading(false);
        return;
      }

      // We have multiple attempts to fetch the tab
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetSheet)}`;
      const backupExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(targetSheet)}`;
      
      let success = false;
      let lastError = "";
      let fetchedRows: string[][] = [];

      // 1. Direct browser fetch for standard shareable sheet
      try {
        console.log(`[DetailModal] Attempting direct browser Gviz fetch for sheet: ${targetSheet}`);
        const response = await fetch(gvizUrl);
        if (response.ok) {
          const text = await response.text();
          if (text && !text.startsWith("<") && !text.includes("google-signin")) {
            const rows = parseCSVDirect(text);
            if (rows.length > 0) {
              fetchedRows = rows;
              success = true;
            }
          }
        }
      } catch (e: any) {
        lastError = e.message;
      }

      // 2. Direct browser fetch export CSV backup
      if (!success) {
        try {
          console.log(`[DetailModal] Direct Gviz failed. Trying direct export CSV fetch for: ${targetSheet}`);
          const response = await fetch(backupExportUrl);
          if (response.ok) {
            const text = await response.text();
            if (text && !text.startsWith("<") && !text.includes("google-signin")) {
              const rows = parseCSVDirect(text);
              if (rows.length > 0) {
                fetchedRows = rows;
                success = true;
              }
            }
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      // 3. Fallback to Server Proxy (bypasses browser CORS nicely)
      if (!success) {
        try {
          console.log(`[DetailModal] Both browser direct fetches failed. Falling back to server spreadsheet-proxy with raw parsing...`);
          const proxyUrl = `/api/sheets-proxy?url=${encodeURIComponent(gvizUrl)}&raw=true`;
          const response = await fetch(proxyUrl);
          if (response.ok) {
            const resData = await response.json();
            if (resData && resData.source === "raw-csv" && Array.isArray(resData.data) && resData.data.length > 0) {
              fetchedRows = resData.data;
              success = true;
            }
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (success && fetchedRows.length > 0) {
        console.log(`[DetailModal] Successfully fetched ${fetchedRows.length} rows for sheet: ${targetSheet}`);
        const parsedDetails = parseDesignatorSheetRows(fetchedRows, project.namaLop);
        
        if (parsedDetails.length > 0) {
          setDesignators(parsedDetails);
          setUsingSimulated(false);
        } else {
          console.warn(`[DetailModal] No designator column mapped for LOP "${project.namaLop}" in sheet tab "${targetSheet}". Loading simulated visualization as backup.`);
          setDesignators(generateMockDesignators(project));
          setUsingSimulated(true);
          setErrorMsg(`Kolom untuk LOP "${project.namaLop}" tidak ditemukan di tab spreadsheet "${targetSheet}". Visualisasi di bawah telah disimulasikan sesuai total BOQ proyek agar Anda tetap dapat menganalisis item.`);
        }
      } else {
        console.warn(`[DetailModal] Gagal memuat tab "${targetSheet}" dari Google Spreadsheet. Menampilkan visualisasi tersimulasi.`);
        setDesignators(generateMockDesignators(project));
        setUsingSimulated(true);
        setErrorMsg(`Gagal memuat sub-tab "${targetSheet}" langsung dari Google Spreadsheet demi alasan CORS/Privasi. Di bawah adalah rincian rAB tersimulasi berdasarkan total Material (${formatIDR(project.material)}) & Jasa (${formatIDR(project.jasa)}) proyek.`);
      }

      setLoading(false);
    };

    loadDesignators();
  }, [project, apiUrl, isLive, targetSheet]);

  // Generate mock designators matching exact totals to make simulated or offline mode spectacular
  function generateMockDesignators(proj: ProjectData): DesignatorDetail[] {
    const isMhr = proj.pekerjaan === "MHR";
    const isTa = proj.pekerjaan === "TA";
    const isDku = proj.pekerjaan === "DKU" || proj.pekerjaan === "DKU QE" || proj.pekerjaan === "DKU OSP";
    
    const mockItems: DesignatorDetail[] = [];
    
    if (proj.material > 0 && proj.jasa > 0) {
      mockItems.push({
        id: "mock-1",
        code: isMhr ? "M-AC-OF-SM-ADSS-12D" : isTa ? "M-DD-HDPE-40" : "M-AC-OF-SM-12-SC",
        description: isMhr 
          ? "Pengadaan Kabel Udara Fiber Optik All Dielectric Self Supporting (ADSS) 12 Core"
          : isTa 
          ? "Pengadaan Pipa HDPE 40/33 mm (Bahan)"
          : "Pengadaan Kabel Udara Fiber Optik Core 12 SC (Material)",
        unit: isMhr || isTa ? "meter" : "pcs",
        rateMaterial: Math.round(proj.material / 250) || 5000,
        rateJasa: 0,
        volume: 250,
        amountMaterial: proj.material,
        amountJasa: 0,
        amountTotal: proj.material
      });
      
      mockItems.push({
        id: "mock-2",
        code: isMhr ? "J-AC-OF-SM-ADSS-12D" : isTa ? "J-DD-HDPE-40" : "J-AC-OF-SM-12-SC",
        description: isMhr
          ? "Pemasangan Kabel Udara Fiber Optik All Dielectric Self Supporting (ADSS) 12 Core"
          : isTa
          ? "Pekerjaan Galian & Penimbunan Pipa HDPE"
          : "Jasa Penarikan Kabel Optik & Aksesori Tiang",
        unit: isMhr || isTa ? "meter" : "core",
        rateMaterial: 0,
        rateJasa: Math.round(proj.jasa / 250) || 4500,
        volume: 250,
        amountMaterial: 0,
        amountJasa: proj.jasa,
        amountTotal: proj.jasa
      });
    } else if (proj.material > 0) {
      mockItems.push({
        id: "mock-1",
        code: isDku ? "M-AC-OF-SM-12C" : "M-AC-OF-SM-ADSS-12D",
        description: isDku
          ? "Material Patchcord & OTB Terminasi"
          : "Pengadaan Material Kabel ADSS beserta Accessories Tiang",
        unit: "Pcs",
        rateMaterial: Math.round(proj.material / 5) || 24000,
        rateJasa: 0,
        volume: 5,
        amountMaterial: proj.material,
        amountJasa: 0,
        amountTotal: proj.material
      });
    } else if (proj.jasa > 0) {
      mockItems.push({
        id: "mock-2",
        code: "J-OS-SM-1",
        description: "Penyambungan (fusion splicing) serat optik single mode kap 1 core",
        unit: "core",
        rateMaterial: 0,
        rateJasa: Math.round(proj.jasa / 24) || 25000,
        volume: 24,
        amountMaterial: 0,
        amountJasa: proj.jasa,
        amountTotal: proj.jasa
      });
    }
    
    // Add SITAC if present
    if (proj.sitac > 0) {
      mockItems.push({
        id: "mock-sitac",
        code: "J-SITAC",
        description: "Penyelesaian Izin Sosial, Sewa Lahan, Kontrak dan Perizinan SITAC",
        unit: "Lumpsum",
        rateMaterial: 0,
        rateJasa: proj.sitac,
        volume: 1,
        amountMaterial: 0,
        amountJasa: proj.sitac,
        amountTotal: proj.sitac
      });
    }

    return mockItems;
  }

  // Calculate subtotals for items currently rendered
  const stats = useMemo(() => {
    let mats = 0;
    let jas = 0;
    let tot = 0;
    designators.forEach(d => {
      mats += d.amountMaterial;
      jas += d.amountJasa;
      tot += d.amountTotal;
    });
    return { mats, jas, tot };
  }, [designators]);

  // Filter designators based on user search query
  const filteredDesignators = useMemo(() => {
    if (!searchTerm.trim()) return designators;
    const query = searchTerm.toLowerCase();
    return designators.filter(item => 
      item.code.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query)
    );
  }, [designators, searchTerm]);

  // Export designators to CSV
  const handleDownloadCSV = () => {
    const csvContent = [
      ["No", "Designator Code", "Description", "Unit", "Volume", "Rate Material (IDR)", "Rate Jasa (IDR)", "Total Material (IDR)", "Total Jasa (IDR)", "Total Cost (IDR)"].join(","),
      ...designators.map((d, idx) => [
        idx + 1,
        `"${d.code}"`,
        `"${d.description.replace(/"/g, '""')}"`,
        `"${d.unit}"`,
        d.volume,
        d.rateMaterial,
        d.rateJasa,
        d.amountMaterial,
        d.amountJasa,
        d.amountTotal
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BOM_Designator_${project.namaLop.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy details table text
  const handleCopyClipboard = () => {
    const textRows = designators.map((d, idx) => 
      `${idx + 1}\t${d.code}\t${d.description}\t${d.volume}\t${d.unit}\t${d.amountTotal}`
    ).join("\n");
    
    const header = "No\tDesignator\tUraian Pekerjaan\tVol\tSatuan\tTotal Cost (IDR)\n";
    navigator.clipboard.writeText(header + textRows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="designator-modal-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
        id="designator-modal-card"
      >
        {/* Header bar */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex flex-col gap-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Sheet: {sheetUsed}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                {project.pekerjaan}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700">
                {project.boq}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700">
                {project.jenis}
              </span>
            </div>
            
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mt-1.5 break-all leading-tight">
              {project.namaLop}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
              Bulan Acuan: <strong className="text-slate-800">{project.bln}</strong>
              <span className="text-slate-300">•</span>
              Status: <strong className="text-slate-800">{project.status}</strong>
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
            id="close-designator-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body layout */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6" id="designator-modal-body">
          {/* Status feedback & warnings */}
          {errorMsg && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex gap-2.5 items-start">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Perhatian / Informasi</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* KPI Subtotal Comparators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total BOQ comparison Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Total BOQ (BOM)</p>
                <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">
                  {formatIDR(stats.tot)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100/70 flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Nilai Rekap Utama:</span>
                <span className="font-extrabold text-slate-700 font-mono">{formatIDR(project.jumlah)}</span>
              </div>
            </div>

            {/* Material Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Material (BOM)</p>
                <h3 className="text-xl font-bold text-blue-600 mt-1 font-mono">
                  {formatIDR(stats.mats)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100/70 flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Material Rekap Utama:</span>
                <span className="font-extrabold text-slate-700 font-mono">{formatIDR(project.material)}</span>
              </div>
            </div>

            {/* Jasa Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Jasa & Lainnya (BOM)</p>
                <h3 className="text-xl font-bold text-amber-600 mt-1 font-mono">
                  {formatIDR(stats.jas)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100/70 flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Jasa Rekap Utama:</span>
                <span className="font-extrabold text-slate-700 font-mono">{formatIDR(project.jasa)}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode designator atau uraian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleCopyClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin!" : "Salin Tabel"}
              </button>
              
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-600/10 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh CSV (BOM)
              </button>
            </div>
          </div>

          {/* Designator Table */}
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white min-h-[280px] flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-500 gap-3" id="designators-loading-view">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-medium">Menghubungkan ke sub-sheet spreadsheet {sheetUsed}...</p>
              </div>
            ) : filteredDesignators.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 text-center text-xs gap-2">
                <AlertTriangle className="w-6 h-6 text-slate-300" />
                <p className="font-semibold text-slate-700">Tidak ada item designator ditemukan</p>
                <p className="text-[11px] text-slate-400 font-medium">Mungkin volume porsi LOP ini kosong atau keyword pencarian Anda tidak memiliki rincian COA pencocokan.</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[450px] w-full relative">
                <table className="w-full text-left border-collapse table-auto">
                  <thead className="sticky top-0 bg-slate-50 z-10 shadow-[inset_0_-1px_0_0_rgba(15,23,42,0.05)]">
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-2.5 px-3.5 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Kode Designator</th>
                      <th className="py-2.5 px-3 w-[40%]">Uraian Pekerjaan</th>
                      <th className="py-2.5 px-3 text-center w-16">Satuan</th>
                      <th className="py-2.5 px-3 text-center w-20">Volume</th>
                      <th className="py-2.5 px-3 text-right">Harga Material (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Harga Jasa (Rp)</th>
                      <th className="py-2.5 px-3.5 text-right font-bold text-slate-500">Total Harga (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                    {filteredDesignators.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition duration-100">
                        <td className="py-3 px-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-3 px-3 font-semibold text-indigo-700 font-mono tracking-tight">{item.code}</td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-800 break-words leading-relaxed">{item.description}</p>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-medium">{item.unit}</td>
                        <td className="py-3 px-3 text-center text-slate-900 font-bold font-mono bg-slate-50/20 pr-4">{item.volume}</td>
                        <td className="py-3 px-3 text-right text-slate-600 font-mono">
                          {item.rateMaterial > 0 ? formatIDR(item.rateMaterial) : "-"}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-mono">
                          {item.rateJasa > 0 ? formatIDR(item.rateJasa) : "-"}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-slate-900 font-mono bg-indigo-50/10">
                          {formatIDR(item.amountTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer info/legend */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2 shrink-0">
          <p className="font-medium leading-normal">
            * Data designator disinkronisasikan berdasar tab <strong className="text-slate-600 font-bold">{sheetUsed}</strong> dari File Spreadsheet utama yang terhubung secara dinamis.
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Sistem Slicing Digital
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-500">
              {usingSimulated ? "Simulasi Mode (Offline/No Match)" : "Live data Terkoneksi"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
