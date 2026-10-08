"use client";

import { cn } from "@/lib/utils";

export type StatusFilterType = "ALL" | "LIVE" | "SCHEDULED" | "FINISHED";

interface StatusFilterProps {
  activeStatus: StatusFilterType;
  onSelect: (status: StatusFilterType) => void;
}

export function StatusFilter({ activeStatus, onSelect }: StatusFilterProps) {
  const filters: { value: StatusFilterType; label: string; icon?: string }[] = [
    { value: "ALL", label: "Todos" },
    { value: "LIVE", label: "Ao Vivo", icon: "🔴" },
    { value: "SCHEDULED", label: "Agendados", icon: "⏳" },
    { value: "FINISHED", label: "Finalizados", icon: "✅" },
  ];

  return (
    <div className="container mx-auto px-4 py-4 flex gap-2 overflow-x-auto scrollbar-none">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onSelect(filter.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
            activeStatus === filter.value
              ? "bg-slate-700 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          {filter.icon && <span className="mr-1.5">{filter.icon}</span>}
          {filter.label}
        </button>
      ))}
    </div>
  );
}
