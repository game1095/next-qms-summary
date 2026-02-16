import React, { useMemo, useState } from "react";
import { DeliveryDataRow, SortKey, SortDirection } from "../../types";
import { CURRENT_CONFIG, getDisplayNamesFromConfig, FILE_KEYS } from "../../../lib/utils";
import ReactDatePicker from "react-datepicker";
import KPICard from "../ui/KPICard";
import CountUp from "../common/CountUp";
import FilterButton from "../ui/FilterButton";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonViewProps {
  dateA: Date;
  dateB: Date;
  dataA: DeliveryDataRow[];
  dataB: DeliveryDataRow[];
  isLoading: boolean;
  onDateAChange: (date: Date | null) => void;
  onDateBChange: (date: Date | null) => void;
  onRefresh: () => void;
}

const ComparisonView = ({
  dateA,
  dateB,
  dataA,
  dataB,
  isLoading,
  onDateAChange,
  onDateBChange,
  onRefresh,
}: ComparisonViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: "successRateB",
    direction: "desc",
  });
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');

  const filterDisplayNames = useMemo(() => getDisplayNamesFromConfig(), []);

  // --- Filter Logic ---
  const isServiceMatch = (fileKey: string, filter: string) => {
      const cleanKey = String(fileKey).trim();
      if (filter === "all") return true;
      if (filter === "GROUP_EJW")
        return ["E(E)", "E(J)", "E(W)"].includes(cleanKey);
      if (filter === "GROUP_COD")
        return ["E-BCOD", "E-RCOD"].includes(cleanKey);
      return cleanKey === filter;
  };

  const applyFilters = (data: DeliveryDataRow[]) => {
      return data.filter((item) => {
          // 1. Province Filter
          const provinceKey = String(item.cole).trim();
          let itemProvince = "other";
          for (const p of CURRENT_CONFIG.provinces) {
              if (p.codes.has(provinceKey)) {
                  itemProvince = p.key;
                  break;
              }
          }

          if (selectedFilter !== "all" && itemProvince !== selectedFilter) {
              return false;
          }

          // 2. Service Filter
          if (!isServiceMatch(item.file_key, selectedServiceFilter)) {
               return false;
          }

          return true;
      });
  };

  const filteredDataA = useMemo(() => applyFilters(dataA), [dataA, selectedFilter, selectedServiceFilter]);
  const filteredDataB = useMemo(() => applyFilters(dataB), [dataB, selectedFilter, selectedServiceFilter]);

  // --- Helper: Aggregation ---
  const aggregateData = (data: DeliveryDataRow[]) => {
    const map = new Map<
      string,
      {
        H: number;
        M: number;
        S: number;
        Q: number;
        key: string;
        name: string;
        group: string;
      }
    >();

    data.forEach((item) => {
      const officeName = String(item.colf).trim();
      const provinceKey = String(item.cole).trim();

      // Find province label
      let provinceLabel = "Unknown";
      for (const p of CURRENT_CONFIG.provinces) {
        if (p.codes.has(provinceKey)) {
          provinceLabel = p.label;
          break;
        }
      }

      if (provinceLabel === "Unknown") return;

      // Group by Office Name (or you can group by Province if needed)
      // For this table, let's do Office level comparison as it's more useful
      const key = `${provinceLabel}||${officeName}`;
      const existing = map.get(key) || {
        H: 0,
        M: 0,
        S: 0,
        Q: 0,
        key,
        name: officeName,
        group: provinceLabel,
      };

      map.set(key, {
        ...existing,
        H: existing.H + (item.valueh || 0),
        M: existing.M + (item.valuem || 0),
        S: existing.S + (item.cols || 0),
        Q: existing.Q + (item.colq || 0),
      });
    });

    return map;
  };

  const calculateKPIs = (data: DeliveryDataRow[]) => {
    const summary = { H: 0, M: 0, S: 0, Q: 0 };
    data.forEach((item) => {
      summary.H += item.valueh || 0;
      summary.M += item.valuem || 0;
      summary.S += item.cols || 0;
      summary.Q += item.colq || 0;
    });

    const successRate = summary.H > 0 ? (summary.M / summary.H) * 100 : 0;
    const callSuccessRate =
      summary.H > 0 ? (summary.Q / summary.H) * 100 : 0; // Using H as base for simplicity, or modify logic

    return { ...summary, successRate, callSuccessRate };
  };

  const statsA = useMemo(() => calculateKPIs(filteredDataA), [filteredDataA]);
  const statsB = useMemo(() => calculateKPIs(filteredDataB), [filteredDataB]);
  
  const mapA = useMemo(() => aggregateData(filteredDataA), [filteredDataA]);
  const mapB = useMemo(() => aggregateData(filteredDataB), [filteredDataB]);

  // --- Comparison List ---
  const comparisonList = useMemo(() => {
    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    const list: any[] = [];

    allKeys.forEach((key) => {
      const valA = mapA.get(key) || { H: 0, M: 0, S: 0, Q: 0, name: "", group: "" };
      const valB = mapB.get(key) || { H: 0, M: 0, S: 0, Q: 0, name: "", group: "" };
      
      // If name is missing (because it was only in B and mapA returned default empty), fix it
      const name = valA.name || valB.name;
      const group = valA.group || valB.group;
      const realKey = key;

      if (!name) return; // Should not happen

      const successRateA = valA.H > 0 ? (valA.M / valA.H) * 100 : 0;
      const successRateB = valB.H > 0 ? (valB.M / valB.H) * 100 : 0;
      const diffSuccess = successRateB - successRateA; // End - Start

      const callRateA = valA.H > 0 ? (valA.Q / valA.H) * 100 : 0;
      const callRateB = valB.H > 0 ? (valB.Q / valB.H) * 100 : 0;
      const diffCall = callRateB - callRateA; // End - Start

      const volA = valA.H;
      const volB = valB.H;
      const diffVol = volB - volA; // End - Start

      list.push({
        key: realKey,
        name,
        group,
        volA,
        volB,
        diffVol,
        successRateA,
        successRateB,
        diffSuccess,
        callRateA,
        callRateB,
        diffCall
      });
    });

    // Filter
    const filtered = list.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.group.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    return filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
             valA = valA.toLowerCase();
             valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });
  }, [mapA, mapB, searchTerm, sortConfig]);


  const handleSort = (key: string) => {
    setSortConfig((current) => {
      // Toggle logic
      if (current.key === key) {
          return { key, direction: current.direction === "desc" ? "asc" : "desc" };
      }
      // Default direction for new key
      const isTextColumn = ["name", "group"].includes(key);
      return { key, direction: isTextColumn ? "asc" : "desc" };
    });
  };

  // --- Quick Date Helpers ---
  const setExactComparison = (diffDays: number) => {
      const end = new Date();
      end.setDate(end.getDate() - 1); // Yesterday
      
      const start = new Date(end);
      start.setDate(start.getDate() - diffDays);

      onDateBChange(end);
      onDateAChange(start);
  };

  const getDiffColor = (diff: number, inverse = false) => {
      if (Math.abs(diff) < 0.1) return "text-slate-400";
      if (diff > 0) return inverse ? "text-rose-600" : "text-emerald-600";
      return inverse ? "text-emerald-600" : "text-rose-600";
  };
  
  const SortIcon = ({ col }: { col: string }) => {
      if (sortConfig.key !== col) return <span className="text-slate-200 ml-1">⇅</span>;
      return <span className="text-blue-600 ml-1">{sortConfig.direction === "asc" ? "▲" : "▼"}</span> 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- Controls --- */}
      <div className="flex flex-col gap-6">
        
        {/* Quick Date Selectors */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">เลือกด่วน:</span>
            <button 
                onClick={() => setExactComparison(1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all whitespace-nowrap shadow-sm hover:shadow-md active:scale-95"
            >
                1 วัน (เมื่อวาน vs วันก่อนหน้า)
            </button>
            <button 
                onClick={() => setExactComparison(7)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all whitespace-nowrap shadow-sm hover:shadow-md active:scale-95"
            >
                7 วัน (เทียบสัปดาห์ก่อน)
            </button>
            <button 
                onClick={() => setExactComparison(30)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all whitespace-nowrap shadow-sm hover:shadow-md active:scale-95"
            >
                30 วัน (เทียบเดือนก่อน)
            </button>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 slide-up">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col gap-2 relative group">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        {dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'Start Date'} (เริ่มต้น)
                    </span>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xl z-10 pointer-events-none">🗓️</div>
                        <ReactDatePicker
                            selected={dateA}
                            onChange={onDateAChange}
                            dateFormat="dd/MM/yyyy"
                            className="w-full md:w-48 pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        />
                    </div>
                </div>
                <div className="text-slate-300 font-bold text-xl">➜</div>
                <div className="flex flex-col gap-2 relative group">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        {dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'End Date'} (ล่าสุด)
                    </span>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xl z-10 pointer-events-none">📅</div>
                        <ReactDatePicker
                            selected={dateB}
                            onChange={onDateBChange}
                            dateFormat="dd/MM/yyyy"
                            className="w-full md:w-48 pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full md:w-auto">
                <div className="relative group max-w-md ml-auto">
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่อที่ทำการ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                    />
                </div>
            </div>
            
            <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "กำลังโหลด..." : "วิเคราะห์ข้อมูล"}
            </button>
        </div>

        {/* --- Filters --- */}
        <div className="flex flex-col gap-6 pt-4 border-t border-slate-100">
               {/* Province Filter */}
               <div>
                 <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    เลือกพื้นที่
                 </label>
                 <div className="flex flex-wrap gap-2">
                    <FilterButton
                    active={selectedFilter === "all"}
                    onClick={() => setSelectedFilter("all")}
                    >
                    ทุกจังหวัด
                    </FilterButton>
                    {CURRENT_CONFIG.provinces.map((province) => (
                    <FilterButton
                        key={province.key}
                        active={selectedFilter === province.key}
                        onClick={() => setSelectedFilter(province.key)}
                    >
                        {province.label}
                    </FilterButton>
                    ))}
                 </div>
               </div>
     
               {/* Service Type Filter */}
               <div>
                 <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    ประเภทบริการ
                 </label>
                 <div className="flex flex-wrap gap-2">
                    {["all", "GROUP_EJW", "GROUP_COD", ...FILE_KEYS].map(
                        (key) => (
                          <button
                            key={key}
                            onClick={() => setSelectedServiceFilter(key)}
                            className={`
                              relative overflow-hidden text-xs font-bold px-5 py-2.5 rounded-xl border transition-all duration-300
                              ${
                                selectedServiceFilter === key
                                  ? "bg-slate-800 text-white border-slate-800 shadow-lg scale-105"
                                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm"
                              }
                            `}
                          >
                            {key === "all"
                              ? "ทุกบริการ"
                              : key === "GROUP_EJW"
                                ? "EMS (ไม่รวม COD)"
                                : key === "GROUP_COD"
                                  ? "รวม COD"
                                  : key}
                          </button>
                        ),
                      )}
                 </div>
               </div>
             </div>
      </div>

      {/* --- Summary Cards --- */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 slide-up">
             {/* Volume Comparison */}
             <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <div className="text-6xl">📦</div>
                 </div>
                 <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">ปริมาณงาน</h3>
                 
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-400 mb-1">{dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'Start'}</span>
                         <span className="text-2xl font-bold text-slate-600"><CountUp end={statsA.H} /></span>
                     </div>
                     <div className="text-slate-300 text-xl">➜</div>
                     <div className="flex flex-col text-right">
                         <span className="text-xs font-bold text-blue-500 mb-1">{dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'End'}</span>
                         <span className="text-4xl font-black text-slate-800"><CountUp end={statsB.H} /></span>
                     </div>
                 </div>

                 <div className={`flex items-center gap-2 p-3 rounded-xl ${statsB.H - statsA.H > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                     <span className="text-xl font-bold">{statsB.H - statsA.H > 0 ? "▲" : "▼"}</span>
                     <span className="font-bold text-lg">{(statsB.H - statsA.H).toLocaleString()}</span>
                     <span className="text-sm ml-auto font-medium opacity-80">ความต่าง (Diff)</span>
                 </div>
             </div>

             {/* Success Rate Comparison */}
             <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <div className="text-6xl">✅</div>
                 </div>
                 <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">% นำจ่ายสำเร็จ</h3>
                 
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-400 mb-1">{dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'Start'}</span>
                         <span className="text-2xl font-bold text-slate-600"><CountUp end={statsA.successRate} decimals={1} />%</span>
                     </div>
                     <div className="text-slate-300 text-xl">➜</div>
                     <div className="flex flex-col text-right">
                         <span className="text-xs font-bold text-emerald-500 mb-1">{dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'End'}</span>
                         <span className={`text-4xl font-black ${statsB.successRate >= 98 ? 'text-emerald-600' : statsB.successRate >= 95 ? 'text-blue-600' : 'text-rose-600'}`}>
                            <CountUp end={statsB.successRate} decimals={1} />%
                         </span>
                     </div>
                 </div>

                 <div className={`flex items-center gap-2 p-3 rounded-xl ${statsB.successRate - statsA.successRate > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                     <span className="text-xl font-bold">{statsB.successRate - statsA.successRate > 0 ? "▲" : "▼"}</span>
                     <span className="font-bold text-lg">{Math.abs(statsB.successRate - statsA.successRate).toFixed(2)}%</span>
                     <span className="text-sm ml-auto font-medium opacity-80">ความต่าง (Diff)</span>
                 </div>
             </div>

             {/* Call Success Comparison */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <div className="text-6xl">📞</div>
                 </div>
                 <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">% การโทรสำเร็จ</h3>
                 
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-400 mb-1">{dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'Start'}</span>
                         <span className="text-2xl font-bold text-slate-600"><CountUp end={statsA.callSuccessRate} decimals={1} />%</span>
                     </div>
                     <div className="text-slate-300 text-xl">➜</div>
                     <div className="flex flex-col text-right">
                         <span className="text-xs font-bold text-indigo-500 mb-1">{dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'End'}</span>
                         <span className={`text-4xl font-black ${statsB.callSuccessRate >= 98 ? 'text-emerald-600' : statsB.callSuccessRate >= 90 ? 'text-blue-600' : 'text-rose-600'}`}>
                            <CountUp end={statsB.callSuccessRate} decimals={1} />%
                         </span>
                     </div>
                 </div>

                 <div className={`flex items-center gap-2 p-3 rounded-xl ${statsB.callSuccessRate - statsA.callSuccessRate > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                     <span className="text-xl font-bold">{statsB.callSuccessRate - statsA.callSuccessRate > 0 ? "▲" : "▼"}</span>
                     <span className="font-bold text-lg">{Math.abs(statsB.callSuccessRate - statsA.callSuccessRate).toFixed(2)}%</span>
                     <span className="text-sm ml-auto font-medium opacity-80">ความต่าง (Diff)</span>
                 </div>
             </div>
        </div>
      )}



      {/* --- Top Movers Section --- */}
      {!isLoading && comparisonList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 slide-up delay-100">
            {/* Top Volume Growth */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <div className="text-8xl">🚀</div>
                </div>
                <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 relative z-10">
                   <span className="text-xl">🚀</span> 
                   ปริมาณงานเติบโต
                </h3>
                <div className="space-y-3 relative z-10">
                    {comparisonList
                        .slice()
                        .sort((a, b) => b.diffVol - a.diffVol)
                        .slice(0, 5)
                        .map((item, index) => (
                            <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' : 'bg-slate-200 text-slate-600'}`}>
                                        {index + 1}
                                    </span>
                                    <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                </div>
                                <div className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                    +{item.diffVol.toLocaleString()}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Top Efficiency Drop */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <div className="text-8xl">📉</div>
                </div>
                <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 relative z-10">
                   <span className="text-xl">📉</span> 
                   ประสิทธิภาพการนำจ่ายลดลง (5ลำดับ)
                </h3>
                <div className="space-y-3 relative z-10">
                    {comparisonList
                        .filter(item => item.diffSuccess < 0)
                        .sort((a, b) => a.diffSuccess - b.diffSuccess)
                        .slice(0, 5)
                        .map((item, index) => (
                            <div key={item.key} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold ring-2 ring-red-200">
                                        {index + 1}
                                    </span>
                                    <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                </div>
                                <div className="text-red-600 font-bold text-sm bg-white px-2 py-1 rounded-lg border border-red-100 shadow-sm">
                                    {item.diffSuccess.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                    {comparisonList.filter(item => item.diffSuccess < 0).length === 0 && (
                        <div className="text-center text-slate-400 py-4 text-sm bg-slate-50 rounded-xl dashed border border-slate-200">🎉 ยอดเยี่ยม! ไม่มีที่ทำการไหนประสิทธิภาพลดลง</div>
                    )}
                </div>
            </div>

            {/* Top Call Drop */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <div className="text-8xl">📞</div>
                </div>
                <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 relative z-10">
                   <span className="text-xl">📞</span> 
                   ประสิทธิภาพการโทรลดลง (5ลำดับ)
                </h3>
                <div className="space-y-3 relative z-10">
                    {comparisonList
                        .filter(item => item.diffCall < 0)
                        .sort((a, b) => a.diffCall - b.diffCall)
                        .slice(0, 5)
                        .map((item, index) => (
                            <div key={item.key} className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold ring-2 ring-orange-200">
                                        {index + 1}
                                    </span>
                                    <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                </div>
                                <div className="text-orange-600 font-bold text-sm bg-white px-2 py-1 rounded-lg border border-orange-100 shadow-sm">
                                    {item.diffCall.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                    {comparisonList.filter(item => item.diffCall < 0).length === 0 && (
                        <div className="text-center text-slate-400 py-4 text-sm bg-slate-50 rounded-xl dashed border border-slate-200">🎉 ยอดเยี่ยม!</div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- Tab Switcher --- */}
      <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'table' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              📄 ตารางเปรียบเทียบ
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chart' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              📊 กราฟสรุปผล
          </button>
      </div>

      {/* --- Chart View --- */}
      {activeTab === 'chart' && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 slide-up delay-200">
            {/* Chart 1: Volume */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    📦 ปริมาณงาน (Volume)
                </h3>
                <div className="h-[300px] flex items-center justify-center">
                     <Bar
                        data={{
                            labels: ['ปริมาณงานทั้งหมด'],
                            datasets: [
                                {
                                    label: dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'Start',
                                    data: [statsA.H],
                                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                    borderColor: 'rgb(59, 130, 246)',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    barPercentage: 0.6,
                                },
                                {
                                    label: dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'End',
                                    data: [statsB.H],
                                    backgroundColor: 'rgba(168, 85, 247, 0.5)',
                                    borderColor: 'rgb(168, 85, 247)',
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    barPercentage: 0.6,
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' as const },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => `${context.dataset.label}: ${context.raw?.toLocaleString()}`
                                    }
                                }
                            },
                            scales: {
                                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                                x: { grid: { display: false } }
                            }
                        }}
                     />
                </div>
            </div>

            {/* Chart 2: Efficiency */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    ⚡ ประสิทธิภาพ (Efficiency)
                </h3>
                <div className="h-[300px] flex items-center justify-center">
                     <Bar
                        data={{
                            labels: ['นำจ่ายสำเร็จ (%)', 'โทรสำเร็จ (%)'],
                            datasets: [
                                {
                                    label: dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'Start',
                                    data: [statsA.successRate, statsA.callSuccessRate],
                                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                    borderColor: 'rgb(59, 130, 246)',
                                    borderWidth: 1,
                                    borderRadius: 6,
                                },
                                {
                                    label: dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'End',
                                    data: [statsB.successRate, statsB.callSuccessRate],
                                    backgroundColor: 'rgba(168, 85, 247, 0.5)',
                                    borderColor: 'rgb(168, 85, 247)',
                                    borderWidth: 1,
                                    borderRadius: 6,
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' as const },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => `${context.dataset.label}: ${Number(context.raw).toFixed(2)}%`
                                    }
                                }
                            },
                             scales: {
                                y: { 
                                    beginAtZero: true, 
                                    max: 100,
                                    grid: { color: '#f1f5f9' } 
                                },
                                x: { grid: { display: false } }
                            }
                        }}
                     />
                </div>
            </div>
        </div>
      )}

      {/* --- Detailed Table --- */}
      {activeTab === 'table' && (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative min-h-[500px] slide-up delay-200">
         <div className="overflow-x-auto">
             <table className="min-w-full text-sm">
                 <thead>
                     {/* Super Header */}
                     <tr className="bg-slate-50 border-b border-slate-200">
                         <th rowSpan={2} className="py-4 px-6 text-left font-extrabold text-slate-700 w-16 align-bottom pb-4">#</th>
                         <th rowSpan={2} onClick={() => handleSort("name")} className="py-4 px-6 text-left font-extrabold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors align-bottom pb-4">
                             ชื่อที่ทำการ <SortIcon col="name" />
                         </th>
                         <th rowSpan={2} onClick={() => handleSort("group")} className="py-4 px-6 text-left font-extrabold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors hidden md:table-cell align-bottom pb-4 border-r border-slate-200">
                             สังกัด <SortIcon col="group" />
                         </th>
                         
                         <th colSpan={3} className="py-3 px-2 text-center font-bold text-slate-600 bg-blue-100/50 border-b border-white border-r border-slate-200">
                             ปริมาณงาน (Volume)
                         </th>
                         <th colSpan={3} className="py-3 px-2 text-center font-bold text-emerald-700 bg-emerald-100/50 border-b border-white border-r border-slate-200">
                             ประสิทธิภาพนำจ่าย (Success)
                         </th>
                         <th colSpan={3} className="py-3 px-2 text-center font-bold text-indigo-700 bg-indigo-100/50 border-b border-white">
                             ประสิทธิภาพการโทร (Call)
                         </th>
                     </tr>

                     {/* Sub Header */}
                     <tr className="bg-slate-50 border-b border-slate-200">
                         {/* Volume Group */}
                         <th onClick={() => handleSort("volA")} className="py-3 px-2 text-center font-semibold text-slate-600 bg-blue-50/50">
                             {dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                         </th>
                         <th onClick={() => handleSort("volB")} className="py-3 px-2 text-center font-semibold text-slate-700 bg-purple-50/50">
                             {dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                         </th>
                         <th onClick={() => handleSort("diffVol")} className="py-3 px-4 text-center font-bold text-slate-700 cursor-pointer hover:bg-slate-100 bg-slate-100/50 border-r border-slate-200">
                             ความต่าง <SortIcon col="diffVol" />
                         </th>

                         {/* Success Rate Group */}
                         <th onClick={() => handleSort("successRateA")} className="py-3 px-2 text-center font-semibold text-emerald-700 bg-emerald-50/50">
                             {dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                         </th>
                         <th onClick={() => handleSort("successRateB")} className="py-3 px-2 text-center font-semibold text-emerald-700 bg-purple-50/50">
                             {dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                         </th>
                         <th onClick={() => handleSort("diffSuccess")} className="py-3 px-4 text-center font-bold text-emerald-700 cursor-pointer hover:bg-emerald-100 bg-emerald-100/50 border-r border-slate-200">
                             ความต่าง <SortIcon col="diffSuccess" />
                         </th>

                         {/* Call Rate Group */}
                         <th onClick={() => handleSort("callRateA")} className="py-3 px-2 text-center font-semibold text-indigo-700 bg-indigo-50/50">
                             {dateA ? dateA.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                         </th>
                         <th onClick={() => handleSort("callRateB")} className="py-3 px-2 text-center font-semibold text-indigo-700 bg-indigo-50/30">
                             {dateB ? dateB.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                         </th>
                         <th onClick={() => handleSort("diffCall")} className="py-3 px-4 text-center font-bold text-indigo-700 cursor-pointer hover:bg-indigo-100 bg-indigo-100/50">
                             ความต่าง <SortIcon col="diffCall" />
                         </th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                     {comparisonList.map((row, index) => (
                         <tr key={row.key} className="hover:bg-blue-50/30 transition-colors group">
                             <td className="px-6 py-4 text-slate-400 font-mono">{index + 1}</td>
                             <td className="px-6 py-4 font-bold text-slate-700">
                                 {row.name}
                             </td>
                             <td className="px-6 py-4 font-medium text-slate-500 hidden md:table-cell">
                                 {row.group}
                             </td>
                             
                             <td className="px-2 py-4 text-center font-bold text-slate-700 bg-blue-50/10 group-hover:bg-blue-50/30">
                                 {row.volA.toLocaleString()}
                             </td>
                             <td className="px-2 py-4 text-center text-slate-700 bg-purple-50/10 group-hover:bg-purple-50/30">
                                 {row.volB.toLocaleString()}
                             </td>
                             <td className={`px-2 py-4 text-center font-bold bg-slate-50/50 ${getDiffColor(row.diffVol)}`}>
                                 {row.diffVol > 0 ? "+" : ""}{row.diffVol.toLocaleString()}
                             </td>

                             <td className="px-2 py-4 text-center font-bold bg-emerald-50/10 group-hover:bg-emerald-50/30 text-slate-700">
                                 {row.successRateA.toFixed(1)}%
                             </td>
                             <td className="px-2 py-4 text-center font-bold bg-purple-50/10 group-hover:bg-purple-50/30 text-slate-700">
                                 {row.successRateB.toFixed(1)}%
                             </td>
                             <td className={`px-2 py-4 text-center font-extrabold bg-emerald-50/20 group-hover:bg-emerald-50/40 border-l border-white ${getDiffColor(row.diffSuccess)}`}>
                                 {row.diffSuccess > 0 ? "▲" : row.diffSuccess < 0 ? "▼" : ""} {Math.abs(row.diffSuccess).toFixed(2)}%
                             </td>

                             <td className="px-2 py-4 text-center font-bold bg-indigo-50/10 group-hover:bg-indigo-50/30 border-l-4 border-white text-slate-700">
                                 {row.callRateA.toFixed(1)}%
                             </td>
                             <td className="px-2 py-4 text-center font-bold bg-indigo-50/5 group-hover:bg-indigo-50/20 text-slate-700">
                                 {row.callRateB.toFixed(1)}%
                             </td>
                             <td className={`px-2 py-4 text-center font-extrabold bg-indigo-50/20 group-hover:bg-indigo-50/40 border-l border-white ${getDiffColor(row.diffCall)}`}>
                                 {row.diffCall > 0 ? "▲" : row.diffCall < 0 ? "▼" : ""} {Math.abs(row.diffCall).toFixed(2)}%
                             </td>
                         </tr>
                     ))}
                     
                     {comparisonList.length === 0 && (
                        <tr>
                            <td colSpan={12} className="py-20 text-center text-slate-400">
                                ไม่พบข้อมูล
                            </td>
                        </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>
      )}

    </div>
  );
};

export default ComparisonView;
