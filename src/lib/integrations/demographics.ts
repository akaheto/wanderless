/**
 * City Demographics Integration
 * Population, language, currency, ethnic/religious/age/employment breakdown
 * Data sourced from: Wikipedia, Wikidata, UN data, World Bank
 */

export interface DemographicBreakdown {
  label: string;
  percentage: number;
  color?: string; // Optional: for visualization
}

export interface AgeBreakdown extends DemographicBreakdown {
  ageRange: string;
}

export interface Demographics {
  // Basic
  population: number;
  populationYear: number;
  populationDensity?: number; // per km²

  // Language (top 3-5)
  languages: DemographicBreakdown[];

  // Currency & Economics
  currency: string;
  currencyCode: string;
  employmentRate?: number; // percentage employed
  unemploymentRate?: number;

  // Ethnic composition (top 3-5)
  ethnicity: DemographicBreakdown[];

  // Religion (top 3-5)
  religion: DemographicBreakdown[];

  // Age distribution
  ageBreakdown: AgeBreakdown[];
  medianAge?: number;

  // Time zone
  timezone?: string;

  // Data sources
  sources: {
    population?: string;
    language?: string;
    ethnicity?: string;
    religion?: string;
    employment?: string;
  };
}

/**
 * Placeholder demographics for major world cities
 * In production, this would fetch from Wikidata API or similar
 * For now, these are based on recent (2023-2024) reliable data
 */
export const CITY_DEMOGRAPHICS: Record<string, Demographics> = {
  paris: {
    population: 2161000,
    populationYear: 2024,
    populationDensity: 21248,
    languages: [
      { label: 'French', percentage: 96 },
      { label: 'Arabic', percentage: 2 },
      { label: 'English', percentage: 1 },
    ],
    currency: 'Euro',
    currencyCode: 'EUR',
    employmentRate: 63,
    ethnicity: [
      { label: 'French', percentage: 78 },
      { label: 'North African', percentage: 10 },
      { label: 'Sub-Saharan African', percentage: 5 },
      { label: 'Other', percentage: 7 },
    ],
    religion: [
      { label: 'Catholic', percentage: 50 },
      { label: 'Muslim', percentage: 8 },
      { label: 'Jewish', percentage: 1 },
      { label: 'Other/None', percentage: 41 },
    ],
    ageBreakdown: [
      { ageRange: '0–14', label: '0–14 years', percentage: 15 },
      { ageRange: '15–24', label: '15–24 years', percentage: 12 },
      { ageRange: '25–54', label: '25–54 years', percentage: 44 },
      { ageRange: '55–64', label: '55–64 years', percentage: 15 },
      { ageRange: '65+', label: '65+ years', percentage: 14 },
    ],
    medianAge: 41,
    timezone: 'CET (UTC+1)',
    sources: {
      population: 'INSEE 2024',
      language: 'Census data',
      ethnicity: 'French statistics',
      religion: 'Pew Research',
      employment: 'Eurostat 2024',
    },
  },
  london: {
    population: 8982000,
    populationYear: 2024,
    populationDensity: 5666,
    languages: [
      { label: 'English', percentage: 93 },
      { label: 'Polish', percentage: 1.5 },
      { label: 'Bengali', percentage: 1 },
    ],
    currency: 'British Pound',
    currencyCode: 'GBP',
    employmentRate: 72,
    ethnicity: [
      { label: 'White British', percentage: 44 },
      { label: 'Asian', percentage: 20 },
      { label: 'Black African/Caribbean', percentage: 13 },
      { label: 'Mixed', percentage: 7 },
      { label: 'Other', percentage: 16 },
    ],
    religion: [
      { label: 'Christian', percentage: 48 },
      { label: 'Muslim', percentage: 12 },
      { label: 'Hindu', percentage: 5 },
      { label: 'Jewish', percentage: 2 },
      { label: 'Other/None', percentage: 33 },
    ],
    ageBreakdown: [
      { ageRange: '0–14', label: '0–14 years', percentage: 16 },
      { ageRange: '15–24', label: '15–24 years', percentage: 13 },
      { ageRange: '25–54', label: '25–54 years', percentage: 47 },
      { ageRange: '55–64', label: '55–64 years', percentage: 14 },
      { ageRange: '65+', label: '65+ years', percentage: 10 },
    ],
    medianAge: 38,
    timezone: 'GMT (UTC+0)',
    sources: {
      population: 'ONS 2024',
      language: 'Census 2021',
      ethnicity: 'Census 2021',
      religion: 'Census 2021',
      employment: 'ONS 2024',
    },
  },
  rome: {
    population: 2768816,
    populationYear: 2024,
    populationDensity: 2287,
    languages: [
      { label: 'Italian', percentage: 95 },
      { label: 'Romanian', percentage: 2 },
      { label: 'English', percentage: 1 },
    ],
    currency: 'Euro',
    currencyCode: 'EUR',
    employmentRate: 57,
    ethnicity: [
      { label: 'Italian', percentage: 87 },
      { label: 'Romanian', percentage: 4 },
      { label: 'Filipino', percentage: 2 },
      { label: 'Other', percentage: 7 },
    ],
    religion: [
      { label: 'Catholic', percentage: 79 },
      { label: 'Christian Orthodox', percentage: 3 },
      { label: 'Muslim', percentage: 2 },
      { label: 'Other/None', percentage: 16 },
    ],
    ageBreakdown: [
      { ageRange: '0–14', label: '0–14 years', percentage: 13 },
      { ageRange: '15–24', label: '15–24 years', percentage: 10 },
      { ageRange: '25–54', label: '25–54 years', percentage: 42 },
      { ageRange: '55–64', label: '55–64 years', percentage: 16 },
      { ageRange: '65+', label: '65+ years', percentage: 19 },
    ],
    medianAge: 44,
    timezone: 'CET (UTC+1)',
    sources: {
      population: 'ISTAT 2024',
      language: 'Census data',
      ethnicity: 'Italian statistics',
      religion: 'Pew Research',
      employment: 'Eurostat 2024',
    },
  },
};

/**
 * Get demographics for a city
 * Currently returns pre-curated data; in future could fetch from Wikidata
 */
export function getDemographics(city: string): Demographics | null {
  const normalized = city.toLowerCase().trim();
  return CITY_DEMOGRAPHICS[normalized] || null;
}

/**
 * Get all available demographic cities
 */
export function getAvailableDemographicCities(): string[] {
  return Object.keys(CITY_DEMOGRAPHICS).map(
    (city) => city.charAt(0).toUpperCase() + city.slice(1)
  );
}
