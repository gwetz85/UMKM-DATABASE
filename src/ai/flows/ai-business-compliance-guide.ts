'use server';
/**
 * @fileOverview An AI-powered tool that suggests potential business compliance requirements.
 *
 * - aiBusinessComplianceGuide - A function that handles the business compliance guide process.
 * - AIBusinessComplianceGuideInput - The input type for the aiBusinessComplianceGuide function.
 * - AIBusinessComplianceGuideOutput - The return type for the aiBusinessComplianceGuide function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIBusinessComplianceGuideInputSchema = z.object({
  businessType: z.string().describe('The type of business.'),
  location: z.string().describe('The geographical location of the business (e.g., city, state, country).'),
});
export type AIBusinessComplianceGuideInput = z.infer<typeof AIBusinessComplianceGuideInputSchema>;

const AIBusinessComplianceGuideOutputSchema = z.object({
  complianceChecklist: z.array(z.string()).describe('A checklist of potential compliance requirements.'),
});
export type AIBusinessComplianceGuideOutput = z.infer<typeof AIBusinessComplianceGuideOutputSchema>;

export async function aiBusinessComplianceGuide(input: AIBusinessComplianceGuideInput): Promise<AIBusinessComplianceGuideOutput> {
  return aiBusinessComplianceGuideFlow(input);
}

const aiBusinessComplianceGuidePrompt = ai.definePrompt({
  name: 'aiBusinessComplianceGuidePrompt',
  input: {schema: AIBusinessComplianceGuideInputSchema},
  output: {schema: AIBusinessComplianceGuideOutputSchema},
  prompt: `You are an AI-powered business compliance expert. Your task is to provide a general checklist of potential compliance requirements based on the provided business type and location.

Consider common regulations, permits, licenses, and legal obligations that might apply.

Business Type: {{{businessType}}}
Location: {{{location}}}

Provide the compliance requirements as a list.`,
});

const aiBusinessComplianceGuideFlow = ai.defineFlow(
  {
    name: 'aiBusinessComplianceGuideFlow',
    inputSchema: AIBusinessComplianceGuideInputSchema,
    outputSchema: AIBusinessComplianceGuideOutputSchema,
  },
  async input => {
    const {output} = await aiBusinessComplianceGuidePrompt(input);
    return output!;
  }
);
