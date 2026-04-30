import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function categorizeThought(text: string): Promise<{ category?: string; tags?: string[]; refinedContent: string; isTodo?: boolean; reminder?: any }> {
  try {
    const prompt = SYSTEM_PROMPT.replace('{{CURRENT_TIME}}', new Date().toLocaleString()) + '\n\nInput text: ' + text;
    
    // Add a 10 second timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Gemini API timeout")), 10000)
    );
    
    const fetchPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    const result = JSON.parse(response.text || "{}");
    
    return {
      category: result.category || undefined,
      tags: Array.isArray(result.tags) ? result.tags : undefined,
      refinedContent: result.refinedContent || text,
      isTodo: typeof result.isTodo === 'boolean' ? result.isTodo : undefined,
      reminder: result.reminder || undefined,
    };
  } catch (error) {
    console.error("Failed to categorize thought:", error);
    return {
      refinedContent: text,
    };
  }
}
