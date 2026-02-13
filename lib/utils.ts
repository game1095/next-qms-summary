import { ProvinceDefinition, RegionConfig } from "../app/types";

// --- Configuration Section (Hardcoded for REG 6) ---
export const reg6Provinces: ProvinceDefinition[] = [
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
      "61190",
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

export const CURRENT_CONFIG: RegionConfig = {
  regionId: "reg6",
  regionName: "ปข.6",
  provinces: reg6Provinces,
};

export const FILE_KEYS = ["E(E)", "E(J)", "E(W)", "E-BCOD", "E-RCOD"];

export const getDisplayNamesFromConfig = () => {
  const map: { [key: string]: string } = {
    all: `ทุกที่ทำการ`,
    "province-summary": `สรุปตาม ปจ.`,
  };
  CURRENT_CONFIG.provinces.forEach((p) => {
    map[p.key] = p.label;
  });
  return map;
};

export const getCodStatus = (code: string | number) => {
  const c = String(code).toUpperCase();
  if (c === "R") return "COD(แดง)";
  if (c === "B") return "COD(น้ำเงิน)";
  if (c === "N") return "ไม่";
  return "ไม่";
};

export const formatDateToISO = (date: Date | null) => {
  if (!date) return null;
  const yearAD = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${yearAD}-${pad(month)}-${pad(day)}`;
};

export const formatToFullThaiDate = (date: Date | string | null) => {
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

export const formatShortThaiDate = (dateStr: string | Date) => {
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
