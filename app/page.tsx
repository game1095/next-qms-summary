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

// กำหนด Key ของไฟล์ทั้ง 5
const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

// --- [ใหม่] สร้าง Array สำหรับฟอร์มหมายเหตุ ---
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
// ------------------------------------------

// สร้าง Set รหัสไปรษณีย์ทั้งหมด
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

// สร้าง Map สำหรับชื่อ Filter ที่จะแสดง
const filterDisplayNames = {
  all: "ปข.6",
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

// [หมายเหตุ] ส่วนนี้สำหรับ Modal อัปโหลด (ยังคงต้องใช้)
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = [
  { value: 1, name: "มกราคม" },
  { value: 2, name: "กุมภาพันธ์" },
  { value: 3, name: "มีนาคม" },
  { value: 4, name: "เมษายน" },
  { value: 5, name: "พฤษภาคม" },
  { value: 6, name: "มิถุนายน" },
  { value: 7, name: "กรกฎาคม" },
  { value: 8, name: "สิงหาคม" },
  { value: 9, name: "กันยายน" },
  { value: 10, name: "ตุลาคม" },
  { value: 11, name: "พฤศจิกายน" },
  { value: 12, name: "ธันวาคม" },
];
const years = [2568, 2569, 2570];

// ฟังก์ชันสำหรับแปลงค่า Col G
const getCodStatus = (code) => {
  const c = String(code).toUpperCase();
  if (c === "R") return "COD(แดง)";
  if (c === "B") return "COD(น้ำเงิน)";
  if (c === "N") return "ไม่";
  return "ไม่";
};

// [แก้ไข] ฟังก์ชันช่วยแปลงวันที่ (Date object) เป็น YYYY-MM-DD (AD)
const formatDateToISO = (date) => {
  if (!date) return null;
  const yearAD = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const pad = (num) => String(num).padStart(2, "0");
  return `${yearAD}-${pad(month)}-${pad(day)}`;
};

// [ใหม่] ฟังก์ชันแปลงวันที่เป็น พ.ศ. (สำหรับแสดงผล)
const formatToFullThaiDate = (date) => {
  if (!date) return "";
  const day = date.getDate();
  const monthValue = date.getMonth() + 1;
  const yearBE = date.getFullYear() + 543;
  const monthName = months.find((m) => m.value === monthValue)?.name || "";
  return `${day} ${monthName} ${yearBE}`;
};

// [ใหม่] สร้าง State เริ่มต้นสำหรับฟอร์มหมายเหตุ
const initialReportFormData = REPORT_REASONS.reduce((acc, reason) => {
  acc[reason.key] = ""; // เริ่มด้วยค่าว่าง
  return acc;
}, {});

export default function Home() {
  // State สำหรับเก็บข้อมูลที่ดึงจาก Supabase
  const [supabaseData, setSupabaseData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับ Modal อัปโหลด (ยังคงเหมือนเดิม)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFilesData, setUploadFilesData] = useState({});
  const [uploadFileNames, setUploadFileNames] = useState({});
  const [uploadDay, setUploadDay] = useState(1);
  const [uploadMonth, setUploadMonth] = useState(1);
  const [uploadYear, setUploadYear] = useState(years[0]);

  // State สำหรับ Modal รายละเอียด
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    details: [],
    summary: { H: 0, M: 0, O: 0 },
  });

  // --- [ใหม่] State สำหรับ Modal รายงานหมายเหตุ ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(null);
  const [reportFormData, setReportFormData] = useState(initialReportFormData);
  // ------------------------------------------------

  // State สำหรับ Filter ที่เลือก
  const [selectedFilter, setSelectedFilter] = useState("all");

  // State สำหรับการค้นหา
  const [searchTerm, setSearchTerm] = useState("");

  // State สำหรับ เปิด/ปิด ส่วนควบคุม
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  // --- [ใหม่] State วัน/เดือน/ปี (สำหรับ Fetch ข้อมูล) ---
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  // ---

  // [แก้ไข] useEffect เพื่อตั้งค่าเป็น "เมื่อวานนี้" (แก้ Hydration Error)
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // [แก้ไข] ตั้งค่าวันที่สำหรับหน้าหลัก (Date Range) เป็น "เมื่อวานนี้"
    setStartDate(new Date(yesterday)); // สร้าง Date object ใหม่
    setEndDate(new Date(yesterday)); // สร้าง Date object ใหม่

    // [ใหม่] ตั้งค่าวันที่สำหรับ Modal รายงานหมายเหตุ
    setReportDate(new Date(yesterday));

    // ตั้งค่าวันที่เริ่มต้นสำหรับ Modal อัปโหลด (Single Day)
    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;
    let yearBE = yesterday.getFullYear() + 543;
    if (!years.includes(yearBE)) {
      yearBE = years[0];
    }
    setUploadDay(day);
    setUploadMonth(month);
    setUploadYear(yearBE);
  }, []);

  // [แก้ไข] ฟังก์ชันสำหรับดึงข้อมูลจาก Supabase (ใช้ Date Range)
  const fetchData = async (start, end) => {
    setIsLoading(true);
    setSupabaseData([]); // เคลียร์ข้อมูลเก่าก่อน

    if (!start || !end) {
      setIsLoading(false);
      return; // ไม่ต้องดึงถ้าวันที่ไม่ครบ
    }

    const isoStartDate = formatDateToISO(start);
    const isoEndDate = formatDateToISO(end);

    console.log(`Fetching data from ${isoStartDate} to ${isoEndDate}`);

    const { data, error } = await supabase
      .from("delivery_data")
      .select("*")
      .gte("report_date", isoStartDate) // มากกว่าหรือเท่ากับ
      .lte("report_date", isoEndDate); // น้อยกว่าหรือเท่ากับ

    if (error) {
      console.error("Error fetching data:", error);
      alert("ไม่สามารถดึงข้อมูลได้: " + error.message);
    } else {
      setSupabaseData(data || []);
    }
    setIsLoading(false);
  };

  // [แก้ไข] useEffect สำหรับดึงข้อมูลเมื่อวันที่ (หน้าหลัก) เปลี่ยน
  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]);

  /**
   * ฟังก์ชันสำหรับจัดการการอัปโหลดไฟล์ (ใน Modal อัปโหลด)
   * (โค้ดส่วนนี้ไม่เปลี่ยนแปลง)
   */
  const handleUploadFileChange = (e, fileKey) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadFileNames((prev) => ({ ...prev, [fileKey]: file.name }));
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const slicedData = jsonData.slice(1, 1000);

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

  /**
   * [เวอร์ชันล่าสุด] ฟังก์ชันสำหรับยืนยันการอัปโหลด (ป้องกันการอัปโหลดซ้ำ)
   * (โค้ดส่วนนี้ไม่เปลี่ยนแปลง)
   */
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
      // [หมายเหตุ] ฟังก์ชันนี้ยังคงใช้ formatDateToISO แบบเดิม (รับ d,m,y)
      // เราต้องสร้างฟังก์ชันนั้นขึ้นมาใหม่ชั่วคราว
      const formatUploadDateToISO = (day, month, yearBE) => {
        const yearAD = yearBE - 543;
        const pad = (num) => String(num).padStart(2, "0");
        return `${yearAD}-${pad(month)}-${pad(day)}`;
      };
      const reportDate = formatUploadDateToISO(
        uploadDay,
        uploadMonth,
        uploadYear
      );

      // 1. ตรวจสอบข้อมูลซ้ำ
      console.log(`Checking for existing data on ${reportDate}...`);
      const { count, error: countError } = await supabase
        .from("delivery_data")
        .select("id", { count: "exact", head: true })
        .eq("report_date", reportDate);

      if (countError) {
        throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้: " + countError.message);
      }
      if (count > 0) {
        alert(
          `พบข้อมูลสำหรับวันที่ ${uploadDay}/${uploadMonth}/${uploadYear} อยู่ในระบบแล้ว\n(ระบบไม่อนุญาตให้อัปโหลดทับ) กรุณาเลือกวันอื่น`
        );
        setIsUploading(false);
        return;
      }

      // 2. เตรียมข้อมูลใหม่
      const rowsToInsert = [];
      Object.entries(uploadFilesData).forEach(([fileKey, fileData]) => {
        fileData.forEach((item) => {
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

      // 3. อัปโหลด
      console.log(`Inserting ${rowsToInsert.length} rows...`);
      const { error: insertError } = await supabase
        .from("delivery_data")
        .insert(rowsToInsert);
      if (insertError) {
        throw new Error("ไม่สามารถอัปโหลดข้อมูลได้: " + insertError.message);
      }

      alert(
        `อัปโหลดข้อมูลสำหรับวันที่ ${uploadDay}/${uploadMonth}/${uploadYear} สำเร็จ! (${rowsToInsert.length} รายการ)`
      );

      // 4. ปิด Modal
      setIsUploadModalOpen(false);
      setUploadFilesData({});
      setUploadFileNames({});

      // 5. สั่งให้หน้าหลัก Fetch ข้อมูลใหม่ (ให้ไปที่วันที่เพิ่งอัปโหลด)
      const uploadedDate = new Date(reportDate + "T00:00:00"); // แปลง ISO กลับเป็น Date
      setStartDate(uploadedDate);
      setEndDate(uploadedDate);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Logic สรุปผล (ขั้นตอนที่ 1: รวมข้อมูลตามสังกัด)
   * (โค้ดส่วนนี้ไม่เปลี่ยนแปลง)
   */
  const aggregatedData = useMemo(() => {
    const summary = new Map();

    // 1. เลือก Set ฟิลเตอร์
    let filterSet = null;
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

    // 2. วนลูปจาก supabaseData
    supabaseData.forEach((item) => {
      // 3. ตรวจสอบฟิลเตอร์ (ใช้ cole)
      if (filterSet && !filterSet.has(String(item.cole))) {
        return;
      }

      // 4. สร้าง Key (ใช้ cole, colf)
      const keyE = String(item.cole);
      const keyF = String(item.colf);
      const compositeKey = `${keyE}||${keyF}`;

      // 5. ดึงค่า (ใช้ valueh, valuei, valuek, valuem, valueo)
      const valueH = item.valueh || 0;
      const valueI = item.valuei || 0;
      const valueK = item.valuek || 0;
      const valueM = item.valuem || 0;
      const valueO = item.valueo || 0;

      // 6. สรุปผล
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

    // 7. แปลงเป็น Array (ยังไม่เรียงลำดับ)
    return Array.from(summary.entries());
  }, [supabaseData, selectedFilter]);

  /**
   * Logic สรุปผล (ขั้นตอนที่ 2: ค้นหาและเรียงลำดับ)
   * (โค้ดส่วนนี้ไม่เปลี่ยนแปลง)
   */
  const summaryData = useMemo(() => {
    // 1. กรองข้อมูลด้วย searchTerm
    const filteredArray = aggregatedData.filter(([compositeKey, sums]) => {
      if (searchTerm.trim() === "") {
        return true; // ถ้าไม่มีการค้นหา ให้แสดงทั้งหมด
      }
      const [keyE, keyF] = compositeKey.split("||");
      const lowerSearchTerm = searchTerm.toLowerCase().trim();

      // ค้นหาทั้งรหัสไปรษณีย์ (keyE) และชื่อที่ทำการ (keyF)
      return (
        keyE.includes(lowerSearchTerm) ||
        keyF.toLowerCase().includes(lowerSearchTerm)
      );
    });

    // 2. เรียงลำดับข้อมูลที่กรองแล้ว
    filteredArray.sort((a, b) => {
      const sumsA = a[1];
      const sumsB = b[1];
      const rateA = sumsA.sumH > 0 ? sumsA.sumM / sumsA.sumH : 0;
      const rateB = sumsB.sumH > 0 ? sumsB.sumM / sumsB.sumH : 0;
      return rateA - rateB; // จากน้อยไปมาก
    });

    return filteredArray;
  }, [aggregatedData, searchTerm]);

  /**
   * Logic คำนวณ Grand Total
   * (โค้ดส่วนนี้ไม่เปลี่ยนแปลง)
   */
  const summaryKPIs = useMemo(() => {
    const totals = { H: 0, I: 0, K: 0, M: 0, O: 0 };
    if (!summaryData || summaryData.length === 0) {
      return { ...totals, successRate: 0, failureRate: 0 };
    }
    summaryData.forEach(([, sums]) => {
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

  // --- [ใหม่] Logic สำหรับคำนวณผลรวมใน Modal หมายเหตุ ---
  const reportTotalSum = useMemo(() => {
    // Get all the values from the form state
    const values = Object.values(reportFormData);

    // Sum them up. Parse empty strings as 0.
    return values.reduce((acc, value) => {
      return acc + (parseInt(value) || 0);
    }, 0);
  }, [reportFormData]);
  // ----------------------------------------------------

  /**
   * ฟังก์ชันสำหรับเปิด Modal (ใช้ lowercase)
   * (โค้ดส่วนนี้ไม่เปลี่ยนแปลง)
   */
  const handleShowDetails = (compositeKey) => {
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

  // --- [ใหม่] ฟังก์ชันสำหรับ Modal หมายเหตุ ---
  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  // [*** นี่คือส่วนที่ปรับปรุง ***]
  // สร้างฟังก์ชันใหม่สำหรับปิด Modal หมายเหตุ (เพื่อรีเซ็ตฟอร์ม)
  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportFormData(initialReportFormData); // รีเซ็ตฟอร์มกลับเป็นค่าเริ่มต้น
  };
  // [*** จบส่วนที่ปรับปรุง ***]

  const handleReportFormChange = (e, key) => {
    const { value } = e.target;
    // อนุญาตเฉพาะตัวเลข หรือค่าว่าง
    if (value === "" || /^[0-9\b]+$/.test(value)) {
      setReportFormData((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleSubmitReport = () => {
    // TODO: ส่งข้อมูลนี้ไปบันทึก (เช่น Supabase)
    console.log("Submitting report data:", {
      date: reportDate,
      office: modalData.title, // ส่งชื่อที่ทำการไปด้วย
      data: reportFormData,
    });
    alert("บันทึกข้อมูลหมายเหตุสำเร็จ (จำลอง)");
    handleCloseReportModal(); // [แก้ไข] ใช้ฟังก์ชันใหม่เพื่อปิดและรีเซ็ต
  };
  // ----------------------------------------

  // ----------------------------------------------------
  //   ส่วนหน้าเว็บ (JSX)
  // ----------------------------------------------------
  return (
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
                        onChange={(date) => setStartDate(date)}
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
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate} // ป้องกันการเลือกวันที่สิ้นสุดก่อนวันเริ่ม
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
                      // [หมายเหตุ] Modal อัปโหลดยังคงใช้ค่าเริ่มต้น (เมื่อวานนี้)
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

              {/* Card 3: ตัวกรองสังกัด (เต็มความกว้าง) */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
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
            <h2 className="text-xl font-semibold text-gray-700">ไม่พบข้อมูล</h2>
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
                ไม่พบรหัสไปรษณีย์หรือที่ทำการที่ตรงกับ "{searchTerm}"
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
                      รหัสไปรษณีย์
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider"
                    >
                      ที่ทำการ
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
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-base ${officeTextClassName} ${officeBgClassName} font-semibold cursor-pointer hover:underline`}
                          onClick={() => handleShowDetails(compositeKey)}
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
                      colSpan="2"
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
              {/* 1. เลือกวันที่สำหรับอัปโหลด (ยังเป็น Dropdown) */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  เลือกวันที่ (ของข้อมูลที่จะอัปโหลด)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="upload-day"
                      className="block text-sm font-medium text-gray-700"
                    >
                      วันที่
                    </label>
                    <select
                      id="upload-day"
                      value={uploadDay}
                      onChange={(e) => setUploadDay(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5"
                      disabled={isUploading}
                    >
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="upload-month"
                      className="block text-sm font-medium text-gray-700"
                    >
                      เดือน
                    </label>
                    <select
                      id="upload-month"
                      value={uploadMonth}
                      onChange={(e) => setUploadMonth(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5"
                      disabled={isUploading}
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="upload-year"
                      className="block text-sm font-medium text-gray-700"
                    >
                      ปี พ.ศ.
                    </label>
                    <select
                      id="upload-year"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5"
                      disabled={isUploading}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. ช่องอัปโหลดไฟล์ */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  อัปโหลดไฟล์ (Excel)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {FILE_KEYS.map((key) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg border">
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
              </p>

              {/* === [ใหม่] ปุ่มสำหรับเปิด Modal หมายเหตุ === */}
              <div className="mb-4">
                <button
                  onClick={handleOpenReportModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
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
                <tbody className="bg-white divide-y divide-gray-20S00">
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
                        colSpan="5"
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
                      colSpan="2"
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
                    เลือกวันที่
                  </label>
                  <DatePicker
                    id="report-date"
                    selected={reportDate}
                    onChange={(date) => setReportDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="mt-1" // ใช้ CSS จาก datepicker.css
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
                      inputMode="numeric" // เพิ่ม inputMode
                      pattern="[0-9]*" // เพิ่ม pattern
                      id={`reason-${reason.key}`}
                      value={reportFormData[reason.key]}
                      onChange={(e) => handleReportFormChange(e, reason.key)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base py-2.5"
                      autoComplete="off"
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
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmitReport}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
            {/* [*** จบส่วนที่ปรับปรุง ***] */}
          </div>
        </div>
      )}
      {/* === [*** จบ Modal ตัวที่ 2 ***] === */}
    </div>
  );
}
