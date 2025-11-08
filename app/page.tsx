"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";

// กำหนด Key ของไฟล์ทั้ง 5
const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

// [จุดที่ 1] สร้าง Map รหัส QMS
const qmsMap = {
  "60000": "373",
  "60001": "970",
  "60002": "163",
  "60110": "1064",
  "60120": "194",
  "60130": "629",
  "60140": "267",
  "60150": "826",
  "60160": "296",
  "60170": "65",
  "60180": "426",
  "60190": "266",
  "60210": "179",
  "60220": "694",
  "60230": "49",
  "60240": "1070",
  "60250": "278",
  "60260": "161",
  "428": "22802",
  "61000": "1153",
  "61110": "1058",
  "61120": "284",
  "61130": "1052",
  "61140": "525",
  "61150": "972",
  "61160": "832",
  "61170": "83",
  "61180": "731",
  "62000": "33",
  "62110": "646",
  "62120": "96",
  "62130": "70",
  "62140": "962",
  "62150": "356",
  "62160": "585",
  "62170": "829",
  "62180": "109",
  "62190": "337",
  "62210": "790",
  "63000": "264",
  "63110": "760",
  "63111": "21894",
  "63120": "503",
  "63130": "1001",
  "63140": "753",
  "63150": "321",
  "63160": "626",
  "63170": "1157",
  "63180": "21889",
  "58": "",
  "154": "",
  "64000": "1026",
  "64110": "969",
  "64120": "929",
  "64130": "927",
  "64140": "500",
  "64150": "345",
  "64160": "129",
  "64170": "1",
  "64180": "912",
  "64190": "293",
  "64210": "732",
  "64220": "528",
  "64230": "536",
  "65000": "670",
  "65001": "1134",
  "65010": "21596",
  "65110": "436",
  "65120": "367",
  "65130": "856",
  "65140": "474",
  "65150": "634",
  "65160": "871",
  "65170": "188",
  "65180": "1061",
  "65190": "415",
  "65210": "414",
  "65220": "62",
  "65230": "873",
  "65240": "195",
  "66000": "665",
  "66110": "262",
  "66120": "473",
  "66130": "682",
  "66140": "1000",
  "66150": "280",
  "66160": "995",
  "66170": "1113",
  "66180": "855",
  "66190": "687",
  "66210": "854",
  "66220": "32",
  "66230": "7",
  "67000": "679",
  "67110": "1095",
  "67120": "1094",
  "67130": "881",
  "67140": "1072",
  "67150": "176",
  "67160": "545",
  "67170": "910",
  "67180": "672",
  "67190": "218",
  "67210": "852",
  "67220": "382",
  "67230": "862",
  "67240": "861",
  "67250": "306",
  "67260": "409",
  "67270": "79",
  "67280": "135",
  "60010": "899",
  "287": "22115",
};

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

// สร้าง Array สำหรับ วัน/เดือน/ปี
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

