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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden selection:bg-rose-100 selection:text-rose-900 font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50 via-slate-50 to-rose-50 opacity-80"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-3xl animate-pulse"></div>
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-rose-400/20 to-orange-300/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-white/50 relative z-10 p-10 overflow-hidden group animate-in zoom-in-95 duration-700">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500"></div>
        
        <div className="text-center space-y-6 mb-10">
          <div className="relative inline-block group-hover:scale-110 transition-transform duration-500 ease-out">
            <div className="absolute inset-0 bg-rose-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
            <div className="w-24 h-24 bg-gradient-to-bl from-rose-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-5xl font-black shadow-2xl relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              Q
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Admin</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              QMS Dashboard Summary
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 text-center font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            {errorMsg === "Invalid login credentials"
              ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
              : errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2 group/input">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-rose-500 transition-colors">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 font-semibold focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none placeholder:text-slate-300 shadow-inner"
              placeholder="name@company.com"
            />
          </div>
          <div className="space-y-2 group/input">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-rose-500 transition-colors">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 font-semibold focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none placeholder:text-slate-300 shadow-inner"
              placeholder="••••••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all transform flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group/btn overflow-hidden relative"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer"></div>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                Sign In
                <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </>
            )}
          </button>
        </form>
      </div>
      
      <p className="fixed bottom-8 text-center text-slate-400 text-sm font-medium z-10 w-full">
        &copy; {new Date().getFullYear()} Next QMS Summary. All rights reserved.
      </p>
    </div>
  );
};

export default LoginView;
