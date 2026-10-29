"use client";

import { useState, useRef, useEffect } from "react";
import { Trophy, Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme, Theme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const options: { value: Theme; label: string; icon: any }[] = [
    { value: "light", label: "Modo Claro", icon: Sun },
    { value: "dark", label: "Modo Escuro", icon: Moon },
    { value: "auto", label: "Automático (Sistema)", icon: Monitor },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md transition-colors duration-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">
            Futebolão<span className="text-emerald-500 dark:text-emerald-400">Live</span>
          </span>
        </div>

        {/* Seletor de Tema */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center"
            title={`Tema: ${theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Automático"}`}
            aria-label="Alternar tema"
          >
            {theme === "light" ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : theme === "dark" ? (
              <Moon className="w-5 h-5 text-slate-200" />
            ) : (
              <Monitor className="w-5 h-5 text-emerald-500" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-52 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                Aparência
              </div>
              {options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors",
                      isSelected
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={cn("w-4 h-4", isSelected ? "text-emerald-500" : "text-slate-400")} />
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
