"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

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
  benefits: string[];
  instructions: string[];
}

// Pomocné SVG Ikony (místo smajlíků)
const IconSun = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
const IconMoon = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>;
const IconCamera = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>;
const IconHome = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const IconScan = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>;
const IconClock = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconArrowRight = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
const IconCheck = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;

export default function Home() {
  const router = useRouter();
  
  const { 
    credits, 
    isPremium, 
    isDarkMode, 
    toggleTheme, 
    deductCredit, 
    setShowLoginModal, 
    setShowPaywall 
  } = useAppContext();

  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState<number>(0);
  const [recipeResult, setRecipeResult] = useState<string | null>(null);

  const diets: string[] = ["Vegan", "Low-Carb", "Bez lepku", "Diabetes", "High-protein"];
  const loadingMessages: string[] = [
    "Analyzuji kalorický profil...",
    "Identifikuji složení...",
    "Generuji zdravější alternativy...",
    "Optimalizuji nutriční hodnoty...",
    "Sestavuji finální recept..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTransformClick = async () => {
    if (!isPremium && credits !== null && credits <= 0) {
      setShowPaywall(true); 
      return; 
    }
    
    if (!image) return;
    setIsLoading(true);
    
    try {
      const compressedBase64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width; let height = img.height;
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
          else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = image;
      });
      
      const userId = localStorage.getItem("junkToFitUserId") || "anonym";

      let photoUrl = "";
      try {
        const fileName = `meal_${Date.now()}.jpg`;
        const storageRef = ref(storage, `users/${userId}/${fileName}`);
        await uploadString(storageRef, compressedBase64, 'data_url');
        photoUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Chyba cloudu:", err);
      }

      const apiRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: compressedBase64, 
          diet: selectedDiet, 
          userId,
          photoUrl
        })
      });
      
      const data = await apiRes.json();
      
      if (data.success) {
        setRecipeResult(data.text);
        deductCredit(); 
      } else {
        alert("Chyba analýzy: " + data.error);
      }
    } catch (error) {
      alert("Chyba připojení k serveru.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = () => {
    const userId = localStorage.getItem("junkToFitUserId");
    if (userId) { 
      router.push("/history"); 
    } else {
      setShowLoginModal(true); 
    }
  };

  const resetApp = () => {
    setImage(null);
    setRecipeResult(null);
  };

  // ---------------------------------------------------------------------------
  // 1. VZHLED: NAČÍTÁNÍ (Minimalistické)
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500">
        <div className="relative flex items-center justify-center w-24 h-24 mb-8">
          <svg className="animate-spin text-emerald-500 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin direction-reverse"></div>
          <IconScan />
        </div>
        <h2 className="text-xl font-medium text-slate-800 dark:text-gray-200 mb-2 text-center h-8 transition-opacity duration-300">
          {loadingMessages[loadingTextIndex]}
        </h2>
        <p className="text-emerald-500 text-xs font-semibold tracking-[0.2em] uppercase animate-pulse">Zpracovávám</p>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. VZHLED: VÝSLEDEK (Clean UI)
  // ---------------------------------------------------------------------------
  if (recipeResult) {
    let data: RecipeData;
    try {
      const cleanJsonString = recipeResult.replace(/```json/gi, '').replace(/```/g, '').trim();
      data = JSON.parse(cleanJsonString);
    } catch (e) {
      return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans text-center transition-colors duration-500">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-lg text-slate-600 dark:text-gray-400 mb-8 max-w-xs">Došlo k chybě při formátování dat.</p>
          <button onClick={resetApp} className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl transition-all active:scale-95">Zkusit znovu</button>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col py-10 px-5 pb-32 font-sans transition-colors duration-500">
        
        <div className="max-w-md w-full mx-auto">
          <button onClick={resetApp} className="mb-6 flex items-center text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Zpět
          </button>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight">
            {data.title || "Optimalizovaný recept"}
          </h1>
          
          
          <div className="flex bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-2xl p-1 mb-6 shadow-sm">
            <div className="flex-1 p-4 text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Původní</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-300">{data.original_cal} <span className="text-xs font-medium text-slate-400">kcal</span></div>
            </div>
            <div className="w-px bg-slate-100 dark:bg-white/5 my-4"></div>
            <div className="flex-1 p-4 text-center bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Fit Verze</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.fit_cal} <span className="text-xs font-medium opacity-70">kcal</span></div>
            </div>
          </div>

          
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Chytré záměny</h2>
            <div className="space-y-2">
              {data.swaps && data.swaps.map((swap, index) => (
                <div key={index} className="flex items-center justify-between bg-white dark:bg-[#121826] p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium line-through decoration-slate-300 dark:decoration-slate-600 text-sm">{swap.bad}</span>
                  <IconArrowRight/>
                  <span className="text-slate-900 dark:text-white font-semibold text-sm text-right">{swap.good}</span>
                </div>
              ))}
            </div>
          </div>

          
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Suroviny</h2>
            <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
              <ul className="space-y-3">
                {data.ingredients && data.ingredients.map((item, index) => (
                  <li key={index} className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <div className="mt-0.5 mr-3 text-emerald-500"><IconCheck/></div>
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
                {data.benefits && data.benefits.map((item, index) => (
                  <li key={index} className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <div className="mt-0.5 mr-3 text-emerald-500"><IconCheck/></div>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Postup přípravy</h2>
            <div className="space-y-4">
              {data.instructions && data.instructions.map((step, index) => (
                <div key={index} className="flex group bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
                  <div className="flex-shrink-0 w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold mr-4 text-xs">
                    {index + 1}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. VZHLED: HLAVNÍ OBRAZOVKA (Start - Modern Minimalist)
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen pb-24 bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500">
      
      
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
      >
        {isDarkMode ? <IconSun/> : <IconMoon/>}
      </button>

      <div className="w-full max-w-sm flex flex-col items-center mt-8">
        
        
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Junk <span className="text-emerald-500">to Fit</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Optimalizace výživy</p>
        </div>

        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageCapture} />

        
        {!image ? (
          <button 
            className="group relative flex flex-col items-center justify-center w-full aspect-square max-w-[280px] bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 rounded-3xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] mb-12" 
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:scale-105 transition-all duration-300">
              <IconCamera/>
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-700 dark:text-slate-300">Vyfoť jídlo</span>
          </button>
        ) : (
          <div className="flex flex-col items-center mb-12 w-full max-w-[280px] animate-fade-in">
            <div className="relative w-full aspect-square mb-6">
               <img src={image} alt="Náhled" className="w-full h-full object-cover rounded-3xl shadow-sm border border-slate-200 dark:border-white/5" />
               <button onClick={() => setImage(null)} className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-red-500 rounded-full p-2 shadow-sm transition-colors">
                 <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <button onClick={handleTransformClick} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm shadow-sm transition-all active:scale-[0.98]">
               Vytvoř fit recept
            </button>
          </div>
        )}

        
        <div className="w-full">
          <h2 className="text-[10px] text-slate-400 dark:text-slate-500 mb-3 text-center uppercase tracking-widest font-semibold">Dietní protokol</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {diets.map((diet) => (
              <button
                key={diet}
                onClick={() => setSelectedDiet(diet === selectedDiet ? null : diet)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  selectedDiet === diet 
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                    : "bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

      </div>

      
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 z-50 pb-safe">
        <div className="flex justify-around items-center p-2 max-w-md mx-auto h-16">
          <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-emerald-500">
            <IconHome/>
            <span className="text-[10px] font-semibold mt-1">Recepty</span>
          </Link>
          
          <Link href="/scanner" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <IconScan/>
            <span className="text-[10px] font-medium mt-1">Skener</span>
          </Link>

          <button onClick={handleHistoryClick} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <IconClock/>
            <span className="text-[10px] font-medium mt-1">Historie</span>
          </button>
        </div>
      </div>
    </main>
  );
}