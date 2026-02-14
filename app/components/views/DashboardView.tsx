import {
  formatDateToISO,
  formatToFullThaiDate,
  CURRENT_CONFIG,
  FILE_KEYS,
  getDisplayNamesFromConfig,
  formatShortThaiDate,
  getCodStatus,
} from "../../../lib/utils";
import {
  DeliveryDataRow,
  AggregatedSums,
  ViewProps,
  SortKey,
  SortDirection,
} from "../../types";
import { supabase } from "../../../lib/supabaseClient";
import React, { useState, useMemo, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import Swal from "sweetalert2";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";

import FilterButton from "../ui/FilterButton";
import KPICard from "../ui/KPICard";
import { DeliveryTrendChart, CallTrendChart } from "../dashboard/TrendCharts";
import PerformanceTable from "../dashboard/PerformanceTable";
import UploadModal from "../dashboard/UploadModal";
import DetailsModal from "../dashboard/DetailsModal";

import { showUnreportedModal } from "../dashboard/UnreportedModal";
import DailyInsights from "../dashboard/DailyInsights";
import WelcomeGuide from "../dashboard/WelcomeGuide";
import CountUp from "../common/CountUp";

const DashboardView = ({ active, onOpenRankingView }: ViewProps & { onOpenRankingView?: () => void }) => {
  const [supabaseData, setSupabaseData] = useState<DeliveryDataRow[]>([]);
  const [prevSupabaseData, setPrevSupabaseData] = useState<DeliveryDataRow[]>(
    [],
  );
  const [monthSupabaseData, setMonthSupabaseData] = useState<DeliveryDataRow[]>(
    [],
  );

  const [comparisonLabel, setComparisonLabel] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isWelcomeGuideOpen, setIsWelcomeGuideOpen] = useState(false);
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
    type: "service" as "service" | "office",
    details: [] as any[],
    summary: { H: 0, M: 0, O: 0, Q: 0, S: 0 },
    filterLabel: "",
  });

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
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

  useEffect(() => {
    // Check for welcome guide
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcomeGuide");
    if (!hasSeenWelcome) {
       // Small delay to let the dashboard load first
       setTimeout(() => setIsWelcomeGuideOpen(true), 1000);
    }
  }, []);

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
        fetchRange(isoMonthStart!, isoMonthEnd!),
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

  // Listen for ranking page data requests
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "REQUEST_RANKING_DATA" && event.source) {
        (event.source as Window).postMessage(
          {
            type: "RANKING_DATA",
            currentData: supabaseData,
            prevData: prevSupabaseData,
            selectedFilter,
            selectedServiceFilter,
          },
          "*"
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [supabaseData, prevSupabaseData, selectedFilter, selectedServiceFilter]);

  // Scroll to top logic
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
  }, [monthSupabaseData, selectedFilter, selectedServiceFilter]);

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

  const handleShowUnreported = () => {
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
      .sort((a, b) => b[1] - a[1])
      .map(
        ([name, count], index) =>
          `<tr class="border-b hover:bg-red-50">
            <td class="text-left py-2 px-4">${index + 1}. ${name}</td>
            <td class="text-right py-2 px-4 font-bold text-red-600">${count.toLocaleString()}</td>
           </tr>`,
      )
      .join("");

    showUnreportedModal(summaryKPIs, unreportedList);
  };

  const handleShowDetails = (compositeKey: string) => {
    const [keyE, keyF] = compositeKey.split("||");
    const isProvSummary = selectedFilter === "province-summary";
    const title = isProvSummary
      ? `รายละเอียด: ${keyF}`
      : `รายละเอียด: ${keyE} - ${keyF}`;

    const subSummaryMap = new Map();
    const totalSummary = { H: 0, M: 0, O: 0, Q: 0, S: 0 };

    supabaseData.forEach((item) => {
      // Check Service Filter
      const cleanFileKey = String(item.file_key).trim();
      let isServiceMatch = false;
      if (selectedServiceFilter === "all") isServiceMatch = true;
      else if (selectedServiceFilter === "GROUP_EJW")
        isServiceMatch = ["E(E)", "E(J)", "E(W)"].includes(cleanFileKey);
      else if (selectedServiceFilter === "GROUP_COD")
        isServiceMatch = ["E-BCOD", "E-RCOD"].includes(cleanFileKey);
      else isServiceMatch = cleanFileKey === selectedServiceFilter;

      if (!isServiceMatch) return;

      let isMatch = false;
      if (isProvSummary) {
        if (getProvinceKey(String(item.cole)) === keyE) {
          isMatch = true;
        }
      } else {
        if (String(item.cole) === keyE && String(item.colf) === keyF) {
          isMatch = true;
        }
      }

      if (isMatch) {
        if (isProvSummary) {
          const officeName = String(item.colf).trim();
          const subKey = officeName;
          const valueH = item.valueh || 0;
          const valueM = item.valuem || 0;
          const valueO = item.valueo || 0;
          const valueQ = item.colq || 0;
          const valueS = item.cols || 0;

          totalSummary.H += valueH;
          totalSummary.M += valueM;
          totalSummary.O += valueO;
          totalSummary.Q += valueQ;
          totalSummary.S += valueS;

          const currentSubSums = subSummaryMap.get(subKey) || {
            H: 0,
            M: 0,
            O: 0,
            Q: 0,
            S: 0,
          };
          subSummaryMap.set(subKey, {
            H: currentSubSums.H + valueH,
            M: currentSubSums.M + valueM,
            O: currentSubSums.O + valueO,
            Q: currentSubSums.Q + valueQ,
            S: currentSubSums.S + valueS,
          });
        } else {
          const service = item.cold;
          const codRaw = item.colg;
          const codDisplay = getCodStatus(codRaw);
          const subKey = `${service}||${codDisplay}||${codRaw}`;
          const valueH = item.valueh || 0;
          const valueM = item.valuem || 0;
          const valueO = item.valueo || 0;
          const valueQ = item.colq || 0;
          const valueS = item.cols || 0;

          totalSummary.H += valueH;
          totalSummary.M += valueM;
          totalSummary.O += valueO;
          totalSummary.Q += valueQ;
          totalSummary.S += valueS;

          const currentSubSums = subSummaryMap.get(subKey) || {
            H: 0,
            M: 0,
            O: 0,
            Q: 0,
            S: 0,
          };
          subSummaryMap.set(subKey, {
            H: currentSubSums.H + valueH,
            M: currentSubSums.M + valueM,
            O: currentSubSums.O + valueO,
            Q: currentSubSums.Q + valueQ,
            S: currentSubSums.S + valueS,
          });
        }
      }
    });

    const detailsArray = Array.from(subSummaryMap.entries())
      .map(([key, sums]) => {
        if (isProvSummary) {
          return { officeName: key, ...sums };
        } else {
          const [service, codDisplay, codRaw] = key.split("||");
          return { service, codDisplay, codRaw, ...sums };
        }
      })
      .sort((a, b) => {
        // Sort by Success Rate Descending
        const rateA = a.H > 0 ? a.M / a.H : 0;
        const rateB = b.H > 0 ? b.M / b.H : 0;
        return rateB - rateA;
      });

    const filterLabel =
      selectedServiceFilter === "all"
        ? "ทุกบริการ"
        : selectedServiceFilter === "GROUP_EJW"
          ? "EMS (ไม่รวม COD)"
          : selectedServiceFilter === "GROUP_COD"
            ? "รวม COD"
            : selectedServiceFilter;

    setModalData({
      title: title,
      type: isProvSummary ? "office" : "service",
      details: detailsArray,
      summary: totalSummary,
      filterLabel,
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
          backgroundColor: "#FFFFFF",
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Ensure state clears immediately
  };

  const isProvinceSummary = selectedFilter === "province-summary";

  return (
    <div
      className={`${active ? "block" : "hidden"} space-y-8 pb-20 bg-slate-50 min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900`}
    >
      <div ref={reportRef} className="bg-slate-50 min-h-screen relative">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent opacity-80"></div>
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-100/30 blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-[400px] h-[400px] rounded-full bg-purple-100/30 blur-3xl"></div>
        </div>

        <div className="space-y-4 pt-4 px-4 sm:px-6 lg:px-8 max-w-full mx-auto relative z-10 transition-all duration-300">
          {/* Header Section */}
          {/* Header Section - Sticky */}
          <div className="sticky top-4 z-40 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden group transition-all duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
            
            {/* Title and Date */}
            <div className="space-y-2 pl-2">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug">
                รายงานประสิทธิภาพการนำจ่าย EMS{" "}
                <span className="text-blue-600">
                  ({filterDisplayNames[selectedFilter]})
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-xs text-slate-500 font-medium px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {formatDateToISO(startDate) === formatDateToISO(endDate)
                    ? formatToFullThaiDate(startDate)
                    : `${formatToFullThaiDate(startDate)} - ${formatToFullThaiDate(endDate)}`}
                </span>
              </div>
            </div>

            {/* Combined Actions */}
            <div className="flex gap-2 items-center flex-wrap justify-end">
              {!isBatchExporting && isControlsOpen && (
                <>
                  <button
                    onClick={handleBatchExport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span>Capture รายงาน</span>
                  </button>

                  {onOpenRankingView && (
                    <button
                      onClick={() => {
                        onOpenRankingView();
                        setTimeout(() => {
                          const rankingWindow = window.open("/ranking", "_blank");
                          if (rankingWindow) {
                            setTimeout(() => {
                              rankingWindow.postMessage({
                                type: "RANKING_DATA",
                                currentData: supabaseData,
                                prevData: prevSupabaseData,
                                selectedFilter,
                                selectedServiceFilter,
                              }, "*");
                            }, 500);
                          }
                        }, 100);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"/></svg>
                      <span>อันดับ</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
              >
                {isControlsOpen ? "ซ่อน" : "ตัวกรอง"}
                <svg className={`w-4 h-4 transition-transform ${isControlsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </button>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="ออกจากระบบ"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          </div>
          {/* Filter Section */}
          {/* Filter Section */}
          {isControlsOpen && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Date Controls */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        ช่วงเวลาข้อมูล
                      </label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            const end = new Date();
                            const start = new Date();
                            start.setDate(end.getDate() - 7);
                            setStartDate(start);
                            setEndDate(end);
                          }}
                          className="px-3 py-1 text-[10px] font-bold bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                          7 วัน
                        </button>
                        <button
                          onClick={() => {
                            const date = new Date();
                            const start = new Date(date.getFullYear(), date.getMonth(), 1);
                            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                            setStartDate(start);
                            setEndDate(end);
                          }}
                          className="px-3 py-1 text-[10px] font-bold bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                          เดือนนี้
                        </button>
                        <button
                          onClick={() => {
                            const date = new Date();
                            const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
                            const end = new Date(date.getFullYear(), date.getMonth(), 0);
                            setStartDate(start);
                            setEndDate(end);
                          }}
                          className="px-3 py-1 text-[10px] font-bold bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                          เดือนก่อน
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1/2 relative group">
                        <DatePicker
                          selected={startDate}
                          onChange={(date: Date | null) => setStartDate(date)}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          dateFormat="dd/MM/yyyy"
                          className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-sm font-semibold focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-all shadow-sm group-hover:shadow-md"
                        />
                      </div>
                      <div className="w-1/2 relative group">
                        <DatePicker
                          selected={endDate}
                          onChange={(date: Date | null) => setEndDate(date)}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          minDate={startDate || undefined}
                          dateFormat="dd/MM/yyyy"
                          className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-sm font-semibold focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-all shadow-sm group-hover:shadow-md"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-xl text-sm font-bold transition-all border border-blue-200/60 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-3 group"
                  >
                    <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
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
                    </div>
                    อัปโหลดไฟล์ Excel
                  </button>
                </div>

                {/* Filters */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        เลือกพื้นที่ / ค้นหา
                      </label>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
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
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </span>
                        <input
                          type="text"
                          placeholder="พิมพ์ชื่อที่ทำการเพื่อค้นหา..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-12 py-3 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:ring-blue-500 focus:border-blue-500 w-full shadow-sm hover:shadow-md transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
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

                  <div className="pt-6 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
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
            </div>
          )}
          {!isLoading && summaryData.length > 0 && (
            <>
              <DailyInsights
                currentData={supabaseData}
                prevData={prevSupabaseData}
                selectedFilter={selectedFilter}
                selectedServiceFilter={selectedServiceFilter}
              />
              
              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 h-96">
                 {trendData.length > 0 && (
                   <>
                     <DeliveryTrendChart trendData={trendData} />
                     <CallTrendChart trendData={trendData} />
                   </>
                 )}
              </div>

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

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <KPICard
                  title="อัตราความสำเร็จ"
                  value={<CountUp end={summaryKPIs.successRate} decimals={1} suffix="%" />}
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
                  value={<CountUp end={summaryKPIs.M} />}
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
                  value={<CountUp end={summaryKPIs.O} />}
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
                  value={<CountUp end={summaryKPIs.H} />}
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
                  value={<CountUp end={summaryKPIs.K} />}
                  trend={getComparison(summaryKPIs.K, prevKPIs.K)}
                  comparisonLabel={comparisonLabel}
                  type="primary"
                />
                <KPICard
                  title="ไม่รายงานผล (I)"
                  value={<CountUp end={summaryKPIs.I} />}
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
                  onClick={handleShowUnreported}
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
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPICard
                  title="โทรสำเร็จ (%)"
                  value={<CountUp end={currentCallSuccessRate} decimals={1} suffix="%" />}
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
                  value={<CountUp end={summaryKPIs.Q || 0} />}
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
                  value={<CountUp end={currentCallFailRate} decimals={1} suffix="%" />}
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
                  value={<CountUp end={summaryKPIs.S || 0} />}
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

              <PerformanceTable
                summaryData={summaryData}
                summaryKPIs={summaryKPIs}
                isProvinceSummary={isProvinceSummary}
                sortConfig={sortConfig}
                onSort={handleSort}
                onShowDetails={handleShowDetails}
              />
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

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        uploadDate={uploadDate}
        setUploadDate={setUploadDate}
        uploadFileNames={uploadFileNames}
        onFileChange={handleUploadFileChange}
        onSubmit={handleSubmitUpload}
        isUploading={isUploading}
      />

      <DetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={modalData}
      />

      <WelcomeGuide 
        isOpen={isWelcomeGuideOpen}
        onClose={() => setIsWelcomeGuideOpen(false)}
      />

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-4 bg-slate-900 text-white rounded-full shadow-lg transition-all duration-500 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-90 group ${
          showScrollTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <svg 
          className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default DashboardView;
