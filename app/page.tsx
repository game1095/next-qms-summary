"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
// --- Import client จากไฟล์ที่เราสร้าง ---
import { supabase } from "../lib/supabaseClient";

// --- Import DatePicker ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// --- Import CSS ที่เราเพิ่งสร้าง ---
import "./datepicker.css";

// [Import Chart.js]
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// ลงทะเบียน components ที่จำเป็นสำหรับ Pie Chart
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// ######################################################################
//   [Types และ Interfaces]
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
  // [*** รองรับคอลัมน์ Q, R, S, T ***]
  colq: number;
  colr: number;
  cols: number;
  colt: number;
}

// ข้อมูลดิบจากตาราง delivery_notes
interface DeliveryNoteRow {
  id?: number;
  report_date: string;
  postal_code: string;
  office_name: string;
  total_notes: number;
  notes_data: { [key: string]: string };
}

// ผลรวมในตาราง Dashboard
interface AggregatedSums {
  sumH: number;
  sumI: number;
  sumK: number;
  sumM: number;
  sumO: number;
  // [*** ผลรวมการโทร ***]
  sumQ: number;
  sumS: number;
}

// ข้อมูลสำหรับตารางในหน้า "รายงานหมายเหตุ"
interface ReportTableRow {
  postal_code: string;
  office_name: string;
  is_reported: boolean;
  status: "reported" | "not_reported" | "no_failure";
  report_date: string | null;
  total_notes: number;
  notes_data_aggregated: { [key: string]: number };
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

// Type สำหรับ Pie Chart
interface NotesSummary {
  data: { [key: string]: number };
  total: number;
}

interface PieChartProps {
  notesSummary: NotesSummary;
  reasonMap: Map<string, string>;
}

// ######################################################################

// --- รายการหมายเหตุ ---
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

// กำหนด Key ของไฟล์ทั้ง 5
const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

// ######################################################################
//   ข้อมูล Filter สังกัด (Global)
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
// ######################################################################

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

// ######################################################################
//   Component สำหรับ Pie Chart
// ######################################################################
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
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: false },
      tooltip: {
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
        formatter: (value: number, context: any) => {
          const percentage = (value / (notesSummary.total || 1)) * 100;
          if (percentage < 5) return null;
          return percentage.toFixed(1) + "%";
        },
        color: "#ffffff",
        font: { weight: "bold" as const, size: 12 },
      },
    },
  };

  return <Pie data={data} options={options} />;
};

