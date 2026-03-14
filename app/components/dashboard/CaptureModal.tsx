import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
  key: string;
  label: string;
}

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: Option[];
  onConfirm: (selectedKeys: string[], selectedComponents: string[]) => void;
}

const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  options,
  onConfirm,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([
    "insights",
    "charts",
    "kpi",
  ]);

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(options.map((o) => o.key));
      setSelectedComponents(["insights", "charts", "kpi"]);
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const isAllSelected =
    options.every((o) => selectedKeys.includes(o.key)) && options.length > 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      // Remove all options from selected keys
      setSelectedKeys([]);
    } else {
      // Add all options to selected keys
      setSelectedKeys(options.map((o) => o.key));
    }
  };

  const handleToggleOne = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter((k) => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const handleToggleComponent = (comp: string) => {
    if (selectedComponents.includes(comp)) {
      setSelectedComponents(selectedComponents.filter((c) => c !== comp));
    } else {
      setSelectedComponents([...selectedComponents, comp]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-[1280px] h-[95vh] lg:h-[90vh] flex flex-col border border-white/60 transform transition-all animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Subtle top gradient line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 z-30"></div>

        {/* Header */}
        <div className="px-6 py-6 sm:px-10 border-b border-slate-100/60 flex justify-between items-center bg-white/95 backdrop-blur-2xl relative z-20 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100/50 flex items-center justify-center text-teal-600 shadow-[inset_0_2px_10px_rgba(20,184,166,0.1)] border border-teal-100/50">
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-[1.35rem] font-bold text-slate-800 tracking-tight leading-tight">
                ดาวน์โหลดรายงานภาพรวม
              </h3>
              <p className="text-[0.95rem] font-medium text-slate-500 mt-1.5">
                ปรับแต่งข้อมูลและพื้นที่ที่ต้องการบันทึกเป็นรูปภาพ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 bg-slate-50/50 overflow-hidden flex-1 min-h-0 relative z-10">
          {/* Left Column: Selections */}
          <div className="flex-1 p-6 sm:p-10 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200/60 bg-white/40">
            <div className="flex flex-col gap-10">
              {/* Area Selection Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                    <h4 className="text-lg font-bold text-slate-800">
                      เลือกพื้นที่
                    </h4>
                    <span className="ml-2 text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {selectedKeys.length} / {options.length} เลือกแล้ว
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Select All */}
                  <button
                    onClick={handleToggleAll}
                    className={`px-5 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-300 border flex items-center gap-2.5 shadow-sm hover:shadow-md ${
                      isAllSelected
                        ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-700 hover:scale-[1.02]"
                        : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:text-slate-900 hover:scale-[1.02]"
                    }`}
                  >
                    {isAllSelected ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : null}
                    เลือกทั้งหมด
                  </button>

                  {options.length > 0 && (
                    <div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>
                  )}

                  {options.map((option) => {
                    const isSelected = selectedKeys.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        onClick={() => handleToggleOne(option.key)}
                        className={`px-5 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-300 border flex items-center gap-2.5 hover:-translate-y-0.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] active:scale-95 ${
                          isSelected
                            ? "bg-gradient-to-r from-teal-50 to-emerald-50/30 text-teal-800 border-teal-500/30 font-semibold ring-1 ring-teal-500/20"
                            : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 hover:text-slate-900"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 text-teal-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-slate-200/60 w-full rounded-full"></div>

              {/* Component Selection Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]"></div>
                  <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                    เลือกข้อมูลที่ต้องการแสดง
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {/* Table (Always Included) */}
                  <button
                    disabled
                    className="px-5 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-300 border flex items-center gap-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] bg-slate-100/80 text-slate-400 border-slate-200/50 cursor-not-allowed"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    ตารางข้อมูล (ค่าเริ่มต้น)
                  </button>

                  {/* AI Insights */}
                  <button
                    onClick={() => handleToggleComponent("insights")}
                    className={`px-5 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-300 border flex items-center gap-2.5 hover:-translate-y-0.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] active:scale-95 ${
                      selectedComponents.includes("insights")
                        ? "bg-gradient-to-r from-teal-50 to-emerald-50/30 text-teal-800 border-teal-500/30 font-semibold ring-1 ring-teal-500/20"
                        : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 hover:text-slate-900"
                    }`}
                  >
                    {selectedComponents.includes("insights") && (
                      <svg
                        className="w-3.5 h-3.5 text-teal-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    AI Daily Insights
                  </button>

                  {/* Charts */}
                  <button
                    onClick={() => handleToggleComponent("charts")}
                    className={`px-5 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-300 border flex items-center gap-2.5 hover:-translate-y-0.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] active:scale-95 ${
                      selectedComponents.includes("charts")
                        ? "bg-gradient-to-r from-teal-50 to-emerald-50/30 text-teal-800 border-teal-500/30 font-semibold ring-1 ring-teal-500/20"
                        : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 hover:text-slate-900"
                    }`}
                  >
                    {selectedComponents.includes("charts") && (
                      <svg
                        className="w-3.5 h-3.5 text-teal-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    กราฟแนวโน้ม
                  </button>

                  {/* KPI Cards */}
                  <button
                    onClick={() => handleToggleComponent("kpi")}
                    className={`px-5 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-300 border flex items-center gap-2.5 hover:-translate-y-0.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] active:scale-95 ${
                      selectedComponents.includes("kpi")
                        ? "bg-gradient-to-r from-teal-50 to-emerald-50/30 text-teal-800 border-teal-500/30 font-semibold ring-1 ring-teal-500/20"
                        : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 hover:text-slate-900"
                    }`}
                  >
                    {selectedComponents.includes("kpi") && (
                      <svg
                        className="w-3.5 h-3.5 text-teal-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    KPI Cards
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Preview Pane */}
          <div className="w-full lg:w-[480px] xl:w-[550px] bg-slate-50 lg:bg-slate-100/40 p-6 sm:p-10 flex flex-col pt-8 relative overflow-hidden">
            {/* Subtle background decoration for preview pane */}
            <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>

            <div className="flex items-center gap-3 mb-8 px-2 relative z-10">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)]"></div>
              <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                ตัวอย่างรูปแบบการแสดงผล
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 relative z-10 w-full flex justify-center">
              <motion.div
                layout
                className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/60 p-5 sm:p-6 w-full max-w-md flex flex-col gap-5 mx-auto origin-top"
              >
                {/* Empty State Warning */}
                <AnimatePresence>
                  {selectedKeys.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 flex gap-3 text-rose-600 shadow-sm">
                        <svg
                          className="w-5 h-5 shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-bold">
                            ยังไม่ได้เลือกพื้นที่
                          </p>
                          <p className="text-xs mt-0.5 opacity-90">
                            กรุณาเลือกพื้นที่อย่างน้อย 1
                            แห่งเพื่อดูตัวอย่างและดาวน์โหลด
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mock Header (Always Visible) */}
                <motion.div
                  layout
                  className="flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <div className="w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
                  <div className="w-16 h-4 bg-slate-100 rounded"></div>
                </motion.div>

                {/* Mock AI Insights */}
                <AnimatePresence>
                  {selectedComponents.includes("insights") && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, height: 0 }}
                      animate={{ opacity: 1, scale: 1, height: "auto" }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-gradient-to-br from-teal-50/80 to-emerald-50/40 border border-teal-100/60 p-3.5 space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-teal-400"></div>
                          <div className="w-20 h-3 bg-teal-200 rounded"></div>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded"></div>
                        <div className="w-5/6 h-2 bg-slate-200/80 rounded shrink-0"></div>
                        <div className="w-4/6 h-2 bg-slate-200/80 rounded shrink-0"></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mock KPI Cards */}
                <AnimatePresence>
                  {selectedComponents.includes("kpi") && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, height: 0 }}
                      animate={{ opacity: 1, scale: 1, height: "auto" }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="bg-white border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-xl p-3 space-y-2.5"
                          >
                            <div className="w-10 h-2 bg-slate-100 rounded"></div>
                            <div className="w-16 h-4 bg-slate-800 rounded"></div>
                            <div className="w-12 h-2.5 bg-emerald-100 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mock Charts */}
                <AnimatePresence>
                  {selectedComponents.includes("charts") && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, height: 0 }}
                      animate={{ opacity: 1, scale: 1, height: "auto" }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-xl p-3.5 h-[140px] flex flex-col">
                        <div className="w-24 h-3 bg-slate-200/80 rounded mb-auto"></div>
                        {/* Chart lines mock */}
                        <div className="flex items-end justify-between h-16 gap-1 w-full mt-4">
                          <div className="w-full bg-blue-100 rounded-t h-[40%]"></div>
                          <div className="w-full bg-blue-100 rounded-t h-[60%]"></div>
                          <div className="w-full bg-blue-200 rounded-t h-[30%]"></div>
                          <div className="w-full bg-blue-300 rounded-t h-[80%]"></div>
                          <div className="w-full bg-blue-400 rounded-t h-[50%]"></div>
                          <div className="w-full bg-blue-500 rounded-t h-[90%]"></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mock Table (Always Visible) */}
                <motion.div
                  layout
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]"
                >
                  <div className="bg-slate-50 p-2.5 border-b border-slate-200/80 flex gap-2">
                    <div className="w-1/3 h-2 bg-slate-200 rounded"></div>
                    <div className="w-1/3 h-2 bg-slate-200 rounded"></div>
                    <div className="w-1/3 h-2 bg-slate-200 rounded"></div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-2 border-b border-slate-100 flex gap-2 last:border-0"
                    >
                      <div className="w-1/3 h-2 bg-slate-100 rounded"></div>
                      <div className="w-1/3 h-2 bg-slate-100 rounded"></div>
                      <div className="w-1/3 h-2 bg-slate-100 rounded"></div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 sm:px-10 border-t border-slate-100/80 bg-white/95 backdrop-blur-xl flex justify-end gap-3 sm:gap-4 relative z-20 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3.5 bg-transparent text-slate-500 rounded-2xl font-bold hover:bg-slate-100 hover:text-slate-800 transition-all duration-300 min-w-[120px] active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => {
              if (selectedKeys.length > 0) {
                onConfirm(selectedKeys, selectedComponents);
              }
            }}
            disabled={selectedKeys.length === 0}
            className={`px-8 py-3.5 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 ${
              selectedKeys.length > 0
                ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_8px_20px_-6px_rgba(20,184,166,0.4)] hover:shadow-[0_12px_25px_-8px_rgba(20,184,166,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>ดาวน์โหลดทันที</span>
            {selectedKeys.length > 0 && (
              <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full backdrop-blur-sm shadow-inner transition-colors">
                {selectedKeys.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollbar Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `,
        }}
      />
    </div>
  );
};

export default CaptureModal;
