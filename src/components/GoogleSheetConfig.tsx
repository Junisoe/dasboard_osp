import React, { useState } from "react";
import { GOOGLE_APPS_SCRIPT_CODE } from "../utils/gasGenerator";
import { Check, Copy, Link, HelpCircle, FileSpreadsheet, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GoogleSheetConfigProps {
  currentUrl: string;
  onConnect: (url: string) => Promise<boolean>;
  onClear: () => void;
  isLive: boolean;
  isLoading: boolean;
  errorMsg: string | null;
}

export default function GoogleSheetConfig({
  currentUrl,
  onConnect,
  onClear,
  isLive,
  isLoading,
  errorMsg
}: GoogleSheetConfigProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true); // Default show instructions so they can see the recommendation on error
  const [activeTab, setActiveTab] = useState<'direct' | 'script'>('direct');

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await onConnect(urlInput.trim());
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Koneksi Google Sheets</h2>
            <p className="text-sm text-slate-500">Hubungkan dashboard Anda ke database spreadsheet secara real-time</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors duration-200 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            {showInstructions ? "Sembunyikan Panduan" : "Panduan Integrasi"}
          </button>
          {isLive && (
            <button
              onClick={() => {
                onClear();
                setUrlInput("");
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors duration-200 cursor-pointer"
            >
              Putuskan Koneksi
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="px-5 py-4 bg-slate-50/70 border border-slate-100 rounded-2xl text-slate-700 text-sm space-y-4">
              <div className="flex border-b border-slate-150 pb-2 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('direct')}
                  className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'direct' 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  ⚡ Koneksi Langsung (Sangat Direkomendasikan)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('script')}
                  className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'script' 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  ⚙️ Koneksi Lanjutan (Apps Script)
                </button>
              </div>

              {activeTab === 'direct' ? (
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2.5 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold mt-0.5 shrink-0">1</span>
                    <p className="text-slate-600 leading-relaxed">
                      Buka file Google Spreadsheet data monitoring proyek Anda.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold mt-0.5 shrink-0">2</span>
                    <p className="text-slate-600 leading-relaxed">
                      Klik tombol <strong className="text-slate-800">Bagikan (Share)</strong> di pojok kanan atas. Ubah Akses Umum menjadi <strong className="text-slate-800">"Siapa saja yang memiliki link" (Anyone with the link)</strong> sebagai Pengakses Lihat (Viewer).
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold mt-0.5 shrink-0">3</span>
                    <p className="text-slate-600 leading-relaxed">
                      Salin (Copy) link alamat URL Spreadsheet dari browser Anda (Contoh: <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[11px] text-indigo-600 font-semibold break-all">https://docs.google.com/spreadsheets/d/xxx/edit</code>) dan tempel pada input di bawah, lalu klik <strong className="text-slate-800">Koneksikan</strong>!
                    </p>
                  </div>
                  <div className="mt-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-slate-600 leading-relaxed space-y-1">
                    <div className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                      💡 TIPS STRUKTUR KOLOM:
                    </div>
                    <p>
                      Pastikan spreadsheet Anda berisi baris kolom header berikut di 15 baris pertama:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px] text-emerald-700">
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">BLN (bulan)</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">JENIS (kategori)</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">PEKERJAAN</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">BOQ</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">STATUS</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">NAMA LOP</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">MATRIAL (material)</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">JASA</span>
                      <span className="px-1 py-0.5 bg-emerald-100/50 border border-emerald-100 rounded font-semibold">SITAC</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Jika butuh melakukan proxy request kustom, Anda dapat menggunakan Apps Script. Ikuti panduan ini:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed text-xs">
                    <li>Buka Google Spreadsheet data monitoring Anda.</li>
                    <li>Klik menu <span className="font-semibold text-slate-850">Ekstensi (Extensions)</span> &gt; <span className="font-semibold text-slate-850">Apps Script</span>.</li>
                    <li>Salin kode di bawah ini, hapus kode default bawaan script, lalu paste.</li>
                    <li>Klik tombol <span className="font-semibold text-slate-850">Simpan</span> kemudian klik <span className="font-semibold text-slate-850">Terapkan (Deploy) &gt; Penerapan Baru</span>.</li>
                    <li>Setel "Tipe" ke <span className="font-semibold text-slate-850">Aplikasi web (Web App)</span>. Setel "Penerima" ke akun Anda, dan "Akses" ke <span className="font-semibold text-slate-850">Siapa saja (Anyone)</span>.</li>
                    <li>Klik Deploy, selesaikan Otorisasi, lalu salin <span className="font-semibold text-slate-850">URL Web App</span> yang dihasilkan ke kolom input di bawah.</li>
                  </ol>

                  <div className="pt-1.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kode Google Apps Script:</span>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Kode Script</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 text-slate-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[160px] shadow-inner select-all">
                      {GOOGLE_APPS_SCRIPT_CODE}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            URL Spreadsheet Google atau URL Apps Script Web App
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Link className="h-5 h-5" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400 font-mono shadow-inner"
              placeholder="Masukkan link spreadsheet Anda (pastikan di-share ke 'Anyone with link') atau script URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isLoading}
            />
            <div className="absolute inset-y-1.5 right-1.5">
              <button
                type="submit"
                disabled={isLoading || !urlInput.trim()}
                className="flex items-center justify-center gap-2 h-full px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-xs rounded-lg transition-all duration-200 shadow-sm"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Koneksikan"
                )}
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
            </span>
            <span className="font-semibold text-slate-600">
              Status Koneksi: {isLive ? "Terasosiasi dengan Google Sheet Aktif" : "Menggunakan Data Simulasi (Offline Mode)"}
            </span>
          </div>
          {isLive && (
            <div className="text-slate-400">
              Sinkronisasi Otomatis Teraktifkan
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
