import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDs96utVHtd3h0Lp3m7phO7LOH4MRuZiF8";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 400 });
    }

    // Extract base64 data and mime type from data URL
    const base64Data = image.split(",")[1] || image;
    const parts = image.split(";")[0].split(":");
    const mimeType = (parts.length > 1 ? parts[1] : "image/jpeg") as string;

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Try multiple models in order of preference
    const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];
    
    let result = "";
    let lastError = "";
    
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent([
          "Dari gambar Kartu Keluarga ini, temukan dan ekstrak HANYA 16 digit Nomor KK. Nomor KK biasanya ada di bagian atas dokumen setelah tulisan 'No.' atau 'NOMOR KK'. Kembalikan HANYA 16 digit angkanya saja tanpa spasi atau karakter lain. Jika tidak ditemukan, tulis NOT_FOUND.",
          { inlineData: { mimeType, data: base64Data } }
        ]);
        result = response.response.text().trim();
        break; // berhasil, keluar dari loop
      } catch (modelErr: any) {
        lastError = modelErr.message;
        console.warn(`Model ${modelName} gagal:`, modelErr.message);
        continue;
      }
    }

    if (!result) {
      throw new Error(`Semua model gagal. Error terakhir: ${lastError}`);
    }

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
