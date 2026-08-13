# Story: Visual design system and brand imagery

- **Epic**: Visual identity redesign
- **Status**: planned
- **Size**: L
- **Scope**: design

## User story
As a designer, I want to create a cohesive visual design system that transforms the sterile interface into an engaging, travel-themed experience with personality and visual hierarchy.

## Acceptance criteria

**Design System in Figma:**
- [ ] Color palette created and documented
  - Primary colors (warm sunset palette)
  - Secondary colors (supporting tones)
  - Semantic colors (success, error, warning, info)
  - Dark mode variants validated for WCAG AA+
  - Hex codes, RGB, HSL values documented
- [ ] Typography system
  - Playfair Display (headings) - styles (h1-h6)
  - Inter (body text) - regular, medium, semibold
  - Courier Prime (accents) - monospace for data
  - Font sizes, line heights, letter spacing documented
- [ ] Component library
  - Buttons (primary, secondary, ghost, danger)
  - Input fields with new color scheme
  - Cards with new backgrounds and shadows
  - Modal dialogs with travel imagery
  - Navigation bars with new palette
  - Status badges and tags

**Logo & Icon System:**
- [ ] Logo design (3+ concepts presented)
  - Primary lockup (logo + text)
  - Logo mark (icon-only version)
  - Clear space, minimum sizes documented
  - Usage guidelines (dos and don'ts)
- [ ] Favicon created (multiple sizes: 16x16, 32x32, 180x180)
- [ ] Travel icon set (20+ icons)
  - Plane, compass, map, passport, destination pins
  - Accommodation, food, activities
  - Weather, transportation, documents
  - Drawn in consistent style
  - SVG + PNG formats

**Imagery & Patterns:**
- [ ] Travel photography style guide
  - Curated destinations (Europe, Asia, Americas, Africa)
  - Lifestyle shots (local culture, food, experiences)
  - Landmark photography (iconic destinations)
  - 50+ images sourced or licensed
  - Image usage guidelines (aspect ratios, overlays)
- [ ] Illustrated scenes
  - Empty states (no trips, no results, no bookmarks)
  - Onboarding illustrations (5 scenes)
  - Travel diary aesthetic illustrations
  - SVG format for scalability
- [ ] Pattern library
  - Map grid overlay (subtle)
  - Passport stamp pattern
  - Compass rose pattern
  - Textile/linen texture
  - Usage: subtle backgrounds, watermarks

**Brand Colors Deep Dive:**

**Primary Palette:**
- Sunset Orange #FF6B35 (actions, highlights, CTAs)
- Deep Teal #004E89 (trust, status, important info)
- Cream #FFF8E7 (backgrounds, readability)

**Extended Palette:**
- Sand #E8D5C4 (secondary backgrounds)
- Forest Green #2D6A4F (success, positive actions)
- Sky Blue #87CEEB (info, secondary accent)
- Charcoal #2B3E50 (text, serious info)
- Light Gray #F5F5F5 (hover states, dividers)

**Dark Mode:**
- Dark Base #1A1A2E (backgrounds)
- Dark Surface #16213E (cards, elevated)
- Accent Teal #00D9FF (adjusted for contrast)
- Accent Orange #FF8C42 (lighter for visibility)
- Text #E0E0E0 (primary text, WCAG AAA)

**Accessibility:**
- [ ] All colors tested for WCAG AA contrast (4.5:1 for text)
- [ ] All colors tested for WCAG AAA contrast (7:1 ideal)
- [ ] No information conveyed by color alone
- [ ] Colorblind-safe palette validation
- [ ] Dark mode contrast tested

**Documentation:**
- [ ] Brand guidelines document (Figma or PDF)
  - When to use each color
  - Typography hierarchy
  - Spacing and layout rules
  - Component usage examples
  - Do's and don'ts
  - Common patterns

**Design Deliverables:**
- [ ] Figma design file shared with team
- [ ] Component library exported as design tokens
- [ ] CSS variables generated from design system
- [ ] Example page designs (5 key pages)
- [ ] Dark mode variants for all components
- [ ] Mobile responsive considerations documented

## Notes

**Image sourcing options:**
- Unsplash / Pexels (free, CC0)
- iStock / Shutterstock (paid, premium)
- Local photographer (unique, branded)
- AI generation (Midjourney, Stability AI) for specific scenes

**Icon design approach:**
- Hand-drawn for personality
- Stroke width: 2px for consistency
- Minimal 24x24px clear space
- Scalable from 16px to 64px

**Typography rationale:**
- Playfair Display: editorial, luxury travel magazines
- Inter: modern, accessible, excellent readability
- Courier Prime: travel journal aesthetic, monospace data

**Color psychology:**
- Orange: energy, adventure, exploration
- Teal: trust, depth, sophistication, ocean
- Cream: warmth, hospitality, approachability
- Green: growth, sustainability, exploration
- Blue: sky, freedom, wanderlust

**Implementation strategy:**
- Export as CSS custom properties (--color-primary, etc.)
- Create Tailwind config override for colors
- Component library mirrors Figma designs
- Document pixel-perfect specs

## Dependencies
- Design tools (Figma, Illustrator, or similar)
- Design resources (photographer, illustrator)
- Image licensing budget
- Icon design capability
- CSS preprocessor setup (if using design tokens)

## Timeline
- Week 1: Color palette finalization, typography selection
- Week 2-3: Logo design (concepts + feedback)
- Week 3-4: Icon set creation
- Week 4-5: Image sourcing and pattern creation
- Week 5-6: Figma design system build-out
- Week 6: Documentation and team review
