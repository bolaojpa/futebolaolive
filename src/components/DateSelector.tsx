"use client";

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  selectedDate: Date;
  onChangeDate: (newDate: Date) => void;
}

export function DateSelector({ selectedDate, onChangeDate }: DateSelectorProps) {
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    onChangeDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    onChangeDate(newDate);
  };

  const handleToday = () => {
    onChangeDate(new Date());
  };

  const isToday = new Date().toDateString() === selectedDate.toDateString();

  // Formata a exibição: "Hoje", "Ontem", "Amanhã" ou "15 Out, Ter"
  const getDisplayDate = () => {
    if (isToday) return "Hoje";
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate.toDateString() === yesterday.toDateString()) return "Ontem";

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate.toDateString() === tomorrow.toDateString()) return "Amanhã";

    return selectedDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      weekday: "short"
    }).replace(".", ""); // Remove ponto de 'out.'
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
      <button 
        onClick={handlePrevDay}
        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-4">
        <button 
          className="flex items-center gap-2 font-semibold text-slate-100 hover:text-emerald-400 transition-colors capitalize"
          // Opcional no futuro: Abrir um modal de calendário aqui
        >
          <CalendarIcon className="w-4 h-4 text-emerald-500" />
          {getDisplayDate()}
        </button>

        {!isToday && (
          <button 
            onClick={handleToday}
            className="text-xs font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
          >
            VOLTAR P/ HOJE
          </button>
        )}
      </div>

      <button 
        onClick={handleNextDay}
        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
