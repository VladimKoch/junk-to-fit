import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

// ==========================================
// 1. INICIALIZACE FIREBASE PŘES .ENV
// ==========================================
if (!admin.apps.length) {
  try {
    // 🚀 MAGICKÝ ČISTIČ VŠECH KLÍČŮ Z VERCELU:
    let formattedKey = process.env.FIREBASE_PRIVATE_KEY || "";
    formattedKey = formattedKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    let cleanEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
    cleanEmail = cleanEmail.replace(/^"|"$/g, '').trim(); // Odstraní uvozovky a mezery

    let cleanProjectId = process.env.FIREBASE_PROJECT_ID || "";
    cleanProjectId = cleanProjectId.replace(/^"|"$/g, '').trim();

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: cleanProjectId,
        clientEmail: cleanEmail,
        privateKey: formattedKey,
      })
    });
    console.log("✅ Firebase úspěšně připojen!");
  } catch (err) {
    console.error("❌ Chyba při připojování Firebase:", err);
  }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    
    // 🚀 OPRAVA: Přijímáme správné názvy z frontendu (včetně photoUrls a userId pro historii)
    const { allImagesBase64, userId, photoUrls } = body;

    if (!allImagesBase64 || !Array.isArray(allImagesBase64) || allImagesBase64.length === 0) {
      return NextResponse.json({ success: false, error: "Chybí obrázky" }, { status: 400 });
    }

    // Příprava VŠECH obrázků pro Gemini
    const imageParts = allImagesBase64.map((base64Str) => {
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
        console.log("🚀 Produkt nalezen v DB! Generuji čerstvé a unikátní recepty...");
        const dbData = doc.data();
        let aiData = dbData.ai_result;
        
        try {
          // Rychlý a levný textový dotaz na novou inspiraci (bez fotek!)
          const recipeModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
          });

          const recipePrompt = `
            Jsi kreativní šéfkuchař. Vymysli 3 ZCELA NOVÉ, originální a zdravé recepty, kde hraje hlavní roli tato ingredience/produkt: "${dbData.product_name}".
            Složení produktu je: ${dbData.ingredients}.
            
            PRAVIDLA:
            1. Musí to být jiné recepty, než jaké se běžně dělají. Buď kreativní!
            2. Vše musí být maximálně zdravé, bez rafinovaného cukru.
            3. Používej rady o výživě od Ellen Gould Whiteové (ale nezmiňuj ji).
            
            Vrať POUZE JSON pole (bez Markdownu kolem) přesně v tomto formátu:
            [
              {
                "name": "1. Název tvého nového receptu",
                "recipe": [
                  "První detailní krok přípravy...",
                  "Druhý detailní krok přípravy..."
                ]
              }
            ]
          `;
          
          const recipeResult = await recipeModel.generateContent(recipePrompt);
          const freshRecipes = JSON.parse(recipeResult.response.text());

          // Nahradíme staré nudné recepty z databáze těmi zbrusu novými!
          if (Array.isArray(freshRecipes) && freshRecipes.length > 0) {
            aiData.culinary_tips = freshRecipes;
          }
        } catch (recipeErr) {
          console.error("⚠️ Nepodařilo se vygenerovat nové recepty, použijí se staré:", recipeErr);
        }
        
        // 🚀 UKLÁDÁNÍ DO HISTORIE UŽIVATELE
        try {
          await db.collection('scans').add({
            userId: userId || "anonym",
            photoUrls: photoUrls || [], 
            product_name: aiData.product_name || "Neznámý produkt",
            ai_data: aiData, // Ukládáme to do historie už i s těmi novými recepty!
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (e) { console.error("Chyba historie:", e); }

        return NextResponse.json({ success: true, data: aiData });
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
          "ean": "Pokud na fotkách najdeš čárový kód (EAN), napiš sem jeho číslo. Jinak null.",
          "stats":"Pokud na fotkách najdeš hodnoty energetické nebo gramy napiš je taktéž. A udělej z toho kalorický součet podle nejmodernějších studii. Hlavně si nevymýšlej, pokud nebudeš mít k tomu co říct tak nic nepiš."
        }
      `;
      
      const visualResult = await visualModel.generateContent([visualPrompt, ...imageParts]);
      const visualDataParsed = JSON.parse(visualResult.response.text());
      
      extractedData = visualDataParsed.ingredients || "";
      productName = visualDataParsed.product_name || "Zjištěno z fotografií";
      
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

      DŮLEŽITÉ PRAVIDLO PRO KUCHAŘE: V sekci "culinary_tips" musíš vždy vymyslet PŘESNĚ 3 RŮZNÉ RECEPTY!
      DALŠÍ DŮLEŽITÉ PRAVIDLO: Rafinovaný cukr taktéž není ideální, dej to uživateli vědět, nahrazuj cukr pokud možno přírodními sladidly.
      DALŠÍ PRAVIDLO: Taktéž rozlišuj závadné éčka, popřípadě je vypisuj proč jsou závadné.
      DALŠÍ DŮLEŽITÉ PRAVIDLO: Používej taktéž rady o potravinách a výživě ze všech knih o stravování od Ellen Gould Whiteové. Nicméně ji nikde nezmiňuj.
      POSLEDNÍ DŮLEŽITÉ PRAVIDLO: Každou ingredienci více popiš, odborný rozbor, jak je pro člověka užitečná nebo neužitečná.
      
      Zhodnoť tuto potravinu a vrať striktně JSON přesně v tomto formátu:
      {
        "status": "zelena" nebo "oranzova" nebo "cervena",
        "product_name": "Název produktu (nebo si ho odvoď ze složení)",
        "main_issue": "Vypiš hlavní problémy ve složení, přidej tam k tomu krátké studie která jsou založená na reálných výzkumech (pokud je to zelené, napiš 'Vše v pořádku')",
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
    // FÁZE 5: ULOŽENÍ DO GLOBÁLNÍ DATABÁZE PRODUKTŮ
    // ==========================================
    if (eanNumberForDb && eanNumberForDb.length >= 8) {
      try {
        await db.collection('products').doc(eanNumberForDb).set({
          ean: eanNumberForDb,
          product_name: finalDataParsed.product_name || productName,
          ingredients: extractedData,
          ai_result: finalDataParsed,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (dbErr) {
        console.error("❌ Chyba při ukládání do Firebase (products):", dbErr);
      }
    }

    // ==========================================
    // 🚀 FÁZE 6: ULOŽENÍ DO OSOBNÍ HISTORIE UŽIVATELE
    // ==========================================
    try {
      await db.collection('scans').add({
        userId: userId || "anonym",
        photoUrls: photoUrls || [], // 👈 Zde ukládáme pole odkazů z cloudu!
        product_name: finalDataParsed.product_name || productName,
        ai_data: finalDataParsed, // Výsledek pro zobrazení v historii
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Sken úspěšně uložen do osobní historie uživatele!`);
    } catch (historyErr) {
      console.error("❌ Chyba při ukládání do historie uživatele:", historyErr);
    }

    return NextResponse.json({ success: true, data: finalDataParsed });

  } catch (error) {
    console.error("❌ Chyba API Scanneru:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}