import React, { useState, useEffect } from "react";

interface WelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("hasSeenWelcomeGuide", "true");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/20 flex flex-col max-h-[90vh]">
        {/* Header with decorative background */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shrink-0">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl -ml-10 -mb-5"></div>

          <div className="relative z-10 flex items-start gap-5">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/10 shrink-0">
              💎
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                ยินดีต้อนรับสู่ระบบ QMS Dashboard
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed max-w-md">
                แพลตฟอร์มวิเคราะห์ศักยภาพการนำจ่าย EMS สุดล้ำสมัย
                รวบรวมข้อมูลสำคัญเพื่อการตัดสินใจที่แม่นยำ
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <div className="p-6 space-y-6">
            {/* Section 1: Measurement */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                การวัดผลและติดตาม (Monitoring)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FeatureCard
                  icon="📊"
                  title="ภาพรวมรายวัน (Daily Overview)"
                  desc="ติดตามปริมาณงานนำจ่ายและผลสำเร็จ (Success %) แบบ Real-time เปรียบเทียบกับเป้าหมาย"
                />
                <FeatureCard
                  icon="📞"
                  title="ประสิทธิภาพการโทร (Call Stats)"
                  desc="วิเคราะห์อัตราการโทรสำเร็จ (Q) และจำนวนการโทรทั้งหมด เพื่อปรับปรุงคุณภาพการบริการ"
                />
                <FeatureCard
                  icon="📈"
                  title="แนวโน้มผลงาน (Trend Charts)"
                  desc="กราฟเส้นแสดงพัฒนาการของผลงานย้อนหลัง ช่วยวิเคราะห์แนวโน้มการเติบโตหรือปัญหา"
                />
                <FeatureCard
                  icon="🗺️"
                  title="เจาะลึกรายพื้นที่ (Heatmap)"
                  desc="ดูผลงานแยกตามจังหวัด หรือ ปณ. พร้อมไฮไลท์พื้นที่ที่ต้องเร่งปรับปรุง"
                />
              </div>
            </div>

            {/* Section 2: Analysis & Comparison */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                การวิเคราะห์และเปรียบเทียบ (Analysis & Comparison)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FeatureCard
                  icon="⚖️"
                  title="ตารางเปรียบเทียบ (Comparison View)"
                  desc="วัดความเคลื่อนไหวและพัฒนาการในช่วงเวลาที่แตกต่างกันแบบเจาะลึกรายที่ทำการ"
                />
                <FeatureCard
                  icon="🎯"
                  title="เมทริกซ์วิเคราะห์กลุ่ม (Performance Matrix)"
                  desc="กราฟกระจาย (Scatter Plot) แจกแจงผลงานเทียบปริมาณงาน เพื่อหาจุดเด่นและจุดที่ต้องพัฒนา"
                />
              </div>
            </div>

            {/* Section 3: Tools */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                เครื่องมือและฟีเจอร์ช่วยอำนวยความสะดวก
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FeatureCard
                  icon="🔍"
                  title="ตัวกรองอัจฉริยะ (Smart Filters)"
                  desc="ระบบกรองข้อมูลหลายมิติ: ช่วงเวลา (วัน/เดือน), ประเภทงาน (EMS/COD/E-Commerce) และ พื้นที่"
                />
                <FeatureCard
                  icon="📷"
                  title="บันทึกรูปภาพ (Save Image)"
                  desc="Export กราฟและตารางเป็นไฟล์รูปภาพความละเอียดสูง เพื่อนำไปใช้ใน Presentation ได้ทันที"
                />
                <FeatureCard
                  icon="📥"
                  title="ดาวน์โหลด Report เชิงลึก (Export to Excel)"
                  desc="สกัดข้อมูลวิเคราะห์ทั้งหมดแบบสำเร็จรูปเป็นไฟล์ .xlsx เพื่อนำไปใช้ต่อ"
                />
                <FeatureCard
                  icon="⚡"
                  title="รายงานของตกค้าง (Unreported)"
                  desc="ตรวจสอบพัสดุสถานะ I (ยังไม่รายงานผล) เพื่อติดตามแก้ปัญหาได้ทันท่วงที"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white z-20 shrink-0">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer group self-start">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-blue-500 checked:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                ไม่ต้องแสดงหน้านี้อีกในครั้งถัดไป
              </span>
            </label>

            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              เริ่มต้นใช้งาน
            </button>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center justify-center gap-1">
                Made with
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3 h-3 text-red-500 animate-pulse"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                by <span className="text-indigo-600 font-bold">Megamind</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) => (
  <div className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group">
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-xl shrink-0 transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
          {title}
        </h4>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  </div>
);

export default WelcomeGuide;
