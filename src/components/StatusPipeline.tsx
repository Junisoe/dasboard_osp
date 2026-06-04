import React from "react";
import { ProjectData } from "../types";
import { formatIDR, formatCompactIDR } from "../utils/formatter";
import { ClipboardList, Send, Calendar, CheckCircle2, RefreshCw, Layers } from "lucide-react";
import { motion } from "motion/react";

interface StatusPipelineProps {
  data: ProjectData[];
}

export default function StatusPipeline({ data }: StatusPipelineProps) {
  const totalCount = data.length;

  // Group data by status
  const statusMeta = [
    {
      key: "PLAN",
      label: "PLAN (Rencana)",
      description: "Tahap awal / perancangan pengerjaan LOP",
      color: "border-slate-100 text-slate-700 bg-slate-50/50",
      accentColor: "bg-slate-500",
      textColor: "text-slate-600",
      pieColor: "#64748b",
      icon: Calendar,
    },
    {
      key: "PEMBERKASAN",
      label: "PEMBERKASAN",
      description: "Penyusunan file & dokumen pertanggungjawaban",
      color: "border-amber-100 text-amber-700 bg-amber-50/40",
      accentColor: "bg-amber-500",
      textColor: "text-amber-600",
      pieColor: "#f59e0b",
      icon: ClipboardList,
    },
    {
      key: "PENGAJUAN REKON",
      label: "PENGAJUAN REKON",
      description: "Proses pengajuan rekonsiliasi nilai & verifikasi",
      color: "border-sky-100 text-sky-700 bg-sky-50/40",
      accentColor: "bg-sky-500",
      textColor: "text-sky-600",
      pieColor: "#0ea5e9",
      icon: Send,
    },
    {
      key: "BERKAS DONE",
      label: "BERKAS DONE (Selesai)",
      description: "Berkas LOP tuntas & siap dicairkan / ditutup",
      color: "border-emerald-100 text-emerald-700 bg-emerald-50/40",
      accentColor: "bg-emerald-500",
      textColor: "text-emerald-600",
      pieColor: "#10b981",
      icon: CheckCircle2,
    },
  ];

  // Derive metrics dynamically
  const pipelineData = statusMeta.map((meta) => {
    const items = data.filter((item) => String(item.status).toUpperCase() === meta.key);
    const count = items.length;
    const valueSum = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);
    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

    return {
      ...meta,
      count,
      valueSum,
      percentage,
    };
  });

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
        <div className="text-xs font-semibold bg-indigo-50 border border-indigo-100/50 text-indigo-700 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Total Progres: {totalCount} LOP Terpantau
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineData.map((status, idx) => {
          const IconComponent = status.icon;
          return (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:border-indigo-100 hover:shadow-xs transition-all duration-200 bg-white relative overflow-hidden group`}
              id={`status-card-${status.key.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {/* Highlight bar top */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${status.accentColor}`} />

              <div>
                <div className="flex justify-between items-start mb-2.5">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider block uppercase mb-0.5">
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

                <div className="space-y-1.5 mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-850 tracking-tight">
                      {status.count}
                      <span className="text-xs font-semibold text-slate-400 ml-1">LOP</span>
                    </span>
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md">
                      {status.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2 min-h-[30px]">
                    {status.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-50 space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${status.accentColor} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${status.percentage}%` }}
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
