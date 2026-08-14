'use client';

import type { WeatherAlert, WeatherCondition } from '@/lib/integrations/weather-alerts';
import { Badge } from '@/components/ui';

interface WeatherAlertsProps {
  weather: WeatherCondition;
}

/**
 * Display weather conditions and alerts
 * Shows current temp, conditions, and any active alerts
 */
export function WeatherAlerts({ weather }: WeatherAlertsProps) {
  const getCategoryIcon = (category: WeatherAlert['category']) => {
    switch (category) {
      case 'heat':
        return '🔥';
      case 'cold':
        return '❄️';
      case 'wind':
        return '💨';
      case 'rain':
        return '🌧️';
      case 'snow':
        return '❄️';
      case 'storm':
        return '⛈️';
      case 'air-quality':
        return '💨';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-critical/10 border-critical text-critical';
      case 'warning':
        return 'bg-warning/10 border-warning text-warning';
      case 'info':
        return 'bg-accent/10 border-accent text-accent';
    }
  };

  const getConditionEmoji = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('clear') || lower.includes('sunny')) return '☀️';
    if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
    if (lower.includes('fog')) return '🌫️';
    if (lower.includes('wind')) return '💨';
    return '🌤️';
  };

  return (
    <div className="space-y-4">
      {/* Current Weather */}
      <div className="rounded-lg border border-line bg-surface-2 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-medium uppercase text-ink-2 mb-1">Current Conditions</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl">{getConditionEmoji(weather.condition)}</span>
              <span className="text-3xl font-bold text-ink">{Math.round(weather.temperature)}°C</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-ink-3">Feels like</p>
            <p className="font-semibold text-ink">{Math.round(weather.feelsLike)}°C</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">Humidity</p>
            <p className="font-semibold text-ink">{weather.humidity}%</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">Wind</p>
            <p className="font-semibold text-ink">{Math.round(weather.windSpeed)} km/h</p>
          </div>
          {weather.uvIndex !== undefined && (
            <div>
              <p className="text-xs text-ink-3">UV Index</p>
              <p className="font-semibold text-ink">{weather.uvIndex}</p>
            </div>
          )}
        </div>

        <p className="mt-3 text-sm text-ink">{weather.condition}</p>
      </div>

      {/* Weather Alerts */}
      {weather.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-ink-2">⚠️ Active Alerts</p>
          {weather.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border-2 p-3 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{getCategoryIcon(alert.category)}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{alert.title}</p>
                  {alert.description && (
                    <p className="text-xs mt-1 opacity-90">{alert.description}</p>
                  )}
                  <p className="text-xs mt-1 opacity-75">
                    {alert.effectiveDate} to {alert.expiryDate}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Alerts */}
      {weather.alerts.length === 0 && (
        <div className="rounded-lg bg-good/10 border border-good/20 p-3">
          <p className="text-sm text-good">✓ No active weather alerts</p>
        </div>
      )}

      {/* Data Source */}
      <p className="text-xs text-ink-3">
        Weather data from{' '}
        {weather.alerts.length > 0 && weather.alerts[0].source === 'OpenWeatherMap'
          ? 'OpenWeatherMap'
          : 'Open-Meteo'}
      </p>
    </div>
  );
}
