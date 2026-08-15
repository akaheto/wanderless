#!/usr/bin/env node
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function webSearch(query) {
  console.log(`\n📍 WEB SEARCH: "${query}"`);
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!tavilyApiKey) {
    console.log('❌ TAVILY_API_KEY not configured');
    return '';
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      console.log(`❌ Tavily API error: ${response.status}`);
      return '';
    }

    const data = await response.json();
    let searchResults = data.answer || '';
    if (data.results) {
      searchResults += '\n' + data.results.map((r) => r.content).join('\n');
    }

    console.log(`✅ Got ${data.results?.length || 0} results`);
    console.log(`   Preview: ${searchResults.substring(0, 150)}...`);
    return searchResults;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return '';
  }
}

async function researchCity(city, country) {
  console.log(`\n🏙️  RESEARCHING: ${city}, ${country}`);
  console.log('='.repeat(60));

  const isUSDestination = country.toLowerCase() === 'united states' || country.toLowerCase() === 'usa';

  const [hotelSearch, flightSearch, visaSearch, climateSearch] = await Promise.all([
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

  console.log('\n🤖 CALLING CLAUDE (claude-opus-5)...');
  const message = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  let researchText = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      researchText += block.text;
    }
  }

  console.log('\n📝 CLAUDE RESPONSE:');
  console.log(researchText);

  const jsonMatch = researchText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('\n❌ FAILED: No JSON found in response');
    return null;
  }

  let research;
  try {
    research = JSON.parse(jsonMatch[0]);
    console.log('\n✅ PARSED JSON:');
    console.log(JSON.stringify(research, null, 2));
  } catch (parseError) {
    console.log(`\n❌ FAILED: JSON parse error - ${parseError.message}`);
    console.log(`Raw: ${jsonMatch[0].substring(0, 200)}`);
    return null;
  }

  // Validate
  const hasHotelData = research.hotelData?.fourStarUSD || research.hotelData?.fiveStarUSD;
  const hasFlightData = research.flightData?.typicalHours || research.flightData?.nonstop;
  const hasSummary = research.summary && research.summary.length > 0;

  console.log('\n🔍 VALIDATION:');
  console.log(`  Has hotel data: ${hasHotelData ? '✅' : '❌'}`);
  console.log(`  Has flight data: ${hasFlightData ? '✅' : '❌'}`);
  console.log(`  Has summary: ${hasSummary ? '✅' : '❌'}`);

  if (!hasSummary || (!hasHotelData && !hasFlightData)) {
    console.log('\n❌ VALIDATION FAILED: Incomplete data');
    return null;
  }

  console.log('\n✅ SUCCESS: Research complete');
  return research;
}

// Run test with both cities
async function runTests() {
  await researchCity('Austin', 'United states');
  console.log('\n' + '='.repeat(80) + '\n');
  await researchCity('Accra', 'Ghana');
}

runTests().catch(console.error);
