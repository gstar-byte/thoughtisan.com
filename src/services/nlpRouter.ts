import { NLP_PROVIDER, USE_LOCAL_NLP_FALLBACK } from "../featureFlags";
import { categorizeThoughtDeepSeek } from "./deepseekService";
import { categorizeThought as categorizeThoughtGemini } from "./geminiService";
import { categorizeThoughtLocal } from "./localNlpService";

export async function categorizeThought(text: string): Promise<{
  category?: string;
  tags?: string[];
  refinedContent: string;
  isTodo?: boolean;
  reminder?: any;
  isAmbiguous?: boolean;
  clarificationPrompt?: string | null;
  isStarred?: boolean;
  isPinned?: boolean;
}> {
  if (NLP_PROVIDER === 'deepseek') {
    try {
      console.log("[NLP Router] Trying DeepSeek...");
      const result = await categorizeThoughtDeepSeek(text);
      console.log("[NLP Router] DeepSeek succeeded:", result);
      return result;
    } catch (err) {
      console.warn("[NLP Router] DeepSeek failed:", err);
      if (USE_LOCAL_NLP_FALLBACK) {
        console.log("[NLP Router] Falling back to local NLP...");
        return categorizeThoughtLocal(text);
      }
      throw err;
    }
  }

  if (NLP_PROVIDER === 'gemini') {
    try {
      console.log("[NLP Router] Trying Gemini...");
      const result = await categorizeThoughtGemini(text);
      console.log("[NLP Router] Gemini succeeded:", result);
      return result;
    } catch (err) {
      console.warn("[NLP Router] Gemini failed:", err);
      if (USE_LOCAL_NLP_FALLBACK) {
        console.log("[NLP Router] Falling back to local NLP...");
        return categorizeThoughtLocal(text);
      }
      throw err;
    }
  }

  return categorizeThoughtLocal(text);
}
