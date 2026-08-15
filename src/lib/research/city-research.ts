import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export interface InfluencerSpot {
  name: string;
  type: string;
  description: string;
}

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

/**
 * Perform a web search using Tavily API
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
        max_results: 5,
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

    // Combine answer and top results
    let searchResults = data.answer || "";
    if (data.results) {
      searchResults += "\n" + data.results.map((r) => r.content).join("\n");
    }

    return searchResults;
  } catch (error) {
    console.error("[Web Search] Error:", error);
    return "";
  }
}

/**
 * Research a city using Claude API + Tavily web search.
 * Extracts real hotel pricing, flight routes, visa requirements, and climate data.
 *
 * @param city - City name (e.g., "Barcelona")
 * @param country - Country name (e.g., "Spain")
 * @returns Structured research data from verified sources
 */
export async function researchCity(
  city: string,
  country: string
): Promise<CityResearchResult | null> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Perform web searches for the city
    console.log(`[City Research] Starting research for ${city}, ${country}`);

    // Check if destination is USA (no visa needed for US citizens)
    const isUSDestination = country.toLowerCase() === 'united states' || country.toLowerCase() === 'usa';

    const [hotelSearch, flightSearch, visaSearch, climateSearch, influencerSearch] =
      await Promise.all([
        webSearch(`${city} ${country} hotel prices 4-star 5-star average cost per night`),
        webSearch(`flights JFK New York to ${city} ${country} nonstop flight time duration hours`),
        isUSDestination
          ? Promise.resolve("US citizens do not require a visa to travel to the United States.")
          : webSearch(`US passport holders visa requirements entry ${city} ${country} 2026`),
        webSearch(`${city} ${country} weather climate temperature best time to visit season`),
        webSearch(`best Instagram-worthy Instagram spots cafes bars restaurants museums lookout points ${city} ${country}`),
      ]);

    const searchContext = `
HOTEL SEARCH RESULTS:
${hotelSearch}

FLIGHT SEARCH RESULTS:
${flightSearch}

VISA SEARCH RESULTS:
${visaSearch}

CLIMATE SEARCH RESULTS:
${climateSearch}

INFLUENCER/SOCIAL MEDIA SPOTS:
${influencerSearch}
`;

    const prompt = `Extract and return travel data. Do not reason, explain, or hesitate - just extract what you see.

SEARCH RESULTS:
${searchContext}

Look for these specific values in the search results:
1. Hotel prices in USD: 4-star price, 5-star price (numbers only, e.g., 237, 491)
2. Flight time: total hours as decimal (e.g., 4.6, 5)
3. Nonstop available: true if mentioned, false if not explicitly confirmed
4. Visa requirements: copy/paste the visa text
5. Climate: copy/paste the climate/temperature text
6. Summary: create a 1-sentence summary
7. Influencer spots: extract 20-50 Instagram-worthy locations including bars, restaurants, cafes, museums, lookout points, etc. Each spot must have: real name, type (bar/restaurant/cafe/museum/lookout/other), and brief description

REQUIRED OUTPUT (pure JSON, one line):
{"hotelData":{"fourStarUSD":100,"fiveStarUSD":200,"source":""},"flightData":{"nonstop":false,"typicalHours":4,"source":""},"visaInfo":"","climateData":"","summary":"","influencerSpots":[{"name":"Spot Name","type":"category","description":"Brief description"}]}`;

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    let researchText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        researchText += block.text;
      }
    }

    console.log(`[City Research] Claude response (first 500 chars): ${researchText.substring(0, 500)}`);

    const jsonMatch = researchText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[City Research] Failed to extract JSON from Claude response. Full text:",
        researchText
      );
      return null;
    }

    let research: CityResearchResult;
    try {
      research = JSON.parse(jsonMatch[0]) as CityResearchResult;
      console.log(`[City Research] Parsed JSON:`, JSON.stringify(research, null, 2));
    } catch (parseError) {
      console.error(
        "[City Research] Failed to parse JSON:",
        parseError,
        "Raw:",
        jsonMatch[0].substring(0, 500)
      );
      return null;
    }

    // Validate that we have at least some real data (at least hotel OR flight info)
    // Check if we have numeric values (not null/undefined), even if they're 0
    const hasHotelData =
      (typeof research.hotelData?.fourStarUSD === 'number' && research.hotelData.fourStarUSD > 0) ||
      (typeof research.hotelData?.fiveStarUSD === 'number' && research.hotelData.fiveStarUSD > 0);
    const hasFlightData =
      (typeof research.flightData?.typicalHours === 'number' && research.flightData.typicalHours > 0) ||
      research.flightData?.nonstop === true;
    const hasSummary = research.summary && research.summary.length > 0;
    const hasInfluencerSpots = Array.isArray(research.influencerSpots) && research.influencerSpots.length >= 20;

    if (!hasSummary || (!hasHotelData && !hasFlightData) || !hasInfluencerSpots) {
      console.error("[City Research] Incomplete research data received", {
        hasHotelData,
        hasFlightData,
        hasSummary,
        hasInfluencerSpots,
        spotsCount: research.influencerSpots?.length || 0,
        research,
      });
      return null;
    }

    console.log(`[City Research Completed] ${city}, ${country}`);
    return research;
  } catch (error) {
    console.error(`[City Research Error] ${city}, ${country}:`, error);
    return null;
  }
}
