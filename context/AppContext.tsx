"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
// 👈 PŘIDÁNY NOVÉ FUNKCE PRO ANONYMNÍ PŘIHLÁŠENÍ A PROPOJOVÁNÍ ÚČTŮ
import { 
  signInWithPopup, 
  signInAnonymously, 
  onAuthStateChanged, 
  linkWithPopup 
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase"; 
import { usePathname } from "next/navigation";

const AppContext = createContext<any>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(true); // Na startu není premium
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  const pathname = usePathname(); 

  // 🚀 ZMĚNĚNÉ NAČÍTÁNÍ POMOCÍ FIREBASE AUTH
  useEffect(() => {
    // Téma
    if (localStorage.getItem("junkToFitTheme") === "light") setIsDarkMode(false);

    // Kredity z paměti
    const savedCredits = localStorage.getItem("junkToFitCredits");
    if (savedCredits !== null) setCredits(parseInt(savedCredits, 10));

    // FIREBASE POSLUCHAČ: Kdo je zrovna v aplikaci?
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Někdo tu je (buď anonym, nebo už přihlášený Googlem)
        localStorage.setItem("junkToFitUserId", firebaseUser.uid);
        
        // Pokud už NENÍ anonymní, je to Premium uživatel!
        if (!firebaseUser.isAnonymous) {
          setIsPremium(true);
        }
      } else {
        // Vůbec nikdo tu není -> Vytvoříme nového anonymního uživatele
        try {
          const userCred = await signInAnonymously(auth);
          console.log("Vytvořen nový anonymní účet s UID:", userCred.user.uid);
          
          // Je to úplný nováček, dáme mu 4 kredity
          localStorage.setItem("junkToFitCredits", "100");
          setCredits(100);
        } catch (error) {
          console.error("Chyba při anonymním přihlášení:", error);
        }
      }
    });

    return () => unsubscribe(); // Úklid posluchače
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("junkToFitTheme", newTheme ? "dark" : "light");
  };

  const deductCredit = () => {
    if (credits !== null && credits > 0 && !isPremium) {
      const newCredits = credits - 1;
      setCredits(newCredits);
      localStorage.setItem("junkToFitCredits", newCredits.toString());
    }
  };

  const loginSuccess = (message: string) => {
    setIsPremium(true);
    setShowLoginModal(false);
    setShowPaywall(false);
    alert(message);
  };

  // 🚀 MAGIE PROPOJENÍ ÚČTŮ
  const handleGoogleLogin = async () => {
    try {
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        // Máme anonyma -> "Přilepíme" mu k jeho UID Google účet
        await linkWithPopup(auth.currentUser, googleProvider);
        loginSuccess("Účet úspěšně zachráněn a propojen! Tvé recepty zůstávají.");
      } else {
        // Normální přihlášení (kdyby se přihlašoval třeba z jiného mobilu)
        await signInWithPopup(auth, googleProvider);
        loginSuccess("Vítej zpět! Tvá kuchařka je načtena.");
      }
    } catch (error: any) { 
      console.error(error);
      alert("Přihlášení se nezdařilo. " + error.message); 
    }
  };

  let lightningColor = "text-lime-500 dark:text-lime-400";
  if (pathname === "/scanner") lightningColor = "text-emerald-500 dark:text-emerald-400";
  if (pathname === "/history") lightningColor = "text-amber-500 dark:text-amber-400";

  const value = {
    credits, isPremium, isDarkMode, toggleTheme, deductCredit,
    setShowLoginModal, setShowPaywall, handleGoogleLogin // Přidal jsem handleGoogleLogin do exportu
  };

  return (
    <AppContext.Provider value={value}>
      <div className={isDarkMode ? "dark" : ""}>
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white transition-colors duration-500 relative">
          
          {/* CENTRÁLNÍ UKAZATEL KREDITŮ */}
          {credits !== null && (
            <div 
              className="absolute top-6 right-6 z-[90] bg-white/70 dark:bg-gray-900/80 backdrop-blur-md border border-slate-200 dark:border-gray-800/80 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-gray-300" 
              onClick={() => {if(!isPremium && credits <= 0) setShowPaywall(true)}}
            >
              <span className={`${lightningColor} drop-shadow-md text-base transition-colors duration-300`}>⚡</span>
              {isPremium ? "NEOMEZENO" : `${credits} / 4 ZDARMA`}
            </div>
          )}

          {children}

          {/* GLOBÁLNÍ OKNO: PAYWALL */}
          {showPaywall && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl max-w-sm w-full border border-white dark:border-gray-800 text-center animate-fade-in relative">
                <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-5 text-xl text-slate-400 hover:text-slate-800 dark:hover:text-white">✕</button>
                <div className="text-7xl -mt-14 drop-shadow-md mb-2">⚡</div>
                <h2 className="text-2xl font-black mb-2 dark:text-white">Došly ti kredity</h2>
                <p className="text-slate-600 dark:text-gray-400 mb-6 text-sm">Získal jsi ukázku toho, co Junk to Fit umí. Přejdi na Premium a odemkni si neomezené skenování!</p>
                
                <button 
                  onClick={handleGoogleLogin} 
                  className="w-full py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-3 mb-4 hover:bg-slate-50 dark:hover:bg-gray-700 hover:shadow-md transition-all active:scale-95 group"
                >
                  {/* ... SVG Google ikony ... */}
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Přihlásit se a zaplatit
                </button>
                <p className="text-xs text-slate-400">Tvá dosavadní kuchařka ti zůstane.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);