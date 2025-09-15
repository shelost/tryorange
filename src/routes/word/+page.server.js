import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    analyze: async ({ request }) => {
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const formData = await request.formData();
        const userResponses = formData.get('responses');

        if (!userResponses) {
            return fail(400, { error: 'No responses provided.' });
        }

        try {
            const systemPrompt = `You are a personality analysis expert with a background in psychology.
Analyze the following word association results from a user.
Based on their responses (the association they provided for a given stimulus word) and response times, provide a brief personality analysis.
Rank them on the following 5 categories on a scale of 0-10, where 0 is very low and 10 is very high:
1.  Creativity/Abstract Thinking
2.  Optimism/Positivity
3.  Anxiety/Neuroticism
4.  Pragmatism/Concrete Thinking
5.  Emotional Spontaneity

Please provide the analysis in a structured format. First a paragraph of general analysis, then the scores. Be insightful but also responsible. Do not make medical diagnoses.
Example output format:
"Based on your responses, you appear to be a highly creative and spontaneous individual...
---
**Creativity/Abstract Thinking:** 8/10
**Optimism/Positivity:** 7/10
**Anxiety/Neuroticism:** 3/10
**Pragmatism/Concrete Thinking:** 4/10
**Emotional Spontaneity:** 9/10"
`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: `Here are the user's word association results: ${userResponses}`,
                    },
                ],
                model: 'openai/gpt-oss-20b',
            });

            const analysis = chatCompletion.choices[0]?.message?.content || 'Could not generate analysis.';

            const scores = parseScores(analysis);

            return { success: true, analysis, scores };
        } catch (error) {
            console.error('Error with Groq API:', error);
            return fail(500, { error: 'Failed to generate analysis due to a server error.' });
        }
    },
};

/**
 * Parses a string containing personality scores in the format "**Category:** X/10"
 * and returns an array of the scores.
 * @param {string} text The analysis text.
 * @returns {number[]} An array of 5 scores, or null if parsing fails.
 */
function parseScores(text) {
    const scoreRegex = /\*\*(.*?):\*\* (\d{1,2})\/10/g;
    const matches = text.matchAll(scoreRegex);
    const scores = [];
    for (const match of matches) {
        if (match[2]) {
            scores.push(parseInt(match[2], 10));
        }
    }
    return scores.length === 5 ? scores : null;
}
