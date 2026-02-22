"use client";

import React, { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const LoginView = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      window.location.href = "/"; // Force a full page reload so middleware catches the new session cookies
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden selection:bg-rose-100 selection:text-rose-900 font-sans p-4">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50 via-slate-50 to-rose-50 opacity-80"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-3xl animate-pulse"></div>
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-rose-400/20 to-orange-300/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-[1200px] w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
        
        {/* Left Column: Features (Hidden on small screens or stacked) */}
        <div className="lg:col-span-7 space-y-8 order-2 lg:order-1 animate-in slide-in-from-left-4 duration-700">
          <div className="space-y-4 text-center lg:text-left">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                QMS Dashboard 2.0
             </div>
             <h1 className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tight leading-tight">
               ระบบติดตามและประเมินผล <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">การนำจ่าย EMS</span>
             </h1>
             <p className="text-slate-500 text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
               แพลตฟอร์มวิเคราะห์ข้อมูลอัจฉริยะ รวบรวมสถิติ Real-time เพื่อการตัดสินใจที่แม่นยำและรวดเร็ว
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monitoring Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-300"></span>
                Monitoring
              </h3>
              <div className="space-y-3">
                 <FeatureCard 
                  icon="📊" 
                  title="Daily Overview" 
                  desc="ติดตามปริมาณงานและผลสำเร็จ (Success %) แบบ Real-time"
                />
                 <FeatureCard 
                  icon="📈" 
                  title="Trend Analysis" 
                  desc="วิเคราะห์แนวโน้มผลงานย้อนหลังเพื่อวางแผนปรับปรุง"
                />
                 <FeatureCard 
                  icon="🗺️" 
                  title="Geo Heatmap" 
                  desc="เจาะลึกพื้นที่ที่มีปัญหาผ่านแผนที่ความร้อนรายจังหวัด"
                />
              </div>
            </div>

            {/* Tools Section */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-300"></span>
                Tools
              </h3>
              <div className="space-y-3">
                <FeatureCard 
                  icon="🔍" 
                  title="Smart Filters" 
                  desc="กรองข้อมูลละเอียดหลายมิติ: พื้นที่, ประเภทบริการ, เวลา"
                />
                <FeatureCard 
                  icon="🏆" 
                  title="Performance Ranking" 
                  desc="จัดอันดับหน่วยงานที่มีผลงานดีเยี่ยมและต้องปรับปรุง"
                />
                <FeatureCard 
                  icon="📷" 
                  title="Instant Report" 
                  desc="Export กราฟและตารางเป็นไฟล์รูปภาพความละเอียดสูง"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="w-full bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-white/50 p-8 lg:p-10 animate-in zoom-in-95 duration-700 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500"></div>
            
            <div className="text-center space-y-6 mb-8">
              <div className="relative inline-block group-hover:scale-110 transition-transform duration-500 ease-out">
                <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                <div className="w-20 h-20 bg-gradient-to-bl from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-2xl relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  Q
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-slate-500 font-medium">
                  เข้าสู่ระบบเพื่อดูข้อมูลของคุณ
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 text-center font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                {errorMsg === "Invalid login credentials"
                  ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
                  : errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5 group/input">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-blue-600 transition-colors">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 font-semibold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300 shadow-inner"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-1.5 group/input">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-blue-600 transition-colors">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 font-semibold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300 shadow-inner"
                  placeholder="••••••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                Developed by <span className="text-indigo-600 font-bold">งานรับฝากและส่งต่อ ปข.6</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
  <div className="p-3 rounded-xl bg-white/60 border border-white/50 backdrop-blur-sm hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default">
    <div className="flex gap-3 items-start">
      <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center text-xl shrink-0 transition-all duration-300 shadow-sm">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{title}</h4>
        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  </div>
);

export default LoginView;
