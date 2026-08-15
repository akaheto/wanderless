import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Imported from the domain, which now requires citations. This file's own definition was
 * one of three copies; another sat inlined in the admin page.
 */
import type { InfluencerSpot } from "@/lib/domain/types";
export type { InfluencerSpot };

export interface CityResearchResult {
  hotelData: {
    fourStarUSD: number;
    fiveStarUSD: number;
    source: string;
  };
  flightData: {
    nonstop: boolean;
    typicalHours: number;
    source: string;
  };
  visaInfo: string;
  climateData: string;
  summary: string;
  influencerSpots: InfluencerSpot[];
}

interface ResearchError {
  field: string;
  reason: string;
}

/**
 * Perform a web search using Tavily API
 * Returns empty string if search fails - treated as data not found
 */
async function webSearch(query: string): Promise<string> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    console.warn("[Web Search] TAVILY_API_KEY not configured");
    return "";
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        max_results: 10,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      console.error(`[Web Search] API error: ${response.status}`);
      return "";
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ content?: string }>;
    };

    let searchResults = data.answer || "";
    if (data.results) {
      searchResults += "\n" + data.results.map((r) => r.content).join("\n");
    }

    if (!searchResults.trim()) {
      console.warn(`[Web Search] No results for: ${query}`);
    }

    return searchResults;
  } catch (error) {
    console.error("[Web Search] Error:", error);
    return "";
  }
}

/** Shape of Claude's JSON output before validation — every field is untrusted. */
interface RawExtraction {
  hotelData?: { fourStarUSD?: unknown; fiveStarUSD?: unknown; source?: unknown };
  flightData?: { typicalHours?: unknown; nonstop?: unknown; source?: unknown };
  visaInfo?: unknown;
  climateData?: unknown;
  summary?: unknown;
  influencerSpots?: Array<{ name?: unknown; type?: unknown; description?: unknown }>;
}

/**
 * Validate extracted data according to spec.
 * Returns error if validation fails, null if all passes.
 */
function validateResearch(data: RawExtraction): ResearchError[] {
  const errors: ResearchError[] = [];

  // Hotel validation
  if (!data.hotelData || typeof data.hotelData !== 'object') {
    errors.push({ field: 'hotelData', reason: 'Missing or invalid hotel data object' });
  } else {
    const fourStar = data.hotelData.fourStarUSD;
    const fiveStar = data.hotelData.fiveStarUSD;

    if (typeof fourStar !== 'number' || fourStar <= 0 || fourStar > 2000) {
      errors.push({ field: 'hotelData.fourStarUSD', reason: `Invalid 4-star price: ${fourStar}` });
    }
    if (typeof fiveStar !== 'number' || fiveStar <= 0 || fiveStar > 2000) {
      errors.push({ field: 'hotelData.fiveStarUSD', reason: `Invalid 5-star price: ${fiveStar}` });
    }
    if (typeof fourStar === 'number' && typeof fiveStar === 'number' && fourStar >= fiveStar) {
      errors.push({ field: 'hotelData', reason: `4-star price (${fourStar}) must be less than 5-star (${fiveStar})` });
    }
    if (!data.hotelData.source || typeof data.hotelData.source !== 'string' || data.hotelData.source.length < 3) {
      errors.push({ field: 'hotelData.source', reason: 'Missing or invalid source attribution' });
    }
  }

  // Flight validation
  if (!data.flightData || typeof data.flightData !== 'object') {
    errors.push({ field: 'flightData', reason: 'Missing or invalid flight data object' });
  } else {
    const hours = data.flightData.typicalHours;
    if (typeof hours !== 'number' || hours < 4 || hours > 25) {
      errors.push({ field: 'flightData.typicalHours', reason: `Invalid flight hours: ${hours} (must be 4-25)` });
    }
    if (typeof data.flightData.nonstop !== 'boolean') {
      errors.push({ field: 'flightData.nonstop', reason: 'Nonstop must be true or false' });
    }
    if (!data.flightData.source || typeof data.flightData.source !== 'string' || data.flightData.source.length < 3) {
      errors.push({ field: 'flightData.source', reason: 'Missing or invalid source attribution' });
    }
  }

  // Visa validation
  if (!data.visaInfo || typeof data.visaInfo !== 'string' || data.visaInfo.length < 10) {
    errors.push({ field: 'visaInfo', reason: 'Missing or too brief visa information' });
  }

  // Climate validation
  if (!data.climateData || typeof data.climateData !== 'string' || data.climateData.length < 20) {
    errors.push({ field: 'climateData', reason: 'Missing or too brief climate information' });
  }

  // Summary validation
  if (!data.summary || typeof data.summary !== 'string' || data.summary.length < 10) {
    errors.push({ field: 'summary', reason: 'Missing or too brief summary' });
  }

  // Influencer spots validation
  if (!Array.isArray(data.influencerSpots)) {
    errors.push({ field: 'influencerSpots', reason: 'Must be an array' });
  } else {
    if (data.influencerSpots.length < 20) {
      errors.push({ field: 'influencerSpots', reason: `Only ${data.influencerSpots.length} spots extracted (need 20-50)` });
    }
    if (data.influencerSpots.length > 50) {
      errors.push({ field: 'influencerSpots', reason: `${data.influencerSpots.length} spots extracted (need 20-50)` });
    }

    for (let i = 0; i < data.influencerSpots.length; i++) {
      const spot = data.influencerSpots[i];
      if (!spot.name || typeof spot.name !== 'string' || spot.name.length < 3) {
        errors.push({ field: `influencerSpots[${i}].name`, reason: 'Missing or invalid spot name' });
      }
      if (!spot.type || typeof spot.type !== 'string' || !['bar', 'restaurant', 'cafe', 'museum', 'lookout', 'beach', 'market', 'shop', 'other'].includes(spot.type)) {
        errors.push({ field: `influencerSpots[${i}].type`, reason: `Invalid type: ${spot.type}` });
      }
      if (!spot.description || typeof spot.description !== 'string' || spot.description.length < 5) {
        errors.push({ field: `influencerSpots[${i}].description`, reason: 'Missing or too brief description' });
      }
    }

    // Check for duplicates
    const names = data.influencerSpots.map((s) => s.name);
    const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
    if (duplicates.length > 0) {
      errors.push({ field: 'influencerSpots', reason: `Duplicate spots found: ${duplicates.join(', ')}` });
    }
  }

  return errors;
}

