import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

// ==========================================
// 1. INICIALIZACE FIREBASE PŘES .ENV
// ==========================================
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // DŮLEŽITÉ: Musíme opravit odřádkování (\n), které se v .env někdy rozbije
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log("✅ Firebase úspěšně připojen přes .env.local!");
  } catch (err) {
    console.error("❌ Chyba při připojování Firebase:", err);
  }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { imagesBase64, scanMode } = body;

    if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
      return NextResponse.json({ success: false, error: "Chybí obrázky" }, { status: 400 });
    }

    // Příprava obrázků pro Gemini
    const imageParts = imagesBase64.map((base64Str) => {
      const mimeType = base64Str.substring(base64Str.indexOf(":") + 1, base64Str.indexOf(";"));
      const data = base64Str.split(",")[1];
      return { inlineData: { data, mimeType } };
    });

    const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let extractedData = "";
    let productName = "Neznámý produkt";
    let eanNumberForDb = null;

    // --- KROK 1: HLEDÁNÍ EAN ---
    const eanPrompt = "Najdi na fotkách čárový kód (EAN). Vypiš jen číslo. Pokud není, napiš 'NULL'.";
    const eanResult = await flashModel.generateContent([eanPrompt, ...imageParts]);
    const eanResp = eanResult.response.text().trim();

    if (eanResp !== "NULL") {
      eanNumberForDb = eanResp.replace(/\D/g, "");
    }

    // --- KROK 2: KONTROLA FIREBASE A OPEN FOOD FACTS ---
    if (eanNumberForDb && eanNumberForDb.length >= 8) {
      const productRef = db.collection('products').doc(eanNumberForDb);
      const doc = await productRef.get();

      if (doc.exists) {
        console.log("🚀 Načteno rovnou z Firebase!");
        return NextResponse.json({ success: true, data: doc.data().ai_result });
      }

      try {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${eanNumberForDb}.json`);
        const offData = await offRes.json();
        if (offData.status === 1 && offData.product) {
          productName = offData.product.product_name_cs || offData.product.product_name || "Neznámý";
          extractedData = offData.product.ingredients_text_cs || offData.product.ingredients_text || "";
        }
      } catch (e) { console.log("OFF nedostupný"); }
    }

    // --- KROK 3: VIZUÁLNÍ ANALÝZA Z VÍCE FOTEK ---
    if (!extractedData || extractedData.length < 10) {
      console.log("🤖 Čtu a spojuji data z fotek...");
      
      // Nastavíme JSON formát i pro vizuální čtení, ať z toho bezpečně vyndáme EAN!
      const visualModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const visualPrompt = `
        Zasílám ti několik fotografií JEDNOHO stejného produktu (např. kulaté plechovky nebo obalu). 
        Vrať mi POUZE JSON objekt s těmito klíči:
        {
          "product_name": "Název produktu (nebo zjištěný z obalu)",
          "ingredients": "Pozorně přečti složení ze VŠECH fotek a logicky ho spoj dohromady do jednoho plynulého textu v češtině. Uvědom si, že text může na okraji jedné fotky končit a na další plynule pokračovat.",
          "ean": "Pokud na fotkách najdeš čárový kód (EAN), napiš sem jeho číslo. Jinak null."
        }
      `;
      
      const visualResult = await visualModel.generateContent([visualPrompt, ...imageParts]);
      const visualDataParsed = JSON.parse(visualResult.response.text());
      
      extractedData = visualDataParsed.ingredients || "";
      productName = visualDataParsed.product_name || "Zjištěno z fotografií";
      
      // Pokud Krok 1 nenašel EAN, ale Krok 3 ano, zachráníme ho!
      if (!eanNumberForDb && visualDataParsed.ean) {
        eanNumberForDb = String(visualDataParsed.ean).replace(/\D/g, "");
      }
    }

    // --- FÁZE 4: FINÁLNÍ ANALÝZA (SEMAFOR) ---
    const jsonModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const analysisPrompt = `
      Jsi expert na výživu a šéfkuchař. Zde jsou informace o potravině:
      Název: ${productName}
      Složení: ${extractedData}

      Zhodnoť tuto potravinu a vrať striktně JSON přesně v tomto formátu:
      DŮLEŽITÉ PRAVIDLO PRO KUCHAŘE: V sekci "culinary_tips" musíš vždy vymyslet PŘESNĚ 3 RŮZNÉ RECEPTY!

      {
        "status": "zelena" nebo "oranzova" nebo "cervena",
        "product_name": "Název produktu (nebo si ho odvoď ze složení)",
        "main_issue": "Hlavní problém ve složení, přidej tam k tomu krátkou studii která je založená na reálném výzkumu (pokud je to zelené, napiš 'Vše v pořádku')",
        "score": 5,
        "alternative": "Krátká rada, co lepšího koupit (nebo pochvala za dobrý výběr)",
        "ingredients_details": [
          { "name": "Voda", "info": "Základní složka, naprosto bezpečná." }
        ],
        "culinary_tips": [
          {
            "name": "1. Rychlá fazolová polévka s bylinkami",
            "recipe": [
              "V hrnci na trošce oleje orestujte cibulku dozlatova.",
              "Přidejte propláchnuté fazole a zalijte zeleninovým vývarem."
            ]
          }
        ]
      }
    `;

    const finalResult = await jsonModel.generateContent(analysisPrompt);
    const finalDataParsed = JSON.parse(finalResult.response.text());

    // ==========================================
    // FÁZE 5: ULOŽENÍ DO FIREBASE PRO PŘÍŠTĚ
    // ==========================================
    // Odstraněna striktní podmínka na 'scanMode'. Nyní se to uloží VŽDY, když máme EAN.
    if (eanNumberForDb && eanNumberForDb.length >= 8) {
      try {
        // Použijeme .doc(ean).set(), aby se stejný produkt neukládal do DB vícekrát jako duplikát
        await db.collection('products').doc(eanNumberForDb).set({
          ean: eanNumberForDb,
          product_name: finalDataParsed.product_name || productName, // Vezme finální uhlazený název od AI
          ingredients: extractedData, // Surový text složení, aby bylo vidět, z čeho AI vycházela
          ai_result: finalDataParsed, // KOMPLETNÍ JSON SE VŠEMI DATY, CO AI VYPRACOVALA
          created_at: admin.firestore.FieldValue.serverTimestamp() // Časové razítko
        });
        console.log(`✅ Nové jídlo (${eanNumberForDb}) úspěšně uloženo do Firebase!`);
      } catch (dbErr) {
        console.error("❌ Chyba při ukládání do Firebase:", dbErr);
      }
    }

    return NextResponse.json({ success: true, data: finalDataParsed });

  } catch (error) {
    console.error("❌ Chyba API Scanneru:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}