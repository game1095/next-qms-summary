"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";
import { Session } from "@supabase/supabase-js";
import { toPng } from "html-to-image";
import Swal from "sweetalert2";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";

// --- Configuration Section (Hardcoded for REG 6) ---

type ProvinceDefinition = {
  key: string;
  label: string;
  codes: Set<string>;
};

type RegionConfig = {
  regionId: string;
  regionName: string;
  provinces: ProvinceDefinition[];
};

const reg6Provinces: ProvinceDefinition[] = [
  {
    key: "nakhon-sawan",
    label: "ปจ.นครสวรรค์",
    codes: new Set([
      "60000",
      "60001",
      "60002",
      "60110",
      "60120",
      "60130",
      "60140",
      "60150",
      "60160",
      "60170",
      "60180",
      "60190",
      "60210",
      "60220",
      "60230",
      "60240",
      "428",
    ]),
  },
  {
    key: "uthai-thani",
    label: "ปจ.อุทัยธานี",
    codes: new Set([
      "61000",
      "61110",
      "61120",
      "61130",
      "61140",
      "61150",
      "61160",
      "61170",
      "61180",
    ]),
  },
  {
    key: "kamphaeng-phet",
    label: "ปจ.กำแพงเพชร",
    codes: new Set([
      "62000",
      "62110",
      "62120",
      "62130",
      "62140",
      "62150",
      "62160",
      "62170",
      "62180",
      "62190",
      "62210",
      "89",
      "94",
    ]),
  },
  {
    key: "tak",
    label: "ปจ.ตาก",
    codes: new Set([
      "63000",
      "63110",
      "63111",
      "63120",
      "63130",
      "63140",
      "63150",
      "63160",
      "63170",
      "63180",
      "58",
      "154",
    ]),
  },
  {
    key: "sukhothai",
    label: "ปจ.สุโขทัย",
    codes: new Set([
      "64000",
      "64110",
      "64120",
      "64130",
      "64140",
      "64150",
      "64160",
      "64170",
      "64180",
      "64190",
      "64210",
      "64220",
      "64230",
    ]),
  },
  {
    key: "phitsanulok",
    label: "ปจ.พิษณุโลก",
    codes: new Set([
      "65000",
      "65001",
      "65110",
      "65120",
      "65130",
      "65140",
      "65150",
      "65160",
      "65170",
      "65180",
      "65190",
      "65210",
      "65220",
      "65230",
      "65240",
      "36",
      "61",
      "112",
      "287",
      "303",
    ]),
  },
  {
    key: "phichit",
    label: "ปจ.พิจิตร",
    codes: new Set([
      "66000",
      "66110",
      "66120",
      "66130",
      "66140",
      "66150",
      "66160",
      "66170",
      "66180",
      "66190",
      "66210",
      "66220",
      "66230",
    ]),
  },
  {
    key: "phetchabun",
    label: "ปจ.เพชรบูรณ์",
    codes: new Set([
      "67000",
      "67110",
      "67120",
      "67130",
      "67140",
      "67150",
      "67160",
      "67170",
      "67180",
      "67190",
      "67210",
      "67220",
      "67230",
      "67240",
      "67250",
      "67260",
      "67270",
      "67280",
    ]),
  },
  {
    key: "sp-nakhon-sawan",
    label: "ศป.นครสวรรค์",
    codes: new Set(["60010"]),
  },
  {
    key: "sp-phitsanulok",
    label: "ศป.พิษณุโลก",
    codes: new Set(["65010"]),
  },
];

const CURRENT_CONFIG: RegionConfig = {
  regionId: "reg6",
  regionName: "ปข.6",
  provinces: reg6Provinces,
};

// --- Types & Interfaces ---

interface DeliveryDataRow {
  id?: number;
  report_date: string;
  file_key: string;
  cole: string;
  colf: string;
  cold: string;
  colg: string;
  valueh: number;
  valuei: number;
  valuek: number;
  valuem: number;
  valueo: number;
  colq: number;
  colr: number;
  cols: number;
  colt: number;
}

interface AggregatedSums {
  sumH: number;
  sumI: number;
  sumK: number;
  sumM: number;
  sumO: number;
  sumQ: number;
  sumS: number;
}

interface ViewProps {
  active: boolean;
}

interface ComparisonDiff {
  value: number;
  percent: number;
  direction: "up" | "down" | "neutral" | "no-data";
}

type SortKey =
  | "successRate"
  | "callSuccessRate"
  | "sumH"
  | "sumM"
  | "sumO"
  | "sumK"
  | "sumI";
type SortDirection = "asc" | "desc";

// --- Constants & Helpers ---

const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

const getDisplayNamesFromConfig = () => {
  const map: { [key: string]: string } = {
    all: `ทุกที่ทำการ`,
    "province-summary": `สรุปตาม ปจ.`,
  };
  CURRENT_CONFIG.provinces.forEach((p) => {
    map[p.key] = p.label;
  });
  return map;
};

const getCodStatus = (code: string | number) => {
  const c = String(code).toUpperCase();
  if (c === "R") return "COD(แดง)";
  if (c === "B") return "COD(น้ำเงิน)";
  if (c === "N") return "ไม่";
  return "ไม่";
};

const formatDateToISO = (date: Date | null) => {
  if (!date) return null;
  const yearAD = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${yearAD}-${pad(month)}-${pad(day)}`;
};

const formatToFullThaiDate = (date: Date | string | null) => {
  if (!date) return "";
  let dateObj;
  if (typeof date === "string") {
    dateObj = new Date(date + "T00:00:00");
  } else {
    dateObj = date;
  }
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  const day = dateObj.getDate();
  const monthName = thaiMonths[dateObj.getMonth()];
  const yearBE = dateObj.getFullYear() + 543;
  return `${day} ${monthName} ${yearBE}`;
};

const formatShortThaiDate = (dateStr: string | Date) => {
  const dateObj = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const thaiMonthsShort = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${dateObj.getDate()} ${thaiMonthsShort[dateObj.getMonth()]}`;
};

// --- Modern Components ---

