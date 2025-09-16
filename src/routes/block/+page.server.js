import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
    analyze: async ({ request }) => {
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const formData = await request.formData();
        const gameData = formData.get('gameData');

        if (!gameData) {
            return fail(400, { error: 'No game data provided.' });
        }

        try {
            const systemPrompt = `You are a behavioral psychology expert specializing in personality analysis through gameplay behavior.
Analyze the following Block Catcher game data from a user who controlled a paddle to catch falling pellets.

Game Mechanics:
- Green pellets: +2 points (safe, consistent reward)
- Red pellets: -1 point (penalty, should be avoided)
- Yellow pellets: Random points from -5 to +10 (high risk/reward)

Based on their gameplay actions, movement patterns, and decision-making, provide a personality analysis.
Rank them on the following 5 categories on a scale of 0-10, where 0 is very low and 10 is very high:

1. Risk-Taking: Willingness to pursue yellow pellets despite potential negative outcomes
2. Optimism: Overall positive approach and persistence despite setbacks
3. Anxiety: Erratic movements, avoidance behavior, or hesitant decision-making
4. Strategic Thinking: Calculated movements, pattern recognition, and planning ahead
5. Impulsivity: Quick, reactive decisions without consideration of consequences

Address the user in the second-person POV "you" in the analysis. Use appropriate bolding and emphasis on important points (at least 2 per analysis). Keep the language simple, straightforward, and personal.

Please provide the analysis as a JSON object with two properties:
- "summary": A single paragraph of behavioral analysis (no scores mentioned in the text)
- "scores": An array of exactly 5 numbers (0-10) in the order listed above

Be insightful but also responsible. Do not make medical diagnoses.

Example output format:
{
  "summary": "Your gameplay reveals a **bold and adventurous** personality with a strong appetite for risk. You consistently pursued high-reward yellow pellets, showing **optimistic confidence** in your abilities even when facing potential losses.",
  "scores": [8, 7, 3, 6, 7]
}`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: `Here is the user's Block Catcher game data: ${gameData}`,
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
