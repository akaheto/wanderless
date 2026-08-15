/**
 * Real-time Weather Alerts
 * OpenWeatherMap alerts with fallback to Open-Meteo
 * OpenWeatherMap free: 1k calls/day
 * Open-Meteo free: 10k calls/day (already in use for climate)
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity; // info, warning, critical
  category: 'heat' | 'cold' | 'wind' | 'rain' | 'snow' | 'storm' | 'air-quality' | 'other';
  effectiveDate: string;
  expiryDate: string;
  source: 'OpenWeatherMap' | 'Open-Meteo';
}

export interface WeatherCondition {
  /** Fahrenheit, like every other temperature in the app. */
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number; // km/h
  condition: string;
  uvIndex?: number;
  alerts: WeatherAlert[];
}

const OWM_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const OME_BASE = 'https://api.open-meteo.com/v1';

/**
 * Get current weather and alerts using OpenWeatherMap
 * Falls back to Open-Meteo if OWM fails or no API key
 */
export async function getWeatherAlerts(
  city: string,
  lat?: number,
  lon?: number
): Promise<WeatherCondition | null> {
  // Try OpenWeatherMap first (has alerts)
  if (OWM_API_KEY && lat && lon) {
    const result = await getOpenWeatherMapAlerts(lat, lon);
    if (result) return result;
  }

  // Fallback to Open-Meteo (no alerts, but reliable)
  if (lat && lon) {
    return await getOpenMeteoWeather(lat, lon);
  }

  console.warn('[Weather] No coordinates provided for weather lookup');
  return null;
}

/**
 * OpenWeatherMap: Current weather + weather alerts
 */
async function getOpenWeatherMapAlerts(lat: number, lon: number): Promise<WeatherCondition | null> {
  if (!OWM_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      units: 'imperial',
      appid: OWM_API_KEY,
    });

    const response = await fetch(
      `${OWM_BASE}/weather?${params}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(`[OpenWeatherMap] ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Map OWM alerts to our format
    const alerts: WeatherAlert[] = [];
    if (data.alerts && Array.isArray(data.alerts)) {
      alerts.push(
        ...data.alerts.map((alert: any, idx: number) => ({
          id: `owm-${idx}`,
          title: alert.event || 'Weather Alert',
          description: alert.description || '',
          severity: getSeverityFromEvent(alert.event) as AlertSeverity,
          category: getCategoryFromEvent(alert.event) as WeatherAlert['category'],
          effectiveDate: new Date(alert.start * 1000).toISOString().split('T')[0],
          expiryDate: new Date(alert.end * 1000).toISOString().split('T')[0],
          source: 'OpenWeatherMap' as const,
        }))
      );
    }

    return {
      temperature: data.main?.temp || 0,
      feelsLike: data.main?.feels_like || 0,
      humidity: data.main?.humidity || 0,
      windSpeed: (data.wind?.speed || 0) * 3.6, // Convert m/s to km/h
      condition: data.weather?.[0]?.main || 'Unknown',
      alerts,
    };
  } catch (error) {
    console.error('[OpenWeatherMap] Error fetching weather:', error);
    return null;
  }
}

/**
 * Open-Meteo: Fallback weather (no alerts, but free & reliable)
 */
async function getOpenMeteoWeather(lat: number, lon: number): Promise<WeatherCondition | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index',
      timezone: 'auto',
      // Open-Meteo returns Celsius unless asked otherwise. Omitting this put °C on a
      // page whose every other temperature is °F.
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
    });

    const response = await fetch(
      `${OME_BASE}/forecast?${params}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(`[Open-Meteo] ${response.status}`);
      return null;
    }

    const data = await response.json();
    const current = data.current;

    // Infer alerts from weather conditions
    const alerts: WeatherAlert[] = [];
    if (current.weather_code >= 80 && current.weather_code < 90) {
      // Rain alerts
      alerts.push({
        id: 'ome-rain',
        title: 'Heavy Rain Expected',
        description: 'Rainfall forecasted for this period',
        severity: 'warning',
        category: 'rain',
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Open-Meteo',
      });
    }

    if (current.temperature_2m > 95) {
      // Heat alerts
      alerts.push({
        id: 'ome-heat',
        title: 'Extreme Heat Warning',
        description: `High temperature of ${Math.round(current.temperature_2m)}°F`,
        severity: 'critical',
        category: 'heat',
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Open-Meteo',
      });
    }

    if (current.wind_speed_10m > 40) {
      // Wind alerts
      alerts.push({
        id: 'ome-wind',
        title: 'Strong Wind Warning',
        description: `Wind speed of ${current.wind_speed_10m} km/h`,
        severity: 'warning',
        category: 'wind',
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source: 'Open-Meteo',
      });
    }

    return {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      condition: getWeatherConditionFromCode(current.weather_code),
      uvIndex: current.uv_index,
      alerts,
    };
  } catch (error) {
    console.error('[Open-Meteo] Error fetching weather:', error);
    return null;
  }
}

/**
 * Map OpenWeatherMap event to alert category
 */
function getCategoryFromEvent(event: string): string {
  const eventLower = event.toLowerCase();
  if (eventLower.includes('heat')) return 'heat';
  if (eventLower.includes('cold') || eventLower.includes('frost')) return 'cold';
  if (eventLower.includes('wind')) return 'wind';
  if (eventLower.includes('rain') || eventLower.includes('flood')) return 'rain';
  if (eventLower.includes('snow') || eventLower.includes('blizzard')) return 'snow';
  if (eventLower.includes('storm') || eventLower.includes('tornado')) return 'storm';
  if (eventLower.includes('air')) return 'air-quality';
  return 'other';
}

/**
 * Map OpenWeatherMap event to severity
 */
function getSeverityFromEvent(event: string): string {
  const eventLower = event.toLowerCase();
  if (
    eventLower.includes('tornado') ||
    eventLower.includes('hurricane') ||
    eventLower.includes('extreme') ||
    eventLower.includes('warning')
  ) {
    return 'critical';
  }
  if (
    eventLower.includes('watch') ||
    eventLower.includes('advisory') ||
    eventLower.includes('alert')
  ) {
    return 'warning';
  }
  return 'info';
}

/**
 * Map WMO weather code to human-readable condition
 */
function getWeatherConditionFromCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2) return 'Mostly clear';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Light rain';
  if (code >= 80 && code <= 82) return 'Heavy rain';
  if (code >= 85 && code <= 86) return 'Heavy showers';
  if (code >= 71 && code <= 77) return 'Light snow';
  if (code === 80 || code === 81) return 'Rain showers';
  if (code === 95 || code === 99) return 'Thunderstorm';
  return 'Unknown';
}
