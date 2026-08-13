# STORY: Comparison Engine Redesign (Side-by-Side Destination Cards)

**Epic**: EPIC-ui-redesign-bento.md  
**Phase**: 1 — Hero & Comparison  
**Effort**: L (large)  
**Priority**: P1 (core decision engine)

## Acceptance Criteria

- [x] Comparison displays as side-by-side destination cards (not rows in a table)
- [x] Each card shows:
  - Destination image (hero, 200×120px)
  - Destination name (24px bold)
  - Overall score badge (large, 48px, centered top-right)
  - Score breakdown on hover/tap (modal or expandable)
  - 5–7 visual factor cards (Climate, Cost, Experience, etc.)
  - Seasonal gate warning banner (red, if unsuitable)
  - Comparison preference badges (distance, price filter, etc.)
- [x] Factor cards display as mini cards with:
  - Factor name (12px bold)
  - Score (14px, color-coded: green=good, yellow=okay, red=poor)
  - Brief explanation (10px gray, max 2 lines)
- [x] Seasonal gate banner (if triggered):
  - Large red/warning background
  - Icon: ⚠️
  - Text: "Poor rating in March (only 1.5/5). Consider different dates."
- [x] Sort buttons: "Rank by Score", "Rank by Cost", "Rank by Vibe"
- [x] Mobile: Cards stack vertically, full-width; factor cards wrap
- [x] Dark mode: Colors adapt, contrast maintained
- [x] Preferences persist in URL (existing behavior preserved)
- [x] Type-check and tests pass

## Component Locations

1. `src/components/ComparisonGrid.tsx` (container, replaces existing comparison panel)
2. `src/components/DestinationComparisonCard.tsx` (individual card)
3. `src/components/FactorCard.tsx` (mini factor display)
4. `src/components/SeasonalGateBanner.tsx` (warning, reusable)

## Props Interfaces

### ComparisonGrid

```typescript
interface ComparisonGridProps {
  destinations: DestinationWithScore[];
  preferences: ComparisonPreferences;
  onPreferenceChange: (key: string, value: any) => void;
  onSort: (sortBy: "score" | "cost" | "vibe") => void;
}

interface DestinationWithScore {
  destination: Destination;
  score: number; // 0-100
  scoreBreakdown: Record<string, { score: number; weight: number }>;
  seasonalGate: number;
  factors: Factor[];
}

interface Factor {
  name: string;
  score: number;
  weight: number;
  explanation: string; // Max 2 sentences
  category: string; // "climate", "cost", "experience", etc.
}
```

**Layout**:
- Desktop: 2–3 cards per row (CSS Grid with auto-fit)
- Tablet: 2 cards per row
- Mobile: 1 card per row (full-width)

**Sort Controls** (top of grid):
- Buttons: "Score ⬇️", "Cost ⬆️", "Vibe ⬇️"
- Active button highlighted (teal background)

### DestinationComparisonCard

```typescript
interface DestinationComparisonCardProps {
  destination: Destination;
  score: number;
  scoreBreakdown: Record<string, { score: number; weight: number }>;
  factors: Factor[];
  seasonalGate?: number;
  isSelected?: boolean;
  onSelect?: (destinationId: string) => void;
}
```

**Visual**:
- Width: 280px (desktop), 100% (mobile)
- Height: auto (flex to content)
- Padding: 0 (hero image bleeds)
- Border radius: 16px (top 16px, bottom 16px)
- Shadow: `0 2px 8px rgba(0,0,0,0.12)` (more prominent)
- Border: 2px solid accent (teal) if selected, transparent otherwise

**Content**:
1. Hero image (full-bleed, 200×120px, gradient overlay)
2. Score badge (circle, 48px, centered over image top-right)
   - Background: Green (`#10b981`) if score ≥ 75, yellow (`#f59e0b`) if ≥ 50, red (`#ef4444`) if < 50
   - Text: white, 18px bold
   - Shadow: subtle drop shadow for legibility
3. Destination name (24px bold, dark ink, 16px bottom margin)
4. Seasonal gate banner (if triggered, see below)
5. Factor cards grid (2 columns, 16px gap)
6. "View in catalog" link (14px teal, bottom-right)

