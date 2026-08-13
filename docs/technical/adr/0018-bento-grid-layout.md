# ADR 0018: Bento Box Grid Layout for UI Redesign

**Date**: 2026-08-12  
**Status**: Accepted  
**Context**: Release 9 requires a visual redesign to improve trip workspace experience beyond functional density. The current layout prioritizes data presentation over user joy.

## Problem

The current trip workspace is information-dense but visually sterile. Users researching destinations and building itineraries encounter a tax-form-like interface that conveys anxiety rather than adventure. Data presentation dominates; visual hierarchy is unclear. The grid of tables works for spreadsheets, not for travel planning.

## Decision

Adopt a **Bento Box grid layout system** for all primary UI surfaces (trip pages, comparison engine, dashboard), replacing rigid tables with a cohesive set of cards at varying sizes on a CSS Grid.

**Core design rules:**
- **Grid**: CSS Grid with explicit `col-span` values (hero spans 2 columns, micro cards span 1)
- **Cards**: 16–24px border radius, subtle shadows (`0 1px 3px rgba(0,0,0,0.1)`), off-white backgrounds
- **Gaps**: Consistent 16px rhythm between cards
- **Typography**: Clear hierarchy via scale (32px for destination names, 12px for metadata)
- **Color**: Soft, theme-aware backgrounds; accent teal for interactive elements
- **Imagery**: Full-bleed hero images with gradient overlays for all destination cards
- **Responsive**: Single-column mobile, multi-column desktop, no horizontal scroll

## Rationale

1. **User experience**: Cards are infinitely more approachable than rows in a table. They read as individual units, not spreadsheet cells. Varying sizes create visual interest and guide attention.

2. **Information hierarchy**: A hero card (Destination Explorer) centers the decision. Comparison cards sit beside each other (not rows), making tradeoffs visible. Micro cards (Weather, Budget, Events, Highlights) form a dashboard.

3. **Accessibility**: Larger touch targets, clearer focus states, color is never the sole indicator of status (shape + number + label also matter).

4. **Performance**: CSS Grid is native browser support, no new dependencies. Tailwind v4 provides utility classes; no custom CSS framework needed.

5. **Sustainability**: Bento layout is common enough in modern UIs that future maintainers will recognize the pattern instantly. No invented micro-syntax.

## Alternatives Considered

1. **Keep tables, add CSS styling** (rejected): Tables are semantic HTML for tabular data. Cards are not tabular; they are discrete entities. Forcing tables into cards creates accessibility confusion (screen readers announce row/column relationships that don't exist).

2. **Use a CSS grid framework** (e.g., Bootstrap) (rejected): Introduces dependency footprint. Tailwind v4 + CSS Grid natively accomplish the same goal with less overhead.

3. **Stick with current layout** (rejected): Does not address the core problem of emotional tone and visual clarity. Incremental tweaks would never achieve the intended shift.

## Implementation

**Component structure:**
- **DestinationExplorerCard**: Hero card, 2-col span, full-bleed image + vibe tags + search
- **ComparisonGrid**: Container orchestrating sort controls and destination cards
- **DestinationComparisonCard**: Individual destination, 1-col span, score badge + factor grid
- **FactorCard**: Mini factor display (Climate, Cost, Experience)
- **SeasonalGateBanner**: Warning for unsuitable seasonal ratings
- **ItineraryTimelinePanel**: Vertical timeline for stops (Phase 2)
- **MicroDiscoveryGrid**: 2×2 grid (Weather, Budget, Events, Highlights) (Phase 3)

**Responsive rules:**
- Mobile (`max-w-md`): 1 column, full-width cards, vertical stacking
- Tablet (`md:`): 2 columns, hero spans both
- Desktop (`lg:`): 3 columns, hero spans 2, flexible wrapping

**Dark mode:** Colors adapt via Tailwind's `dark:` prefix; `@media (prefers-color-scheme: dark)` not needed for utilities.

## Consequences

**Positive:**
- Visual uplift without new frameworks or libraries
- Clearer information hierarchy
- Better mobile-first responsive design
- Easier to add new card types in future
- Reduced cognitive load for users

**Negative:**
- Requires rewriting several major pages (trip, comparison)
- Legacy tables no longer used; code cleanup opportunity (not burden)
- Some existing patterns (filters, search) need redesign to fit card paradigm

**Neutral:**
- CSS Grid support is near-universal; no polyfills needed
- Performance is identical to previous layout (actually slightly faster: fewer DOM nodes per card)

## Related

- [EPIC-ui-redesign-bento.md](../../../docs/pm/backlog/EPIC-ui-redesign-bento.md) — Full design spec
- [STORY-destination-explorer.md](../../../docs/pm/backlog/STORY-destination-explorer.md) — Hero card spec
- [STORY-comparison-engine-redesign.md](../../../docs/pm/backlog/STORY-comparison-engine-redesign.md) — Comparison grid spec
- [STORY-flight-itinerary-timeline.md](../../../docs/pm/backlog/STORY-flight-itinerary-timeline.md) — Timeline spec
- [STORY-micro-discovery-cards.md](../../../docs/pm/backlog/STORY-micro-discovery-cards.md) — Micro cards spec
- ADR 0001: Three-Tier Data Model (relates to tier marks on cards)
- ADR 0008: Hand-Rolled SVG Charts (applies to chart components inside cards)
