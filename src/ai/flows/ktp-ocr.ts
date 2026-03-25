'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const KTPDataSchema = z.object({
  nik: z.string().describe('16 digit NIK number'),
  fullName: z.string().describe('Full name of the person'),
  pobDob: z.string().describe('Place and Date of Birth in format: "City, DD-MM-YYYY"'),
  gender: z.enum(['Laki-laki', 'Perempuan']).describe('Gender'),
  address: z.string().describe('Full address as written on KTP'),
  rtRw: z.string().describe('RT and RW in format "XXX / YYY"'),
  kelurahan: z.string().describe('Kelurahan or Village name'),
  kecamatan: z.string().describe('Kecamatan or Sub-district name'),
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
        { text: 'Extract data from this Indonesian ID Card (KTP). Return structured data matching the schema. If a field is not readable, return an empty string.' },
        { media: { url: input.image, contentType: 'image/jpeg' } }
      ],
      output: { schema: KTPDataSchema },
    });
    
    if (!output) {
      throw new Error('Failed to extract data from KTP image');
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
