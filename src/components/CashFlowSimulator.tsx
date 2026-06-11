import React, { useState, useMemo } from "react";
import { ProjectData } from "../types";
import { formatIDR, formatCompactIDR } from "../utils/formatter";
import { X, TrendingUp, DollarSign, Calendar, Sparkles, CheckSquare, Square, ArrowRight, Lightbulb } from "lucide-react";
import { motion } from "motion/react";

interface CashFlowSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectData[];
}

export default function CashFlowSimulator({ isOpen, onClose, projects }: CashFlowSimulatorProps) {
  const [targetInput, setTargetInput] = useState<string>("5000000000"); // Default 5 Miliar
  const [acceleratedIds, setAcceleratedIds] = useState<Set<string>>(new Set());

  // Parse numeric target
  const targetValue = useMemo(() => {
    const parsed = parseFloat(targetInput.replace(/[^0-9]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }, [targetInput]);

  // Helper to compute cash out value of any project
  const getProjectBillingValue = (p: ProjectData): number => {
    const pk = String(p.pekerjaan).toUpperCase();
    if (pk === "DKU OSP") {
      return p.jumlah || 0; // 100% of BOQ
    } else if (pk === "MHR") {
      // Sum of all milestones
      return (p.panjar60 || 0) + (p.panjarSitac || 0) + (p.pelunasan15 || 0) + (p.pendapatanMaharani || 0);
    } else {
      // DKU QE or TA: Panjar 60% only
      return p.panjar60 || 0;
    }
  };

  // 1. Current Achieved Cash-Flow (Status === "BERKAS DONE")
  const achievedRevenue = useMemo(() => {
    return projects
      .filter(p => p.status === "BERKAS DONE")
      .reduce((sum, p) => sum + getProjectBillingValue(p), 0);
  }, [projects]);

  // 2. Identify pool of potential projects for acceleration (Status matches "PLAN" or "PEMBERKASAN")
  const potentialProjects = useMemo(() => {
    return projects.filter(p => {
      const statusUpper = String(p.status).toUpperCase();
      return statusUpper === "PLAN" || statusUpper === "PEMBERKASAN";
    });
  }, [projects]);

  // Total volume/value of potential projects
  const totalPotentialValue = useMemo(() => {
    return potentialProjects.reduce((sum, p) => sum + getProjectBillingValue(p), 0);
  }, [potentialProjects]);

  // 3. Compute current simulated revenue = Achieved + clicked accelerated projects
  const simulatedRevenue = useMemo(() => {
    const addedValue = potentialProjects
      .filter(p => acceleratedIds.has(p.id))
      .reduce((sum, p) => sum + getProjectBillingValue(p), 0);
    return achievedRevenue + addedValue;
  }, [achievedRevenue, potentialProjects, acceleratedIds]);

  // Sisa gap
  const initialGap = Math.max(0, targetValue - achievedRevenue);
  const currentGap = Math.max(0, targetValue - simulatedRevenue);

  // Sector breakdown of candidate projects
  const sectorPool = useMemo(() => {
    const map: Record<string, { count: number; totalVal: number; projects: ProjectData[] }> = {
      "DKU QE": { count: 0, totalVal: 0, projects: [] },
      "DKU OSP": { count: 0, totalVal: 0, projects: [] },
      "MHR": { count: 0, totalVal: 0, projects: [] },
      "TA": { count: 0, totalVal: 0, projects: [] }
    };

    potentialProjects.forEach(p => {
      const sector = String(p.pekerjaan).toUpperCase();
      const val = getProjectBillingValue(p);
      const targetSec = map[sector] ? sector : "DKU QE"; // fallback
      map[targetSec].count += 1;
      map[targetSec].totalVal += val;
      map[targetSec].projects.push(p);
    });

    return map;
  }, [potentialProjects]);

  // Automatically select the optimal projects to clear the initialGap
  const handleAutoSuggest = () => {
    // Sort potential projects from largest value to smallest value
    const sorted = [...potentialProjects].sort((a, b) => getProjectBillingValue(b) - getProjectBillingValue(a));
    const newSelected = new Set<string>();
    let tempSum = achievedRevenue;
    
    for (const p of sorted) {
      if (tempSum >= targetValue) break;
      newSelected.add(p.id);
      tempSum += getProjectBillingValue(p);
    }
    setAcceleratedIds(newSelected);
  };

  const toggleProject = (id: string) => {
    const updated = new Set(acceleratedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setAcceleratedIds(updated);
  };

  const handleApplyPreset = (amt: number) => {
    setTargetInput(String(amt));
    setAcceleratedIds(new Set()); // reset
  };

  if (!isOpen) return null;

  const progressPercent = Math.min(100, targetValue > 0 ? (simulatedRevenue / targetValue) * 105 : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="simulator-container">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Body */}
      <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col h-full border-l border-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Simulator Target Keuangan</h3>
              <p className="text-[11px] text-slate-500 font-medium">Analisis akselerasi pencairan milestone proyek</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Target Input Section */}
          <div className="p-5 bg-indigo-900 text-white rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-indigo-200">Target Pendapatan Bulan Ini</span>
              <span className="text-[10px] bg-indigo-500/40 text-indigo-100 px-2 py-0.5 rounded-full font-bold">MILSTONE CAP</span>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-indigo-300">Rp</span>
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 bg-indigo-950/40 border border-indigo-550 rounded-xl text-xl font-extrabold text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                value={targetValue > 0 ? formatIDR(targetValue).replace("Rp ", "") : ""}
                placeholder="Masukkan nominal target..."
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setTargetInput(cleaned);
                }}
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-indigo-805">
              {[1000000000, 3000000000, 5000000000, 10000000000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleApplyPreset(amt)}
                  className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    targetValue === amt
                      ? "bg-white text-indigo-900 shadow-sm"
                      : "bg-indigo-800/60 hover:bg-indigo-800 text-indigo-100 border border-indigo-750"
                  }`}
                >
                  Rp {formatCompactIDR(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Master Progress Bar Screen */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Peta Progres Pendapatan</span>
              <span className="font-extrabold text-indigo-600">{(progressPercent).toFixed(1)}%</span>
            </div>

            {/* Double Bar Visualizer */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {/* Achieved Part */}
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (achievedRevenue / (targetValue || 1)) * 100)}%` }}
                title={`Sudah Tercapai: ${formatIDR(achievedRevenue)}`}
              />
              {/* Accelerated Part */}
              <div 
                className="bg-indigo-500 h-full transition-all duration-550 animate-pulse"
                style={{ 
                  width: `${Math.min(100 - (achievedRevenue / (targetValue || 1)) * 100, ((simulatedRevenue - achievedRevenue) / (targetValue || 1)) * 100)}%` 
                }}
                title={`Akselerasi Simulasi: ${formatIDR(simulatedRevenue - achievedRevenue)}`}
              />
            </div>

            {/* Legend & Details */}
            <div className="grid grid-cols-2 gap-4 py-2 bg-slate-50 rounded-xl px-4 border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Capaian Saat Ini (Done)</span>
                <span className="text-xs font-extrabold text-emerald-600 block">{formatIDR(achievedRevenue)}</span>
              </div>
              <div className="space-y-0.5 border-l border-slate-200 pl-4">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Simulasi Akselerasi</span>
                <span className="text-xs font-extrabold text-indigo-600 block">{formatIDR(simulatedRevenue)}</span>
              </div>
            </div>

            {/* Gap Info Callout */}
            {currentGap > 0 ? (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                <span className="font-extrabold text-base leading-none block -mt-0.5">⚠️</span>
                <div>
                  <span className="font-bold">Masih Kurang {formatIDR(currentGap)}</span> untuk mencapai target. Centang proyek-proyek PLAN/PEMBERKASAN di bawah ini untuk disimulasikan sebagai terakselerasi ke BERKAS DONE.
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-emerald-800 text-xs shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-emerald-900">Target Tercapai! 🎉</span>
                  Simulasi akselerasi Anda berhasil menutupi seluruh kebutuhan target finansial yang ditentukan pada bulan ini.
                </div>
              </div>
            )}
          </div>

          {/* Assistant Action Tool */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Butuh Rekomendasi Instan?</span>
                <span className="text-[11px] text-slate-500 block">Gunakan pola optimalisasi cerdas otomatis.</span>
              </div>
            </div>
            <button
              onClick={handleAutoSuggest}
              disabled={potentialProjects.length === 0}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-40"
            >
              Rekomendasi
            </button>
          </div>

          {/* Main Candidate Pool Accordion */}
          <div className="space-y-4">
            <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px] block">Rincian Pool Potensial per Sektor</span>
            
            {(Object.entries(sectorPool) as Array<[string, { count: number; totalVal: number; projects: ProjectData[] }]>).map(([sector, pool]) => {
              if (pool.count === 0) return null;
              
              const selectedInSector = pool.projects.filter(p => acceleratedIds.has(p.id));
              const selectedValue = selectedInSector.reduce((sum, p) => sum + getProjectBillingValue(p), 0);

              return (
                <div key={sector} className="border border-slate-150 bg-white rounded-2xl overflow-hidden shadow-xs">
                  {/* Sector Item Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                    <div>
                      <span className="font-black text-xs text-slate-800 tracking-tight block">{sector}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {pool.count} LOP potensial • Maks Rp {formatCompactIDR(pool.totalVal)}
                      </span>
                    </div>

                    {selectedValue > 0 && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold px-2 py-0.5 rounded-full">
                        +Rp {formatCompactIDR(selectedValue)}
                      </span>
                    )}
                  </div>

                  {/* Sector Candidates List */}
                  <div className="divide-y divide-slate-100">
                    {pool.projects.map(p => {
                      const val = getProjectBillingValue(p);
                      const isChecked = acceleratedIds.has(p.id);

                      return (
                        <div 
                          key={p.id}
                          onClick={() => toggleProject(p.id)}
                          className={`p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer ${
                            isChecked ? "bg-indigo-50/20" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5">
                              {isChecked ? (
                                <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-350" />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-800 block line-clamp-1">{p.namaLop}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1.5 uppercase font-semibold">
                                <span className={`px-1.5 py-0.5 rounded-sm bg-slate-105 ${p.status === 'PLAN' ? 'bg-slate-100 font-bold text-slate-650': 'bg-amber-50 text-amber-650'}`}>
                                  {p.status}
                                </span>
                                <span>{p.bln}</span>
                              </span>
                            </div>
                          </div>
                          
                          <span className="text-xs font-extrabold text-slate-700 font-mono">
                            Rp {formatCompactIDR(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {potentialProjects.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada LOP berstatus PLAN atau PEMBERKASAN dalam data saat ini yang bisa diakselerasikan.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-150 bg-slate-50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Hasil Pembagian Target</span>
            <span className="text-base font-extrabold text-indigo-600 block">
              Rp {formatCompactIDR(simulatedRevenue)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Terapkan Simulasi
          </button>
        </div>

      </div>
    </div>
  );
}
