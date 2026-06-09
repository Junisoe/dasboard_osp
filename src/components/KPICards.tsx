import { useState } from "react";
import { ProjectData } from "../types";
import { formatIDR, formatCompactIDR, formatNumber } from "../utils/formatter";
import { Briefcase, Coins, Database, HardDrive, ShieldCheck, TrendingUp, Landmark, FileText, Settings } from "lucide-react";
import { motion } from "motion/react";

interface KPICardsProps {
  filteredData: ProjectData[];
  totalDataCount: number;
}

export default function KPICards({ filteredData, totalDataCount }: KPICardsProps) {
  // Exclude BATAL from all KPI metrics and calculations
  const activeData = filteredData.filter(item => String(item.status || "").toUpperCase() !== "BATAL");

  // Compute totals based on active non-batal LOPs
  const totalProjects = activeData.length;
  const totalBOQ = activeData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  const totalMaterial = activeData.reduce((sum, item) => sum + (item.material || 0), 0);
  const totalJasa = activeData.reduce((sum, item) => sum + (item.jasa || 0), 0);
  const totalSitac = activeData.reduce((sum, item) => sum + (item.sitac || 0), 0);

  // Milestone/Financial summaries
  const totalPanjar60 = activeData.reduce((sum, item) => sum + (item.panjar60 || 0), 0);
  const totalPanjarSitac = activeData.reduce((sum, item) => sum + (item.panjarSitac || 0), 0);
  const totalPelunasan15 = activeData.reduce((sum, item) => sum + (item.pelunasan15 || 0), 0);
  const totalPendapatanMaharani = activeData.reduce((sum, item) => sum + (item.pendapatanMaharani || 0), 0);

  // Compute active data limit
  const activeTotalDataCount = totalDataCount;

  // Status-based breakdown (for active or done statuses)
  const doneCount = activeData.filter(item => item.status === "BERKAS DONE").length;
  const donePercentage = totalProjects > 0 ? (doneCount / totalProjects) * 100 : 0;

  const cardData = [
    {
      id: "stat-project",
      title: "Total LOP Aktif",
      value: formatNumber(totalProjects),
      suffix: `dari ${activeTotalDataCount} LOP Aktif`,
      description: "Jumlah progres LOP dalam filter saat ini",
      icon: Briefcase,
      color: "from-indigo-500 to-blue-600",
      bgLight: "bg-indigo-50/50 text-indigo-700",
      progressBar: {
        percentage: activeTotalDataCount > 0 ? (totalProjects / activeTotalDataCount) * 100 : 0,
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

  const [selectedSector, setSelectedSector] = useState<"ALL" | "MHR" | "DKU" | "TA">("ALL");

  // Sector MHR
  const mhrData = activeData.filter(item => String(item.pekerjaan).toUpperCase() === "MHR");
  const mhrTotalBOQ = mhrData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  const mhrPanjar60 = mhrData.reduce((sum, item) => sum + (item.panjar60 || 0), 0);
  const mhrPanjarSitac = mhrData.reduce((sum, item) => sum + (item.panjarSitac || 0), 0);
  const mhrPelunasan15 = mhrData.reduce((sum, item) => sum + (item.pelunasan15 || 0), 0);
  const mhrPendapatanMaharani = mhrData.reduce((sum, item) => sum + (item.pendapatanMaharani || 0), 0);

  // Sector DKU
  const dkuData = activeData.filter(item => String(item.pekerjaan).toUpperCase() === "DKU");
  const dkuTotalBOQ = dkuData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  const dkuPanjar60 = dkuData.reduce((sum, item) => sum + (item.panjar60 || 0), 0);

  // Sector TA
  const taData = activeData.filter(item => String(item.pekerjaan).toUpperCase() === "TA");
  const taTotalBOQ = taData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  const taPanjar60 = taData.reduce((sum, item) => sum + (item.panjar60 || 0), 0);

  const mhrMilestones = [
    {
      title: "Panjar 60% MHR",
      value: mhrPanjar60,
      color: "text-rose-700 bg-rose-50/70 border-rose-100",
      iconColor: "text-rose-500"
    },
    {
      title: "Panjar SITAC MHR",
      value: mhrPanjarSitac,
      color: "text-amber-700 bg-amber-50/70 border-amber-100",
      iconColor: "text-amber-500"
    },
    {
      title: "Pelunasan 15% MHR",
      value: mhrPelunasan15,
      color: "text-teal-700 bg-teal-50/70 border-teal-100",
      iconColor: "text-teal-500"
    },
    {
      title: "Pendapatan Maharani 25%",
      value: mhrPendapatanMaharani,
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

      {/* Financial Milestone Cards - Only shown if MHR, DKU, or TA is present in active view */}
      {activeData.some(item => {
        const pk = String(item.pekerjaan || "").toUpperCase();
        return pk === "MHR" || pk === "DKU" || pk === "TA";
      }) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Status Finansial & Pembagian Milestone</h3>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setSelectedSector("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedSector === "ALL"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Semua Sektor
              </button>
              <button
                onClick={() => setSelectedSector("MHR")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedSector === "MHR"
                    ? "bg-rose-50 bg-white text-rose-700 shadow-sm border border-rose-100"
                    : "text-slate-500 hover:text-rose-700"
                }`}
              >
                Sektor MHR
              </button>
              <button
                onClick={() => setSelectedSector("DKU")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedSector === "DKU"
                    ? "bg-sky-50 bg-white text-sky-700 shadow-sm border border-sky-100"
                    : "text-slate-500 hover:text-sky-750"
                }`}
              >
                Sektor DKU
              </button>
              <button
                onClick={() => setSelectedSector("TA")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedSector === "TA"
                    ? "bg-indigo-50 bg-white text-indigo-700 shadow-sm border border-indigo-100"
                    : "text-slate-500 hover:text-indigo-750"
                }`}
              >
                Sektor TA
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Sektor MHR Section */}
            {(selectedSector === "ALL" || selectedSector === "MHR") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 border-l-2 border-rose-500 pl-2">
                    <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase">SEKTOR MHR (4 Tahap Milestone)</h4>
                  </div>
                  <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-mono font-bold border border-rose-100/50">
                    Total BOQ MHR: {formatIDR(mhrTotalBOQ)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mhrMilestones.map((milestone, idx) => (
                    <motion.div
                      key={`mhr-${idx}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-xl border flex items-center justify-between bg-white ${milestone.color} transition-all duration-200 hover:scale-[1.01]`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block mb-1">
                          {milestone.title}
                        </span>
                        <span className="text-lg md:text-xl font-extrabold tracking-tight block">
                          {formatIDR(milestone.value)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white/70 rounded-lg shadow-sm border border-black/[0.03] ml-2 shrink-0">
                        <Landmark className={`w-4 h-4 ${milestone.iconColor}`} />
                      </div>
                    </motion.div>
                  ))}
                </div>
                {/* Info block for MHR financial math */}
                <div className="bg-rose-50/40 rounded-xl p-3 border border-rose-100/30 text-[11px] text-rose-800 leading-relaxed flex items-start gap-2 mt-2">
                  <span className="text-sm shrink-0 mt-0.5">ℹ️</span>
                  <span>
                    Bagi <strong>Sektor MHR</strong>, nominal 60% disebut sebagai <strong>PANJAR</strong> karena sisa pelunasan sebesar <strong>15%</strong> baru dibayarkan ketika progres berkas mencapai <strong>STATUS TERBAYAR / BERKAS DONE</strong>. Dengan sisa 25% keuntungan, MHR secara tepat memperoleh hak bersih sebesar <strong>25%</strong> dari total pekerjaan MHR.
                  </span>
                </div>
              </div>
            )}

            {/* Sektor DKU & Sektor TA Section */}
            {(selectedSector === "ALL" || selectedSector === "DKU" || selectedSector === "TA") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {(selectedSector === "ALL" || selectedSector === "DKU") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 border-l-2 border-sky-500 pl-2">
                        <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase">SEKTOR DKU (Milestone 60%)</h4>
                      </div>
                      <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-mono font-bold border border-sky-100/50">
                        Total BOQ DKU: {formatIDR(dkuTotalBOQ)}
                      </span>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border bg-white flex items-center justify-between text-sky-700 bg-sky-50/70 border-sky-100 transition-all duration-200 hover:scale-[1.01]"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 block mb-1">
                          Penghasilan 60% DKU (60% Material + Jasa)
                        </span>
                        <span className="text-xl font-extrabold tracking-tight block">
                          {formatIDR(dkuPanjar60)}
                        </span>
                        <span className="text-[9px] opacity-75 mt-0.5 block">60% porsi keuangan ini merupakan Penghasilan selesai operasional</span>
                      </div>
                      <div className="p-3 bg-white/70 rounded-lg shadow-sm border border-sky-100 shrink-0 ml-3">
                        <Landmark className="w-5 h-5 text-sky-500" />
                      </div>
                    </motion.div>
                  </div>
                )}

                {(selectedSector === "ALL" || selectedSector === "TA") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 border-l-2 border-indigo-500 pl-2">
                        <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase">SEKTOR TA (Milestone 60%)</h4>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-mono font-bold border border-indigo-100/50">
                        Total BOQ TA: {formatIDR(taTotalBOQ)}
                      </span>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border bg-white flex items-center justify-between text-indigo-700 bg-indigo-50/70 border-indigo-100 transition-all duration-200 hover:scale-[1.01]"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 block mb-1">
                          Penghasilan 60% TA (60% Material + Jasa)
                        </span>
                        <span className="text-xl font-extrabold tracking-tight block">
                          {formatIDR(taPanjar60)}
                        </span>
                        <span className="text-[9px] opacity-75 mt-0.5 block">60% porsi keuangan ini merupakan Penghasilan selesai operasional</span>
                      </div>
                      <div className="p-3 bg-white/70 rounded-lg shadow-sm border border-indigo-100 shrink-0 ml-3">
                        <Landmark className="w-5 h-5 text-indigo-500" />
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Status Progress Header */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>
                Persentase Kelengkapan Berkas (BERKAS DONE): <strong className="text-slate-700">{donePercentage.toFixed(1)}%</strong> ({doneCount} dari {totalProjects} LOP)
              </span>
            </div>
            <div className="flex items-center md:justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
              <span>Kalkulasi milestone berdasarkan pilar data real-time LOP MHR, DKU, dan TA.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
