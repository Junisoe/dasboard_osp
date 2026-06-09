import { useState, useEffect } from "react";
import { ProjectData } from "./types";
import { INITIAL_MOCK_DATA } from "./data/mockData";
import GoogleSheetConfig from "./components/GoogleSheetConfig";
import KPICards from "./components/KPICards";
import StatusPipeline from "./components/StatusPipeline";
import MonthlyCharts from "./components/MonthlyCharts";
import ProjectTable from "./components/ProjectTable";
import DesignatorDetailModal from "./components/DesignatorDetailModal";
import { LayoutDashboard, CloudLightning, FileSpreadsheet, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseCSVDirect, transformCSVRowsDirect } from "./utils/sheetParser";

export default function App() {
  const [data, setData] = useState<ProjectData[]>(() => {
    // Attempt to load previously added local simulations if any
    const savedSimulated = localStorage.getItem("simulated_lop_data");
    let rawList = INITIAL_MOCK_DATA;
    if (savedSimulated) {
      try {
        rawList = JSON.parse(savedSimulated);
      } catch (e) {
        rawList = INITIAL_MOCK_DATA;
      }
    }
    // Enforce business rules:
    // 1. Nilai Total BOQ (jumlah) adalah hasil penjumlahan Material + Jasa
    // 2. Pembagian Milestone 60% berlaku untuk pekerjaan MHR, DKU, dan TA. Sisa milestone lainnya khusus MHR.
    return rawList.map((item, idx) => {
      const pekerjaan = String(item.pekerjaan || "DKU").toUpperCase();
      const isMhr = pekerjaan === "MHR";
      const isDkuOrTa = pekerjaan === "DKU" || pekerjaan === "TA";
      const material = Number(item.material) || 0;
      const jasa = Number(item.jasa) || 0;
      const jumlah = material + jasa;
      const isMilestoneEligible = isMhr || isDkuOrTa;
      return {
        ...item,
        id: item.id || String(idx + 1),
        material,
        jasa,
        jumlah,
        panjar60: isMilestoneEligible ? (Number(item.panjar60) || Math.round(jumlah * 0.60)) : 0,
        panjarSitac: isMhr ? (Number(item.panjarSitac) || 0) : 0,
        pelunasan15: isMhr ? (Number(item.pelunasan15) || Math.round(jumlah * 0.15)) : 0,
        pendapatanMaharani: isMhr ? (Number(item.pendapatanMaharani) || Math.round(jumlah * 0.25)) : 0,
      };
    });
  });

  const [apiUrl, setApiUrl] = useState<string>(() => {
    const saved = localStorage.getItem("gas_api_url");
    if (saved === "") return "";
    return saved || "https://docs.google.com/spreadsheets/d/1gZ6b5f6W-Bpe5pl-Ua7vfoYIM_WHwWa5pUGou7NjlRI/edit?usp=sharing";
  });

  const [isLive, setIsLive] = useState<boolean>(() => {
    const savedIsLive = localStorage.getItem("gas_is_live");
    if (savedIsLive === "false") return false;
    if (savedIsLive === "true") return true;
    return true; // Default to true so it loads automatically on boot
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

  // Synchronize Google Sheets data trigger
  const handleConnectSheet = async (url: string): Promise<boolean> => {
    setIsLoading(true);
    setErrorMsg(null);
    setSyncSuccess(false);

    try {
      // 1. Try DIRECT browser-side CSV fetching if it is a Google Spreadsheet URL to bypass server proxy limits (critical for Static & Remix deploys)
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
        console.log(`[App] Trying direct browser fetch for Google Spreadsheet ID: ${spreadsheetId}`);
        const gidMatch = url.match(/[?&]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : null;

        const sheetMatch = url.match(/[?&]sheet=([^&]+)/);
        const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1]) : null;

        const potentialUrls: string[] = [];
        if (gid) {
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`);
        }
        if (sheetName) {
          potentialUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`);
        }
        potentialUrls.push(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=Sheet1`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=REKAP`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=DATA`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=PROYEK`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=Laporan`
        );

        let success = false;
        let lastError = "";
        let parsedRows: any[] = [];

        for (const csvUrl of potentialUrls) {
          try {
            const csvResponse = await fetch(csvUrl);
            if (!csvResponse.ok) {
              if (csvResponse.status === 401 || csvResponse.status === 403) {
                lastError = "PRIVATE_SHEET";
              }
              continue;
            }
            const text = await csvResponse.text();
            const trimmed = text.trim();
            const isHtml = trimmed.startsWith("<") || trimmed.includes("<!DOCTYPE") || trimmed.includes("html") || trimmed.includes("google-signin") || trimmed.includes("ServiceLogin");
            
            if (isHtml) {
              lastError = "PRIVATE_SHEET";
              continue;
            }

            const rows = parseCSVDirect(text);
            if (rows.length > 0) {
              const mapped = transformCSVRowsDirect(rows);
              if (mapped.length > 0) {
                parsedRows = mapped;
                success = true;
                break;
              } else {
                lastError = "Format kolom header sheet tidak sesuai (tidak ditemukan BLN, JENIS, PEKERJAAN, dll). Pastikan kolom header berada di baris pertama.";
              }
            }
          } catch (e: any) {
            lastError = "PRIVATE_SHEET";
          }
        }

        if (success) {
          const mappedProjects: ProjectData[] = parsedRows.map((row, idx) => {
            const pekerjaan = String(row.pekerjaan || "DKU").toUpperCase();
            const isMhr = pekerjaan === "MHR";
            const isDkuOrTa = pekerjaan === "DKU" || pekerjaan === "TA";
            const material = Number(row.material) || 0;
            const jasa = Number(row.jasa) || 0;
            const sitac = Number(row.sitac) || 0;
            const jumlah = material + jasa;
            const isMilestoneEligible = isMhr || isDkuOrTa;
            return {
              id: row.id || String(idx + 1),
              bln: String(row.bln || "MEI").toUpperCase(),
              jenis: String(row.jenis || "RECOVERY").toUpperCase(),
              pekerjaan: pekerjaan,
              boq: String(row.boq || "OSP LAMA").toUpperCase(),
              status: String(row.status || "BERKAS DONE").toUpperCase(),
              namaLop: String(row.namaLop || `LOP ${idx + 1}`),
              material: material,
              jasa: jasa,
              sitac: sitac,
              jumlah: jumlah,
              panjar60: isMilestoneEligible ? (Number(row.panjar60) || Math.round(jumlah * 0.60)) : 0,
              panjarSitac: isMhr ? (Number(row.panjarSitac) || sitac) : 0,
              pelunasan15: isMhr ? (Number(row.pelunasan15) || Math.round(jumlah * 0.15)) : 0,
              pendapatanMaharani: isMhr ? (Number(row.pendapatanMaharani) || Math.round(jumlah * 0.25)) : 0,
              tanggalPanjar: String(row.tanggalPanjar || "")
            };
          });

          setData(mappedProjects);
          setApiUrl(url);
          setIsLive(true);
          setErrorMsg(null);
          setSyncSuccess(true);
          setShowConfig(false);
          
          localStorage.setItem("gas_api_url", url);
          localStorage.setItem("gas_is_live", "true");
          localStorage.removeItem("simulated_lop_data");
          setTimeout(() => setSyncSuccess(false), 3000);
          return true;
        } else {
          if (lastError === "PRIVATE_SHEET") {
            throw new Error("File Google Spreadsheet Anda bersifat privat atau memerlukan login. Silakan klik tombol 'Bagikan' (Share) di pojok kanan atas spreadsheet Anda, ubah Akses Umum menjadi 'Siapa saja yang memiliki link' (Anyone with the link) sebagai Pengakses Lihat (Viewer), lalu coba hubungkan kembali.");
          } else {
            throw new Error(lastError || "Gagal memuat Google Spreadsheet secara langsung.");
          }
        }
      }

      // 2. Fallback to server-side proxy for API / Google Apps Script URLs
      const proxyUrl = `/api/sheets-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      const payload = await response.json();

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `HTTP Error! Status: ${response.status}`);
      }
      
      if (!payload || !Array.isArray(payload.data)) {
        throw new Error("Format data tidak sesuai. Pastikan Apps Script mengembalikan objek dengan properti 'data' berupa Array.");
      }

      const incomingData: any[] = payload.data;
      if (incomingData.length === 0) {
        throw new Error("Google Spreadsheet tersambung, tetapi tidak memiliki baris data proyek untuk diproses.");
      }

      const mappedProjects: ProjectData[] = incomingData.map((row, idx) => {
        const pekerjaan = String(row.pekerjaan || "DKU").toUpperCase();
        const isMhr = pekerjaan === "MHR";
        const isDkuOrTa = pekerjaan === "DKU" || pekerjaan === "TA";
        const material = Number(row.material) || 0;
        const jasa = Number(row.jasa) || 0;
        const sitac = Number(row.sitac) || 0;
        const jumlah = material + jasa;
        const isMilestoneEligible = isMhr || isDkuOrTa;
        return {
          id: row.id || String(idx + 1),
          bln: String(row.bln || "MEI").toUpperCase(),
          jenis: String(row.jenis || "RECOVERY").toUpperCase(),
          pekerjaan: pekerjaan,
          boq: String(row.boq || "OSP LAMA").toUpperCase(),
          status: String(row.status || "BERKAS DONE").toUpperCase(),
          namaLop: String(row.namaLop || `LOP ${idx + 1}`),
          material: material,
          jasa: jasa,
          sitac: sitac,
          jumlah: jumlah,
          panjar60: isMilestoneEligible ? (Number(row.panjar60) || Math.round(jumlah * 0.60)) : 0,
          panjarSitac: isMhr ? (Number(row.panjarSitac) || sitac) : 0,
          pelunasan15: isMhr ? (Number(row.pelunasan15) || Math.round(jumlah * 0.15)) : 0,
          pendapatanMaharani: isMhr ? (Number(row.pendapatanMaharani) || Math.round(jumlah * 0.25)) : 0,
          tanggalPanjar: String(row.tanggalPanjar || "")
        };
      });

      setData(mappedProjects);
      setApiUrl(url);
      setIsLive(true);
      setErrorMsg(null);
      setSyncSuccess(true);
      setShowConfig(false);
      
      localStorage.setItem("gas_api_url", url);
      localStorage.setItem("gas_is_live", "true");
      localStorage.removeItem("simulated_lop_data");

      setTimeout(() => setSyncSuccess(false), 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "";
      if (errMsg.includes("Unexpected token") || errMsg.includes("is not valid JSON") || errMsg.includes("Failed to fetch")) {
        errMsg = "File Google Spreadsheet Anda bersifat privat atau memerlukan login. Silakan klik tombol 'Bagikan' (Share) di pojok kanan atas spreadsheet Anda, ubah Akses Umum menjadi 'Siapa saja yang memiliki link' (Anyone with the link) sebagai Pengakses Lihat (Viewer), lalu coba hubungkan kembali.";
      }
      setErrorMsg(`Koneksi Gagal: ${errMsg}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConnection = () => {
    setApiUrl("");
    setIsLive(false);
    setErrorMsg(null);
    setData(INITIAL_MOCK_DATA.map((row, idx) => {
      const pekerjaan = String(row.pekerjaan || "DKU").toUpperCase();
      const isMhr = pekerjaan === "MHR";
      const isDkuOrTa = pekerjaan === "DKU" || pekerjaan === "TA";
      const material = Number(row.material) || 0;
      const jasa = Number(row.jasa) || 0;
      const jumlah = material + jasa;
      const isMilestoneEligible = isMhr || isDkuOrTa;
      return {
        ...row,
        id: row.id || String(idx + 1),
        material,
        jasa,
        jumlah,
        panjar60: isMilestoneEligible ? (Number(row.panjar60) || Math.round(jumlah * 0.60)) : 0,
        panjarSitac: isMhr ? (Number(row.panjarSitac) || 0) : 0,
        pelunasan15: isMhr ? (Number(row.pelunasan15) || Math.round(jumlah * 0.15)) : 0,
        pendapatanMaharani: isMhr ? (Number(row.pendapatanMaharani) || Math.round(jumlah * 0.25)) : 0,
      };
    }));
    localStorage.removeItem("gas_api_url");
    localStorage.removeItem("gas_is_live");
    localStorage.removeItem("simulated_lop_data");
  };

  // Automated sync if has persisted live URL on app mount
  useEffect(() => {
    if (isLive && apiUrl) {
      handleConnectSheet(apiUrl);
    }
  }, []);

  // Handler to add mock / simulated row
  const handleAddSimulatedRow = (newRow: Omit<ProjectData, "id">) => {
    const pekerjaan = String(newRow.pekerjaan || "DKU").toUpperCase();
    const isMhr = pekerjaan === "MHR";
    const isDkuOrTa = pekerjaan === "DKU" || pekerjaan === "TA";
    const material = Number(newRow.material) || 0;
    const jasa = Number(newRow.jasa) || 0;
    const sitac = Number(newRow.sitac) || 0;
    const jumlah = material + jasa; // Total BOQ: Material + Jasa
    const isMilestoneEligible = isMhr || isDkuOrTa;

    const freshRow: ProjectData = {
      ...newRow,
      id: String(Date.now()),
      material,
      jasa,
      sitac,
      jumlah,
      panjar60: isMilestoneEligible ? Math.round(jumlah * 0.60) : 0,
      panjarSitac: isMhr ? sitac : 0,
      pelunasan15: isMhr ? Math.round(jumlah * 0.15) : 0,
      pendapatanMaharani: isMhr ? Math.round(jumlah * 0.25) : 0,
    };
    const updated = [freshRow, ...data];
    setData(updated);
    
    // If we are in simulation mode (offline), persist local changes
    if (!isLive) {
      localStorage.setItem("simulated_lop_data", JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navigation bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-sm flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block leading-none">
                PROYEKMON
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                Dashboard Monitoring Real-Time
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLive ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden xs:inline">Google Sheet Tersambung</span>
                <span className="xs:hidden">Tersambung</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Simulasi Mode</span>
              </div>
            )}

            {isLive && apiUrl && (
              <button
                onClick={() => handleConnectSheet(apiUrl)}
                disabled={isLoading}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition duration-150 disabled:opacity-40"
                title="Sinkronkan Data Ulang"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setShowConfig((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition duration-150 shadow-xs cursor-pointer border ${
                showConfig
                  ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              title="Atur Koneksi Google Sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showConfig ? "Tutup Koneksi" : "Koneksi Google Sheet"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Monitoring Material & Jasa
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Visualisasikan BOQ, material, operasional jasa, dan progres pembayaran panjar secara interaktif.
            </p>
          </div>

          {syncSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold shadow-sm"
            >
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>Data Berhasil Disinkronkan!</span>
            </motion.div>
          )}
        </div>

        {/* 1. Google Sheets Connection Panel */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", scale: 1, marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <GoogleSheetConfig
                currentUrl={apiUrl}
                onConnect={handleConnectSheet}
                onClear={handleClearConnection}
                isLive={isLive}
                isLoading={isLoading}
                errorMsg={errorMsg}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Key Metrics Showcase Cards */}
        <KPICards filteredData={data} totalDataCount={data.length} />

        {/* 2b. Visual Status & Administrasi Pipeline cards */}
        <StatusPipeline data={data} />

        {/* 3. Dynamic Monthly & Status Charts */}
        <MonthlyCharts filteredData={data} />

        {/* 4. Complete Interactive Project Table & Queries */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Daftar Detail LOP</h2>
          </div>
          <ProjectTable 
            data={data} 
            onAddRow={handleAddSimulatedRow} 
            onLopClick={(item) => setSelectedProject(item)} 
          />
        </div>

      </main>

      {/* Modern Compact Footer */}
      <footer className="bg-white border-t border-slate-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
          <p>© 2026 PROYEKMON. Dashboard real-time terintegrasi dengan Google Apps Script.</p>
        </div>
      </footer>

      {/* Rincian Detail Designator LOP Modal Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <DesignatorDetailModal
            project={selectedProject}
            apiUrl={apiUrl}
            isLive={isLive}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
