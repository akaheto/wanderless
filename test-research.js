#!/usr/bin/env node
/**
 * Test the city research process end-to-end.
 * Run: TAVILY_API_KEY=... ANTHROPIC_API_KEY=... node test-research.js
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function webSearch(query) {
  console.log(`\n🔍 Searching: "${query}"`);
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!tavilyApiKey) {
    console.error('❌ TAVILY_API_KEY not set');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        max_results: 10,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      return '';
    }

    const data = await response.json();
    let results = data.answer || '';
    if (data.results) {
      results += '\n' + data.results.map((r) => r.content).join('\n');
    }

    console.log(`✓ Got ${data.results?.length || 0} results`);
    return results;
  } catch (error) {
    console.error(`❌ Search error: ${error.message}`);
    return '';
  }
}

async function testCity(city, country) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${city}, ${country}`);
  console.log('='.repeat(60));

  // Phase 1: Web searches
  console.log('\n📡 PHASE 1: Web Research');
  const [hotel, flight, visa, climate, influencer] = await Promise.all([
    webSearch(`${city} ${country} hotel prices 4-star 5-star average cost per night 2026`),
    webSearch(`flights JFK Newark to ${city} ${country} nonstop flight time hours`),
    webSearch(`US passport visa requirements ${city} ${country}`),
    webSearch(`${city} ${country} weather climate temperature best months to visit`),
    webSearch(`Instagram worthy cafes bars restaurants museums lookout points ${city} ${country}`),
  ]);

  // Check all searches returned data
  const searches = { hotel, flight, visa, climate, influencer };
  for (const [name, data] of Object.entries(searches)) {
    if (!data || data.trim().length === 0) {
      console.error(`\n❌ FAIL: ${name} search returned no results`);
      return;
    }
  }

  // Phase 2: Claude extraction
  console.log('\n🤖 PHASE 2: Claude Extraction');
  const extractionPrompt = `You are extracting verified travel data from web search results.

CRITICAL RULES:
- Extract ONLY facts that appear in the search results
- Do NOT estimate, guess, or make up numbers
- If a value is not found, leave it as null
- All prices must be actual numbers from websites
- All spots must be real locations from the search results

HOTEL DATA:
${hotel}

FLIGHT DATA:
${flight}

VISA DATA:
${visa}

CLIMATE DATA:
${climate}

INFLUENCER SPOTS:
${influencer}

Extract exactly:
1. Hotel prices (4-star, 5-star in USD)
2. Flight hours and nonstop status
3. Visa requirements text
4. Climate text
5. 1-sentence summary
6. 20-50 influencer spots with name, type, description

Return ONLY JSON:
{"hotelData":{"fourStarUSD":null,"fiveStarUSD":null,"source":""},"flightData":{"nonstop":true,"typicalHours":10,"source":""},"visaInfo":"","climateData":"","summary":"","influencerSpots":[]}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    let text = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('\n❌ FAIL: Claude did not return valid JSON');
      console.log('Response:', text.substring(0, 500));
      return;
    }

    let research;
    try {
      research = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('\n❌ FAIL: JSON parse error:', parseError.message);
      console.log('JSON attempted:', jsonMatch[0].substring(0, 300));
      return;
    }

    // Phase 3: Validation
    console.log('\n✓ PHASE 3: Validation');

    // Validate hotel
    if (!research.hotelData?.fourStarUSD || research.hotelData.fourStarUSD < 50 || research.hotelData.fourStarUSD > 2000) {
      console.error(`❌ Hotel 4-star invalid: ${research.hotelData?.fourStarUSD}`);
      return;
    }
    console.log(`✓ Hotel 4-star: $${research.hotelData.fourStarUSD}`);

    if (!research.hotelData?.fiveStarUSD || research.hotelData.fiveStarUSD < 50 || research.hotelData.fiveStarUSD > 2000) {
      console.error(`❌ Hotel 5-star invalid: ${research.hotelData?.fiveStarUSD}`);
      return;
    }
    console.log(`✓ Hotel 5-star: $${research.hotelData.fiveStarUSD}`);

    if (research.hotelData.fourStarUSD >= research.hotelData.fiveStarUSD) {
      console.error(`❌ 4-star (${research.hotelData.fourStarUSD}) must be less than 5-star (${research.hotelData.fiveStarUSD})`);
      return;
    }

    // Validate flight
    if (typeof research.flightData?.typicalHours !== 'number' || research.flightData.typicalHours < 4 || research.flightData.typicalHours > 25) {
      console.error(`❌ Flight hours invalid: ${research.flightData?.typicalHours}`);
      return;
    }
    console.log(`✓ Flight: ${research.flightData.typicalHours}h, nonstop: ${research.flightData.nonstop}`);

    // Validate visa
    if (!research.visaInfo || research.visaInfo.length < 10) {
      console.error(`❌ Visa info too short: ${research.visaInfo}`);
      return;
    }
    console.log(`✓ Visa: ${research.visaInfo.substring(0, 50)}...`);

    // Validate climate
    if (!research.climateData || research.climateData.length < 20) {
      console.error(`❌ Climate info too short: ${research.climateData}`);
      return;
    }
    console.log(`✓ Climate: ${research.climateData.substring(0, 50)}...`);

    // Validate spots
    if (!Array.isArray(research.influencerSpots) || research.influencerSpots.length < 20 || research.influencerSpots.length > 50) {
      console.error(`❌ Spots count invalid: ${research.influencerSpots?.length}`);
      return;
    }
    console.log(`✓ Influencer spots: ${research.influencerSpots.length}`);

    // Check spot structure
    for (let i = 0; i < Math.min(3, research.influencerSpots.length); i++) {
      const spot = research.influencerSpots[i];
      if (!spot.name || !spot.type || !spot.description) {
        console.error(`❌ Spot ${i} missing fields`);
        return;
      }
      console.log(`  • ${spot.name} (${spot.type}): ${spot.description.substring(0, 40)}...`);
    }

    console.log(`\n✅ SUCCESS: ${city}, ${country} researched successfully!`);
    console.log('\nFull data:');
    console.log(JSON.stringify(research, null, 2));
  } catch (error) {
    console.error(`\n❌ FAIL: ${error.message}`);
  }
}

// Test with Barcelona (good data source)
testCity('Barcelona', 'Spain').then(() => process.exit(0)).catch(() => process.exit(1));