/**
 * Research a city using Claude API + Tavily web search.
 * STRICT: Only returns data that passes all validation gates.
 * NEVER fabricates or estimates data.
 *
 * @param city - City name (e.g., "Barcelona")
 * @param country - Country name (e.g., "Spain")
 * @returns Structured research data from verified sources, or null if validation fails
 */
export async function researchCity(
  city: string,
  country: string
): Promise<CityResearchResult | null> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    console.log(`[City Research] Starting research for ${city}, ${country}`);

    // Phase 1: Web Research - All 5 searches must return data
    const isUSDestination = country.toLowerCase() === 'united states' || country.toLowerCase() === 'usa';

    const [hotelSearch, flightSearch, visaSearch, climateSearch, influencerSearch] =
      await Promise.all([
        webSearch(`${city} ${country} hotel prices 4-star 5-star average cost per night 2026`),
        webSearch(`flights JFK Newark to ${city} ${country} nonstop flight time hours`),
        isUSDestination
          ? Promise.resolve("US citizens do not require a visa to travel to the United States.")
          : webSearch(`US passport visa requirements ${city} ${country}`),
        webSearch(`${city} ${country} weather climate temperature best months to visit`),
        webSearch(`Instagram worthy cafes bars restaurants museums lookout points ${city} ${country}`),
      ]);

    // Check that all searches returned data
    const searchResults = { hotelSearch, flightSearch, visaSearch, climateSearch, influencerSearch };
    for (const [key, value] of Object.entries(searchResults)) {
      if (!value || value.trim().length === 0) {
        console.error(`[City Research] Search failed: ${key}`);
        return null;
      }
    }

    // Phase 2: Claude Extraction
    const extractionPrompt = `Extract verified travel data from these search results. Return ONLY valid JSON, nothing else.

HOTEL SEARCH:
${hotelSearch}

FLIGHT SEARCH:
${flightSearch}

VISA SEARCH:
${visaSearch}

CLIMATE SEARCH:
${climateSearch}

INFLUENCER SEARCH:
${influencerSearch}

EXTRACT ONLY THESE FIELDS. Use null if data not found:

{
  "hotelData": {
    "fourStarUSD": <number between 50-2000, from search results only>,
    "fiveStarUSD": <number between 50-2000, from search results only>,
    "source": "<website name>"
  },
  "flightData": {
    "nonstop": <true or false>,
    "typicalHours": <number between 4-25>,
    "source": "<airline or site name>"
  },
  "visaInfo": "<exact text from search results, minimum 10 characters>",
  "climateData": "<exact text from search results, minimum 20 characters>",
  "summary": "<one sentence about city>",
  "influencerSpots": [
    {"name": "<real location name from results>", "type": "bar|restaurant|cafe|museum|lookout|beach|market|shop|other", "description": "<brief description from results>"},
    ...20-50 spots total...
  ]
}

RULES:
- Return ONLY valid JSON, no other text
- Use exact numbers found in search results, never estimate
- String values must use double quotes
- Use proper JSON syntax: commas between fields, no trailing commas
- Numbers without quotes, booleans without quotes
- This is your entire response - nothing before or after the JSON`;

    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: extractionPrompt }],
    });

    let researchText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        researchText += block.text;
      }
    }

    const jsonMatch = researchText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[City Research] No JSON in response:", researchText.substring(0, 200));
      return null;
    }

    let research: RawExtraction;
    try {
      research = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[City Research] JSON parse failed:", jsonMatch[0].substring(0, 200));
      return null;
    }

    // Phase 3: Strict Validation
    const validationErrors = validateResearch(research);
    if (validationErrors.length > 0) {
      console.error("[City Research] Validation failed:", validationErrors);
      return null;
    }

    console.log(`[City Research] ✓ Research complete for ${city}, ${country}`);
    return research as CityResearchResult;
  } catch (error) {
    console.error(`[City Research] Fatal error:`, error);
    return null;
  }
}