// ######################################################################
//   Component สำหรับหน้า Dashboard
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

  useEffect(() => {
    if (active) {
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate, active]);

  // [*** Update: อ่านข้อมูลจากไฟล์ Excel เพิ่มคอลัมน์ Q, R, S, T ***]
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
            // [*** อ่านค่า Q, R, S, T ***]
            valQ: row[16], // Q
            valR: row[17], // R
            valS: row[18], // S
            valT: row[19], // T
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

  // [*** Update: บันทึกข้อมูลลงคอลัมน์ colq...colt ***]
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
      )
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
            // [*** บันทึกลง colq...colt ***]
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

  // [*** Update: Logic รวมข้อมูล (เพิ่ม Q, S) ***]
  const aggregatedData = useMemo((): [string, AggregatedSums][] => {
    const summary = new Map<string, AggregatedSums>();

    // Helper function
    const isServiceMatch = (fileKey: string, filter: string) => {
      if (filter === "all") return true;
      if (filter === "GROUP_EJW")
        return ["E(E)", "E(J)", "E(W)"].includes(fileKey);
      if (filter === "GROUP_COD") return ["E-BCOD", "E-RCOD"].includes(fileKey);
      return fileKey === filter;
    };

    // Logic สำหรับ 'province-summary'
    if (selectedFilter === "province-summary") {
      supabaseData.forEach((item: DeliveryDataRow) => {
        if (!isServiceMatch(item.file_key, selectedServiceFilter)) return;
        const provinceKey = getProvinceKey(item.cole);
        if (provinceKey === "other") return;

        const provinceName = filterDisplayNames[provinceKey] || "ไม่ระบุ";
        const compositeKey = `${provinceKey}||${provinceName}`;

        const valueH = item.valueh || 0;
        const valueI = item.valuei || 0;
        const valueK = item.valuek || 0;
        const valueM = item.valuem || 0;
        const valueO = item.valueo || 0;
        // [*** ดึงค่า Q, S ***]
        const valueQ = item.colq || 0;
        const valueS = item.cols || 0;

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
          sumH: currentSums.sumH + valueH,
          sumI: currentSums.sumI + valueI,
          sumK: currentSums.sumK + valueK,
          sumM: currentSums.sumM + valueM,
          sumO: currentSums.sumO + valueO,
          sumQ: currentSums.sumQ + valueQ,
          sumS: currentSums.sumS + valueS,
        });
      });
      return Array.from(summary.entries());
    }

    // Logic สำหรับ Filter ปกติ
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

        const valueH = item.valueh || 0;
        const valueI = item.valuei || 0;
        const valueK = item.valuek || 0;
        const valueM = item.valuem || 0;
        const valueO = item.valueo || 0;
        // [*** ดึงค่า Q, S ***]
        const valueQ = item.colq || 0;
        const valueS = item.cols || 0;

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
          sumH: currentSums.sumH + valueH,
          sumI: currentSums.sumI + valueI,
          sumK: currentSums.sumK + valueK,
          sumM: currentSums.sumM + valueM,
          sumO: currentSums.sumO + valueO,
          sumQ: currentSums.sumQ + valueQ,
          sumS: currentSums.sumS + valueS,
        });
      }
    });
    return Array.from(summary.entries());
  }, [supabaseData, selectedFilter, selectedServiceFilter]);

  // Logic สรุปผล
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

  // [*** Update: Grand Total เพิ่ม Q, S ***]
  const summaryKPIs = useMemo(() => {
    const totals = { H: 0, I: 0, K: 0, M: 0, O: 0, Q: 0, S: 0 };
    if (!summaryData || summaryData.length === 0) {
      return { ...totals, successRate: 0, failureRate: 0 };
    }
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
    <div className={`${active ? "block" : "hidden"}`}>
      <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
        <div className="mx-auto">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center"
            >
              {isControlsOpen ? "ซ่อน" : "แสดง"} ตั้งค่า
            </button>
          </div>

          {isControlsOpen && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                  รายงานประสิทธิภาพการนำจ่าย และ การโทรนัดหมายนำจ่าย EMS
                  ในประเทศ
                </h1>
                <p className="text-lg text-gray-500 mt-1 flex items-center">
                  Made with ❤️ by Megamind
                </p>
              </div>

              <div className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                      🗓️ เลือกข้อมูล
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          วันที่เริ่มต้น
                        </label>
                        <DatePicker
                          selected={startDate}
                          onChange={(date: Date | null) => setStartDate(date)}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          dateFormat="dd/MM/yyyy"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          วันที่สิ้นสุด
                        </label>
                        <DatePicker
                          selected={endDate}
                          onChange={(date: Date | null) => setEndDate(date)}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          minDate={startDate || undefined}
                          dateFormat="dd/MM/yyyy"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="ค้นหา (รหัสไปรษณีย์ / ที่ทำการ)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5 pl-3 pr-3"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                      ☁️ อัปโหลดข้อมูล
                    </h3>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="py-2.5 px-4 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center shadow-md hover:shadow-lg w-full mt-4"
                    >
                      อัปโหลดข้อมูลใหม่
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    🏢 กรองตามสังกัด
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFilter("all")}
                      className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                        selectedFilter === "all"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {filterDisplayNames["all"]}
                    </button>
                    <button
                      onClick={() => setSelectedFilter("province-summary")}
                      className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                        selectedFilter === "province-summary"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {filterDisplayNames["province-summary"]}
                    </button>
                    {[
                      "nakhon-sawan",
                      "uthai-thani",
                      "kamphaeng-phet",
                      "tak",
                      "sukhothai",
                      "phitsanulok",
                      "phichit",
                      "phetchabun",
                      "sp-nakhon-sawan",
                      "sp-phitsanulok",
                    ].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setSelectedFilter(filter)}
                        className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                          selectedFilter === filter
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {filterDisplayNames[filter]}
                      </button>
                    ))}
                  </div>

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
                    <button
                      onClick={() => setSelectedServiceFilter("GROUP_EJW")}
                      className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                        selectedServiceFilter === "GROUP_EJW"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      รวมบริการ EMS (ยกเว้น COD)
                    </button>
                    <button
                      onClick={() => setSelectedServiceFilter("GROUP_COD")}
                      className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
                        selectedServiceFilter === "GROUP_COD"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      รวม COD
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
                </div>
              </div>
            </>
          )}

          {isLoading && (
            <div className="mb-8 bg-white p-12 rounded-lg shadow-sm text-center">
              กำลังดึงข้อมูล...
            </div>
          )}

          {!isLoading && summaryData.length > 0 && (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center pt-8 px-8">
                รายงานประสิทธิภาพการนำจ่าย และ การโทรนัดหมายนำจ่าย EMS
                ในประเทศของที่ทำการในสังกัด {filterDisplayNames[selectedFilter]}
              </h2>
              <p className="text-2xl text-gray-600 text-center mb-6">
                {formatDateToISO(startDate) === formatDateToISO(endDate)
                  ? `ประจำวันที่ ${formatToFullThaiDate(startDate)}`
                  : `ประจำวันที่ ${formatToFullThaiDate(
                      startDate
                    )} ถึง ${formatToFullThaiDate(endDate)}`}
              </p>

              {/* [*** Section 1: ประสิทธิภาพการนำจ่าย ***] */}
              <h3 className="text-xl font-bold text-gray-700 mb-4 px-8 pt-4">
                1. ประสิทธิภาพการนำจ่าย
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5 px-8 pb-8">
                <div className="bg-white p-6 rounded-lg shadow-2xl flex flex-col justify-center items-center hover:-translate-y-1 transition-all">
                  <h3 className="text-base font-medium text-gray-500 uppercase">
                    อัตราความสำเร็จ (M / H)
                  </h3>
                  <p className="text-5xl font-bold text-green-600 mt-2">
                    {summaryKPIs.successRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    สำเร็จ (M)
                  </h3>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {summaryKPIs.M.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    ไม่สำเร็จ (O)
                  </h3>
                  <p className="text-4xl font-bold text-red-600 mt-2">
                    {summaryKPIs.O.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500">
                    เตรียมการนำจ่าย (H)
                  </h3>
                  <p className="text-2xl font-semibold text-blue-600 mt-1">
                    {summaryKPIs.H.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500">
                    รายงานผล (K)
                  </h3>
                  <p className="text-2xl font-semibold text-blue-600 mt-1">
                    {summaryKPIs.K.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500">
                    ไม่รายงานผล (I)
                  </h3>
                  <p className="text-2xl font-semibold text-red-600 mt-1">
                    {summaryKPIs.I.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* [*** Section 2: ประสิทธิภาพการโทร ***] */}
              <h3 className="text-xl font-bold text-gray-700 mb-4 px-8 pt-4">
                2. ประสิทธิภาพการโทร
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 px-8 pb-8">
                {/* Card 1: โทรสำเร็จ (ชิ้น) - เขียว */}
                <div className="bg-white p-6 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    โทรสำเร็จ (ชิ้น)
                  </h3>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {(summaryKPIs.Q || 0).toLocaleString()}
                  </p>
                </div>

                {/* Card 2: โทรสำเร็จ (%) - เขียว */}
                <div className="bg-white p-6 rounded-lg shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-center items-center">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    โทรสำเร็จ (%)
                  </h3>
                  <p className="text-5xl font-bold text-green-600 mt-2">
                    {(summaryKPIs.H > 0
                      ? (summaryKPIs.Q / summaryKPIs.H) * 100
                      : 0
                    ).toFixed(1)}
                    %
                  </p>
                </div>

                {/* Card 3: โทรไม่สำเร็จ (ชิ้น) - แดง */}
                <div className="bg-white p-6 rounded-lg shadow-2xl hover:-translate-y-1 transition-all">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    โทรไม่สำเร็จ (ชิ้น)
                  </h3>
                  <p className="text-4xl font-bold text-red-600 mt-2">
                    {(summaryKPIs.S || 0).toLocaleString()}
                  </p>
                </div>

                {/* Card 4: โทรไม่สำเร็จ (%) - แดง */}
                <div className="bg-white p-6 rounded-lg shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-center items-center">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    โทรไม่สำเร็จ (%)
                  </h3>
                  <p className="text-5xl font-bold text-red-600 mt-2">
                    {(summaryKPIs.H > 0
                      ? (summaryKPIs.S / summaryKPIs.H) * 100
                      : 0
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        {isProvinceSummary ? "ชื่อสังกัด" : "ที่ทำการ"}
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        เตรียมการนำจ่าย
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        ไม่รายงานผล
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        รายงานผล
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        สำเร็จ
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        % สำเร็จ (M/H)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        ไม่สำเร็จ
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        % ไม่สำเร็จ (O/H)
                      </th>
                      {/* [*** คอลัมน์การโทร: ปรับ Header เป็นสีมาตรฐาน ***] */}
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        โทรสำเร็จ (ชิ้น)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        โทรสำเร็จ (%)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        โทรไม่สำเร็จ (ชิ้น)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                        โทรไม่สำเร็จ (%)
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
                      // [*** Calc Call Rates ***]
                      const callSuccessRate =
                        sums.sumH > 0 ? (sums.sumQ / sums.sumH) * 100 : 0;
                      const callFailRate =
                        sums.sumH > 0 ? (sums.sumS / sums.sumH) * 100 : 0;

                      let bgClass =
                        rowSuccessRate >= 99
                          ? "bg-green-200"
                          : rowSuccessRate >= 95
                          ? "bg-orange-200"
                          : "bg-red-200";

                      // [*** Logic สีตัวอักษรการโทร ***]
                      // < 50% -> แดงหนา, >= 50% -> เขียวหนา
                      const callRateColorClass =
                        callSuccessRate < 50
                          ? "text-red-600 font-bold"
                          : "text-green-600 font-bold";

                      return (
                        <tr
                          key={compositeKey}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-base text-gray-900 font-semibold ${bgClass} ${
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

                          {/* [*** Call Columns: ปรับให้จำนวนเป็นตัวปกติ (ไม่หนา) ***] */}
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                            {(sums.sumQ || 0).toLocaleString()}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-base ${callRateColorClass}`}
                          >
                            {callSuccessRate.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                            {(sums.sumS || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                            {callFailRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr className="font-bold">
                      <td className="px-6 py-4 text-right text-base text-gray-800 uppercase">
                        ยอดรวม
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

                      {/* [*** Footer Call Columns: ปรับสีตาม Logic เดียวกัน ***] */}
                      {(() => {
                        const footerCallSuccessRate =
                          summaryKPIs.H > 0
                            ? (summaryKPIs.Q / summaryKPIs.H) * 100
                            : 0;
                        const footerCallFailRate =
                          summaryKPIs.H > 0
                            ? (summaryKPIs.S / summaryKPIs.H) * 100
                            : 0;
                        const footerColorClass =
                          footerCallSuccessRate < 50
                            ? "text-red-600"
                            : "text-green-600";

                        return (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                              {(summaryKPIs.Q || 0).toLocaleString()}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-base font-bold ${footerColorClass}`}
                            >
                              {footerCallSuccessRate.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                              {(summaryKPIs.S || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
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
          )}

          {/* --- Modal Upload --- */}
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
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      เลือกวันที่
                    </h3>
                    <DatePicker
                      selected={uploadDate}
                      onChange={(date: Date | null) => setUploadDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="mt-1"
                      disabled={isUploading}
                    />
                  </div>
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {key}
                          </label>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => handleUploadFileChange(e, key)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                            disabled={isUploading}
                          />
                          {uploadFileNames[key] && (
                            <p className="text-xs text-green-600 mt-2 truncate">
                              {uploadFileNames[key]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
                        ? "bg-gray-400"
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

          {/* --- Modal Details --- */}
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
                  <div className="mb-4">
                    <button
                      onClick={handleOpenReportModal}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                    >
                      รายงานหมายเหตุนำจ่าย
                    </button>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          บริการ
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          COD
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          เตรียมการ
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          สำเร็จ
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                          ไม่สำเร็จ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {modalData.details.map((detail, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-base text-gray-800">
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
                      ))}
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

          {/* --- Modal Report Form --- */}
          {isReportModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-800">
                    บันทึกรายงานหมายเหตุนำจ่าย
                  </h3>
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
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {modalData.title}
                      </h4>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        วันที่รายงาน
                      </label>
                      <DatePicker
                        selected={reportDate}
                        onChange={(date) => setReportDate(date)}
                        dateFormat="dd/MM/yyyy"
                        className="mt-1"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {REPORT_REASONS.map((reason) => (
                      <div key={reason.key}>
                        <label className="block text-sm font-medium text-gray-700">
                          {reason.key} - {reason.label}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={reportFormData[reason.key]}
                          onChange={(e) =>
                            handleReportFormChange(e, reason.key)
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5"
                          disabled={isSubmittingReport}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      ยอดรวมที่กรอก:{" "}
                      <strong
                        className={
                          reportTotalSum === modalData.summary.O &&
                          reportTotalSum > 0
                            ? "text-green-600"
                            : "text-red-600"
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
                  <div>
                    <button
                      onClick={handleCloseReportModal}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg mr-3"
                      disabled={isSubmittingReport}
                    >
                      ยกเลิก
                    </button>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ######################################################################
//   Notes Report View (เดิม) - ปรับแก้เล็กน้อยให้ทำงานร่วมกันได้
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

  const topNotesKPIs = useMemo(() => {
    if (!notesSummary || notesSummary.total === 0) return [];
    return Object.entries(notesSummary.data)
      .map(([key, value]) => ({
        key,
        value,
        label: reasonLabelMap.get(key) || "Unknown",
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [notesSummary]);

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
    <div className={`${active ? "block" : "hidden"}`}>
      <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
        <div className="mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              สถานะการรายงานหมายเหตุนำจ่าย
            </h1>
            <p className="text-lg text-gray-500 mt-1">
              ตรวจสอบสถานะการรายงานของที่ทำการในสังกัด{" "}
              {filterDisplayNames[selectedFilter]}
            </p>
          </div>
          <div className="mb-4 flex justify-end space-x-2">
            <button
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center"
            >
              {isControlsOpen ? "ซ่อน" : "แสดง"} ตั้งค่า
            </button>
          </div>
          {isControlsOpen && (
            <>
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  🗓️ เลือกวันที่ & ค้นหา
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เลือกวันที่
                    </label>
                    <DatePicker
                      selected={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="w-full mt-4">
                  <input
                    type="text"
                    placeholder="ค้นหา..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5 pl-3 pr-3"
                  />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  🏢 กรองตามสังกัด
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedFilter("all")}
                    className={`py-2 px-5 rounded-lg font-semibold ${
                      selectedFilter === "all"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    แสดงทั้งหมด
                  </button>
                  {[
                    "nakhon-sawan",
                    "uthai-thani",
                    "kamphaeng-phet",
                    "tak",
                    "sukhothai",
                    "phitsanulok",
                    "phichit",
                    "phetchabun",
                    "sp-nakhon-sawan",
                    "sp-phitsanulok",
                  ].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`py-2 px-5 rounded-lg font-semibold ${
                        selectedFilter === filter
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {filterDisplayNames[filter]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {isLoading && (
            <div className="mb-8 bg-white p-12 text-center">
              กำลังดึงข้อมูลหมายเหตุ...
            </div>
          )}
          {!isLoading && allTableData.length === 0 && (
            <div className="mb-8 bg-white p-6 text-center">ไม่พบข้อมูล</div>
          )}
          {!isLoading && allTableData.length > 0 && (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-8 pt-8 pb-4">
                <div className="bg-white p-6 rounded-lg shadow-2xl flex flex-col items-center">
                  <h3 className="text-base font-medium text-gray-500 uppercase">
                    อัตราการรายงาน
                  </h3>
                  <p className="text-5xl font-bold text-red-600 mt-2">
                    {notesKPIs.complianceRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-2xl">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    รายงานแล้ว
                  </h3>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {notesKPIs.reportedOffices.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    / {notesKPIs.totalRequiredToReport.toLocaleString()}{" "}
                    ที่ต้องรายงาน
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-2xl">
                  <h3 className="text-sm font-medium text-gray-500 uppercase">
                    ยังไม่รายงาน
                  </h3>
                  <p className="text-4xl font-bold text-red-600 mt-2">
                    {notesKPIs.notReportedOffices.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    / {notesKPIs.totalRequiredToReport.toLocaleString()}{" "}
                    ที่ต้องรายงาน
                  </p>
                </div>
              </div>
              {topNotesKPIs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-8 pb-8 pt-4 border-t border-gray-100">
                  {topNotesKPIs.map((note, index) => (
                    <div
                      key={note.key}
                      className="bg-white p-4 rounded-lg shadow-2xl"
                    >
                      <h3 className="text-sm font-medium text-gray-500 uppercase truncate">
                        อันดับ {index + 1}: {note.label} ({note.key})
                      </h3>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {note.value.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {filteredTableData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
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
                      {filteredTableData.map((row) => (
                        <tr key={row.postal_code} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10">
                            {row.office_name} ({row.postal_code})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base font-semibold">
                            {row.status === "reported" ? (
                              <span className="text-green-600">
                                ✅ รายงานแล้ว
                              </span>
                            ) : row.status === "not_reported" ? (
                              <span className="text-red-600">
                                ❌ ยังไม่รายงาน
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
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
                                className="bg-red-100 text-red-700 font-semibold py-1 px-3 rounded-full hover:bg-red-200 text-xs"
                              >
                                ดู
                              </button>
                            )}
                          </td>
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
          {!isLoading && notesSummary.total > 0 && (
            <div className="bg-white rounded-lg shadow-xl p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                สรุปหมายเหตุรวม
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="w-full max-w-md mx-auto">
                  <NotesPieChart
                    notesSummary={notesSummary}
                    reasonMap={reasonLabelMap}
                  />
                </div>
                <div className="w-full">
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {REPORT_REASONS.map((reason) => ({
                      ...reason,
                      value: notesSummary.data[reason.key] || 0,
                      percentage:
                        ((notesSummary.data[reason.key] || 0) /
                          (notesSummary.total || 1)) *
                        100,
                    }))
                      .filter((reason) => reason.value > 0)
                      .sort((a, b) => b.value - a.value)
                      .map((reason) => (
                        <div key={reason.key}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {reason.key} - {reason.label}
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {reason.value.toLocaleString()} (
                              {reason.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-red-600 h-2.5 rounded-full"
                              style={{ width: `${reason.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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
                {modalDetailData.office_name}
              </h4>
              <p className="text-lg text-gray-600 mb-4">
                ข้อมูลวันที่ {formatToFullThaiDate(selectedDate)}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {REPORT_REASONS.map((reason) => {
                  const value = modalDetailData.notes_data[reason.key] || 0;
                  if (value === 0) return null;
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

export default function Home() {
  const [activeView, setActiveView] = useState("dashboard");
  return (
    <div>
      <div className="bg-white shadow-md p-4 flex space-x-4">
        <button
          onClick={() => setActiveView("dashboard")}
          className={`py-2 px-5 rounded-lg font-semibold transition-colors ${
            activeView === "dashboard"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          ประสิทธิภาพการนำจ่าย และ การโทรนัดหมายนำจ่าย
        </button>
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
      <DashboardView active={activeView === "dashboard"} />
      <NotesReportView active={activeView === "notes"} />
    </div>
  );
}
