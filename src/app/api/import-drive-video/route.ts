import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Extract fileId from Google Drive URL
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Bukan link Google Drive yang valid" }, { status: 400 });
    }

    const fileId = match[1];
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    // Fetch the video file directly
    const res = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!res.ok) {
      // Try fallback URL via drive.google.com/uc
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      if (!fallbackRes.ok) {
        return NextResponse.json(
          { error: "Gagal mengunduh berkas dari Google Drive. Pastikan akses file disetel ke 'Siapa saja yang memiliki link'." },
          { status: 400 }
        );
      }

      const buffer = await fallbackRes.arrayBuffer();
      const contentType = fallbackRes.headers.get("content-type") || "video/mp4";
      const base64 = Buffer.from(buffer).toString("base64");

      return NextResponse.json({
        success: true,
        fileId,
        directUrl: downloadUrl,
        mimeType: contentType.includes("video") ? contentType : "video/mp4",
        size: buffer.byteLength,
        base64: `data:${contentType.includes("video") ? contentType : "video/mp4"};base64,${base64}`,
      });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "video/mp4";
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      success: true,
      fileId,
      directUrl: downloadUrl,
      mimeType: contentType.includes("video") ? contentType : "video/mp4",
      size: buffer.byteLength,
      base64: `data:${contentType.includes("video") ? contentType : "video/mp4"};base64,${base64}`,
    });
  } catch (error: any) {
    console.error("Error importing Google Drive video:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat memproses link Google Drive" },
      { status: 500 }
    );
  }
}
