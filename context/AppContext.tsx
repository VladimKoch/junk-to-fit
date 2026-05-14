"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithPopup, 
  signInAnonymously, 
  onAuthStateChanged, 
  linkWithPopup 
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase"; 
import { usePathname } from "next/navigation";

const AppContext = createContext<any>(null);

// Pomocné SVG Ikony pro kontext
const IconLightning = () => <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M11.996 22.25c-.27 0-.53-.11-.71-.31-.35-.4-.36-1-.02-1.42l4.13-5.27H9.256c-.5 0-.91-.41-.91-.91 0-.16.04-.32.12-.46L13.116 2.22c.28-.48.9-.64 1.38-.36.48.28.64.9.36 1.38L10.876 13h5.79c.47 0 .86.36.9.83.04.47-.28.9-.74 1.01l-4.11 5.24c-.19.24-.45.36-.72.36z"/></svg>;
const IconClose = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const IconLock = () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(true); // Na startu není premium
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  const pathname = usePathname(); 

  useEffect(() => {
    if (localStorage.getItem("junkToFitTheme") === "light") setIsDarkMode(false);

    const savedCredits = localStorage.getItem("junkToFitCredits");
    if (savedCredits !== null) setCredits(parseInt(savedCredits, 10));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        localStorage.setItem("junkToFitUserId", firebaseUser.uid);
        if (!firebaseUser.isAnonymous) {
          setIsPremium(true);
        }
      } else {
        try {
          const userCred = await signInAnonymously(auth);
          console.log("Anonymní UID:", userCred.user.uid);
          localStorage.setItem("junkToFitCredits", "4");
          setCredits(4);
        } catch (error) {
          console.error("Auth error:", error);
        }
      }
    });

    return () => unsubscribe();
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

  const handleGoogleLogin = async () => {
    try {
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        await linkWithPopup(auth.currentUser, googleProvider);
        loginSuccess("Účet propojen. Záznamy zachovány.");
      } else {
        await signInWithPopup(auth, googleProvider);
        loginSuccess("Přihlášení úspěšné.");
      }
    } catch (error: any) { 
      console.error(error);
      alert("Chyba přihlášení: " + error.message); 
    }
  };

  // Barva ukazatele kreditů podle aktuální stránky
  let lightningColor = "text-emerald-500";
  if (pathname === "/scanner") lightningColor = "text-emerald-500";
  if (pathname === "/history") lightningColor = "text-emerald-500"; // Sjednoceno na smaragdovou pro profesionální vzhled

  const value = {
    credits, isPremium, isDarkMode, toggleTheme, deductCredit,
    setShowLoginModal, setShowPaywall, handleGoogleLogin
  };

  return (
    <AppContext.Provider value={value}>
      <div className={isDarkMode ? "dark" : ""}>
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white transition-colors duration-500 relative">
          
          {/* CENTRÁLNÍ UKAZATEL KREDITŮ (Minimalistický) */}
          {credits !== null && (
            <div 
              className="absolute top-6 right-6 z-[90] bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer hover:border-slate-300 dark:hover:border-white/10 transition-colors text-slate-700 dark:text-slate-300" 
              onClick={() => {if(!isPremium && credits <= 0) setShowPaywall(true)}}
            >
              <span className={lightningColor}><IconLightning /></span>
              {isPremium ? "PREMIUM" : `${credits} / 4`}
            </div>
          )}

          {children}

          {/* GLOBÁLNÍ OKNO: PAYWALL (Clean & Premium) */}
          {showPaywall && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-[#121826] p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-white/5 text-center relative">
                
                <button 
                  onClick={() => setShowPaywall(false)} 
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <IconClose />
                </button>
                
                <div className="flex justify-center mb-6 mt-2">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <IconLock />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white tracking-tight">Předplaťte Premium</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                  Vyčerpali jste volné analýzy. Přejděte na Premium pro neomezené skenování a tvorbu fit receptů.
                </p>
                
                <button 
                  onClick={handleGoogleLogin} 
                  className="w-full py-3.5 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-3 mb-4 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm transition-all active:scale-[0.98] group"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Přihlásit se přes Google
                </button>
                
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Vaše dosavadní data a historie zůstanou zachovány po propojení účtu.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);