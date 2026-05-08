import { ClothingItem, OutfitRecommendation, Style, Scene, WeatherData, UserProfile } from "../types";

export async function identifyClothing(imageBase64: string): Promise<Partial<ClothingItem>> {
  const response = await fetch("/api/ai/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 })
  });
  if (!response.ok) throw new Error("Identify failed");
  return await response.json();
}

export async function generateOutfitRecommendations(
  wardrobe: ClothingItem[],
  weather: WeatherData,
  style: Style,
  scene: Scene,
  userProfile?: UserProfile
): Promise<OutfitRecommendation[]> {
  const response = await fetch("/api/ai/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wardrobe, weather, style, scene, userProfile })
  });
  if (!response.ok) throw new Error("Recommendation failed");
  const data = await response.json();
  return data.recommendations;
}

export async function generateVirtualPreview(outfit: OutfitRecommendation, userProfile?: UserProfile): Promise<string> {
  const response = await fetch("/api/ai/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outfit, userProfile })
  });
  if (!response.ok) throw new Error("Preview failed");
  const data = await response.json();
  return data.imageBase64;
}
