import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MemeConcept } from "../types";

const MEME_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      caption: {
        type: Type.STRING,
        description: "A punchy, surreal one-sentence caption (max 15 words).",
      },
      imagePrompt: {
        type: Type.STRING,
        description: "A vivid, strange, and highly visual image generation prompt.",
      },
    },
    required: ["caption", "imagePrompt"],
  },
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMemeConcepts = async (topic: string, isKapreMode: boolean = false): Promise<MemeConcept[]> => {
  try {
    let systemInstruction = `You are "Meme Alchemy", a chaotic genius that turns any topic into 5 brand-new, never-before-seen surreal memes.
        
Rules:
1. NEVER use existing meme templates (No Drake, No Wojak, etc).
2. Every meme must be 100% original and surreal/anomaly-style (think "Italian Brainrot", "Nano Banana", weird animal-object hybrids, dream logic, impossible physics).
3. The visual style should be cinematic, strange, and high-definition.
4. Output exactly 5 memes.
5. Caption must be short (max 15 words) and extremely punchy.`;

    if (isKapreMode) {
      systemInstruction += `
      
      *** ACTIVATING KAPRE MODE ***
      The user has summoned the ancient spirits. 
      - TONE: Terrifying, eerie, Filipino folklore horror, cursed, visceral.
      - VISUALS: Dark, blood-red, grainy, smoke-filled, nightmare fuel.
      - CONTENT: Incorporate folklore elements (balete trees, tobacco smoke, tikbalang horses, manananggal halves, duwende mounds) into the surrealism.
      - MAGNITUDE: Make it 3x scarier and more unsettling than usual.
      - STRICT: Do not be funny. Be unsettlingly surreal.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Topic: ${topic}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: MEME_SCHEMA,
        temperature: isKapreMode ? 1.4 : 1.2, // Higher chaos for Kapre
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response text from Gemini");

    const data = JSON.parse(jsonText) as { caption: string; imagePrompt: string }[];
    
    return data.map((item, index) => ({
      id: crypto.randomUUID(),
      caption: item.caption,
      imagePrompt: item.imagePrompt,
    }));

  } catch (error) {
    console.error("Error generating meme concepts:", error);
    throw error;
  }
};

export const generateMemeImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            // imageSize is not supported in gemini-3-pro-image-preview
        }
      }
    });

    // Extract image from response
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Error generating meme image:", error);
    throw error;
  }
};