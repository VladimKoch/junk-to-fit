import { NextResponse } from "next/server";
import admin from "firebase-admin";

// ==========================================
// INICIALIZACE FIREBASE (stejná jako všude)
// ==========================================
if (!admin.apps.length) {
  try {
    let formattedKey = process.env.FIREBASE_PRIVATE_KEY || "";
    formattedKey = formattedKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    let cleanEmail = process.env.FIREBASE_CLIENT_EMAIL || "".replace(/^"|"$/g, '').trim();
    let cleanProjectId = process.env.FIREBASE_PROJECT_ID || "".replace(/^"|"$/g, '').trim();

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: cleanProjectId,
        clientEmail: cleanEmail,
        privateKey: formattedKey,
      })
    });
  } catch (err) {
    console.error("❌ Firebase init error:", err);
  }
}

const db = admin.firestore();

export async function GET(req) {
  try {
    // Získáme userId z URL adresy (např. /api/history?userId=kAPLBYr...)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "Chybí userId" }, { status: 400 });
    }

    // 1. Stáhneme všechny skeny z tabulky 'scans'
    const scansSnapshot = await db.collection("scans").where("userId", "==", userId).get();
    const scans = scansSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: "scan", // 👈 Označíme si, z jaké je to tabulky
        title: data.product_name || "Neznámý sken",
        photo: (data.photoUrls && data.photoUrls.length > 0) ? data.photoUrls[0] : "", // Vezmeme první fotku
        aiData: data.ai_data,
        createdAt: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString()
      };
    });

    // 2. Stáhneme všechny recepty z tabulky 'recipes'
    const recipesSnapshot = await db.collection("recipes").where("userId", "==", userId).get();
    const recipes = recipesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: "recipe",
        title: data.title || "Neznámý recept",
        photo: data.photoUrl || "", 
        aiData: data.ai_data,
        createdAt: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString()
      };
    });

    // 3. Spojíme obě tabulky dohromady a seřadíme podle data (nejnovější nahoře)
    const combinedHistory = [...scans, ...recipes].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return NextResponse.json({ success: true, data: combinedHistory });

  } catch (error) {
    console.error("❌ Chyba při načítání historie:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}