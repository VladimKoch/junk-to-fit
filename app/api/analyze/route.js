import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { imageBase64, diet } = await req.json();
    
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // OPRAVA 1: Použijeme model "gemini-1.5-pro" (je chytřejší na recepty a vždy dostupný)
    // Pokud by to náhodou dělalo problém, můžeš zkusit i "gemini-1.5-flash-latest"
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

 const prompt = `
      Jsi expert na výživu a profesionální šéfkuchař. Zanalyzuj přiloženou fotku jídla.
      Zohledni dietu: ${diet ? diet : "Žádná specifická dieta"}.
      
      Vrať výsledek POUZE jako validní JSON formát přesně podle této struktury (bez Markdownových značek jako \`\`\`json kolem):
      {
        "title": "Název fit jídla",
        "original_cal": "3000",
        "fit_cal": "800",
        "swaps": [
          {"bad": "Tučné hovězí", "good": "Krůtí maso (5% tuku)"},
          {"bad": "Majonéza", "good": "Domácí dresink z řeckého jogurtu a bylinek"}
        ],
        "ingredients": ["150g mletého krůtího", "1 celozrnná bulka posypaná semínky"],
        "instructions": [
          "Maso důkladně osolte, opepřete a ručně vypracujte pevnou placku o tloušťce zhruba 1,5 cm.",
          "Rozpalte pánev na středně vysokou teplotu a opékejte maso 4-5 minut z každé strany, dokud nebude krásně zlatavé."
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
    
    return Response.json({ success: true, text });
  } catch (error) {
    console.error("Detailní chyba AI:", error); // Tohle nám kdyžtak ukáže víc info
    return Response.json({ success: false, error: "AI momentálně trucuje." }, { status: 500 });
  }
}