"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";

import LoginView from "./components/views/LoginView";
import DashboardView from "./components/views/DashboardView";
import RankingView from "./components/views/RankingView";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"dashboard" | "ranking">("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className="text-slate-400 font-medium animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <DashboardView 
      active={activeView === "dashboard"} 
      onOpenRankingView={() => window.open("/ranking", "_blank")}
      onOpenComparisonView={() => window.open("/comparison", "_blank")}
    />
  );
}
