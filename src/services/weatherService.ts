import { WeatherData } from "../types";

export async function fetchWeather(city: string = 'Shanghai'): Promise<WeatherData> {
  // In a real app, we'd use geolocation to get the city and then call a weather API.
  // For this demo, we'll return a realistic mock based on typical weather.
  // Or try to fetch from wttr.in (JSON format)
  try {
    const res = await fetch(`https://wttr.in/${city}?format=j1`);
    const data = await res.json();
    const current = data.current_condition[0];
    const today = data.weather[0];

    return {
      city: city,
      temperature: parseInt(current.temp_C),
      high: parseInt(today.maxtempC),
      low: parseInt(today.mintempC),
      condition: current.weatherDesc[0].value,
      precipProb: parseInt(current.precipMM) > 0 ? 80 : 10,
      wind: `${current.windspeedKmph} km/h`,
      humidity: parseInt(current.humidity),
      uv: current.uvIndex
    };
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return {
      city: 'Shanghai',
      temperature: 18,
      high: 22,
      low: 15,
      condition: 'Partly Cloudy',
      precipProb: 20,
      wind: 'Gentle Breeze',
      humidity: 65,
      uv: 'Moderate'
    };
  }
}
