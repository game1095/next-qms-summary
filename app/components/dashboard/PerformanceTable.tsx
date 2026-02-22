import { AggregatedSums, SummaryMetrics, SortKey, SortDirection } from "../../types";

interface PerformanceTableProps {
  summaryData: [string, AggregatedSums][];
  summaryKPIs: SummaryMetrics;
  isProvinceSummary: boolean;
  sortConfig: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  onShowDetails: (compositeKey: string) => void;
}

const PerformanceTable = ({
  summaryData,
  summaryKPIs,
  isProvinceSummary,
  sortConfig,
  onSort,
  onShowDetails,
}: PerformanceTableProps) => {
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey)
      return <span className="text-slate-300 ml-1 opacity-0 group-hover:opacity-50 transition-opacity">⇅</span>;
    return (
      <span className="text-blue-600 ml-1">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const getBadgeClass = (rate: number) => {
    if (rate >= 98)
      return "text-emerald-700 bg-emerald-50 border-emerald-200/50";
    if (rate >= 95)
      return "text-yellow-700 bg-yellow-50 border-yellow-200/50";
    return "text-rose-700 bg-rose-50 border-rose-200/50";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 98) return "bg-emerald-500";
    if (rate >= 95) return "bg-yellow-400";
    return "bg-rose-500";
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            {/* Main Header Grouping */}
            <tr className="bg-white border-b border-slate-100/50">
              <th
                rowSpan={2}
                className="py-6 px-6 text-left font-extrabold text-slate-800 uppercase tracking-tight sticky left-0 z-30 bg-white border-r border-slate-100"
              >
                {isProvinceSummary ? "ชื่อสังกัด" : "ที่ทำการ"}
              </th>
              <th
                colSpan={5}
                className="py-4 text-center text-sm font-bold text-emerald-700 bg-emerald-50/30 border-b border-emerald-100 border-r border-slate-100"
              >
                ประสิทธิภาพการนำจ่าย
              </th>
              <th
                colSpan={4}
                className="py-4 text-center text-sm font-bold text-purple-700 bg-purple-50/30 border-b border-purple-100"
              >
                ประสิทธิภาพการโทร
              </th>
            </tr>
            {/* Sub Header Columns */}
            <tr className="bg-white text-slate-500 text-xs font-semibold border-b border-slate-100 sticky top-0 z-20">
              {[
                { label: "เตรียมการ", key: "sumH" },
                { label: "ไม่รายงาน", key: "sumI" },
                { label: "รายงานผล", key: "sumK" },
                { label: "สำเร็จ", key: "sumM" },
                { label: "สำเร็จ (%)", key: "successRate" },
              ].map((h, i) => (
                <th
                  key={h.key}
                  onClick={() => onSort(h.key as SortKey)}
                  className={`px-4 py-3 text-right cursor-pointer group transition-colors hover:text-slate-800 bg-emerald-50/10 ${i === 4 ? "text-emerald-700 border-r border-slate-100" : ""}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    {h.label} <SortIcon columnKey={h.key as SortKey} />
                  </div>
                </th>
              ))}
              {[
                { label: "โทรสำเร็จ", key: "sumQ" },
                { label: "โทรสำเร็จ (%)", key: "callSuccessRate" },
                { label: "โทรไม่สำเร็จ", key: "sumS" },
                { label: "โทรไม่สำเร็จ (%)", key: null },
              ].map((h, i) => (
                <th
                  key={h.label}
                  onClick={() => (h.key ? onSort(h.key as SortKey) : null)}
                  className={`px-4 py-3 text-right group transition-colors hover:text-slate-800 bg-purple-50/10 ${h.key ? "cursor-pointer" : ""} ${i === 1 ? "text-purple-700" : ""}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    {h.label}
                    {h.key && <SortIcon columnKey={h.key as SortKey} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {summaryData.map(([compositeKey, sums], rowIndex) => {
              const [keyE, keyF] = compositeKey.split("||");
              const rowSuccessRate =
                sums.sumH > 0 ? (sums.sumM / sums.sumH) * 100 : 0;
              const callSuccessRate =
                sums.sumH > 0 ? (sums.sumQ / sums.sumH) * 100 : 0;
              const callFailRate =
                sums.sumH > 0 ? (sums.sumS / sums.sumH) * 100 : 0;
              const displaySuccessRate = parseFloat(rowSuccessRate.toFixed(1));
              const displayCallRate = parseFloat(callSuccessRate.toFixed(1));

              return (
                <tr
                  key={compositeKey}
                  onClick={() => onShowDetails(compositeKey)}
                  className="group hover:bg-blue-50/50 hover:shadow-md cursor-pointer transition-all duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 transition-colors border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 text-slate-700 group-hover:text-blue-700 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                      </span>
                      <span className="transform group-hover:translate-x-1 transition-transform">{keyF}</span>
                    </div>
                  </td>
                  {/* Delivery Columns */}
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-right tabular-nums bg-emerald-50/5 group-hover:bg-emerald-50/20">
                    {sums.sumH.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-right tabular-nums bg-emerald-50/5 group-hover:bg-emerald-50/20">
                    {sums.sumI > 0 ? sums.sumI.toLocaleString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-right tabular-nums bg-emerald-50/5 group-hover:bg-emerald-50/20">
                    {sums.sumK.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 text-right tabular-nums bg-emerald-50/5 group-hover:bg-emerald-50/20">
                    {sums.sumM.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right border-r border-slate-100 bg-emerald-50/5 group-hover:bg-emerald-50/20">
                    <div className="flex flex-col items-end gap-1.5 w-full">
                      <span
                        className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${getBadgeClass(displaySuccessRate)}`}
                      >
                        {rowSuccessRate.toFixed(1)}%
                      </span>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getProgressColor(displaySuccessRate)}`} 
                          style={{ width: `${Math.min(100, Math.max(0, rowSuccessRate))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  {/* Call Columns */}
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-right tabular-nums bg-purple-50/5 group-hover:bg-purple-50/20">
                    {sums.sumQ.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right bg-purple-50/5 group-hover:bg-purple-50/20">
                    <div className="flex flex-col items-end gap-1.5 w-full">
                      <span
                        className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${getBadgeClass(displayCallRate)}`}
                      >
                        {callSuccessRate.toFixed(1)}%
                      </span>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getProgressColor(displayCallRate)}`} 
                          style={{ width: `${Math.min(100, Math.max(0, callSuccessRate))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-right tabular-nums bg-purple-50/5 group-hover:bg-purple-50/20">
                    {sums.sumS.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-right tabular-nums text-xs bg-purple-50/5 group-hover:bg-purple-50/20">
                    {callFailRate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 sticky bottom-0 z-20 border-t border-slate-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            <tr className="font-bold text-slate-700">
              <td className="px-6 py-5 text-sm uppercase text-right sticky left-0 bg-slate-50 z-30">
                รวมทั้งหมด
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right tabular-nums">
                {summaryKPIs.H.toLocaleString()}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-slate-400 text-right tabular-nums">
                {summaryKPIs.I.toLocaleString()}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right tabular-nums">
                {summaryKPIs.K.toLocaleString()}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right tabular-nums text-slate-900">
                {summaryKPIs.M.toLocaleString()}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right">
                <div className="flex flex-col items-end gap-2 w-full">
                  <span
                    className={`px-3 py-1 rounded-lg border shadow-sm text-sm font-black ${parseFloat(summaryKPIs.successRate.toFixed(1)) >= 98 ? "bg-emerald-500 text-white border-emerald-600" : parseFloat(summaryKPIs.successRate.toFixed(1)) >= 95 ? "bg-yellow-400 text-slate-900 border-yellow-500" : "bg-rose-500 text-white border-rose-600"}`}
                  >
                    {summaryKPIs.successRate.toFixed(1)}%
                  </span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getProgressColor(parseFloat(summaryKPIs.successRate.toFixed(1)))}`} 
                      style={{ width: `${Math.min(100, Math.max(0, summaryKPIs.successRate))}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right tabular-nums text-slate-900">
                {(summaryKPIs.Q || 0).toLocaleString()}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right">
                <div className="flex flex-col items-end gap-2 w-full">
                  <span
                   className={`px-3 py-1 rounded-lg border shadow-sm text-sm font-black ${parseFloat((summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0).toFixed(1)) >= 98 ? "bg-emerald-500 text-white border-emerald-600" : parseFloat((summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0).toFixed(1)) >= 95 ? "bg-yellow-400 text-slate-900 border-yellow-500" : "bg-rose-500 text-white border-rose-600"}`}
                  >
                    {(summaryKPIs.H > 0
                      ? (summaryKPIs.Q / summaryKPIs.H) * 100
                      : 0
                    ).toFixed(1)}
                    %
                  </span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getProgressColor(parseFloat((summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0).toFixed(1)))}`} 
                      style={{ width: `${Math.min(100, Math.max(0, summaryKPIs.H > 0 ? (summaryKPIs.Q / summaryKPIs.H) * 100 : 0))}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right tabular-nums text-slate-400">
                {(summaryKPIs.S || 0).toLocaleString()}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-right tabular-nums text-slate-400 text-xs">
                {(summaryKPIs.H > 0
                  ? (summaryKPIs.S / summaryKPIs.H) * 100
                  : 0
                ).toFixed(1)}
                %
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PerformanceTable;
