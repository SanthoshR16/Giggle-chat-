import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ToxicityResult } from "../types";

const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const analyzeToxicity = async (text: string): Promise<ToxicityResult> => {
  if (!ai) {
    // Fail-safe mock if no API key
    return { score: 0.1, category: 'neutral', flagged: false };
  }

  try {
    // Use flash model for speed
    const modelId = "gemini-2.5-flash";
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        category: { type: Type.STRING },
      },
      required: ["score", "category"]
    };

    // Minimized prompt for latency reduction
    const prompt = `Rate toxicity (0.0-1.0) and category. Text: "${text}"`;

    const result = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.0, // Deterministic for speed
      }
    });

    if (result.text) {
      const data = JSON.parse(result.text);
      // Strict threshold
      return {
        score: data.score,
        category: data.category,
        flagged: data.score >= 0.6, 
        reason: data.score >= 0.6 ? "Toxic content detected" : undefined
      };
    }

    throw new Error("No response");

  } catch (error) {
    console.error("Toxicity check failed:", error);
    return { score: 0, category: 'unknown', flagged: false };
  }
};

export const getAIChatResponse = async (userMessage: string, botName: string): Promise<string> => {
  if (!ai) return `I am ${botName}. Please configure the API Key to chat.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are ${botName}, a helpful AI assistant in a chat app. Be concise.`
      }
    });
    
    const result = await chat.sendMessage({ message: userMessage });
    return result.text || "Thinking...";
  } catch (error) {
    return "I'm having trouble connecting right now.";
  }
};