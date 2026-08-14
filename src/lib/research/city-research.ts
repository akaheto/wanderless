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

    const prompt = `TASK: Extract travel data from search results for ${city}, ${country}. Be aggressive - extract ANY numbers and facts you find.

WEB SEARCH DATA:
${searchContext}

INSTRUCTIONS (FOLLOW EXACTLY):
1. For hotel prices: Find ANY dollar amounts mentioned. Examples: "4-star $237/night", "5-star rooms average $491" → extract 237 and 491
2. For flights: Find ANY time duration mentioned. Examples: "4 hours 36 minutes", "nonstop flights available" → extract as number and boolean
3. For visa: Quote the visa requirement text you find
4. For climate: Quote the weather/season text you find
5. For summary: Write one sentence using facts from the results

CRITICAL: Do NOT return null unless data is truly absent. Return whatever numbers/text you can find, even if partial or uncertain.

OUTPUT (JSON ONLY, no markdown):
{
  "hotelData": {
    "fourStarUSD": 0,
    "fiveStarUSD": 0,
    "source": ""
  },
  "flightData": {
    "nonstop": false,
    "typicalHours": 0,
    "source": ""
  },
  "visaInfo": "",
  "climateData": "",
  "summary": ""
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