### FactorCard (Mini)

```typescript
interface FactorCardProps {
  name: string;
  score: number;
  weight: number;
  explanation: string;
  category: string;
}
```

**Visual**:
- Width: 120px (in 2-col grid within destination card)
- Padding: 8px
- Background: Very light gray / very dark gray
- Border: 1px light border
- Border radius: 8px

**Content**:
- Icon: Emoji based on category (🌤️ climate, 💰 cost, ⭐ experience, etc.)
- Name: 12px bold
- Score: 14px, color-coded
  - Green: ≥ 75
  - Yellow: 50–74
  - Orange: 25–49
  - Red: < 25
- Explanation: 10px gray, max 2 lines (ellipsis overflow)

### SeasonalGateBanner (Reusable)

```typescript
interface SeasonalGateBannerProps {
  destination: Destination;
  month: number; // 1-12
  currentRating: number;
  gate: number; // The seasonal gate multiplier
}
```

**Visual**:
- Full-width within card
- Background: Red (`#fee2e2`)
- Border-left: 4px solid red (`#ef4444`)
- Padding: 12px
- Margin-bottom: 16px
- Icon: ⚠️ (20px, left-aligned)
- Text: "Poor suitability in [Month] ([rating]/5). Consider different dates." (14px, dark red)

## Interaction

**Card Selection**:
- Click card → Toggle selection (border highlight)
- Multiple selection allowed (checkboxes or multi-select)
- Selected cards pin to top (sticky behavior on desktop)

**Score Hover/Tap**:
- Click score badge → Expand modal showing full factor breakdown
- Modal shows all factors with detailed explanations and weights
- Close with X button or outside click

**Sort Buttons**:
- Click → Re-sort grid, preserve selection
- Animated transition (fade or slide)

**Factor Hover**:
- Show tooltip with full explanation (on desktop only)
- Mobile: Tap to expand inline

**View Link**:
- Navigate to `/destinations/[id]` (destination detail page)

## Visual Specs

**Color Scale** (Score):
```
90–100: Deep green (#059669)
75–89:  Light green (#10b981)
50–74:  Amber (#f59e0b)
25–49:  Orange (#f97316)
0–24:   Red (#ef4444)
```

**Typography**:
- Destination name: 24px, `font-bold`, dark ink
- Score: 18px, `font-bold`, white text in badge
- Factor name: 12px, `font-bold`, dark ink
- Factor score: 14px, color-coded
- Explanation: 10px, gray, line-height 1.3

**Spacing** (Bento rhythm):
- Gap between cards: 16px
- Padding in card: 0 (hero bleeds), 16px (content area)
- Margin-bottom (content sections): 12px

## Testing

- [ ] Grid renders N destinations as cards (not rows)
- [ ] Score badges display and color-code correctly
- [ ] Factor cards grid within each destination card (2 cols)
- [ ] Seasonal gate banner displays when appropriate
- [ ] Sort buttons re-order cards (verify score/cost sorting logic)
- [ ] Selection state persists across re-sorts
- [ ] Responsive layout: 1 col (mobile), 2 col (tablet), 3 col (desktop)
- [ ] Dark mode: Colors switch, contrast maintained
- [ ] No regression in existing comparison actions

## Dependencies

- Requires: Existing `src/lib/scoring/engine.ts` (no changes)
- Requires: Factor data from scoring engine
- Blocked by: None (replaces current ComparisonPanel, existing logic preserved)

## Notes

- **Image loading**: Use Next.js `<Image>` component with `loading="lazy"`
- **Fallback image**: If no image available, use gradient based on destination theme color
- **Performance**: Memoize DestinationComparisonCard to avoid re-renders on sort
- **A11y**: All interactive elements keyboard-navigable; focus indicators visible; color not sole indicator of score (shape + number also matter)

## Future Enhancements

- Drag-to-reorder ranking (custom sort)
- Share comparison link (via comparison URL params)
- Comparison history (saved comparisons)
- AI-powered "best for you" recommendation based on preferences
- Price predictions (if booking integration added)
