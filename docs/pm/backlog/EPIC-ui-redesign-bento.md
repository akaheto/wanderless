# EPIC: Bento Box UI Redesign — Travel Dashboard Overhaul

**Status**: In progress  
**Scope**: Release 9 (Post-Release 8)  
**Priority**: Medium (visual enhancement, not blocking travel planning core)  
**Effort**: L (large, multi-phase visual rewrite)  
**Last updated**: 2026-08-12

## Progress

- [x] Phase 1 component library complete (Hero, Comparison)
- [x] Phase 2 component library complete (Timeline)
- [x] Phase 3 component library complete (Micro-discovery grid)
- [x] ADR 0018 (Bento grid layout decision)
- [ ] Phase 4 — Polish & accessibility
- [ ] Integration into trip/comparison pages
- [ ] Visual QA & responsive testing

## Problem

The current Travel Intelligence Hub UI is functional and information-dense, but visually sterile.
It prioritizes data presentation over experience. Users researching destinations and building
itineraries should feel the joy and adventure of travel, not the anxiety of a tax form.

## Solution

Redesign the entire trip workspace using a modern **Bento Box layout** — a cohesive grid of
cards (not a rigid table) with varying sizes, rounded corners, depth, and rich visual hierarchy.
This transforms sterile lists into an immersive, premium dashboard that makes complex data feel
navigable and inspiring.

## Core Redesigns (By Impact Priority)

### 1. Destination Explorer (Hero Card)
**Current**: List of destinations in a comparison table.  
**New**: Large hero card with:
- Full-bleed destination imagery (1.2x parallax on scroll)
- Floating cultural/vibe tags ("✨ Coastal", "🏔️ Alpine", "🎭 Cultural", "🍜 Foodie")
- Embedded smart search bar (destination lookup with instant category filtering)
- At-a-glance climate sparkline (temp trend across months)

### 2. Flight Itinerary Builder (Tall Timeline Card)
**Current**: Table of stops with night counts and crude transfer info.  
**New**: Beautiful vertical timeline:
- Each flight leg as a flowing segment (origin → destination, visually connected)
- Duration badges, cabin class micro-status (economy/business)
- Layover cards with location previews
- Drag-to-reorder support (desktop)
- Visual progress indicator for trip duration

### 3. Micro-Discovery Grid (Small Cards)
**Current**: Scattered throughout trip page; unclear priority.  
**New**: Intentional small-card grid:
- Weather trend card (7-day forecast sparkline for selected destination)
- Budget tracker card (estimated vs. booked, visual breakdown by category)
- Local highlights card (top 3 attractions/restaurants from Places)
- Events card (festivals/holidays in selected month)

### 4. Comparison Engine (Dashboard Grid)
**Current**: Floating point scores in a table (confusing hierarchy).  
**New**:
- Side-by-side destination cards (each destination as a card, not a row)
- Large score badge at top (with breakdown on hover/tap)
- Visual factor cards (climate, cost, accessibility, vibe match)
- Seasonal gate warning banner (if destination unsuitable, prominent red card)

## Design System Rules

**Grid & Spacing**:
- Bento grid: CSS Grid or Flex with explicit spans (e.g., `col-span-2` for hero, `col-span-1` for micros)
- Card padding: 24px (for large cards), 16px (for small cards)
- Gap between cards: 16px (consistent rhythm)

**Cards**:
- Border radius: 16–24px (friendly, not corporate)
- Depth: Subtle `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` or inner `border` with 1px light gray
- Background: Micro-gradients (e.g., `linear-gradient(135deg, #fafafa, #f5f5f5)`) or glassmorphism blur on image
- No flat white — use off-white (`#fafafa`) or luxury dark tints

**Typography**:
- Destination names: Bold 28–32px (Heading 1), dark ink
- Flight times: Mono 14px (Arial/Courier), gray-700, high legibility
- Airport codes: Bold uppercase, 12px, secondary color accent
- Tags: 12px, rounded pill shape, pastel background with dark text

**Color Palette**:
- Background: Off-white (`#fafafa`) or deep navy (`#0f172a`)
- Card BG: White/very light gray (theme-aware)
- Accent: Vibrant travel color (teal `#14b8a6`, amber `#f59e0b`, or brand-specific)
- Text hierarchy: Dark ink for primary (`#1f2937`), gray (`#6b7280`) for secondary
- Status badges: Green (confirmed), Yellow (tentative), Gray (cancelled)

