import React, { useState, useEffect } from "react";
import { ProjectData } from "../types";
import { formatIDR, formatCompactIDR } from "../utils/formatter";
import { X, Sparkles, Copy, Check, FileText, Send, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExecutiveSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectData[];
}

export default function ExecutiveSummary({ isOpen, onClose, projects }: ExecutiveSummaryProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Status message rotation during AI query
  const [loadingMessage, setLoadingMessage] = useState<string>("Mengumpulkan data statistik proyek...");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      const messages = [
        "Menganalisis total volume BOQ & material...",
        "Menghitung rasio milestone pembayaran (60% vs 100% OSP)...",
        "Memformulasikan rincian performa per sektor (DKU, TA, MHR)...",
        "Menghubungi asisten AI Gemini-3.5-Flash...",
        "Menyusun visual narasi & tindakan aksi logistik..."
      ];
      let idx = 0;
      interval = setInterval(() => {
        setLoadingMessage(messages[idx % messages.length]);
        idx++;
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setSummary("");

    try {
      // 1. Exclude batals & calculate metrics
      const activeProjects = projects.filter(p => String(p.status).toUpperCase() !== "BATAL");
      
      const totalProjects = activeProjects.length;
      const totalBOQ = activeProjects.reduce((sum, p) => sum + (p.jumlah || 0), 0);
      const totalMaterial = activeProjects.reduce((sum, p) => sum + (p.material || 0), 0);
      const totalJasa = activeProjects.reduce((sum, p) => sum + (p.jasa || 0), 0);
      const totalSitac = activeProjects.reduce((sum, p) => sum + (p.sitac || 0), 0);

      const statusBreakdown: Record<string, number> = {};
      activeProjects.forEach(p => {
        const s = String(p.status).toUpperCase();
        statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
      });

      const sectorBreakdown: Record<string, { count: number; totalBOQ: number; totalPanjar: number }> = {
        "MHR": { count: 0, totalBOQ: 0, totalPanjar: 0 },
        "DKU QE": { count: 0, totalBOQ: 0, totalPanjar: 0 },
        "DKU OSP": { count: 0, totalBOQ: 0, totalPanjar: 0 },
        "TA": { count: 0, totalBOQ: 0, totalPanjar: 0 }
      };

      activeProjects.forEach(p => {
        let sector = String(p.pekerjaan).toUpperCase();
        if (sector === "DKU") sector = "DKU QE"; // backwards compatibility
        
        if (!sectorBreakdown[sector]) {
          sectorBreakdown[sector] = { count: 0, totalBOQ: 0, totalPanjar: 0 };
        }
        
        sectorBreakdown[sector].count += 1;
        sectorBreakdown[sector].totalBOQ += p.jumlah || 0;
        sectorBreakdown[sector].totalPanjar += p.panjar60 || 0;
      });

      const statsPayload = {
        totalProjects,
        totalBOQ,
        totalMaterial,
        totalJasa,
        totalSitac,
        statusBreakdown,
        sectorBreakdown
      };

      // 2. Call the server endpoint
      const response = await fetch("/api/executive-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(statsPayload)
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Gagal memperoleh tanggapan dari server AI.");
      }

      setSummary(result.text || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menghasilkan laporan. Mohon coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateReport();
    }
  }, [isOpen]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const textEncoded = encodeURIComponent(summary);
    const url = `https://api.whatsapp.com/send?text=${textEncoded}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  // Simple and highly effective inline custom parser to display rich formatting (headers, bullets, bold tags) nicely without full react-markdown
  const renderFormattedText = (rawStr: string) => {
    return rawStr.split("\n").map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-4" />;

      // Section Headings (e.g. 1. 📌 title)
      if (trimmed.startsWith("1.") || trimmed.startsWith("2.") || trimmed.startsWith("3.") || trimmed.startsWith("4.") || trimmed.startsWith("5.")) {
        return (
          <h4 key={idx} className="text-sm font-black text-slate-900 mt-6 mb-2 tracking-tight flex items-center gap-1.5 uppercase border-b border-slate-100 pb-1">
            {trimmed}
          </h4>
        );
      }

      // Bullets (e.g. - item or * item)
      const isBullet = trimmed.startsWith("-") || trimmed.startsWith("*");
      if (isBullet) {
        trimmed = trimmed.replace(/^[-*]\s*/, "");
        return (
          <div key={idx} className="flex items-start gap-2 pl-3.5 text-xs text-slate-600 my-1 leading-relaxed">
            <span className="text-indigo-500 font-extrabold select-none">•</span>
            <span>{parseBoldTags(trimmed)}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed my-2">
          {parseBoldTags(trimmed)}
        </p>
      );
    });
  };

  const parseBoldTags = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Dialog Box Body */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between col-span-1 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Analisis Ringkasan Eksekutif AI</h3>
              <p className="text-[11px] text-slate-500 font-medium">Laporan narasi finansial dinamis via Gemini 3.5 Flash</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Document */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-slate-800 block">Menghasilkan Laporan Finansial...</span>
                <span className="text-[11px] text-slate-400 font-medium animate-pulse block">{loadingMessage}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl space-y-4 max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">Gagal Menghubungkan Asisten AI</h4>
                  <p className="text-[11px] text-rose-600 leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-105 flex justify-end">
                <button
                  onClick={generateReport}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Ulang
                </button>
              </div>
            </div>
          )}

          {!loading && !error && summary && (
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-xs font-sans text-slate-700 select-text">
              {renderFormattedText(summary)}
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            {projects.length} LOP Aktif Teranalisis
          </span>

          <div className="flex items-center gap-2">
            {!loading && !error && summary && (
              <>
                {/* Copy Button */}
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Laporan</span>
                    </>
                  )}
                </button>

                {/* WhatsApp button */}
                <button
                  onClick={handleShareWhatsApp}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim WhatsApp</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
