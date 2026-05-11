"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

// 1. DEFINICE TYPŮ PRO TYPESCRIPT
interface SwapItem {
  bad: string;
  good: string;
}

interface RecipeData {
  title?: string;
  original_cal: number | string;
  fit_cal: number | string;
  swaps: SwapItem[];
  ingredients: string[];
  instructions: string[];
}

export default function Home() {
  // 2. OTYPOVANÉ STAVY (useState)
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState<number>(0);
  const [recipeResult, setRecipeResult] = useState<string | null>(null);

  const [credits, setCredits] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  
  // STAV PRO TEMNÝ/SVĚTLÝ REŽIM
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const diets: string[] = ["Vegan", "Low-Carb", "Bez lepku"];
  const loadingMessages: string[] = [
    "Analyzuji tučné kalorie...",
    "Hledám tajné ingredience...",
    "Vymýšlím zdravější alternativy...",
    "Pálím virtuální tuky...",
    "Sestavuji tvůj Fit recept..."
  ];

  // Načtení kreditů a oblíbeného motivu
  useEffect(() => {
    const savedCredits = localStorage.getItem("junkToFitCredits");
    if (savedCredits !== null) {
      setCredits(parseInt(savedCredits, 10));
    } else {
      localStorage.setItem("junkToFitCredits", "2");
      setCredits(2);
    }

    // Načtení uloženého režimu
    const savedTheme = localStorage.getItem("junkToFitTheme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
    }
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
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  // Otypovaná událost pro nahrání obrázku
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    }
  };

  const handleTransformClick = async () => {
    // VYPNOUTO PRO VÝVOJ
    // if (credits !== null && credits <= 0) {
    //   setShowPaywall(true); 
    //   return; 
    // }
    
    if (!image) return;

    setIsLoading(true);
    
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const apiRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64data, diet: selectedDiet })
        });
        
        const data = await apiRes.json();
        
        if (data.success) {
          setRecipeResult(data.text);
          // VYPNOUTO PRO VÝVOJ
          // if (credits !== null) {
          //   const newCredits = credits - 1;
          //   setCredits(newCredits);
          //   localStorage.setItem("junkToFitCredits", newCredits.toString());
          // }
        } else {
          alert("Něco se pokazilo: " + data.error);
        }
        setIsLoading(false);
      };
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      alert("Nepodařilo se připojit k AI.");
    }
  };

  const resetApp = () => {
    setImage(null);
    setRecipeResult(null);
  };

  // ---------------------------------------------------------------------------
  // 0. VZHLED: PAYWALL
  // ---------------------------------------------------------------------------
  if (showPaywall) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <main className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans text-center relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-lime-500/20 dark:from-lime-500/10 via-transparent to-transparent"></div>
          
          <div className="z-10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/80 dark:border-gray-800/60 p-8 rounded-[2rem] shadow-2xl dark:shadow-2xl max-w-sm w-full relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">🔒</div>
            <h2 className="text-2xl font-black mb-3 mt-4 tracking-tight">Prémiový přístup</h2>
            <p className="text-slate-600 dark:text-gray-400 mb-8 text-sm leading-relaxed">
              Vyčerpal jsi pokusy zdarma. Odemkni si neomezený přístup a proměňuj jakékoliv hříšné jídlo na dokonalý fit recept.
            </p>
            
            <button className="w-full py-4 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-gray-950 font-black rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all active:scale-95 mb-4 text-lg">
              Odemknout za 99 Kč
            </button>
            <button onClick={() => setShowPaywall(false)} className="text-slate-500 dark:text-gray-500 text-sm font-semibold hover:text-slate-800 dark:hover:text-white transition-colors">
              Zatím ne, díky
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1. VZHLED: NAČÍTÁNÍ
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <main className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500">
          <div className="relative flex items-center justify-center w-32 h-32 mb-10">
            <div className="absolute inset-0 border-t-4 border-lime-400 border-solid rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-r-4 border-emerald-500 border-solid rounded-full animate-spin direction-reverse"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-emerald-500/20 backdrop-blur-sm rounded-full animate-pulse flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <span className="text-4xl drop-shadow-md">✨</span>
            </div>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-600 dark:from-lime-400 dark:to-emerald-500 mb-3 text-center h-8 transition-opacity duration-300">
            {loadingMessages[loadingTextIndex]}
          </h2>
          <p className="text-slate-500 dark:text-gray-500 text-xs font-bold tracking-[0.2em] uppercase animate-pulse">AI pracuje</p>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. VZHLED: VÝSLEDEK (Recept)
  // ---------------------------------------------------------------------------
  if (recipeResult) {
    let data: RecipeData;
    try {
      const cleanJsonString = recipeResult.replace(/```json/gi, '').replace(/```/g, '').trim();
      data = JSON.parse(cleanJsonString);
    } catch (e) {
      return (
        <div className={isDarkMode ? "dark" : ""}>
          <main className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center justify-center py-10 px-6 font-sans text-center transition-colors duration-500">
            <div className="text-5xl mb-4">🤖💥</div>
            <p className="text-lg text-slate-600 dark:text-gray-300 mb-8 max-w-xs">Ups, umělá inteligence poslala data ve špatném formátu.</p>
            <button onClick={resetApp} className="px-8 py-4 bg-lime-500 text-gray-950 hover:bg-lime-400 font-black rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(132,204,22,0.3)]">Zkusit to znovu</button>
          </main>
        </div>
      );
    }

    return (
      <div className={isDarkMode ? "dark" : ""}>
        <main className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center py-12 px-6 pb-32 font-sans relative transition-colors duration-500">
          <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-emerald-500/20 dark:from-emerald-900/30 to-transparent pointer-events-none"></div>
          
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 dark:from-lime-400 dark:to-emerald-400 mb-8 text-center z-10 leading-tight">
            {data.title || "Tvůj Fit Recept!"}
          </h1>
          
          <div className="w-full max-w-md space-y-5 z-10">
            
            {/* Srovnání kalorií */}
            <div className="flex bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white dark:border-gray-800/60 rounded-3xl p-1 shadow-xl relative overflow-hidden">
              <div className="flex-1 p-5 text-center relative z-10">
                <div className="text-sm text-slate-500 dark:text-gray-500 font-bold uppercase tracking-wider mb-1">Původní</div>
                <div className="text-2xl font-black text-slate-800 dark:text-white">{data.original_cal} <span className="text-xs text-slate-500 font-medium">kcal</span></div>
              </div>
              <div className="absolute left-1/2 top-4 bottom-4 w-px bg-slate-200 dark:bg-gray-800/60 z-10"></div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-full flex items-center justify-center text-xs z-20 shadow-md">⚡</div>
              <div className="flex-1 p-5 text-center bg-gradient-to-br from-lime-500/20 to-emerald-500/10 dark:from-lime-500/10 dark:to-emerald-500/5 rounded-3xl relative z-10 border border-lime-500/30 dark:border-lime-500/20">
                <div className="text-sm text-emerald-600 dark:text-lime-400 font-bold uppercase tracking-wider mb-1">Fit Verze</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-lime-400">{data.fit_cal} <span className="text-xs opacity-60 font-medium">kcal</span></div>
              </div>
            </div>

            {/* Co vyměníme */}
            <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white dark:border-gray-800/60 rounded-[2rem] p-6 shadow-xl">
              <h2 className="text-sm font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-emerald-500 dark:text-emerald-400">🔄</span> Co vyměníme?
              </h2>
              <div className="space-y-2">
                {data.swaps && data.swaps.map((swap, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-100/50 dark:bg-gray-950/50 p-3.5 rounded-2xl border border-slate-200/50 dark:border-gray-800/30">
                    <span className="text-slate-600 dark:text-gray-500 font-medium line-through decoration-red-500/50 text-sm">{swap.bad}</span>
                    <span className="text-emerald-500 text-lg mx-2">→</span>
                    <span className="text-slate-800 dark:text-white font-bold text-sm text-right">{swap.good}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suroviny */}
            <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white dark:border-gray-800/60 rounded-[2rem] p-6 shadow-xl">
              <h2 className="text-sm font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-lime-500 dark:text-lime-400">🥗</span> Co potřebuješ
              </h2>
              <ul className="space-y-3">
                {data.ingredients && data.ingredients.map((item, index) => (
                  <li key={index} className="flex items-start text-slate-700 dark:text-gray-200 text-sm font-medium">
                    <div className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-600 dark:text-lime-400 flex items-center justify-center mr-3 shrink-0 mt-0.5 border border-lime-500/30">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Postup */}
            <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white dark:border-gray-800/60 rounded-[2rem] p-6 shadow-xl mb-8">
              <h2 className="text-sm font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="text-orange-500 dark:text-orange-400">👨‍🍳</span> Jak na to
              </h2>
              <div className="space-y-5">
                {data.instructions && data.instructions.map((step, index) => (
                  <div key={index} className="flex group">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-gray-400 group-hover:bg-lime-500 group-hover:text-gray-950 flex items-center justify-center font-black mr-4 text-xs transition-colors border border-slate-300 dark:border-gray-700">
                      {index + 1}
                    </div>
                    <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={resetApp} className="mt-4 px-10 py-4 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-gray-200 text-white dark:text-gray-950 font-black rounded-2xl transition-all active:scale-95 shadow-lg w-full max-w-md">
            Analyzovat další jídlo
          </button>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. VZHLED: HLAVNÍ OBRAZOVKA (Start)
  // ---------------------------------------------------------------------------
  return (
    <div className={isDarkMode ? "dark" : ""}>
      <main className="min-h-screen pb-24 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden transition-colors duration-500">
        
        {/* Dekorativní pozadí (Rozmazané skvrny) */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-lime-500/30 dark:bg-lime-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/30 dark:bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Přepínač Dark/Light Mode */}
        <button 
          onClick={toggleTheme} 
          className="absolute top-6 left-6 bg-white/70 dark:bg-gray-900/80 backdrop-blur-md border border-slate-200 dark:border-gray-800/80 w-10 h-10 flex items-center justify-center rounded-full shadow-lg z-20 text-xl hover:scale-110 transition-transform"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* UKAZATEL KREDITŮ */}
        {credits !== null && (
          <div className="absolute top-6 right-6 bg-white/70 dark:bg-gray-900/80 backdrop-blur-md border border-slate-200 dark:border-gray-800/80 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors z-20 text-slate-700 dark:text-gray-300" onClick={() => {if(credits !== null && credits <= 0) setShowPaywall(true)}}>
            <span className="text-lime-500 dark:text-lime-400 drop-shadow-md text-base">⚡</span>
            {credits} (NEOMEZENO)
          </div>
        )}

        <div className="mb-14 text-center mt-10 z-10">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:via-gray-200 dark:to-gray-500 tracking-tight mb-3 drop-shadow-sm">
            Junk <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-600 dark:from-lime-400 dark:to-emerald-500">to Fit</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm font-medium tracking-wide">Proměň neřest ve zdravý recept.</p>
        </div>

        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="absolute opacity-0 w-0 h-0 pointer-events-none -z-10" onChange={handleImageCapture} />

        {!image ? (
          <div className="relative group mb-16 z-10">
            <div className="absolute -inset-2 bg-gradient-to-r from-lime-400 to-emerald-500 rounded-[3rem] blur-xl opacity-40 dark:opacity-20 group-hover:opacity-60 dark:group-hover:opacity-40 transition duration-500 group-hover:duration-200"></div>
            <button 
              className="relative flex flex-col items-center justify-center w-56 h-56 md:w-64 md:h-64 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white dark:border-gray-800 hover:border-lime-500/50 text-slate-800 dark:text-white rounded-[3rem] shadow-2xl transition-all active:scale-95 overflow-hidden" 
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 dark:from-white/5 to-transparent pointer-events-none"></div>
              <div className="w-20 h-20 bg-slate-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-5 shadow-inner border border-slate-200 dark:border-gray-700/50 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-lime-500 dark:text-lime-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-wide text-slate-800 dark:text-gray-200">Vyfotit jídlo</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-16 animate-fade-in z-10 w-full max-w-sm">
            <div className="relative w-full aspect-square mb-6">
               <div className="absolute inset-0 bg-gradient-to-tr from-lime-400 to-emerald-500 rounded-[2.5rem] blur opacity-40 dark:opacity-30"></div>
               <img src={image} alt="Tvé jídlo" className="relative w-full h-full object-cover rounded-[2.5rem] shadow-2xl border border-white dark:border-gray-700" />
               <button onClick={() => setImage(null)} className="absolute -top-3 -right-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-500 rounded-full p-2.5 shadow-xl transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <button onClick={handleTransformClick} className="w-full py-4 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-gray-950 font-black rounded-2xl text-lg shadow-[0_0_25px_rgba(52,211,153,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2">
               <span>Proměnit ve Fit recept!</span>
               <span className="text-xl">✨</span>
            </button>
          </div>
        )}

        <div className="w-full max-w-sm z-10">
          <h2 className="text-xs text-slate-500 dark:text-gray-500 mb-4 text-center uppercase tracking-[0.15em] font-bold">Dietní preference</h2>
          <div className="flex flex-wrap justify-center gap-2.5">
            {diets.map((diet) => (
              <button
                key={diet}
                onClick={() => setSelectedDiet(diet === selectedDiet ? null : diet)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${selectedDiet === diet ? "bg-lime-500/20 dark:bg-lime-500/10 border-lime-500/50 text-lime-700 dark:text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.2)] ring-1 ring-lime-500" : "bg-white/60 dark:bg-gray-900/50 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border"}`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

        {/* SPODNÍ NAVIGACE */}
        <div className="fixed bottom-0 left-0 w-full bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl border-t border-slate-200 dark:border-gray-800/60 z-50 pb-safe transition-colors duration-500">
          <div className="flex justify-around items-center p-2 max-w-md mx-auto">
            <Link href="/" className="flex flex-col items-center justify-center w-20 h-14 rounded-2xl bg-slate-100 dark:bg-gray-900/50 text-lime-600 dark:text-lime-400 relative">
              <div className="absolute top-0 w-8 h-1 bg-lime-500 dark:bg-lime-400 rounded-b-full shadow-[0_0_10px_rgba(132,204,22,0.5)]"></div>
              <span className="text-2xl mb-0.5 drop-shadow-md">🍔</span>
              <span className="text-[10px] font-black uppercase tracking-wider">Recepty</span>
            </Link>
            
            <Link href="/scanner" className="flex flex-col items-center justify-center w-20 h-14 rounded-2xl text-slate-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              <span className="text-2xl mb-0.5">🔍</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Skener</span>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}