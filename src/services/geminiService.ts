import { GoogleGenAI, Type } from "@google/genai";
import { Category, ClothingItem, OutfitRecommendation, Style, Scene, WeatherData, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function identifyClothing(imageBase64: string): Promise<Partial<ClothingItem>> {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `You are an expert fashion cataloger. Analyze the clothing item in the image.
  Identify its category, sub-category, color, material, thickness, style, and suitable seasons.
  Return the result in JSON format.
  Categories MUST be one of: Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories.
  Thickness MUST be one of: Thin, Medium, Thick.`;

  const prompt = "Identify this clothing item in detail for an electronic wardrobe app.";

  const response = await ai.models.generateContent({
    model,
    contents: [
      { parts: [{ inlineData: { data: imageBase64, mimeType: "image/jpeg" } }, { text: prompt }] }
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
}

export async function generateOutfitRecommendations(
  wardrobe: ClothingItem[],
  weather: WeatherData,
  style: Style,
  scene: Scene,
  userProfile?: UserProfile
): Promise<OutfitRecommendation[]> {
  const model = "gemini-3-flash-preview";
  
  const wardrobeSummary = wardrobe.map(item => ({
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

  Be elegant and encouraging. For each outfit, recommend exactly 2-5 items from the wardrobe list.
  Provide a detailed 'recommendationReason' explaining why this specific combination works.
  Provide 'bodyAdaptationAdvice' specifically for their measurements.
  Return exactly 3 outfit recommendations.`;

  const prompt = `
    Wardrobe Items: ${JSON.stringify(wardrobeSummary)}
    Today's Weather in ${weather.city}: ${weather.condition}, ${weather.temperature}°C (High: ${weather.high}°C, Low: ${weather.low}°C)
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
  const recommendations: any[] = parsed.recommendations || [];

  return recommendations.map(rec => ({
    userId: userProfile?.uid || "guest",
    itemIds: rec.itemIds,
    style,
    scene,
    recommendationReason: rec.recommendationReason,
    bodyAdaptationAdvice: rec.bodyAdaptationAdvice,
    weatherInfo: weather,
    createdAt: new Date().toISOString()
  }));
}

export async function generateVirtualPreview(outfit: OutfitRecommendation, userProfile?: UserProfile): Promise<string> {
  // Use image generation tool for the virtual preview
  // Actually, the SKILL says always use <img> with tool-generated images
  // For runtime generation, we use 'gemini-2.5-flash-image'
  const model = "gemini-2.5-flash-image";
  const prompt = `A professional fashion illustration of a headless female mannequin wearing the following outfit: ${outfit.recommendationReason}. 
  The mannequin should reflect these proportions: Height ${userProfile?.height || 165}cm, Weight ${userProfile?.weight || 55}kg. 
  Style: Minimalist, clean, studio lighting, beige background. No face, no hair. focus on the clothes and fit.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      imageConfig: { aspectRatio: "3:4" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "";
}
