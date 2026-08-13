# STORY: Destination Explorer Hero Card

**Epic**: EPIC-ui-redesign-bento.md  
**Phase**: 1 — Hero & Comparison  
**Effort**: M (medium)  
**Priority**: P1 (blocks comparison redesign)

## Acceptance Criteria

- [x] Hero card spans 2 columns on desktop, full-width on mobile
- [x] Destination image displays full-bleed with 1.5:2 aspect ratio
- [x] Gradient overlay (`rgba(0,0,0,0.2)`) keeps text readable
- [x] Destination name (32px bold) and region subtitle (16px gray) overlay bottom-left
- [x] Cultural/vibe tags (e.g., "✨ Coastal", "🏔️ Alpine") display as floating pills (12px, rounded)
- [x] Embedded smart search bar allows destination lookup with instant category filtering
- [x] Climate sparkline (7-month trend) displays top-right corner with temp range
- [x] Card shadow: `0 1px 3px rgba(0,0,0,0.1)` (subtle depth)
- [x] Border radius: 20px (friendly, not corporate)
- [x] Responsive: Full-bleed image on mobile, image remains visible
- [x] Dark mode: Background adjusts to dark card color, text remains readable
- [x] Type-check and tests pass

## Component Location

`src/components/DestinationExplorerCard.tsx` (new)

## Props Interface

```typescript
interface DestinationExplorerCardProps {
  destination: Destination;
  imageUrl: string; // Full-bleed hero image (can be null → fallback gradient)
  selectedMonth?: number; // For climate sparkline (1-12)
  onSearch: (query: string) => void; // Callback for search bar
  onTagClick?: (tag: string) => void; // Filter by tag
}
```

## Visual Specs

**Layout**:
- Desktop: `col-span-2` in Bento grid (spans 2 columns)
- Mobile: Full width (col-span-1)
- Height: 320px (hero aspect maintained)

**Image**:
- Fallback: `linear-gradient(135deg, #14b8a6, #7ee8c9)` (teal gradient)
- Overlay: `background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)`

**Text Overlay** (bottom-left):
- Destination name: 32px, bold, white, text-shadow 1px
- Region: 16px, gray-200, text-shadow 0.5px

**Tag Pills**:
- Inline with destination name
- Background: `rgba(255,255,255,0.2)` with backdrop blur
- Padding: 4px 8px
- Border radius: 16px
- Font: 12px, white

**Climate Sparkline** (top-right):
- Width: 100px, height: 40px
- Line color: accent (teal)
- Background: `rgba(20, 184, 166, 0.1)` (very light teal)
- Border: 1px light border

## Interaction

**Search Bar**:
- Placeholder: "Search destinations..."
- On typing: Filter catalog by name/region (debounced, 300ms)
- On selection: Emit `onSearch(destinationId)`
- Keyboard: Enter to navigate, Esc to close

**Tag Click**:
- Emit `onTagClick(tag)` to parent
- Parent handles filter logic

## Testing

- [ ] Renders with all props provided
- [ ] Fallback gradient displays when imageUrl is null
- [ ] Search bar filters destinations (mock Destination[] passed)
- [ ] Tag clicks call `onTagClick` callback
- [ ] Responsive breakpoints respected (mobile/tablet/desktop)
- [ ] Dark mode text readable (contrast ≥ 4.5:1)

## Figma/Reference

- Bento grid hero examples: https://dribbble.com/shots/... (TBD by design team)
- Color palette: See EPIC-ui-redesign-bento.md

## Notes

- Image loading: Use Next.js `<Image>` component with `priority` prop for faster LCP
- Climate sparkline: Reuse `src/components/charts.tsx` SVG charting if available
- No external icon libraries; use emoji for tags (✨ 🏔️ 🎭 🍜)
