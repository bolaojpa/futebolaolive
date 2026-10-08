import { Trophy, Moon, Sun } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-100 tracking-tight">
            Futebolão<span className="text-emerald-400">Live</span>
          </span>
        </div>

        <button className="p-2 rounded-full hover:bg-slate-800 text-slate-300 transition-colors">
          <Moon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
