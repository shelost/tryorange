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

Address the user in the second-person POV "you" in the analysis. Use appropriate bolding and emphasis on important points.

Please provide the analysis as a JSON object with two properties:
- "summary": A single paragraph of general analysis (no scores mentioned in the text)
- "scores": An array of exactly 5 numbers (0-10) in the order listed above

Be insightful but also responsible. Do not make medical diagnoses.

Example output format:
{
  "summary": "Based on your responses, you appear to be a highly creative and spontaneous individual with a tendency toward abstract thinking. Your associations suggest an optimistic outlook and emotional openness.",
  "scores": [8, 7, 3, 4, 9]
}
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

            const parsedAnalysis = parseAnalysisJson(analysis);

            return { success: true, analysis: parsedAnalysis };
        } catch (error) {
            console.error('Error with Groq API:', error);
            return fail(500, { error: 'Failed to generate analysis due to a server error.' });
        }
    },
};

/**
 * Parses JSON analysis response from the LLM
 * @param {string} text The JSON response text
 * @returns {object|null} Parsed analysis object or null if parsing fails
 */
function parseAnalysisJson(text) {
    try {
        // Try to extract JSON from the text (in case there's extra text around it)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        
        const parsed = JSON.parse(jsonText);
        
        // Validate structure
        if (parsed.summary && Array.isArray(parsed.scores) && parsed.scores.length === 5) {
            return parsed;
        }
    } catch (e) {
        console.error('Failed to parse analysis JSON:', e);
    }
    return null;
}
