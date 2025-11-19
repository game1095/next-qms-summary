"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// ######################################################################
//   [Types และ Interfaces]
// ######################################################################

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

interface DeliveryNoteRow {
  id?: number;
  report_date: string;
  postal_code: string;
  office_name: string;
  total_notes: number;
  notes_data: { [key: string]: string };
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

interface ReportTableRow {
  postal_code: string;
  office_name: string;
  is_reported: boolean;
  status: "reported" | "not_reported" | "no_failure";
  report_date: string | null;
  total_notes: number;
  notes_data_aggregated: { [key: string]: number };
}

interface ModalDetailData {
  office_name: string;
  total_notes: number;
  notes_data: { [key: string]: number };
}

interface ViewProps {
  active: boolean;
}

interface NotesSummary {
  data: { [key: string]: number };
  total: number;
}

interface PieChartProps {
  notesSummary: NotesSummary;
  reasonMap: Map<string, string>;
}

const REPORT_REASONS = [
  { key: "0", label: "ออกใบแจ้ง" },
  { key: "1", label: "จ่าหน้าไม่ชัดเจน" },
  { key: "2", label: "ไม่มีเลขบ้านตามจ่าหน้า" },
  { key: "3", label: "ผู้รับปฏิเสธการรับ" },
  { key: "4", label: "ไม่มีผู้รับตามจ่าหน้า" },
  { key: "5", label: "ไม่มารับตามกำหนด" },
  { key: "7", label: "ย้าย/ไม่ทราบที่อยู่ใหม่" },
  { key: "8", label: "บ้านปิด" },
  { key: "A1", label: "สิ่งของถึงที่ทำการปลายทาง คาดว่าจะได้รับในวันถัดไป" },
  { key: "A2", label: "สิ่งของถึงที่ทำการปลายทาง คาดว่าจะได้รับใน 1 - 2 วัน" },
  { key: "A3", label: "สิ่งของถึงที่ทำการปลายทาง คาดว่าจะได้รับใน 3 - 4 วัน" },
  { key: "A4", label: "สิ่งของถึงที่ทำการปลายทาง คาดว่าจะได้รับใน 5 - 6 วัน" },
  { key: "C", label: "ส่วนราชการ/บริษัท หยุด" },
  { key: "F", label: "รอจ่าย ณ ที่ทำการ" },
  { key: "G", label: "รอจ่าย ณ ตู้ไปรษณีย์เช่า (ออกใบแจ้ง)" },
  { key: "I", label: "โทรศัพท์ติดต่อผู้รับไม่ได้/ผู้รับไม่รับสาย" },
  { key: "J", label: "ขอรับเองที่ไปรษณีย์" },
  { key: "K", label: "ส่งคืนต้นทาง" },
  { key: "M", label: "ผู้ฝากส่งกำหนดวัน/เวลา นำจ่าย" },
  { key: "O", label: "โทรศัพท์ติดต่อผู้รับ/ผู้ฝากแล้ว ให้เก็บรอจ่าย" },
  { key: "Q", label: "อยู่ระหว่างปรับปรุงข้อมูลสิ่งของเก็บเงินปลายทาง" },
];

const reasonLabelMap = new Map(REPORT_REASONS.map((r) => [r.key, r.label]));

const initialReportFormData = REPORT_REASONS.reduce((acc, reason) => {
  acc[reason.key] = "";
  return acc;
}, {} as { [key: string]: string });

const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

// ######################################################################
//   [Filter Definitions]
// ######################################################################
const nakhonSawanCodes = [
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
  "60250",
  "60260",
  "428",
];
const nakhonSawanSet = new Set(nakhonSawanCodes);
const uthaiThaniCodes = [
  "61000",
  "61110",
  "61120",
  "61130",
  "61140",
  "61150",
  "61160",
  "61170",
  "61180",
];
const uthaiThaniSet = new Set(uthaiThaniCodes);
const kamphaengPhetCodes = [
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
];
const kamphaengPhetSet = new Set(kamphaengPhetCodes);
const takCodes = [
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
];
const takSet = new Set(takCodes);
const sukhothaiCodes = [
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
];
const sukhothaiSet = new Set(sukhothaiCodes);
const phitsanulokCodes = [
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
];
const phitsanulokSet = new Set(phitsanulokCodes);
const phichitCodes = [
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
];
const phichitSet = new Set(phichitCodes);
const phetchabunCodes = [
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
];
const phetchabunSet = new Set(phetchabunCodes);
const spNakhonSawanCodes = ["60010"];
const spNakhonSawanSet = new Set(spNakhonSawanCodes);
const spPhitsanulokCodes = ["65010"];
const spPhitsanulokSet = new Set(spPhitsanulokCodes);

const filterDisplayNames: { [key: string]: string } = {
  all: "ปข.6 (ทุกที่ทำการ)",
  "province-summary": "ปข.6 (สรุปตาม ปจ.)",
  "nakhon-sawan": "ปจ.นครสวรรค์",
  "uthai-thani": "ปจ.อุทัยธานี",
  "kamphaeng-phet": "ปจ.กำแพงเพชร",
  tak: "ปจ.ตาก",
  sukhothai: "ปจ.สุโขทัย",
  phitsanulok: "ปจ.พิษณุโลก",
  phichit: "ปจ.พิจิตร",
  phetchabun: "ปจ.เพชรบูรณ์",
  "sp-nakhon-sawan": "ศป.นครสวรรค์",
  "sp-phitsanulok": "ศป.พิษณุโลก",
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

const CHART_COLORS = [
  "#DC2626",
  "#EA580C",
  "#F59E0B",
  "#16A34A",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#64748B",
  "#F97316",
  "#EAB308",
  "#84CC16",
  "#10B981",
  "#06B6D4",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#78716C",
  "#EF4444",
  "#3B82F6",
  "#8B5CF6",
];

const NotesPieChart = ({ notesSummary, reasonMap }: PieChartProps) => {
  const chartDataEntries = Object.entries(notesSummary.data)
    .map(([key, value]) => ({
      key,
      value,
      label: reasonMap.get(key) || "Unknown",
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const data = {
    labels: chartDataEntries.map((item) => `${item.key} - ${item.label}`),
    datasets: [
      {
        label: "จำนวน",
        data: chartDataEntries.map((item) => item.value),
        backgroundColor: CHART_COLORS.slice(0, chartDataEntries.length),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const percentage = (
              (value / (notesSummary.total || 1)) *
              100
            ).toFixed(1);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
  };

  return <Pie data={data} options={options} />;
};

// ######################################################################
//   UI Components
// ######################################################################

const FilterButton = ({ active, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border ${
      active
        ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-200"
        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
    }`}
  >
    {children}
  </button>
);

// --- New Modern KPI Card ---
const KPICard = ({
  title,
  value,
  subValue,
  type = "neutral",
  icon,
  highlight = false,
}: any) => {
  const styles: any = {
    success: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
    },
    danger: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      iconBg: "bg-rose-100",
      iconText: "text-rose-600",
    },
    primary: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },
    warning: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      iconBg: "bg-orange-100",
      iconText: "text-orange-600",
    },
    neutral: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      iconBg: "bg-gray-100",
      iconText: "text-gray-500",
    },
  };

  const activeStyle = styles[type] || styles.neutral;

  if (highlight) {
    // Gradient Card for "Highlighted" KPIs
    const gradientClass =
      type === "success"
        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200"
        : type === "danger"
        ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-200"
        : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200";

    return (
      <div
        className={`${gradientClass} rounded-2xl p-6 text-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
                {title}
              </h3>
              <p className="text-4xl font-bold tracking-tight">{value}</p>
              {subValue && (
                <p className="text-sm mt-1 opacity-90 font-medium">
                  {subValue}
                </p>
              )}
            </div>
            {icon && (
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                {icon}
              </div>
            )}
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
      </div>
    );
  }

  // Standard Card
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
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
      </div>
      {icon && (
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeStyle.iconBg} ${activeStyle.iconText} group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
      )}
    </div>
  );
};

// ######################################################################
//   Dashboard View
// ######################################################################

const DashboardView = ({ active }: ViewProps) => {
  const [supabaseData, setSupabaseData] = useState<DeliveryDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState<Date | null>(null);
  const [reportFormData, setReportFormData] = useState(initialReportFormData);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const getProvinceKey = (postalCode: string): string => {
    const code = String(postalCode);
    if (nakhonSawanSet.has(code)) return "nakhon-sawan";
    if (uthaiThaniSet.has(code)) return "uthai-thani";
    if (kamphaengPhetSet.has(code)) return "kamphaeng-phet";
    if (takSet.has(code)) return "tak";
    if (sukhothaiSet.has(code)) return "sukhothai";
    if (phitsanulokSet.has(code)) return "phitsanulok";
    if (phichitSet.has(code)) return "phichit";
    if (phetchabunSet.has(code)) return "phetchabun";
    if (spNakhonSawanSet.has(code)) return "sp-nakhon-sawan";
    if (spPhitsanulokSet.has(code)) return "sp-phitsanulok";
    return "other";
  };

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setStartDate(new Date(yesterday));
    setEndDate(new Date(yesterday));
    setReportDate(new Date(yesterday));
    setUploadDate(new Date(yesterday));
  }, []);

  const fetchData = async (start: Date | null, end: Date | null) => {
    setIsLoading(true);
    setSupabaseData([]);
    if (!start || !end) {
      setIsLoading(false);
      return;
    }
    const isoStartDate = formatDateToISO(start);
    const isoEndDate = formatDateToISO(end);

    const { data, error } = await supabase
      .from("delivery_data")
      .select("*")
      .gte("report_date", isoStartDate)
      .lte("report_date", isoEndDate);

    if (error) {
      console.error("Error fetching delivery data:", error);
      alert("ไม่สามารถดึงข้อมูลหลักได้: " + error.message);
    } else {
      setSupabaseData(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (active) {
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate, active]);

  const handleUploadFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileKey: string
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
        .filter(
          (item) =>
            item.colE !== null &&
            item.colE !== undefined &&
            item.colE !== "" &&
            item.colF !== null &&
            item.colF !== undefined &&
            item.colF !== ""
        );
      setUploadFilesData((prev) => ({ ...prev, [fileKey]: filteredData }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmitUpload = async () => {
    const fileKeys = Object.keys(uploadFilesData);
    if (fileKeys.length === 0) {
      alert("กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์");
      return;
    }

    setIsUploading(true);
    try {
      const reportDate = formatDateToISO(uploadDate);
      if (!reportDate) throw new Error("กรุณาเลือกวันที่อัปโหลด");

      const { count, error: countError } = await supabase
        .from("delivery_data")
        .select("id", { count: "exact", head: true })
        .eq("report_date", reportDate);
      if (countError)
        throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้: " + countError.message);
      if ((count ?? 0) > 0) {
        alert(
          `พบข้อมูลสำหรับวันที่ ${formatToFullThaiDate(
            uploadDate
          )} อยู่ในระบบแล้ว\n(ระบบไม่อนุญาตให้อัปโหลดทับ) กรุณาเลือกวันอื่น`
        );
        setIsUploading(false);
        return;
      }

      const rowsToInsert: Omit<DeliveryDataRow, "id">[] = [];
      Object.entries(uploadFilesData).forEach(([fileKey, fileData]) => {
        fileData.forEach((item: any) => {
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
        });
      });

      if (rowsToInsert.length === 0) throw new Error("ไม่พบข้อมูลที่จะอัปโหลด");
      const { error: insertError } = await supabase
        .from("delivery_data")
        .insert(rowsToInsert);
      if (insertError)
        throw new Error("ไม่สามารถอัปโหลดข้อมูลได้: " + insertError.message);

      alert(
        `อัปโหลดข้อมูลสำหรับวันที่ ${formatToFullThaiDate(
          uploadDate
        )} สำเร็จ! (${rowsToInsert.length} รายการ)`
      );
      setIsUploadModalOpen(false);
      setUploadFilesData({});
      setUploadFileNames({});
      setStartDate(uploadDate);
      setEndDate(uploadDate);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const aggregatedData = useMemo((): [string, AggregatedSums][] => {
    const summary = new Map<string, AggregatedSums>();
    const isServiceMatch = (fileKey: string, filter: string) => {
      if (filter === "all") return true;
      if (filter === "GROUP_EJW")
        return ["E(E)", "E(J)", "E(W)"].includes(fileKey);
      if (filter === "GROUP_COD") return ["E-BCOD", "E-RCOD"].includes(fileKey);
      return fileKey === filter;
    };

    if (selectedFilter === "province-summary") {
      supabaseData.forEach((item: DeliveryDataRow) => {
        if (!isServiceMatch(item.file_key, selectedServiceFilter)) return;
        const provinceKey = getProvinceKey(item.cole);
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

    let filterSet: Set<string> | null = null;
    if (selectedFilter === "nakhon-sawan") filterSet = nakhonSawanSet;
    else if (selectedFilter === "uthai-thani") filterSet = uthaiThaniSet;
    else if (selectedFilter === "kamphaeng-phet") filterSet = kamphaengPhetSet;
    else if (selectedFilter === "tak") filterSet = takSet;
    else if (selectedFilter === "sukhothai") filterSet = sukhothaiSet;
    else if (selectedFilter === "phitsanulok") filterSet = phitsanulokSet;
    else if (selectedFilter === "phichit") filterSet = phichitSet;
    else if (selectedFilter === "phetchabun") filterSet = phetchabunSet;
    else if (selectedFilter === "sp-nakhon-sawan") filterSet = spNakhonSawanSet;
    else if (selectedFilter === "sp-phitsanulok") filterSet = spPhitsanulokSet;

    supabaseData.forEach((item: DeliveryDataRow) => {
      if (!isServiceMatch(item.file_key, selectedServiceFilter)) return;
      if (!filterSet || filterSet.has(String(item.cole))) {
        const keyE = String(item.cole);
        const keyF = String(item.colf);
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
  }, [supabaseData, selectedFilter, selectedServiceFilter]);

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
      const rateA = sumsA.sumH > 0 ? sumsA.sumM / sumsA.sumH : 0;
      const rateB = sumsB.sumH > 0 ? sumsB.sumM / sumsB.sumH : 0;
      return rateA - rateB;
    });
    return filteredArray;
  }, [aggregatedData, searchTerm]);

  const summaryKPIs = useMemo(() => {
    const totals = { H: 0, I: 0, K: 0, M: 0, O: 0, Q: 0, S: 0 };
    if (!summaryData || summaryData.length === 0)
      return { ...totals, successRate: 0, failureRate: 0 };
    summaryData.forEach(([, sums]) => {
      totals.H += sums.sumH;
      totals.I += sums.sumI;
      totals.K += sums.sumK;
      totals.M += sums.sumM;
      totals.O += sums.sumO;
      totals.Q += sums.sumQ;
      totals.S += sums.sumS;
    });
    const successRate = totals.H > 0 ? (totals.M / totals.H) * 100 : 0;
    const failureRate = totals.H > 0 ? (totals.O / totals.H) * 100 : 0;
    return { ...totals, successRate, failureRate };
  }, [summaryData]);

  const reportTotalSum = useMemo(() => {
    const values = Object.values(reportFormData);
    return values.reduce((acc, value) => acc + (parseInt(value) || 0), 0);
  }, [reportFormData]);

  const isReportSaveDisabled = useMemo(() => {
    if (isSubmittingReport) return true;
    if (reportTotalSum === 0) return true;
    if (reportTotalSum !== modalData.summary.O) return true;
    return false;
  }, [isSubmittingReport, reportTotalSum, modalData.summary.O]);

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
      }
    );
    setModalData({
      title: title,
      details: detailsArray,
      summary: totalSummary,
    });
    setIsModalOpen(true);
  };

  const handleOpenReportModal = () => {
    setReportDate(endDate);
    setIsReportModalOpen(true);
  };
  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportFormData(initialReportFormData);
  };
  const handleReportFormChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) => {
    const { value } = e.target;
    if (value === "" || /^[0-9\b]+$/.test(value)) {
      setReportFormData((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmitReport = async () => {
    if (reportTotalSum === 0) {
      alert("กรุณากรอกข้อมูลหมายเหตุอย่างน้อย 1 ช่อง");
      return;
    }
    if (reportTotalSum !== modalData.summary.O) {
      alert(
        `ยอดรวมที่กรอก (${reportTotalSum}) ไม่ตรงกับยอดไม่สำเร็จ (${modalData.summary.O})`
      );
      return;
    }
    setIsSubmittingReport(true);
    try {
      const isoDate = formatDateToISO(reportDate);
      if (!isoDate) throw new Error("กรุณาเลือกวันที่");
      const [prefix, fullTitle] = modalData.title.split(": ");
      const [postalCode, officeName] = fullTitle.split(" - ");

      const { data: existingReport, error: checkError } = await supabase
        .from("delivery_notes")
        .select("id")
        .eq("report_date", isoDate)
        .eq("postal_code", postalCode)
        .maybeSingle();
      if (checkError)
        throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้: " + checkError.message);
      if (existingReport) {
        alert(
          `พบรายงานหมายเหตุสำหรับ ${officeName} ในวันที่ ${formatToFullThaiDate(
            reportDate
          )} อยู่ในระบบแล้ว`
        );
        setIsSubmittingReport(false);
        return;
      }

      const dataToInsert = {
        report_date: isoDate,
        postal_code: postalCode,
        office_name: officeName,
        notes_data: reportFormData,
        total_notes: reportTotalSum,
      };
      const { error: insertError } = await supabase
        .from("delivery_notes")
        .insert(dataToInsert);
      if (insertError) throw insertError;
      alert(`บันทึกข้อมูลหมายเหตุสำเร็จ!`);
      handleCloseReportModal();
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาด: " + (error as Error).message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const isProvinceSummary = selectedFilter === "province-summary";

  return (
    <div className={`${active ? "block" : "hidden"} space-y-8 pb-20`}>
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              รายงานประสิทธิภาพการนำจ่าย และ การโทรนัดหมายนำจ่าย EMS
              ในประเทศของที่ทำการในสังกัด {filterDisplayNames[selectedFilter]}
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              {formatDateToISO(startDate) === formatDateToISO(endDate)
                ? `ประจำวันที่ ${formatToFullThaiDate(startDate)}`
                : `ประจำวันที่ ${formatToFullThaiDate(
                    startDate
                  )} ถึง ${formatToFullThaiDate(endDate)}`}
            </p>
          </div>
          <button
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium underline whitespace-nowrap ml-4"
          >
            {isControlsOpen ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
          </button>
        </div>

        {/* Control Panel */}
        {isControlsOpen && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  ช่วงเวลาข้อมูล
                </label>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      dateFormat="dd/MM/yyyy"
                      className="w-full rounded-lg border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
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
                      className="w-full rounded-lg border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full mt-2 py-2 px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200 dashed"
                >
                  + อัปโหลดไฟล์ Excel
                </button>
              </div>

              <div className="lg:col-span-3 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    สังกัด และ พื้นที่
                  </label>
                  <input
                    type="text"
                    placeholder="ค้นหาที่ทำการ / รหัสไปรษณีย์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-lg border-gray-200 bg-gray-50 text-sm focus:ring-red-500 focus:border-red-500 w-full md:w-64"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
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

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                ประเภทบริการ
              </label>
              <div className="flex flex-wrap gap-2">
                {["all", "GROUP_EJW", "GROUP_COD", ...FILE_KEYS].map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedServiceFilter(key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedServiceFilter === key
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
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
        )}
      </div>

      {/* KPI Grid & Table */}
      {!isLoading && summaryData.length > 0 && (
        <>
          {/* Section 1: Delivery Efficiency */}
          <h3 className="text-lg font-bold text-gray-700 mb-4">
            1. ประสิทธิภาพการนำจ่าย
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Big Cards */}
            <KPICard
              title="อัตราความสำเร็จ"
              value={`${summaryKPIs.successRate.toFixed(1)}%`}
              type="success"
              highlight
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
              title="สำเร็จ (M)"
              value={summaryKPIs.M.toLocaleString()}
              type="success"
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
              title="ไม่สำเร็จ (O)"
              value={summaryKPIs.O.toLocaleString()}
              type="danger"
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

            {/* Smaller Cards */}
            <KPICard
              title="เตรียมการ (H)"
              value={summaryKPIs.H.toLocaleString()}
              type="primary"
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
              type="primary"
            />
            <KPICard
              title="ไม่รายงานผล (I)"
              value={summaryKPIs.I.toLocaleString()}
              type="warning"
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

          {/* Section 2: Call Efficiency */}
          <h3 className="text-lg font-bold text-gray-700 mb-4">
            2. ประสิทธิภาพการโทร
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="โทรสำเร็จ (%)"
              value={`${(summaryKPIs.H > 0
                ? (summaryKPIs.Q / summaryKPIs.H) * 100
                : 0
              ).toFixed(1)}%`}
              type="success"
              highlight
            />
            <KPICard
              title="โทรสำเร็จ (ชิ้น)"
              value={(summaryKPIs.Q || 0).toLocaleString()}
              type="success"
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
              value={`${(summaryKPIs.H > 0
                ? (summaryKPIs.S / summaryKPIs.H) * 100
                : 0
              ).toFixed(1)}%`}
              type="danger"
              highlight
            />
            <KPICard
              title="โทรไม่สำเร็จ (ชิ้น)"
              value={(summaryKPIs.S || 0).toLocaleString()}
              type="danger"
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

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                    <th
                      rowSpan={2}
                      className="py-3 px-6 text-left border-b border-gray-200 bg-gray-100 sticky left-0 z-20 text-lg"
                    >
                      {isProvinceSummary ? "ชื่อสังกัด" : "ที่ทำการ"}
                    </th>
                    <th
                      colSpan={7}
                      className="py-2 text-center border-b border-gray-300 bg-blue-50 text-blue-800 font-bold border-r-4 border-gray-300 text-lg"
                    >
                      ประสิทธิภาพการนำจ่าย
                    </th>
                    <th
                      colSpan={4}
                      className="py-2 text-center border-b border-gray-300 bg-purple-50 text-purple-800 font-bold text-lg"
                    >
                      ประสิทธิภาพการโทร
                    </th>
                  </tr>
                  <tr className="bg-gray-50 text-gray-600 text-base uppercase font-semibold">
                    {/* Delivery Columns */}
                    {[
                      "เตรียมการ (ชิ้น)",
                      "ไม่รายงาน (ชิ้น)",
                      "รายงานผล (ชิ้น)",
                      "สำเร็จ (ชิ้น)",
                      "สำเร็จ (%)",
                      "ไม่สำเร็จ (ชิ้น)",
                      "ไม่สำเร็จ (%)",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-right border-b border-gray-200 ${
                          i === 6 ? "border-r-4 border-gray-300" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                    {/* Call Columns */}
                    {[
                      "โทรสำเร็จ (ชิ้น)",
                      "โทรสำเร็จ (%)",
                      "โทรไม่สำเร็จ (ชิ้น)",
                      "โทรไม่สำเร็จ (%)",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-right border-b border-gray-200"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {summaryData.map(([compositeKey, sums]) => {
                    const [keyE, keyF] = compositeKey.split("||");
                    const rowSuccessRate =
                      sums.sumH > 0 ? (sums.sumM / sums.sumH) * 100 : 0;
                    const rowFailureRate =
                      sums.sumH > 0 ? (sums.sumO / sums.sumH) * 100 : 0;
                    const callSuccessRate =
                      sums.sumH > 0 ? (sums.sumQ / sums.sumH) * 100 : 0;
                    const callFailRate =
                      sums.sumH > 0 ? (sums.sumS / sums.sumH) * 100 : 0;

                    return (
                      <tr
                        key={compositeKey}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">
                          {isProvinceSummary ? (
                            keyF
                          ) : (
                            <button
                              onClick={() => handleShowDetails(compositeKey)}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                            >
                              {keyF}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {sums.sumH.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {sums.sumI.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {sums.sumK.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-500 text-right">
                          {sums.sumM.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-base font-medium ${
                                rowSuccessRate >= 98
                                  ? "bg-green-100 text-green-800"
                                  : rowSuccessRate >= 95
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {rowSuccessRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {sums.sumO.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right border-r-4 border-gray-300">
                          {rowFailureRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {sums.sumQ.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-base font-medium ${
                                callSuccessRate >= 50
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {callSuccessRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {sums.sumS.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-right">
                          {callFailRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                  <tr>
                    <td className="px-6 py-4 text-base text-gray-900 uppercase text-right">
                      ยอดรวม
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right">
                      {summaryKPIs.H.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right">
                      {summaryKPIs.I.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right">
                      {summaryKPIs.K.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right">
                      {summaryKPIs.M.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-base font-bold ${
                            summaryKPIs.successRate >= 98
                              ? "bg-green-100 text-green-800"
                              : summaryKPIs.successRate >= 95
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {summaryKPIs.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right">
                      {summaryKPIs.O.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right border-r-4 border-gray-300">
                      {summaryKPIs.failureRate.toFixed(1)}%
                    </td>
                    {(() => {
                      const footerCallSuccessRate =
                        summaryKPIs.H > 0
                          ? (summaryKPIs.Q / summaryKPIs.H) * 100
                          : 0;
                      const footerCallFailRate =
                        summaryKPIs.H > 0
                          ? (summaryKPIs.S / summaryKPIs.H) * 100
                          : 0;
                      return (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 text-right">
                            {(summaryKPIs.Q || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-base font-bold ${
                                  footerCallSuccessRate >= 50
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {footerCallSuccessRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {(summaryKPIs.S || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {footerCallFailRate.toFixed(1)}%
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {isLoading && (
        <div className="py-20 text-center text-gray-400 animate-pulse">
          กำลังประมวลผลข้อมูล...
        </div>
      )}

      {/* Modal Components: Upload, Detail, Report Form */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                อัปโหลดข้อมูลใหม่
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่ของข้อมูล
                </label>
                <DatePicker
                  selected={uploadDate}
                  onChange={(date: Date | null) => setUploadDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FILE_KEYS.map((key) => (
                  <div
                    key={key}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-white transition-colors"
                  >
                    <label className="block text-xs font-bold text-gray-500 mb-2">
                      {key}
                    </label>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => handleUploadFileChange(e, key)}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadFileNames[key] && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {uploadFileNames[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmitUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {isUploading ? "กำลังอัปโหลด..." : "ยืนยันการอัปโหลด"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {modalData.title}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  รายละเอียดแยกตามประเภท
                </h4>
                <button
                  onClick={handleOpenReportModal}
                  className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition-colors border border-red-100"
                >
                  แจ้งสาเหตุที่ไม่สำเร็จ
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                      บริการ
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                      COD
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">
                      เตรียมการ
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">
                      สำเร็จ
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">
                      ไม่สำเร็จ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {modalData.details.map((detail, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {detail.service}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {detail.codDisplay}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {detail.H.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-green-600 font-medium text-right">
                        {detail.M.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-red-600 font-medium text-right">
                        {detail.O.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-right text-sm">
                      รวม
                    </td>
                    <td className="px-4 py-2 text-right text-sm">
                      {modalData.summary.H.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-green-700">
                      {modalData.summary.M.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-red-700">
                      {modalData.summary.O.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-red-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                บันทึกรายงานหมายเหตุนำจ่าย
              </h3>
              <p className="text-sm text-gray-500 mt-1">{modalData.title}</p>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORT_REASONS.map((reason) => (
                  <div key={reason.key}>
                    <label
                      className="block text-xs font-medium text-gray-500 mb-1 truncate"
                      title={reason.label}
                    >
                      {reason.key} - {reason.label}
                    </label>
                    <input
                      type="number"
                      value={reportFormData[reason.key]}
                      onChange={(e) => handleReportFormChange(e, reason.key)}
                      className="w-full rounded-md border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <div className="text-sm">
                ยอดรวมที่กรอก:{" "}
                <span
                  className={`font-bold ${
                    reportTotalSum === modalData.summary.O
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {reportTotalSum}
                </span>{" "}
                / {modalData.summary.O}
              </div>
              <div className="space-x-3">
                <button
                  onClick={handleCloseReportModal}
                  className="text-gray-600 text-sm font-medium hover:text-gray-800"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={isReportSaveDisabled}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// ... (วางต่อท้าย DashboardView ก่อนถึง export default function Home)

// ######################################################################
//   Notes Report View (Modernized)
// ######################################################################

const NotesReportView = ({ active }: ViewProps) => {
  const [allTableData, setAllTableData] = useState<ReportTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalDetailData, setModalDetailData] =
    useState<ModalDetailData | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [notesSummary, setNotesSummary] = useState<NotesSummary>({
    data: {},
    total: 0,
  });
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });

  const fetchNotes = async (date: Date | null, filter: string) => {
    if (!date) return;
    setIsLoading(true);
    setAllTableData([]);
    setNotesSummary({ data: {}, total: 0 });
    const isoDate = formatDateToISO(date);

    try {
      const { data: notesData, error: notesError } = await supabase
        .from("delivery_notes")
        .select("*")
        .eq("report_date", isoDate);
      if (notesError) throw notesError;
      const typedNotesData = (notesData as DeliveryNoteRow[]) || [];

      const { data: officesData, error: officesError } = await supabase
        .from("delivery_data")
        .select("cole, colf, valueo")
        .eq("report_date", isoDate);
      if (officesError) throw officesError;
      const typedOfficesData =
        (officesData as { cole: string; colf: string; valueo: number }[]) || [];

      let filterSet: Set<string> | null = null;
      if (filter === "nakhon-sawan") filterSet = nakhonSawanSet;
      else if (filter === "uthai-thani") filterSet = uthaiThaniSet;
      else if (filter === "kamphaeng-phet") filterSet = kamphaengPhetSet;
      else if (filter === "tak") filterSet = takSet;
      else if (filter === "sukhothai") filterSet = sukhothaiSet;
      else if (filter === "phitsanulok") filterSet = phitsanulokSet;
      else if (filter === "phichit") filterSet = phichitSet;
      else if (filter === "phetchabun") filterSet = phetchabunSet;
      else if (filter === "sp-nakhon-sawan") filterSet = spNakhonSawanSet;
      else if (filter === "sp-phitsanulok") filterSet = spPhitsanulokSet;

      const uniqueOfficesMap = new Map<string, string>();
      const officeFailureMap = new Map<string, number>();

      typedOfficesData.forEach((item) => {
        const pCode = String(item.cole);
        if (filterSet && !filterSet.has(pCode)) return;
        if (!uniqueOfficesMap.has(pCode))
          uniqueOfficesMap.set(pCode, item.colf);
        const currentO = officeFailureMap.get(pCode) || 0;
        officeFailureMap.set(pCode, currentO + (item.valueo || 0));
      });

      type AggNote = {
        total_notes: number;
        notes_data: { [key: string]: number };
        last_report_date: string;
      };
      const aggregatedNotesMap = new Map<string, AggNote>();
      const grandTotalSummary = REPORT_REASONS.reduce(
        (acc, r) => ({ ...acc, [r.key]: 0 }),
        {} as { [key: string]: number }
      );
      let grandTotalCount = 0;

      typedNotesData.forEach((note) => {
        if (!uniqueOfficesMap.has(note.postal_code)) return;
        const currentAgg = aggregatedNotesMap.get(note.postal_code);
        if (!currentAgg) {
          const notes_data: { [key: string]: number } = {};
          REPORT_REASONS.forEach((reason) => {
            notes_data[reason.key] =
              parseInt(note.notes_data[reason.key] || "0") || 0;
          });
          aggregatedNotesMap.set(note.postal_code, {
            total_notes: note.total_notes,
            notes_data: notes_data,
            last_report_date: note.report_date,
          });
        }
        Object.entries(note.notes_data).forEach(([key, value]) => {
          if (grandTotalSummary.hasOwnProperty(key)) {
            const numValue = parseInt(value) || 0;
            grandTotalSummary[key] += numValue;
            grandTotalCount += numValue;
          }
        });
      });
      setNotesSummary({ data: grandTotalSummary, total: grandTotalCount });

      const finalTableData: ReportTableRow[] = [];
      uniqueOfficesMap.forEach((office_name, postal_code) => {
        const aggregatedReport = aggregatedNotesMap.get(postal_code);
        const sumO = officeFailureMap.get(postal_code) || 0;
        const is_reported = !!aggregatedReport;
        let status: "reported" | "not_reported" | "no_failure";
        if (is_reported) status = "reported";
        else if (sumO > 0) status = "not_reported";
        else status = "no_failure";

        const notes_data_aggregated: { [key: string]: number } = {};
        REPORT_REASONS.forEach((reason) => {
          notes_data_aggregated[reason.key] = aggregatedReport
            ? aggregatedReport.notes_data[reason.key] || 0
            : 0;
        });
        finalTableData.push({
          postal_code,
          office_name,
          is_reported,
          status,
          report_date: aggregatedReport
            ? aggregatedReport.last_report_date
            : null,
          total_notes: aggregatedReport ? aggregatedReport.total_notes : 0,
          notes_data_aggregated,
        });
      });

      finalTableData.sort((a, b) => {
        const getScore = (s: string) =>
          s === "not_reported" ? 1 : s === "reported" ? 2 : 3;
        const scoreA = getScore(a.status);
        const scoreB = getScore(b.status);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.postal_code.localeCompare(b.postal_code);
      });
      setAllTableData(finalTableData);
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถดึงข้อมูลได้: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (active) fetchNotes(selectedDate, selectedFilter);
  }, [active, selectedDate, selectedFilter]);

  const filteredTableData = useMemo(() => {
    if (searchTerm.trim() === "") return allTableData;
    const lower = searchTerm.toLowerCase().trim();
    return allTableData.filter(
      (row) =>
        row.office_name.toLowerCase().includes(lower) ||
        row.postal_code.includes(lower)
    );
  }, [allTableData, searchTerm]);

  const notesKPIs = useMemo(() => {
    const totalOffices = allTableData.length;
    if (totalOffices === 0)
      return {
        totalOffices: 0,
        reportedOffices: 0,
        notReportedOffices: 0,
        totalRequiredToReport: 0,
        complianceRate: 0,
      };
    const reportedOffices = allTableData.filter(
      (office) => office.status === "reported"
    ).length;
    const notReportedOffices = allTableData.filter(
      (office) => office.status === "not_reported"
    ).length;
    const totalRequiredToReport = reportedOffices + notReportedOffices;
    const complianceRate =
      totalRequiredToReport > 0
        ? (reportedOffices / totalRequiredToReport) * 100
        : 100;
    return {
      totalOffices,
      reportedOffices,
      notReportedOffices,
      totalRequiredToReport,
      complianceRate,
    };
  }, [allTableData]);

  const handleShowReportDetails = (data: ReportTableRow) => {
    setModalDetailData({
      office_name: data.office_name,
      total_notes: data.total_notes,
      notes_data: data.notes_data_aggregated,
    });
    setIsDetailModalOpen(true);
  };
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setModalDetailData(null);
  };

  return (
    <div className={`${active ? "block" : "hidden"} space-y-8 pb-20`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            สถานะการรายงานหมายเหตุ
          </h2>
          <p className="text-gray-500 mt-1">
            ข้อมูลวันที่ {formatToFullThaiDate(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd/MM/yyyy"
            className="border-0 bg-transparent text-sm font-medium focus:ring-0 w-32"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <FilterButton
          active={selectedFilter === "all"}
          onClick={() => setSelectedFilter("all")}
        >
          แสดงทั้งหมด
        </FilterButton>
        {Object.keys(filterDisplayNames)
          .filter((k) => k !== "all" && k !== "province-summary")
          .map((k) => (
            <FilterButton
              key={k}
              active={selectedFilter === k}
              onClick={() => setSelectedFilter(k)}
            >
              {filterDisplayNames[k]}
            </FilterButton>
          ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="ค้นหาที่ทำการ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border-gray-200 pl-10 py-3 shadow-sm focus:ring-red-500 focus:border-red-500"
        />
        <svg
          className="w-5 h-5 text-gray-400 absolute left-3 top-3.5"
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
      </div>

      {/* KPI Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="อัตราการรายงาน"
            value={`${notesKPIs.complianceRate.toFixed(1)}%`}
            type={notesKPIs.complianceRate >= 90 ? "success" : "danger"}
            highlight
          />
          <KPICard
            title="รายงานแล้ว"
            value={notesKPIs.reportedOffices.toLocaleString()}
            subValue={`/ ${notesKPIs.totalRequiredToReport}`}
            type="success"
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
            title="ยังไม่รายงาน"
            value={notesKPIs.notReportedOffices.toLocaleString()}
            type="danger"
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
        </div>
      )}

      {/* Chart Section */}
      {!isLoading && notesSummary.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-xl p-6 border border-gray-200 shadow-sm h-80">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              สัดส่วนสาเหตุ
            </h3>
            <div className="h-60">
              <NotesPieChart
                notesSummary={notesSummary}
                reasonMap={reasonLabelMap}
              />
            </div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm h-80 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              อันดับสาเหตุสูงสุด
            </h3>
            <div className="space-y-3">
              {Object.entries(notesSummary.data)
                .sort(([, a], [, b]) => b - a)
                .filter(([, val]) => val > 0)
                .slice(0, 10)
                .map(([key, val], idx) => {
                  const percent = ((val / notesSummary.total) * 100).toFixed(1);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-8 text-xs text-gray-400 font-medium">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 truncate">
                            {reasonLabelMap.get(key)} ({key})
                          </span>
                          <span className="text-gray-900 font-bold">
                            {val.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-12 text-right text-xs text-gray-500">
                        {percent}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && filteredTableData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-0 z-10">
                    ที่ทำการ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  {REPORT_REASONS.map((r) => (
                    <th
                      key={r.key}
                      className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[60px]"
                      title={r.label}
                    >
                      {r.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTableData.map((row) => (
                  <tr
                    key={row.postal_code}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                      {row.office_name}{" "}
                      <span className="text-gray-400 font-normal ml-1">
                        ({row.postal_code})
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {row.status === "reported" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ รายงานแล้ว
                        </span>
                      ) : row.status === "not_reported" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✕ ขาดส่ง
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      {row.is_reported && row.total_notes > 0 ? (
                        <button
                          onClick={() => handleShowReportDetails(row)}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {row.total_notes.toLocaleString()}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    {REPORT_REASONS.map((r) => (
                      <td
                        key={r.key}
                        className="px-4 py-3 text-center text-sm text-gray-600 border-l border-dashed border-gray-100"
                      >
                        {row.is_reported &&
                        row.notes_data_aggregated[r.key] > 0 ? (
                          row.notes_data_aggregated[r.key]
                        ) : (
                          <span className="text-gray-200">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && modalDetailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {modalDetailData.office_name}
              </h3>
              <p className="text-sm text-gray-500">รายละเอียดสาเหตุ</p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {REPORT_REASONS.map((r) => {
                const val = modalDetailData.notes_data[r.key] || 0;
                if (val === 0) return null;
                return (
                  <div
                    key={r.key}
                    className="flex justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-gray-600">
                      {r.key} - {r.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {val}
                    </span>
                  </div>
                );
              })}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-base font-bold">
                <span>รวมทั้งหมด</span>
                <span className="text-red-600">
                  {modalDetailData.total_notes}
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 text-right">
              <button
                onClick={handleCloseDetailModal}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// ######################################################################
//   Main Layout
// ######################################################################

export default function Home() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="min-h-screen font-sans selection:bg-red-100 selection:text-red-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-red-200">
                Q
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  QMS Summary
                </h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  Made with 💖 by Megamind
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeView === "dashboard"
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                ภาพรวมนำจ่าย
              </button>
              <button
                onClick={() => setActiveView("notes")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeView === "notes"
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                รายงานหมายเหตุ
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <DashboardView active={activeView === "dashboard"} />
        <NotesReportView active={activeView === "notes"} />
      </main>
    </div>
  );
}
