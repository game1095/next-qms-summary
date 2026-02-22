import React, { useMemo, useState, useRef } from "react";
import { DeliveryDataRow, SortKey, SortDirection } from "../../types";
import {
  CURRENT_CONFIG,
  getDisplayNamesFromConfig,
  FILE_KEYS,
} from "../../../lib/utils";
import ReactDatePicker from "react-datepicker";
import KPICard from "../ui/KPICard";
import CountUp from "../common/CountUp";
import FilterButton from "../ui/FilterButton";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ScatterController,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Scatter, Chart as ReactChart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ScatterController,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
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
    key: "diffSuccess",
    direction: "asc",
  });
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");

  const filterDisplayNames = useMemo(() => getDisplayNamesFromConfig(), []);

  // --- Filter Logic ---
  const isServiceMatch = (fileKey: string, filter: string) => {
    const cleanKey = String(fileKey).trim();
    if (filter === "all") return true;
    if (filter === "GROUP_EJW")
      return ["E(E)", "E(J)", "E(W)"].includes(cleanKey);
    if (filter === "GROUP_COD") return ["E-BCOD", "E-RCOD"].includes(cleanKey);
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

  const filteredDataA = useMemo(
    () => applyFilters(dataA),
    [dataA, selectedFilter, selectedServiceFilter],
  );
  const filteredDataB = useMemo(
    () => applyFilters(dataB),
    [dataB, selectedFilter, selectedServiceFilter],
  );

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

  const chart1Ref = useRef<any>(null);
  const chart2Ref = useRef<any>(null);
  const chart3Ref = useRef<any>(null);

  const handleChartClick = (
    event: any,
    chartRef: any,
    groupLabels: string[],
  ) => {
    if (isSingleGroup) return; // Already drilled down
    const chart = chartRef.current;
    if (!chart) return;

    const elements = chart.getElementsAtEventForMode(
      event,
      "nearest",
      { intersect: true },
      true,
    );
    if (elements.length > 0) {
      const index = elements[0].index;
      const label = groupLabels[index];
      if (label) {
        setSearchTerm(label); // Triggers drill down by typing the region name into search
      }
    }
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
    const callSuccessRate = summary.H > 0 ? (summary.Q / summary.H) * 100 : 0; // Using H as base for simplicity, or modify logic

    return { ...summary, successRate, callSuccessRate };
  };

  const statsA = useMemo(() => calculateKPIs(filteredDataA), [filteredDataA]);
  const statsB = useMemo(() => calculateKPIs(filteredDataB), [filteredDataB]);

  const mapA = useMemo(() => aggregateData(filteredDataA), [filteredDataA]);
  const mapB = useMemo(() => aggregateData(filteredDataB), [filteredDataB]);

  // --- Base Comparison List (Unfiltered, Unsorted) ---
  const baseComparisonList = useMemo(() => {
    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    const list: any[] = [];

    allKeys.forEach((key) => {
      const valA = mapA.get(key) || {
        H: 0,
        M: 0,
        S: 0,
        Q: 0,
        name: "",
        group: "",
      };
      const valB = mapB.get(key) || {
        H: 0,
        M: 0,
        S: 0,
        Q: 0,
        name: "",
        group: "",
      };

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
        diffCall,
      });
    });
    return list;
  }, [mapA, mapB]);

  // --- Comparison List (Filtered & Sorted for Table) ---
  const comparisonList = useMemo(() => {
    // Filter
    const filtered = baseComparisonList.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.group.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Sort
    return filtered.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (typeof valA === "string" && typeof valB === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [baseComparisonList, searchTerm, sortConfig]);

  const formatDateForApi = (date: Date | null) => {
    if (!date) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const exportToExcel = () => {
    if (!comparisonList || comparisonList.length === 0) return;

    // Transform data for Excel
    const excelData = comparisonList.map((item, index) => ({
      "ลำดับ (No.)": index + 1,
      "ที่ทำการ (Office)": item.name,
      "กลุ่ม (Group)": item.group,
      [`ปริมาณงาน ${dateA ? dateA.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "อดีต"} (ชิ้น)`]:
        item.volA,
      [`% สำเร็จ ${dateA ? dateA.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "อดีต"}`]:
        item.successRateA.toFixed(2) + "%",
      [`ปริมาณงาน ${dateB ? dateB.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "ปัจจุบัน"} (ชิ้น)`]:
        item.volB,
      [`% สำเร็จ ${dateB ? dateB.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "ปัจจุบัน"}`]:
        item.successRateB.toFixed(2) + "%",
      "ส่วนต่างปริมาณงาน (ชิ้น)":
        item.diffVol > 0 ? `+${item.diffVol}` : item.diffVol.toString(),
      "ส่วนต่าง % สำเร็จ":
        item.diffSuccess > 0
          ? `+${item.diffSuccess.toFixed(2)}%`
          : `${item.diffSuccess.toFixed(2)}%`,
      [`% โทรสำเร็จ ${dateA ? dateA.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "อดีต"}`]:
        item.callRateA.toFixed(2) + "%",
      [`% โทรสำเร็จ ${dateB ? dateB.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "ปัจจุบัน"}`]:
        item.callRateB.toFixed(2) + "%",
      "ส่วนต่าง % โทร":
        item.diffCall > 0
          ? `+${item.diffCall.toFixed(2)}%`
          : `${item.diffCall.toFixed(2)}%`,
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const maxWidths = Object.keys(excelData[0]).map((k) => ({
      wch:
        Math.max(
          k.length,
          ...excelData.map((row) =>
            (row as any)[k] ? (row as any)[k].toString().length : 0,
          ),
        ) + 2,
    }));
    worksheet["!cols"] = maxWidths;

    // Create workbook and add sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison Report");

    // Generate buffer and save
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const fileName = `Performance_Comparison_${formatDateForApi(new Date())}.xlsx`;
    saveAs(blob, fileName);
  };

  // --- Chart Aggregations ---
  const isSingleGroup = useMemo(() => {
    const uniqueGroups = new Set(comparisonList.map((item) => item.group));
    return uniqueGroups.size === 1;
  }, [comparisonList]);

  const singleGroupName = useMemo(() => {
    if (!isSingleGroup || comparisonList.length === 0) return "";
    return comparisonList[0].group;
  }, [isSingleGroup, comparisonList]);

  const provinceAggregation = useMemo(() => {
    const provinceMap = new Map<
      string,
      {
        volA: number;
        volB: number;
        successA_H: number;
        successA_M: number;
        successB_H: number;
        successB_M: number;
        callA_Q: number;
        callB_Q: number;
        group: string;
      }
    >();

    comparisonList.forEach((item) => {
      const mapKey = isSingleGroup ? item.name : item.group;
      const existing = provinceMap.get(mapKey) || {
        volA: 0,
        volB: 0,
        successA_H: 0,
        successA_M: 0,
        successB_H: 0,
        successB_M: 0,
        callA_Q: 0,
        callB_Q: 0,
        group: mapKey,
      };

      const successA_M = (item.successRateA * item.volA) / 100;
      const successB_M = (item.successRateB * item.volB) / 100;

      const callA_Q = (item.callRateA * item.volA) / 100;
      const callB_Q = (item.callRateB * item.volB) / 100;

      provinceMap.set(mapKey, {
        volA: existing.volA + item.volA,
        volB: existing.volB + item.volB,
        successA_H: existing.successA_H + item.volA,
        successA_M: existing.successA_M + successA_M,
        successB_H: existing.successB_H + item.volB,
        successB_M: existing.successB_M + successB_M,
        callA_Q: existing.callA_Q + callA_Q,
        callB_Q: existing.callB_Q + callB_Q,
        group: mapKey,
      });
    });

    return Array.from(provinceMap.values())
      .map((p) => ({
        group: p.group,
        volA: p.volA,
        volB: p.volB,
        successRateA:
          p.successA_H > 0 ? (p.successA_M / p.successA_H) * 100 : 0,
        successRateB:
          p.successB_H > 0 ? (p.successB_M / p.successB_H) * 100 : 0,
        callRateA: p.successA_H > 0 ? (p.callA_Q / p.successA_H) * 100 : 0,
        callRateB: p.successB_H > 0 ? (p.callB_Q / p.successB_H) * 100 : 0,
      }))
      .sort((a, b) => b.volB - a.volB);
  }, [comparisonList, isSingleGroup]);

  // --- Table Summary Aggregation ---
  const tableSummary = useMemo(() => {
    if (comparisonList.length === 0) return null;
    let volA = 0,
      volB = 0;
    let successA_H = 0,
      successA_M = 0;
    let successB_H = 0,
      successB_M = 0;
    let callA_Q = 0,
      callB_Q = 0;

    comparisonList.forEach((item) => {
      volA += item.volA;
      volB += item.volB;
      successA_H += item.volA;
      successB_H += item.volB;
      successA_M += (item.successRateA * item.volA) / 100;
      successB_M += (item.successRateB * item.volB) / 100;
      callA_Q += (item.callRateA * item.volA) / 100;
      callB_Q += (item.callRateB * item.volB) / 100;
    });

    const successRateA = successA_H > 0 ? (successA_M / successA_H) * 100 : 0;
    const successRateB = successB_H > 0 ? (successB_M / successB_H) * 100 : 0;
    const callRateA = successA_H > 0 ? (callA_Q / successA_H) * 100 : 0;
    const callRateB = successB_H > 0 ? (callB_Q / successB_H) * 100 : 0;

    return {
      volA,
      volB,
      diffVol: volB - volA,
      successRateA,
      successRateB,
      diffSuccess: successRateB - successRateA,
      callRateA,
      callRateB,
      diffCall: callRateB - callRateA,
    };
  }, [comparisonList]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      // Toggle logic
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "desc" ? "asc" : "desc",
        };
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

  const getDiffColor = (diff: number, inverse = false, neutral = false) => {
    if (neutral) return "text-slate-500";
    if (Math.abs(diff) < 0.1) return "text-slate-400";
    if (diff > 0) return inverse ? "text-rose-600" : "text-emerald-600";
    return inverse ? "text-emerald-600" : "text-rose-600";
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortConfig.key !== col)
      return <span className="text-slate-200 ml-1">⇅</span>;
    return (
      <span className="text-blue-600 ml-1">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* --- Controls --- */}
      <div className="flex flex-col gap-6">
        {/* Quick Date Selectors */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            เลือกด่วน:
          </span>
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

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 slide-up relative z-50">
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              ช่วงเวลาที่เปรียบเทียบ
            </span>

            <div className="flex flex-col sm:flex-row items-center bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner gap-1 relative z-50">
              <div className="relative w-full sm:w-auto">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span>
                </div>
                <ReactDatePicker
                  selected={dateA}
                  onChange={onDateAChange}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="วันที่เริ่มต้น"
                  className="w-full sm:w-40 pl-10 pr-3 py-2.5 rounded-xl bg-white border border-transparent text-slate-700 font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer hover:shadow-sm relative z-10 text-sm text-center"
                />
              </div>

              <div className="hidden sm:flex items-center justify-center px-1 text-slate-300">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </div>

              <div className="relative w-full sm:w-auto">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm"></span>
                </div>
                <ReactDatePicker
                  selected={dateB}
                  onChange={onDateBChange}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="วันที่สิ้นสุด"
                  className="w-full sm:w-40 pl-10 pr-3 py-2.5 rounded-xl bg-white border border-transparent text-slate-700 font-bold focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all cursor-pointer hover:shadow-sm relative z-10 text-sm text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 w-full md:w-auto">
            <div className="relative group max-w-md ml-auto">
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาชื่อที่ทำการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? "กำลังโหลด..." : "วิเคราะห์ข้อมูล"}
            </button>
            <button
              onClick={exportToExcel}
              disabled={isLoading || comparisonList.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold active:scale-95 transition-all shadow-sm border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="ดาวน์โหลดเป็นไฟล์ Excel"
            >
              <span className="text-xl">📊</span>
              <span>ดาวน์โหลด Report</span>
            </button>
          </div>
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
                ทุกที่ทำการ
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
              {["all", "GROUP_EJW", "GROUP_COD", ...FILE_KEYS].map((key) => (
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
              ))}
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
            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">
              ปริมาณงาน
            </h3>

            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 mb-1">
                  {dateA
                    ? dateA.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Start"}
                </span>
                <span className="text-2xl font-bold text-slate-600">
                  <CountUp end={statsA.H} />
                </span>
              </div>
              <div className="text-slate-300 text-xl">➜</div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-blue-500 mb-1">
                  {dateB
                    ? dateB.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    : "End"}
                </span>
                <span className="text-4xl font-black text-slate-800">
                  <CountUp end={statsB.H} />
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 p-3 rounded-xl ${statsB.H - statsA.H > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
            >
              <span className="text-xl font-bold">
                {statsB.H - statsA.H > 0 ? "▲" : "▼"}
              </span>
              <span className="font-bold text-lg">
                {(statsB.H - statsA.H).toLocaleString()}
              </span>
              <span className="text-sm ml-auto font-medium opacity-80">
                ความต่าง (Diff)
              </span>
            </div>
          </div>

          {/* Success Rate Comparison */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="text-6xl">✅</div>
            </div>
            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">
              % นำจ่ายสำเร็จ
            </h3>

            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 mb-1">
                  {dateA
                    ? dateA.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Start"}
                </span>
                <span className="text-2xl font-bold text-slate-600">
                  <CountUp end={statsA.successRate} decimals={1} />%
                </span>
              </div>
              <div className="text-slate-300 text-xl">➜</div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-emerald-500 mb-1">
                  {dateB
                    ? dateB.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    : "End"}
                </span>
                <span
                  className={`text-4xl font-black ${statsB.successRate >= 98 ? "text-emerald-600" : statsB.successRate >= 95 ? "text-blue-600" : "text-rose-600"}`}
                >
                  <CountUp end={statsB.successRate} decimals={1} />%
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 p-3 rounded-xl ${statsB.successRate - statsA.successRate > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
            >
              <span className="text-xl font-bold">
                {statsB.successRate - statsA.successRate > 0 ? "▲" : "▼"}
              </span>
              <span className="font-bold text-lg">
                {Math.abs(statsB.successRate - statsA.successRate).toFixed(2)}%
              </span>
              <span className="text-sm ml-auto font-medium opacity-80">
                ความต่าง (Diff)
              </span>
            </div>
          </div>

          {/* Call Success Comparison */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="text-6xl">📞</div>
            </div>
            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-4">
              % การโทรสำเร็จ
            </h3>

            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 mb-1">
                  {dateA
                    ? dateA.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Start"}
                </span>
                <span className="text-2xl font-bold text-slate-600">
                  <CountUp end={statsA.callSuccessRate} decimals={1} />%
                </span>
              </div>
              <div className="text-slate-300 text-xl">➜</div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-indigo-500 mb-1">
                  {dateB
                    ? dateB.toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    : "End"}
                </span>
                <span
                  className={`text-4xl font-black ${statsB.callSuccessRate >= 98 ? "text-emerald-600" : statsB.callSuccessRate >= 90 ? "text-blue-600" : "text-rose-600"}`}
                >
                  <CountUp end={statsB.callSuccessRate} decimals={1} />%
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 p-3 rounded-xl ${statsB.callSuccessRate - statsA.callSuccessRate > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
            >
              <span className="text-xl font-bold">
                {statsB.callSuccessRate - statsA.callSuccessRate > 0
                  ? "▲"
                  : "▼"}
              </span>
              <span className="font-bold text-lg">
                {Math.abs(
                  statsB.callSuccessRate - statsA.callSuccessRate,
                ).toFixed(2)}
                %
              </span>
              <span className="text-sm ml-auto font-medium opacity-80">
                ความต่าง (Diff)
              </span>
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
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200" : "bg-slate-200 text-slate-600"}`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-700 text-sm">
                        {item.name}
                      </span>
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
                .filter((item) => item.diffSuccess < 0)
                .sort((a, b) => a.diffSuccess - b.diffSuccess)
                .slice(0, 5)
                .map((item, index) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold ring-2 ring-red-200">
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-700 text-sm">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-red-600 font-bold text-sm bg-white px-2 py-1 rounded-lg border border-red-100 shadow-sm">
                      {item.diffSuccess.toFixed(2)}%
                    </div>
                  </div>
                ))}
              {comparisonList.filter((item) => item.diffSuccess < 0).length ===
                0 && (
                <div className="text-center text-slate-400 py-4 text-sm bg-slate-50 rounded-xl dashed border border-slate-200">
                  🎉 ยอดเยี่ยม! ไม่มีที่ทำการไหนประสิทธิภาพลดลง
                </div>
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
                .filter((item) => item.diffCall < 0)
                .sort((a, b) => a.diffCall - b.diffCall)
                .slice(0, 5)
                .map((item, index) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl border border-orange-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold ring-2 ring-orange-200">
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-700 text-sm">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-orange-600 font-bold text-sm bg-white px-2 py-1 rounded-lg border border-orange-100 shadow-sm">
                      {item.diffCall.toFixed(2)}%
                    </div>
                  </div>
                ))}
              {comparisonList.filter((item) => item.diffCall < 0).length ===
                0 && (
                <div className="text-center text-slate-400 py-4 text-sm bg-slate-50 rounded-xl dashed border border-slate-200">
                  🎉 ยอดเยี่ยม!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Tab Switcher --- */}
      <div className="flex justify-center mb-10 w-full relative z-10 transition-all slide-up">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/60 shadow-inner backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("table")}
            className={`
                  flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold transition-all duration-300
                  ${
                    activeTab === "table"
                      ? "bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06)] scale-100 ring-1 ring-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95 opacity-80"
                  }
                `}
          >
            <span className="text-xl">📄</span>
            <span className="tracking-wide">ตารางเปรียบเทียบ</span>
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`
                  flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold transition-all duration-300
                  ${
                    activeTab === "chart"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_8px_16px_rgba(59,130,246,0.3)] scale-100"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95 opacity-80"
                  }
                `}
          >
            <span className="text-xl">📊</span>
            <span className="tracking-wide">กราฟสรุปผลเชิงลึก</span>
          </button>
        </div>
      </div>

      {/* --- Chart View (Executive Dashboard) --- */}
      {activeTab === "chart" && !isLoading && (
        <div className="flex flex-col gap-8 mb-8 slide-up delay-200">
          {/* --- Advanced Analytical Highlights --- */}
          {!isLoading && comparisonList.length > 0 && (
            <div className="flex flex-col gap-6 slide-up delay-100">
              {/* Feature 1: Top Performers & Need Attention Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Most Improved */}
                {(() => {
                  const mostImproved = comparisonList
                    .slice()
                    .sort((a, b) => b.diffSuccess - a.diffSuccess)[0];
                  if (!mostImproved || mostImproved.diffSuccess <= 0)
                    return null;
                  return (
                    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                      <div className="bg-emerald-100 p-3 rounded-2xl flex-shrink-0">
                        <div className="text-2xl">🏆</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-emerald-800 font-bold mb-1">
                          พัฒนาการยอดเยี่ยม (Most Improved)
                        </h4>
                        <p className="text-slate-600 font-bold text-lg mb-2">
                          {mostImproved.name}{" "}
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            ({mostImproved.group})
                          </span>
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                              จากเดิม
                            </span>
                            <span className="text-slate-700 font-bold">
                              {mostImproved.successRateA.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-emerald-300">➜</div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                              ปัจจุบัน
                            </span>
                            <span className="text-emerald-700 font-black text-xl">
                              {mostImproved.successRateB.toFixed(1)}%
                            </span>
                          </div>
                          <div className="ml-auto bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                            ▲ +{mostImproved.diffSuccess.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Critical Watch */}
                {(() => {
                  const criticalWatch = comparisonList
                    .slice()
                    .sort((a, b) => a.diffSuccess - b.diffSuccess)[0];
                  if (!criticalWatch || criticalWatch.diffSuccess >= 0)
                    return null;
                  return (
                    <div className="bg-gradient-to-br from-rose-50 to-white rounded-3xl p-6 border border-rose-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                      <div className="bg-rose-100 p-3 rounded-2xl flex-shrink-0">
                        <div className="text-2xl">🚨</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-rose-800 font-bold mb-1">
                          พื้นที่เฝ้าระวัง (Critical Watch)
                        </h4>
                        <p className="text-slate-600 font-bold text-lg mb-2">
                          {criticalWatch.name}{" "}
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            ({criticalWatch.group})
                          </span>
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                              จากเดิม
                            </span>
                            <span className="text-slate-700 font-bold">
                              {criticalWatch.successRateA.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-rose-300">➜</div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                              ปัจจุบัน
                            </span>
                            <span className="text-rose-700 font-black text-xl">
                              {criticalWatch.successRateB.toFixed(1)}%
                            </span>
                          </div>
                          <div className="ml-auto bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                            ▼ {criticalWatch.diffSuccess.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Advanced Charts Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Feature 2: Scatter Plot Matrix (Delivery Success) */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col relative overflow-hidden group z-0 xl:col-span-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] -z-10 group-hover:bg-blue-100/50 transition-colors"></div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1 flex items-center gap-2">
                    🌌 เมทริกซ์นำจ่ายสำเร็จ (Success Matrix)
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    ความสัมพันธ์ระหว่าง 'ปริมาณงาน (ชิ้น)' และ '% นำจ่ายสำเร็จ'
                    ประจำวันที่{" "}
                    <strong>
                      {dateB
                        ? dateB.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "ล่าสุด"}
                    </strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-xs font-bold text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      ดีเยี่ยม (≥98%)
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-full text-xs font-bold text-yellow-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      ดี (95-97.9%)
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-xs font-bold text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      ต้องปรับปรุง (&lt;95%)
                    </div>
                  </div>

                  <div className="h-[400px] w-full mt-auto">
                    <ReactChart
                      type="scatter"
                      data={{
                        datasets: [
                          {
                            type: "scatter" as const,
                            label: "ที่ทำการ (Office)",
                            data: comparisonList.map((item) => ({
                              x: item.volB,
                              y: item.successRateB,
                              itemName: item.name,
                              itemGroup: item.group,
                            })),
                            backgroundColor: comparisonList.map((item) =>
                              item.successRateB >= 98
                                ? "rgba(16, 185, 129, 0.6)"
                                : item.successRateB >= 95
                                  ? "rgba(250, 204, 21, 0.8)"
                                  : "rgba(244, 63, 94, 0.6)",
                            ),
                            borderColor: comparisonList.map((item) =>
                              item.successRateB >= 98
                                ? "rgb(16, 185, 129)"
                                : item.successRateB >= 95
                                  ? "rgb(234, 179, 8)"
                                  : "rgb(225, 29, 72)",
                            ),
                            borderWidth: 1,
                            pointRadius: 6,
                            pointHoverRadius: 9,
                          },
                          // Target Line
                          {
                            type: "line" as const,
                            label: "เป้าหมายพื้นที่ (98%)",
                            data: [
                              {
                                x: 0,
                                y: 98,
                                itemName: "Target",
                                itemGroup: "",
                              },
                              {
                                x:
                                  Math.max(
                                    ...comparisonList.map((d) => d.volB),
                                  ) * 1.1,
                                y: 98,
                                itemName: "Target",
                                itemGroup: "",
                              },
                            ],
                            borderColor: "rgba(16, 185, 129, 0.5)",
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            titleColor: "#1e293b",
                            bodyColor: "#475569",
                            borderColor: "#e2e8f0",
                            borderWidth: 1,
                            callbacks: {
                              label: (context: any) => {
                                const raw = context.raw;
                                if (
                                  typeof raw.itemName === "undefined" ||
                                  raw.itemName === "Target"
                                )
                                  return "";
                                return [
                                  `${raw.itemName} (${raw.itemGroup})`,
                                  `ปริมาณงาน: ${raw.x.toLocaleString()} ชิ้น`,
                                  `สำเร็จ: ${raw.y.toFixed(2)}%`,
                                ];
                              },
                            },
                          },
                          datalabels: { display: false },
                        },
                        scales: {
                          x: {
                            title: {
                              display: true,
                              text: "ปริมาณงานนำจ่าย (ชิ้น)",
                              color: "#64748b",
                              font: { weight: "bold" },
                            },
                            grid: { color: "#f1f5f9" },
                          },
                          y: {
                            title: {
                              display: true,
                              text: "อัตราการนำจ่ายสำเร็จ (%)",
                              color: "#64748b",
                              font: { weight: "bold" },
                            },
                            min: Math.max(
                              0,
                              Math.min(
                                ...comparisonList.map((d) => d.successRateB),
                              ) - 5,
                            ),
                            max: 105,
                            grid: { color: "#f1f5f9" },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Feature 3: Scatter Plot Matrix (Call Efficiency) */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col relative overflow-hidden group z-0 xl:col-span-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[100px] -z-10 group-hover:bg-indigo-100/50 transition-colors"></div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1 flex items-center gap-2">
                    📞 เมทริกซ์การโทร (Call Matrix)
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    ความสัมพันธ์ระหว่าง 'ปริมาณงาน (ชิ้น)' และ '%
                    ประสิทธิภาพการโทร' ประจำวันที่{" "}
                    <strong>
                      {dateB
                        ? dateB.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "ล่าสุด"}
                    </strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-xs font-bold text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      ดีเยี่ยม (≥98%)
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-full text-xs font-bold text-yellow-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      ดี (95-97.9%)
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-xs font-bold text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      ต้องปรับปรุง (&lt;95%)
                    </div>
                  </div>

                  <div className="h-[400px] w-full mt-auto">
                    <ReactChart
                      type="scatter"
                      data={{
                        datasets: [
                          {
                            type: "scatter" as const,
                            label: "ที่ทำการ (Office)",
                            data: comparisonList.map((item) => ({
                              x: item.volB,
                              y: item.callRateB,
                              itemName: item.name,
                              itemGroup: item.group,
                            })),
                            backgroundColor: comparisonList.map((item) =>
                              item.callRateB >= 98
                                ? "rgba(16, 185, 129, 0.6)"
                                : item.callRateB >= 95
                                  ? "rgba(250, 204, 21, 0.8)"
                                  : "rgba(244, 63, 94, 0.6)",
                            ),
                            borderColor: comparisonList.map((item) =>
                              item.callRateB >= 98
                                ? "rgb(16, 185, 129)"
                                : item.callRateB >= 95
                                  ? "rgb(234, 179, 8)"
                                  : "rgb(225, 29, 72)",
                            ),
                            borderWidth: 1,
                            pointRadius: 6,
                            pointHoverRadius: 9,
                          },
                          // Target Line
                          {
                            type: "line" as const,
                            label: "เป้าหมายพื้นที่ (98%)",
                            data: [
                              {
                                x: 0,
                                y: 98,
                                itemName: "Target",
                                itemGroup: "",
                              },
                              {
                                x:
                                  Math.max(
                                    ...comparisonList.map((d) => d.volB),
                                  ) * 1.1,
                                y: 98,
                                itemName: "Target",
                                itemGroup: "",
                              },
                            ],
                            borderColor: "rgba(16, 185, 129, 0.5)",
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            titleColor: "#1e293b",
                            bodyColor: "#475569",
                            borderColor: "#e2e8f0",
                            borderWidth: 1,
                            callbacks: {
                              label: (context: any) => {
                                const raw = context.raw;
                                if (
                                  typeof raw.itemName === "undefined" ||
                                  raw.itemName === "Target"
                                )
                                  return "";
                                return [
                                  `${raw.itemName} (${raw.itemGroup})`,
                                  `ปริมาณงาน: ${raw.x.toLocaleString()} ชิ้น`,
                                  `ประสิทธิภาพการโทร: ${raw.y.toFixed(2)}%`,
                                ];
                              },
                            },
                          },
                          datalabels: { display: false },
                        },
                        scales: {
                          x: {
                            title: {
                              display: true,
                              text: "ปริมาณงานนำจ่าย (ชิ้น)",
                              color: "#64748b",
                              font: { weight: "bold" },
                            },
                            grid: { color: "#f1f5f9" },
                          },
                          y: {
                            title: {
                              display: true,
                              text: "ประสิทธิภาพการโทร (%)",
                              color: "#64748b",
                              font: { weight: "bold" },
                            },
                            min: Math.max(
                              0,
                              Math.min(
                                ...comparisonList.map((d) => d.callRateB),
                              ) - 5,
                            ),
                            max: 105,
                            grid: { color: "#f1f5f9" },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2x2 Grid for Executive Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart 1: Volume by Province */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col relative overflow-hidden group z-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] -z-10 group-hover:bg-blue-50 transition-colors"></div>
              <h3 className="text-lg font-bold text-slate-700 mb-1 flex items-center gap-2">
                📦 ปริมาณงานแยกตาม
                {isSingleGroup ? `ที่ทำการ (${singleGroupName})` : "จังหวัด"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                แสดงปริมาณงานทั้งหมดที่เข้าสู่ระบบ
                เปรียบเทียบสองช่วงเวลาเพื่อดูแนวโน้มภาระงาน
              </p>
              <div className="h-[350px] w-full mt-auto">
                <Bar
                  ref={chart1Ref}
                  data={{
                    labels: provinceAggregation.map((p) => p.group),
                    datasets: [
                      {
                        label: dateA
                          ? dateA.toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Start",
                        data: provinceAggregation.map((p) => p.volA),
                        backgroundColor: "rgba(59, 130, 246, 0.5)",
                        borderColor: "rgb(59, 130, 246)",
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                      {
                        label: dateB
                          ? dateB.toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "End",
                        data: provinceAggregation.map((p) => p.volB),
                        backgroundColor: "rgba(168, 85, 247, 0.5)",
                        borderColor: "rgb(168, 85, 247)",
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    layout: { padding: { top: 40 } },
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom" },
                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            `${context.dataset.label}: ${context.raw?.toLocaleString()} ชิ้น`,
                        },
                      },
                      datalabels: {
                        color: "#334155",
                        rotation: -90,
                        anchor: "end",
                        align: "end",
                        offset: 4,
                        font: { size: 10, weight: "bold" },
                        formatter: (value) => value.toLocaleString(),
                      },
                    },
                    onClick: (event) =>
                      handleChartClick(
                        event,
                        chart1Ref,
                        provinceAggregation.map((p) => p.group),
                      ),
                    onHover: (event, elements) => {
                      if (!isSingleGroup) {
                        (event.native?.target as HTMLElement).style.cursor =
                          elements[0] ? "pointer" : "default";
                      }
                    },
                  }}
                />
              </div>
            </div>

            {/* Chart 2: Efficiency by Province */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col relative overflow-hidden group z-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-[100px] -z-10 group-hover:bg-emerald-50 transition-colors"></div>
              <h3 className="text-lg font-bold text-slate-700 mb-1 flex items-center gap-2">
                ⚡ เปรียบเทียบประสิทธิภาพนำจ่ายตาม
                {isSingleGroup ? `ที่ทำการ (${singleGroupName})` : "จังหวัด"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                สัดส่วนของงานที่พนักงานนำจ่ายสำเร็จ
              </p>
              <div className="h-[350px] w-full mt-auto">
                <ReactChart
                  ref={chart2Ref}
                  type="bar"
                  data={{
                    labels: provinceAggregation.map((p) => p.group),
                    datasets: [
                      {
                        type: "bar" as const,
                        label: dateA
                          ? dateA.toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Start",
                        data: provinceAggregation.map((p) => p.successRateA),
                        backgroundColor: "rgba(59, 130, 246, 0.5)",
                        borderColor: "rgb(59, 130, 246)",
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                      {
                        type: "bar" as const,
                        label: dateB
                          ? dateB.toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "End",
                        data: provinceAggregation.map((p) => p.successRateB),
                        backgroundColor: "rgba(16, 185, 129, 0.4)",
                        borderColor: "rgb(16, 185, 129)",
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom" },
                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            `${context.dataset.label}: ${Number(context.raw).toFixed(2)}%`,
                        },
                      },
                      datalabels: {
                        color: "#334155",
                        rotation: -90,
                        anchor: "end",
                        align: (context: any) => {
                          const val = Number(
                            context.dataset.data[context.dataIndex],
                          );
                          return val > 20 ? "start" : "end";
                        },
                        offset: 4,
                        font: { size: 10, weight: "bold" },
                        formatter: (value) => Number(value).toFixed(1) + "%",
                      },
                    },
                    onClick: (event) =>
                      handleChartClick(
                        event,
                        chart2Ref,
                        provinceAggregation.map((p) => p.group),
                      ),
                    onHover: (event, elements) => {
                      if (!isSingleGroup) {
                        (event.native?.target as HTMLElement).style.cursor =
                          elements[0] ? "pointer" : "default";
                      }
                    },
                    scales: {
                      y: { min: 0, max: 100 },
                    },
                  }}
                />
              </div>
            </div>

            {/* Chart 3: Call Efficiency by Province */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col relative overflow-hidden group z-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[100px] -z-10 group-hover:bg-indigo-50 transition-colors"></div>
              <h3 className="text-lg font-bold text-slate-700 mb-1 flex items-center gap-2">
                📞 เปรียบเทียบประสิทธิภาพการโทรตาม
                {isSingleGroup ? `ที่ทำการ (${singleGroupName})` : "จังหวัด"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                สัดส่วนของการโทรติดต่อลูกค้า
              </p>
              <div className="h-[350px] w-full mt-auto">
                <ReactChart
                  ref={chart3Ref}
                  type="bar"
                  data={{
                    labels: provinceAggregation.map((p) => p.group),
                    datasets: [
                      {
                        type: "bar" as const,
                        label: dateA
                          ? dateA.toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Start",
                        data: provinceAggregation.map((p) => p.callRateA),
                        backgroundColor: "rgba(139, 92, 246, 0.5)",
                        borderColor: "rgb(139, 92, 246)",
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                      {
                        type: "bar" as const,
                        label: dateB
                          ? dateB.toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "End",
                        data: provinceAggregation.map((p) => p.callRateB),
                        backgroundColor: "rgba(236, 72, 153, 0.4)",
                        borderColor: "rgb(236, 72, 153)",
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    layout: { padding: { top: 40 } },
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom" },
                      tooltip: {
                        callbacks: {
                          label: (context) =>
                            `${context.dataset.label}: ${Number(context.raw).toFixed(2)}%`,
                        },
                      },
                      datalabels: {
                        color: "#334155",
                        rotation: -90,
                        anchor: "end",
                        align: (context: any) => {
                          const val = Number(
                            context.dataset.data[context.dataIndex],
                          );
                          return val > 20 ? "start" : "end";
                        },
                        offset: 4,
                        font: { size: 10, weight: "bold" },
                        formatter: (value) => Number(value).toFixed(1) + "%",
                      },
                    },
                    onClick: (event) =>
                      handleChartClick(
                        event,
                        chart3Ref,
                        provinceAggregation.map((p) => p.group),
                      ),
                    onHover: (event, elements) => {
                      if (!isSingleGroup) {
                        (event.native?.target as HTMLElement).style.cursor =
                          elements[0] ? "pointer" : "default";
                      }
                    },
                    scales: {
                      y: { min: 0, max: 100 },
                    },
                  }}
                />
              </div>
            </div>
            {/* Chart 4: Biggest Movers in Efficiency */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col relative overflow-hidden group z-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-bl-[100px] -z-10 group-hover:bg-amber-100/50 transition-colors"></div>
              <h3 className="text-lg font-bold text-slate-700 mb-1 flex items-center gap-2">
                📈 ที่ทำการที่ % เปลี่ยนแปลงมากที่สุด
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                5 ที่ทำการที่ก้าวหน้าที่สุด และ 5 ที่ทำการที่ตกลงมากที่สุด
              </p>
              <div className="h-[350px] w-full mt-auto">
                {(() => {
                  const sortedByDiff = comparisonList
                    .slice()
                    .sort((a, b) => b.diffSuccess - a.diffSuccess);
                  const top5 = sortedByDiff
                    .slice(0, 5)
                    .filter((x) => x.diffSuccess > 0);
                  const bottom5 = sortedByDiff
                    .slice(-5)
                    .reverse()
                    .filter((x) => x.diffSuccess < 0);
                  const chartData = [...top5, ...bottom5];

                  return (
                    <Bar
                      data={{
                        labels: chartData.map((d) => d.name),
                        datasets: [
                          {
                            label: "% เปลี่ยนแปลง",
                            data: chartData.map((d) => d.diffSuccess),
                            backgroundColor: chartData.map((d) =>
                              d.diffSuccess > 0
                                ? "rgba(16, 185, 129, 0.6)"
                                : "rgba(244, 63, 94, 0.6)",
                            ),
                            borderColor: chartData.map((d) =>
                              d.diffSuccess > 0
                                ? "rgb(16, 185, 129)"
                                : "rgb(244, 63, 94)",
                            ),
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={{
                        layout: { padding: { left: 40, right: 40 } },
                        indexAxis: "y" as const,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) =>
                                `${Number(context.raw) > 0 ? "+" : ""}${Number(context.raw).toFixed(2)}%`,
                            },
                          },
                          datalabels: {
                            color: (context) =>
                              Number(context.dataset.data[context.dataIndex]) >
                              0
                                ? "#047857"
                                : "#be123c",
                            anchor: (context) =>
                              Number(context.dataset.data[context.dataIndex]) >
                              0
                                ? "end"
                                : "start",
                            align: (context) =>
                              Number(context.dataset.data[context.dataIndex]) >
                              0
                                ? "end"
                                : "start",
                            font: { size: 10, weight: "bold" },
                            formatter: (value) =>
                              `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)}%`,
                          },
                        },
                        scales: {
                          x: {
                            grid: {
                              color: (ctx) =>
                                ctx.tick.value === 0 ? "#94a3b8" : "#f1f5f9",
                            },
                          },
                        },
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Detailed Table --- */}
      {activeTab === "table" && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 relative min-h-[500px] slide-up delay-200">
          <div className="w-full">
            <table className="min-w-full text-sm relative">
              <thead className="sticky top-[80px] z-40 bg-white shadow-md ring-1 ring-slate-200">
                {/* Super Header */}
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th
                    rowSpan={2}
                    className="py-4 px-6 text-left font-extrabold text-slate-700 w-16 align-bottom pb-4"
                  >
                    #
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort("name")}
                    className="py-4 px-6 text-left font-extrabold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors align-bottom pb-4"
                  >
                    ชื่อที่ทำการ <SortIcon col="name" />
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort("group")}
                    className="py-4 px-6 text-left font-extrabold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors hidden md:table-cell align-bottom pb-4 border-r border-slate-200"
                  >
                    สังกัด <SortIcon col="group" />
                  </th>

                  <th
                    colSpan={3}
                    className="py-3 px-2 text-center font-bold text-slate-600 bg-blue-100/50 border-b border-white border-r border-slate-200"
                  >
                    ปริมาณงาน (Volume)
                  </th>
                  <th
                    colSpan={3}
                    className="py-3 px-2 text-center font-bold text-emerald-700 bg-emerald-100/50 border-b border-white border-r border-slate-200"
                  >
                    ประสิทธิภาพนำจ่าย (Success)
                  </th>
                  <th
                    colSpan={3}
                    className="py-3 px-2 text-center font-bold text-indigo-700 bg-indigo-100/50 border-b border-white"
                  >
                    ประสิทธิภาพการโทร (Call)
                  </th>
                </tr>

                {/* Sub Header */}
                <tr className="bg-slate-50 border-b border-slate-200">
                  {/* Volume Group */}
                  <th
                    onClick={() => handleSort("volA")}
                    className="py-3 px-2 text-center font-semibold text-slate-600 bg-blue-50/50 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {dateA
                        ? dateA.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "..."}
                      <SortIcon col="volA" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("volB")}
                    className="py-3 px-2 text-center font-semibold text-slate-700 bg-purple-50/50 cursor-pointer hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {dateB
                        ? dateB.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "..."}
                      <SortIcon col="volB" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("diffVol")}
                    className="py-3 px-4 text-center font-bold text-slate-700 cursor-pointer hover:bg-slate-200 bg-slate-100/50 border-r border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      ความต่าง <SortIcon col="diffVol" />
                    </div>
                  </th>

                  {/* Success Rate Group */}
                  <th
                    onClick={() => handleSort("successRateA")}
                    className="py-3 px-2 text-center font-semibold text-emerald-700 bg-emerald-50/50 cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {dateA
                        ? dateA.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "..."}
                      <SortIcon col="successRateA" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("successRateB")}
                    className="py-3 px-2 text-center font-semibold text-emerald-700 bg-purple-50/50 cursor-pointer hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {dateB
                        ? dateB.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "..."}
                      <SortIcon col="successRateB" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("diffSuccess")}
                    className="py-3 px-4 text-center font-bold text-emerald-700 cursor-pointer hover:bg-emerald-200 bg-emerald-100/50 border-r border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      ความต่าง <SortIcon col="diffSuccess" />
                    </div>
                  </th>

                  {/* Call Rate Group */}
                  <th
                    onClick={() => handleSort("callRateA")}
                    className="py-3 px-2 text-center font-semibold text-indigo-700 bg-indigo-50/50 cursor-pointer hover:bg-indigo-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {dateA
                        ? dateA.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "..."}
                      <SortIcon col="callRateA" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("callRateB")}
                    className="py-3 px-2 text-center font-semibold text-indigo-700 bg-indigo-50/30 cursor-pointer hover:bg-indigo-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {dateB
                        ? dateB.toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })
                        : "..."}
                      <SortIcon col="callRateB" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("diffCall")}
                    className="py-3 px-4 text-center font-bold text-indigo-700 cursor-pointer hover:bg-indigo-200 bg-indigo-100/50 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      ความต่าง <SortIcon col="diffCall" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {comparisonList.map((row, index) => (
                  <tr
                    key={row.key}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500 hidden md:table-cell">
                      {row.group}
                    </td>

                    <td className="px-2 py-4 text-center font-bold text-slate-700 bg-blue-50/30 group-hover:bg-blue-100/40">
                      {row.volA.toLocaleString()}
                    </td>
                    <td className="px-2 py-4 text-center text-slate-700 bg-purple-50/30 group-hover:bg-purple-100/40">
                      {row.volB.toLocaleString()}
                    </td>
                    <td
                      className={`px-2 py-4 text-center font-bold bg-slate-50/50 ${getDiffColor(row.diffVol)}`}
                    >
                      {row.diffVol > 0 ? "+" : ""}
                      {row.diffVol.toLocaleString()}
                    </td>

                    <td className="px-2 py-4 text-center font-bold bg-blue-50/30 group-hover:bg-blue-100/40 text-slate-700">
                      {row.successRateA.toFixed(1)}%
                    </td>
                    <td className="px-2 py-4 text-center font-bold bg-purple-50/30 group-hover:bg-purple-100/40 text-slate-700">
                      {row.successRateB.toFixed(1)}%
                    </td>
                    <td
                      className={`px-2 py-4 text-center font-extrabold bg-emerald-50/20 group-hover:bg-emerald-50/40 border-l border-white ${getDiffColor(row.diffSuccess)}`}
                    >
                      {row.diffSuccess > 0
                        ? "▲"
                        : row.diffSuccess < 0
                          ? "▼"
                          : ""}{" "}
                      {Math.abs(row.diffSuccess).toFixed(2)}%
                    </td>

                    <td className="px-2 py-4 text-center font-bold bg-blue-50/30 group-hover:bg-blue-100/40 border-l-4 border-white text-slate-700">
                      {row.callRateA.toFixed(1)}%
                    </td>
                    <td className="px-2 py-4 text-center font-bold bg-purple-50/30 group-hover:bg-purple-100/40 text-slate-700">
                      {row.callRateB.toFixed(1)}%
                    </td>
                    <td
                      className={`px-2 py-4 text-center font-extrabold bg-indigo-50/20 group-hover:bg-indigo-50/40 border-l border-white ${getDiffColor(row.diffCall)}`}
                    >
                      {row.diffCall > 0 ? "▲" : row.diffCall < 0 ? "▼" : ""}{" "}
                      {Math.abs(row.diffCall).toFixed(2)}%
                    </td>
                  </tr>
                ))}

                {comparisonList.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="py-20 text-center text-slate-400"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
              {tableSummary && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sticky bottom-0 z-10">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 font-bold text-slate-700 text-right"
                    >
                      รวมทั้งสิ้น (Total)
                    </td>
                    <td className="px-2 py-4 text-center font-bold text-slate-800 bg-blue-100/40 border-l border-white">
                      {tableSummary.volA.toLocaleString()}
                    </td>
                    <td className="px-2 py-4 text-center font-bold text-slate-800 bg-purple-100/40">
                      {tableSummary.volB.toLocaleString()}
                    </td>
                    <td
                      className={`px-2 py-4 text-center font-extrabold ${getDiffColor(tableSummary.diffVol)} bg-slate-100`}
                    >
                      {tableSummary.diffVol > 0 ? "+" : ""}
                      {tableSummary.diffVol.toLocaleString()}
                    </td>

                    <td className="px-2 py-4 text-center font-bold text-slate-800 bg-blue-100/40 border-l border-white">
                      {tableSummary.successRateA.toFixed(1)}%
                    </td>
                    <td className="px-2 py-4 text-center font-bold text-slate-800 bg-purple-100/40">
                      {tableSummary.successRateB.toFixed(1)}%
                    </td>
                    <td
                      className={`px-2 py-4 text-center font-extrabold ${getDiffColor(tableSummary.diffSuccess)} bg-emerald-100/50`}
                    >
                      {tableSummary.diffSuccess > 0
                        ? "▲"
                        : tableSummary.diffSuccess < 0
                          ? "▼"
                          : ""}{" "}
                      {Math.abs(tableSummary.diffSuccess).toFixed(2)}%
                    </td>

                    <td className="px-2 py-4 text-center font-bold text-slate-800 bg-blue-100/40 border-l border-white">
                      {tableSummary.callRateA.toFixed(1)}%
                    </td>
                    <td className="px-2 py-4 text-center font-bold text-slate-800 bg-purple-100/40">
                      {tableSummary.callRateB.toFixed(1)}%
                    </td>
                    <td
                      className={`px-2 py-4 text-center font-extrabold ${getDiffColor(tableSummary.diffCall)} bg-indigo-100/50 border-r border-white`}
                    >
                      {tableSummary.diffCall > 0
                        ? "▲"
                        : tableSummary.diffCall < 0
                          ? "▼"
                          : ""}{" "}
                      {Math.abs(tableSummary.diffCall).toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
