import React from 'react';

const DashboardSkeleton = () => {
  return (
    <div className="w-full space-y-8 animate-pulse mt-8">
      {/* Daily Insights Skeleton */}
      <div className="bg-white rounded-3xl p-6 h-32 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"></div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-72">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full"></div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full"></div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full"></div>
      </div>

      {/* KPI Header 1 */}
      <div className="flex items-center gap-3 mt-8 px-2">
        <div className="w-1 h-8 bg-slate-200 rounded-full"></div>
        <div className="h-6 w-64 bg-slate-200 rounded-md"></div>
      </div>

      {/* KPI Grid 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-32"></div>
        ))}
      </div>

      {/* KPI Header 2 */}
      <div className="flex items-center gap-3 mt-8 px-2">
        <div className="w-1 h-8 bg-slate-200 rounded-full"></div>
        <div className="h-6 w-64 bg-slate-200 rounded-md"></div>
      </div>

      {/* KPI Grid 2 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-32"></div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[500px] mt-8"></div>
    </div>
  );
};

export default DashboardSkeleton;
