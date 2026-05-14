"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../context/AppContext"; // Ujisti se, že import sedí
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase"; // Zkontroluj tečky!

// 1. DEFINICE TYPŮ PRO TYPESCRIPT
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

// Pomocné SVG Ikony
const IconSun = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
const IconMoon = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>;
const IconCamera = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>;
const IconHome = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const IconScan = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>;
const IconClock = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconCheckCircle = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconWarning = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-orange-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const IconError = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const IconLightbulb = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.829 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.487 1.508 1.333 1.508 2.316V18" /></svg>;
const IconChef = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>;
const IconPlus = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const IconMinus = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>;

export default function ScannerPage() {
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

  const [scanMode, setScanMode] = useState<ScanMode>("ean");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState<number>(0);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  const [activeIngredient, setActiveIngredient] = useState<number | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<number | null>(null);

  const loadingMessages: string[] = [
    "Dekóduji etiketu...",
    "Analyzuji složení...",
    "Hodnotím nutriční profil...",
    "Připravuji alternativy...",
    "Dokončuji analýzu..."
  ];

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
    if (!isPremium && credits !== null && credits <= 0) {
      setShowPaywall(true); 
      return; 
    }

    if (images.length === 0) return;
    setIsLoading(true);
    
    try {
      const base64Array = await Promise.all(
        images.map(async (imgUrl) => {
          return new Promise<string>((resolve) => {
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
            img.src = imgUrl;
          });
        })
      );
      
      const userId = localStorage.getItem("junkToFitUserId") || "anonym";

      let photoUrls: string[] = [];
      try {
        const uploadPromises = base64Array.map(async (base64Str, index) => {
          const fileName = `scan_${Date.now()}_${index}.jpg`; 
          const storageRef = ref(storage, `users/${userId}/${fileName}`);
          await uploadString(storageRef, base64Str, 'data_url');
          return await getDownloadURL(storageRef);
        });
        photoUrls = await Promise.all(uploadPromises);
      } catch (err) {
        console.error("Chyba cloudu:", err);
      }

      const apiRes = await fetch("/api/scanner", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: base64Array[0], 
          allImagesBase64: base64Array, 
          userId,
          photoUrls
        })
      });
      const data = await apiRes.json();
      
      if (data.success) {
        const finalData = Array.isArray(data.data) ? data.data[0] : data.data;
        setScanResult(finalData);
        setActiveIngredient(null);
        setActiveRecipe(null);
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
    if (userId && !userId.startsWith("user_")) { 
      router.push("/history"); 
    } else {
      setShowLoginModal(true); 
    }
  };

  const resetApp = () => {
    setImages([]);
    setScanResult(null);
    setActiveIngredient(null);
    setActiveRecipe(null);
  };

  const getStatusStyle = (status: string) => {
    if (status === "zelena") return { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", Icon: IconCheckCircle };
    if (status === "oranzova") return { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20", text: "text-orange-600 dark:text-orange-400", Icon: IconWarning };
    return { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", text: "text-red-600 dark:text-red-400", Icon: IconError };
  };

  // ---------------------------------------------------------------------------
  // 1. VZHLED: NAČÍTÁNÍ
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
        <p className="text-emerald-500 text-xs font-semibold tracking-[0.2em] uppercase animate-pulse">
          Zpracovávám {images.length} {images.length === 1 ? 'snímek' : 'snímky'}
        </p>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. VZHLED: VÝSLEDEK (SEMAFOR + RECEPTY)
  // ---------------------------------------------------------------------------
  if (scanResult) {
    const style = getStatusStyle(scanResult.status);
    const StatusIcon = style.Icon;
    
    return (
      <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center py-10 px-5 pb-32 font-sans transition-colors duration-500">
        
        <div className="max-w-md w-full mx-auto">
          <button onClick={resetApp} className="mb-6 flex items-center text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Nové skenování
          </button>

          {/* Hlavní karta hodnocení */}
          <div className={`w-full ${style.bg} border ${style.border} rounded-2xl p-6 text-center shadow-sm mb-6`}>
            <div className="flex justify-center mb-4"><StatusIcon /></div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
              {scanResult.product_name}
            </h1>
            <p className={`font-semibold ${style.text} mb-4 text-sm`}>
              {scanResult.main_issue}
            </p>
            <div className="bg-white/60 dark:bg-black/20 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 flex items-start gap-3">
              <div className="mt-0.5"><IconLightbulb /></div>
              <div className="text-left leading-relaxed">{scanResult.alternative}</div>
            </div>
          </div>

          {/* Detail složení */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 pl-1">Rozbor složení</h3>
            <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm overflow-hidden">
              {scanResult.ingredients_details?.map((ing, idx) => (
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

          {/* KULINÁŘSKÉ TIPY */}
          {scanResult.culinary_tips && scanResult.culinary_tips.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 pl-1">
                <IconChef />
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipy šéfkuchaře</h3>
              </div>
              <div className="space-y-3">
                {scanResult.culinary_tips.map((tip, idx) => (
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
                          {tip.recipe.map((step, stepIdx) => (
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

        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. HLAVNÍ OBRAZOVKA SKENERU
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen pb-24 bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500">
      
      {/* Přepínač Dark/Light Mode */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
      >
        {isDarkMode ? <IconSun /> : <IconMoon />}
      </button>

      <div className="w-full max-w-sm flex flex-col items-center mt-8">
        
        {/* Hlavička */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            <span className="text-emerald-500">Skener</span>
          </h1>
          {/* <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Skenování etiket a složení</p> */}
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Je složení na oválném obalu? <br></br> Vyfoť na více částí.</p>
        </div>

        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageCapture} />

        {images.length === 0 ? (
          <button 
            className="group relative flex flex-col items-center justify-center w-full aspect-square max-w-[280px] bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 rounded-3xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] mb-12" 
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:scale-105 transition-all duration-300">
              <IconCamera />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-700 dark:text-slate-300 mb-2">Vyfoť etiketu</span>
            <span className="text-xs text-slate-400 text-center px-6">Čárový kód a textové složení <br></br> (možno více fotek)</span>
          </button>
        ) : (
          <div className="flex flex-col items-center mb-12 w-full">
            <div className="flex gap-3 mb-8 w-full overflow-x-auto pb-4 snap-x hide-scrollbar">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative shrink-0 snap-center">
                  <img src={imgUrl} alt={`Snímek ${idx+1}`} className="w-32 h-32 object-cover rounded-2xl shadow-sm border border-slate-200 dark:border-white/10" />
                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-red-500 rounded-full p-1.5 shadow-sm transition-colors">
                    <IconMinus />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-md">
                    {idx + 1}/4
                  </div>
                </div>
              ))}
              
              {images.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 shrink-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#121826] border border-dashed border-slate-300 dark:border-white/20 rounded-2xl text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors active:scale-95"
                >
                  <IconPlus />
                  <span className="text-[10px] font-semibold mt-2">Přidat snímek</span>
                </button>
              )}
            </div>

            <button onClick={handleAnalyzeClick} className="w-full max-w-[280px] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm shadow-sm transition-all active:scale-[0.98]">
               Analyzovat data
            </button>
          </div>
        )}

      </div>

      {/* SPODNÍ NAVIGACE */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 z-50 pb-safe">
        <div className="flex justify-around items-center p-2 max-w-md mx-auto h-16">
          <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <IconHome />
            <span className="text-[10px] font-medium mt-1">Recepty</span>
          </Link>
          
          <Link href="/scanner" className="flex flex-col items-center justify-center w-full h-full text-emerald-500">
            <IconScan />
            <span className="text-[10px] font-semibold mt-1">Skener</span>
          </Link>

          <button onClick={handleHistoryClick} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <IconClock />
            <span className="text-[10px] font-medium mt-1">Historie</span>
          </button>
        </div>
      </div>

    </main>
  );
}