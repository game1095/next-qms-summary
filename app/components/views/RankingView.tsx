import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  Scatter,
  Legend
} from "recharts";
import { DeliveryDataRow } from "../../types";
import { CURRENT_CONFIG } from "../../../lib/utils";

interface RankingViewProps {
  currentData: DeliveryDataRow[];
  prevData: DeliveryDataRow[];
  selectedFilter: string; // Keep for compatibility if needed, but unused
  selectedServiceFilter: string; // Keep for compatibility if needed, but unused
}

interface RankingEntry {
  name: string;
  code?: string;
  successRate: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  unreported: number;
  callSuccess: number;
  callTotal: number;
  callSuccessRate: number;
  improvement: number;
  failedDeliveries: number;
}

interface ServiceStats {
  serviceName: string;
  serviceKey: string;
  totalItems: number;
  successRate: number;
  callSuccessRate: number;
  rankings: RankingEntry[];
  insights: string[];
  callInsights: string[];
}

const RankingView = ({
  currentData,
  prevData,
}: RankingViewProps) => {
  const [activeServiceTab, setActiveServiceTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [showOfficeRankings, setShowOfficeRankings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allServices = [
    { key: "all", label: "ทุกบริการ", icon: "📊", color: "blue" },
    { key: "GROUP_EJW", label: "EMS (ไม่รวม COD)", icon: "📦", color: "indigo" },
    { key: "GROUP_COD", label: "รวม COD", icon: "💰", color: "amber" },
    { key: "E(E)", label: "E(E)", icon: "⚡", color: "purple" },
    { key: "E(J)", label: "E(J)", icon: "🌱", color: "emerald" },
    { key: "E(W)", label: "E(W)", icon: "🌍", color: "cyan" },
    { key: "E-BCOD", label: "E-BCOD", icon: "💵", color: "orange" },
    { key: "E-RCOD", label: "E-RCOD", icon: "🔄", color: "rose" },
  ];

  const { serviceStats, officeStats, overallStats, callStats } = useMemo(() => {
    if (currentData.length === 0) {
      return { serviceStats: [], officeStats: [], overallStats: null, callStats: null };
    }

    const calculateRankings = (
      data: DeliveryDataRow[],
      prevDataset: DeliveryDataRow[],
      groupBy: "province" | "office",
      serviceFilter?: string,
      provinceCode?: string
    ): RankingEntry[] => {
      let filtered = data;
      if (serviceFilter && serviceFilter !== "all") {
        if (serviceFilter === "GROUP_EJW") {
          filtered = data.filter((item) => ["E(E)", "E(J)", "E(W)"].includes(item.file_key));
        } else if (serviceFilter === "GROUP_COD") {
          filtered = data.filter((item) => ["E-BCOD", "E-RCOD"].includes(item.file_key));
        } else {
          filtered = data.filter((item) => item.file_key === serviceFilter);
        }
      }

      if (provinceCode && groupBy === "office") {
        filtered = filtered.filter((item) => {
          for (const p of CURRENT_CONFIG.provinces) {
            if (p.key === provinceCode && p.codes.has(String(item.cole))) {
              return true;
            }
          }
          return false;
        });
      }

      const groupMap = new Map<
        string,
        {
          H: number;
          M: number;
          O: number;
          I: number;
          Q: number;
          S: number;
          prevH: number;
          prevM: number;
          code?: string;
        }
      >();

      filtered.forEach((item) => {
        let key: string = "";
        let code: string | undefined;

        const cleanCole = String(item.cole).trim();

        if (groupBy === "province") {
          for (const p of CURRENT_CONFIG.provinces) {
            if (p.codes.has(cleanCole)) {
              key = p.label;
              code = p.key;
              break;
            }
          }
          if (!key) return; // Skip if not found (matches Dashboard logic: if (provinceKey === "other") return;)
        } else {
          key = String(item.colf).trim();
          code = String(item.cole);
        }

        const curr = groupMap.get(key!) || {
          H: 0,
          M: 0,
          O: 0,
          I: 0,
          Q: 0,
          S: 0,
          prevH: 0,
          prevM: 0,
          code,
        };

        groupMap.set(key!, {
          ...curr,
          H: curr.H + (item.valueh || 0),
          M: curr.M + (item.valuem || 0),
          O: curr.O + (item.valueo || 0),
          I: curr.I + (item.valuei || 0),
          Q: curr.Q + (item.colq || 0),
          S: curr.S + (item.cols || 0),
        });
      });

      let prevFiltered = prevDataset;
      if (serviceFilter && serviceFilter !== "all") {
        if (serviceFilter === "GROUP_EJW") {
          prevFiltered = prevDataset.filter((item) => ["E(E)", "E(J)", "E(W)"].includes(item.file_key));
        } else if (serviceFilter === "GROUP_COD") {
          prevFiltered = prevDataset.filter((item) => ["E-BCOD", "E-RCOD"].includes(item.file_key));
        } else {
          prevFiltered = prevDataset.filter((item) => item.file_key === serviceFilter);
        }
      }

      if (provinceCode && groupBy === "office") {
        prevFiltered = prevFiltered.filter((item) => {
          for (const p of CURRENT_CONFIG.provinces) {
            if (p.key === provinceCode && p.codes.has(String(item.cole))) {
              return true;
            }
          }
          return false;
        });
      }

      prevFiltered.forEach((item) => {
        let key: string = "";
        const cleanCole = String(item.cole).trim();

        if (groupBy === "province") {
          for (const p of CURRENT_CONFIG.provinces) {
            if (p.codes.has(cleanCole)) {
              key = p.label;
              break;
            }
          }
          if (!key) return; // Skip if not found
        } else {
          key = String(item.colf).trim();
        }

        const curr = groupMap.get(key!);
        if (curr) {
          curr.prevH += item.valueh || 0;
          curr.prevM += item.valuem || 0;
        }
      });

      const rankings: RankingEntry[] = [];
      groupMap.forEach((metrics, name) => {
        if (metrics.H < 5) return;

        const successRate = (metrics.M / metrics.H) * 100;
        const prevSuccessRate =
          metrics.prevH > 0 ? (metrics.prevM / metrics.prevH) * 100 : 0;
        const callSuccessRate =
          metrics.Q + metrics.S > 0
            ? (metrics.Q / (metrics.Q + metrics.S)) * 100
            : 0;

        rankings.push({
          name,
          code: metrics.code,
          successRate,
          totalDeliveries: metrics.H,
          successfulDeliveries: metrics.M,
          unreported: metrics.I,
          failedDeliveries: metrics.O,
          callSuccess: metrics.Q,
          callTotal: metrics.Q + metrics.S,
          callSuccessRate,
          improvement: successRate - prevSuccessRate,
        });
      });

      return rankings.sort((a, b) => b.successRate - a.successRate);
    };

    const generateInsights = (
      rankings: RankingEntry[],
      serviceName: string
    ): string[] => {
      const insights: string[] = [];

      if (rankings.length === 0) return insights;

      const best = rankings[0];
      const worst = rankings[rankings.length - 1];
      const gap = best.successRate - worst.successRate;

      if (gap >= 5) {
        insights.push(
          `📊 ช่องว่าง ${gap.toFixed(1)}% ระหว่าง ${best.name} กับ ${worst.name}`
        );
      }

      const improvingCount = rankings.filter((r) => r.improvement > 1).length;
      if (improvingCount > rankings.length / 2) {
        insights.push(
          `📈 ${improvingCount}/${rankings.length} แห่งมีแนวโน้มดีขึ้น`
        );
      }

      const highUnreported = rankings.filter(
        (r) => (r.unreported / r.totalDeliveries) * 100 >= 5
      ).length;
      if (highUnreported > 0) {
        insights.push(`⚠️ ${highUnreported} แห่งมีของไม่รายงานผล ≥5%`);
      }

      return insights;
    };

    const generateCallInsights = (rankings: RankingEntry[]): string[] => {
      const insights: string[] = [];
      
      if (rankings.length === 0) return insights;

      const withCalls = rankings.filter((r) => r.callTotal > 0);
      if (withCalls.length === 0) return insights;

      const avgCallSuccess =
        withCalls.reduce((sum, r) => sum + r.callSuccessRate, 0) /
        withCalls.length;

      insights.push(
        `📞 อัตราการโทรสำเร็จเฉลี่ย ${avgCallSuccess.toFixed(1)}%`
      );

      return insights;
    };

    const stats: ServiceStats[] = [];

    allServices.forEach((service) => {
      const rankings = calculateRankings(
        currentData,
        prevData,
        "province",
        service.key
      );

      if (rankings.length > 0) {
        const totalItems = rankings.reduce(
          (sum, r) => sum + r.totalDeliveries,
          0
        );
        const successItems = rankings.reduce(
          (sum, r) => sum + r.successfulDeliveries,
          0
        );
        const totalCalls = rankings.reduce((sum, r) => sum + r.callTotal, 0);
        const successCalls = rankings.reduce(
          (sum, r) => sum + r.callSuccess,
          0
        );
        const successRate = (successItems / totalItems) * 100;
        const callSuccessRate =
          totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0;

        stats.push({
          serviceName: service.label,
          serviceKey: service.key,
          totalItems,
          successRate,
          callSuccessRate,
          rankings,
          insights: generateInsights(rankings, service.label),
          callInsights: generateCallInsights(rankings),
        });
      }
    });

    const provRankings = calculateRankings(
      currentData,
      prevData,
      "province",
      "all"
    );

    const officeRankings = selectedProvince
      ? calculateRankings(
          currentData,
          prevData,
          "office",
          activeServiceTab,
          selectedProvince
        )
      : [];

    const overall = {
      totalProvinces: provRankings.length,
      totalItems: provRankings.reduce((sum, r) => sum + r.totalDeliveries, 0),
      avgSuccessRate:
        provRankings.reduce((sum, r) => sum + r.successRate, 0) /
        provRankings.length,
      avgCallSuccessRate:
        provRankings.filter((r) => r.callTotal > 0).length > 0
          ? provRankings
              .filter((r) => r.callTotal > 0)
              .reduce((sum, r) => sum + r.callSuccessRate, 0) /
            provRankings.filter((r) => r.callTotal > 0).length
          : 0,
      bestProvince: provRankings[0],
      worstProvince: provRankings[provRankings.length - 1],
    };

    const callStatistics = {
      totalCalls: provRankings.reduce((sum, r) => sum + r.callTotal, 0),
      successfulCalls: provRankings.reduce((sum, r) => sum + r.callSuccess, 0),
      failedCalls: provRankings.reduce((sum, r) => sum + (r.callTotal - r.callSuccess), 0),
      avgCallSuccessRate: overall.avgCallSuccessRate,
    };

    return {
      serviceStats: stats,
      officeStats: officeRankings,
      overallStats: overall,
      callStats: callStatistics,
    };
  }, [currentData, prevData, selectedProvince, activeServiceTab]);

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🥇", border: "border-yellow-200" };
    if (index === 1) return { bg: "bg-slate-100", text: "text-slate-700", icon: "🥈", border: "border-slate-200" };
    if (index === 2) return { bg: "bg-orange-100", text: "text-orange-700", icon: "🥉", border: "border-orange-200" };
    return { bg: "bg-white", text: "text-slate-500", icon: `#${index + 1}`, border: "border-slate-100" };
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 98) return "text-emerald-600";
    if (rate >= 95) return "text-blue-600";
    if (rate >= 90) return "text-indigo-600";
    return "text-rose-600";
  };

  const getBarColor = (rate: number) => {
    if (rate >= 98) return "bg-emerald-500";
    if (rate >= 95) return "bg-blue-500";
    if (rate >= 90) return "bg-indigo-500";
    return "bg-rose-500";
  };

  if (!overallStats || serviceStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4 animate-bounce">📊</div>
        <h2 className="text-2xl font-bold text-slate-800">รอสักครู่...</h2>
        <p className="text-slate-500">กำลังประมวลผลข้อมูลจัดอันดับ</p>
      </div>
    );
  }

  const activeStats = serviceStats.find(
    (s) => s.serviceKey === activeServiceTab
  );

  const filteredRankings = activeStats?.rankings.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // --- Chart Rendering Logic ---
  const renderCharts = () => {
    // Prepare data for charts based on current filtered rankings
    const data = filteredRankings;
    const top10 = [...data].sort((a, b) => b.successRate - a.successRate).slice(0, 10);
    const bottom10 = [...data].sort((a, b) => a.successRate - b.successRate).slice(0, 10);
    const topCall = [...data].sort((a, b) => b.callSuccessRate - a.callSuccessRate).slice(0, 10);
    const bottomCall = [...data].sort((a, b) => a.callSuccessRate - b.callSuccessRate).slice(0, 10);
    
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top 10 & Bottom 10 Delivery Success Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-emerald-500">🏆</span> 10 อันดับประสิทธิภาพการนำจ่ายสูงสุด
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" domain={[90, 100]} hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 text-white p-3 rounded-xl shadow-xl text-xs">
                             <div className="font-bold text-sm mb-1">{data.name}</div>
                             <div>Success: <span className="text-emerald-400 font-bold">{data.successRate.toFixed(2)}%</span></div>
                             <div>Volume: {data.totalDeliveries.toLocaleString()}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="successRate" radius={[0, 4, 4, 0]} barSize={20}>
                    {top10.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#fbbf24' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-rose-500">⚠️</span> 10 อันดับประสิทธิภาพการนำจ่ายที่ต้องปรับปรุง
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bottom10} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" domain={['auto', 'auto']} hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                         const data = payload[0].payload;
                         return (
                           <div className="bg-slate-800 text-white p-3 rounded-xl shadow-xl text-xs">
                              <div className="font-bold text-sm mb-1">{data.name}</div>
                              <div>Success: <span className="text-rose-400 font-bold">{data.successRate.toFixed(2)}%</span></div>
                              <div>Volume: {data.totalDeliveries.toLocaleString()}</div>
                              <div>Failed: {data.failedDeliveries.toLocaleString()}</div>
                           </div>
                         );
                       }
                       return null;
                    }}
                  />
                  <Bar dataKey="successRate" radius={[0, 4, 4, 0]} barSize={20} fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>



        {/* Top 10 & Bottom 10 Call Success Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-indigo-500">📞</span> 10 อันดับประสิทธิภาพการโทรสูงสุด
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCall} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 text-white p-3 rounded-xl shadow-xl text-xs">
                             <div className="font-bold text-sm mb-1">{data.name}</div>
                             <div>Call Success: <span className="text-indigo-400 font-bold">{data.callSuccessRate.toFixed(2)}%</span></div>
                             <div>Total Calls: {data.callTotal.toLocaleString()}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="callSuccessRate" radius={[0, 4, 4, 0]} barSize={20} fill="#6366f1">
                     {topCall.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#818cf8' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-rose-500">📞</span> 10 อันดับประสิทธิภาพการโทรที่ต้องปรับปรุง
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bottomCall} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                         const data = payload[0].payload;
                         return (
                           <div className="bg-slate-800 text-white p-3 rounded-xl shadow-xl text-xs">
                              <div className="font-bold text-sm mb-1">{data.name}</div>
                              <div>Call Success: <span className="text-rose-400 font-bold">{data.callSuccessRate.toFixed(2)}%</span></div>
                              <div>Total Calls: {data.callTotal.toLocaleString()}</div>
                           </div>
                         );
                       }
                       return null;
                    }}
                  />
                  <Bar dataKey="callSuccessRate" radius={[0, 4, 4, 0]} barSize={20} fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Correlation Chart: Volume vs Success Rate */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <span className="text-blue-500">📊</span> ความสัมพันธ์ ปริมาณงาน vs ความสำเร็จ
           </h3>
           <p className="text-sm text-slate-500 mb-6">แสดงการกระจายตัวของที่ทำการตามปริมาณงานและอัตราความสำเร็จ</p>
           <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                   <XAxis 
                      dataKey="totalDeliveries" 
                      type="number" 
                      name="Volume" 
                      tick={{fontSize: 12}} 
                      label={{ value: 'ปริมาณงาน (ชิ้น)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                   />
                   <YAxis 
                      dataKey="successRate" 
                      type="number" 
                      domain={['dataMin - 1', '100']} 
                      tick={{fontSize: 12}}
                      label={{ value: 'ความสำเร็จ (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                   />
                   <Tooltip 
                      cursor={{strokeDasharray: '3 3'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-slate-800 text-white p-3 rounded-xl shadow-xl text-xs">
                                <div className="font-bold text-sm mb-1">{data.name}</div>
                                <div>Vol: {data.totalDeliveries.toLocaleString()}</div>
                                <div>Success: {data.successRate.toFixed(2)}%</div>
                             </div>
                           );
                         }
                         return null;
                      }}
                   />
                   <Scatter name="Office" dataKey="successRate" fill="#8884d8">
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.successRate >= 98 ? '#10b981' : entry.successRate >= 95 ? '#3b82f6' : '#f43f5e'} />
                      ))}
                   </Scatter>
                </ComposedChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    );
  };

  const renderRankingCard = (entry: RankingEntry, index: number) => {
    const rankStyle = getRankStyle(index);
    const isClickable = !selectedProvince && entry.code;

    return (
      <div
        key={entry.name}
        onClick={() => {
          if (isClickable) {
            setSelectedProvince(entry.code || null);
            setShowOfficeRankings(true);
          }
        }}
        className={`group bg-white rounded-2xl p-5 border shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
          isClickable ? "cursor-pointer hover:-translate-y-1" : ""
        } ${rankStyle.border}`}
      >
         {/* Top Decoration Line */}
         <div className={`absolute top-0 left-0 right-0 h-1.5 ${
           index === 0 ? "bg-yellow-400" : 
           index === 1 ? "bg-slate-400" :
           index === 2 ? "bg-orange-400" :
           "bg-slate-100 group-hover:bg-purple-400 transition-colors"
         }`}></div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-inner ${rankStyle.bg} ${rankStyle.text}`}>
               {rankStyle.icon}
             </div>
             <div>
               <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-purple-600 transition-colors">{entry.name}</h3>
               {entry.improvement !== 0 && (
                 <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${
                   entry.improvement > 0 ? "text-emerald-600" : "text-rose-500"
                 }`}>
                   <span>{entry.improvement > 0 ? "▲" : "▼"}</span>
                   <span>{Math.abs(entry.improvement).toFixed(1)}%</span>
                 </div>
               )}
             </div>
          </div>
          
          <div className="text-right">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">นำจ่ายสำเร็จ</div>
             <div className={`text-2xl font-black ${getPerformanceColor(entry.successRate)}`}>
               {entry.successRate.toFixed(1)}%
             </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
          <div 
            className={`h-full rounded-full ${getBarColor(entry.successRate)}`} 
            style={{ width: `${Math.min(entry.successRate, 100)}%` }}
          ></div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
           {/* Call Stats */}
           {entry.callTotal > 0 ? (
             <div className="flex items-center justify-between col-span-2 pb-2 mb-2 border-b border-slate-200/50">
               <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="p-1 rounded bg-blue-100 text-blue-600">📞</span>
                  <span>ประสิทธิภาพการโทร</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-400">{entry.callSuccess}/{entry.callTotal}</span>
                 <span className={`text-sm font-black ${entry.callSuccessRate >= 90 ? 'text-emerald-600' : 'text-slate-700'}`}>
                   {entry.callSuccessRate.toFixed(0)}%
                 </span>
               </div>
             </div>
           ) : (
              <div className="col-span-2 text-center text-xs text-slate-400 py-2 border-b border-slate-200/50 mb-2">
                ไม่มีข้อมูลการโทร
              </div>
           )}

           <div className="space-y-1">
             <div className="text-[10px] text-slate-400 font-bold uppercase">สินค้าทั้งหมด</div>
             <div className="text-sm font-bold text-slate-700">{entry.totalDeliveries.toLocaleString()}</div>
           </div>
           
           <div className="space-y-1 text-right">
             <div className="text-[10px] text-rose-400 font-bold uppercase">ไม่สำเร็จ</div>
             <div className="text-sm font-bold text-rose-600">
               {entry.failedDeliveries > 0 ? entry.failedDeliveries.toLocaleString() : '-'}
             </div>
           </div>
        </div>

        {entry.unreported > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
            <span>⚠️</span>
            <span>ไม่รายงานผล: {entry.unreported.toLocaleString()} ชิ้น</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {/* Overview Cards - Simplified Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Provinces */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-400 transition-colors">
           <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
              🗺️
           </div>
           <div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ภาพรวมจังหวัด</div>
              <div className="text-2xl font-black text-slate-800">{overallStats.totalProvinces}</div>
           </div>
        </div>
        
        {/* Total Items */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-purple-400 transition-colors">
           <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl">
              📦
           </div>
           <div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ปริมาณงานรวม</div>
              <div className="text-2xl font-black text-slate-800">{overallStats.totalItems.toLocaleString()}</div>
           </div>
        </div>

        {/* Avg Delivery Success */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-400 transition-colors">
           <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              ✅
           </div>
           <div className="flex-1">
              <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">ความสำเร็จเฉลี่ย</div>
              <div className="text-2xl font-black text-emerald-700">{overallStats.avgSuccessRate.toFixed(2)}%</div>
           </div>
        </div>

        {/* Avg Call Success */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-400 transition-colors">
           <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
              📞
           </div>
           <div className="flex-1">
              <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">โทรสำเร็จเฉลี่ย</div>
              <div className="text-2xl font-black text-indigo-700">{callStats.avgCallSuccessRate.toFixed(2)}%</div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!showOfficeRankings ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Tabs header */}
          <div className="border-b border-slate-100 p-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max">
              {allServices.map((service) => {
                 const isActive = activeServiceTab === service.key;
                 return (
                   <button
                     key={service.key}
                     onClick={() => setActiveServiceTab(service.key)}
                     className={`relative px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                       isActive 
                         ? "bg-slate-800 text-white shadow-lg shadow-slate-200 scale-100" 
                         : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                     }`}
                   >
                     <span className={isActive ? "" : "opacity-70"}>{service.icon}</span>
                     <span>{service.label}</span>
                   </button>
                 );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
             <div className="relative w-full md:w-96 group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all outline-none text-slate-700 font-medium"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors">🔍</span>
             </div>

              <div className="flex bg-slate-200/50 p-1 rounded-xl">
                <button 
                  onClick={() => setViewMode("table")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="mr-1">📋</span> ตาราง
                </button>
                <button 
                  onClick={() => setViewMode("graph")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'graph' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="mr-1">📈</span> กราฟ
                </button>
             </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 min-h-[500px] bg-slate-50/30">
             {viewMode === "graph" ? (
                renderCharts()
             ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
                       <tr>
                         <th className="px-4 py-3 text-left w-20">อันดับ</th>
                         <th className="px-4 py-3 text-left">หน่วยงาน</th>
                         <th className="px-4 py-3 text-right text-emerald-600">อัตราความสำเร็จ</th>
                         <th className="px-4 py-3 text-right text-indigo-600">ประสิทธิภาพการโทร</th>
                         <th className="px-4 py-3 text-right">เตรียมการนำจ่าย (H)</th>
                         <th className="px-4 py-3 text-right">นำจ่ายสำเร็จ (M)</th>
                         <th className="px-4 py-3 text-right text-rose-500">นำจ่ายไม่สำเร็จ (O)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredRankings.map((entry, index) => (
                         <tr 
                           key={entry.name}
                           onClick={() => {
                              if (entry.code) {
                                setSelectedProvince(entry.code);
                                setShowOfficeRankings(true);
                              }
                           }}
                           className={`hover:bg-purple-50/50 transition-colors ${entry.code ? 'cursor-pointer' : ''}`}
                         >
                           <td className="px-4 py-3 font-bold text-slate-600">#{index + 1}</td>
                           <td className="px-4 py-3 font-bold text-slate-800">{entry.name}</td>
                           <td className="px-4 py-3 text-right font-black text-emerald-600">{entry.successRate.toFixed(2)}%</td>
                           <td className="px-4 py-3 text-right font-bold text-indigo-600">{entry.callSuccessRate.toFixed(1)}%</td>
                           <td className="px-4 py-3 text-right text-slate-600">{entry.totalDeliveries.toLocaleString()}</td>
                           <td className="px-4 py-3 text-right text-slate-600">{entry.successfulDeliveries.toLocaleString()}</td>
                           <td className="px-4 py-3 text-right text-rose-500">{entry.failedDeliveries.toLocaleString()}</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
             )}
          </div>
        </div>
      ) : (
        /* Drill-down View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setSelectedProvince(null);
                    setShowOfficeRankings(false);
                    setSearchQuery("");
                  }}
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                >
                  ←
                </button>
                <div>
                   <h2 className="text-xl font-black text-slate-800">
                     {CURRENT_CONFIG.provinces.find((p) => p.key === selectedProvince)?.label}
                   </h2>
                   <p className="text-sm text-slate-500 font-medium">อันดับที่ทำการไปรษณีย์</p>
                </div>
              </div>
           </div>
           
           <div className="p-6 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {officeStats.map((entry, index) => renderRankingCard(entry, index))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RankingView;
