/**
 * Travel Warnings & Advisories
 * US State Department and WHO health alerts
 * Data source: travel.state.gov, CDC, WHO
 */

export type TravelWarningLevel = 'level1' | 'level2' | 'level3' | 'level4';

export interface TravelWarning {
  level: TravelWarningLevel;
  title: string;
  description: string;
  category: 'safety' | 'health' | 'political' | 'crime' | 'natural-disaster';
  effectiveDate: string;
  source: string;
  url?: string;
}

export interface CityTravelAdvisory {
  country: string;
  city: string;
  advisoryLevel: TravelWarningLevel;
  advisoryTitle: string;
  warnings: TravelWarning[];
  lastUpdated: string;
  sourceUrl: string;
}

/**
 * Travel warning levels (US State Department)
 * Level 1: Exercise Normal Precautions
 * Level 2: Exercise Increased Caution
 * Level 3: Reconsider Travel
 * Level 4: Do Not Travel
 */

export const TRAVEL_ADVISORIES: Record<string, CityTravelAdvisory> = {
  paris: {
    country: 'France',
    city: 'Paris',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/france',
  },
  london: {
    country: 'United Kingdom',
    city: 'London',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/united-kingdom',
  },
  rome: {
    country: 'Italy',
    city: 'Rome',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/italy',
  },
  barcelona: {
    country: 'Spain',
    city: 'Barcelona',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/spain',
  },
  amsterdam: {
    country: 'Netherlands',
    city: 'Amsterdam',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/netherlands',
  },
  madrid: {
    country: 'Spain',
    city: 'Madrid',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/spain',
  },
  istanbul: {
    country: 'Turkey',
    city: 'Istanbul',
    advisoryLevel: 'level2',
    advisoryTitle: 'Exercise Increased Caution',
    warnings: [
      {
        level: 'level2',
        title: 'Security Concerns',
        description: 'Terrorist organizations including ISIS and al-Qaeda have targeted tourist areas',
        category: 'safety',
        effectiveDate: '2024-01-01',
        source: 'US State Department',
        url: 'https://travel.state.gov/destinations/turkey',
      },
    ],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/turkey',
  },
  prague: {
    country: 'Czech Republic',
    city: 'Prague',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/czech-republic',
  },
  vienna: {
    country: 'Austria',
    city: 'Vienna',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/austria',
  },
  lisbon: {
    country: 'Portugal',
    city: 'Lisbon',
    advisoryLevel: 'level1',
    advisoryTitle: 'Exercise Normal Precautions',
    warnings: [],
    lastUpdated: '2024-08-10',
    sourceUrl: 'https://travel.state.gov/destinations/portugal',
  },
};

/**
 * Get travel advisory for a city
 */
export function getTravelAdvisory(city: string): CityTravelAdvisory | null {
  const normalized = city.toLowerCase().trim();
  return TRAVEL_ADVISORIES[normalized] || null;
}

/**
 * Get advisory level color/styling
 */
export function getAdvisoryColor(level: TravelWarningLevel): string {
  switch (level) {
    case 'level1':
      return 'bg-good/20 border-good text-good'; // Green
    case 'level2':
      return 'bg-warning/20 border-warning text-warning'; // Orange
    case 'level3':
      return 'bg-serious/20 border-serious text-serious'; // Red
    case 'level4':
      return 'bg-critical/20 border-critical text-critical'; // Dark Red
  }
}

/**
 * Get advisory level label
 */
export function getAdvisoryLabel(level: TravelWarningLevel): string {
  switch (level) {
    case 'level1':
      return 'Normal Precautions';
    case 'level2':
      return 'Increased Caution';
    case 'level3':
      return 'Reconsider Travel';
    case 'level4':
      return 'Do Not Travel';
  }
}
