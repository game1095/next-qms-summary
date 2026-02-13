import React from "react";
import DatePicker from "react-datepicker";
import { FILE_KEYS } from "../../../lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadDate: Date | null;
  setUploadDate: (date: Date | null) => void;
  uploadFileNames: { [key: string]: string };
  onFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    fileKey: string,
  ) => void;
  onSubmit: () => void;
  isUploading: boolean;
}

const UploadModal = ({
  isOpen,
  onClose,
  uploadDate,
  setUploadDate,
  uploadFileNames,
  onFileChange,
  onSubmit,
  isUploading,
}: UploadModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100 border border-white/20 ring-1 ring-black/5">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
              อัปโหลดข้อมูลใหม่
            </h3>
          </div>
          <button
            onClick={onClose}
            className="group relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-white hover:bg-rose-500 transition-all duration-300 shadow-sm hover:shadow-rose-500/30 hover:rotate-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 transition-transform group-hover:scale-110"
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
        <div className="p-8 overflow-y-auto space-y-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              วันที่ของข้อมูล
            </label>
            <DatePicker
              selected={uploadDate}
              onChange={setUploadDate}
              dateFormat="dd/MM/yyyy"
              className="w-full rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 py-3 shadow-sm text-slate-600 font-medium transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FILE_KEYS.map((key) => (
              <div
                key={key}
                className={`group relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 text-center ${
                  uploadFileNames[key]
                    ? "border-emerald-400 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10"
                }`}
              >
                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  {key}
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => onFileChange(e, key)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className={`py-2.5 px-4 rounded-xl border shadow-sm text-sm font-bold transition-all duration-300 ${
                      uploadFileNames[key]
                        ? "bg-white border-emerald-200 text-emerald-600"
                        : "bg-white border-slate-200 text-slate-600 group-hover:border-blue-200 group-hover:text-blue-600"
                    }`}
                  >
                    {uploadFileNames[key] ? "เปลี่ยนไฟล์" : "เลือกไฟล์ Excel"}
                  </div>
                </div>
                {uploadFileNames[key] && (
                  <p className="text-xs text-emerald-600 mt-3 font-bold flex items-center justify-center gap-1 animate-fade-in-up">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {uploadFileNames[key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3 backdrop-blur-md">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-500 font-bold hover:bg-white hover:text-slate-700 hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-200"
          >
            ยกเลิก
          </button>
          <button
            onClick={onSubmit}
            disabled={isUploading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                กำลังอัปโหลด...
              </span>
            ) : (
              "ยืนยันข้อมูล"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
