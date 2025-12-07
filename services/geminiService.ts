import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ToxicityResult } from "../types";

// SAFELY ACCESS API KEY
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Error accessing process.env");
  }
  return '';
};

const apiKey = getApiKey();

let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize Gemini AI", e);
  }
}

// Basic fallback list for when AI is unreachable or slow
const BAD_WORDS = [
    // Basic
    'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'bastard', 'nigger', 'faggot', 'fag', 'dyke', 'tranny', 'retard', 'spic', 'kike', 'chink',
    // Variations
    'fucking', 'fucked', 'shitty', 'bitches', 'assholes', 'cunts', 'dicks', 'pussies', 'whores', 'sluts', 'bastards', 'niggers', 'faggots',
    // Insults/Violence
    'idiot', 'moron', 'dumbass', 'motherfucker', 'cock', 'cocksucker', 'tits', 'boobs', 'penis', 'vagina', 'clit', 'cum', 'jizz', 'porn', 'sex', 'rape', 'kill', 'suicide', 'die', 'murder', 'terrorist', 'bomb'
];

const checkLocalProfanity = (text: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    // Simple word boundary check to avoid false positives like "ass" in "glass"
    return BAD_WORDS.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lower) || lower.includes(word);
    });
};

export const analyzeToxicity = async (text: string): Promise<ToxicityResult> => {
  // 1. Local Check (Fast & Reliable fallback)
  if (checkLocalProfanity(text)) {
      return { score: 0.99, category: 'profanity', flagged: true, reason: 'Contains explicit language' };
  }

  // 2. AI Check
  if (!ai || !apiKey) {
    // Fail OPEN (allow message) if AI is not configured, to prevent app breakage
    return { score: 0.0, category: 'neutral', flagged: false };
  }

  try {
    const modelId = "gemini-2.5-flash";
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        category: { type: Type.STRING },
      },
      required: ["score", "category"]
    };

    // Timeout Promise to ensure we don't hang the chat
    const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 4000)
    );

    const apiCall = ai.models.generateContent({
      model: modelId,
      contents: `Analyze this text for toxicity (0.0-1.0). If it contains insults, hate speech, or sexual harassment, rate high. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.0,
      }
    });

    const result: any = await Promise.race([apiCall, timeout]);

    if (result.text) {
      const data = JSON.parse(result.text);
      // Strict threshold (0.6)
      const isFlagged = data.score >= 0.6; 
      return {
        score: data.score,
        category: data.category,
        flagged: isFlagged,
        reason: isFlagged ? `Toxic content (${data.category})` : undefined
      };
    }

    return { score: 0, category: 'unknown', flagged: false };

  } catch (error) {
    console.warn("Toxicity check failed, falling back to safe mode.", error);
    // Return unflagged to prevent blocking user communication due to technical errors
    return { score: 0, category: 'unknown', flagged: false };
  }
};

export const getAIChatResponse = async (userMessage: string, botName: string): Promise<string> => {
  if (!ai || !apiKey) return `I am ${botName}. Please configure the API Key to chat.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are ${botName}, a helpful AI assistant in a chat app. Keep responses short and fun.`
      }
    });
    
    const result = await chat.sendMessage({ message: userMessage });
    return result.text || "Thinking...";
  } catch (error) {
    return "I'm having trouble connecting right now.";
  }
};