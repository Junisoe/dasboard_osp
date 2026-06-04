import React, { useState, useMemo } from "react";
import { ProjectData } from "../types";
import { formatIDR } from "../utils/formatter";
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, SlidersHorizontal, Plus, Download, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProjectTableProps {
  data: ProjectData[];
  onAddRow?: (newRow: Omit<ProjectData, "id">) => void;
}

type SortField = "bln" | "jenis" | "pekerjaan" | "boq" | "status" | "namaLop" | "jumlah";
type SortOrder = "asc" | "desc";

export default function ProjectTable({ data, onAddRow }: ProjectTableProps) {
  // Search and main filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBln, setSelectedBln] = useState<string>("");
  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [selectedPekerjaan, setSelectedPekerjaan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedBoq, setSelectedBoq] = useState<string>("");

  // Table sorting & pagination
  const [sortField, setSortField] = useState<SortField>("bln");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // New project row creator modal state
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState({
    bln: "MEI",
    jenis: "RECOVERY",
    pekerjaan: "DKU",
    boq: "OSP LAMA",
    status: "BERKAS DONE",
    namaLop: "",
    material: 0,
    jasa: 0,
    sitac: 0,
    jumlah: 0,
    panjar60: 0,
    panjarSitac: 0,
    pelunasan15: 0,
    pendapatanMaharani: 0,
    tanggalPanjar: ""
  });

  // Calculate unique filters dynamically from the data
  const monthOptions = useMemo(() => Array.from(new Set(data.map(item => item.bln))).filter(Boolean), [data]);
  const jenisOptions = useMemo(() => Array.from(new Set(data.map(item => item.jenis))).filter(Boolean), [data]);
  const pekerjaanOptions = useMemo(() => Array.from(new Set(data.map(item => item.pekerjaan))).filter(Boolean), [data]);
  const statusOptions = useMemo(() => Array.from(new Set(data.map(item => item.status))).filter(Boolean), [data]);
  const boqOptions = useMemo(() => Array.from(new Set(data.map(item => item.boq))).filter(Boolean), [data]);

  // Reset Filters helper
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBln("");
    setSelectedJenis("");
    setSelectedPekerjaan("");
    setSelectedStatus("");
    setSelectedBoq("");
    setCurrentPage(1);
  };

  // Sorter logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter & Sort Logic
  const processedData = useMemo(() => {
    let result = [...data];

    // Search by LOP Name
    if (searchTerm.trim() !== "") {
      result = result.filter(item =>
        item.namaLop.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Dropdowns filters
    if (selectedBln) {
      result = result.filter(item => item.bln === selectedBln);
    }
    if (selectedJenis) {
      result = result.filter(item => item.jenis === selectedJenis);
    }
    if (selectedPekerjaan) {
      result = result.filter(item => item.pekerjaan === selectedPekerjaan);
    }
    if (selectedStatus) {
      result = result.filter(item => item.status === selectedStatus);
    }
    if (selectedBoq) {
      result = result.filter(item => item.boq === selectedBoq);
    }

    // Apply Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        const numA = (valA as number) || 0;
        const numB = (valB as number) || 0;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }
    });

    return result;
  }, [data, searchTerm, selectedBln, selectedJenis, selectedPekerjaan, selectedStatus, selectedBoq, sortField, sortOrder]);

  // Paginated dataset
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedData.slice(startIndex, startIndex + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage) || 1;

  // Handles adding new simulated LOP row
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.namaLop.trim()) return;

    const isMhr = String(newRow.pekerjaan).toUpperCase() === "MHR";
    const baseAmount = Number(newRow.material) + Number(newRow.jasa); // Total BOQ: Material + Jasa
    const sitacVal = Number(newRow.sitac);
    const resolvedRow = {
      ...newRow,
      material: Number(newRow.material),
      jasa: Number(newRow.jasa),
      sitac: sitacVal,
      jumlah: baseAmount,
      panjar60: isMhr ? Math.round(baseAmount * 0.60) : 0,
      panjarSitac: isMhr ? sitacVal : 0,
      pelunasan15: isMhr ? Math.round(baseAmount * 0.15) : 0,
      pendapatanMaharani: isMhr ? Math.round(baseAmount * 0.25) : 0
    };

    if (onAddRow) {
      onAddRow(resolvedRow);
    }
    setIsAdding(false);
    // Reset modal fields
    setNewRow({
      bln: "MEI",
      jenis: "RECOVERY",
      pekerjaan: "DKU",
      boq: "OSP LAMA",
      status: "BERKAS DONE",
      namaLop: "",
      material: 0,
      jasa: 0,
      sitac: 0,
      jumlah: 0,
      panjar60: 0,
      panjarSitac: 0,
      pelunasan15: 0,
      pendapatanMaharani: 0,
      tanggalPanjar: ""
    });
  };

  const getStatusStyle = (status: string) => {
    switch (String(status).toUpperCase()) {
      case "BERKAS DONE":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50";
      case "PENGAJUAN REKON":
        return "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100/50";
      case "PEMBERKASAN":
        return "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50";
      case "PLAN":
        return "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
    }
  };

  const getJobColor = (job: string) => {
    switch (String(job).toUpperCase()) {
      case "DKU":
        return "bg-cyan-50 text-cyan-700 border-cyan-100";
      case "TA":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "MHR":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-500";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      
      {/* Search & Action Panel Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
            placeholder="Cari LOP berdasarkan nama..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {processedData.length < data.length && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all duration-200"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
          
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-200 hover:shadow"
          >
            <Plus className="w-4 h-4" />
            Tambah Data LOP
          </button>
        </div>
      </div>

      {/* Advanced Interaktif Dropdown Filter Panel */}
      <div className="p-5 bg-slate-50/50 border-b border-slate-50 grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Filter Bulan */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bulan</label>
          <select
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:stroke-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            value={selectedBln}
            onChange={(e) => {
              setSelectedBln(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Semua Bulan</option>
            {monthOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Filter Jenis */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jenis</label>
          <select
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:stroke-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            value={selectedJenis}
            onChange={(e) => {
              setSelectedJenis(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Semua Jenis</option>
            {jenisOptions.map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>

        {/* Filter Pekerjaan */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pekerjaan</label>
          <select
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:stroke-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            value={selectedPekerjaan}
            onChange={(e) => {
              setSelectedPekerjaan(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Semua Sektor</option>
            {pekerjaanOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Filter BOQ */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">BOQ Tipe</label>
          <select
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:stroke-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            value={selectedBoq}
            onChange={(e) => {
              setSelectedBoq(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Semua Tipe BOQ</option>
            {boqOptions.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
          <select
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:stroke-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Semua Status</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-[6%] cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("bln")}>
                <div className="flex items-center gap-1">
                  Bulan
                  {sortField === "bln" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-3 w-[8%] cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("jenis")}>
                <div className="flex items-center gap-1">
                  Jenis
                  {sortField === "jenis" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-3 w-[8%] cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("pekerjaan")}>
                <div className="flex items-center gap-1">
                  Pekerjaan
                  {sortField === "pekerjaan" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-3 w-[8%] cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("boq")}>
                <div className="flex items-center gap-1">
                  BOQ
                  {sortField === "boq" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-3 w-[10%] cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === "status" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-4 w-[16%] cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("namaLop")}>
                <div className="flex items-center gap-1">
                  Nama LOP
                  {sortField === "namaLop" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-3 w-[11%] text-right font-bold text-slate-400">
                Material (IDR)
              </th>
              <th className="py-3 px-3 w-[11%] text-right font-bold text-slate-400">
                Jasa (IDR)
              </th>
              <th className="py-3 px-3 w-[11%] text-right cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => handleSort("jumlah")}>
                <div className="flex items-center justify-end gap-1">
                  Total BOQ
                  {sortField === "jumlah" && (sortOrder === "asc" ? <ChevronUp className="w-3.1 h-3.1" /> : <ChevronDown className="w-3.1 h-3.1" />)}
                </div>
              </th>
              <th className="py-3 px-4 text-right w-[10%]">Milestones</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  Tidak ada LOP yang cocok dengan filter penelusuran.
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition duration-150">
                  <td className="py-4 px-4 font-semibold text-slate-900">{item.bln}</td>
                  <td className="py-4 px-3 font-medium text-slate-600">{item.jenis}</td>
                  <td className="py-4 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${getJobColor(item.pekerjaan)}`}>
                      {item.pekerjaan}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-medium">{item.boq}</td>
                  <td className="py-4 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(item.status)}`}>
                      <span className="w-1 h-1 rounded-full bg-current mr-1.5 shrink-0" />
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-slate-800 line-clamp-1 text-xs" title={item.namaLop}>
                      {item.namaLop}
                    </p>
                  </td>
                  <td className="py-4 px-3 text-right text-slate-600 font-semibold font-mono">
                    {formatIDR(item.material)}
                  </td>
                  <td className="py-4 px-3 text-right text-slate-600 font-semibold font-mono">
                    {formatIDR(item.jasa)}
                  </td>
                  <td className="py-4 px-3 text-right font-extrabold text-slate-900 font-mono">
                    {formatIDR(item.jumlah)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    <div className="flex flex-col text-[10px] text-slate-500 gap-0.5 font-medium leading-normal">
                      {item.panjar60 > 0 && <span className="text-blue-600">P60%: {formatIDR(item.panjar60)}</span>}
                      {item.panjarSitac > 0 && <span className="text-amber-600">SITAC: {formatIDR(item.panjarSitac)}</span>}
                      {item.pelunasan15 > 0 && <span className="text-emerald-600">P15%: {formatIDR(item.pelunasan15)}</span>}
                      {item.pendapatanMaharani > 0 && <span className="text-purple-600">M25%: {formatIDR(item.pendapatanMaharani)}</span>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
        <div className="text-xs text-slate-500">
          Menampilkan <strong className="text-slate-800">{(currentPage - 1) * rowsPerPage + 1}</strong> hingga{" "}
          <strong className="text-slate-800">
            {Math.min(currentPage * rowsPerPage, processedData.length)}
          </strong>{" "}
          dari <strong className="text-slate-800">{processedData.length}</strong> entri terfilter
        </div>

        <div className="flex items-center gap-3">
          {/* Rows Per Page */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 me-2">
            <span>Baris per halaman:</span>
            <select
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 transition text-xs font-semibold flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-semibold px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 transition text-xs font-semibold flex items-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add New Simulated LOP Entry Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden"
            >
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tambah Data LOP Baru (Simulasi)</h3>
                  <p className="text-xs text-slate-500">Mulai input data LOP untuk melihat perubahan grafik secara instan.</p>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Bulan</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={newRow.bln}
                      onChange={(e) => setNewRow({ ...newRow, bln: e.target.value })}
                    >
                      {["FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Jenis Proyek</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={newRow.jenis}
                      onChange={(e) => setNewRow({ ...newRow, jenis: e.target.value })}
                    >
                      {["RECOVERY", "SWAKELOLA", "NODE B", "HEM", "MTEL", "JPP"].map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Sektor Pekerjaan</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={newRow.pekerjaan}
                      onChange={(e) => setNewRow({ ...newRow, pekerjaan: e.target.value })}
                    >
                      {["DKU", "TA", "MHR"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tipe BOQ</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={newRow.boq}
                      onChange={(e) => setNewRow({ ...newRow, boq: e.target.value })}
                    >
                      {["OSP LAMA", "TA-TIF", "OSP BARU", "MTEL LAMA", "MTEL BARU"].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Status Berkas</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={newRow.status}
                      onChange={(e) => setNewRow({ ...newRow, status: e.target.value })}
                    >
                      {["BERKAS DONE", "PENGAJUAN REKON", "PEMBERKASAN", "PLAN"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tanggal Panjar</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="e.g. 29/05/2026"
                      value={newRow.tanggalPanjar}
                      onChange={(e) => setNewRow({ ...newRow, tanggalPanjar: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Nama LOP</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. INC48149183 atau FTTH Lamongan"
                    value={newRow.namaLop}
                    onChange={(e) => setNewRow({ ...newRow, namaLop: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nilai Material (IDR)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2 focus:outline-none"
                      value={newRow.material || ""}
                      onChange={(e) => setNewRow({ ...newRow, material: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nilai Jasa (IDR)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2"
                      value={newRow.jasa || ""}
                      onChange={(e) => setNewRow({ ...newRow, jasa: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nilai SITAC (IDR)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2"
                      value={newRow.sitac || ""}
                      onChange={(e) => setNewRow({ ...newRow, sitac: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4.5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-150"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition duration-150"
                  >
                    Simpan LOP
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
