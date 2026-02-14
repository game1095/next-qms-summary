import React, { useMemo } from "react";
import { DeliveryDataRow } from "../../types";
import { CURRENT_CONFIG } from "../../../lib/utils";

interface OfficeRankingProps {
  currentData: DeliveryDataRow[];
  selectedFilter: string;
}

interface RankingEntry {
  name: string;
  successRate: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  improvement?: number;
}

const OfficeRanking = ({
  currentData,
  selectedFilter,
}: OfficeRankingProps) => {
  const rankings = useMemo(() => {
    if (currentData.length === 0) return [];

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

    const groupMap = new Map<
      string,
      { H: number; M: number; prevH: number; prevM: number }
    >();

    currentData.forEach((item) => {
      const key = getEntityKey(item);
      const curr = groupMap.get(key) || { H: 0, M: 0, prevH: 0, prevM: 0 };
      groupMap.set(key, {
        H: curr.H + (item.valueh || 0),
        M: curr.M + (item.valuem || 0),
        prevH: curr.prevH,
        prevM: curr.prevM,
      });
    });

    const entries: RankingEntry[] = [];
    groupMap.forEach((metrics, name) => {
      if (metrics.H < 10) return; // Skip low volume
      const successRate = (metrics.M / metrics.H) * 100;
      entries.push({
        name,
        successRate,
        totalDeliveries: metrics.H,
        successfulDeliveries: metrics.M,
      });
    });

    // Sort by success rate descending
    entries.sort((a, b) => b.successRate - a.successRate);

    return entries.slice(0, 10); // Top 10
  }, [currentData, selectedFilter]);

  if (rankings.length === 0) return null;

  const getMedalIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const getBarColor = (rate: number) => {
    if (rate >= 98) return "bg-emerald-500";
    if (rate >= 95) return "bg-yellow-400";
    return "bg-orange-400";
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-xl shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-xl text-slate-800">
            🏆 อันดับผู้ทำงานดีเด่น
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Top {rankings.length} ที่มีประสิทธิภาพสูงสุด
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rankings.map((entry, index) => (
          <div
            key={entry.name}
            className={`group relative rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
              index < 3
                ? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50"
                : "border-slate-100 bg-slate-50/50 hover:bg-white"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-black ${
                      index < 3 ? "scale-110" : "text-slate-400 text-base"
                    }`}
                  >
                    {getMedalIcon(index)}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">
                      {entry.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {entry.successfulDeliveries.toLocaleString()} /{" "}
                      {entry.totalDeliveries.toLocaleString()} ชิ้น
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-black ${
                      entry.successRate >= 98
                        ? "text-emerald-600"
                        : entry.successRate >= 95
                          ? "text-yellow-600"
                          : "text-orange-600"
                    }`}
                  >
                    {entry.successRate.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full ${getBarColor(entry.successRate)} transition-all duration-500 rounded-full`}
                  style={{ width: `${entry.successRate}%` }}
                />
              </div>
            </div>

            {/* Hover Effect Shine */}
            {index < 3 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none rounded-2xl" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600 font-medium">ดีเยี่ยม ≥98%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-slate-600 font-medium">ดี 95-97.9%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span className="text-slate-600 font-medium">ต้องปรับปรุง &lt;95%</span>
        </div>
      </div>
    </div>
  );
};

export default OfficeRanking;
