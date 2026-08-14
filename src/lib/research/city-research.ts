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
 * Research a city using Claude API with WebSearch.
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
    const prompt = `Research the city of ${city}, ${country} as a leisure travel destination. Focus on REAL, VERIFIED data only - no estimates or made-up information.

Search for and extract:

1. HOTEL PRICING (shoulder season, May 15-18, 2026):
   - Find current rates for a well-located 4-star hotel (USD per night)
   - Find current rates for a luxury 5-star hotel (USD per night)
   - Use Booking.com, Trip.com, or Expedia search results
   - Report the SOURCE website

2. FLIGHT DATA from New York (JFK):
   - Is there a nonstop flight? (Yes/No)
   - What's the typical total flight time including connections?
   - Which airlines operate this route?
   - Report the SOURCE (airline website or flight database)

3. VISA REQUIREMENTS:
   - What do US citizens need to enter? (Visa-free, e-visa, visa on arrival, visa required)
   - Duration of stay allowed
   - Source: US State Department travel.state.gov

4. CLIMATE:
   - What is the warmest month? (temperature range)
   - What is the coolest month? (temperature range)
   - Rainy season or dry season pattern
   - Best months to visit (2-3 month range)
   - Source: Climate database or weather service

Return your research as a JSON object with these exact fields:
{
  "hotelData": {
    "fourStarUSD": <number>,
    "fiveStarUSD": <number>,
    "source": "<website>"
  },
  "flightData": {
    "nonstop": <boolean>,
    "typicalHours": <number>,
    "source": "<airline or database>"
  },
  "visaInfo": "<US citizens: visa-free/e-visa/visa required + duration>",
  "climateData": "<warmest month (°F), coolest month (°F), rain pattern, best months>",
  "summary": "<1-line description of ${city} as a leisure destination>"
}

CRITICAL: Only include data from verifiable sources. Do not guess or estimate. If you cannot find reliable data for any field, mark it as null.`;

    const message = await client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 1024,
      tools: [
        {
          name: "web_search",
          description: "Search the web for real-time information",
          input_schema: {
            type: "object" as const,
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
            },
            required: ["query"],
          },
        },
      ],
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the research result from Claude's response
    let researchText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        researchText += block.text;
      }
    }

    // Parse JSON from the response
    const jsonMatch = researchText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[City Research] Failed to extract JSON from Claude response"
      );
      return null;
    }

    const research = JSON.parse(jsonMatch[0]) as CityResearchResult;

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
