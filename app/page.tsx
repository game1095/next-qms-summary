"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
// --- [แก้ไข] Import client จากไฟล์ที่เราสร้าง ---
import { supabase } from "../lib/supabaseClient"; // (ถ้าโฟลเดอร์ lib อยู่ระดับเดียวกับ app ให้ใช้ path นี้)

// --- Import DatePicker ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// --- Import CSS ที่เราเพิ่งสร้าง ---
import "./datepicker.css"; // (ถ้าคุณเก็บไว้ที่อื่น ให้แก้ Path ตรงนี้)

// [*** ใหม่: Import Chart.js ***]
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels"; // [*** เพิ่ม 1/3 ***]

// ลงทะเบียน components ที่จำเป็นสำหรับ Pie Chart
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels); // [*** เพิ่ม 2/3 ***]

// ######################################################################
//   [*** ใหม่: เพิ่ม Types และ Interfaces ***]
// ######################################################################

// ข้อมูลดิบจากตาราง delivery_data
interface DeliveryDataRow {
  id?: number;
  report_date: string;
  file_key: string;
  cole: string; // Postal code
  colf: string; // Office name
  cold: string; // Service type
  colg: string; // COD status
  valueh: number;
  valuei: number;
  valuek: number;
  valuem: number;
  valueo: number;
}

// ข้อมูลดิบจากตาราง delivery_notes
interface DeliveryNoteRow {
  id?: number;
  report_date: string;
  postal_code: string;
  office_name: string;
  total_notes: number;
  notes_data: { [key: string]: string }; // {"0": "10", "1": "5"}
}

// ผลรวมในตาราง Dashboard
interface AggregatedSums {
  sumH: number;
  sumI: number;
  sumK: number;
  sumM: number;
  sumO: number;
}

// [*** แก้ไข: เพิ่ม status ***]
// ข้อมูลสำหรับตารางในหน้า "รายงานหมายเหตุ"
interface ReportTableRow {
  postal_code: string;
  office_name: string;
  is_reported: boolean;
  status: "reported" | "not_reported" | "no_failure"; // [*** ใหม่ ***]
  report_date: string | null;
  total_notes: number;
  notes_data_aggregated: { [key: string]: number }; // {"0": 10, "1": 5}
}

// ข้อมูลสำหรับ Modal "ดูรายละเอียด" ในหน้า "รายงานหมายเหตุ"
interface ModalDetailData {
  office_name: string;
  total_notes: number;
  notes_data: { [key: string]: number };
}

// Props สำหรับ Views
interface ViewProps {
  active: boolean;
}

// [*** ใหม่: Type สำหรับ Pie Chart ***]
interface NotesSummary {
  data: { [key: string]: number };
  total: number;
}

interface PieChartProps {
  notesSummary: NotesSummary;
  reasonMap: Map<string, string>;
}

// ######################################################################

// --- [ย้าย] รายการหมายเหตุมาไว้บนสุด ---
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

// [ใหม่] สร้าง Map เพื่อให้ค้นหา Label ได้เร็วขึ้น
const reasonLabelMap = new Map(REPORT_REASONS.map((r) => [r.key, r.label]));

const initialReportFormData = REPORT_REASONS.reduce((acc, reason) => {
  acc[reason.key] = "";
  return acc;
}, {} as { [key: string]: string }); // [*** แก้ไข: เพิ่ม Type ***]
// ------------------------------------------

// กำหนด Key ของไฟล์ทั้ง 5
const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

// ######################################################################
//   [*** ย้ายมาไว้ Global ***] ข้อมูล Filter สังกัด
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

