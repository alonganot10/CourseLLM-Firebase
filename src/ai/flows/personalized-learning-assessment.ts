'use server';

/**
 * @fileOverview A personalized learning assessment AI agent.
 *
 * - generatePersonalizedAssessment - A function that generates a personalized assessment for a student.
 * - PersonalizedAssessmentInput - The input type for the generatePersonalizedAssessment function.
 * - PersonalizedAssessmentOutput - The return type for the generatePersonalizedAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedAssessmentInputSchema = z.object({
  studentLearningPath: z
    .string()
    .describe("The learning path of the student, including topics covered and interactions with course material."),
  courseContent: z
    .string()
    .describe("The complete course content, including all materials uploaded by the teacher."),
  studentQuestionsAndAnswers: z
    .string()
    .describe("A record of the student's questions and answers during interactions with the course material."),
  learningObjectives: z
    .string()
    .describe("The learning objectives defined by the teacher for the course."),
});
export type PersonalizedAssessmentInput = z.infer<typeof PersonalizedAssessmentInputSchema>;

const PersonalizedAssessmentOutputSchema = z.object({
  assessment: z.string().describe("A personalized assessment for the student, highlighting areas of strength and weakness."),
  suggestedAreasForImprovement: z.string().describe("Suggested areas for the student to focus on for improvement."),
});
export type PersonalizedAssessmentOutput = z.infer<typeof PersonalizedAssessmentOutputSchema>;

export async function generatePersonalizedAssessment(
  input: PersonalizedAssessmentInput
): Promise<PersonalizedAssessmentOutput> {
  return personalizedAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedAssessmentPrompt',
  input: {schema: PersonalizedAssessmentInputSchema},
  output: {schema: PersonalizedAssessmentOutputSchema},
  prompt: `You are an expert educational assessment tool.

  Based on the student's learning path, interactions with the course material, questions and answers, and the defined learning objectives, generate a personalized assessment for the student.

  Highlight areas where the student demonstrates strong understanding and areas where they need to focus more attention.

  Provide specific suggestions for improvement based on the student's individual learning path.

  Learning Objectives: {{{learningObjectives}}}
  Course Content: {{{courseContent}}}
  Student Learning Path: {{{studentLearningPath}}}
  Student Questions and Answers: {{{studentQuestionsAndAnswers}}}
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const personalizedAssessmentFlow = ai.defineFlow(
  {
    name: 'personalizedAssessmentFlow',
    inputSchema: PersonalizedAssessmentInputSchema,
    outputSchema: PersonalizedAssessmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
