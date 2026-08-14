import "server-only";

import Anthropic from "@anthropic-ai/sdk";

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

    const [hotelSearch, flightSearch, visaSearch, climateSearch] =
      await Promise.all([
        webSearch(`${city} ${country} hotel prices 4-star 5-star average cost per night`),
        webSearch(`flights JFK New York to ${city} ${country} nonstop flight time duration hours`),
        isUSDestination
          ? Promise.resolve("US citizens do not require a visa to travel to the United States.")
          : webSearch(`US passport holders visa requirements entry ${city} ${country} 2026`),
        webSearch(`${city} ${country} weather climate temperature best time to visit season`),
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
`;

    const prompt = `Based on the web search results below, extract structured data about ${city}, ${country} as a travel destination.

${searchContext}

Return ONLY a JSON object (no other text) with these exact fields. IMPORTANT: Extract actual numbers from the search results when available. If you cannot find a value, use null.

{
  "hotelData": {
    "fourStarUSD": <number or null (estimated nightly rate in USD if not found)>,
    "fiveStarUSD": <number or null (estimated nightly rate in USD if not found)>,
    "source": "<website name or null>"
  },
  "flightData": {
    "nonstop": <boolean or null>,
    "typicalHours": <number or null (typical flight duration)>,
    "source": "<airline or source or null>"
  },
  "visaInfo": "<visa requirement summary for US citizens or null>",
  "climateData": "<climate/weather summary (best season, temperature range) or null>",
  "summary": "<1-sentence description of ${city} as a travel destination>"
}`;

    const message = await client.messages.create({
      model: "claude-opus-4-1-20250805",
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

    const jsonMatch = researchText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[City Research] Failed to extract JSON from Claude response"
      );
      return null;
    }

    let research: CityResearchResult;
    try {
      research = JSON.parse(jsonMatch[0]) as CityResearchResult;
    } catch (parseError) {
      console.error(
        "[City Research] Failed to parse JSON:",
        parseError,
        "Raw:",
        jsonMatch[0].substring(0, 200)
      );
      return null;
    }

    // Validate that we have at least some real data (at least hotel OR flight info)
    const hasHotelData = research.hotelData?.fourStarUSD || research.hotelData?.fiveStarUSD;
    const hasFlightData = research.flightData?.typicalHours || research.flightData?.nonstop;
    const hasSummary = research.summary && research.summary.length > 0;

    if (!hasSummary || (!hasHotelData && !hasFlightData)) {
      console.error("[City Research] Incomplete research data received", {
        hasHotelData,
        hasFlightData,
        hasSummary,
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
