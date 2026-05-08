export type Category = 'Tops' | 'Bottoms' | 'Dresses' | 'Outerwear' | 'Shoes' | 'Bags' | 'Accessories';
export type Style = 'Any' | 'Casual' | 'Gentle' | 'Formal' | 'Fitness' | 'Elegant';
export type Scene = 'Any' | 'Class' | 'Work' | 'Date' | 'Outdoor' | 'Weekend' | 'Family';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  height?: number;
  weight?: number;
  shoulderWidth?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  legLength?: number;
  sizePreference?: string;
  bodyStylePreference?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ClothingItem {
  id: string;
  userId: string;
  imageUrl: string;
  name: string;
  category: Category;
  subCategory?: string;
  color: string;
  material?: string;
  thickness: 'Thin' | 'Medium' | 'Thick';
  styles: string[];
  seasons: string[];
  suitableTemperatures?: { min: number; max: number };
  status: 'active' | 'archived';
  createdAt: any;
}

export interface OutfitRecommendation {
  id?: string;
  userId: string;
  itemIds: string[];
  style: Style;
  scene: Scene;
  recommendationReason: string;
  bodyAdaptationAdvice: string;
  previewImageUrl?: string;
  weatherInfo: WeatherData;
  rating?: number;
  createdAt: any;
}

export interface WeatherData {
  city: string;
  temperature: number;
  high: number;
  low: number;
  condition: string;
  precipProb: number;
  wind: string;
  humidity: number;
  uv: string;
}