const FilterButton = ({ active, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 border ${
      active
        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-transparent shadow-lg shadow-red-500/30"
        : "bg-white text-gray-600 border-gray-100 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
    }`}
  >
    {children}
  </button>
);

const KPICard = ({
  title,
  value,
  subValue,
  type = "neutral",
  icon,
  highlight = false,
  trend,
  comparisonLabel,
  onClick,
  inverseTrend = false,
}: any) => {
  const styles: any = {
    success: {
      text: "text-emerald-700",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
    },
    danger: {
      text: "text-rose-700",
      iconBg: "bg-rose-100",
      iconText: "text-rose-600",
    },
    primary: {
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },
    warning: {
      text: "text-orange-700",
      iconBg: "bg-orange-100",
      iconText: "text-orange-600",
    },
    neutral: {
      text: "text-gray-700",
      iconBg: "bg-gray-100",
      iconText: "text-gray-500",
    },
  };

  const activeStyle = styles[type] || styles.neutral;

  const renderTrend = () => {
    if (!trend) return null;
    if (trend.direction === "no-data") {
      return (
        <span className="text-xs opacity-70 font-medium ml-1">
          (ไม่มีข้อมูลเก่า)
        </span>
      );
    }

    let colorClass = "text-gray-400";
    if (inverseTrend) {
      if (trend.direction === "up") colorClass = "text-rose-500";
      else if (trend.direction === "down") colorClass = "text-emerald-500";
    } else {
      if (trend.direction === "up") colorClass = "text-emerald-500";
      else if (trend.direction === "down") colorClass = "text-rose-500";
    }

    const whiteColorClass = "text-white";
    const symbol =
      trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "-";

    const isPercent = title.includes("(%)") || title.startsWith("อัตรา");
    const diffValue = isPercent
      ? Math.abs(trend.diff).toFixed(1)
      : Math.abs(trend.diff).toLocaleString();

    return (
      <>
        <span
          className={`font-bold ${highlight ? whiteColorClass : colorClass}`}
        >
          {symbol} {diffValue}
          {isPercent ? "%" : ""}
        </span>
        <span
          className={`text-[10px] ml-1 ${highlight ? "opacity-80 text-white" : "text-gray-400"}`}
        >
          {comparisonLabel || "เทียบก่อนหน้า"}
        </span>
      </>
    );
  };

  if (highlight) {
    const gradientClass =
      type === "success"
        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20"
        : type === "danger"
          ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-xl shadow-rose-500/20"
          : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20";

    return (
      <div
        onClick={onClick}
        className={`${gradientClass} rounded-2xl p-6 text-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${onClick ? "cursor-pointer active:scale-95" : ""}`}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">
                {title}
              </h3>
              <p className="text-4xl font-extrabold tracking-tight drop-shadow-sm">
                {value}
              </p>
              {trend && (
                <div className="flex items-center gap-1 mt-2 bg-white/20 w-fit px-2 py-0.5 rounded-lg backdrop-blur-sm">
                  {renderTrend()}
                </div>
              )}
              {subValue && !trend && (
                <p className="text-sm mt-1 opacity-90 font-medium bg-white/20 inline-block px-2 py-0.5 rounded-md backdrop-blur-md">
                  {subValue}
                </p>
              )}
            </div>
            {icon && (
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner">
                {icon}
              </div>
            )}
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group ${onClick ? "cursor-pointer ring-2 ring-transparent hover:ring-blue-100" : ""}`}
    >
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-red-500 transition-colors">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <p
            className={`text-3xl font-bold tracking-tight ${activeStyle.text}`}
          >
            {value}
          </p>
          {subValue && (
            <span className="text-sm text-gray-400 font-medium">
              {subValue}
            </span>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            {renderTrend()}
          </div>
        )}
      </div>
      {icon && (
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeStyle.iconBg} ${activeStyle.iconText} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}
        >
          {icon}
        </div>
      )}
    </div>
  );
};

// --- Views ---

