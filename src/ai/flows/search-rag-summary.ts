'use server';

/**
 * RAG summary flow for the Search page.
 *
 * Generates a grounded answer using ONLY the provided retrieved chunks.
 * The model is instructed to cite sources using [1], [2], ... which map to
 * the numbered `sources` array sent into the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchRagSummaryInputSchema = z.object({
  question: z.string().min(1),
  // Pre-numbered sources blob, built server-side.
  sourcesText: z.string().min(1),
});
export type SearchRagSummaryInput = z.infer<typeof SearchRagSummaryInputSchema>;

const SearchRagSummaryOutputSchema = z.object({
  answer: z
    .string()
    .describe('A concise, grounded answer that cites sources using [1], [2], ...'),
});
export type SearchRagSummaryOutput = z.infer<typeof SearchRagSummaryOutputSchema>;

const prompt = ai.definePrompt({
  name: 'searchRagSummaryPrompt',
  input: { schema: SearchRagSummaryInputSchema },
  output: { schema: SearchRagSummaryOutputSchema },
  prompt: `You are a course search assistant.

Answer the user's question using ONLY the provided sources.

Rules:
- If the sources do not contain enough information, say you don't know based on the sources.
- Cite sources inline using bracketed numbers like [1], [2], matching the numbering in Sources.
- Be concise: 4-10 sentences max.
- Do not invent facts not present in Sources.

Question:
{{question}}

Sources (numbered):
{{sourcesText}}

Return only the answer text with citations.`,
});

export async function generateSearchRagSummary(
  input: SearchRagSummaryInput
): Promise<SearchRagSummaryOutput> {
  const { output } = await prompt(input as any);
  return output!;
}
