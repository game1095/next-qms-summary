import React, { useMemo } from "react";
import { DeliveryDataRow } from "../../types";
import { CURRENT_CONFIG, FILE_KEYS } from "../../../lib/utils";

interface DailyInsightsProps {
  currentData: DeliveryDataRow[];
  prevData: DeliveryDataRow[];
  selectedFilter: string;
  selectedServiceFilter: string;
}

const DailyInsights = ({
  currentData,
  prevData,
  selectedFilter,
  selectedServiceFilter,
}: DailyInsightsProps) => {
  const insights = useMemo(() => {
    if (currentData.length === 0) return [];

    // --- Filter data based on selectedFilter and selectedServiceFilter ---
    const filterDataBySelection = (data: DeliveryDataRow[]) => {
      let filtered = data;

      // 1. Filter by Province/Office
      if (selectedFilter !== "all" && selectedFilter !== "province-summary") {
        const province = CURRENT_CONFIG.provinces.find(
          (p) => p.key === selectedFilter
        );
        if (province) {
          filtered = filtered.filter((item) =>
            province.codes.has(String(item.cole))
          );
        }
      }

      // 2. Filter by Service Type
      if (selectedServiceFilter !== "all") {
        if (selectedServiceFilter === "GROUP_EJW") {
          // EMS (ไม่รวม COD)
          filtered = filtered.filter((item) =>
            ["E(E)", "E(J)", "E(W)"].includes(item.file_key)
          );
        } else if (selectedServiceFilter === "GROUP_COD") {
          // รวม COD
          filtered = filtered.filter((item) =>
            ["E-BCOD", "E-RCOD"].includes(item.file_key)
          );
        } else {
          // Specific service
          filtered = filtered.filter(
            (item) => item.file_key === selectedServiceFilter
          );
        }
      }

      return filtered;
    };

    const filteredCurrentData = filterDataBySelection(currentData);
    const filteredPrevData = filterDataBySelection(prevData);

    if (filteredCurrentData.length === 0) return [];

    const messages: {
      type: "success" | "warning" | "danger" | "info";
      text: string;
      icon?: React.ReactNode;
    }[] = [];

    // --- Helper Functions ---
    const calculateMetrics = (data: DeliveryDataRow[]) => {
      const metrics = {
        H: data.reduce((sum, item) => sum + (item.valueh || 0), 0),
        M: data.reduce((sum, item) => sum + (item.valuem || 0), 0),
        O: data.reduce((sum, item) => sum + (item.valueo || 0), 0),
        I: data.reduce((sum, item) => sum + (item.valuei || 0), 0),
        Q: data.reduce((sum, item) => sum + (item.colq || 0), 0),
        S: data.reduce((sum, item) => sum + (item.cols || 0), 0),
      };
      return {
        ...metrics,
        successRate: metrics.H > 0 ? (metrics.M / metrics.H) * 100 : 0,
        callSuccessRate:
          metrics.Q + metrics.S > 0
            ? (metrics.Q / (metrics.Q + metrics.S)) * 100
            : 0,
        unreportedRate: metrics.H > 0 ? (metrics.I / metrics.H) * 100 : 0,
      };
    };

    const currentMetrics = calculateMetrics(filteredCurrentData);
    const prevMetrics = calculateMetrics(filteredPrevData);

    // --- 1. Overall Delivery Performance Trend ---
    const deliveryDiff = currentMetrics.successRate - prevMetrics.successRate;
    if (Math.abs(deliveryDiff) >= 0.1) {
      if (deliveryDiff > 0) {
        messages.push({
          type: "success",
          text: `📦 ประสิทธิภาพการนำจ่ายเพิ่มขึ้น +${deliveryDiff.toFixed(2)}% (ปัจจุบัน ${currentMetrics.successRate.toFixed(2)}%)`,
          icon: <span className="text-emerald-500 text-lg">📈</span>,
        });
      } else {
        messages.push({
          type: "warning",
          text: `📦 ประสิทธิภาพการนำจ่ายลดลง ${deliveryDiff.toFixed(2)}% (ปัจจุบัน ${currentMetrics.successRate.toFixed(2)}%)`,
          icon: <span className="text-rose-500 text-lg">📉</span>,
        });
      }
    }

    // --- 2. Call Performance Analysis ---
    const callDiff =
      currentMetrics.callSuccessRate - prevMetrics.callSuccessRate;
    if (currentMetrics.Q + currentMetrics.S >= 50) {
      if (Math.abs(callDiff) >= 1) {
        if (callDiff > 0) {
          messages.push({
            type: "success",
            text: `📞 ประสิทธิภาพการโทรดีขึ้น +${callDiff.toFixed(1)}% (${currentMetrics.callSuccessRate.toFixed(1)}%)`,
          });
        } else {
          messages.push({
            type: "warning",
            text: `📞 ประสิทธิภาพการโทรลดลง ${callDiff.toFixed(1)}% (${currentMetrics.callSuccessRate.toFixed(1)}%)`,
          });
        }
      }
    }

    // --- 3. Unreported Items Warning ---
    if (currentMetrics.I > 0) {
      const unreportedPercent = currentMetrics.unreportedRate;
      if (unreportedPercent >= 5) {
        messages.push({
          type: "danger",
          text: `🚨 มี ${currentMetrics.I.toLocaleString()} ชิ้นยังไม่รายงานผล (${unreportedPercent.toFixed(1)}%) ต้องเร่งดำเนินการ!`,
          icon: <span className="text-rose-500 text-lg">⚠️</span>,
        });
      } else if (unreportedPercent >= 1) {
        messages.push({
          type: "info",
          text: `📋 มี ${currentMetrics.I.toLocaleString()} ชิ้นยังไม่รายงานผล (${unreportedPercent.toFixed(1)}%)`,
        });
      }
    }

    // --- 4. Volume Analysis ---
    const volumeDiff = currentMetrics.H - prevMetrics.H;
    const volumeChangePercent =
      prevMetrics.H > 0 ? (volumeDiff / prevMetrics.H) * 100 : 0;
    if (prevMetrics.H > 0 && Math.abs(volumeChangePercent) >= 20) {
      if (volumeChangePercent > 0) {
        messages.push({
          type: "info",
          text: `📊 ปริมาณงานเพิ่มขึ้น ${volumeChangePercent.toFixed(0)}% (${currentMetrics.H.toLocaleString()} ชิ้น)`,
        });
      } else {
        messages.push({
          type: "info",
          text: `📊 ปริมาณงานลดลง ${Math.abs(volumeChangePercent).toFixed(0)}% (${currentMetrics.H.toLocaleString()} ชิ้น)`,
        });
      }
    }

    // --- 5. Office/Province Level Analysis ---
    const getEntityKey = (item: DeliveryDataRow) => {
      if (selectedFilter === "all" || selectedFilter === "province-summary") {
        for (const p of CURRENT_CONFIG.provinces) {
          if (p.codes.has(String(item.cole))) return p.label;
        }
        return "อื่นๆ";
      } else {
        return String(item.colf).trim();
      }
    };

    const groupData = (data: DeliveryDataRow[]) => {
      const map = new Map<string, { H: number; M: number; I: number }>();
      data.forEach((item) => {
        const key = getEntityKey(item);
        const curr = map.get(key) || { H: 0, M: 0, I: 0 };
        map.set(key, {
          H: curr.H + (item.valueh || 0),
          M: curr.M + (item.valuem || 0),
          I: curr.I + (item.valuei || 0),
        });
      });
      return map;
    };

    const currentMap = groupData(filteredCurrentData);
    const prevMap = groupData(filteredPrevData);

    let maxGain = { name: "", diff: -Infinity, rate: 0 };
    let maxDrop = { name: "", diff: Infinity, rate: 0 };
    let dropCount = 0;
    let perfectCount = 0;

    currentMap.forEach((curr, key) => {
      const prev = prevMap.get(key);
      const currRate = curr.H > 0 ? (curr.M / curr.H) * 100 : 0;

      // Count perfect performers (100% success rate with significant volume)
      if (currRate >= 100 && curr.H >= 10) perfectCount++;

      if (!prev || prev.H === 0 || curr.H < 10) return;

      const prevRate = (prev.M / prev.H) * 100;
      const itemDiff = currRate - prevRate;

      if (itemDiff > maxGain.diff) {
        maxGain = { name: key, diff: itemDiff, rate: currRate };
      }
      if (itemDiff < maxDrop.diff) {
        maxDrop = { name: key, diff: itemDiff, rate: currRate };
      }

      if (currRate < 95) dropCount++;
    });

    // Perfect Performers Recognition
    if (perfectCount > 0) {
      const entityType =
        selectedFilter === "all" || selectedFilter === "province-summary"
          ? "จังหวัด"
          : "ที่ทำการ";
      messages.push({
        type: "success",
        text: `🌟 มี ${perfectCount} ${entityType} ที่ทำได้ 100% สมบูรณ์แบบ!`,
        icon: <span className="text-yellow-500 text-lg">⭐</span>,
      });
    }

    // Top Performer
    if (maxGain.diff > 1) {
      messages.push({
        type: "success",
        text: `👏 ${maxGain.name} พัฒนาได้ดีเยี่ยม! +${maxGain.diff.toFixed(2)}% (${maxGain.rate.toFixed(2)}%)`,
      });
    }

    // Critical Drop
    if (maxDrop.diff < -2) {
      messages.push({
        type: "danger",
        text: `⚠️ ${maxDrop.name} ต้องเร่งแก้ไข ตก ${maxDrop.diff.toFixed(2)}% (เหลือ ${maxDrop.rate.toFixed(2)}%)`,
      });
    }

    // Low Performance Count
    if (dropCount > 0) {
      const entityType =
        selectedFilter === "all" || selectedFilter === "province-summary"
          ? "จังหวัด"
          : "ที่ทำการ";
      messages.push({
        type: "info",
        text: `📌 มี ${dropCount} ${entityType} ต่ำกว่าเกณฑ์ 95%`,
      });
    }

    // --- 6. Service Type Insights (when viewing all services) ---
    if (selectedServiceFilter === "all" && filteredCurrentData.length > 0) {
      const serviceMap = new Map<string, { H: number; M: number }>();
      filteredCurrentData.forEach((item) => {
        const key = item.file_key;
        const curr = serviceMap.get(key) || { H: 0, M: 0 };
        serviceMap.set(key, {
          H: curr.H + (item.valueh || 0),
          M: curr.M + (item.valuem || 0),
        });
      });

      let bestService = { name: "", rate: -Infinity };
      let worstService = { name: "", rate: Infinity };

      serviceMap.forEach((metrics, service) => {
        if (metrics.H < 20) return; // Skip low volume
        const rate = (metrics.M / metrics.H) * 100;
        if (rate > bestService.rate) {
          bestService = { name: service, rate };
        }
        if (rate < worstService.rate) {
          worstService = { name: service, rate };
        }
      });

      if (
        bestService.name &&
        worstService.name &&
        bestService.rate - worstService.rate >= 3
      ) {
        messages.push({
          type: "info",
          text: `🔍 ${bestService.name} ทำได้ดีที่สุด (${bestService.rate.toFixed(1)}%) ส่วน ${worstService.name} ต้องปรับปรุง (${worstService.rate.toFixed(1)}%)`,
        });
      }
    }

    return messages.slice(0, 6); // Limit to top 6 insights
  }, [currentData, prevData, selectedFilter, selectedServiceFilter]);

  if (insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-sm animate-in fade-in duration-500">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <svg
          className="w-24 h-24 text-blue-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </div>

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">
          AI Daily Insights
        </h3>
        <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
          BETA
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`flex flex-col gap-3 p-4 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.01] ${
              insight.type === "success"
                ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                : insight.type === "warning"
                  ? "bg-orange-50/50 border-orange-100 text-orange-900"
                  : insight.type === "danger"
                    ? "bg-rose-50/50 border-rose-100 text-rose-900"
                    : "bg-white/60 border-slate-200 text-slate-700"
            }`}
          >
            {/* Main Insight */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {insight.icon || (
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      insight.type === "success"
                        ? "bg-emerald-500"
                        : insight.type === "warning"
                          ? "bg-orange-500"
                          : insight.type === "danger"
                            ? "bg-rose-500"
                            : "bg-blue-400"
                    }`}
                  ></div>
                )}
              </div>
              <p className="text-sm font-medium leading-relaxed flex-1">
                {insight.text}
              </p>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyInsights;
