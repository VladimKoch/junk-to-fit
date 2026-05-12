"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface CulinaryTip { name: string; recipe: string[]; }
interface IngredientDetail { name: string; info: string; }
interface ScanResultData {
  status: "zelena" | "oranzova" | "cervena";
  product_name: string;
  main_issue: string;
  score: number;
  alternative: string;
  ingredients_details: IngredientDetail[];
  culinary_tips: CulinaryTip[];
}
type ScanMode = "text" | "ean";

export default function ScannerPage() {
  const [scanMode, setScanMode] = useState<ScanMode>("ean");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState<number>(0);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  const [activeIngredient, setActiveIngredient] = useState<number | null>(null);
  // OPRAVA: Přidána stavová proměnná pro rozklikávání receptů s TS typem
  const [activeRecipe, setActiveRecipe] = useState<number | null>(null);
  
  const [credits, setCredits] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const loadingMessages: string[] = [
    "Skenuji čárový kód...",
    "Řeším atomární substanci",
    "Hledám skryté cukry a éčka...",
    "Ptám se šéfkuchaře na recepty...",
    "Zhodnocuji tvůj výběr..."
  ];

  useEffect(() => {
    const savedCredits = localStorage.getItem("junkToFitCredits");
    if (savedCredits !== null) setCredits(parseInt(savedCredits, 10));
    else { localStorage.setItem("junkToFitCredits", "2"); setCredits(2); }

    const savedTheme = localStorage.getItem("junkToFitTheme");
    if (savedTheme === "light") setIsDarkMode(false);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("junkToFitTheme", newTheme ? "dark" : "light");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && images.length < 4) {
      const imageUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, imageUrl]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

const handleAnalyzeClick = async () => {
    if (images.length === 0) return;
    setIsLoading(true);
    
    try {
      // 🚀 NOVÁ MAGIE: Zmenšení a komprese fotek přímo v telefonu před odesláním
      const base64Array = await Promise.all(
        images.map(async (imgUrl) => {
          return new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let width = img.width;
              let height = img.height;

              // Zmenšíme fotku tak, aby její delší strana měla max 800px (Bohatě stačí pro AI)
              const MAX_SIZE = 800;
              if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }

              canvas.width = width;
              canvas.height = height;
              
              const ctx = canvas.getContext("2d");
              // Nakreslíme zmenšenou fotku na neviditelné plátno
              ctx?.drawImage(img, 0, 0, width, height);

              // Vyexportujeme ji jako JPEG s kvalitou 70% (extrémně sníží velikost souboru v MB)
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
              resolve(compressedBase64);
            };
            img.src = imgUrl;
          });
        })
      );
      
      const apiRes = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagesBase64: base64Array, scanMode: scanMode })
      });
      
      const data = await apiRes.json();
      
      if (data.success) {
        const finalData = Array.isArray(data.data) ? data.data[0] : data.data;
        setScanResult(finalData);
        setActiveIngredient(null);
        setActiveRecipe(null);
      } else {
        alert("Něco se pokazilo: " + data.error);
      }
      setIsLoading(false);
      
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      alert("Nepodařilo se připojit k serveru.");
    }
  };


  const resetApp = () => {
    setImages([]);
    setScanResult(null);
    setActiveIngredient(null);
    setActiveRecipe(null); // Reset aktivního receptu při kliknutí na "Skenovat další"
  };

  const getStatusStyle = (status: string) => {
    if (status === "zelena") return { bg: "bg-emerald-500", border: "border-emerald-500/30", text: "text-emerald-500", glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]", emoji: "✅" };
    if (status === "oranzova") return { bg: "bg-orange-500", border: "border-orange-500/30", text: "text-orange-500", glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]", emoji: "⚠️" };
    return { bg: "bg-red-500", border: "border-red-500/30", text: "text-red-500", glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]", emoji: "🛑" };
  };

  // ---------------------------------------------------------------------------
  // 1. VZHLED: NAČÍTÁNÍ
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <main className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500">
          <div className="relative flex items-center justify-center w-32 h-32 mb-10">
            <div className="absolute inset-0 border-t-4 border-emerald-400 border-solid rounded-full animate-spin"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 backdrop-blur-sm rounded-full animate-pulse flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <span className="text-4xl drop-shadow-md">🔍</span>
            </div>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 mb-3 text-center h-8 transition-opacity duration-300">
            {loadingMessages[loadingTextIndex]}
          </h2>
          <p className="text-slate-500 dark:text-gray-500 text-xs font-bold tracking-[0.2em] uppercase animate-pulse">
            Zpracovávám {images.length} {images.length === 1 ? 'fotku' : 'fotky'}
          </p>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. VZHLED: VÝSLEDEK (SEMAFOR + RECEPTY)
  // ---------------------------------------------------------------------------
  if (scanResult) {
    const style = getStatusStyle(scanResult.status);
    
    return (
       <div className={isDarkMode ? "dark" : ""}>
         <main className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center py-12 px-6 pb-32 font-sans relative transition-colors duration-500">
           
           <div className={`w-full max-w-md bg-white dark:bg-gray-900 border ${style.border} rounded-[2rem] p-8 text-center shadow-xl ${style.glow} mb-6`}>
             <div className="text-6xl mb-4">{style.emoji}</div>
             <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2 leading-tight">
               {scanResult.product_name}
             </h1>
             <p className={`font-bold ${style.text} mb-4 text-lg`}>
               {scanResult.main_issue}
             </p>
             <div className="bg-slate-100 dark:bg-gray-950 p-4 rounded-2xl text-sm text-slate-600 dark:text-gray-400 font-medium">
               💡 {scanResult.alternative}
             </div>
           </div>

           {/* Detail složení */}
           <div className="w-full max-w-md mb-8">
             <h3 className="text-lg font-bold mb-3 pl-2 text-slate-800 dark:text-gray-200">Co je vlastně uvnitř?</h3>
             <div className="flex flex-col gap-2">
               {scanResult.ingredients_details?.map((ing, idx) => (
                 <div key={idx} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden transition-all">
                   <button 
                     onClick={() => setActiveIngredient(activeIngredient === idx ? null : idx)}
                     className="w-full text-left p-4 font-semibold flex justify-between items-center text-slate-700 dark:text-gray-300"
                   >
                     {ing.name}
                     <span className="text-emerald-500 text-xl">{activeIngredient === idx ? '−' : '+'}</span>
                   </button>
                   {activeIngredient === idx && (
                     <div className="px-4 pb-4 pt-0 text-sm text-slate-500 dark:text-gray-400">
                       {ing.info}
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </div>

           {/* --- KULINÁŘSKÉ TIPY --- */}
           {scanResult.culinary_tips && scanResult.culinary_tips.length > 0 && (
             <div className="w-full max-w-md mb-8">
               <h3 className="text-lg font-bold mb-3 pl-2 text-slate-800 dark:text-gray-200">👨‍🍳 Tipy šéfkuchaře</h3>
               <div className="flex flex-col gap-3">
                 {scanResult.culinary_tips.map((tip, idx) => (
                   <div key={idx} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all">
                     <button 
                       onClick={() => setActiveRecipe(activeRecipe === idx ? null : idx)}
                       className="w-full text-left p-4 font-bold flex justify-between items-center text-emerald-600 dark:text-emerald-400"
                     >
                       <span>{tip.name}</span>
                       <span className="text-xl">{activeRecipe === idx ? '−' : '+'}</span>
                     </button>
                     {activeRecipe === idx && (
                       <div className="px-4 pb-4 pt-2 text-sm text-slate-600 dark:text-gray-400 space-y-3 border-t border-slate-100 dark:border-gray-800/50 mt-1">
                         {tip.recipe.map((step, stepIdx) => (
                           <div key={stepIdx} className="flex gap-3">
                             <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs mt-0.5">
                               {stepIdx + 1}
                             </div>
                             <p className="leading-relaxed">{step}</p>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           )}

           <button onClick={resetApp} className="w-full max-w-md py-4 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-gray-200 text-white dark:text-gray-950 font-black rounded-2xl transition-all shadow-lg text-lg">
             Skenovat další produkt
           </button>
         </main>
       </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. HLAVNÍ OBRAZOVKA SKENERU
  // ---------------------------------------------------------------------------
  return (
    <div className={isDarkMode ? "dark" : ""}>
      <main className="min-h-screen pb-24 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden transition-colors duration-500">
        
        <button onClick={toggleTheme} className="absolute top-6 left-6 bg-white/70 dark:bg-gray-900/80 backdrop-blur-md border border-slate-200 dark:border-gray-800/80 w-10 h-10 flex items-center justify-center rounded-full shadow-lg z-20 text-xl">
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        <div className="mb-8 text-center mt-6 z-10">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:via-gray-200 dark:to-gray-500 tracking-tight mb-2">
            AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400">Skener</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">Text je na oválné plechovce? Vyfoť ho po částech!</p>
        </div>

        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageCapture} />

        {images.length === 0 ? (
          <div className="relative group mb-12 z-10">
            <button 
              className="relative flex flex-col items-center justify-center w-64 h-64 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white dark:border-gray-800 hover:border-emerald-500/50 text-slate-800 dark:text-white rounded-[3rem] shadow-2xl transition-all active:scale-95 overflow-hidden" 
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-6xl mb-4">📸</span>
              <span className="text-lg font-black tracking-wide text-slate-800 dark:text-gray-200 text-center px-4">
                Vyfoť Čárkový kód nebo složení, čím více fotek tím lépe.
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-12 z-10 w-full max-w-sm">
            
            <div className="flex gap-4 mb-6 w-full overflow-x-auto pb-4 snap-x pt-2">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative shrink-0 snap-center">
                  <img src={imgUrl} alt={`Fotka ${idx+1}`} className="w-36 h-36 object-cover rounded-3xl shadow-lg border-2 border-emerald-500/50" />
                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold">✕</button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
                    Část {idx + 1}
                  </div>
                </div>
              ))}
              
              {images.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-36 h-36 shrink-0 flex flex-col items-center justify-center bg-emerald-500/10 dark:bg-gray-800/50 border-2 border-dashed border-emerald-500 rounded-3xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors active:scale-95 shadow-sm"
                >
                  <span className="text-4xl mb-1">+</span>
                  <span className="text-xs font-bold uppercase text-center px-2">
                    Přidat fotku textu
                  </span>
                </button>
              )}
            </div>

            <button onClick={handleAnalyzeClick} className="w-full py-4 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-2xl text-lg shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2">
               <span>Analyzovat {images.length > 1 ? 'všechny fotky' : 'produkt'}</span>
               <span className="text-xl">🔍</span>
            </button>
          </div>
        )}

        <div className="fixed bottom-0 left-0 w-full bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl border-t border-slate-200 dark:border-gray-800/60 z-50">
          <div className="flex justify-around items-center p-2 max-w-md mx-auto">
            <Link href="/" className="flex flex-col items-center justify-center w-20 h-14 rounded-2xl text-slate-400 hover:text-lime-500 transition-colors">
              <span className="text-2xl mb-0.5">🍔</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Recepty</span>
            </Link>
            <Link href="/scanner" className="flex flex-col items-center justify-center w-20 h-14 rounded-2xl bg-slate-100 dark:bg-gray-900/50 text-emerald-600 dark:text-emerald-400">
              <span className="text-2xl mb-0.5 drop-shadow-md">🔍</span>
              <span className="text-[10px] font-black uppercase tracking-wider">Skener</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}