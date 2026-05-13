import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Načteme veřejné klíče z .env.local

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Zabráníme tomu, aby se Firebase na frontendu inicializoval dvakrát
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Připravíme ověřování a Google poskytovatele
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const storage = new getStorage(app);

export { app, auth, googleProvider, storage };