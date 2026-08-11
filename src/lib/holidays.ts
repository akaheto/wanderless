import holidayData from "@/data/generated/holidays.json";
import type { Destination } from "@/lib/domain/types";
import { datesInRange } from "@/lib/dates";

interface HolidayEntry {
  date: string;
  name: string;
  localName: string;
}

const DATA = holidayData as {
  source: { source: string; url: string; verifiedOn: string; note: string };
  byCountry: Record<string, HolidayEntry[]>;
  unsupportedCountries: string[];
};

export const HOLIDAY_SOURCE = DATA.source;

const COUNTRY_CODES: Record<string, string> = {
  Vietnam: "VN",
  Thailand: "TH",
  Philippines: "PH",
  Indonesia: "ID",
  Japan: "JP",
  Singapore: "SG",
  Sweden: "SE",
  Portugal: "PT",
  Spain: "ES",
  Italy: "IT",
  Mexico: "MX",
  "United States": "US",
  "United Arab Emirates": "AE",
  Morocco: "MA",
  "South Africa": "ZA",
  Maldives: "MV",
};

export interface HolidayLookup {
  holidays: HolidayEntry[];
  /**
   * True when no holiday data exists for this country at all. Surfaced to the user as a
   * gap rather than silently rendering as "no holidays" — an absent source and an empty
   * result must not look the same.
   */
  unavailable: boolean;
}

/** Public holidays falling inside a date range at the destination. */
export function holidaysDuring(
  destination: Destination,
  startDate: string,
  endDate: string,
): HolidayLookup {
  const code = COUNTRY_CODES[destination.country];
  const list = code ? DATA.byCountry[code] : undefined;
  if (!list) return { holidays: [], unavailable: true };

  const inRange = new Set(datesInRange(startDate, endDate));
  return { holidays: list.filter((h) => inRange.has(h.date)), unavailable: false };
}

export function holidayDataAvailable(destination: Destination): boolean {
  const code = COUNTRY_CODES[destination.country];
  return Boolean(code && DATA.byCountry[code]);
}
