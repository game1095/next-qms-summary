"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";

import LoginView from "./components/views/LoginView";
import DashboardView from "./components/views/DashboardView";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <LoginView />;
  }

  return <DashboardView active={true} />;
}
