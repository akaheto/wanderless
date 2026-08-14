/**
 * Ticketmaster Discovery API integration
 * Gets upcoming events in a city with free tier (5k calls/day)
 */

export interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
    };
  };
  classifications?: Array<{
    genre?: {
      name?: string;
    };
    subGenre?: {
      name?: string;
    };
  }>;
  images?: Array<{
    url: string;
  }>;
  url?: string;
  priceRanges?: Array<{
    min?: number;
    max?: number;
    currency?: string;
  }>;
  venues?: Array<{
    name?: string;
  }>;
}

export interface EventCard {
  id: string;
  name: string;
  date: string;
  time: string;
  category: string;
  image?: string;
  venue?: string;
  priceRange?: string;
  url: string;
}

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_BASE = 'https://app.ticketmaster.com/discovery/v2';

/**
 * Get events for a city from Ticketmaster
 * Caches results server-side via ISR
 */
export async function getEventsByCity(city: string, limit = 6): Promise<EventCard[]> {
  if (!TICKETMASTER_API_KEY) {
    console.warn('[Ticketmaster] No API key configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      city: city,
      apikey: TICKETMASTER_API_KEY,
      size: Math.min(limit, 20).toString(),
    });

    const response = await fetch(
      `${TICKETMASTER_BASE}/events.json?${params}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(`[Ticketmaster] ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    return events
      .map((event: TicketmasterEvent) => {
        const date = event.dates?.start?.localDate || '';
        const time = event.dates?.start?.localTime || '';
        const category =
          event.classifications?.[0]?.genre?.name ||
          event.classifications?.[0]?.subGenre?.name ||
          'Event';

        const priceRange = event.priceRanges?.[0]
          ? `$${event.priceRanges[0].min}–$${event.priceRanges[0].max}`
          : undefined;

        return {
          id: event.id,
          name: event.name,
          date,
          time,
          category,
          image: event.images?.[0]?.url,
          venue: event.venues?.[0]?.name,
          priceRange,
          url: event.url || '#',
        };
      })
      .slice(0, limit);
  } catch (error) {
    console.error('[Ticketmaster] Error fetching events:', error);
    return [];
  }
}
