import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY in environment variables. Please check Vercel Settings -> Environment Variables and ensure you have REDEPLOYED the app after adding it.");
  }
  return new GoogleGenAI({ apiKey: key });
}

app.use(express.json({ limit: '10mb' }));

app.post("/api/ai/identify", async (req, res) => {
  try {
    const ai = getAI();
    const { imageBase64 } = req.body;
    const model = "gemini-3-flash-preview";
    const systemInstruction = `You are an expert fashion cataloger. Analyze the clothing item in the image. Identify its category, color, material, thickness, style, and suitable seasons. Return JSON.`;
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ inlineData: { data: imageBase64, mimeType: "image/jpeg" } }, { text: "Identify this clothing item." }] }],
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/recommend", async (req, res) => {
  try {
    const ai = getAI();
    const { wardrobe, weather, style, scene, userProfile } = req.body;
    const model = "gemini-3-flash-preview";
    const wardrobeSummary = wardrobe.map((item: any) => ({ name: item.name, category: item.category, color: item.color }));
    const systemInstruction = `You are StyleMate. Recommend 3 distinct outfits based on wardrobe and weather. Return JSON with 'recommendations' array.`;
    const prompt = `Wardrobe: ${JSON.stringify(wardrobeSummary)}. Weather: ${weather.condition}, ${weather.temperature}°C. Style: ${style}. Scene: ${scene}.`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(response.text || "{}");
    res.json({ recommendations: (parsed.recommendations || []).map((r: any) => ({ ...r, style, scene, weatherInfo: weather })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/preview", async (req, res) => {
  try {
    const ai = getAI();
    const { outfit } = req.body;
    const model = "gemini-2.5-flash-image";
    const response = await ai.models.generateContent({
      model,
      contents: `Fashion illustration: ${outfit.recommendationReason}`,
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    let imageBase64 = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) { imageBase64 = `data:image/png;base64,${part.inlineData.data}`; break; }
    }
    res.json({ imageBase64 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
