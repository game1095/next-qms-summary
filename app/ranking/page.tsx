"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import RankingView from "../components/views/RankingView";
import LoginView from "../components/views/LoginView";
import { DeliveryDataRow } from "../types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RankingPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseData, setSupabaseData] = useState<DeliveryDataRow[]>([]);
  const [prevSupabaseData, setPrevSupabaseData] = useState<DeliveryDataRow[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Initialize with yesterday's date
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setStartDate(new Date(yesterday));
    setEndDate(new Date(yesterday));
  }, []);

  // Fetch data when dates change
  useEffect(() => {
    if (startDate && endDate && session) {
      fetchData();
    }
  }, [startDate, endDate, session]);

  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    setSupabaseData([]);
    setPrevSupabaseData([]);

    const isoStartDate = formatDateToISO(startDate);
    const isoEndDate = formatDateToISO(endDate);

    const dayDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)
    );

    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - Math.max(0, dayDiff));

    const isoPrevStartDate = formatDateToISO(prevStart);
    const isoPrevEndDate = formatDateToISO(prevEnd);

    try {
      const fetchRange = async (s: string, e: string) => {
        let allData: DeliveryDataRow[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          const { data, error } = await supabase
            .from("delivery_data")
            .select("*")
            .gte("report_date", s)
            .lte("report_date", e)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;
          if (data && data.length > 0) {
            allData = [...allData, ...(data as DeliveryDataRow[])];
            if (data.length < pageSize) hasMore = false;
            else page++;
          } else {
            hasMore = false;
          }
        }
        return allData;
      };

      const [currentData, prevData] = await Promise.all([
        fetchRange(isoStartDate!, isoEndDate!),
        fetchRange(isoPrevStartDate!, isoPrevEndDate!),
      ]);

      setSupabaseData(currentData);
      setPrevSupabaseData(prevData);
    } catch (error: any) {
      console.error("Error fetching delivery data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="text-slate-400 font-medium animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-purple-200">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-200">
              📊
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent hidden md:block">
              ระบบจัดอันดับนำจ่าย
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {/* Date Shortcuts */}
            <div className="flex bg-slate-100 p-1 rounded-xl hidden xl:flex">
               <button 
                 onClick={() => {
                   const yesterday = new Date();
                   yesterday.setDate(yesterday.getDate() - 1);
                   setStartDate(yesterday);
                   setEndDate(yesterday);
                 }}
                 className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
               >
                 เมื่อวาน
               </button>
               <button 
                 onClick={() => {
                   const end = new Date();
                   end.setDate(end.getDate() - 1);
                   const start = new Date();
                   start.setDate(start.getDate() - 7);
                   setStartDate(start);
                   setEndDate(end);
                 }}
                 className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
               >
                 7 วัน
               </button>
               <button 
                 onClick={() => {
                   const date = new Date();
                   const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                   setStartDate(firstDay);
                   setEndDate(date);
                 }}
                 className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
               >
                 เดือนนี้
               </button>
                <button 
                 onClick={() => {
                   const date = new Date();
                   const firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1);
                   const lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
                   setStartDate(firstDay);
                   setEndDate(lastDay);
                 }}
                 className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
               >
                 เดือนก่อน
               </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
              <div className="relative group">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="w-24 md:w-28 px-2 py-2 rounded-lg border-transparent bg-transparent focus:bg-white focus:ring-2 focus:ring-purple-200 text-sm font-semibold text-slate-700 text-center transition-all cursor-pointer hover:bg-white/50"
                  placeholderText="เริ่มต้น"
                  maxDate={new Date()}
                />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </div>
              <span className="text-slate-400 font-medium">→</span>
              <div className="relative group">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="w-24 md:w-28 px-2 py-2 rounded-lg border-transparent bg-transparent focus:bg-white focus:ring-2 focus:ring-purple-200 text-sm font-semibold text-slate-700 text-center transition-all cursor-pointer hover:bg-white/50"
                  placeholderText="สิ้นสุด"
                  maxDate={new Date()}
                  minDate={startDate || undefined}
                />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </div>
            </div>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold text-sm shadow-lg hover:shadow-slate-300 hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-700 ${isLoading ? "animate-spin" : "group-hover:rotate-180"}`}
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
              <span>{isLoading ? "กำลังโหลด..." : "รีเฟรช"}</span>
            </button>
            
             {/* Data Count Indicator */}
             {supabaseData.length > 0 && (
                <div className="hidden lg:flex flex-col items-end leading-tight px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Items</span>
                  <span className="text-sm font-black text-slate-700 font-mono">{supabaseData.length.toLocaleString()}</span>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-8">
        {isLoading && supabaseData.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-purple-600 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
            <h2 className="mt-8 text-xl font-bold text-slate-400 animate-pulse">
              กำลังรวบรวมข้อมูล...
            </h2>
          </div>
        ) : (
          <RankingView
            currentData={supabaseData}
            prevData={prevSupabaseData}
            selectedFilter="all"
            selectedServiceFilter="all"
          />
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .react-datepicker-wrapper {
          width: auto;
        }
        
        .react-datepicker {
          font-family: inherit;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          overflow: hidden;
        }
        
        .react-datepicker__header {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding-top: 1rem;
        }
        
        .react-datepicker__current-month {
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        
        .react-datepicker__day-name {
          color: #64748b;
          font-weight: 600;
          width: 2.5rem;
        }
        
        .react-datepicker__day {
          width: 2.5rem;
          line-height: 2.5rem;
          border-radius: 0.5rem;
          margin: 0.1rem;
          font-weight: 500;
        }
        
        .react-datepicker__day--selected {
          background: #6366f1;
          color: white;
        }
        
        .react-datepicker__day:hover {
          background: #eef2ff;
        }
        
        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
}
