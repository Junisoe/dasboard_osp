import React from "react";
import { ProjectData } from "../types";
import { formatIDR, formatCompactIDR } from "../utils/formatter";
import { ClipboardList, Send, Calendar, CheckCircle2, RefreshCw, Layers } from "lucide-react";
import { motion } from "motion/react";

interface StatusPipelineProps {
  data: ProjectData[];
}

export default function StatusPipeline({ data }: StatusPipelineProps) {
  // Determine counts
  const totalCount = data.length;
  const activeTotalCount = data.filter(item => String(item.status || "").toUpperCase() !== "BATAL").length;

  // Dynamically obtain all unique status types from the actual sheet data,
  // making sure they are displayed in a professional sequence (standard flow keys first, others appended)
  const statusKeys = React.useMemo(() => {
    const keys = new Set(["PLAN", "PEMBERKASAN", "PENGAJUAN REKON", "BERKAS DONE", "BATAL"]);
    data.forEach((item) => {
      const s = String(item.status || "").trim().toUpperCase();
      if (s) {
        keys.add(s);
      }
    });
    
    const standardOrder = ["PLAN", "PEMBERKASAN", "PENGAJUAN REKON", "BERKAS DONE", "BATAL"];
    const orderedKeys = standardOrder.filter(k => keys.has(k));
    keys.forEach(k => {
      if (!standardOrder.includes(k)) {
        orderedKeys.push(k);
      }
    });
    return orderedKeys;
  }, [data]);

  // Style mapper for default, standard, or custom status cards
  const getStatusMeta = (statusKey: string) => {
    switch (statusKey) {
      case "PLAN":
        return {
          label: "PLAN (Rencana)",
          description: "Tahap awal / perancangan pengerjaan LOP",
          color: "border-slate-100 text-slate-700 bg-slate-50/50",
          accentColor: "bg-slate-400",
          textColor: "text-slate-500",
          icon: Calendar,
        };
      case "PEMBERKASAN":
        return {
          label: "PEMBERKASAN",
          description: "Penyusunan file & dokumen pertanggungjawaban",
          color: "border-amber-100 text-amber-700 bg-amber-50/40",
          accentColor: "bg-amber-500",
          textColor: "text-amber-600",
          icon: ClipboardList,
        };
      case "PENGAJUAN REKON":
        return {
          label: "PENGAJUAN REKON",
          description: "Proses pengajuan rekonsiliasi nilai & verifikasi",
          color: "border-sky-100 text-sky-700 bg-sky-50/40",
          accentColor: "bg-sky-500",
          textColor: "text-sky-600",
          icon: Send,
        };
      case "BERKAS DONE":
        return {
          label: "BERKAS DONE (Selesai)",
          description: "Berkas LOP tuntas & siap dicairkan / ditutup",
          color: "border-emerald-100 text-emerald-700 bg-emerald-50/40",
          accentColor: "bg-emerald-500",
          textColor: "text-emerald-600",
          icon: CheckCircle2,
        };
      case "BATAL":
        return {
          label: "BATAL (Dibatalkan)",
          description: "Pekerjaan LOP dibatalkan / tidak dilanjutkan",
          color: "border-rose-100 text-rose-700 bg-rose-50/40",
          accentColor: "bg-rose-500",
          textColor: "text-rose-600",
          icon: RefreshCw,
        };
      default:
        return {
          label: statusKey,
          description: `Pekerjaan LOP terdaftar dengan status ${statusKey}`,
          color: "border-indigo-100 text-indigo-700 bg-indigo-50/40",
          accentColor: "bg-indigo-500",
          textColor: "text-indigo-600",
          icon: Layers,
        };
    }
  };

  // Build metrics for each status dynamically
  const pipelineData = statusKeys.map((key) => {
    const meta = getStatusMeta(key);
    const items = data.filter((item) => String(item.status || "").trim().toUpperCase() === key);
    const count = items.length;
    const valueSum = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);
    
    // Express percentage relative to total count, but if BATAL, it's relative to overall,
    // and if active, relative to all active LOPs so they sum to 100% cleanly!
    let percentage = 0;
    if (key === "BATAL") {
      percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
    } else {
      percentage = activeTotalCount > 0 ? (count / activeTotalCount) * 100 : 0;
    }

    return {
      key,
      ...meta,
      count,
      valueSum,
      percentage,
    };
  }).filter(status => status.count > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Status Berkas & Administrasi Pipeline</h3>
            <p className="text-xs text-slate-500">Distribusi real-time volume pekerjaan serta nilai rupiah dari status LOP</p>
          </div>
        </div>
        <div className="text-xs font-semibold bg-emerald-50 border border-emerald-100/50 text-emerald-800 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Total Progres: {activeTotalCount} LOP Aktif
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {pipelineData.map((status, idx) => {
          const IconComponent = status.icon;
          return (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:border-indigo-150 hover:shadow-xs transition-all duration-200 bg-white relative overflow-hidden group min-h-[190px]"
              id={`status-card-${status.key.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {/* Highlight bar top */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${status.accentColor}`} />

              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase mb-0.5">
                      {status.key}
                    </span>
                    <h4 className="text-xs font-bold text-slate-700 truncate" title={status.label}>
                      {status.label}
                    </h4>
                  </div>
                  <div className={`p-2 rounded-lg ${status.textColor} bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform duration-200 shrink-0`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                      {status.count}
                      <span className="text-xs font-semibold text-slate-400 ml-1">LOP</span>
                    </span>
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md">
                      {status.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2 min-h-[30px]" title={status.description}>
                    {status.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${status.accentColor} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(status.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                  <span>Nilai BOQ:</span>
                  <span className="text-slate-800 font-mono font-bold text-xs" title={formatIDR(status.valueSum)}>
                    {formatCompactIDR(status.valueSum)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
