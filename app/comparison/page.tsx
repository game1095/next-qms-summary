"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ComparisonView from "../components/views/ComparisonView";
import { DeliveryDataRow } from "../types";
import { formatDateToISO } from "../../lib/utils";

import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";

export default function ComparisonPage() {
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
    if (dateA && dateB) {
      fetchData();
    }
  }, [dateA, dateB]); // Fetch data when dates change

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
          
          <div className="flex items-center gap-3">
             <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                <span className="hidden sm:inline">หน้าหลัก</span>
             </Link>
             <Link
                href="/ranking"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 rounded-xl text-sm font-bold transition-all"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"/></svg>
                <span className="hidden sm:inline">อันดับ</span>
             </Link>
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
    </div>
  );
}
