'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const KTPDataSchema = z.object({
  nik: z.string().optional().describe('16 digit NIK number'),
  fullName: z.string().optional().describe('Full name of the person'),
  pobDob: z.string().optional().describe('Place and Date of Birth in format: "City, DD-MM-YYYY"'),
  gender: z.string().optional().describe('Gender (Laki-laki / Perempuan)'),
  address: z.string().optional().describe('Full address as written on KTP'),
  rtRw: z.string().optional().describe('RT and RW in format "XXX / YYY"'),
  kelurahan: z.string().optional().describe('Kelurahan or Village name'),
  kecamatan: z.string().optional().describe('Kecamatan or Sub-district name'),
});

export type KTPData = z.infer<typeof KTPDataSchema>;

const KTPOCRInputSchema = z.object({
  image: z.string().describe('Base64-encoded image of the KTP'),
});

export const ktpOCRFlow = ai.defineFlow(
  {
    name: 'ktpOCRFlow',
    inputSchema: KTPOCRInputSchema,
    outputSchema: KTPDataSchema,
  },
  async (input: z.infer<typeof KTPOCRInputSchema>) => {
    // Extract data using Gemini with multimodal input
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: [
        { text: `
          You are a professional OCR engine specializing in Indonesian ID Cards (KTP).
          Your goal is to extract every piece of information accurately, even if the image is slightly blurry or at an angle.
          
          Instructions:
          1. Identify the NIK (16 digits). If you see symbols like '?' or misread digits, try to infer them from the context or nearby text.
          2. Extact the "Nama" as fullName.
          3. Extract "Tempat/Tgl Lahir" and format it as "City, DD-MM-YYYY". If city is missing, just return the date.
          4. Convert "Jenis Kelamin" to "Laki-laki" or "Perempuan".
          5. Extract "Alamat", "RT/RW", "Kel/Desa", and "Kecamatan" into their respective fields.
          
          If a field is absolutely unreadable, leave it as an empty string. DO NOT make up data.
          Return a valid JSON object matching the requested schema.
        ` },
        { media: { url: input.image, contentType: 'image/jpeg' } }
      ],
      output: { schema: KTPDataSchema },
    });
    
    if (!output) {
      throw new Error('Failed to extract data from KTP image. Please ensure the image is clear and try again.');
    }
    
    return output;
  }
);

export async function ktpOCR(base64Image: string): Promise<KTPData> {
  // Ensure base64Image starts with data URI scheme
  const formattedImage = base64Image.startsWith('data:') 
    ? base64Image 
    : `data:image/jpeg;base64,${base64Image}`;
    
  return ktpOCRFlow({ image: formattedImage });
}
