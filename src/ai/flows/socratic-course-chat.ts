'use server';

/**
 * @fileOverview Implements a Socratic chat flow for students to interact with course content.
 *
 * - socraticCourseChat - A function that orchestrates the Socratic chat experience.
 * - SocraticCourseChatInput - The input type for the socraticCourseChat function.
 * - SocraticCourseChatOutput - The return type for the socraticCourseChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SocraticCourseChatInputSchema = z.object({
  courseMaterial: z
    .string()
    .describe('The course material content to chat with, including all relevant text, formulas, and diagrams.'),
  studentQuestion: z.string().describe('The student\'s question about the course material.'),
});
export type SocraticCourseChatInput = z.infer<typeof SocraticCourseChatInputSchema>;

const SocraticCourseChatOutputSchema = z.object({
  response: z.string().describe('The AI-generated Socratic response to guide the student.'),
});
export type SocraticCourseChatOutput = z.infer<typeof SocraticCourseChatOutputSchema>;

export async function socraticCourseChat(input: SocraticCourseChatInput): Promise<SocraticCourseChatOutput> {
  return socraticCourseChatFlow(input);
}

const enforceCompliance = ai.defineTool({
  name: 'enforceCompliance',
  description: 'Ensures that the AI response strictly complies with the provided course material. If the AI response is not compliant, return an error message to the user.',
  inputSchema: z.object({
    courseMaterial: z
      .string()
      .describe('The course material content to check against.'),
    response: z.string().describe('The AI-generated response to validate.'),
  }),
  outputSchema: z.boolean().describe('Returns true if the response complies with the course material, otherwise returns false.'),
}, async (input) => {
  // TODO: Implement the compliance check logic here. This is a placeholder.
  // For now, we'll just assume it always complies.
  console.log(`Course Material: ${input.courseMaterial}`);
  console.log(`AI Response: ${input.response}`);
  return true;
});

const socraticPrompt = ai.definePrompt({
  name: 'socraticCourseChatPrompt',
  input: {schema: SocraticCourseChatInputSchema},
  output: {schema: SocraticCourseChatOutputSchema},
  tools: [enforceCompliance],
  prompt: `You are a Socratic tutor guiding a student through course material. Ask questions that encourage critical thinking and deeper understanding, referencing only the provided course material.

Course Material:
{{courseMaterial}}

Student Question:
{{studentQuestion}}

Response:`,
});

const socraticCourseChatFlow = ai.defineFlow(
  {
    name: 'socraticCourseChatFlow',
    inputSchema: SocraticCourseChatInputSchema,
    outputSchema: SocraticCourseChatOutputSchema,
  },
  async input => {
    const {output} = await socraticPrompt(input);

    // Call the enforceCompliance tool to ensure compliance with course material
    const complianceResult = await enforceCompliance({
      courseMaterial: input.courseMaterial,
      response: output!.response,
    });

    if (!complianceResult) {
      return {response: 'I am unable to provide a compliant response based on the course materials.'};
    }

    return output!;
  }
);
