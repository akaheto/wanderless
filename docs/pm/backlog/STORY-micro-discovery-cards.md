# STORY: Micro-Discovery Cards Grid

**Epic**: EPIC-ui-redesign-bento.md  
**Phase**: 3 — Micro Cards & Integration  
**Effort**: M (medium)  
**Priority**: P2 (enhancement, not blocking core flows)

## Acceptance Criteria

- [x] Weather card displays 7-day forecast sparkline for selected destination
- [x] Budget card shows estimated vs booked with visual breakdown by category
- [x] Events card lists festivals/holidays in selected month (with dates)
- [x] Highlights card shows top 3 attractions/restaurants from Places (with ratings)
- [x] Cards grid in 2×2 or flexible layout (Bento-style col-span)
- [x] Each card is 160×140px (small, but readable)
- [x] Card background: Off-white with subtle shadow
- [x] Typography: 14px for title, 12px for content
- [x] Icons: Emoji only (no new icon library)
- [x] Mobile: Cards stack single column, full width
- [x] Dark mode: Colors adjust, contrast maintained
- [x] Empty states: "No data yet" messages with soft styling
- [x] Type-check and tests pass

## Component Locations

1. `src/components/MicroCards/WeatherCard.tsx`
2. `src/components/MicroCards/BudgetCard.tsx`
3. `src/components/MicroCards/EventsCard.tsx`
4. `src/components/MicroCards/HighlightsCard.tsx`
5. `src/components/MicroDiscoveryGrid.tsx` (container, orchestrates the 4 cards)

## Props Interfaces

### WeatherCard

```typescript
interface WeatherCardProps {
  destination: Destination;
  forecastData?: ForecastDay[]; // 7-day forecast
  selectedMonth?: number;
}

interface ForecastDay {
  date: string;
  highTemp: number;
  lowTemp: number;
  condition: "sunny" | "cloudy" | "rainy" | "stormy";
}
```

**Visual**:
- Title: "🌤️ Forecast"
- Sparkline: 7 dots, color-coded by condition (green=sunny, gray=cloudy, blue=rainy)
- Subtitle: "7-day high/low range" (e.g., "68–75°F")

### BudgetCard

```typescript
interface BudgetCardProps {
  tripId: number;
  currency: string;
  totals: BudgetTotals; // From src/lib/money/budget.ts
  byCategory: Record<string, Money>; // Estimated totals per category
}
```

**Visual**:
- Title: "💰 Budget"
- Pie chart (mini, 60×60px) showing category breakdown
- Total: "Estimated $3,500" (currency-aware)
- Subtitle: "Flights 45%, Hotels 35%, Food 20%"

### EventsCard

```typescript
interface EventsCardProps {
  tripId: number;
  events: Event[];
  selectedMonth: number; // 1-12
}

interface Event {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  kind: "constraint" | "opportunity";
}
```

**Visual**:
- Title: "🎉 Events"
- List of 2–3 upcoming events (truncated with "... +2 more" if more)
- Format: "Label • Aug 15"
- Icon: 🚫 for constraint, ✨ for opportunity

### HighlightsCard

```typescript
interface HighlightsCardProps {
  destinationId: string;
  places?: Place[]; // Top 3 by rating/verification
  tripId?: number;
}

interface Place {
  id: string;
  name: string;
  category: string;
  rating: number; // 1-5
  verificationDate: string;
}
```

**Visual**:
- Title: "⭐ Highlights"
- List of 3 places: "Name • Category • ★★★★★"
- Truncated names if too long
- Link: "View all N places"

### MicroDiscoveryGrid (Container)

```typescript
interface MicroDiscoveryGridProps {
  trip: Trip;
  forecastData?: ForecastDay[];
  events: Event[];
  places: Place[];
  byCategory: Record<string, Money>;
}
```

**Layout**:
- Desktop: 2×2 grid (4 cards in bento layout)
  ```
  ┌──────────────┬──────────────┐
  │  Weather     │  Budget      │
  ├──────────────┼──────────────┤
  │  Events      │  Highlights  │
  └──────────────┴──────────────┘
  ```
- Tablet: 2 columns (Weather, Budget on top; Events, Highlights below)
- Mobile: 1 column (all stack vertically, full width)

**Grid CSS**:
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
gap: 16px;
```

## Visual Specs (All Cards)

**Card Styling**:
- Width: 160px (desktop), 100% (mobile)
- Height: 140px
- Padding: 12px
- Border radius: 12px
- Background: `#fafafa` (light) / `#1f2937` (dark)
- Shadow: `0 1px 2px rgba(0,0,0,0.05)`
- Border: 1px solid `#e5e7eb` (light) / `#374151` (dark)

**Typography**:
- Title: 14px bold, accent color (teal)
- Content: 12px gray, line-height 1.4
- Emoji: 16px, placed left of title

**Empty State**:
- Text: "No data yet" (12px gray, italic)
- Soft styling, not alarming

## Interaction

**Hover** (desktop):
- Subtle scale-up (transform: scale(1.02))
- Shadow deepens slightly

**Tap** (mobile):
- Expand card or link to detail view (parent decision)
- No hover effects (touch-only)

**Links**:
- "View all N places" → Navigate to `/trips/[id]/places`
- Click-through tracked for engagement metrics

## Testing

- [ ] All 4 cards render with mock data
- [ ] Grid layout respects column spans (2×2 on desktop, 1 on mobile)
- [ ] Empty states display when data is missing
- [ ] Dark mode: Colors switch, contrast maintained (≥4.5:1)
- [ ] Responsive breakpoints: 1 col (mobile), 2 col (tablet), 4 col (desktop)
- [ ] Links navigate correctly
- [ ] No text overflow; long names truncate with ellipsis

## Dependencies

- Requires: `BudgetTotals`, `Money` types from `src/lib/money/budget.ts`
- Requires: `ForecastDay` type (or mock for now)
- Requires: `Place`, `Event` types from trip data

## Notes

- **Mini pie chart**: Reuse `src/components/charts.tsx` SVG if available; else use simple HTML/CSS donut
- **Empty states**: Show placeholder cards, not hidden (better layout stability)
- **Performance**: Memoize individual card components to avoid re-renders
- **A11y**: All text readable; icons have aria-labels if needed

## Future Enhancements

- Real-time flight price updates in Budget card
- "Popular times" heatmap in Highlights
- Sync events with calendar (iCal export)
- Personalized AI recommendations based on preferences
