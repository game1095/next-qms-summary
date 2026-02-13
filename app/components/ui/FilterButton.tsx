import React from "react";

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterButton = ({ active, onClick, children }: FilterButtonProps) => (
  <button
    onClick={onClick}
    className={`py-2 px-4 rounded-lg text-xs font-bold transition-all duration-300 transform border shadow-sm ${
      active
        ? "bg-gradient-to-r from-slate-800 to-slate-700 text-white border-transparent shadow-slate-500/30 scale-105"
        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 hover:-translate-y-0.5"
    } active:scale-95`}
  >
    {children}
  </button>
);

export default FilterButton;
