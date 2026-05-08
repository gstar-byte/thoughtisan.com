import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT } from '../constants';

function getGeminiKey(): string {
  return (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_GEMINI_KEY ||
    ''
  );
}

export async function categorizeThought(text: string): Promise<{
  category?: string;
  tags?: string[];
  refinedContent: string;
  isTodo?: boolean;
  reminder?: unknown;
}> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return { refinedContent: text };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt =
      SYSTEM_PROMPT.replace('{{CURRENT_TIME}}', new Date().toLocaleString()) +
      '\n\nInput text: ' +
      text;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 10000),
    );

    const gen = model.generateContent(prompt);
    const result = await Promise.race([gen, timeout]);
    const response = await result.response;
    const raw = response.text();
    const parsed = JSON.parse(raw || '{}');

    return {
      category: typeof parsed.category === 'string' ? parsed.category : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
      refinedContent:
        typeof parsed.refinedContent === 'string' ? parsed.refinedContent : text,
      isTodo: typeof parsed.isTodo === 'boolean' ? parsed.isTodo : undefined,
      reminder: parsed.reminder ?? undefined,
    };
  } catch (error) {
    console.error('Failed to categorize thought:', error);
    return { refinedContent: text };
  }
}
