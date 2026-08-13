# STORY: Flight Itinerary Timeline

**Epic**: EPIC-ui-redesign-bento.md  
**Phase**: 2 — Itinerary Timeline  
**Effort**: M (medium)  
**Priority**: P1 (core trip workspace)

## Acceptance Criteria

- [x] Timeline renders as vertical flowchart (not a table)
- [x] Each stop displays as a card with:
  - Destination name (20px bold)
  - Dates (14px gray)
  - Nights count (16px, secondary)
  - Airport code (12px mono, uppercase)
- [x] Flight leg between stops shows:
  - Arrow connecting stops
  - Duration badge (e.g., "4h 30m")
  - Cabin class indicator (🛫 economy / ✈️ business)
  - Layover cards (if applicable)
- [x] Desktop: Drag-to-reorder stops (visual feedback + animated reorder)
- [x] Mobile: Swipe or gesture support (or tap to expand reorder options)
- [x] Visual progress bar at top (e.g., "Day 5 of 14")
- [x] Edit/delete actions accessible on hover or tap (not hidden)
- [x] Responsive layout (timeline flows full-width on mobile)
- [x] Dark mode compatible
- [x] Type-check and tests pass

## Component Location

`src/components/ItineraryTimelinePanel.tsx` (replacing ItineraryPanel.tsx)

## Props Interface

```typescript
interface ItineraryTimelinePanelProps {
  trip: Trip;
  stops: Stop[];
  itinerary: Itinerary;
  tripStartDate: string; // YYYY-MM-DD
  tripEndDate: string;
  onUpdate: (stops: Stop[]) => void; // Called after reorder
  onEdit: (stopId: number) => void;
  onDelete: (stopId: number) => void;
}

interface Stop {
  id: number;
  position: number; // 0-based sequence
  destinationId: string;
  startDate: string;
  nights: number;
}
```

## Visual Specs

**Timeline Container**:
- Width: 100% (responsive)
- Left border: 3px solid accent (teal `#14b8a6`)
- Padding: 24px left, 16px right
- Background: subtle gradient or flat (theme-aware)

**Stop Card**:
- Width: 280px (desktop), 100% (mobile)
- Margin-bottom: 32px (spacing between stops)
- Padding: 20px
- Border radius: 16px
- Background: white/light gray (theme-aware)
- Shadow: `0 1px 3px rgba(0,0,0,0.1)`

**Stop Content**:
- Destination: 20px bold, dark ink
- Dates: 14px gray, "Aug 10–15, 2026"
- Nights: 16px, secondary accent, "5 nights"
- Airport code: 12px mono, uppercase, teal accent (e.g., "CDG")

**Flight Leg**:
- Vertical arrow between stops (SVG or CSS)
- Duration badge: "4h 30m" (14px mono, gray background)
- Cabin indicator: 📍 economy, ✈️ business (emoji, 12px)
- Layover card: If applicable, small card showing city + duration

**Progress Bar** (top of timeline):
- "Day X of Y" (e.g., "Day 5 of 14")
- Visual bar: `<div style="width: X%">` (responsive)
- Height: 4px
- Color: accent gradient (teal to blue)

**Actions** (on stop card):
- Edit button: pencil icon (16px, hover effect)
- Delete button: trash icon (16px, hover effect)
- On mobile: Tap to reveal actions, or swipe left to expose delete

## Interaction

**Desktop Reorder**:
- Drag stop card (cursor: grab)
- Drop zone highlights when hovering
- On drop: Call `onUpdate(reorderedStops)` with new position sequence
- Undo not required (server-side validation handles invalid states)

**Mobile Reorder**:
- Long-press to enter reorder mode
- Tap up/down arrows to move stop
- Confirm button to commit reorder

**Edit/Delete**:
- Edit button: Call `onEdit(stopId)` (parent handles modal or inline form)
- Delete button: Show confirmation toast/modal before calling `onDelete(stopId)`

## Testing

- [ ] Renders stops in correct order (position 0, 1, 2, ...)
- [ ] Flight leg arrow appears between consecutive stops
- [ ] Duration and cabin class display correctly
- [ ] Drag-to-reorder works on desktop (mock props, verify position sequence)
- [ ] Edit/delete callbacks fire on button click
- [ ] Responsive layout: stops stack single column on mobile
- [ ] Dark mode: Text readable, shadows visible
- [ ] No visual regression vs current ItineraryPanel

## Dependencies

- Requires: `src/components/ItineraryPanel.tsx` replacement
- Blocked by: None

## Notes

- Drag-and-drop: Use React's native draggable API or a lightweight library like `react-beautiful-dnd` (if approved; check constraints)
- For now, implement without drag if complexity is too high; prioritize mobile-friendly tap-to-reorder
- Timeline arrow: SVG `<line>` or CSS border trick (`border-left` of transparent parent)
- Accessibility: All interactive elements keyboard-navigable; focus indicators visible

## Future Enhancements

- Real-time flight data integration (price, seat availability)
- Cabin upgrade indicators
- Carbon footprint per leg
