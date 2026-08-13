'use client';

import { useState, useEffect } from 'react';
import { getCachedDestination } from '@/lib/offline/db';
import { useOffline } from '@/lib/offline/context';
import type { CachedDestination } from '@/lib/offline/db';

type GuideSection = 'attractions' | 'food' | 'transit' | 'day-plans';

interface CityGuidesTabProps {
  destinationId: string;
  destinationName: string;
  stopId?: number;
}

export function CityGuidesTab({ destinationId, destinationName }: CityGuidesTabProps) {
  const [section, setSection] = useState<GuideSection>('attractions');
  const [cached, setCached] = useState<CachedDestination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useOffline();

  useEffect(() => {
    const loadCache = async () => {
      setIsLoading(true);
      try {
        if (!isOnline) {
          const cachedDest = await getCachedDestination(destinationId);
          setCached(cachedDest || null);
        }
      } catch (err) {
        console.warn('Failed to load cached destination:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCache();
  }, [destinationId, isOnline]);

  const handleShowSection = (newSection: GuideSection) => {
    setSection(newSection);
  };

  if (!isOnline && !cached) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.553-.894L9 7m0 0l6.553-3.276A1 1 0 0117 5.618v10.764a1 1 0 01-1.553.894L9 13m0 0l-6 3.582m6-3.582v6.582m0-6.582l6 3.582"
            />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Download {destinationName} to browse guides offline.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const sections: { id: GuideSection; label: string; icon: string }[] = [
    { id: 'attractions', label: 'Things to Do', icon: '🎭' },
    { id: 'food', label: 'Food & Drink', icon: '🍽️' },
    { id: 'transit', label: 'Getting Around', icon: '🚆' },
    { id: 'day-plans', label: 'Day Plans', icon: '🗺️' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => handleShowSection(s.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              section === s.id
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {section === 'attractions' && (
          <AttractionsGuide
            places={cached?.places || []}
            destinationName={destinationName}
          />
        )}
        {section === 'food' && (
          <FoodGuide
            places={cached?.places || []}
            destinationName={destinationName}
          />
        )}
        {section === 'transit' && (
          <TransitGuide
            destination={cached?.destination}
            destinationName={destinationName}
          />
        )}
        {section === 'day-plans' && (
          <DayPlansGuide
            destination={cached?.destination}
            destinationName={destinationName}
          />
        )}
      </div>
    </div>
  );
}

function AttractionsGuide({
  places,
  destinationName,
}: {
  places: any[];
  destinationName: string;
}) {
  const [search, setSearch] = useState('');

  const attractions = places.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const isAttraction = p.category && ['museum', 'outdoor', 'landmark', 'cultural', 'entertainment'].includes(p.category);
    return matchesSearch && isAttraction;
  });

  if (attractions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          {places.length === 0 ? 'No attractions available' : 'No attractions match your search'}
        </p>
      </div>
    );
  }

  return (
    <>
      <input
        type="text"
        placeholder="Search attractions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
      <div className="grid gap-4">
        {attractions.map((place) => (
          <div key={place.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{place.name}</h3>
              {place.rating && (
                <span className="text-sm font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                  ★ {place.rating}
                </span>
              )}
            </div>
            {place.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{place.description}</p>
            )}
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              {place.distance_km && <span>📍 {place.distance_km} km away</span>}
              {place.hours && <span>🕐 {place.hours}</span>}
              {place.admission && <span>💰 {place.admission}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FoodGuide({
  places,
  destinationName,
}: {
  places: any[];
  destinationName: string;
}) {
  const [search, setSearch] = useState('');

  const restaurants = places.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.cuisine?.toLowerCase().includes(search.toLowerCase());
    const isRestaurant = p.category === 'restaurant' || p.cuisine;
    return matchesSearch && isRestaurant;
  });

  if (restaurants.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          {places.length === 0 ? 'No restaurants available' : 'No restaurants match your search'}
        </p>
      </div>
    );
  }

  return (
    <>
      <input
        type="text"
        placeholder="Search by restaurant name or cuisine..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
      <div className="grid gap-4">
        {restaurants.map((place) => (
          <div key={place.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{place.name}</h3>
                {place.cuisine && <p className="text-sm text-gray-600 dark:text-gray-400">{place.cuisine}</p>}
              </div>
              {place.priceRange && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{place.priceRange}</span>
              )}
            </div>
            {place.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{place.description}</p>
            )}
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              {place.hours && <span>🕐 {place.hours}</span>}
              {place.address && <span>📍 {place.address}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TransitGuide({
  destination,
  destinationName,
}: {
  destination?: any;
  destinationName: string;
}) {
  const routes = destination?.transitRoutes || [];

  if (routes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No transit information available for {destinationName}.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {routes.map((route: any, idx: number) => (
        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="font-semibold text-gray-900 dark:text-white mb-2">
            {route.from} → {route.to}
          </div>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span>⏱️ {route.duration_min} min</span>
            <span>💶 €{route.cost_eur}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {route.modes?.map((mode: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                {mode}
              </span>
            ))}
          </div>
          {route.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{route.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function DayPlansGuide({
  destination,
  destinationName,
}: {
  destination?: any;
  destinationName: string;
}) {
  const dayPlans = destination?.dayPlans || [];

  if (dayPlans.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No day plans available for {destinationName}.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {dayPlans.map((plan: any, idx: number) => (
        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{plan.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{plan.duration} • Best for {plan.bestFor}</p>
            </div>
          </div>
          <div className="space-y-2">
            {plan.stops?.map((stop: any, i: number) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300 min-w-12">{stop.time}</div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{stop.name}</div>
                  <div className="text-gray-500 dark:text-gray-400">{stop.duration_min} min</div>
                </div>
              </div>
            ))}
          </div>
          {plan.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{plan.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
