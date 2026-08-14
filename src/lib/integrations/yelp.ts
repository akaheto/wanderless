/**
 * Yelp API integration
 * Gets restaurants/dining venues by city with free tier (5k calls/day)
 */

export interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  categories: Array<{ title: string }>;
  image_url?: string;
  location?: {
    address1?: string;
    city?: string;
  };
  url?: string;
  price?: string;
}

export interface RestaurantCard {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  category: string;
  image?: string;
  priceLevel?: string;
  address?: string;
  url: string;
}

const YELP_API_KEY = process.env.YELP_API_KEY;
const YELP_BASE = 'https://api.yelp.com/v3';

/**
 * Get restaurants in a city from Yelp
 * Caches results server-side via ISR
 */
export async function getRestaurantsByCity(
  city: string,
  category = 'restaurants',
  limit = 6
): Promise<RestaurantCard[]> {
  if (!YELP_API_KEY) {
    console.warn('[Yelp] No API key configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      location: city,
      categories: category,
      limit: Math.min(limit, 50).toString(),
      sort_by: 'rating',
    });

    const response = await fetch(
      `${YELP_BASE}/businesses/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${YELP_API_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error(`[Yelp] ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const businesses = data.businesses || [];

    return businesses
      .map((business: YelpBusiness) => ({
        id: business.id,
        name: business.name,
        rating: business.rating,
        reviews: business.review_count,
        category: business.categories?.[0]?.title || category,
        image: business.image_url,
        priceLevel: business.price,
        address: business.location?.address1,
        url: business.url || '#',
      }))
      .slice(0, limit);
  } catch (error) {
    console.error('[Yelp] Error fetching restaurants:', error);
    return [];
  }
}

/**
 * Get multiple restaurant categories for a city
 * Useful for showing variety (cafes, fine dining, casual, etc)
 */
export async function getRestaurantCategories(
  city: string
): Promise<Record<string, RestaurantCard[]>> {
  const categories = ['restaurants', 'cafes', 'bars', 'bakeries'];

  const results: Record<string, RestaurantCard[]> = {};

  for (const category of categories) {
    results[category] = await getRestaurantsByCity(city, category, 3);
  }

  return results;
}
