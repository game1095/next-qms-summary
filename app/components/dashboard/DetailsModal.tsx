import React from "react";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    title: string;
    type: "service" | "office";
    details: any[];
    summary: { H: number; M: number; O: number; Q: number; S: number };
    filterLabel: string;
  };
}

const DetailsModal = ({ isOpen, onClose, data }: DetailsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100 border border-white/20 ring-1 ring-black/5 relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {data.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Filter Active:
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  {data.filterLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="group relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-300 hover:rotate-90 hover:shadow-inner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-y-auto bg-slate-50/50">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white text-slate-500 uppercase text-[10px] font-bold tracking-widest sticky top-0 shadow-sm z-10">
              <tr>
                {data.type === "office" ? (
                  <th className="py-4 px-6 text-left bg-white border-b border-slate-100">ที่ทำการ</th>
                ) : (
                  <>
                    <th className="py-4 px-6 bg-white border-b border-slate-100">บริการ</th>
                    <th className="py-4 px-6 text-center bg-white border-b border-slate-100">สถานะ COD</th>
                  </>
                )}
                <th className="py-4 px-6 text-right bg-emerald-50/50 text-emerald-700 border-b border-emerald-100/50">เตรียมการ (H)</th>
                <th className="py-4 px-6 text-right bg-emerald-50 text-emerald-800 border-b border-emerald-100">สำเร็จ (M)</th>
                <th className="py-4 px-6 text-right bg-rose-50/30 text-rose-700 border-b border-rose-100/50">ไม่สำเร็จ (O)</th>
                <th className="py-4 px-6 text-center bg-emerald-100/30 text-emerald-800 border-b border-emerald-100">อัตราสำเร็จ</th>
                <th className="py-4 px-6 text-right bg-purple-50/30 text-purple-700 border-b border-purple-100/50">
                  โทรสำเร็จ(Q)
                </th>
                <th className="py-4 px-6 text-right bg-purple-50/10 text-slate-600 border-b border-purple-100/30">
                  โทรไม่สำเร็จ(S)
                </th>
                <th className="py-4 px-6 text-center bg-purple-100/30 text-purple-800 border-b border-purple-100">
                  % โทรสำเร็จ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.details.map((item, idx) => {
                const successRate =
                  item.H > 0 ? ((item.M / item.H) * 100).toFixed(1) : "0.0";
                const callSuccessRate =
                  item.H > 0 ? ((item.Q / item.H) * 100).toFixed(1) : "0.0";
                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {data.type === "office" ? (
                      <td className="py-4 px-6 font-bold text-slate-700">
                        {item.officeName}
                      </td>
                    ) : (
                      <>
                        <td className="py-4 px-6 font-bold text-slate-700">
                          {item.service}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.codDisplay === "COD(แดง)" ? "bg-rose-100 text-rose-700 border border-rose-200" : item.codDisplay === "COD(น้ำเงิน)" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                          >
                            {item.codDisplay}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="py-4 px-6 text-right font-medium text-slate-500 tabular-nums">
                      {item.H.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-600 tabular-nums bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                      {item.M.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-rose-500 tabular-nums">
                      {item.O.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                         <span
                            className={`w-16 py-1 rounded-md text-xs font-bold text-center ${parseFloat(successRate) >= 98 ? "bg-emerald-100 text-emerald-700" : parseFloat(successRate) >= 95 ? "bg-yellow-100 text-yellow-700" : "bg-rose-100 text-rose-700"}`}
                          >
                            {successRate}%
                          </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-purple-700 tabular-nums bg-purple-50/10 group-hover:bg-purple-50/30 transition-colors">
                      {(item.Q || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-400 tabular-nums">
                      {(item.S || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <span
                            className={`w-16 py-1 rounded-md text-xs font-bold text-center ${parseFloat(callSuccessRate) >= 98 ? "bg-emerald-100 text-emerald-700" : parseFloat(callSuccessRate) >= 95 ? "bg-yellow-100 text-yellow-700" : "bg-rose-100 text-rose-700"}`}
                          >
                            {callSuccessRate}%
                          </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/90 backdrop-blur-sm border-t-2 border-slate-200 sticky bottom-0 z-20 shadow-inner">
              <tr className="font-bold text-slate-700">
                <td
                  colSpan={data.type === "office" ? 1 : 2}
                  className="py-5 px-6 text-right uppercase tracking-widest text-xs text-slate-500"
                >
                  ยอดรวมทั้งสิ้น
                </td>
                <td className="py-5 px-6 text-right tabular-nums text-slate-700 text-base">
                  {data.summary.H.toLocaleString()}
                </td>
                <td className="py-5 px-6 text-right tabular-nums text-emerald-600 text-base bg-emerald-50/30">
                  {data.summary.M.toLocaleString()}
                </td>
                <td className="py-5 px-6 text-right tabular-nums text-rose-500 text-base bg-rose-50/30">
                  {data.summary.O.toLocaleString()}
                </td>
                <td className="py-5 px-6 text-center">
                   <div className="flex items-center justify-center">
                    <span className={`w-16 py-1.5 rounded-lg text-xs font-black text-center shadow-sm ${parseFloat((data.summary.H > 0 ? (data.summary.M / data.summary.H) * 100 : 0).toFixed(1)) >= 98 ? "bg-emerald-500 text-white shadow-emerald-500/30" : parseFloat((data.summary.H > 0 ? (data.summary.M / data.summary.H) * 100 : 0).toFixed(1)) >= 95 ? "bg-yellow-400 text-black shadow-yellow-400/30" : "bg-rose-500 text-white shadow-rose-500/30"}`}>
                        {(data.summary.H > 0
                        ? (data.summary.M / data.summary.H) * 100
                        : 0
                        ).toFixed(1)}
                        %
                    </span>
                   </div>
                </td>
                <td className="py-5 px-6 text-right tabular-nums text-purple-700 text-base bg-purple-50/30">
                  {(data.summary.Q || 0).toLocaleString()}
                </td>
                <td className="py-5 px-6 text-right tabular-nums text-slate-500 text-base">
                  {(data.summary.S || 0).toLocaleString()}
                </td>
                <td className="py-5 px-6 text-center">
                   <div className="flex items-center justify-center">
                    <span className={`w-16 py-1.5 rounded-lg text-xs font-black text-center shadow-sm ${parseFloat((data.summary.H > 0 ? (data.summary.Q / data.summary.H) * 100 : 0).toFixed(1)) >= 98 ? "bg-emerald-500 text-white shadow-emerald-500/30" : parseFloat((data.summary.H > 0 ? (data.summary.Q / data.summary.H) * 100 : 0).toFixed(1)) >= 95 ? "bg-yellow-400 text-black shadow-yellow-400/30" : "bg-rose-500 text-white shadow-rose-500/30"}`}>
                        {(data.summary.H > 0
                        ? (data.summary.Q / data.summary.H) * 100
                        : 0
                        ).toFixed(1)}
                        %
                    </span>
                   </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;
