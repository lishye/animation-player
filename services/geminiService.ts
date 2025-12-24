
import { GoogleGenAI } from "@google/genai";

export const analyzeAnimation = async (frames: string[], prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Send a few representative frames to Gemini
  const imageParts = frames.map(base64 => ({
    inlineData: {
      mimeType: 'image/png',
      data: base64.split(',')[1] // remove data:image/png;base64,
    }
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...imageParts,
          { text: `This is a sequence of frames from an animation. ${prompt}` }
        ]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Failed to analyze animation. Check API Key or network.";
  }
};
