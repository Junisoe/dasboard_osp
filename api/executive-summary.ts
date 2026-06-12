import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
  
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const stats = req.body;
    if (!stats) {
      res.status(400).json({ error: "Missing statistical data payload." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: "API Key Gemini tidak terdeteksi di server. Silakan atur GEMINI_API_KEY Anda di Settings/Envs Anda di Vercel Dashboard."
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptHtml = `As a professional Chief Financial Officer (CFO) & Operations Lead, analyze the following project data and write an executive summary report in Indonesian:
    - Total LOPs: ${stats.totalProjects}
    - Total BOQ: ${stats.totalBOQ}
    - Material Cost: ${stats.totalMaterial}
    - Service (Jasa) Cost: ${stats.totalJasa}
    - SITAC Cost: ${stats.totalSitac}
    
    Status Breakdown:
    ${JSON.stringify(stats.statusBreakdown, null, 2)}
    
    Sector Performance Breakdown (DKU QE, DKU OSP, MHR, TA):
    ${JSON.stringify(stats.sectorBreakdown, null, 2)}

    Please structure your response into these concise sections:
    1. 📌 **RINGKASAN UTAMA**: Overall financial state and active milestones performance.
    2. 📊 **ANALISIS SEKTORAL**: Direct insights regarding DKU OSP (which earns 100% of BOQ), DKU QE/TA (potential 60% panjar), and MHR (which has additional SITAC and 15% retention/25% maharani splits). Mention specifically which sector contributes the most.
    3. ⚠️ **DILEMA & ACCELERATION RADAR**: Highlight potential risks from projects currently stuck in "PLAN" or "PEMBERKASAN" statuses, detailing how moving them to "BERKAS DONE" can bolster the cash flow.
    4. 💡 **REKOMENDASI EKSEKUTIF**: Provide 2-3 precise and realistic actions for the logistics and financial coordination teams to optimize cash in for this month.

    Ensure the output is written in formal, professional Indonesian, with clear formatting, using bullet points and appropriate bold highlights. No greeting greetings, just start directly with the title. Keep it exceptionally readable, authoritative, and direct.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptHtml,
    });

    const summaryText = response.text || "Gagal menghasilkan ringkasan eksekutif.";
    res.status(200).json({ text: summaryText });
  } catch (e: any) {
    console.error("[Gemini Serverless Error]:", e);
    res.status(500).json({ error: e.message || "Gagal berinteraksi dengan API Gemini." });
  }
}
