import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // AI Client - Server Side Only
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/ai/identify", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      const model = "gemini-3-flash-preview";
      const systemInstruction = `You are an expert fashion cataloger. Analyze the clothing item in the image.
      Identify its category, sub-category, color, material, thickness, style, and suitable seasons.
      Return the result in JSON format.
      Categories MUST be one of: Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories.
      Thickness MUST be one of: Thin, Medium, Thick.`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          { parts: [{ inlineData: { data: imageBase64, mimeType: "image/jpeg" } }, { text: "Identify this clothing item in detail." }] }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              color: { type: Type.STRING },
              material: { type: Type.STRING },
              thickness: { type: Type.STRING },
              styles: { type: Type.ARRAY, items: { type: Type.STRING } },
              seasons: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["name", "category", "color", "thickness"]
          }
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("AI Identify Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/recommend", async (req, res) => {
    try {
      const { wardrobe, weather, style, scene, userProfile } = req.body;
      const model = "gemini-3-flash-preview";
      
      const wardrobeSummary = wardrobe.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        style: item.styles,
        color: item.color,
        thickness: item.thickness
      }));

      const systemInstruction = `You are StyleMate, a personal professional fashion stylist.
      Your goal is to recommend the 3 best distinct outfits for the user today based on:
      1. Their existing wardrobe items.
      2. The current weather in their city.
      3. Their desired style and scene for the day.
      4. Their body measurements (if provided).
      Return exactly 3 outfit recommendations.`;

      const prompt = `
        Wardrobe Items: ${JSON.stringify(wardrobeSummary)}
        Today's Weather in ${weather.city}: ${weather.condition}, ${weather.temperature}°C
        Desired Style: ${style}
        Scene: ${scene}
        User Stats: ${userProfile ? JSON.stringify(userProfile) : "Not provided"}
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendationReason: { type: Type.STRING },
                    bodyAdaptationAdvice: { type: Type.STRING },
                  },
                  required: ["itemIds", "recommendationReason", "bodyAdaptationAdvice"]
                }
              }
            },
            required: ["recommendations"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const recommendations = (parsed.recommendations || []).map((rec: any) => ({
        userId: userProfile?.uid || "guest",
        itemIds: rec.itemIds,
        style,
        scene,
        recommendationReason: rec.recommendationReason,
        bodyAdaptationAdvice: rec.bodyAdaptationAdvice,
        weatherInfo: weather,
        createdAt: new Date().toISOString()
      }));

      res.json({ recommendations });
    } catch (error: any) {
      console.error("AI Recommend Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/preview", async (req, res) => {
    try {
      const { outfit, userProfile } = req.body;
      const model = "gemini-2.5-flash-image";
      const prompt = `A professional fashion illustration of a headless female mannequin wearing the following outfit: ${outfit.recommendationReason}. 
      The mannequin should reflect: Height ${userProfile?.height || 165}cm, Weight ${userProfile?.weight || 55}kg. 
      Style: Minimalist, clean, studio lighting, beige background. No face.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          imageConfig: { aspectRatio: "3:4" }
        }
      });

      let imageBase64 = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      res.json({ imageBase64 });
    } catch (error: any) {
      console.error("AI Preview Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