// [*** แก้ไข: ย้าย filterDisplayNames มา Global ***]
// [*** แก้ไข: ย้าย filterDisplayNames มา Global ***]
const filterDisplayNames: { [key: string]: string } = {
  all: "ปข.6 (ทุกที่ทำการ)",
  "province-summary": "ปข.6 (สรุปตาม ปจ.)", // [*** ใหม่ ***]
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
// ######################################################################
//   จบส่วน Global
// ######################################################################

// [*** แก้ไข: เพิ่ม Type ***]
const getCodStatus = (code: string | number) => {
  const c = String(code).toUpperCase();
  if (c === "R") return "COD(แดง)";
  if (c === "B") return "COD(น้ำเงิน)";
  if (c === "N") return "ไม่";
  return "ไม่";
};

// [*** แก้ไข: เพิ่ม Type ***]
const formatDateToISO = (date: Date | null) => {
  if (!date) return null;
  const yearAD = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${yearAD}-${pad(month)}-${pad(day)}`;
};

// [*** แก้ไข: เพิ่ม Type ***]
const formatToFullThaiDate = (date: Date | string | null) => {
  if (!date) return "";

  // [แก้ไข] ตรวจสอบว่าเป็น String (YYYY-MM-DD) หรือไม่
  let dateObj;
  if (typeof date === "string") {
    dateObj = new Date(date + "T00:00:00"); // ป้องกัน Timezone
  } else {
    dateObj = date;
  }

  // สร้าง Array เดือนแบบเต็ม
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
  const monthName = thaiMonths[dateObj.getMonth()]; // getMonth() returns 0-11
  const yearBE = dateObj.getFullYear() + 543;
  return `${day} ${monthName} ${yearBE}`;
};

// ######################################################################
//   [*** ใหม่: Component สำหรับ Pie Chart ***]
// ######################################################################
const CHART_COLORS = [
  "#DC2626", // red-600
  "#EA580C", // orange-600
  "#F59E0B", // amber-500
  "#16A34A", // green-600
  "#2563EB", // blue-600
  "#4F46E5", // indigo-600
  "#7C3AED", // violet-600
  "#DB2777", // pink-600
  "#64748B", // slate-500
  "#F97316", // orange-500
  "#EAB308", // yellow-500
  "#84CC16", // lime-500
  "#10B981", // emerald-500
  "#06B6D4", // cyan-500
  "#6366F1", // indigo-500
  "#A855F7", // purple-500
  "#EC4899", // pink-500
  "#78716C", // stone-500
  "#EF4444", // red-500
  "#3B82F6", // blue-500
  "#8B5CF6", // violet-500
];

const NotesPieChart = ({ notesSummary, reasonMap }: PieChartProps) => {
  // 1. กรองและจัดเรียงข้อมูล
  const chartDataEntries = Object.entries(notesSummary.data)
    .map(([key, value]) => ({
      key,
      value,
      label: reasonMap.get(key) || "Unknown",
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value); // เรียงจากมากไปน้อย

  // 2. เตรียมข้อมูลให้ Chart.js
  const data = {
    labels: chartDataEntries.map((item) => `${item.key} - ${item.label}`),
    datasets: [
      {
        label: "จำนวน",
        data: chartDataEntries.map((item) => item.value),
        backgroundColor: CHART_COLORS.slice(0, chartDataEntries.length),
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
      // ตั้งค่า Tooltip (ตอนเอาเมาส์ชี้)
      tooltip: {
        callbacks: {
          label: function (context: any) {
            // ใช้ any ตรงนี้เพราะ type ของ Chart.js ซับซ้อน
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
      // [*** เพิ่ม 3/3: การตั้งค่า DataLabels ***]
      datalabels: {
        formatter: (value: number, context: any) => {
          const percentage = (value / (notesSummary.total || 1)) * 100;

          // ซ่อนเปอร์เซ็นต์ที่น้อยกว่า 5% เพื่อไม่ให้รก
          if (percentage < 5) {
            return null;
          }

          return percentage.toFixed(1) + "%";
        },
        color: "#ffffff", // สีตัวอักษร
        font: {
          weight: "bold" as const, // [*** แก้ไข: เพิ่ม as const ***]
          size: 12,
        },
      },
    },
  };

  return <Pie data={data} options={options} />;
};

// ######################################################################
//   Component สำหรับหน้า Dashboard
// ######################################################################

// [*** แก้ไข: เพิ่ม Type ***]
const DashboardView = ({ active }: ViewProps) => {
  const years = [2568, 2569, 2570];

  // [*** แก้ไข: เพิ่ม Type ***]
  const [supabaseData, setSupabaseData] = useState<DeliveryDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับ Modal อัปโหลด
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFilesData, setUploadFilesData] = useState<{
    [key: string]: any[];
  }>({});
  const [uploadFileNames, setUploadFileNames] = useState<{
    [key: string]: string;
  }>({});

  // [*** แก้ไข: เปลี่ยน State วันที่อัปโหลด ***]
  const [uploadDate, setUploadDate] = useState<Date | null>(null);

  // State สำหรับ Modal รายละเอียด
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    details: [] as any[], // Type นี้ซับซ้อนและใช้แค่ที่นี่ ปล่อยเป็น any หรือสร้าง Type เฉพาะได้
    summary: { H: 0, M: 0, O: 0 },
  });

  // State สำหรับ Modal รายงานหมายเหตุ
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState<Date | null>(null);
  const [reportFormData, setReportFormData] = useState(initialReportFormData);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // State สำหรับ Filter ที่เลือก
  const [selectedFilter, setSelectedFilter] = useState("all");

  // [*** ใหม่: State สำหรับ Service Filter ***]
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");

  // State สำหรับการค้นหา
  const [searchTerm, setSearchTerm] = useState("");

  // State สำหรับ เปิด/ปิด ส่วนควบคุม
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  // State วัน/เดือน/ปี (สำหรับ Fetch ข้อมูล)
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // [*** ใหม่: Helper function สำหรับจัดกลุ่ม ปจ. ***]
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
    return "other"; // หรือ null
  };

  // useEffect เพื่อตั้งค่าเป็น "เมื่อวานนี้"
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    setStartDate(new Date(yesterday));
    setEndDate(new Date(yesterday));
    setReportDate(new Date(yesterday));

    // [*** แก้ไข: ตั้งค่า uploadDate ***]
    setUploadDate(new Date(yesterday));
  }, []);

  // [*** แก้ไข: เพิ่ม Type ***]
  const fetchData = async (start: Date | null, end: Date | null) => {
    setIsLoading(true);
    setSupabaseData([]);

    if (!start || !end) {
      setIsLoading(false);
      return;
    }

    const isoStartDate = formatDateToISO(start);
    const isoEndDate = formatDateToISO(end);

    console.log(`Fetching data from ${isoStartDate} to ${isoEndDate}`);

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

  // useEffect สำหรับดึงข้อมูลเมื่อวันที่ (หน้าหลัก) เปลี่ยน
  useEffect(() => {
    // [แก้ไข] ดึงข้อมูลเฉพาะเมื่อ tab นี้ active
    if (active) {
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate, active]); // เพิ่ม active เป็น dependency

  // [*** แก้ไข: เพิ่ม Type ***]
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
      const slicedData = jsonData.slice(1, 1000) as any[][]; // Cast to array of arrays

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

  // [*** แก้ไข: ฟังก์ชันสำหรับยืนยันการอัปโหลด ***]
  const handleSubmitUpload = async () => {
    const fileKeys = Object.keys(uploadFilesData);
    if (fileKeys.length === 0) {
      alert("กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์");
      return;
    }
    if (fileKeys.length < FILE_KEYS.length) {
      if (
        !window.confirm(
          `คุณอัปโหลดเพียง ${fileKeys.length} ไฟล์ (จาก ${FILE_KEYS.length} ไฟล์) ข้อมูลอาจไม่สมบูรณ์ ยืนยันที่จะอัปโหลดหรือไม่?`
        )
      ) {
        return;
      }
    }

    setIsUploading(true);

    try {
      // [*** แก้ไข: ใช้ uploadDate ***]
      const reportDate = formatDateToISO(uploadDate);
      if (!reportDate) {
        throw new Error("กรุณาเลือกวันที่อัปโหลด");
      }

      const { count, error: countError } = await supabase
        .from("delivery_data")
        .select("id", { count: "exact", head: true })
        .eq("report_date", reportDate);

      if (countError) {
        throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้: " + countError.message);
      }
      if ((count ?? 0) > 0) {
        alert(
          // [*** แก้ไข: Alert ***]
          `พบข้อมูลสำหรับวันที่ ${formatToFullThaiDate(
            uploadDate
          )} อยู่ในระบบแล้ว\n(ระบบไม่อนุญาตให้อัปโหลดทับ) กรุณาเลือกวันอื่น`
        );
        setIsUploading(false);
        return;
      }

      const rowsToInsert: Omit<DeliveryDataRow, "id">[] = []; // [*** แก้ไข: เพิ่ม Type ***]
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
          });
        });
      });
      if (rowsToInsert.length === 0) {
        throw new Error("ไม่พบข้อมูลที่จะอัปโหลด (ไฟล์อาจจะว่างเปล่า)");
      }

      const { error: insertError } = await supabase
        .from("delivery_data")
        .insert(rowsToInsert);
      if (insertError) {
        throw new Error("ไม่สามารถอัปโหลดข้อมูลได้: " + insertError.message);
      }

      alert(
        // [*** แก้ไข: Alert ***]
        `อัปโหลดข้อมูลสำหรับวันที่ ${formatToFullThaiDate(
          uploadDate
        )} สำเร็จ! (${rowsToInsert.length} รายการ)`
      );

      setIsUploadModalOpen(false);
      setUploadFilesData({});
      setUploadFileNames({});

      // [*** แก้ไข: ตั้งค่าวันที่หลัก ***]
      setStartDate(uploadDate);
      setEndDate(uploadDate);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + (error as Error).message); // [*** แก้ไข: Type assertion ***]
    } finally {
      setIsUploading(false);
    }
  };

  // [*** แก้ไข: เพิ่ม Logic สรุป ปจ. ***]
  const aggregatedData = useMemo((): [string, AggregatedSums][] => {
    const summary = new Map<string, AggregatedSums>();

    // [*** ใหม่: Logic สำหรับ 'province-summary' ***]
    if (selectedFilter === "province-summary") {
      supabaseData.forEach((item: DeliveryDataRow) => {
        // [*** 1. (NEW) Service Filter ***]
        if (
          selectedServiceFilter !== "all" &&
          item.file_key !== selectedServiceFilter
        ) {
          return; // Skip if service doesn't match
        }

        const provinceKey = getProvinceKey(item.cole);
        if (provinceKey === "other") return; // ข้าม ปณ. ที่ไม่รู้จักสังกัด

        // Key คือ 'nakhon-sawan||ปจ.นครสวรรค์'
        const provinceName = filterDisplayNames[provinceKey] || "ไม่ระบุ";
        const compositeKey = `${provinceKey}||${provinceName}`;

        const valueH = item.valueh || 0;
        const valueI = item.valuei || 0;
        const valueK = item.valuek || 0;
        const valueM = item.valuem || 0;
        const valueO = item.valueo || 0;
        const currentSums = summary.get(compositeKey) || {
          sumH: 0,
          sumI: 0,
          sumK: 0,
          sumM: 0,
          sumO: 0,
        };
        summary.set(compositeKey, {
          sumH: currentSums.sumH + valueH,
          sumI: currentSums.sumI + valueI,
          sumK: currentSums.sumK + valueK,
          sumM: currentSums.sumM + valueM,
          sumO: currentSums.sumO + valueO,
        });
      });
      return Array.from(summary.entries());
    }

    // [*** Logic เดิมสำหรับฟิลเตอร์อื่นๆ ***]
    let filterSet: Set<string> | null = null;
    if (selectedFilter === "nakhon-sawan") {
      filterSet = nakhonSawanSet;
    } else if (selectedFilter === "uthai-thani") {
      filterSet = uthaiThaniSet;
    } else if (selectedFilter === "kamphaeng-phet") {
      filterSet = kamphaengPhetSet;
    } else if (selectedFilter === "tak") {
      filterSet = takSet;
    } else if (selectedFilter === "sukhothai") {
      filterSet = sukhothaiSet;
    } else if (selectedFilter === "phitsanulok") {
      filterSet = phitsanulokSet;
    } else if (selectedFilter === "phichit") {
      filterSet = phichitSet;
    } else if (selectedFilter === "phetchabun") {
      filterSet = phetchabunSet;
    } else if (selectedFilter === "sp-nakhon-sawan") {
      filterSet = spNakhonSawanSet;
    } else if (selectedFilter === "sp-phitsanulok") {
      filterSet = spPhitsanulokSet;
    }

    supabaseData.forEach((item: DeliveryDataRow) => {
      // [*** 1. (NEW) Service Filter ***]
      if (
        selectedServiceFilter !== "all" &&
        item.file_key !== selectedServiceFilter
      ) {
        return; // Skip if service doesn't match
      }

      // [*** 2. (Existing) Agency Filter ***]
      // ถ้าเลือก 'all' (filterSet=null) หรือ cole อยู่ใน Set
      if (!filterSet || filterSet.has(String(item.cole))) {
        const keyE = String(item.cole);
        const keyF = String(item.colf);
        const compositeKey = `${keyE}||${keyF}`;
        const valueH = item.valueh || 0;
        const valueI = item.valuei || 0;
        const valueK = item.valuek || 0;
        const valueM = item.valuem || 0;
        const valueO = item.valueo || 0;
        const currentSums = summary.get(compositeKey) || {
          sumH: 0,
          sumI: 0,
          sumK: 0,
          sumM: 0,
          sumO: 0,
        };
        summary.set(compositeKey, {
          sumH: currentSums.sumH + valueH,
          sumI: currentSums.sumI + valueI,
          sumK: currentSums.sumK + valueK,
          sumM: currentSums.sumM + valueM,
          sumO: currentSums.sumO + valueO,
        });
      }
    });
    return Array.from(summary.entries());
  }, [supabaseData, selectedFilter, selectedServiceFilter]); // [*** แก้ไข: เพิ่ม Dependency ***]

  // Logic สรุปผล (ขั้นตอนที่ 2: ค้นหาและเรียงลำดับ)
  const summaryData = useMemo(() => {
    // [*** แก้ไข: เพิ่ม Type ***]
    const filteredArray = aggregatedData.filter(
      ([compositeKey, sums]: [string, AggregatedSums]) => {
        if (searchTerm.trim() === "") {
          return true;
        }
        const [keyE, keyF] = compositeKey.split("||");
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        return (
          keyE.includes(lowerSearchTerm) ||
          keyF.toLowerCase().includes(lowerSearchTerm)
        );
      }
    );
    // [*** แก้ไข: เพิ่ม Type ***]
    filteredArray.sort(
      (a: [string, AggregatedSums], b: [string, AggregatedSums]) => {
        const sumsA = a[1];
        const sumsB = b[1];
        const rateA = sumsA.sumH > 0 ? sumsA.sumM / sumsA.sumH : 0;
        const rateB = sumsB.sumH > 0 ? sumsB.sumM / sumsB.sumH : 0;
        return rateA - rateB;
      }
    );
    return filteredArray;
  }, [aggregatedData, searchTerm]);

  // Logic คำนวณ Grand Total
  const summaryKPIs = useMemo(() => {
    const totals = { H: 0, I: 0, K: 0, M: 0, O: 0 };
    if (!summaryData || summaryData.length === 0) {
      return { ...totals, successRate: 0, failureRate: 0 };
    }
    // [*** แก้ไข: เพิ่ม Type ***]
    summaryData.forEach(([, sums]: [string, AggregatedSums]) => {
      totals.H += sums.sumH;
      totals.I += sums.sumI;
      totals.K += sums.sumK;
      totals.M += sums.sumM;
      totals.O += sums.sumO;
    });
    const successRate = totals.H > 0 ? (totals.M / totals.H) * 100 : 0;
    const failureRate = totals.H > 0 ? (totals.O / totals.H) * 100 : 0;
    return { ...totals, successRate: successRate, failureRate: failureRate };
  }, [summaryData]);

  // Logic สำหรับคำนวณผลรวมใน Modal หมายเหตุ
  const reportTotalSum = useMemo(() => {
    const values = Object.values(reportFormData);
    return values.reduce((acc, value) => {
      return acc + (parseInt(value) || 0);
    }, 0);
  }, [reportFormData]);

  // [*** ใหม่: Logic สำหรับตรวจสอบว่าปุ่ม Save ควรกดได้หรือไม่ ***]
  const isReportSaveDisabled = useMemo(() => {
    if (isSubmittingReport) return true; // 1. กำลังบันทึก
    if (reportTotalSum === 0) return true; // 2. ไม่มีข้อมูล
    if (reportTotalSum !== modalData.summary.O) return true; // 3. ยอดไม่ตรง
    return false; // ผ่านหมด
  }, [isSubmittingReport, reportTotalSum, modalData.summary.O]);

  // [*** แก้ไข: เอา Service Filter ออกจาก Logic นี้ ***]
  const handleShowDetails = (compositeKey: string) => {
    const [keyE, keyF] = compositeKey.split("||");
    const title = `รายละเอียด: ${keyE} - ${keyF}`;

    const subSummaryMap = new Map();
    const totalSummary = { H: 0, M: 0, O: 0 };

    supabaseData.forEach((item) => {
      // Logic นี้จะวน loop `supabaseData` ทั้งหมด
      // ซึ่งเป็นข้อมูลดิบที่ยังไม่ได้กรอง service
      if (String(item.cole) === keyE && String(item.colf) === keyF) {
        // [*** (REMOVED) ลบการเช็ค selectedServiceFilter ออกจากตรงนี้ ***]

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

  // --- ฟังก์ชันสำหรับ Modal หมายเหตุ ---
  // [*** แก้ไข: ตั้งค่า reportDate = endDate ***]
  const handleOpenReportModal = () => {
    setReportDate(endDate); // [*** แก้ไข ***]
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportFormData(initialReportFormData);
  };

  // [*** แก้ไข: เพิ่ม Type ***]
  const handleReportFormChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) => {
    const { value } = e.target;
    if (value === "" || /^[0-9\b]+$/.test(value)) {
      setReportFormData((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  // [*** แก้ไข: เพิ่ม Validation ***]
  const handleSubmitReport = async () => {
    // [*** VALIDATION 1: Check for no data ***]
    if (reportTotalSum === 0) {
      alert("กรุณากรอกข้อมูลหมายเหตุอย่างน้อย 1 ช่อง");
      return; // Stop execution
    }

    // [*** VALIDATION 2: Check for mismatch ***]
    if (reportTotalSum !== modalData.summary.O) {
      alert(
        `ยอดรวมที่กรอก (${reportTotalSum}) ไม่ตรงกับยอดไม่สำเร็จ (${modalData.summary.O})\nกรุณาตรวจสอบข้อมูลอีกครั้ง`
      );
      return; // Stop execution
    }

    setIsSubmittingReport(true);
    try {
      const isoDate = formatDateToISO(reportDate);
      if (!isoDate) {
        throw new Error("กรุณาเลือกวันที่");
      }

      const [prefix, fullTitle] = modalData.title.split(": ");
      const [postalCode, officeName] = fullTitle.split(" - ");

      // [*** VALIDATION 3: Check for duplicates ***]
      const { data: existingReport, error: checkError } = await supabase
        .from("delivery_notes")
        .select("id")
        .eq("report_date", isoDate)
        .eq("postal_code", postalCode)
        .maybeSingle();

      if (checkError) {
        throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้: " + checkError.message);
      }

      if (existingReport) {
        alert(
          `พบรายงานหมายเหตุสำหรับ ${officeName} ในวันที่ ${formatToFullThaiDate(
            reportDate
          )} อยู่ในระบบแล้ว\nระบบไม่อนุญาตให้รายงานซ้ำ`
        );
        setIsSubmittingReport(false); // Stop loading
        return; // Stop execution
      }
      // [*** END NEW CHECK ***]

      const dataToInsert = {
        // [แก้ไข] เปลี่ยนจาก Upsert เป็น Insert
        report_date: isoDate,
        postal_code: postalCode,
        office_name: officeName,
        notes_data: reportFormData,
        total_notes: reportTotalSum,
      };

      const { error: insertError } = await supabase
        .from("delivery_notes")
        .insert(dataToInsert); // [แก้ไข]

      if (insertError) {
        throw insertError;
      }

      alert(
        `บันทึกข้อมูลหมายเหตุของ ${officeName} วันที่ ${formatToFullThaiDate(
          reportDate
        )} สำเร็จ!`
      );
      handleCloseReportModal();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("เกิดข้อผิดพลาดในการบันทึก: " + (error as Error).message); // [*** แก้ไข: Type assertion ***]
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // [*** ใหม่: ตัวแปรเช็คสถานะสรุป ปจ. ***]
  const isProvinceSummary = selectedFilter === "province-summary";

  // ----------------------------------------

  return (
    <>
      {/* --- ส่วนของ Dashboard View --- */}

      <div className={`${active ? "block" : "hidden"}`}>
        <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
          <div className="mx-auto">
            {/* ปุ่ม เปิด/ปิด */}
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center"
              >
                {isControlsOpen ? (
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 15l7-7 7 7"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                )}
                {isControlsOpen ? "ซ่อน" : "แสดง"} ตั้งค่า (ดึงข้อมูล/ฟิลเตอร์)
              </button>
            </div>

            {/* H1 และกล่องควบคุม */}
            {isControlsOpen && (
              <>
                {/* === [หัวเรื่องที่อัปเดต] === */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-800">
                    รายงานประสิทธิภาพการนำจ่าย EMS ในประเทศ
                  </h1>
                  <p className="text-lg text-gray-500 mt-1 flex items-center">
                    Made with
                    {/* ไอคอนหัวใจ */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 inline text-red-500 mx-1"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                    by Megamind
                  </p>
                </div>
                {/* === [จบส่วนหัวเรื่อง] === */}

                {/* === [UI ส่วนควบคุมที่ปรับปรุงใหม่] === */}
                <div className="mb-8">
                  {/* Grid Layout สองระดับ */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Card 1: เลือกวันที่ + ค้นหา (กว้าง 2 ส่วน) */}
                    <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-700 mb-1">
                        🗓️ เลือกข้อมูล
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        เลือกช่วงวันที่และค้นหาข้อมูลที่ต้องการ
                      </p>

                      {/* แถวที่ 1: เลือกวันที่ */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* [ใหม่] DatePicker วันที่เริ่มต้น */}
                        <div>
                          <label
                            htmlFor="start-date"
                            className="block text-sm font-medium text-gray-700"
                          >
                            วันที่เริ่มต้น
                          </label>
                          <DatePicker
                            id="start-date"
                            selected={startDate}
                            onChange={(date: Date | null) => setStartDate(date)} // [*** แก้ไข: เพิ่ม Type ***]
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            dateFormat="dd/MM/yyyy"
                            className="mt-1" // CSS ถูกควบคุมโดย datepicker.css
                          />
                        </div>

                        {/* [ใหม่] DatePicker วันที่สิ้นสุด */}
                        <div>
                          <label
                            htmlFor="end-date"
                            className="block text-sm font-medium text-gray-700"
                          >
                            วันที่สิ้นสุด
                          </label>
                          <DatePicker
                            id="end-date"
                            selected={endDate}
                            onChange={(date: Date | null) => setEndDate(date)} // [*** แก้ไข: เพิ่ม Type ***]
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate || undefined} // [**แก้ตรงนี้ครับ**]
                            dateFormat="dd/MM/yyyy"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* แถวที่ 2: ช่องค้นหา */}
                      <div className="w-full">
                        <label htmlFor="search-input" className="sr-only">
                          ค้นหา...
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </div>
                          <input
                            id="search-input"
                            type="text"
                            placeholder="ค้นหา (รหัสไปรษณีย์ / ที่ทำการ)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5 pl-10 pr-3"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card 2: อัปโหลด (กว้าง 1 ส่วน) */}
                    <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-700 mb-1">
                        ☁️ อัปโหลดข้อมูล
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 flex-grow">
                        เพิ่มข้อมูลชุดใหม่ (รายวัน) เข้าระบบ Supabase
                      </p>
                      <button
                        onClick={() => {
                          setIsUploadModalOpen(true);
                        }}
                        className="py-2.5 px-4 rounded-lg font-semibold transition-colors 
                                  bg-blue-600 text-white 
                                  hover:bg-blue-700 
                                  flex items-center justify-center
                                  shadow-md hover:shadow-lg w-full"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        อัปโหลดข้อมูลใหม่
                      </button>
                    </div>
                  </div>

                  {/* [*** แก้ไข: รวม Card 3 และ 4 ***] */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    {/* Card 3: ตัวกรองสังกัด (เต็มความกว้าง) */}
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      🏢 กรองตามสังกัด
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedFilter("all")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "all"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        {filterDisplayNames["all"]}
                      </button>

                      {/* [*** ใหม่: ปุ่มสรุป ปจ. ***] */}
                      <button
                        onClick={() => setSelectedFilter("province-summary")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "province-summary"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        {filterDisplayNames["province-summary"]}
                      </button>

                      {/* ... (ปุ่ม Filter อื่นๆ) ... */}
                      <button
                        onClick={() => setSelectedFilter("nakhon-sawan")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "nakhon-sawan"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.นครสวรรค์
                      </button>
                      <button
                        onClick={() => setSelectedFilter("uthai-thani")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "uthai-thani"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.อุทัยธานี
                      </button>
                      <button
                        onClick={() => setSelectedFilter("kamphaeng-phet")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "kamphaeng-phet"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.กำแพงเพชร
                      </button>
                      <button
                        onClick={() => setSelectedFilter("tak")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "tak"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.ตาก
                      </button>
                      <button
                        onClick={() => setSelectedFilter("sukhothai")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "sukhothai"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.สุโขทัย
                      </button>
                      <button
                        onClick={() => setSelectedFilter("phitsanulok")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "phitsanulok"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.พิษณุโลก
                      </button>
                      <button
                        onClick={() => setSelectedFilter("phichit")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "phichit"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.พิจิตร
                      </button>
                      <button
                        onClick={() => setSelectedFilter("phetchabun")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "phetchabun"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ปจ.เพชรบูรณ์
                      </button>
                      <button
                        onClick={() => setSelectedFilter("sp-nakhon-sawan")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "sp-nakhon-sawan"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ศป.นครสวรรค์
                      </button>
                      <button
                        onClick={() => setSelectedFilter("sp-phitsanulok")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors
                            ${
                              selectedFilter === "sp-phitsanulok"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                          `}
                      >
                        ศป.พิษณุโลก
                      </button>
                    </div>

                    {/* [*** ใหม่: ย้าย Card 4 มาไว้ที่นี่ ***] */}
                    <hr className="my-6 border-gray-200" />

                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      ⚙️ กรองตามประเภทบริการ
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedServiceFilter("all")}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                          selectedServiceFilter === "all"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        ทุกบริการ
                      </button>
                      {FILE_KEYS.map((serviceKey) => (
                        <button
                          key={serviceKey}
                          onClick={() => setSelectedServiceFilter(serviceKey)}
                          className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                            selectedServiceFilter === serviceKey
                              ? "bg-red-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {serviceKey}
                        </button>
                      ))}
                    </div>
                    {/* [*** จบส่วนที่ย้ายมา ***] */}
                  </div>
                </div>
                {/* === [*** จบส่วน UI ใหม่ ***] === */}
              </>
            )}

            {/* สถานะกำลังโหลด (เพิ่มไอคอน) */}
            {isLoading && (
              <div className="mb-8 bg-white p-12 rounded-lg shadow-sm text-center flex flex-col items-center justify-center">
                {/* ไอคอน Spinner */}
                <svg
                  className="animate-spin h-12 w-12 text-red-600 mb-4"
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

                {/* ข้อความ */}
                <h2 className="text-xl font-semibold text-gray-700">
                  กำลังดึงข้อมูลจาก Supabase...
                </h2>
              </div>
            )}

            {/* [แก้ไข] ข้อความกรณีไม่พบข้อมูล (ดึงข้อมูลแล้วไม่มีเลย) */}
            {!isLoading && aggregatedData.length === 0 && (
              <div className="mb-8 bg-white p-6 rounded-lg shadow-sm text-center">
                <h2 className="text-xl font-semibold text-gray-700">
                  ไม่พบข้อมูล
                </h2>
                <p className="text-gray-500">
                  ไม่พบข้อมูลสำหรับช่วงวันที่ที่เลือกในฐานข้อมูล กรุณาใช้ปุ่ม
                  "อัปโหลดข้อมูลใหม่"
                </p>
              </div>
            )}

            {/* [ใหม่] ข้อความกรณีไม่พบผลลัพธ์การค้นหา */}
            {!isLoading &&
              aggregatedData.length > 0 &&
              summaryData.length === 0 && (
                <div className="mb-8 bg-white p-6 rounded-lg shadow-sm text-center">
                  <h2 className="text-xl font-semibold text-gray-700">
                    ไม่พบผลลัพธ์การค้นหา
                  </h2>
                  <p className="text-gray-500">
                    ไม่พบที่ทำการ/สังกัดที่ตรงกับ "{searchTerm}"
                  </p>
                </div>
              )}

            {/* กล่องรายงาน (เงื่อนไข: ต้องมีข้อมูลหลังจากการค้นหา) */}
            {!isLoading && summaryData.length > 0 && (
              <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-8">
                {/* --- 1. หัวข้อ --- */}
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center pt-8 px-8">
                  รายงานประสิทธิภาพการนำจ่าย EMS ในประเทศของที่ทำการในสังกัด{" "}
                  {filterDisplayNames[selectedFilter]}
                </h2>

                {/* [*** นี่คือส่วนที่ปรับปรุงการแสดงวันที่ ***] */}
                <p className="text-2xl text-gray-600 text-center mb-6">
                  {/* ตรวจสอบว่าวันเริ่มต้นและสิ้นสุดเป็นวันเดียวกันหรือไม่ */}
                  {formatDateToISO(startDate) === formatDateToISO(endDate)
                    ? `ประจำวันที่ ${formatToFullThaiDate(startDate)}`
                    : `ประจำวันที่ ${formatToFullThaiDate(
                        startDate
                      )} ถึง ${formatToFullThaiDate(endDate)}`}
                </p>
                {/* [*** จบส่วนที่ปรับปรุง ***] */}

                {/* --- 2. KPI Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5 px-8 pb-8">
                  <div
                    className="bg-white p-6 rounded-lg shadow-2xl flex flex-col justify-center items-center 
                                transition-all duration-200 hover:-translate-y-1"
                  >
                    <h3 className="text-base font-medium text-gray-500 uppercase">
                      อัตราความสำเร็จ (M / H)
                    </h3>
                    <p className="text-5xl font-bold text-green-600 mt-2">
                      {summaryKPIs.successRate.toFixed(1)}%
                    </p>
                  </div>

                  <div
                    className="bg-white p-6 rounded-lg shadow-2xl 
                                transition-all duration-200 hover:-translate-y-1"
                  >
                    <h3 className="text-sm font-medium text-gray-500 uppercase">
                      สำเร็จ (M)
                    </h3>
                    <p className="text-4xl font-bold text-green-600 mt-2">
                      {summaryKPIs.M.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className="bg-white p-6 rounded-lg shadow-2xl 
                                transition-all duration-200 hover:-translate-y-1"
                  >
                    <h3 className="text-sm font-medium text-gray-500 uppercase">
                      ไม่สำเร็จ (O)
                    </h3>
                    <p className="text-4xl font-bold text-red-600 mt-2">
                      {summaryKPIs.O.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className="bg-white p-4 rounded-lg shadow-2xl 
                                transition-all duration-200 hover:-translate-y-1"
                  >
                    <h3 className="text-sm font-medium text-gray-500">
                      เตรียมการนำจ่าย (H)
                    </h3>
                    <p className="text-2xl font-semibold text-blue-600 mt-1">
                      {summaryKPIs.H.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className="bg-white p-4 rounded-lg shadow-2xl 
                                transition-all duration-200 hover:-translate-y-1"
                  >
                    <h3 className="text-sm font-medium text-gray-500">
                      รายงานผล (K)
                    </h3>
                    <p className="text-2xl font-semibold text-blue-600 mt-1">
                      {summaryKPIs.K.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className="bg-white p-4 rounded-lg shadow-2xl 
                                transition-all duration-200 hover:-translate-y-1"
                  >
                    <h3 className="text-sm font-medium text-gray-500">
                      ไม่รายงานผล (I)
                    </h3>
                    <p className="text-2xl font-semibold text-red-600 mt-1">
                      {summaryKPIs.I.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* --- 3. ตาราง --- */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          {/* [*** แก้ไข: เปลี่ยนหัวตาราง ***] */}
                          {isProvinceSummary ? "สังกัด" : "รหัสไปรษณีย์"}
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          {/* [*** แก้ไข: เปลี่ยนหัวตาราง ***] */}
                          {isProvinceSummary ? "ชื่อสังกัด" : "ที่ทำการ"}
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          เตรียมการนำจ่าย
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          ไม่รายงานผล
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          รายงานผล
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          สำเร็จ
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          % สำเร็จ (M/H)
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          ไม่สำเร็จ
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                        >
                          % ไม่สำเร็จ (O/H)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaryData.map(([compositeKey, sums]) => {
                        const [keyE, keyF] = compositeKey.split("||");
                        const rowSuccessRate =
                          sums.sumH > 0 ? (sums.sumM / sums.sumH) * 100 : 0;
                        const rowFailureRate =
                          sums.sumH > 0 ? (sums.sumO / sums.sumH) * 100 : 0;

                        let officeBgClassName = "";
                        let officeTextClassName = "";
                        if (rowSuccessRate >= 99) {
                          officeBgClassName = "bg-green-200";
                          officeTextClassName = "text-green-900";
                        } else if (rowSuccessRate >= 95) {
                          officeBgClassName = "bg-orange-200";
                          officeTextClassName = "text-orange-900";
                        } else {
                          officeBgClassName = "bg-red-200";
                          officeTextClassName = "text-red-900";
                        }

                        return (
                          <tr
                            key={compositeKey}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900">
                              {keyE}
                            </td>
                            {/* [*** แก้ไข: ปิด Click ในโหมดสรุป ***] */}
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-base ${officeTextClassName} ${officeBgClassName} font-semibold ${
                                !isProvinceSummary &&
                                "cursor-pointer hover:underline"
                              }`}
                              onClick={
                                !isProvinceSummary
                                  ? () => handleShowDetails(compositeKey)
                                  : undefined
                              }
                            >
                              {keyF}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {sums.sumH.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {sums.sumI.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {sums.sumK.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {sums.sumM.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {rowSuccessRate.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {sums.sumO.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                              {rowFailureRate.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr className="font-bold">
                        <td
                          colSpan={2}
                          className="px-6 py-4 text-right text-base text-gray-800 uppercase"
                        >
                          ยอดรวม (ที่ค้นพบ)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.H.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.I.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.K.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.M.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.successRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.O.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                          {summaryKPIs.failureRate.toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* --- Modal สำหรับอัปโหลดข้อมูล --- */}
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-800">
                    อัปโหลดข้อมูลใหม่
                  </h3>
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isUploading}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  {/* [*** แก้ไข: เปลี่ยนเป็น DatePicker ***] */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      เลือกวันที่ (ของข้อมูลที่จะอัปโหลด)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* ใช้ DatePicker ตัวเดียว */}
                      <div className="md:col-span-1">
                        <label
                          htmlFor="upload-date"
                          className="block text-sm font-medium text-gray-700"
                        >
                          วันที่
                        </label>
                        <DatePicker
                          id="upload-date"
                          selected={uploadDate}
                          onChange={(date: Date | null) => setUploadDate(date)} // [*** แก้ไข: เพิ่ม Type ***]
                          dateFormat="dd/MM/yyyy"
                          className="mt-1" // ใช้ CSS จาก datepicker.css
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                  </div>
                  {/* [*** จบส่วนแก้ไข ***] */}

                  {/* 2. ช่องอัปโหลดไฟล์ */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      อัปโหลดไฟล์ (Excel)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {FILE_KEYS.map((key) => (
                        <div
                          key={key}
                          className="bg-gray-50 p-4 rounded-lg border"
                        >
                          <label
                            htmlFor={`upload-file-${key}`}
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            ไฟล์: <strong>{key}</strong>
                          </label>
                          <input
                            id={`upload-file-${key}`}
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => handleUploadFileChange(e, key)}
                            className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-red-50 file:text-red-700
                                    hover:file:bg-red-100
                                    cursor-pointer"
                            disabled={isUploading}
                          />
                          {uploadFileNames[key] && (
                            <p
                              className="text-xs text-green-600 mt-2 truncate"
                              title={uploadFileNames[key]}
                            >
                              {uploadFileNames[key]} (
                              {uploadFilesData[key]?.length || 0} แถว)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* [ปุ่มยืนยัน] */}
                <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg mr-3"
                    disabled={isUploading}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSubmitUpload}
                    className={`font-bold py-2 px-4 rounded-lg ${
                      isUploading
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                    disabled={
                      isUploading || Object.keys(uploadFilesData).length === 0
                    }
                  >
                    {isUploading ? "กำลังอัปโหลด..." : "ยืนยันการอัปโหลด"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- Modal รายละเอียด --- */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {modalData.title}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    รายละเอียด (แยกตาม บริการ และ COD)
                  </h4>
                  <p className="text-sm text-gray-500 mb-3 -mt-2">
                    *ยอดรวมนี้เป็นยอดสรุปของช่วงวันที่ที่เลือกทั้งหมด
                    (ไม่เกี่ยวกับฟิลเตอร์บริการ)
                  </p>

                  {/* === [*** แก้ไขสี: purple -> red ***] === */}
                  <div className="mb-4">
                    <button
                      onClick={handleOpenReportModal}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                    >
                      รายงานหมายเหตุนำจ่าย
                    </button>
                  </div>
                  {/* === [จบส่วนปุ่มใหม่] === */}

                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          บริการ (D)
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          COD ? (G)
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          เตรียมการ (H)
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          สำเร็จ (M)
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          ไม่สำเร็จ (O)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {modalData.details.length > 0 ? (
                        modalData.details.map((detail, index) => {
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-base text-gray-800 font-semibold">
                                {detail.service}
                              </td>
                              <td className="px-4 py-3 text-base text-gray-800">
                                {detail.codDisplay}
                              </td>
                              <td className="px-4 py-3 text-base text-gray-800">
                                {detail.H.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-base text-gray-800">
                                {detail.M.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-base text-gray-800">
                                {detail.O.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 text-center text-gray-500"
                          >
                            ไม่พบข้อมูลรายละเอียด
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2">
                      <tr className="font-bold">
                        <td
                          colSpan={2}
                          className="px-4 py-3 text-right text-gray-800"
                        >
                          ยอดรวม:
                        </td>
                        <td className="px-4 py-3 text-base text-gray-900">
                          {modalData.summary.H.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-base text-gray-900">
                          {modalData.summary.M.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-base text-gray-900">
                          {modalData.summary.O.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === [*** ใหม่: Modal รายงานหมายเหตุ (Modal ตัวที่ 2) ***] === */}
          {isReportModalOpen && (
            // z-[60] ต้องสูงกว่า z-50 ของ Modal ตัวแรก
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-800">
                    บันทึกรายงานหมายเหตุนำจ่าย
                  </h3>
                  {/* [แก้ไข] ใช้ handleCloseReportModal */}
                  <button
                    onClick={handleCloseReportModal}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isSubmittingReport}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  {/* แถวที่ 1: ชื่อที่ทำการ และ วันที่ */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
                    <div className="mb-4 md:mb-0">
                      <span className="text-sm font-medium text-gray-500">
                        ที่ทำการ
                      </span>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {modalData.title}
                      </h4>
                    </div>
                    <div>
                      <label
                        htmlFor="report-date"
                        className="block text-sm font-medium text-gray-700"
                      >
                        วันที่รายงาน
                      </label>
                      {/* [*** แก้ไข: ปิดการแก้ไข ***] */}
                      <DatePicker
                        id="report-date"
                        selected={reportDate}
                        onChange={(date: Date | null) => setReportDate(date)}
                        dateFormat="dd/MM/yyyy"
                        className="mt-1"
                        disabled={true} // [*** แก้ไข ***]
                      />
                    </div>
                  </div>

                  {/* แถวที่ 2: ฟอร์มกรอกข้อมูล */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {REPORT_REASONS.map((reason) => (
                      <div key={reason.key}>
                        <label
                          htmlFor={`reason-${reason.key}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          {reason.key} - {reason.label}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          id={`reason-${reason.key}`}
                          value={reportFormData[reason.key]}
                          onChange={(e) =>
                            handleReportFormChange(e, reason.key)
                          }
                          // [*** แก้ไขสี: purple -> red ***]
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5"
                          autoComplete="off"
                          disabled={isSubmittingReport}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* [*** นี่คือส่วนที่ปรับปรุง ***] */}
                {/* ปุ่มยืนยัน/ปิด และ ผลรวม */}
                <div className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-lg">
                  {/* ส่วนสรุปผลรวม */}
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      ยอดรวมที่กรอก:{" "}
                      <strong
                        className={
                          // Logic การเปรียบเทียบ
                          reportTotalSum === modalData.summary.O &&
                          reportTotalSum > 0
                            ? "text-green-600" // ตรง และ ไม่ใช่ 0
                            : "text-red-600" // ไม่ตรง
                        }
                      >
                        {reportTotalSum.toLocaleString()}
                      </strong>
                    </span>
                    <span className="text-sm text-gray-500 mx-2">/</span>
                    <span className="text-sm font-medium text-gray-700">
                      ยอดไม่สำเร็จ (O):{" "}
                      <strong>{modalData.summary.O.toLocaleString()}</strong>
                    </span>
                  </div>

                  {/* ส่วนปุ่ม */}
                  <div>
                    {/* [แก้ไข] ใช้ handleCloseReportModal */}
                    <button
                      onClick={handleCloseReportModal}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg mr-3"
                      disabled={isSubmittingReport}
                    >
                      ยกเลิก
                    </button>
                    {/* [*** แก้ไขสี: purple -> red ***] */}
                    <button
                      onClick={handleSubmitReport}
                      className={`font-bold py-2 px-4 rounded-lg ${
                        isReportSaveDisabled
                          ? "bg-red-300 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                      disabled={isReportSaveDisabled}
                    >
                      {isSubmittingReport ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                    </button>
                  </div>
                </div>
                {/* [*** จบส่วนที่ปรับปรุง ***] */}
              </div>
            </div>
          )}
          {/* === [*** จบ Modal ตัวที่ 2 ***] === */}
        </div>
      </div>
    </>
  );
};

// ######################################################################
//   [*** แก้ไข: เพิ่มปุ่มซ่อน/แสดง ***]
// ######################################################################
const NotesReportView = ({ active }: ViewProps) => {
  // [*** แก้ไข: เพิ่ม Type ***]
  const [allTableData, setAllTableData] = useState<ReportTableRow[]>([]); // [*** แก้ไข: เพิ่ม Type ***]
  const [isLoading, setIsLoading] = useState(false);

  // [ใหม่] State สำหรับ Modal ดูรายละเอียด
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalDetailData, setModalDetailData] =
    useState<ModalDetailData | null>(null); // [*** แก้ไข: เพิ่ม Type ***]

  // State สำหรับ Filter (เหมือน Dashboard)
  const [selectedFilter, setSelectedFilter] = useState("all");

  // [*** ใหม่: State สำหรับ Search ***]
  const [searchTerm, setSearchTerm] = useState("");

  // [ใหม่] State สำหรับสรุปยอดรวม (สำหรับกราฟ)
  // [*** แก้ไข: เพิ่ม Type ***]
  const [notesSummary, setNotesSummary] = useState<NotesSummary>({
    data: {},
    total: 0,
  });

  // [*** ใหม่: States สำหรับปุ่มซ่อน/แสดง (ปรับปรุง) ***]
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  // [*** ลบ: isTableOpen ***]

  // ใช้วันที่ของเมื่อวานเป็นค่าเริ่มต้น
  // [*** แก้ไข: State วันที่เดียว ***]
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });

  // [*** นี่คือส่วนที่แก้ไขหลัก ***]
  // ฟังก์ชันดึงข้อมูลที่ปรับปรุงใหม่ทั้งหมด
  // [*** แก้ไข: เพิ่ม Type ***]
  const fetchNotes = async (date: Date | null, filter: string) => {
    // [*** แก้ไข: รับ Date เดียว ***]
    if (!date) return;

    setIsLoading(true);
    setAllTableData([]);
    setNotesSummary({ data: {}, total: 0 });

    const isoDate = formatDateToISO(date); // [*** แก้ไข: ใช้ Date เดียว ***]

    try {
      // 1. ดึงข้อมูล "คนที่รายงานแล้ว" จาก delivery_notes
      const { data: notesData, error: notesError } = await supabase
        .from("delivery_notes")
        .select("*")
        .eq("report_date", isoDate); // [*** แก้ไข: ใช้ .eq() ***]

      if (notesError) throw notesError;
      const typedNotesData = (notesData as DeliveryNoteRow[]) || []; // [*** แก้ไข: Type assertion ***]

      // 2. [*** แก้ไข: ดึง valueo มาด้วย ***]
      const { data: officesData, error: officesError } = await supabase
        .from("delivery_data")
        .select("cole, colf, valueo") // <-- เพิ่ม valueo
        .eq("report_date", isoDate); // [*** แก้ไข: ใช้ .eq() ***]

      if (officesError) throw officesError;
      const typedOfficesData =
        (officesData as { cole: string; colf: string; valueo: number }[]) || []; // [*** แก้ไข: Type assertion ***]

      // 3. สร้าง Filter Set (เหมือน Dashboard)
      let filterSet: Set<string> | null = null; // [*** แก้ไข: เพิ่ม Type ***]
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

      // 4. [*** แก้ไข: สร้าง Map 2 อัน ***]
      // อันที่ 1: ที่ทำการทั้งหมดใน filter
      const uniqueOfficesMap = new Map<string, string>(); // [*** แก้ไข: เพิ่ม Type ***]
      // อันที่ 2: ยอดรวม O ของแต่ละที่ทำการ
      const officeFailureMap = new Map<string, number>(); // <postal_code, sumO>

      typedOfficesData.forEach((item) => {
        // [*** แก้ไข: เพิ่ม Type ***]
        const pCode = String(item.cole);
        if (filterSet && !filterSet.has(pCode)) {
          return; // ข้ามถ้าไม่ตรง filter
        }

        // Add to unique list
        if (!uniqueOfficesMap.has(pCode)) {
          uniqueOfficesMap.set(pCode, item.colf);
        }

        // Aggregate 'O'
        const currentO = officeFailureMap.get(pCode) || 0;
        officeFailureMap.set(pCode, currentO + (item.valueo || 0));
      });

      // 5. [*** REVISED LOGIC ***]
      // Aggregate notes *by postal code* for the date range and filter

      // [*** แก้ไข: เพิ่ม Type ***]
      type AggNote = {
        total_notes: number;
        notes_data: { [key: string]: number };
        last_report_date: string;
      };
      const aggregatedNotesMap = new Map<string, AggNote>(); // Stores the *sum* for each office
      const grandTotalSummary = REPORT_REASONS.reduce(
        (acc, r) => ({ ...acc, [r.key]: 0 }),
        {} as { [key: string]: number }
      );
      let grandTotalCount = 0;

      typedNotesData.forEach((note) => {
        // [*** แก้ไข: เพิ่ม Type ***]
        // Check if this note's office is in our *filtered* list of offices
        if (!uniqueOfficesMap.has(note.postal_code)) {
          return; // Skip this note, it's not in the selected filter
        }

        // --- It's in the filter, so process it ---

        // A. Process for Table (per-office aggregation)
        // [*** แก้ไข: เนื่องจากเลือกวันเดียว ไม่ต้องรวมยอด ***]
        const currentAgg = aggregatedNotesMap.get(note.postal_code);
        if (!currentAgg) {
          // ใส่ข้อมูลครั้งเดียว
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

        // B. Process for Graph (grand total aggregation)
        Object.entries(note.notes_data).forEach(([key, value]) => {
          if (grandTotalSummary.hasOwnProperty(key)) {
            const numValue = parseInt(value) || 0;
            grandTotalSummary[key] += numValue;
            grandTotalCount += numValue;
          }
        });
      });

      setNotesSummary({ data: grandTotalSummary, total: grandTotalCount });

      // 6. [*** แก้ไข: สร้าง Logic สถานะใหม่ ***]
      const finalTableData: ReportTableRow[] = []; // [*** แก้ไข: เพิ่ม Type ***]
      uniqueOfficesMap.forEach((office_name, postal_code) => {
        const aggregatedReport = aggregatedNotesMap.get(postal_code); // Get the *sum*
        const sumO = officeFailureMap.get(postal_code) || 0; // [*** ใหม่ ***]

        const is_reported = !!aggregatedReport;
        let status: "reported" | "not_reported" | "no_failure"; // [*** ใหม่ ***]

        if (is_reported) {
          status = "reported";
        } else if (sumO > 0) {
          status = "not_reported"; // มี O แต่ไม่รายงาน
        } else {
          status = "no_failure"; // O = 0 เลยไม่รายงาน
        }

        // [*** แก้ไข: สร้าง object นี้สำหรับเก็บข้อมูลหมายเหตุ 21 ช่อง ***]
        const notes_data_aggregated: { [key: string]: number } = {};

        if (aggregatedReport) {
          REPORT_REASONS.forEach((reason) => {
            notes_data_aggregated[reason.key] =
              aggregatedReport.notes_data[reason.key] || 0;
          });
        } else {
          REPORT_REASONS.forEach((reason) => {
            notes_data_aggregated[reason.key] = 0;
          });
        }

        finalTableData.push({
          postal_code: postal_code,
          office_name: office_name,
          is_reported: is_reported,
          status: status, // [*** ใหม่ ***]
          report_date: aggregatedReport
            ? aggregatedReport.last_report_date
            : null, // Show last report date
          total_notes: aggregatedReport ? aggregatedReport.total_notes : 0,
          notes_data_aggregated: notes_data_aggregated, // [*** แก้ไข: ส่งเป็น object ***]
        });
      });

      // 7. [*** แก้ไข: Logic การเรียงลำดับ ***]
      const getStatusSortScore = (
        status: "reported" | "not_reported" | "no_failure"
      ) => {
        if (status === "not_reported") return 1; // ❌ แดง ขึ้นก่อน
        if (status === "reported") return 2; // ✅ เขียว
        if (status === "no_failure") return 3; // - เทา
        return 4;
      };

      finalTableData.sort((a, b) => {
        const scoreA = getStatusSortScore(a.status);
        const scoreB = getStatusSortScore(b.status);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        return a.postal_code.localeCompare(b.postal_code);
      });

      setAllTableData(finalTableData);
    } catch (error) {
      console.error("Error fetching notes data:", error);
      alert("ไม่สามารถดึงข้อมูลได้: " + (error as Error).message); // [*** แก้ไข: Type assertion ***]
    } finally {
      setIsLoading(false);
    }
  };

  // Effect นี้จะทำงานเมื่อ active, วันที่, หรือ filter เปลี่ยน
  useEffect(() => {
    if (active) {
      fetchNotes(selectedDate, selectedFilter); // [*** แก้ไข: ส่ง Date เดียว ***]
    }
  }, [active, selectedDate, selectedFilter]); // [*** แก้ไข: เปลี่ยน dependency ***]

  // [*** ใหม่: useMemo สำหรับกรองข้อมูลด้วย Search ***]
  const filteredTableData = useMemo((): ReportTableRow[] => {
    // [*** แก้ไข: เพิ่ม Type ***]
    if (searchTerm.trim() === "") {
      return allTableData; // No search, return all
    }

    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    return allTableData.filter((row: ReportTableRow) => {
      const nameMatch = row.office_name.toLowerCase().includes(lowerSearchTerm);
      const codeMatch = row.postal_code.includes(lowerSearchTerm);
      return nameMatch || codeMatch;
    });
  }, [allTableData, searchTerm]);

  // [*** แก้ไข: ปรับ Logic การคำนวณ KPI ***]
  const notesKPIs = useMemo(() => {
    const totalOffices = allTableData.length;
    if (totalOffices === 0) {
      return {
        totalOffices: 0,
        reportedOffices: 0,
        notReportedOffices: 0,
        totalRequiredToReport: 0, // [*** ใหม่ ***]
        complianceRate: 0,
      };
    }

    // [*** นี่คือ Logic ใหม่ที่ถูกต้อง ***]
    const reportedOffices = allTableData.filter(
      (office) => office.status === "reported"
    ).length;
    const notReportedOffices = allTableData.filter(
      (office) => office.status === "not_reported"
    ).length;

    // จำนวนที่ทำการที่ "จำเป็นต้องรายงาน" (คือมี O > 0)
    const totalRequiredToReport = reportedOffices + notReportedOffices; // [*** ใหม่ ***]

    // อัตราการรายงาน = (คนที่รายงานแล้ว) / (คนที่จำเป็นต้องรายงาน)
    // ถ้าไม่มีใครต้องรายงานเลย (เช่น ทุกคน O=0) ให้ถือเป็น 100%
    const complianceRate =
      totalRequiredToReport > 0
        ? (reportedOffices / totalRequiredToReport) * 100
        : 100;

    return {
      totalOffices,
      reportedOffices,
      notReportedOffices,
      totalRequiredToReport, // [*** ใหม่ ***]
      complianceRate,
    };
  }, [allTableData]);

  // [*** ใหม่: useMemo สำหรับ Top 3 หมายเหตุ ***]
  const topNotesKPIs = useMemo(() => {
    if (!notesSummary || notesSummary.total === 0) {
      return [];
    }

    // [*** แก้ไข: เพิ่ม Type ***]
    const sortedNotes = Object.entries(notesSummary.data)
      .map(([key, value]: [string, number]) => ({
        key,
        value,
        label: reasonLabelMap.get(key) || "Unknown", // Get label from the map
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort descending

    return sortedNotes.slice(0, 3); // Get Top 3
  }, [notesSummary]);

  // [*** แก้ไข: เพิ่ม Type ***]
  const handleShowReportDetails = (data: ReportTableRow) => {
    // แปลงข้อมูลแถวกลับเป็น object ที่ modal รู้จัก
    setModalDetailData({
      office_name: data.office_name,
      // report_date: data.report_date, // [*** แก้ไข ***] ไม่ใช้วันที่ล่าสุด
      total_notes: data.total_notes, // [*** แก้ไข ***] นี่คือยอดรวม
      notes_data: data.notes_data_aggregated, // [*** แก้ไข: ใช้ object ที่รวมยอดแล้ว ***]
    });
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setModalDetailData(null);
  };

  return (
    <div className={`${active ? "block" : "hidden"}`}>
      <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
        <div className="mx-auto">
          {/* --- หัวเรื่อง --- */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              สถานะการรายงานหมายเหตุนำจ่าย
            </h1>
            <p className="text-lg text-gray-500 mt-1">
              ตรวจสอบสถานะการรายงานของที่ทำการในสังกัด{" "}
              {filterDisplayNames[selectedFilter]}
            </p>
          </div>

          {/* [*** ใหม่: ปุ่มซ่อน/แสดง (ปรับปรุง) ***] */}
          <div className="mb-4 flex justify-end space-x-2">
            <button
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center"
            >
              {isControlsOpen ? (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 15l7-7 7 7"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              )}
              {isControlsOpen ? "ซ่อน" : "แสดง"} ตั้งค่า
            </button>

            {/* [*** ลบปุ่มซ่อนตารางออก ***] */}
          </div>

          {/* [*** แก้ไข: เพิ่ม isControlsOpen ***] */}
          {isControlsOpen && (
            <>
              {/* --- [*** แก้ไข: เปลี่ยนเป็น Date เดียว ***] --- */}
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  🗓️ เลือกวันที่ & ค้นหา
                </h3>
                {/* Date Pickers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="notes-date"
                      className="block text-sm font-medium text-gray-700"
                    >
                      เลือกวันที่
                    </label>
                    <DatePicker
                      id="notes-date"
                      selected={selectedDate}
                      onChange={(date: Date | null) => setSelectedDate(date)} // [*** แก้ไข: เพิ่ม Type ***]
                      dateFormat="dd/MM/yyyy"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* [*** ใหม่: Search Input ***] */}
                <div className="w-full mt-4">
                  <label htmlFor="notes-search-input" className="sr-only">
                    ค้นหา...
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      id="notes-search-input" // Unique ID
                      type="text"
                      placeholder="ค้นหา (รหัสไปรษณีย์ / ที่ทำการ)..."
                      value={searchTerm} // New state
                      onChange={(e) => setSearchTerm(e.target.value)} // New state setter
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5 pl-10 pr-3"
                    />
                  </div>
                </div>
                {/* [*** จบ Search Input ***] */}
              </div>

              {/* [ใหม่] Card 3: ตัวกรองสังกัด (เหมือน Dashboard) */}
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  🏢 กรองตามสังกัด
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedFilter("all")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "all"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    แสดงทั้งหมด
                  </button>
                  <button
                    onClick={() => setSelectedFilter("nakhon-sawan")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "nakhon-sawan"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.นครสวรรค์
                  </button>
                  <button
                    onClick={() => setSelectedFilter("uthai-thani")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "uthai-thani"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.อุทัยธานี
                  </button>
                  <button
                    onClick={() => setSelectedFilter("kamphaeng-phet")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "kamphaeng-phet"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.กำแพงเพชร
                  </button>
                  <button
                    onClick={() => setSelectedFilter("tak")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "tak"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.ตาก
                  </button>
                  <button
                    onClick={() => setSelectedFilter("sukhothai")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "sukhothai"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.สุโขทัย
                  </button>
                  <button
                    onClick={() => setSelectedFilter("phitsanulok")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "phitsanulok"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.พิษณุโลก
                  </button>
                  <button
                    onClick={() => setSelectedFilter("phichit")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "phichit"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.พิจิตร
                  </button>
                  <button
                    onClick={() => setSelectedFilter("phetchabun")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "phetchabun"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ปจ.เพชรบูรณ์
                  </button>
                  <button
                    onClick={() => setSelectedFilter("sp-nakhon-sawan")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "sp-nakhon-sawan"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ศป.นครสวรรค์
                  </button>
                  <button
                    onClick={() => setSelectedFilter("sp-phitsanulok")}
                    className={`py-2 px-5 rounded-lg font-semibold transition-colors
                        ${
                          selectedFilter === "sp-phitsanulok"
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                  >
                    ศป.พิษณุโลก
                  </button>
                </div>
              </div>
            </>
          )}

          {/* [*** ใหม่: สถานะกำลังโหลด ***] */}
          {isLoading && (
            <div className="mb-8 bg-white p-12 rounded-lg shadow-sm text-center flex flex-col items-center justify-center">
              {/* ไอคอน Spinner */}
              <svg
                className="animate-spin h-12 w-12 text-red-600 mb-4"
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
              <h2 className="text-xl font-semibold text-gray-700">
                กำลังดึงข้อมูลหมายเหตุ...
              </h2>
            </div>
          )}

          {/* [*** ใหม่: ข้อความไม่พบข้อมูล ***] */}
          {!isLoading && allTableData.length === 0 && (
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm text-center">
              <h2 className="text-xl font-semibold text-gray-700">
                ไม่พบข้อมูล
              </h2>
              <p className="text-gray-500">
                ไม่พบข้อมูลที่ทำการสำหรับช่วงวันที่และสังกัดที่เลือก
              </p>
            </div>
          )}

          {/* [*** แก้ไข: ลบ isTableOpen ***] */}
          {!isLoading && allTableData.length > 0 && (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-8">
              {/* [*** KPI Cards การรายงาน ***] */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-8 pt-8 pb-4">
                <div
                  className="bg-white p-6 rounded-lg shadow-2xl flex flex-col justify-center items-center 
                              transition-all duration-200 hover:-translate-y-1"
                >
                  <h3 className="text-base font-medium text-gray-500 uppercase">
                    อัตราการรายงาน
                  </h3>
                  <p className="text-5xl font-bold text-red-600 mt-2">
                    {" "}
                    {/* [*** แก้ไขสี ***] */}
                    {notesKPIs.complianceRate.toFixed(1)}%
                  </p>
                </div>

                <div
                  className="bg-white p-6 rounded-lg shadow-2xl 
                              transition-all duration-200 hover:-translate-y-1"
                >
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    รายงานแล้ว
                  </h3>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {notesKPIs.reportedOffices.toLocaleString()}
                  </p>
                  {/* [*** แก้ไข: denominator ***] */}
                  <p className="text-sm text-gray-400 mt-1">
                    / {notesKPIs.totalRequiredToReport.toLocaleString()}{" "}
                    ที่ต้องรายงาน
                  </p>
                </div>

                <div
                  className="bg-white p-6 rounded-lg shadow-2xl 
                              transition-all duration-200 hover:-translate-y-1"
                >
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    ยังไม่รายงาน
                  </h3>
                  <p className="text-4xl font-bold text-red-600 mt-2">
                    {notesKPIs.notReportedOffices.toLocaleString()}
                  </p>
                  {/* [*** แก้ไข: denominator ***] */}
                  <p className="text-sm text-gray-400 mt-1">
                    / {notesKPIs.totalRequiredToReport.toLocaleString()}{" "}
                    ที่ต้องรายงาน
                  </p>
                </div>
              </div>

              {/* [*** ใหม่: KPI Cards Top 3 หมายเหตุ ***] */}
              {topNotesKPIs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-8 pb-8 pt-4 border-t border-gray-100">
                  {topNotesKPIs.map((note, index) => (
                    <div
                      key={note.key}
                      className="bg-white p-4 rounded-lg shadow-2xl 
                                  transition-all duration-200 hover:-translate-y-1"
                    >
                      <h3
                        className="text-sm font-medium text-gray-500 uppercase truncate"
                        title={note.label}
                      >
                        อันดับ {index + 1}: {note.label} ({note.key})
                      </h3>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {note.value.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        (
                        {(
                          (note.value / (notesSummary.total || 1)) *
                          100
                        ).toFixed(1)}
                        % ของทั้งหมด)
                      </p>
                    </div>
                  ))}

                  {/* ตัวเติมเต็มกรณีมีน้อยกว่า 3 */}
                  {Array.from({ length: 3 - topNotesKPIs.length }).map(
                    (_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className="bg-white p-4 rounded-lg shadow-inner border border-gray-100 flex items-center justify-center"
                      >
                        <p className="text-sm text-gray-400">
                          {i === 0 && topNotesKPIs.length === 1
                            ? "ไม่มีข้อมูลอันดับ 2"
                            : i === 0 && topNotesKPIs.length === 2
                            ? "ไม่มีข้อมูลอันดับ 3"
                            : i === 1
                            ? "ไม่มีข้อมูลอันดับ 3"
                            : "ไม่มีข้อมูล"}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
              {/* [*** จบส่วน KPI Cards Top 3 ***] */}

              {/* --- [ใหม่] ส่วนแสดงผลแบบตาราง (เพิ่ม overflow-x-auto) --- */}
              {/* [*** ใหม่: เพิ่มข้อความ "ไม่พบผลการค้นหา" ***] */}
              {filteredTableData.length === 0 && allTableData.length > 0 && (
                <div className="p-6 text-center text-gray-500 border-t">
                  ไม่พบที่ทำการที่ตรงกับคำค้นหา "{searchTerm}"
                </div>
              )}

              {filteredTableData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        {/* คอลัมน์หลัก */}
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase sticky left-0 bg-gray-100 z-10">
                          ที่ทำการ
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                          สถานะ
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                          วันที่รายงาน
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                          ยอดรวม
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                          -
                        </th>

                        {/* [ใหม่] 21 คอลัมน์หมายเหตุ */}
                        {REPORT_REASONS.map((reason) => (
                          <th
                            key={reason.key}
                            className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase"
                            title={reason.label}
                          >
                            {reason.key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* [*** แก้ไข: ใช้ filteredTableData ***] */}
                      {filteredTableData.map((row) => (
                        <tr key={row.postal_code} className="hover:bg-gray-50">
                          {/* [แก้ไข] sticky left-0 */}
                          <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10">
                            {row.office_name} ({row.postal_code})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base font-semibold">
                            {/* [*** แก้ไข: Logic สถานะใหม่ ***] */}
                            {row.status === "reported" && (
                              <span className="text-green-600">
                                ✅ รายงานแล้ว
                              </span>
                            )}
                            {row.status === "not_reported" && (
                              <span className="text-red-600">
                                ❌ ยังไม่รายงาน
                              </span>
                            )}
                            {row.status === "no_failure" && (
                              <span className="text-gray-500">
                                - (ไม่มีเหตุ)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                            {row.is_reported
                              ? formatToFullThaiDate(row.report_date)
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800 font-bold">
                            {row.is_reported
                              ? row.total_notes > 0
                                ? row.total_notes.toLocaleString()
                                : "-"
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {row.is_reported && row.total_notes > 0 && (
                              <button
                                onClick={() => handleShowReportDetails(row)}
                                className="bg-red-100 text-red-700 font-semibold py-1 px-3 rounded-full hover:bg-red-200 text-xs" // [*** แก้ไขสี ***]
                              >
                                ดู
                              </button>
                            )}
                          </td>

                          {/* [*** แก้ไข: ดึงข้อมูลจาก notes_data_aggregated ***] */}
                          {REPORT_REASONS.map((reason) => (
                            <td
                              key={reason.key}
                              className="px-6 py-4 whitespace-nowrap text-base text-gray-800"
                            >
                              {row.is_reported
                                ? row.notes_data_aggregated[reason.key] > 0
                                  ? row.notes_data_aggregated[reason.key]
                                  : "-"
                                : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* [*** ใหม่: ส่วนสรุปและกราฟ (Pie Chart + Bar Chart) ***] */}
          {!isLoading && notesSummary.total > 0 && (
            <div className="bg-white rounded-lg shadow-xl p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                สรุปหมายเหตุรวม (สังกัด {filterDisplayNames[selectedFilter]})
              </h2>
              <h3 className="text-lg text-gray-600 mb-6">
                ยอดรวม {notesSummary.total.toLocaleString()} รายการ
              </h3>

              {/* [*** ใหม่: Grid 2-column layout ***] */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* --- Column 1: Pie Chart --- */}
                <div className="w-full max-w-md mx-auto">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                    สัดส่วน (Pie Chart)
                  </h4>
                  <div className="w-full max-w-md mx-auto">
                    <NotesPieChart
                      notesSummary={notesSummary}
                      reasonMap={reasonLabelMap}
                    />
                  </div>
                </div>

                {/* --- Column 2: Bar Chart List --- */}
                <div className="w-full">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                    รายการทั้งหมด (Bar Chart)
                  </h4>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {REPORT_REASONS.map((reason) => ({
                      ...reason,
                      value: notesSummary.data[reason.key] || 0,
                      percentage:
                        ((notesSummary.data[reason.key] || 0) /
                          (notesSummary.total || 1)) *
                        100,
                    }))
                      .filter((reason) => reason.value > 0) // กรองเฉพาะที่มีค่า
                      .sort((a, b) => b.value - a.value) // เรียงจากมากไปน้อย
                      // [*** แก้ไข: เพิ่ม Type ***]
                      .map(
                        (reason: {
                          key: string;
                          label: string;
                          value: number;
                          percentage: number;
                        }) => (
                          <div key={reason.key}>
                            <div className="flex justify-between items-center mb-1">
                              <span
                                className="text-sm font-medium text-gray-700 truncate"
                                title={`${reason.key} - ${reason.label}`}
                              >
                                {reason.key} - {reason.label}
                              </span>
                              <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">
                                {reason.value.toLocaleString()} (
                                {reason.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-red-600 h-2.5 rounded-full" // [*** แก้ไขสี ***]
                                style={{ width: `${reason.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* [*** จบส่วนสรุป ***] */}
        </div>
      </div>

      {/* [ใหม่] Modal สำหรับดูรายละเอียดหมายเหตุ */}
      {isDetailModalOpen && modalDetailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-800">
                รายละเอียดหมายเหตุ
              </h3>
              <button
                onClick={handleCloseDetailModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <h4 className="text-xl font-bold text-red-700">
                {" "}
                {/* [*** แก้ไขสี ***] */}
                {modalDetailData.office_name}
              </h4>
              {/* [*** แก้ไข: แสดง Date Range ***] */}
              <p className="text-lg text-gray-600 mb-4">
                {/* [*** แก้ไข: ใช้ selectedDate ***] */}
                {`ข้อมูลวันที่ ${formatToFullThaiDate(selectedDate)}`}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {REPORT_REASONS.map((reason) => {
                  const value = modalDetailData.notes_data[reason.key] || 0;
                  if (value === 0) return null; // ไม่แสดงถ้าค่าเป็น 0

                  return (
                    <div
                      key={reason.key}
                      className="flex justify-between border-b py-2"
                    >
                      <span className="text-gray-700">
                        {reason.key} - {reason.label}
                      </span>
                      <span className="font-bold text-gray-900">
                        {Number(value).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-red-200">
                {" "}
                {/* [*** แก้ไขสี ***] */}
                <div className="flex justify-between text-lg font-bold">
                  <span>ยอดรวมทั้งหมด:</span>
                  <span>{modalDetailData.total_notes.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={handleCloseDetailModal}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ######################################################################
//   [*** แก้ไข: เพิ่มแท็บใหม่ ***]
// ######################################################################

// [*** ใหม่: Component หน้า "ประสิทธิภาพการโทร" ***]
const CallReportView = ({ active }: ViewProps) => {
  return (
    <div className={`${active ? "block" : "hidden"}`}>
      <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
        <div className="mx-auto">
          {/* --- หัวเรื่อง --- */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              ประสิทธิภาพการโทร
            </h1>
          </div>

          {/* --- เนื้อหา --- */}
          <div className="bg-white rounded-lg shadow-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83M11.42 15.17l.02.02M11.42 15.17L6.87 20.72a2.652 2.652 0 01-3.75 0L1.5 19.17a2.652 2.652 0 010-3.75L7.25 9.67l4.17 4.17zM11.42 15.17l5.83-5.83a2.652 2.652 0 000-3.75L15.17 1.5a2.652 2.652 0 00-3.75 0L5.58 7.33l4.17 4.17 1.67-1.67z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Under Development
            </h2>
            <p className="text-lg text-gray-500">Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ######################################################################
//   Component หลัก (ตัวสลับหน้า)
// ######################################################################
export default function Home() {
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard', 'calls', 'notes'

  return (
    <div>
      {/* --- [ใหม่] เมนูหลัก (Tabs) --- */}
      <div className="bg-white shadow-md p-4 flex space-x-4">
        <button
          onClick={() => setActiveView("dashboard")}
          className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
            activeView === "dashboard"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          ประสิทธิภาพการนำจ่าย
        </button>
        {/* [*** ปุ่มใหม่ ***] */}
        <button
          onClick={() => setActiveView("calls")}
          className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
            activeView === "calls"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          ประสิทธิภาพการโทร
        </button>
        {/* [*** จบปุ่มใหม่ ***] */}
        <button
          onClick={() => setActiveView("notes")}
          className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
            activeView === "notes"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          รายงานหมายเหตุ
        </button>
      </div>
      {/* --- ส่วนแสดงผล (สลับตาม activeView) --- */}
      <DashboardView active={activeView === "dashboard"} />
      <CallReportView active={activeView === "calls"} />{" "}
      {/* [*** เพิ่ม View ใหม่ ***] */}
      <NotesReportView active={activeView === "notes"} />
    </div>
  );
}
