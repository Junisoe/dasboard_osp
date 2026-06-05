import { ProjectData } from "../types";
import { formatIDR, formatCompactIDR, formatNumber } from "../utils/formatter";
import { Briefcase, Coins, Database, HardDrive, ShieldCheck, TrendingUp, Landmark, FileText, Settings } from "lucide-react";
import { motion } from "motion/react";

interface KPICardsProps {
  filteredData: ProjectData[];
  totalDataCount: number;
}

export default function KPICards({ filteredData, totalDataCount }: KPICardsProps) {
  // Compute totals
  const totalProjects = filteredData.length;
  const totalBOQ = filteredData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  const totalMaterial = filteredData.reduce((sum, item) => sum + (item.material || 0), 0);
  const totalJasa = filteredData.reduce((sum, item) => sum + (item.jasa || 0), 0);
  const totalSitac = filteredData.reduce((sum, item) => sum + (item.sitac || 0), 0);

  // Milestone/Financial summaries
  const totalPanjar60 = filteredData.reduce((sum, item) => sum + (item.panjar60 || 0), 0);
  const totalPanjarSitac = filteredData.reduce((sum, item) => sum + (item.panjarSitac || 0), 0);
  const totalPelunasan15 = filteredData.reduce((sum, item) => sum + (item.pelunasan15 || 0), 0);
  const totalPendapatanMaharani = filteredData.reduce((sum, item) => sum + (item.pendapatanMaharani || 0), 0);

  // Status-based breakdown (for active or done statuses)
  const doneCount = filteredData.filter(item => item.status === "BERKAS DONE").length;
  const donePercentage = totalProjects > 0 ? (doneCount / totalProjects) * 100 : 0;

  const cardData = [
    {
      id: "stat-project",
      title: "Total LOP Aktif",
      value: formatNumber(totalProjects),
      suffix: `dari ${totalDataCount} LOP`,
      description: "Jumlah progres LOP dalam filter saat ini",
      icon: Briefcase,
      color: "from-indigo-500 to-blue-600",
      bgLight: "bg-indigo-50/50 text-indigo-700",
      progressBar: {
        percentage: totalDataCount > 0 ? (totalProjects / totalDataCount) * 100 : 0,
        label: "Rasio data terfilter",
        color: "bg-indigo-600"
      }
    },
    {
      id: "stat-boq",
      title: "Nilai Total BOQ",
      value: formatCompactIDR(totalBOQ),
      suffix: formatIDR(totalBOQ),
      description: "Akumulasi nilai keseluruhan volume proyek",
      icon: Coins,
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50/50 text-emerald-700",
      progressBar: {
        percentage: totalBOQ > 0 ? (totalJasa / totalBOQ) * 100 : 0,
        label: `${((totalJasa / (totalBOQ || 1)) * 100).toFixed(0)}% Porsi Jasa`,
        color: "bg-emerald-600"
      }
    },
    {
      id: "stat-material",
      title: "Nilai Material",
      value: formatIDR(totalMaterial),
      description: "Total komponen material fisik proyek",
      icon: HardDrive,
      color: "from-sky-500 to-blue-500",
      bgLight: "bg-sky-50/50 text-sky-700",
    },
    {
      id: "stat-jasa",
      title: "Nilai Jasa",
      value: formatIDR(totalJasa),
      description: "Biaya jasa konstruksi dan instalasi",
      icon: Settings,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50/50 text-amber-700",
    },
    {
      id: "stat-sitac",
      title: "Nilai SITAC",
      value: formatIDR(totalSitac),
      description: "Biaya Site Acquisition & perizinan lahan",
      icon: Database,
      color: "from-purple-500 to-pink-500",
      bgLight: "bg-purple-50/50 text-purple-700",
    }
  ];

  const financialMilestones = [
    {
      title: "Panjar 60% Terbayar",
      value: totalPanjar60,
      color: "text-blue-700 bg-blue-50/70 border-blue-100",
      iconColor: "text-blue-500"
    },
    {
      title: "Panjar SITAC",
      value: totalPanjarSitac,
      color: "text-amber-700 bg-amber-50/70 border-amber-100",
      iconColor: "text-amber-500"
    },
    {
      title: "Pelunasan 15%",
      value: totalPelunasan15,
      color: "text-teal-700 bg-teal-50/70 border-teal-100",
      iconColor: "text-teal-500"
    },
    {
      title: "Pendapatan Maharani 25%",
      value: totalPendapatanMaharani,
      color: "text-purple-700 bg-purple-50/70 border-purple-100",
      iconColor: "text-purple-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Prime KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {cardData.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 relative overflow-hidden group"
          >
            {/* Hover Accent Glow */}
            <div className={`absolute -right-12 -top-12 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-[0.02] group-hover:opacity-10 transition-opacity duration-300`} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{card.title}</span>
                <div className={`p-2.5 rounded-xl ${card.bgLight} transition-all duration-300 group-hover:scale-105 shadow-sm`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{card.value}</span>
                {card.suffix && (
                  <span className="text-[10px] font-mono font-medium text-slate-400 mt-0.5 truncate" title={card.suffix}>
                    {card.suffix}
                  </span>
                )}
                <span className="text-xs text-slate-400 mt-2 line-clamp-1">{card.description}</span>
              </div>
            </div>

            {card.progressBar && (
              <div className="mt-4 pt-3 border-t border-slate-50">
                <div className="flex justify-between text-[10px] font-medium text-slate-500 mb-1">
                  <span>{card.progressBar.label}</span>
                  <span>{card.progressBar.percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${card.progressBar.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(card.progressBar.percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Financial Milestone Cards - Only shown if MHR is present in filtered view */}
      {filteredData.some(item => String(item.pekerjaan).toUpperCase() === "MHR") && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Status Finansial & Pembagian Milestone (Khusus MHR)</h3>
            </div>
            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100/50 px-2 py-0.5 rounded-md">
              Sektor Pekerjaan MHR
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {financialMilestones.map((milestone, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.15 + (idx * 0.05) }}
                className={`p-4 rounded-xl border flex items-center justify-between ${milestone.color} transition-all duration-200 hover:scale-[1.01]`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80 block mb-1">
                    {milestone.title}
                  </span>
                  <span className="text-xl md:text-2xl font-extrabold tracking-tight">
                    {formatIDR(milestone.value)}
                  </span>
                </div>
                <div className="p-3 bg-white/70 rounded-lg shadow-sm border border-black/[0.03] ml-3 shrink-0">
                  <Landmark className={`w-5 h-5 ${milestone.iconColor}`} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Real-time Status Progress Header */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>
                Persentase Kelengkapan Berkas (BERKAS DONE): <strong className="text-slate-700">{donePercentage.toFixed(1)}%</strong> ({doneCount} dari {totalProjects} LOP)
              </span>
            </div>
            <div className="flex items-center md:justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
              <span>Kalkulasi milestone berdasarkan pilar data real-time LOP MHR.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
