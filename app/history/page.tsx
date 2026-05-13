"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppContext } from "../../context/AppContext";


// 🚀 1. PŘIDÁME TYP, ABY TYPESCRIPT VĚDĚL, CO MU PŘIJDE Z API
interface HistoryItem {
  id: string;
  type: "scan" | "recipe";
  title: string;
  photo: string;
  aiData: any; // Můžeš upřesnit, ale pro teď 'any' stačí
  createdAt: string;
}

export default function HistoryPage() {
  const { isDarkMode } = useAppContext();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);



  useEffect(() => {
    // Hned po načtení stránky se zeptáme databáze na data tohoto uživatele
    const fetchHistory = async () => {
      const userId = localStorage.getItem("junkToFitUserId");
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/history?userId=${userId}`);
        const data = await res.json();
        
        if (data.success) {
          setHistoryItems(data.data);
        }
      } catch (err) {
        console.error("Nepodařilo se načíst historii", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <main className="min-h-screen pb-24 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white p-6 font-sans">
        <div className="mb-8 text-center mt-6">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 mb-2">
            Moje Historie
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm">Všechno, co jsi u nás vyfotil.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center mt-20">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="text-center mt-20 text-slate-500">
            <span className="text-6xl block mb-4">👻</span>
            Zatím tu nic není. Běž něco vyfotit!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            {historyItems.map((item) => (
              <div key={item.id} className="flex bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-gray-800 p-3">
                {/* OBRÁZEK */}
                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-gray-800">
                  {item.photo ? (
                    <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📷</div>
                  )}
                </div>
                
                {/* INFORMACE */}
                <div className="ml-4 flex flex-col justify-center flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {item.type === "scan" ? "🔍 Sken Etikety" : "🍔 Recept"}
                  </span>
                  <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SPODNÍ NAVIGACE - vlož sem tu stejnou, co máš ve Skeneru */}
        <div className="fixed bottom-0 left-0 w-full bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl border-t border-slate-200 dark:border-gray-800/60 z-50">
          <div className="flex justify-around items-center p-2 max-w-md mx-auto">
            <Link href="/" className="flex flex-col items-center justify-center w-20 h-14 rounded-2xl text-slate-400 hover:text-lime-500 transition-colors">
              <span className="text-2xl mb-0.5">🍔</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Recepty</span>
            </Link>
            <Link href="/scanner" className="flex flex-col items-center justify-center w-20 h-14 rounded-2xl text-slate-400 hover:text-emerald-500 transition-colors">
              <span className="text-2xl mb-0.5">🔍</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Skener</span>
            </Link>
            <Link href="/history" className="flex flex-col items-center justify-center w-20 h-14 bg-slate-100 dark:bg-gray-900/50 rounded-2xl text-amber-500 relative">
              <div className="absolute top-0 w-8 h-1 bg-amber-500 rounded-b-full"></div>
              <span className="text-2xl mb-0.5">📚</span>
              <span className="text-[10px] font-black uppercase tracking-wider">Historie</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}