import React, { useMemo } from "react";
import { DeliveryDataRow } from "../../types";
import { CURRENT_CONFIG, getDisplayNamesFromConfig } from "../../../lib/utils";

interface DailyInsightsProps {
  currentData: DeliveryDataRow[];
  prevData: DeliveryDataRow[];
  selectedFilter: string;
}

const DailyInsights = ({
  currentData,
  prevData,
  selectedFilter,
}: DailyInsightsProps) => {
  const insights = useMemo(() => {
    if (currentData.length === 0) return [];

    const messages: {
      type: "success" | "warning" | "danger" | "info";
      text: string;
      icon?: React.ReactNode;
    }[] = [];

    // --- 1. Overall Trend Analysis ---
    const calculateSuccessRate = (data: DeliveryDataRow[]) => {
      const H = data.reduce((sum, item) => sum + (item.valueh || 0), 0);
      const M = data.reduce((sum, item) => sum + (item.valuem || 0), 0);
      return H > 0 ? (M / H) * 100 : 0;
    };

    const currentRate = calculateSuccessRate(currentData);
    const prevRate = calculateSuccessRate(prevData);
    const diff = currentRate - prevRate;

    if (Math.abs(diff) >= 0.1) {
      if (diff > 0) {
        messages.push({
          type: "success",
          text: `ภาพรวม ${CURRENT_CONFIG.regionName} มีประสิทธิภาพเพิ่มขึ้น +${diff.toFixed(2)}% เมื่อเทียบกับช่วงก่อนหน้า`,
          icon: <span className="text-emerald-500 text-lg">📈</span>,
        });
      } else {
        messages.push({
          type: "warning",
          text: `ภาพรวม ${CURRENT_CONFIG.regionName} มีประสิทธิภาพลดลง ${diff.toFixed(2)}% ต้องเร่งตรวจสอบสาเหตุ`,
          icon: <span className="text-rose-500 text-lg">📉</span>,
        });
      }
    }

    // --- 2. Office/Province Level Analysis ---
    // Group data by Entity (Province or Office depending on filter)
    const getEntityKey = (item: DeliveryDataRow) => {
      if (selectedFilter === "all" || selectedFilter === "province-summary") {
        // Group by Province
        for (const p of CURRENT_CONFIG.provinces) {
          if (p.codes.has(String(item.cole))) return p.label;
        }
        return "อื่นๆ";
      } else {
        // Group by Office
        return String(item.colf).trim();
      }
    };

    const groupData = (data: DeliveryDataRow[]) => {
      const map = new Map<string, { H: number; M: number }>();
      data.forEach((item) => {
        const key = getEntityKey(item);
        const curr = map.get(key) || { H: 0, M: 0 };
        map.set(key, {
          H: curr.H + (item.valueh || 0),
          M: curr.M + (item.valuem || 0),
        });
      });
      return map;
    };

    const currentMap = groupData(currentData);
    const prevMap = groupData(prevData);

    let maxGain = { name: "", diff: -Infinity, rate: 0 };
    let maxDrop = { name: "", diff: Infinity, rate: 0 };
    let dropCount = 0;

    currentMap.forEach((curr, key) => {
      const prev = prevMap.get(key);
      if (!prev || prev.H === 0 || curr.H < 10) return; // Skip small volume or no prev data

      const currRate = (curr.M / curr.H) * 100;
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

    // Add Top Performer Insight
    if (maxGain.diff > 1) {
      messages.push({
        type: "success",
        text: `👏 ${maxGain.name} ทำยอดได้ดีเยี่ยม! เพิ่มขึ้น +${maxGain.diff.toFixed(2)}% (ปัจจุบัน ${maxGain.rate.toFixed(2)}%)`,
      });
    }

    // Add Critical Drop Insight
    if (maxDrop.diff < -2) {
      messages.push({
        type: "danger",
        text: `⚠️ ${maxDrop.name} น่าเป็นห่วง ประสิทธิภาพตก ${maxDrop.diff.toFixed(2)}% (เหลือ ${maxDrop.rate.toFixed(2)}%)`,
      });
    }

    // Add Low Performance Count Insight
    if (dropCount > 0) {
      const entityType =
        selectedFilter === "all" || selectedFilter === "province-summary"
          ? "จังหวัด"
          : "ที่ทำการ";
      messages.push({
        type: "info",
        text: `มี ${dropCount} ${entityType} ที่ประสิทธิภาพต่ำกว่าเกณฑ์ 95% ในช่วงเวลานี้`,
      });
    }

    return messages.slice(0, 4); // Limit to top 4 insights
  }, [currentData, prevData, selectedFilter]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.01] ${
              insight.type === "success"
                ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                : insight.type === "warning"
                  ? "bg-orange-50/50 border-orange-100 text-orange-900"
                  : insight.type === "danger"
                    ? "bg-rose-50/50 border-rose-100 text-rose-900"
                    : "bg-white/60 border-slate-200 text-slate-700"
            }`}
          >
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
            <p className="text-sm font-medium leading-relaxed">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyInsights;
