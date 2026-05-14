"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppContext } from "../../context/AppContext";

// 🚀 1. DEFINICE TYPŮ
interface HistoryItem {
  id: string;
  type: "scan" | "recipe";
  title: string;
  photo: string;
  aiData: any; 
  createdAt: string;
}

// ==========================================
// POMOCNÉ SVG IKONY (Pro seznam i detail)
// ==========================================
const IconHome = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const IconScan = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>;
const IconClock = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconUtensils = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>; 
const IconBarcode = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>;
const IconInbox = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" /></svg>;
const IconImagePlaceholder = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const IconArrowRight = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
const IconCheck = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const IconCheckCircle = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconWarning = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-orange-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const IconError = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const IconLightbulb = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.829 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.487 1.508 1.333 1.508 2.316V18" /></svg>;
const IconChef = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>;
const IconPlus = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const IconMinus = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>;

export default function HistoryPage() {
  const { isDarkMode } = useAppContext();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚀 LOKÁLNÍ STAV PRO DETAILNÍ ZOBRAZENÍ
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [activeIngredient, setActiveIngredient] = useState<number | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<number | null>(null);

  useEffect(() => {
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

  // Vynuluje otevřené akordeony, když uživatel zavře detail
  useEffect(() => {
    setActiveIngredient(null);
    setActiveRecipe(null);
  }, [selectedItem]);

  // Pomocné stylování pro detail Skeneru
  const getStatusStyle = (status: string) => {
    if (status === "zelena") return { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", Icon: IconCheckCircle };
    if (status === "oranzova") return { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20", text: "text-orange-600 dark:text-orange-400", Icon: IconWarning };
    return { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", text: "text-red-600 dark:text-red-400", Icon: IconError };
  };

  return (
    <main className="min-h-screen pb-24 bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white font-sans transition-colors duration-500 relative">
      
      {/* -----------------------------------------------------------
          1. HLAVNÍ OBRAZOVKA HISTORIE (Seznam)
      ------------------------------------------------------------- */}
      <div className={`p-6 ${selectedItem ? 'hidden' : 'block'}`}>
        <div className="mb-10 text-center mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Moje <span className="text-emerald-500">Historie</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Vše, co jste u nás analyzovali.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center mt-32">
            <svg className="animate-spin text-emerald-500 w-12 h-12 opacity-80 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Načítám záznamy</span>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-slate-400 dark:text-slate-600">
            <div className="mb-6 opacity-50"><IconInbox /></div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">Zatím tu nic není</h3>
            <p className="text-sm text-center max-w-[200px]">Vaše naskenované etikety a fit recepty se objeví zde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            {historyItems.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)} // 👈 Po kliknutí nastavíme vybranou položku
                className="flex bg-white dark:bg-[#121826] rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200 dark:border-white/5 p-3 transition-all cursor-pointer hover:border-emerald-500/30"
              >
                {/* OBRÁZEK */}
                <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 relative">
                  {item.photo ? (
                    <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                      <IconImagePlaceholder />
                    </div>
                  )}
                </div>
                
                {/* INFORMACE */}
                <div className="ml-4 flex flex-col justify-center flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={item.type === "scan" ? "text-emerald-500" : "text-amber-500"}>
                      {item.type === "scan" ? <IconBarcode /> : <IconUtensils />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {item.type === "scan" ? "Sken Etikety" : "Fit Recept"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {new Date(item.createdAt).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -----------------------------------------------------------
          2. DETAILNÍ POHLED PŘES CELOU OBRAZOVKU (Modal)
      ------------------------------------------------------------- */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-[#0B0F19] overflow-y-auto animate-fade-in pb-32">
          
          {/* Hlavička s tlačítkem Zpět */}
          <div className="sticky top-0 bg-[#F8FAFC]/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-10 px-5 py-4">
            <div className="max-w-md mx-auto flex items-center">
              <button 
                onClick={() => setSelectedItem(null)} 
                className="flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Zpět do historie
              </button>
            </div>
          </div>

          <div className="p-5 max-w-md mx-auto mt-4">
            {/* Obrázek v detailu */}
            {selectedItem.photo && (
               <div className="w-full h-48 rounded-2xl overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-white/5">
                 <img src={selectedItem.photo} alt="Náhled" className="w-full h-full object-cover" />
               </div>
            )}

            {/* A) RENDER PRO RECEPT */}
            {selectedItem.type === "recipe" && selectedItem.aiData && (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight">
                  {selectedItem.aiData.title || selectedItem.title}
                </h1>
                
                <div className="flex bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-2xl p-1 mb-6 shadow-sm">
                  <div className="flex-1 p-4 text-center">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Původní</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-300">{selectedItem.aiData.original_cal} <span className="text-xs font-medium text-slate-400">kcal</span></div>
                  </div>
                  <div className="w-px bg-slate-100 dark:bg-white/5 my-4"></div>
                  <div className="flex-1 p-4 text-center bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Fit Verze</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedItem.aiData.fit_cal} <span className="text-xs font-medium opacity-70">kcal</span></div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Chytré záměny</h2>
                  <div className="space-y-2">
                    {selectedItem.aiData.swaps && selectedItem.aiData.swaps.map((swap: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#121826] p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <span className="text-slate-500 dark:text-slate-400 font-medium line-through decoration-slate-300 dark:decoration-slate-600 text-sm">{swap.bad}</span>
                        <IconArrowRight />
                        <span className="text-slate-900 dark:text-white font-semibold text-sm text-right">{swap.good}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Suroviny</h2>
                  <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
                    <ul className="space-y-3">
                      {selectedItem.aiData.ingredients && selectedItem.aiData.ingredients.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                          <div className="mt-0.5 mr-3 text-emerald-500"><IconCheck /></div>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Benefity</h2>
                  <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
                    <ul className="space-y-3">
                      {selectedItem.aiData.benefits && selectedItem.aiData.benefits.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                          <div className="mt-0.5 mr-3 text-emerald-500"><IconCheck /></div>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Postup přípravy</h2>
                  <div className="space-y-4">
                    {selectedItem.aiData.instructions && selectedItem.aiData.instructions.map((step: string, idx: number) => (
                      <div key={idx} className="flex group bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold mr-4 text-xs">
                          {idx + 1}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* B) RENDER PRO SKENER */}
            {selectedItem.type === "scan" && selectedItem.aiData && (
              <>
                {(() => {
                  const style = getStatusStyle(selectedItem.aiData.status || "oranzova");
                  const StatusIcon = style.Icon;
                  return (
                    <>
                      <div className={`w-full ${style.bg} border ${style.border} rounded-2xl p-6 text-center shadow-sm mb-6`}>
                        <div className="flex justify-center mb-4"><StatusIcon /></div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                          {selectedItem.aiData.product_name || selectedItem.title}
                        </h1>
                        <p className={`font-semibold ${style.text} mb-4 text-sm`}>
                          {selectedItem.aiData.main_issue}
                        </p>
                        <div className="bg-white/60 dark:bg-black/20 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 flex items-start gap-3">
                          <div className="mt-0.5"><IconLightbulb /></div>
                          <div className="text-left leading-relaxed">{selectedItem.aiData.alternative}</div>
                        </div>
                      </div>

                      <div className="mb-8">
                        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 pl-1">Rozbor složení</h3>
                        <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm overflow-hidden">
                          {selectedItem.aiData.ingredients_details?.map((ing: any, idx: number) => (
                            <div key={idx} className={`border-b border-slate-100 dark:border-white/5 last:border-0`}>
                              <button 
                                onClick={() => setActiveIngredient(activeIngredient === idx ? null : idx)}
                                className="w-full text-left p-4 font-medium flex justify-between items-center text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                              >
                                <span className="text-sm">{ing.name}</span>
                                <span className="text-slate-400">{activeIngredient === idx ? <IconMinus /> : <IconPlus />}</span>
                              </button>
                              {activeIngredient === idx && (
                                <div className="px-4 pb-4 pt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/5">
                                  {ing.info}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedItem.aiData.culinary_tips && selectedItem.aiData.culinary_tips.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4 pl-1">
                            <IconChef />
                            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipy šéfkuchaře</h3>
                          </div>
                          <div className="space-y-3">
                            {selectedItem.aiData.culinary_tips.map((tip: any, idx: number) => (
                              <div key={idx} className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm overflow-hidden">
                                <button 
                                  onClick={() => setActiveRecipe(activeRecipe === idx ? null : idx)}
                                  className="w-full text-left p-4 font-semibold flex justify-between items-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors"
                                >
                                  <span className="text-sm">{tip.name}</span>
                                  <span className="text-emerald-400">{activeRecipe === idx ? <IconMinus /> : <IconPlus />}</span>
                                </button>
                                {activeRecipe === idx && (
                                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5">
                                    <div className="space-y-4 mt-2">
                                      {tip.recipe.map((step: string, stepIdx: number) => (
                                        <div key={stepIdx} className="flex gap-3">
                                          <div className="flex-shrink-0 w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] mt-0.5">
                                            {stepIdx + 1}
                                          </div>
                                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* SPODNÍ NAVIGACE (Zobrazuje se vždy) */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 z-[110] pb-safe">
        <div className="flex justify-around items-center p-2 max-w-md mx-auto h-16">
          <Link href="/" onClick={() => setSelectedItem(null)} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <IconHome />
            <span className="text-[10px] font-medium mt-1">Recepty</span>
          </Link>
          
          <Link href="/scanner" onClick={() => setSelectedItem(null)} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <IconScan />
            <span className="text-[10px] font-medium mt-1">Skener</span>
          </Link>

          <button onClick={() => setSelectedItem(null)} className="flex flex-col items-center justify-center w-full h-full text-emerald-500">
            <IconClock />
            <span className="text-[10px] font-semibold mt-1">Historie</span>
          </button>
        </div>
      </div>
    </main>
  );
}