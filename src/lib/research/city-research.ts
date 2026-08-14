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

    const [hotelSearch, flightSearch, visaSearch, climateSearch] =
      await Promise.all([
        webSearch(`${city} ${country} hotel prices 4-star 5-star 2026`),
        webSearch(`flights New York JFK to ${city} ${country} nonstop time`),
        webSearch(`US citizens visa requirements ${city} ${country}`),
        webSearch(`${city} ${country} climate weather temperature best time visit`),
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

Return ONLY a JSON object (no other text) with these exact fields. Use the search results above as your source. If a field cannot be found, set it to null:

{
  "hotelData": {
    "fourStarUSD": <number or null>,
    "fiveStarUSD": <number or null>,
    "source": "<website or null>"
  },
  "flightData": {
    "nonstop": <boolean or null>,
    "typicalHours": <number or null>,
    "source": "<source or null>"
  },
  "visaInfo": "<visa requirement summary or null>",
  "climateData": "<climate summary or null>",
  "summary": "<1-line description of ${city}>"
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

    // Validate that we have real data
    if (
      !research.hotelData?.fourStarUSD ||
      !research.hotelData?.fiveStarUSD ||
      !research.flightData
    ) {
      console.error("[City Research] Incomplete research data received");
      return null;
    }

    console.log(`[City Research Completed] ${city}, ${country}`);
    return research;
  } catch (error) {
    console.error(`[City Research Error] ${city}, ${country}:`, error);
    return null;
  }
}