export default function Home() {
  const [filesData, setFilesData] = useState({});
  const [fileNames, setFileNames] = useState({});

  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    details: [],
    summary: { H: 0, M: 0, O: 0 },
    qmsCode: "",
  });

  // State สำหรับ Filter ที่เลือก
  const [selectedFilter, setSelectedFilter] = useState("all");

  // State สำหรับ เปิด/ปิด ส่วนควบคุม
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  // State วัน/เดือน/ปี (ตั้งค่าเริ่มต้นเป็นค่าคงที่)
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(years[0]); // 2568

  // useEffect เพื่อตั้งค่าเป็น "เมื่อวานนี้" (แก้ Hydration Error)
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;
    let yearBE = yesterday.getFullYear() + 543;

    if (!years.includes(yearBE)) {
      yearBE = years[0];
    }

    setSelectedDay(day);
    setSelectedMonth(month);
    setSelectedYear(yearBE);
  }, []); // [] ทำงาน 1 ครั้งหลังโหลด

  /**
   * ฟังก์ชันสำหรับจัดการการอัปโหลดไฟล์ (เหมือนเดิม)
   */
  const handleFileUpload = (e, fileKey) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileNames((prev) => ({ ...prev, [fileKey]: file.name }));
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const slicedData = jsonData.slice(1, 1000);

      const filteredData = slicedData
        .map((row) => ({
          colE: row[4],
          colF: row[5],
          colD: row[3],
          colG: row[6],
          valueH: row[7],
          valueI: row[8],
          valueK: row[10],
          valueM: row[12],
          valueO: row[14],
        }))
        .filter(
          (item) =>
            item.colE !== null &&
            item.colE !== undefined &&
            item.colE !== "" &&
            item.colF !== null &&
            item.colF !== undefined &&
            item.colF !== ""
        );

      setFilesData((prev) => ({ ...prev, [fileKey]: filteredData }));
    };
    reader.readAsArrayBuffer(file);
  };

  /**
   * Logic สรุปผล (เหมือนเดิม)
   */
  const summaryData = useMemo(() => {
    const summary = new Map();

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

    Object.values(filesData).forEach((fileData) => {
      fileData.forEach((item) => {
        if (filterSet && !filterSet.has(String(item.colE))) {
          return;
        }

        const keyE = String(item.colE);
        const keyF = String(item.colF);
        const compositeKey = `${keyE}||${keyF}`;

        const valueH = parseFloat(item.valueH) || 0;
        const valueI = parseFloat(item.valueI) || 0;
        const valueK = parseFloat(item.valueK) || 0;
        const valueM = parseFloat(item.valueM) || 0;
        const valueO = parseFloat(item.valueO) || 0;

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
    });
    return Array.from(summary.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [filesData, selectedFilter]);

  /**
   * Logic คำนวณ Grand Total (เหมือนเดิม)
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

  // หาชื่อเดือนที่เลือก (เหมือนเดิม)
  const selectedMonthName = useMemo(() => {
    return months.find((m) => m.value === selectedMonth)?.name || "";
  }, [selectedMonth]);

  /**
   * ฟังก์ชันสำหรับเปิด Modal (เหมือนเดิม)
   */
  const handleShowDetails = (compositeKey) => {
    const [keyE, keyF] = compositeKey.split("||");
    const title = `รายละเอียด: ${keyE} - ${keyF}`;

    const subSummaryMap = new Map();
    const totalSummary = { H: 0, M: 0, O: 0 };
    const qmsCode = qmsMap[keyE] || "";

    Object.values(filesData).forEach((fileData) => {
      fileData.forEach((item) => {
        if (String(item.colE) === keyE && String(item.colF) === keyF) {
          // [Logic ที่แก้ไข]
          const service = item.colD
            ? String(item.colD).replace(/\s/g, "")
            : "N/A";

          let codRaw = String(item.colG).toUpperCase();
          if (
            !codRaw ||
            codRaw === "NULL" ||
            codRaw === "UNDEFINED" ||
            codRaw.trim() === "N"
          ) {
            codRaw = "N";
          }
          const codDisplay = getCodStatus(codRaw);

          const subKey = `${service}||${codDisplay}||${codRaw}`;

          const valueH = parseFloat(item.valueH) || 0;
          const valueM = parseFloat(item.valueM) || 0;
          const valueO = parseFloat(item.valueO) || 0;

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
      qmsCode: qmsCode,
    });
    setIsModalOpen(true);
  };

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
            {isControlsOpen ? "ซ่อน" : "แสดง"} ตั้งค่า (อัปโหลด/ฟิลเตอร์)
          </button>
        </div>

        {/* H1 และกล่องควบคุม */}
        {isControlsOpen && (
          <>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              สรุปผลการนำจ่าย (Executive Dashboard)
            </h1>

            <div className="mb-8">
              {/* === ส่วนอัปโหลดไฟล์ === */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {FILE_KEYS.map((key) => (
                  <div key={key} className="bg-white p-4 rounded-lg shadow-sm">
                    <label
                      htmlFor={`file-${key}`}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      ไฟล์: <strong>{key}</strong>
                    </label>
                    <input
                      id={`file-${key}`}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => handleFileUpload(e, key)}
                      className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-red-50 file:text-red-700
                                hover:file:bg-red-100
                                cursor-pointer"
                    />
                    {fileNames[key] && (
                      <p
                        className="text-xs text-green-600 mt-2 truncate"
                        title={fileNames[key]}
                      >
                        {fileNames[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* ส่วน Filter */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  ตัวกรอง
                </h2>

                {/* แถวที่ 1: สังกัด */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    สังกัด
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

                {/* แถวที่ 2: วันที่ */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    วันที่
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Day */}
                    <div>
                      <label
                        htmlFor="day-select"
                        className="block text-sm font-medium text-gray-700"
                      >
                        วันที่
                      </label>
                      <select
                        id="day-select"
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5"
                      >
                        {days.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Month */}
                    <div>
                      <label
                        htmlFor="month-select"
                        className="block text-sm font-medium text-gray-700"
                      >
                        เดือน
                      </label>
                      <select
                        id="month-select"
                        value={selectedMonth}
                        onChange={(e) =>
                          setSelectedMonth(Number(e.target.value))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5"
                      >
                        {months.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Year */}
                    <div>
                      <label
                        htmlFor="year-select"
                        className="block text-sm font-medium text-gray-700"
                      >
                        ปี พ.ศ.
                      </label>
                      <select
                        id="year-select"
                        value={selectedYear}
                        onChange={(e) =>
                          setSelectedYear(Number(e.target.value))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-base py-2.5"
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
              </div>
            </div>
          </>
        )}

        {/* ข้อความกรณี Filter แล้วไม่พบข้อมูล */}
        {filesData["E(E)"] && summaryData.length === 0 && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-sm text-center">
            <h2 className="text-xl font-semibold text-gray-700">ไม่พบข้อมูล</h2>
            <p className="text-gray-500">
              กรุณาอัปโหลดไฟล์ หรือเลือกตัวกรองอื่น
            </p>
          </div>
        )}

        {/* กล่องรายงาน (KPI + ตาราง) */}
        {summaryData.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-8">
            {/* --- 1. หัวข้อ --- */}
            <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center pt-8 px-8">
              รายงานประสิทธิภาพการนำจ่าย EMS ในประเทศของที่ทำการในสังกัด{" "}
              {filterDisplayNames[selectedFilter]}
            </h2>
            {/* [แสดงวันที่] */}
            <p className="text-2xl text-gray-600 text-center mb-6">
              ประจำวันที่ {selectedDay} {selectedMonthName} {selectedYear}
            </p>

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
                      รหัส QMS
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
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800">
                          {qmsMap[keyE] || ""}
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
                      colSpan="3"
                      className="px-6 py-4 text-right text-base text-gray-800 uppercase"
                    >
                      ยอดรวมทั้งหมด (Grand Total)
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

      {/* 💡 [จุดที่ 10: อัปเดต] Modal (เพิ่มเงื่อนไข E(E)+R และ E(E)+B) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
            {" "}
            {/* ขยายเป็น max-w-5xl */}
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
                    <th className="px-4 py-2 text-left text-sm font-bold text-gray-700 uppercase">
                      QMS Link
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modalData.details.length > 0 ? (
                    modalData.details.map((detail, index) => {
                      // --- [Logic ใหม่: สร้าง Link] ---
                      let qmsLink = null;

                      if (
                        detail.service === "E(E)" &&
                        detail.codRaw === "N" &&
                        modalData.qmsCode
                      ) {
                        qmsLink = `https://qms.thailandpost.com/Web/Performance/QCDUnsuccessDeliveryReport.aspx?o=${modalData.qmsCode}&d=${selectedDay}&m=${selectedMonth}&y=${selectedYear}&t=1&u=0`;
                      } else if (
                        detail.service === "E(J)" &&
                        detail.codRaw === "N" &&
                        modalData.qmsCode
                      ) {
                        qmsLink = `https://qms.thailandpost.com/Web/Performance/QCDUnsuccessDeliveryReport.aspx?o=${modalData.qmsCode}&d=${selectedDay}&m=${selectedMonth}&y=${selectedYear}&t=115&u=0`;
                      } else if (
                        detail.service === "E(W)" &&
                        detail.codRaw === "N" &&
                        modalData.qmsCode
                      ) {
                        qmsLink = `https://qms.thailandpost.com/Web/Performance/QCDUnsuccessDeliveryReport.aspx?o=${modalData.qmsCode}&d=${selectedDay}&m=${selectedMonth}&y=${selectedYear}&t=120&u=0`;
                      }
                      // [ใหม่] E(E) + COD(น้ำเงิน)
                      else if (
                        detail.service === "E(E)" &&
                        detail.codRaw === "B" &&
                        modalData.qmsCode
                      ) {
                        qmsLink = `https://qms.thailandpost.com/Web/Performance/QCDUnsuccessDeliveryReport.aspx?o=${modalData.qmsCode}&d=${selectedDay}&m=${selectedMonth}&y=${selectedYear}&t=201&u=0`;
                      }
                      // [ใหม่] E(E) + COD(แดง)
                      else if (
                        detail.service === "E(E)" &&
                        detail.codRaw === "R" &&
                        modalData.qmsCode
                      ) {
                        qmsLink = `https://qms.thailandpost.com/Web/Performance/QCDUnsuccessDeliveryReport.aspx?o=${modalData.qmsCode}&d=${selectedDay}&m=${selectedMonth}&y=${selectedYear}&t=301&u=0`;
                      }
                      // --- [จบ Logic ใหม่] ---

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
                          {/* [ใหม่] ปุ่ม QMS ในแถว */}
                          <td className="px-4 py-3 text-base text-center">
                            {qmsLink ? (
                              <a
                                href={qmsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-lg text-sm transition-colors"
                              >
                                QMS
                              </a>
                            ) : (
                              <button
                                disabled
                                className="bg-gray-300 text-gray-500 font-semibold py-1 px-3 rounded-lg text-sm cursor-not-allowed"
                              >
                                QMS
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
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
                    <td></td> {/* <-- ช่องว่างสำหรับคอลัมน์ QMS */}
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* [ปุ่มปิด] */}
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
    </div>
  );
}
