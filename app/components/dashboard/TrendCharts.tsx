import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface TrendDataPoint {
  date: string;
  fullDate: string;
  successRate: number;
  callSuccessRate: number;
  volumeH: number;
  volumeM: number;
  volumeQ: number;
  volumeS: number;
}

interface TrendChartsProps {
  trendData: TrendDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/10 text-white">
        <p className="text-sm font-bold opacity-70 mb-2 border-b border-white/10 pb-2">
          {payload[0].payload.fullDate}
        </p>
        {payload.map((entry: any, index: number) => {
          // If the underlying stat isn't a percentage, don't suffix with %
          const isRate = entry.name.includes("สำเร็จ");
          const valString = isRate ? `${entry.value.toFixed(1)}%` : entry.value.toLocaleString();
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <p className="text-lg font-black tracking-tight">
                {valString}
                <span className="text-xs font-normal opacity-60 ml-2">
                  {entry.name}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export const DeliveryTrendChart = ({ trendData }: TrendChartsProps) => (
  <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-72 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          แนวโน้มนำจ่ายสำเร็จ
        </h3>
      </div>
    </div>
    <ResponsiveContainer width="100%" height="80%">
      <AreaChart
        data={trendData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          dy={10}
        />
        <YAxis
          domain={[0, 110]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="successRate"
          name="นำจ่ายสำเร็จ"
          stroke="#059669"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorDelivery)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const CallTrendChart = ({ trendData }: TrendChartsProps) => (
  <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-72 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-500"></div>
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          แนวโน้มโทรสำเร็จ (%)
        </h3>
      </div>
    </div>
    <ResponsiveContainer width="100%" height="80%">
      <AreaChart
        data={trendData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorCall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          dy={10}
        />
        <YAxis
          domain={[0, 110]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="callSuccessRate"
          name="โทรสำเร็จ"
          stroke="#7C3AED"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorCall)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const VolumeTrendChart = ({ trendData }: TrendChartsProps) => (
  <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-72 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-500"></div>
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          แนวโน้มปริมาณงาน (ชิ้น)
        </h3>
      </div>
    </div>
    <ResponsiveContainer width="100%" height="80%">
      <AreaChart
        data={trendData}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          dy={10}
        />
        <YAxis
          domain={['auto', 'auto']}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="volumeH"
          name="ปริมาณงาน (H)"
          stroke="#2563EB"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorVolume)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
