import { NextResponse } from "next/server";
import admin from "firebase-admin";

// 1. INICIALIZACE FIREBASE
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
    console.error("Chyba Firebase:", err);
  }
}

const db = admin.firestore();

export async function POST(req) {
  try {
    const { oldId, newId } = await req.json();

    if (!oldId || !newId) {
      return NextResponse.json({ success: false, error: "Chybí ID" }, { status: 400 });
    }

    const batch = db.batch();

    // 1. Přepsání v kolekci receptů (změň název tabulky podle svého)
    const recipesSnapshot = await db.collection('recipes').where('userId', '==', oldId).get();
    recipesSnapshot.forEach((doc) => {
      batch.update(doc.ref, { userId: newId });
    });

    // 2. Přepsání v kolekci historie skenů (změň název tabulky podle svého)
    const historySnapshot = await db.collection('history').where('userId', '==', oldId).get();
    historySnapshot.forEach((doc) => {
      batch.update(doc.ref, { userId: newId });
    });

    // Spustíme všechny přepisy najednou (je to bezpečnější a rychlejší)
    await batch.commit();

    console.log(`✅ Úspěšně přesunuta data z ${oldId} na ${newId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ Chyba při spojování účtů:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}