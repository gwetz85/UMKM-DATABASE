import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Hardcoded fallback - API key dari Google AI Studio
    const apiKey = process.env.GOOGLE_API_KEY 
      || process.env.GEMINI_API_KEY 
      || process.env.GOOGLE_GENAI_API_KEY
      || "AIzaSyDs96utVHtd3h0Lp3m7phO7LOH4MRuZiF8";
    
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 400 });
    }

    // Extract base64 data and mime type from data URL
    const base64Data = image.split(",")[1] || image;
    const parts = image.split(";")[0].split(":");
    const mimeType = parts.length > 1 ? parts[1] : "image/jpeg";

    // Call Gemini API directly via HTTP - no Genkit dependency
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Dari gambar Kartu Keluarga ini, temukan dan ekstrak HANYA 16 digit Nomor KK. Nomor KK biasanya ada di bagian atas dokumen setelah tulisan 'No.' atau 'NOMOR KK'. Kembalikan HANYA 16 digit angkanya saja tanpa spasi atau karakter lain. Jika tidak ditemukan, tulis NOT_FOUND." },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 50 }
      })
    });

    if (!geminiResponse.ok) {
      const errData = await geminiResponse.json();
      throw new Error(errData?.error?.message || "Gemini API error");
    }

    const geminiData = await geminiResponse.json();
    const result = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Cari pola 16 digit angka
    const kkMatch = result.replace(/\s/g, "").match(/\d{16}/);
    
    if (kkMatch) {
      return NextResponse.json({ noKK: kkMatch[0] });
    } else {
      return NextResponse.json({ 
        error: "Nomor KK tidak terbaca. Pastikan foto terang, jelas, dan angka tidak tertutup.", 
        raw: result 
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ 
      error: "Terjadi kesalahan pada server OCR", 
      details: error.message 
    }, { status: 500 });
  }
}
