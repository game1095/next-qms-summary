"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import ComparisonView from "../components/views/ComparisonView";
import LoginView from "../components/views/LoginView";
import { DeliveryDataRow } from "../types";
import { formatDateToISO } from "../../lib/utils";

import "react-datepicker/dist/react-datepicker.css";

export default function ComparisonPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [dataA, setDataA] = useState<DeliveryDataRow[]>([]);
  const [dataB, setDataB] = useState<DeliveryDataRow[]>([]);
  
  // Start Date (Left): 7 days before Yesterday (e.g., 8 Feb)
  const [dateA, setDateA] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 8);
    return d;
  });

  // End Date (Right): Yesterday (e.g., 15 Feb)
  const [dateB, setDateB] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); 
    return d;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Auth Check
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

  const fetchData = async () => {
    if (!dateA || !dateB) return;

    setIsLoading(true);
    setDataA([]);
    setDataB([]);

    const isoDateA = formatDateToISO(dateA);
    const isoDateB = formatDateToISO(dateB);

    if (!isoDateA || !isoDateB) return;

    try {
      const fetchDate = async (dateStr: string) => {
        let allData: DeliveryDataRow[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          const { data, error } = await supabase
            .from("delivery_data")
            .select("*")
            .eq("report_date", dateStr)
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

      const [resA, resB] = await Promise.all([
        fetchDate(isoDateA),
        fetchDate(isoDateB),
      ]);

      setDataA(resA);
      setDataB(resB);
    } catch (error: any) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    if (session && dateA && dateB) {
      fetchData();
    }
  }, [session]); // Only run on session load initially, users verify manually with refresh button

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="text-slate-400 font-medium animate-pulse">Checking permissions...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-blue-200">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              ⚖️
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent hidden md:block">
              ระบบเปรียบเทียบข้อมูล
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-8">
        <ComparisonView 
            dateA={dateA!}
            dateB={dateB!}
            dataA={dataA}
            dataB={dataB}
            isLoading={isLoading}
            onDateAChange={setDateA}
            onDateBChange={setDateB}
            onRefresh={fetchData}
        />
      </div>
      
       <style jsx global>{`
        .react-datepicker-wrapper {
          width: auto;
        }
        .react-datepicker {
          font-family: inherit;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          overflow: hidden;
        }
        .react-datepicker__header {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding-top: 1rem;
        }
        .react-datepicker__day--selected {
          background: #3b82f6;
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
