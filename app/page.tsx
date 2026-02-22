"use client";

import { useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";

import DashboardView from "./components/views/DashboardView";

export default function Home() {
  return (
    <DashboardView active={true} />
  );
}
