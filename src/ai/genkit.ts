import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load environment variables for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-1.5-flash',
});
