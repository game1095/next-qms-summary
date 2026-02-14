import React from "react";
import { ComparisonDiff } from "../../types";

type TrendType = "success" | "danger" | "primary" | "warning" | "neutral";

interface KPICardProps {
  title: string;
  value: string | number | React.ReactNode;
  subValue?: string;
  type?: TrendType;
  icon?: React.ReactNode;
  highlight?: boolean;
  trend?: ComparisonDiff;
  comparisonLabel?: string;
  onClick?: () => void;
  inverseTrend?: boolean;
}

const KPICard = ({
  title,
  value,
  subValue,
  type = "neutral",
  icon,
  highlight = false,
  trend,
  comparisonLabel,
  onClick,
  inverseTrend = false,
}: KPICardProps) => {
  const styles: any = {
    success: {
      text: "text-emerald-700",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
    },
    danger: {
      text: "text-rose-700",
      iconBg: "bg-rose-100",
      iconText: "text-rose-600",
    },
    primary: {
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },
    warning: {
      text: "text-orange-700",
      iconBg: "bg-orange-100",
      iconText: "text-orange-600",
    },
    neutral: {
      text: "text-gray-700",
      iconBg: "bg-gray-100",
      iconText: "text-gray-500",
    },
  };

  const activeStyle = styles[type] || styles.neutral;

  const renderTrend = () => {
    if (!trend) return null;
    if (trend.direction === "no-data") {
      return (
        <span className="text-xs opacity-70 font-medium ml-1">
          (ไม่มีข้อมูลเก่า)
        </span>
      );
    }

    let colorClass = "text-gray-400";
    if (inverseTrend) {
      if (trend.direction === "up") colorClass = "text-rose-500";
      else if (trend.direction === "down") colorClass = "text-emerald-500";
    } else {
      if (trend.direction === "up") colorClass = "text-emerald-500";
      else if (trend.direction === "down") colorClass = "text-rose-500";
    }

    const whiteColorClass = "text-white";
    const symbol =
      trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "-";

    const isPercent = title.includes("(%)") || title.startsWith("อัตรา");
    const diffValue = isPercent
      ? Math.abs(trend.diff).toFixed(1)
      : Math.abs(trend.diff).toLocaleString();

    return (
      <>
        <span
          className={`font-bold ${highlight ? whiteColorClass : colorClass}`}
        >
          {symbol} {diffValue}
          {isPercent ? "%" : ""}
        </span>
        <span
          className={`text-[10px] ml-1 ${highlight ? "opacity-80 text-white" : "text-gray-400"}`}
        >
          {comparisonLabel || "เทียบก่อนหน้า"}
        </span>
      </>
    );
  };

  if (highlight) {
    const gradientClass =
      type === "success"
        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 border border-emerald-400/20"
        : type === "danger"
          ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-xl shadow-rose-500/30 border border-rose-400/20"
          : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/30 border border-blue-400/20";

    return (
      <div
        onClick={onClick}
        className={`${gradientClass} rounded-2xl p-4 text-white relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ${onClick ? "cursor-pointer active:scale-95" : ""}`}
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-1 text-blue-50">
                {title}
              </h3>
              <p className="text-3xl font-black tracking-tighter drop-shadow-sm">
                {value}
              </p>
              {trend && (
                <div className="flex items-center gap-2 mt-2 bg-white/20 w-fit px-2 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/30 transition-colors">
                  {renderTrend()}
                </div>
              )}
              {subValue && !trend && (
                <p className="text-xs mt-1 opacity-90 font-medium bg-white/20 inline-block px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                  {subValue}
                </p>
              )}
            </div>
            {icon && (
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner border border-white/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="scale-75 origin-center">{icon}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${onClick ? "cursor-pointer hover:border-blue-200" : ""}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-[4rem] opacity-50 transition-opacity group-hover:opacity-100"></div>
      
      <div className="relative z-10">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <p
            className={`text-2xl font-black tracking-tighter ${activeStyle.text}`}
          >
            {value}
          </p>
          {subValue && (
            <span className="text-sm text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 group-hover:border-slate-200 transition-colors">
              {subValue}
            </span>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium">
            {renderTrend()}
          </div>
        )}
      </div>
      {icon && (
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeStyle.iconBg} ${activeStyle.iconText} group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 shadow-sm relative z-10`}
        >
          <div className="scale-75">{icon}</div>
        </div>
      )}
    </div>
  );
};

export default KPICard;
