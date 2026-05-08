import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, OutfitRecommendation, Style, Scene, WeatherData, UserProfile } from "../types";

// Initialize AI on the client-side
// We use a getter to avoid immediate ReferenceError if process is not defined during module load
const getAi = () => {
  const apiKey = (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || '';
  return new GoogleGenAI({ apiKey });
};

export async function identifyClothing(imageBase64: string): Promise<Partial<ClothingItem>> {
  try {
    const ai = getAi();
    const model = "gemini-3-flash-preview";
    const systemInstruction = `You are an expert fashion cataloger. Analyze the clothing item in the image.
    Identify its category, sub-category, color, material, thickness, style, and suitable seasons.
    Return JSON. Categories MUST be one of: Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories.
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
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Identify Client Error:", error);
    throw error;
  }
}

export async function generateOutfitRecommendations(
  wardrobe: ClothingItem[],
  weather: WeatherData,
  style: Style,
  scene: Scene,
  userProfile?: UserProfile
): Promise<OutfitRecommendation[]> {
  try {
    const ai = getAi();
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
    Recommend exactly 3 distinct outfits based on:
    1. Cabinet: ${JSON.stringify(wardrobeSummary)}
    2. Weather: ${weather.condition}, ${weather.temperature}°C
    3. Style: ${style}, Scene: ${scene}
    4. Body: ${JSON.stringify(userProfile || { height: 165, weight: 55 })}.
    Return JSON with 'recommendations' array. Each MUST use item IDs.`;

    const response = await ai.models.generateContent({
      model,
      contents: "Generate 3 look recommendations based on instructions.",
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

    const parsed = JSON.parse(response.text || '{"recommendations": []}');
    return (parsed.recommendations || []).map((rec: any) => ({
      userId: userProfile?.uid || "guest",
      itemIds: rec.itemIds,
      style,
      scene,
      recommendationReason: rec.recommendationReason,
      bodyAdaptationAdvice: rec.bodyAdaptationAdvice,
      weatherInfo: weather,
      createdAt: new Date().toISOString()
    }));
  } catch (error: any) {
    console.error("Recommend Client Error:", error);
    throw error;
  }
}

export async function generateVirtualPreview(outfit: OutfitRecommendation, userProfile?: UserProfile): Promise<string> {
  try {
    const ai = getAi();
    const model = "gemini-2.5-flash-image";
    const prompt = `A professional fashion catalog photo of someone wearing this outfit: ${outfit.recommendationReason}. 
    Body: Height ${userProfile?.height || 165}cm, Weight ${userProfile?.weight || 55}kg. 
    Style: clean studio lighting, neutral background, high quality.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: { aspectRatio: "3:4" }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return "";
  } catch (error: any) {
    console.error("Preview Client Error:", error);
    return "";
  }
}