**Imagery & Gradients**:
- Every destination card must have a hero image (full-bleed, 1.5–2:1 aspect)
- Images should have a subtle gradient overlay (`rgba(0,0,0,0.2)`) to keep text readable
- Fallback: Gradient from brand color to lighter shade (e.g., teal → light teal)

## Tech Stack Constraints

- **Framework**: Next.js App Router (existing)
- **Styling**: Tailwind v4 (existing, no new CSS framework)
- **Components**: React + TypeScript (existing)
- **State**: React hooks (`useTransition`, `useState`) — no new state library
- **Icons**: Emoji or inline SVG only — no new icon library

## Acceptance Criteria

- [ ] Destination Explorer hero card renders with imagery and smart search
- [ ] Flight Itinerary timeline displays all stops with drag-to-reorder on desktop
- [ ] Micro-discovery cards (weather, budget, events, highlights) grid together
- [ ] Comparison engine shows side-by-side destination cards with visual factor breakdown
- [ ] All existing core actions (add stop, change date, compare, book) still work
- [ ] Responsive on mobile (cards stack in single column, full-bleed images)
- [ ] No new npm dependencies (Tailwind only)
- [ ] Type-safe: `npm run type-check` passes
- [ ] Visual QA: Design team reviews mockups against Figma (if available) or reference images

## Implementation Strategy

**Phase 1 — Hero & Comparison** (2–3 days)
- Build destination explorer card with imagery + tags + search
- Redesign comparison panel as side-by-side cards with visual factor breakdown

**Phase 2 — Itinerary Timeline** (2–3 days)
- Rewrite ItineraryPanel as vertical timeline
- Add drag-to-reorder for desktop
- Style flight leg cards with duration badges, cabin class

**Phase 3 — Micro Cards & Integration** (1–2 days)
- Build weather, budget, events, highlights micro-card components
- Grid them alongside main trip workspace
- Responsive layout for mobile

**Phase 4 — Polish & Accessibility** (1 day)
- Dark mode support (CSS variables, `prefers-color-scheme`)
- Keyboard navigation for all interactive elements
- Lighthouse audit (Accessibility, Performance, SEO)
- Mobile responsiveness testing

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing trip workflows | Wrap redesign in feature flag or separate page route (`/trips/[id]/dashboard` vs current `/trips/[id]`); test exhaustively before swapping |
| Imagery loading slowly | Use Next.js `<Image>` component with `priority` prop for hero, `loading="lazy"` for others; CDN-hosted images |
| Responsive complexity | Mobile-first Tailwind breakpoints; test on real devices (iPhone 12 mini, iPad, desktop) |
| Accessibility regression | WCAG 2.1 AA audit; semantic HTML; color contrast checker (no pure gray on white); keyboard-navigable grid |

## Dependencies

- Requires: None — uses existing Next.js + Tailwind
- Blocked by: None
- Related: [[project_investment_dashboard]] (if shared design system desired)

## Success Metrics

- User engagement time on trip workspace increases 20%+ (via analytics)
- Bounce rate on destination research decreases (users stay longer)
- Mobile session duration matches or exceeds desktop (currently lags)
- No regression in existing trip planning actions (create, edit, delete stop/booking/event)

## Related Stories

- STORY-destination-explorer.md ✅ (detailed hero card spec — created 2026-08-12)
- STORY-flight-itinerary-timeline.md ✅ (detailed timeline interaction spec — created 2026-08-12)
- STORY-micro-discovery-cards.md ✅ (weather, budget, events card specs — created 2026-08-12)
- STORY-comparison-engine-redesign.md ✅ (side-by-side destination cards — created 2026-08-12)

## Implementation Readiness

All four story specs are complete with:
- Detailed acceptance criteria
- Visual design specifications (colors, typography, spacing)
- Component prop interfaces and TypeScript types
- Interaction patterns (desktop/mobile/dark mode)
- Testing checklists
- Dependencies and notes

Ready to begin Phase 1 (Hero & Comparison) as soon as prioritized.
