import { useState } from "react";
import { ProjectData } from "../types";
import { formatCompactIDR, formatIDR, formatNumber } from "../utils/formatter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, PieChart as PieIcon, Layers, CalendarRange, Coins } from "lucide-react";
import { motion } from "motion/react";

interface MonthlyChartsProps {
  filteredData: ProjectData[];
}

const MONTHS_ORDER = ["FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS"];

export default function MonthlyCharts({ filteredData }: MonthlyChartsProps) {
  const [activeTab, setActiveTab] = useState<"trend" | "categories" | "status" | "financials">("trend");

  // Filter out BATAL status from all calculations
  const validData = filteredData.filter(item => String(item.status || "").toUpperCase() !== "BATAL");

  // 1. Process Monthly Trend Data
  const monthlyAggregates = MONTHS_ORDER.reduce((acc, month) => {
    acc[month] = {
      name: month,
      "Total BOQ": 0,
      Material: 0,
      Jasa: 0,
      SITAC: 0,
      "Jumlah LOP": 0
    };
    return acc;
  }, {} as Record<string, any>);

  validData.forEach(item => {
    const month = (item.bln || "").toUpperCase();
    if (monthlyAggregates[month]) {
      monthlyAggregates[month]["Total BOQ"] += item.jumlah || 0;
      monthlyAggregates[month]["Material"] += item.material || 0;
      monthlyAggregates[month]["Jasa"] += item.jasa || 0;
      monthlyAggregates[month]["SITAC"] += item.sitac || 0;
      monthlyAggregates[month]["Jumlah LOP"] += 1;
    } else if (month) {
      // Dynamic month addition if not in default order list
      monthlyAggregates[month] = {
        name: month,
        "Total BOQ": item.jumlah || 0,
        Material: item.material || 0,
        Jasa: item.jasa || 0,
        SITAC: item.sitac || 0,
        "Jumlah LOP": 1
      };
    }
  });

  // Convert to array and filter out months with zero metrics
  const activeMonths = Object.values(monthlyAggregates);
  const trendChartData = activeMonths.filter(
    (m: any) => m["Total BOQ"] > 0 || m["Jumlah LOP"] > 0
  );

  // Process financial chart data (BOQ, Material, Jasa, Panjar)
  const financialMonthlyAggregates = MONTHS_ORDER.reduce((acc, month) => {
    acc[month] = {
      name: month,
      "Total BOQ": 0,
      "Nilai Material": 0,
      "Operasional Jasa": 0,
      "Pembayaran Panjar": 0
    };
    return acc;
  }, {} as Record<string, any>);

  validData.forEach(item => {
    const month = (item.bln || "").toUpperCase();
    if (financialMonthlyAggregates[month]) {
      financialMonthlyAggregates[month]["Total BOQ"] += item.jumlah || 0;
      financialMonthlyAggregates[month]["Nilai Material"] += item.material || 0;
      financialMonthlyAggregates[month]["Operasional Jasa"] += item.jasa || 0;
      financialMonthlyAggregates[month]["Pembayaran Panjar"] += item.panjar60 || 0;
    } else if (month) {
      financialMonthlyAggregates[month] = {
        name: month,
        "Total BOQ": item.jumlah || 0,
        "Nilai Material": item.material || 0,
        "Operasional Jasa": item.jasa || 0,
        "Pembayaran Panjar": item.panjar60 || 0
      };
    }
  });

  const activeFinancialMonths = Object.values(financialMonthlyAggregates);
  const financialChartData = activeFinancialMonths.filter(
    (m: any) => m["Total BOQ"] > 0 || m["Pembayaran Panjar"] > 0
  );

  // 2. Process Jenis & Pekerjaan Data
  const jenisAggregates: Record<string, number> = {};
  const pekerjaanAggregates: Record<string, number> = {};

  validData.forEach(item => {
    const j = item.jenis || "UNKNOWN";
    const p = item.pekerjaan || "UNKNOWN";
    jenisAggregates[j] = (jenisAggregates[j] || 0) + (item.jumlah || 0);
    pekerjaanAggregates[p] = (pekerjaanAggregates[p] || 0) + (item.jumlah || 0);
  });

  const categoryChartData = Object.entries(jenisAggregates).map(([name, value]) => ({
    name,
    "Nilai BOQ": value
  }));

  const pekerjaanChartData = Object.entries(pekerjaanAggregates).map(([name, value]) => ({
    name,
    "Nilai BOQ": value
  }));

  // 3. Process Status Distribution
  const statusAggregates: Record<string, { count: number; value: number }> = {};
  validData.forEach(item => {
    const s = item.status || "TANPA STATUS";
    if (!statusAggregates[s]) {
      statusAggregates[s] = { count: 0, value: 0 };
    }
    statusAggregates[s].count += 1;
    statusAggregates[s].value += item.jumlah || 0;
  });

  const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"];
  const statusChartData = Object.entries(statusAggregates).map(([name, meta]) => ({
    name,
    value: meta.count,
    amount: meta.value
  }));

  // Custom tooltips
  const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl text-xs space-y-1.5 font-sans leading-none">
          <p className="font-bold border-b border-white/10 pb-1 mb-1 text-slate-200">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} style={{ color: pld.color || "#a5b4fc" }}>
              <span className="font-medium">{pld.name}:</span>{" "}
              <span className="font-mono font-semibold">{formatIDR(pld.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl text-xs space-y-1 font-sans">
          <p className="font-bold border-b border-white/10 pb-1 mb-1 text-slate-200">{data.name}</p>
          <p className="text-emerald-400">
            Jumlah LOP: <span className="font-mono font-bold">{data.value} LOP</span>
          </p>
          <p className="text-violet-400">
            Total BOQ: <span className="font-mono font-bold">{formatIDR(data.amount)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {/* Navigation and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Visualisasi & Analisis Tren Data
          </h3>
          <p className="text-xs text-slate-500">Menganalisis kinerja pemasukan, jenis pekerjaan, dan status berkas LOP</p>
        </div>

        <div className="flex space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-100 self-start md:self-center">
          <button
            onClick={() => setActiveTab("trend")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "trend"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Tren Bulanan
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "categories"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Jenis & Pekerjaan
          </button>
          <button
            onClick={() => setActiveTab("status")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "status"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            Status Berkas
          </button>
          <button
            onClick={() => setActiveTab("financials")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "financials"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Pilar Finansial
          </button>
        </div>
      </div>

      {/* Main Chart viewport */}
      <div className="min-h-[320px] relative w-full">
        {validData.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm">
            <CalendarRange className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
            <span>Tidak ada data untuk divisualisasikan dengan filter aktif</span>
          </div>
        ) : (
          <div className="w-full">
            {activeTab === "trend" && (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Grafik Akumulasi Tren Nilai Finansial (BOQ, Jasa, & Material)
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendChartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorBoq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorJasa" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCompactIDR(v)}
                      />
                      <Tooltip content={<CustomCurrencyTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Total BOQ"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorBoq)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Jasa"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorJasa)"
                      />
                      <Bar
                        dataKey="Jumlah LOP"
                        name="Jumlah LOP (Qty)"
                        fill="#cbd5e1"
                        radius={[4, 4, 0, 0]}
                        opacity={0.4}
                        maxBarSize={40}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Jenis Breakdown */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Distribusi BOQ berdasarkan Jenis Proyek
                  </div>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCompactIDR(v)}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          width={80}
                        />
                        <Tooltip content={<CustomCurrencyTooltip />} />
                        <Bar dataKey="Nilai BOQ" fill="#4f46e5" radius={[0, 6, 6, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pekerjaan Breakdown */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sektor Pekerjaan Pembagian (DKU QE, DKU OSP, TA, MHR)
                  </div>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pekerjaanChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          stroke="#475569"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCompactIDR(v)}
                        />
                        <Tooltip content={<CustomCurrencyTooltip />} />
                        <Bar dataKey="Nilai BOQ" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "status" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-[260px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Status Legend List */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Porsi Status Berkas Administrasi
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {statusChartData.map((item, index) => (
                      <div
                        key={index}
                        className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-sm font-extrabold text-slate-900">
                            {item.value} <span className="text-[10px] font-normal text-slate-400">LOP</span>
                          </span>
                          <span className="text-xs font-semibold font-mono text-slate-500">
                            {formatCompactIDR(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "financials" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Pilar Keuangan Proyek: BOQ, Material, Jasa, & Progres Panjar
                  </span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50 font-bold uppercase shrink-0">
                    Status Proyek Aktif (Khusus Selain Batal)
                  </span>
                </div>
                
                <div className="h-[300px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={financialChartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCompactIDR(v)}
                      />
                      <Tooltip content={<CustomCurrencyTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}
                      />
                      <Bar dataKey="Total BOQ" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="Nilai Material" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="Operasional Jasa" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="Pembayaran Panjar" name="Panjar / Penghasilan (60%)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Sub-cards showing totals for these pillars */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/30">
                    <span className="text-[10px] uppercase font-bold text-blue-500 block mb-1">Total BOQ Selesai/Aktif</span>
                    <span className="text-sm font-extrabold text-slate-800">{formatIDR(validData.reduce((sum, item) => sum + (item.jumlah || 0), 0))}</span>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/30">
                    <span className="text-[10px] uppercase font-bold text-amber-500 block mb-1">Total Komponen Material</span>
                    <span className="text-sm font-extrabold text-slate-800">{formatIDR(validData.reduce((sum, item) => sum + (item.material || 0), 0))}</span>
                  </div>
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/30">
                    <span className="text-[10px] uppercase font-bold text-purple-500 block mb-1">Total Operasional Jasa</span>
                    <span className="text-sm font-extrabold text-slate-800">{formatIDR(validData.reduce((sum, item) => sum + (item.jasa || 0), 0))}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/30">
                    <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-1">Total Realisasi (60%)</span>
                    <span className="text-sm font-extrabold text-slate-800">{formatIDR(validData.reduce((sum, item) => sum + (item.panjar60 || 0), 0))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