const LoginView = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-red-100 to-rose-100 blur-3xl opacity-60"></div>
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 blur-3xl opacity-60"></div>
      </div>
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-10 space-y-8 border border-white/50 relative z-10">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-rose-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-red-500/30 mx-auto mb-6 transform rotate-3">
            Q
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            QMS Summary
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            เข้าสู่ระบบเพื่อจัดการข้อมูล
          </p>
        </div>
        {errorMsg && (
          <div className="bg-rose-50 text-rose-600 text-sm p-4 rounded-xl border border-rose-100 text-center font-medium animate-pulse">
            {errorMsg === "Invalid login credentials"
              ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
              : errorMsg}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 ml-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 ml-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
};

const DashboardView = ({ active }: ViewProps) => {
  const [supabaseData, setSupabaseData] = useState<DeliveryDataRow[]>([]);
  const [prevSupabaseData, setPrevSupabaseData] = useState<DeliveryDataRow[]>(
    [],
  );
  // New: Store full month data for trends
  const [monthSupabaseData, setMonthSupabaseData] = useState<DeliveryDataRow[]>(
    [],
  );

  const [comparisonLabel, setComparisonLabel] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [uploadFilesData, setUploadFilesData] = useState<{
    [key: string]: any[];
  }>({});
  const [uploadFileNames, setUploadFileNames] = useState<{
    [key: string]: string;
  }>({});
  const [uploadDate, setUploadDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    details: [] as any[],
    summary: { H: 0, M: 0, O: 0 },
  });

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "successRate",
    direction: "desc",
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const filterDisplayNames = useMemo(() => getDisplayNamesFromConfig(), []);

  const allUserPostalCodes = useMemo(() => {
    const codes: string[] = [];
    CURRENT_CONFIG.provinces.forEach((p) =>
      p.codes.forEach((c) => codes.push(c)),
    );
    return codes;
  }, []);

  const getProvinceKey = (postalCode: string): string => {
    const code = String(postalCode);
    for (const province of CURRENT_CONFIG.provinces) {
      if (province.codes.has(code)) {
        return province.key;
      }
    }
    return "other";
  };

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setStartDate(new Date(yesterday));
    setEndDate(new Date(yesterday));
    setUploadDate(new Date(yesterday));
  }, []);

  const fetchData = async (start: Date | null, end: Date | null) => {
    setIsLoading(true);
    setSupabaseData([]);
    setPrevSupabaseData([]);
    setMonthSupabaseData([]);

    if (!start || !end) {
      setIsLoading(false);
      return;
    }
    const isoStartDate = formatDateToISO(start);
    const isoEndDate = formatDateToISO(end);

    const dayDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 3600 * 24),
    );

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - Math.max(0, dayDiff));

    const isoPrevStartDate = formatDateToISO(prevStart);
    const isoPrevEndDate = formatDateToISO(prevEnd);

    // Calculate Month Start and End for Trend Data (Current Month of startDate)
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const isoMonthStart = formatDateToISO(monthStart);
    const isoMonthEnd = formatDateToISO(monthEnd);

    if (dayDiff === 0) {
      setComparisonLabel(`เทียบกับ ${formatShortThaiDate(prevStart)}`);
    } else {
      setComparisonLabel(
        `เทียบช่วง ${formatShortThaiDate(prevStart)} - ${formatShortThaiDate(prevEnd)}`,
      );
    }

    try {
      const fetchRange = async (s: string, e: string) => {
        let allData: DeliveryDataRow[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          const { data, error } = await supabase
            .from("delivery_data")
            .select("*")
            .gte("report_date", s)
            .lte("report_date", e)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;
          if (data && data.length > 0) {
            allData = [...allData, ...(data as DeliveryDataRow[])];
            if (data.length < pageSize) hasMore = false;
            else page++;
          } else {
            hasMore = false;
          }
        }
        return allData;
      };

      const [currentData, prevData, monthData] = await Promise.all([
        fetchRange(isoStartDate!, isoEndDate!),
        fetchRange(isoPrevStartDate!, isoPrevEndDate!),
        fetchRange(isoMonthStart!, isoMonthEnd!), // Fetch full month data
      ]);

      setSupabaseData(currentData);
      setPrevSupabaseData(prevData);
      setMonthSupabaseData(monthData);
    } catch (error: any) {
      console.error("Error fetching delivery data:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลหลักได้: " + error.message,
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate, active]);

  const handleUploadFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileKey: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileNames((prev) => ({ ...prev, [fileKey]: file.name }));
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const buffer = event?.target?.result;
      if (!buffer) return;
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const slicedData = jsonData.slice(1, 1000) as any[][];

      const filteredData = slicedData
        .map((row) => {
          let codRaw = String(row[6]).toUpperCase();
          if (
            !codRaw ||
            codRaw === "NULL" ||
            codRaw === "UNDEFINED" ||
            codRaw.trim() === "N"
          ) {
            codRaw = "N";
          }
          return {
            colE: row[4],
            colF: row[5],
            colD: row[3] ? String(row[3]).replace(/\s/g, "") : "N/A",
            colG: codRaw,
            valueH: row[7],
            valueI: row[8],
            valueK: row[10],
            valueM: row[12],
            valueO: row[14],
            valQ: row[16],
            valR: row[17],
            valS: row[18],
            valT: row[19],
          };
        })
        .filter((item) => item.colE && item.colF);
      setUploadFilesData((prev) => ({ ...prev, [fileKey]: filteredData }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmitUpload = async () => {
    const fileKeys = Object.keys(uploadFilesData);
    if (fileKeys.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์",
        confirmButtonText: "ตกลง",
      });
      return;
    }
    setIsUploading(true);
    try {
      const reportDate = formatDateToISO(uploadDate);
      if (!reportDate) throw new Error("กรุณาเลือกวันที่อัปโหลด");

      const { count, error: countError } = await supabase
        .from("delivery_data")
        .select("id", { count: "exact", head: true })
        .eq("report_date", reportDate)
        .in("file_key", fileKeys)
        .in("cole", allUserPostalCodes);

      if (countError)
        throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้: " + countError.message);
      if ((count ?? 0) > 0) {
        Swal.fire({
          icon: "info",
          title: "ข้อมูลซ้ำ",
          text: `คุณ (${CURRENT_CONFIG.regionName}) ได้อัปโหลดข้อมูลประเภท ${fileKeys.join(", ")} สำหรับวันที่ ${formatToFullThaiDate(uploadDate)} เรียบร้อยแล้ว`,
          confirmButtonText: "รับทราบ",
        });
        setIsUploading(false);
        return;
      }

      const rowsToInsert: Omit<DeliveryDataRow, "id">[] = [];
      const userPostalSet = new Set(allUserPostalCodes);
      Object.entries(uploadFilesData).forEach(([fileKey, fileData]) => {
        fileData.forEach((item: any) => {
          if (userPostalSet.has(String(item.colE))) {
            rowsToInsert.push({
              report_date: reportDate,
              file_key: fileKey,
              cole: item.colE,
              colf: item.colF,
              cold: item.colD,
              colg: item.colG,
              valueh: parseFloat(item.valueH) || 0,
              valuei: parseFloat(item.valueI) || 0,
              valuek: parseFloat(item.valueK) || 0,
              valuem: parseFloat(item.valueM) || 0,
              valueo: parseFloat(item.valueO) || 0,
              colq: parseFloat(item.valQ) || 0,
              colr: parseFloat(item.valR) || 0,
              cols: parseFloat(item.valS) || 0,
              colt: parseFloat(item.valT) || 0,
            });
          }
        });
      });

      if (rowsToInsert.length === 0)
        throw new Error(
          `ไม่พบข้อมูลที่ตรงกับพื้นที่รับผิดชอบของ ${CURRENT_CONFIG.regionName} ในไฟล์ที่อัปโหลด`,
        );

      const { error: insertError } = await supabase
        .from("delivery_data")
        .insert(rowsToInsert);
      if (insertError)
        throw new Error("ไม่สามารถอัปโหลดข้อมูลได้: " + insertError.message);

      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: `อัปโหลดข้อมูลสำหรับวันที่ ${formatToFullThaiDate(uploadDate)} สำเร็จ! (${rowsToInsert.length} รายการ)`,
        confirmButtonText: "ตกลง",
      });
      setIsUploadModalOpen(false);
      setUploadFilesData({});
      setUploadFileNames({});
      setStartDate(uploadDate);
      setEndDate(uploadDate);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: (error as Error).message,
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const calculateKPIs = (data: DeliveryDataRow[]) => {
    const summary = { H: 0, I: 0, K: 0, M: 0, O: 0, Q: 0, S: 0 };
    let targetSet: Set<string>;

    if (selectedFilter === "all" || selectedFilter === "province-summary") {
      targetSet = new Set();
      CURRENT_CONFIG.provinces.forEach((p) =>
        p.codes.forEach((c) => targetSet.add(c)),
      );
    } else {
      const found = CURRENT_CONFIG.provinces.find(
        (p) => p.key === selectedFilter,
      );
      targetSet = found ? found.codes : new Set();
    }

    const isServiceMatch = (fileKey: string, filter: string) => {
      const cleanKey = String(fileKey).trim();
      if (filter === "all") return true;
      if (filter === "GROUP_EJW")
        return ["E(E)", "E(J)", "E(W)"].includes(cleanKey);
      if (filter === "GROUP_COD")
        return ["E-BCOD", "E-RCOD"].includes(cleanKey);
      return cleanKey === filter;
    };

    data.forEach((item) => {
      if (!isServiceMatch(item.file_key, selectedServiceFilter)) return;
      const cleanCole = String(item.cole).trim();
      if (targetSet.has(cleanCole)) {
        summary.H += item.valueh || 0;
        summary.I += item.valuei || 0;
        summary.K += item.valuek || 0;
        summary.M += item.valuem || 0;
        summary.O += item.valueo || 0;
        summary.Q += item.colq || 0;
        summary.S += item.cols || 0;
      }
    });

    const successRate = summary.H > 0 ? (summary.M / summary.H) * 100 : 0;
    return { ...summary, successRate };
  };

  const aggregatedData = useMemo((): [string, AggregatedSums][] => {
    const summary = new Map<string, AggregatedSums>();
    let targetSet: Set<string>;
    if (selectedFilter === "all") {
      targetSet = new Set();
      CURRENT_CONFIG.provinces.forEach((p) =>
        p.codes.forEach((c) => targetSet.add(c)),
      );
    } else {
      const found = CURRENT_CONFIG.provinces.find(
        (p) => p.key === selectedFilter,
      );
      targetSet = found ? found.codes : new Set();
    }

    const isServiceMatch = (fileKey: string, filter: string) => {
      const cleanKey = String(fileKey).trim();
      if (filter === "all") return true;
      if (filter === "GROUP_EJW")
        return ["E(E)", "E(J)", "E(W)"].includes(cleanKey);
      if (filter === "GROUP_COD")
        return ["E-BCOD", "E-RCOD"].includes(cleanKey);
      return cleanKey === filter;
    };

    if (selectedFilter === "province-summary") {
      supabaseData.forEach((item: DeliveryDataRow) => {
        if (!isServiceMatch(item.file_key, selectedServiceFilter)) return;
        const cleanCole = String(item.cole).trim();
        const provinceKey = getProvinceKey(cleanCole);
        if (provinceKey === "other") return;

        const provinceName = filterDisplayNames[provinceKey] || "ไม่ระบุ";
        const compositeKey = `${provinceKey}||${provinceName}`;
        const currentSums = summary.get(compositeKey) || {
          sumH: 0,
          sumI: 0,
          sumK: 0,
          sumM: 0,
          sumO: 0,
          sumQ: 0,
          sumS: 0,
        };
        summary.set(compositeKey, {
          sumH: currentSums.sumH + (item.valueh || 0),
          sumI: currentSums.sumI + (item.valuei || 0),
          sumK: currentSums.sumK + (item.valuek || 0),
          sumM: currentSums.sumM + (item.valuem || 0),
          sumO: currentSums.sumO + (item.valueo || 0),
          sumQ: currentSums.sumQ + (item.colq || 0),
          sumS: currentSums.sumS + (item.cols || 0),
        });
      });
      return Array.from(summary.entries());
    }

    supabaseData.forEach((item: DeliveryDataRow) => {
      if (!isServiceMatch(item.file_key, selectedServiceFilter)) return;
      const cleanCole = String(item.cole).trim();
      if (targetSet.has(cleanCole)) {
        const keyE = cleanCole;
        const keyF = String(item.colf).trim();
        const compositeKey = `${keyE}||${keyF}`;
        const currentSums = summary.get(compositeKey) || {
          sumH: 0,
          sumI: 0,
          sumK: 0,
          sumM: 0,
          sumO: 0,
          sumQ: 0,
          sumS: 0,
        };
        summary.set(compositeKey, {
          sumH: currentSums.sumH + (item.valueh || 0),
          sumI: currentSums.sumI + (item.valuei || 0),
          sumK: currentSums.sumK + (item.valuek || 0),
          sumM: currentSums.sumM + (item.valuem || 0),
          sumO: currentSums.sumO + (item.valueo || 0),
          sumQ: currentSums.sumQ + (item.colq || 0),
          sumS: currentSums.sumS + (item.cols || 0),
        });
      }
    });

    return Array.from(summary.entries());
  }, [supabaseData, selectedFilter, selectedServiceFilter, filterDisplayNames]);

  const summaryData = useMemo(() => {
    const filteredArray = aggregatedData.filter(([compositeKey, sums]) => {
      if (searchTerm.trim() === "") return true;
      const [keyE, keyF] = compositeKey.split("||");
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      return (
        keyE.includes(lowerSearchTerm) ||
        keyF.toLowerCase().includes(lowerSearchTerm)
      );
    });

    filteredArray.sort((a, b) => {
      const sumsA = a[1];
      const sumsB = b[1];

      let valA = 0;
      let valB = 0;

      switch (sortConfig.key) {
        case "successRate":
          valA = sumsA.sumH > 0 ? (sumsA.sumM / sumsA.sumH) * 100 : 0;
          valB = sumsB.sumH > 0 ? (sumsB.sumM / sumsB.sumH) * 100 : 0;
          break;
        case "callSuccessRate":
          valA = sumsA.sumH > 0 ? (sumsA.sumQ / sumsA.sumH) * 100 : 0;
          valB = sumsB.sumH > 0 ? (sumsB.sumQ / sumsB.sumH) * 100 : 0;
          break;
        default:
          valA = (sumsA as any)[sortConfig.key] || 0;
          valB = (sumsB as any)[sortConfig.key] || 0;
      }

      if (valA < valB) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return filteredArray;
  }, [aggregatedData, searchTerm, sortConfig]);

  const summaryKPIs = useMemo(() => {
    return calculateKPIs(supabaseData);
  }, [supabaseData, selectedFilter, selectedServiceFilter]);

  const prevKPIs = useMemo(() => {
    return calculateKPIs(prevSupabaseData);
  }, [prevSupabaseData, selectedFilter, selectedServiceFilter]);

  const getComparison = (
    current: number,
    prev: number,
  ): { diff: number; direction: "up" | "down" | "neutral" | "no-data" } => {
    if (prevKPIs.H === 0) return { diff: 0, direction: "no-data" };

    const diff = current - prev;
    if (Math.abs(diff) < 0.01) return { diff: 0, direction: "neutral" };
    return {
      diff,
      direction: diff > 0 ? "up" : "down",
    };
  };

  const currentCallSuccessRate =
    summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0;
  const prevCallSuccessRate =
    prevKPIs.H > 0 ? (prevKPIs.Q / prevKPIs.H) * 100 : 0;

  const currentCallFailRate =
    summaryKPIs.H > 0 ? (summaryKPIs.S / summaryKPIs.H) * 100 : 0;
  const prevCallFailRate = prevKPIs.H > 0 ? (prevKPIs.S / prevKPIs.H) * 100 : 0;

  // --- Logic for Month Trend Data (Full Month) ---
  const trendData = useMemo(() => {
    const groupedByDate = new Map<
      string,
      { H: number; M: number; Q: number; S: number }
    >();
    let targetSet: Set<string>;

    if (selectedFilter === "all" || selectedFilter === "province-summary") {
      targetSet = new Set();
      CURRENT_CONFIG.provinces.forEach((p) =>
        p.codes.forEach((c) => targetSet.add(c)),
      );
    } else {
      const found = CURRENT_CONFIG.provinces.find(
        (p) => p.key === selectedFilter,
      );
      targetSet = found ? found.codes : new Set();
    }

    // Use monthSupabaseData instead of supabaseData
    monthSupabaseData.forEach((item) => {
      const cleanKey = String(item.file_key).trim();
      let isService = false;
      if (selectedServiceFilter === "all") isService = true;
      else if (selectedServiceFilter === "GROUP_EJW")
        isService = ["E(E)", "E(J)", "E(W)"].includes(cleanKey);
      else if (selectedServiceFilter === "GROUP_COD")
        isService = ["E-BCOD", "E-RCOD"].includes(cleanKey);
      else isService = cleanKey === selectedServiceFilter;

      if (!isService) return;

      if (targetSet.has(String(item.cole).trim())) {
        const dateKey = item.report_date;
        const current = groupedByDate.get(dateKey) || {
          H: 0,
          M: 0,
          Q: 0,
          S: 0,
        };
        groupedByDate.set(dateKey, {
          H: current.H + (item.valueh || 0),
          M: current.M + (item.valuem || 0),
          Q: current.Q + (item.colq || 0),
          S: current.S + (item.cols || 0),
        });
      }
    });

    const sortedDates = Array.from(groupedByDate.keys()).sort();
    return sortedDates.map((date) => {
      const stats = groupedByDate.get(date)!;
      const rate = stats.H > 0 ? (stats.M / stats.H) * 100 : 0;
      const callRate = stats.H > 0 ? (stats.Q / stats.H) * 100 : 0;
      return {
        date: formatShortThaiDate(date),
        fullDate: formatToFullThaiDate(date),
        successRate: parseFloat(rate.toFixed(2)),
        callSuccessRate: parseFloat(callRate.toFixed(2)),
        volumeH: stats.H,
        volumeM: stats.M,
        volumeQ: stats.Q,
        volumeS: stats.S,
      };
    });
  }, [monthSupabaseData, selectedFilter, selectedServiceFilter]); // Depend on monthSupabaseData

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey)
      return <span className="text-gray-300 ml-1 opacity-50">⇅</span>;
    return (
      <span className="text-blue-600 ml-1">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const handleShowUnreportedOffices = () => {
    if (summaryKPIs.I === 0) {
      Swal.fire({
        icon: "success",
        title: "ยอดเยี่ยม!",
        text: "ไม่มีที่ทำการใดมียอดไม่รายงานผล (I)",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const unreportedMap = new Map<string, number>();
    let targetSet: Set<string>;

    if (selectedFilter === "all" || selectedFilter === "province-summary") {
      targetSet = new Set();
      CURRENT_CONFIG.provinces.forEach((p) =>
        p.codes.forEach((c) => targetSet.add(c)),
      );
    } else {
      const found = CURRENT_CONFIG.provinces.find(
        (p) => p.key === selectedFilter,
      );
      targetSet = found ? found.codes : new Set();
    }

    supabaseData.forEach((item) => {
      if ((item.valuei || 0) > 0) {
        if (targetSet.has(String(item.cole).trim())) {
          const officeName = String(item.colf).trim();
          const currentVal = unreportedMap.get(officeName) || 0;
          unreportedMap.set(officeName, currentVal + (item.valuei || 0));
        }
      }
    });

    const unreportedList = Array.from(unreportedMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort Descending
      .map(
        ([name, count], index) =>
          `<tr class="border-b hover:bg-red-50">
            <td class="text-left py-2 px-4">${index + 1}. ${name}</td>
            <td class="text-right py-2 px-4 font-bold text-red-600">${count.toLocaleString()}</td>
           </tr>`,
      )
      .join("");

    const htmlContent = `
      <div class="overflow-y-auto max-h-[60vh]">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 text-gray-600 font-bold sticky top-0">
            <tr>
              <td class="text-left py-2 px-4">ที่ทำการ</td>
              <td class="text-right py-2 px-4">จำนวน (ชิ้น)</td>
            </tr>
          </thead>
          <tbody>${unreportedList}</tbody>
        </table>
      </div>
    `;

    Swal.fire({
      title: `<span class="text-red-600 font-bold">⚠️ ที่ทำการไม่รายงานผล</span>`,
      html: htmlContent,
      width: 600,
      showCloseButton: true,
      focusConfirm: false,
      confirmButtonText: "ปิด",
    });
  };

  const handleShowDetails = (compositeKey: string) => {
    const [keyE, keyF] = compositeKey.split("||");
    const title = `รายละเอียด: ${keyE} - ${keyF}`;
    const subSummaryMap = new Map();
    const totalSummary = { H: 0, M: 0, O: 0 };
    supabaseData.forEach((item) => {
      if (String(item.cole) === keyE && String(item.colf) === keyF) {
        const service = item.cold;
        const codRaw = item.colg;
        const codDisplay = getCodStatus(codRaw);
        const subKey = `${service}||${codDisplay}||${codRaw}`;
        const valueH = item.valueh || 0;
        const valueM = item.valuem || 0;
        const valueO = item.valueo || 0;
        totalSummary.H += valueH;
        totalSummary.M += valueM;
        totalSummary.O += valueO;
        const currentSubSums = subSummaryMap.get(subKey) || {
          H: 0,
          M: 0,
          O: 0,
        };
        subSummaryMap.set(subKey, {
          H: currentSubSums.H + valueH,
          M: currentSubSums.M + valueM,
          O: currentSubSums.O + valueO,
        });
      }
    });
    const detailsArray = Array.from(subSummaryMap.entries()).map(
      ([key, sums]) => {
        const [service, codDisplay, codRaw] = key.split("||");
        return { service, codDisplay, codRaw, ...sums };
      },
    );
    setModalData({
      title: title,
      details: detailsArray,
      summary: totalSummary,
    });
    setIsModalOpen(true);
  };

  const handleBatchExport = async () => {
    if (!reportRef.current) return;
    if (supabaseData.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "ไม่มีข้อมูล",
        text: "กรุณาเลือกช่วงเวลาที่มีข้อมูลก่อนเริ่มการดาวน์โหลด",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "ยืนยันการบันทึกภาพ",
      text: `ระบบจะทำการดาวน์โหลดรายงานสรุปแยกรายจังหวัด ทั้งหมด ${CURRENT_CONFIG.provinces.length + 1} รายการ โดยหน้าจอจะเปลี่ยนไปตามจังหวัดที่กำลังบันทึก`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#EF4444",
      confirmButtonText: "เริ่มดาวน์โหลด",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirmResult.isConfirmed) return;

    const originalFilter = selectedFilter;
    const originalControlsState = isControlsOpen;
    setIsBatchExporting(true);
    document.body.style.cursor = "wait";

    try {
      setIsControlsOpen(false);
      const exportQueue = [
        { key: "province-summary", label: "สรุปภาพรวมเขต" },
        ...CURRENT_CONFIG.provinces.map((p) => ({
          key: p.key,
          label: p.label,
        })),
      ];

      for (const item of exportQueue) {
        setSelectedFilter(item.key);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const dataUrl = await toPng(reportRef.current, {
          cacheBust: true,
          backgroundColor: "#FFFFFF", // Force White Background for clean Report
        });
        const link = document.createElement("a");
        const dateStr = formatDateToISO(startDate) || "report";
        const safeName = item.label.replace(/\./g, "").replace(/\s/g, "_");
        link.href = dataUrl;
        link.download = `${safeName}_${dateStr}.png`;
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      Swal.fire({
        icon: "success",
        title: "เสร็จสิ้น",
        text: "ดาวน์โหลดครบทุกจังหวัดเรียบร้อยแล้ว!",
        confirmButtonText: "ตกลง",
      });
    } catch (error: any) {
      console.error("Batch Export Failed:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: `เกิดข้อผิดพลาดระหว่างการดาวน์โหลดชุดข้อมูล: ${error.message}`,
        confirmButtonText: "ตกลง",
      });
    } finally {
      setSelectedFilter(originalFilter);
      setIsControlsOpen(originalControlsState);
      setIsBatchExporting(false);
      document.body.style.cursor = "default";
    }
  };

  const isProvinceSummary = selectedFilter === "province-summary";

  return (
    <div
      className={`${active ? "block" : "hidden"} space-y-8 pb-20 bg-slate-50 min-h-screen`}
    >
      <div ref={reportRef} className="bg-slate-50 p-4 -m-4">
        <div className="space-y-6 pt-4 px-2">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-800 leading-tight">
                รายงานประสิทธิภาพการนำจ่าย และ การโทรนัดหมายนำจ่าย EMS
                ในประเทศของที่ทำการในสังกัด ปข.6{" "}
                <span className="text-red-600">
                  ({filterDisplayNames[selectedFilter]})
                </span>
              </h2>
              <p className="text-base text-slate-500 font-medium flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-slate-400"
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
                {formatDateToISO(startDate) === formatDateToISO(endDate)
                  ? `ข้อมูลประจำวันที่ ${formatToFullThaiDate(startDate)}`
                  : `ข้อมูลตั้งแต่วันที่ ${formatToFullThaiDate(startDate)} ถึง ${formatToFullThaiDate(endDate)}`}
              </p>
            </div>

            {/* Control Buttons */}
            {!isBatchExporting && isControlsOpen && (
              <div className="flex gap-3">
                <button
                  onClick={handleBatchExport}
                  className="text-white bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all hover:scale-105"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  บันทึกรูปภาพแยก ปจ.
                </button>

                <button
                  onClick={() => setIsControlsOpen(!isControlsOpen)}
                  className="text-slate-500 hover:text-red-600 text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-slate-200"
                >
                  {isControlsOpen ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
                  <svg
                    className={`w-4 h-4 transition-transform ${isControlsOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {!isControlsOpen && !isBatchExporting && (
              <button
                onClick={() => setIsControlsOpen(true)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>
          {/* Filter Section */}
          {isControlsOpen && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-8 animate-fade-in-down">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    ช่วงเวลาข้อมูล
                  </label>
                  <div className="flex gap-3">
                    <div className="w-1/2">
                      <DatePicker
                        selected={startDate}
                        onChange={(date: Date | null) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        dateFormat="dd/MM/yyyy"
                        className="w-full rounded-xl border-slate-200 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm"
                      />
                    </div>
                    <div className="w-1/2">
                      <DatePicker
                        selected={endDate}
                        onChange={(date: Date | null) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate || undefined}
                        dateFormat="dd/MM/yyyy"
                        className="w-full rounded-xl border-slate-200 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition-all border border-blue-200 border-dashed hover:border-solid hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    อัปโหลดไฟล์ Excel
                  </button>
                </div>
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      เลือกพื้นที่ / ค้นหา
                    </label>
                    <div className="relative w-full md:w-72">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg
                          className="w-5 h-5 text-slate-400"
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
                      </span>
                      <input
                        type="text"
                        placeholder="ค้นหาที่ทำการ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-red-500 focus:border-red-500 w-full shadow-inner transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.keys(filterDisplayNames).map((filterKey) => (
                      <FilterButton
                        key={filterKey}
                        active={selectedFilter === filterKey}
                        onClick={() => setSelectedFilter(filterKey)}
                      >
                        {filterDisplayNames[filterKey]}
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  ตัวกรองประเภทบริการ
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "GROUP_EJW", "GROUP_COD", ...FILE_KEYS].map(
                    (key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedServiceFilter(key)}
                        className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${selectedServiceFilter === key ? "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}
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
          )}
          {!isLoading && summaryData.length > 0 && (
            <>
              {trendData.length > 0 && (
                <div className="animate-fade-in mb-8">
                  {/* Grid Layout for Charts: Side by Side on Large screens */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Delivery Trend Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-800">
                          แนวโน้มนำจ่ายสำเร็จ (%)
                        </h3>
                      </div>
                      <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart
                          data={trendData}
                          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorRate"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10B981"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10B981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#E2E8F0"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                            dy={10}
                          />
                          <YAxis
                            domain={[0, 110]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "none",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                return payload[0].payload.fullDate;
                              }
                              return label;
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: "10px" }} />
                          <Line
                            yAxisId={0}
                            type="monotone"
                            dataKey="successRate"
                            name="อัตราสำเร็จ (%)"
                            stroke="#059669"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Call Trend Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-800">
                          แนวโน้มโทรสำเร็จ (%)
                        </h3>
                      </div>
                      <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart
                          data={trendData}
                          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#E2E8F0"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                            dy={10}
                          />
                          <YAxis
                            domain={[0, 110]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "none",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                return payload[0].payload.fullDate;
                              }
                              return label;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="callSuccessRate"
                            name="% โทรสำเร็จ"
                            stroke="#7C3AED"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 mt-8 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-slate-800">
                    1. ภาพรวมประสิทธิภาพการนำจ่าย
                  </h3>
                </div>
                {comparisonLabel && (
                  <div className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-slate-500 font-medium">
                    📊 เปรียบเทียบกับ:{" "}
                    <span className="text-slate-700 font-bold">
                      {comparisonLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                <KPICard
                  title="อัตราความสำเร็จ"
                  value={`${summaryKPIs.successRate.toFixed(1)}%`}
                  type="success"
                  highlight
                  trend={getComparison(
                    summaryKPIs.successRate,
                    prevKPIs.successRate,
                  )}
                  comparisonLabel={comparisonLabel}
                  icon={
                    <svg
                      className="w-8 h-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                />
                <KPICard
                  title="นำจ่ายสำเร็จ (M)"
                  value={summaryKPIs.M.toLocaleString()}
                  type="success"
                  trend={getComparison(summaryKPIs.M, prevKPIs.M)}
                  comparisonLabel={comparisonLabel}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
                <KPICard
                  title="นำจ่ายไม่สำเร็จ (O)"
                  value={summaryKPIs.O.toLocaleString()}
                  type="danger"
                  inverseTrend={true}
                  trend={{
                    diff: summaryKPIs.O - prevKPIs.O,
                    direction:
                      prevKPIs.H === 0
                        ? "no-data"
                        : summaryKPIs.O < prevKPIs.O
                          ? "down" // น้อยกว่าเดิม ดี
                          : summaryKPIs.O > prevKPIs.O
                            ? "up" // มากกว่าเดิม แย่
                            : "neutral",
                  }}
                  comparisonLabel={comparisonLabel}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />
                <KPICard
                  title="เตรียมการนำจ่าย (H)"
                  value={summaryKPIs.H.toLocaleString()}
                  type="primary"
                  trend={getComparison(summaryKPIs.H, prevKPIs.H)}
                  comparisonLabel={comparisonLabel}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  }
                />
                <KPICard
                  title="รายงานผล (K)"
                  value={summaryKPIs.K.toLocaleString()}
                  trend={getComparison(summaryKPIs.K, prevKPIs.K)}
                  comparisonLabel={comparisonLabel}
                  type="primary"
                />
                <KPICard
                  title="ไม่รายงานผล (I)"
                  value={summaryKPIs.I.toLocaleString()}
                  trend={{
                    diff: summaryKPIs.I - prevKPIs.I,
                    direction:
                      prevKPIs.H === 0
                        ? "no-data"
                        : summaryKPIs.I < prevKPIs.I
                          ? "down" // ดี
                          : summaryKPIs.I > prevKPIs.I
                            ? "up" // แย่
                            : "neutral",
                  }}
                  comparisonLabel={comparisonLabel}
                  type={summaryKPIs.I > 0 ? "danger" : "success"}
                  highlight={summaryKPIs.I > 0}
                  inverseTrend={true}
                  onClick={handleShowUnreportedOffices}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  }
                />
              </div>

              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-1 h-8 bg-purple-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-slate-800">
                  2. ประสิทธิภาพการโทรนัดหมาย
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <KPICard
                  title="โทรสำเร็จ (%)"
                  value={`${currentCallSuccessRate.toFixed(1)}%`}
                  type="success"
                  highlight
                  trend={getComparison(
                    currentCallSuccessRate,
                    prevCallSuccessRate,
                  )}
                  comparisonLabel={comparisonLabel}
                />
                <KPICard
                  title="โทรสำเร็จ (ชิ้น)"
                  value={(summaryKPIs.Q || 0).toLocaleString()}
                  type="success"
                  trend={getComparison(summaryKPIs.Q || 0, prevKPIs.Q || 0)}
                  comparisonLabel={comparisonLabel}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  }
                />
                <KPICard
                  title="โทรไม่สำเร็จ (%)"
                  value={`${currentCallFailRate.toFixed(1)}%`}
                  type="danger"
                  highlight
                  inverseTrend={true}
                  trend={{
                    diff: currentCallFailRate - prevCallFailRate,
                    direction:
                      prevKPIs.H === 0
                        ? "no-data"
                        : currentCallFailRate < prevCallFailRate
                          ? "down"
                          : currentCallFailRate > prevCallFailRate
                            ? "up"
                            : "neutral",
                  }}
                  comparisonLabel={comparisonLabel}
                />
                <KPICard
                  title="โทรไม่สำเร็จ (ชิ้น)"
                  value={(summaryKPIs.S || 0).toLocaleString()}
                  type="danger"
                  inverseTrend={true}
                  trend={{
                    diff: (summaryKPIs.S || 0) - (prevKPIs.S || 0),
                    direction:
                      prevKPIs.H === 0
                        ? "no-data"
                        : (summaryKPIs.S || 0) < (prevKPIs.S || 0)
                          ? "down"
                          : (summaryKPIs.S || 0) > (prevKPIs.S || 0)
                            ? "up"
                            : "neutral",
                  }}
                  comparisonLabel={comparisonLabel}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 3h5m0 0v5m0-5l-6 6M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21l-1.498-4.493A1 1 0 005.38 3H5z"
                      />
                    </svg>
                  }
                />
              </div>

              {/* Measurement Criteria Legend - MOVED UP HERE FOR REPORT FOCUS */}
              <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-white p-4 rounded-xl border border-gray-200 shadow-sm justify-end">
                <span className="font-bold mr-2 uppercase tracking-wide text-slate-500">
                  เกณฑ์การวัดผล:
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-emerald-700">
                    ดีเยี่ยม (≥98%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-100">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span className="font-bold text-yellow-700">
                    ดี (95-97.9%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="font-bold text-rose-700">
                    ต้องปรับปรุง (&lt;95%)
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white uppercase text-xs font-bold tracking-wider leading-normal">
                        <th
                          rowSpan={2}
                          className="py-4 px-6 text-left sticky left-0 z-20 text-sm border-r border-slate-600 bg-slate-800"
                        >
                          {isProvinceSummary ? "ชื่อสังกัด" : "ที่ทำการ"}
                        </th>
                        <th
                          colSpan={5}
                          className="py-3 text-center border-r border-slate-600 bg-blue-700 text-white"
                        >
                          ประสิทธิภาพการนำจ่าย
                        </th>
                        <th
                          colSpan={4}
                          className="py-3 text-center bg-purple-700 text-white"
                        >
                          ประสิทธิภาพการโทร
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b-2 border-slate-300">
                        {[
                          { label: "เตรียมการ", key: "sumH" },
                          { label: "ไม่รายงาน", key: "sumI" },
                          { label: "รายงานผล", key: "sumK" },
                          { label: "สำเร็จ", key: "sumM" },
                          { label: "สำเร็จ (%)", key: "successRate" },
                        ].map((h, i) => (
                          <th
                            key={h.key}
                            onClick={() => handleSort(h.key as SortKey)}
                            className={`px-4 py-3 text-right cursor-pointer hover:bg-blue-100 transition-colors border-r border-slate-200 ${i === 4 ? "bg-blue-50 text-blue-900 border-r-4 border-slate-300" : "bg-blue-50/20"}`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {h.label}{" "}
                              <SortIcon columnKey={h.key as SortKey} />
                            </div>
                          </th>
                        ))}
                        {[
                          { label: "โทรสำเร็จ", key: "sumQ" },
                          { label: "โทรสำเร็จ (%)", key: "callSuccessRate" },
                          { label: "โทรไม่สำเร็จ", key: "sumS" },
                          { label: "โทรไม่สำเร็จ (%)", key: null },
                        ].map((h, i) => (
                          <th
                            key={h.label}
                            onClick={() =>
                              h.key ? handleSort(h.key as SortKey) : null
                            }
                            className={`px-4 py-3 text-right border-r border-slate-200 bg-purple-50/20 ${h.key ? "cursor-pointer hover:bg-purple-100" : ""} ${i === 1 || i === 3 ? "bg-purple-50 text-purple-900" : ""}`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {h.label}
                              {h.key && (
                                <SortIcon columnKey={h.key as SortKey} />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {summaryData.map(([compositeKey, sums], rowIndex) => {
                        const [keyE, keyF] = compositeKey.split("||");
                        const rowSuccessRate =
                          sums.sumH > 0 ? (sums.sumM / sums.sumH) * 100 : 0;
                        const callSuccessRate =
                          sums.sumH > 0 ? (sums.sumQ / sums.sumH) * 100 : 0;
                        const callFailRate =
                          sums.sumH > 0 ? (sums.sumS / sums.sumH) * 100 : 0;
                        const displaySuccessRate = parseFloat(
                          rowSuccessRate.toFixed(1),
                        );
                        const displayCallRate = parseFloat(
                          callSuccessRate.toFixed(1),
                        );
                        const getBadgeClass = (rate: number) => {
                          if (rate >= 98)
                            return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
                          if (rate >= 95)
                            return "bg-yellow-100 text-yellow-800 border-yellow-200 font-bold";
                          return "bg-rose-100 text-rose-800 border-rose-200 font-bold";
                        };

                        return (
                          <tr
                            key={compositeKey}
                            className={`group transition-colors duration-150 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-gray-50 border-b border-slate-100`}
                          >
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-slate-800 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-inherit border-r border-slate-300">
                              {isProvinceSummary ? (
                                keyF
                              ) : (
                                <button
                                  onClick={() =>
                                    handleShowDetails(compositeKey)
                                  }
                                  className="text-blue-700 hover:text-blue-900 hover:underline text-left font-bold"
                                >
                                  {keyF}
                                </button>
                              )}
                            </td>
                            {/* Delivery Columns */}
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-700 text-right tabular-nums border-r border-slate-100 bg-blue-50/10 group-hover:bg-blue-100/30">
                              {sums.sumH.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-400 text-right tabular-nums border-r border-slate-100 bg-blue-50/10 group-hover:bg-blue-100/30">
                              {sums.sumI.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-700 text-right tabular-nums border-r border-slate-100 bg-blue-50/10 group-hover:bg-blue-100/30">
                              {sums.sumK.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-slate-900 text-right tabular-nums border-r border-slate-100 bg-blue-50/10 group-hover:bg-blue-100/30">
                              {sums.sumM.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right border-r-2 border-slate-300 bg-blue-50/20 group-hover:bg-blue-100/50">
                              <div className="flex justify-end">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-xs border ${getBadgeClass(displaySuccessRate)}`}
                                >
                                  {rowSuccessRate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            {/* Call Columns */}
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-700 text-right tabular-nums border-r border-slate-100 bg-purple-50/10 group-hover:bg-purple-100/30">
                              {sums.sumQ.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right border-r border-slate-200 bg-purple-50/20 group-hover:bg-purple-100/50">
                              <div className="flex justify-end">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-xs border ${getBadgeClass(displayCallRate)}`}
                                >
                                  {callSuccessRate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-700 text-right tabular-nums border-r border-slate-100 bg-purple-50/10 group-hover:bg-purple-100/30">
                              {sums.sumS.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500 text-right tabular-nums bg-purple-50/10 group-hover:bg-purple-100/30">
                              {callFailRate.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-20 border-t-2 border-slate-900">
                      <tr>
                        <td className="px-6 py-4 text-sm uppercase text-right sticky left-0 bg-slate-800 z-30 shadow-[2px_0_5px_-2px_rgba(255,255,255,0.1)] border-r border-slate-600">
                          ยอดรวมทั้งสิ้น
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums border-r border-slate-600 bg-slate-700/50">
                          {summaryKPIs.H.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-right tabular-nums border-r border-slate-600 bg-slate-700/50">
                          {summaryKPIs.I.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums border-r border-slate-600 bg-slate-700/50">
                          {summaryKPIs.K.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums border-r border-slate-600 bg-slate-700/50">
                          {summaryKPIs.M.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right border-r border-slate-400 bg-slate-700">
                          <div className="flex justify-end">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${parseFloat(summaryKPIs.successRate.toFixed(1)) >= 98 ? "bg-emerald-500 text-white" : parseFloat(summaryKPIs.successRate.toFixed(1)) >= 95 ? "bg-yellow-400 text-black" : "bg-rose-500 text-white"}`}
                            >
                              {summaryKPIs.successRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums border-r border-slate-600 bg-slate-800/50">
                          {(summaryKPIs.Q || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right border-r border-slate-600 bg-slate-800/80">
                          <div className="flex justify-end">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${parseFloat((summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0).toFixed(1)) >= 98 ? "bg-emerald-500 text-white" : parseFloat((summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0).toFixed(1)) >= 95 ? "bg-yellow-400 text-black" : "bg-rose-500 text-white"}`}
                            >
                              {(summaryKPIs.H > 0
                                ? (summaryKPIs.Q / summaryKPIs.H) * 100
                                : 0
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums border-r border-slate-600 bg-slate-800/50">
                          {(summaryKPIs.S || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums bg-slate-800/50">
                          {(summaryKPIs.H > 0
                            ? (summaryKPIs.S / summaryKPIs.H) * 100
                            : 0
                          ).toFixed(1)}
                          %
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-red-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-slate-400 font-medium animate-pulse">
            กำลังประมวลผลข้อมูล...
          </p>
        </div>
      )}

      {/* ... (Upload Modal and Details Modal remain the same) ... */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                อัปโหลดข้อมูลใหม่
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  วันที่ของข้อมูล
                </label>
                <DatePicker
                  selected={uploadDate}
                  onChange={(date: Date | null) => setUploadDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="w-full rounded-xl border-slate-300 focus:ring-blue-500 focus:border-blue-500 py-2.5 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FILE_KEYS.map((key) => (
                  <div
                    key={key}
                    className={`border-2 border-dashed rounded-2xl p-6 transition-colors text-center ${uploadFileNames[key] ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300"}`}
                  >
                    <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">
                      {key}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => handleUploadFileChange(e, key)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="py-2 px-4 rounded-lg bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600 inline-block pointer-events-none">
                        {uploadFileNames[key]
                          ? "เปลี่ยนไฟล์"
                          : "เลือกไฟล์ Excel"}
                      </div>
                    </div>
                    {uploadFileNames[key] && (
                      <p className="text-xs text-emerald-600 mt-3 font-semibold flex items-center justify-center gap-1">
                        ✓ {uploadFileNames[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmitUpload}
                disabled={isUploading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    กำลังอัปโหลด...
                  </span>
                ) : (
                  "ยืนยันการอัปโหลด"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col transform transition-all scale-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-extrabold text-slate-800">
                {modalData.title}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b-2 border-slate-100 pb-2">
                  รายละเอียดแยกตามประเภท
                </h4>
              </div>
              <table className="min-w-full divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                      บริการ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                      COD
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                      เตรียมการ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                      สำเร็จ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                      ไม่สำเร็จ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {modalData.details.map((detail, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {detail.service}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {detail.codDisplay}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">
                        {detail.H.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-bold text-right">
                        {detail.M.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-rose-600 font-bold text-right">
                        {detail.O.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-4 text-right text-sm text-slate-800"
                    >
                      รวมทั้งหมด
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-800">
                      {modalData.summary.H.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-700">
                      {modalData.summary.M.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-rose-700">
                      {modalData.summary.O.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ... (Home and App components remain the same) ...

const Home = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen font-sans selection:bg-red-100 selection:text-red-900 bg-slate-50">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/30 transform hover:scale-105 transition-transform duration-300">
                Q
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-800 leading-tight tracking-tight">
                  QMS Summary
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* ✨ Added Credit Here ✨ */}
              <div className="hidden md:block text-xs font-medium text-slate-400 hover:text-red-400 transition-colors cursor-default">
                Made with 💖 by Megamind
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all hover:rotate-90 duration-300"
                title="ออกจากระบบ"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <DashboardView active={true} />
      </main>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
          <div className="text-slate-400 font-medium animate-pulse">
            กำลังตรวจสอบสิทธิ์...
          </div>
        </div>
      </div>
    );
  }

  if (!session) return <LoginView />;
  return <Home />;
}
