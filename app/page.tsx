"use client";

import { useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";

import DashboardView from "./components/views/DashboardView";

export default function Home() {
  const [activeView, setActiveView] = useState<"dashboard" | "ranking">("dashboard");

  return (
    <DashboardView 
      active={activeView === "dashboard"} 
    />
  );
}
