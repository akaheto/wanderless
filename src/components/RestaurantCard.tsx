'use client';

import Link from 'next/link';
import type { RestaurantCard } from '@/lib/integrations/yelp';

interface RestaurantCardProps {
  restaurant: RestaurantCard;
}

/**
 * Display a single restaurant from Yelp
 */
export function RestaurantCardComponent({ restaurant }: RestaurantCardProps) {
  const stars = Math.round(restaurant.rating * 2) / 2; // Round to nearest 0.5

  return (
    <Link href={restaurant.url} target="_blank" rel="noopener noreferrer">
      <div className="group cursor-pointer rounded-lg border border-line bg-surface-1 overflow-hidden transition-all hover:shadow-md hover:border-accent">
        {/* Image */}
        {restaurant.image && (
          <div className="relative h-32 overflow-hidden bg-surface-2">
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <p className="text-xs font-medium uppercase text-accent-2 mb-1">
            {restaurant.category}
          </p>

          <h3 className="font-semibold text-sm text-ink line-clamp-2 mb-2 group-hover:text-accent">
            {restaurant.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${
                    i < Math.floor(stars) ? 'text-accent-2' : 'text-line'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-ink-3">
              {stars} ({restaurant.reviews})
            </span>
          </div>

          {/* Address & Price */}
          <div className="text-xs text-ink-3 space-y-1 mb-3">
            {restaurant.address && <p className="line-clamp-1">📍 {restaurant.address}</p>}
            {restaurant.priceLevel && <p>💰 {restaurant.priceLevel}</p>}
          </div>

          <div className="text-xs text-accent font-medium">View on Yelp →</div>
        </div>
      </div>
    </Link>
  );
}

interface RestaurantsGridProps {
  restaurants: RestaurantCard[];
  title?: string;
  category?: string;
}

/**
 * Display grid of restaurants
 */
export function RestaurantsGrid({
  restaurants,
  title = 'Dining & Restaurants',
  category,
}: RestaurantsGridProps) {
  if (restaurants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        {title}
        {category && <span className="text-lg text-ink-3 font-normal ml-2">({category})</span>}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <RestaurantCardComponent key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </div>
  );
}

interface RestaurantCategoriesProps {
  categories: Record<string, RestaurantCard[]>;
}

/**
 * Display restaurants organized by category
 */
export function RestaurantCategories({ categories }: RestaurantCategoriesProps) {
  const nonEmptyCategories = Object.entries(categories).filter(([_, restaurants]) => restaurants.length > 0);

  if (nonEmptyCategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Dining & Restaurants</h2>
      {nonEmptyCategories.map(([category, restaurants]) => (
        <RestaurantsGrid
          key={category}
          restaurants={restaurants}
          title=""
          category={category.charAt(0).toUpperCase() + category.slice(1)}
        />
      ))}
    </div>
  );
}
