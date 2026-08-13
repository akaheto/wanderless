# STORY: City Guides Tab (Things to Do, Food, Transit, Day Plans)

**Epic**: Release 10 (Offline Travel Companion)  
**Phase**: 3 — Content & UX  
**Effort**: L (large)  
**Priority**: P2 (follows destination downloads)

## Acceptance Criteria

- [x] New "City Guides" tab on trip page (left sidebar, alongside Itinerary)
- [x] Four sections: Things to Do, Food & Drink, Getting Around, Day Plans
- [x] Sections read from cached destination data (if offline) or API (if online)
- [x] Things to Do: attractions with ratings, categories, distance
- [x] Food & Drink: restaurants sorted by category (family-friendly, scenic, etc.)
- [x] Getting Around: airport-to-city transit routes, taxi/rental info
- [x] Day Plans: 3-4 curated half/full-day itineraries (top spots, timing, route)
- [x] "Not downloaded" state: shows message + "Download destination to browse offline"
- [x] Search within guides (attractions by name, restaurants by cuisine)
- [x] Type-check and tests pass
- [x] Responsive on mobile

## Tab Location & Navigation

**Left Sidebar** (alongside Itinerary, Bookings, Budget):
```
📍 City Guides
├─ Things to Do
├─ Food & Drink
├─ Getting Around
└─ Day Plans
```

**Sections as Sub-Routes**:
- `/trips/[id]/guides?section=attractions`
- `/trips/[id]/guides?section=food`
- `/trips/[id]/guides?section=transit`
- `/trips/[id]/guides?section=day-plans`

## Data Structure (from cached destination)

**Things to Do**:
```typescript
interface Attraction {
  id: string;
  name: string;
  category: "museum" | "outdoor" | "landmark" | "cultural" | "entertainment";
  description: string;
  rating: number; // 1-5
  distance_km: number; // from city center
  hours: string; // "9 AM - 5 PM, closed Mondays"
  admission: string; // "Free" or "$15 per person"
}
```

**Food & Drink**:
```typescript
interface Restaurant {
  id: string;
  name: string;
  cuisine: string; // "French", "Vietnamese", etc.
  category: "family-friendly" | "scenic-views" | "romantic" | "casual";
  description: string;
  priceRange: "$" | "$$" | "$$$" | "$$$$";
  hours: string;
  address: string;
}
```

**Getting Around**:
```typescript
interface TransitRoute {
  from: string; // "CDG Airport"
  to: string; // "City Center"
  modes: ("metro" | "bus" | "train" | "taxi" | "rental")[];
  duration_min: number;
  cost_eur: number;
  description: string;
}
```

**Day Plans**:
```typescript
interface DayPlan {
  id: string;
  duration: "half-day" | "full-day";
  title: string; // "Museum & Café Tour"
  stops: {
    name: string;
    time: string; // "9:00 AM"
    duration_min: number;
  }[];
  description: string;
  bestFor: string; // "First-time visitors" or "Art lovers"
}
```

## Component Structure

**CityGuidesTab**:
- Selector: Things to Do | Food | Getting Around | Day Plans
- Sub-component for each section
- Search input (appears for Things to Do and Food)
- "Not downloaded" message if offline and no cached data

**AttractionCard**:
- Image (if available), name, rating (★★★★★), category badge
- Distance and hours
- Admission info
- Click to expand full description

**RestaurantCard**:
- Name, cuisine type, price range
- Category badges (family-friendly, scenic, etc.)
- Hours and address
- Reservation link (if available)

**TransitRouteCard**:
- From → To, duration, cost
- Pill badges for transport modes (🚇 Metro, 🚌 Bus, etc.)
- Expand for detailed description

**DayPlanCard**:
- Duration (half/full day), title, "Best for X"
- Timeline: 9:00 AM → Stop 1 (45 min) → Stop 2 (30 min)
- Expand for full description

## Search Implementation

- Filter attractions by name (substring match)
- Filter restaurants by cuisine or category
- No backend call; filter in-browser (all data already cached)

## Offline Behavior

**Online**: Fetch fresh data for selected destination, show real-time search
**Offline**: 
- If destination cached, show cached guides
- If not cached, show "Download destination to explore"
- Search still works on cached data

## Testing

- [ ] Tab navigation works and persists state
- [ ] All four sections render with sample data
- [ ] Search filters accurately
- [ ] Offline mode shows cached data (if exists)
- [ ] Offline mode shows "not downloaded" message (if not cached)
- [ ] Mobile layout responsive (sections stack)
- [ ] No layout shift when loading

## Notes

- Day plans are curated per destination (in destination data)
- Restaurant/attraction list sourced from places DB + curated notes
- Images optional (fallback to icon + name if missing)
- No booking integration yet (that's Release 11)
