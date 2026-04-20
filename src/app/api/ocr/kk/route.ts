import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/ai/genkit";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 400 });
    }

    // Extract the base64 data and mime type
    // Format usually: data:image/jpeg;base64,...
    const base64Data = image.split(",")[1] || image;
    const parts = image.split(";")[0].split(":");
    const mimeType = parts.length > 1 ? parts[1] : "image/jpeg";

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        { text: "Ekstrak 16 digit Nomor KK (Kartu Keluarga) dari gambar ini. Pastikan hanya angka 16 digit. Kembalikan HANYA angkanya saja. Jika tidak ditemukan, kembalikan 'NOT_FOUND'." },
        { data: { content: base64Data, contentType: mimeType } }
      ],
      config: {
        temperature: 0,
      }
    });

    const result = response.text.trim();
    
    // Cari pola 16 digit angka
    const kkMatch = result.match(/\d{16}/);
    
    if (kkMatch) {
      return NextResponse.json({ noKK: kkMatch[0] });
    } else {
      return NextResponse.json({ 
        error: "Gagal mendeteksi 16 digit Nomor KK. Pastikan foto jelas dan Nomor KK terlihat.", 
        raw: result 
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server OCR" }, { status: 500 });
  }
}
