import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

// ==========================================
// 1. INICIALIZACE FIREBASE PŘES .ENV
// ==========================================
if (!admin.apps.length) {
  try {
    let formattedKey = process.env.FIREBASE_PRIVATE_KEY || "";
    formattedKey = formattedKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    let cleanEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
    cleanEmail = cleanEmail.replace(/^"|"$/g, '').trim();

    let cleanProjectId = process.env.FIREBASE_PROJECT_ID || "";
    cleanProjectId = cleanProjectId.replace(/^"|"$/g, '').trim();

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: cleanProjectId,
        clientEmail: cleanEmail,
        privateKey: formattedKey,
      })
    });
    console.log("✅ Firebase pro Recepty úspěšně připojen!");
  } catch (err) {
    console.error("❌ Chyba při připojování Firebase u receptů:", err);
  }
}

const db = admin.firestore();

export async function POST(req) {
  try {
    const { imageBase64, diet, userId, photoUrl } = await req.json();
    
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // OPRAVA 1: Použijeme model "gemini-1.5-pro" (je chytřejší na recepty a vždy dostupný)
    // Pokud by to náhodou dělalo problém, můžeš zkusit i "gemini-1.5-flash-latest"
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

 const prompt = `
      Jsi expert na výživu a profesionální šéfkuchař. Zanalyzuj přiloženou fotku jídla.
      Na základě fotky vytvoř co nejvíce zdravou variantu chuťově stejnou
      Snaž se být neustále originální a vymýšlet nové recepty!
      DŮLEŽITÉ PRAVIDLO: Používej taktéž rady o potravinách a výživě ze všech knih o stravování od Ellen Gould Whiteové. Nicméně ji nikde nezmiňuj.
      Zohledni dietu: ${diet ? diet : "Žádná specifická dieta"}.
      
      Vrať výsledek POUZE jako validní JSON formát přesně podle této struktury (bez Markdownových značek jako \`\`\`json kolem). 
      UPOZORNĚNÍ: Níže uvedený JSON je POUZE ukázka formátu. Hodnoty v něm musíš nahradit reálnými daty podle toho, CO SKUTEČNĚ VIDÍŠ NA FOTCE!
      
      {
        "title": "<Zde doplň výstižný název zdravé verze jídla z fotky>",
        "original_cal": "<odhad kalorií původního jídla na fotce>",
        "fit_cal": "<odhad kalorií tvé zdravé verze>",
        "swaps": [
          {"bad": "<název nezdravé suroviny z fotky>", "good": "<tvoje zdravější alternativa>"},
          {"bad": "<další nezdravá surovina>", "good": "<další zdravá alternativa>"}
        ],
        "ingredients": ["<množství a název suroviny 1>", "<množství a název suroviny 2>"],
        "benefits": ["<Použíj všechny ingredience z "ingdredients" a vypiš jak jsou hodnotné pro lidský organismus>"],
        "instructions": [
          "<Krok 1: Extrémně detailní popis přípravy, přesné časy a teploty>",
          "<Krok 2: Další detailní instrukce...>"
        ]
      }
      
      DŮLEŽITÉ PRAVIDLO PRO INSTRUCTIONS: 
      Postup přípravy (instructions) musí být EXTRÉMNĚ DETAILNÍ. Piš to jako profesionální kuchařku krok za krokem. Zahrň přesné časy vaření/pečení, odhadované teploty a specifické techniky (např. jak přesně nakrájet, na čem orestovat). Nešetři slovy!
      A hlavně si nevymýšlej ale ber informace od skutečných kuchařů! Snaž se aby jídlo bylo maximálně zdravé, bez rafinovaného cukru a jiných nevhodných ingrediencí!
    `;

    // OPRAVA 2: Dynamické zjištění formátu obrázku (aby fungovalo jpg, png, webp...)
    const mimeType = imageBase64.match(/data:(.*?);/)[1];
    const base64Data = imageBase64.split(",")[1];

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    const text = result.response.text();


    // ==========================================
    // 2. EXTRAKCE A ULOŽENÍ DO DATABÁZE
    // ==========================================
    try {
      // Občas AI i přes zákaz pošle na začátku slovo ```json, tak to vyčistíme
      const cleanJsonString = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJsonString);

      // Uložíme to do Firebase tabulky "recipes"
      // Používáme .add(), což znamená, že Firebase vytvoří pro každý recept unikátní ID 
      // (aby se nám recepty nepřepisovaly jako u skeneru s EANem)
      await db.collection('recipes').add({
        userId: userId || "anonym", // 👈 NOVÉ: Abychom věděli, komu recept v historii ukázat
        photoUrl: photoUrl || "",   // 👈 NOVÉ: Uložení URL adresy fotky ze Storage
        title: parsedData.title || "Neznámý recept",
        diet_preference: diet || "Žádná",
        ai_data: parsedData, // Vložíme tam vše, co AI vymyslela (swapy, ingredience atd.)
        created_at: admin.firestore.FieldValue.serverTimestamp() // Čas vytvoření
      });
      console.log(`✅ Recept "${parsedData.title}" úspěšně uložen do DB!`);
      
    } catch (dbErr) {
      console.error("❌ Nepodařilo se uložit recept do Firebase:", dbErr);
      // Schválně nevyhazujeme chybu pro uživatele (return Response.error),
      // chceme, aby se mu recept aspoň zobrazil na mobilu, i kdyby databáze zlobila.
    }
    
    return Response.json({ success: true, text });
  } catch (error) {
    console.error("Detailní chyba:", error); // Tohle nám kdyžtak ukáže víc info
    return Response.json({ success: false, error: "Momentálně trucuji." }, { status: 500 });
  }
}