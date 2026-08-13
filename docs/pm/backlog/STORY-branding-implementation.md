# Story: Implement rebranding across the application

- **Epic**: Visual identity redesign
- **Status**: planned
- **Size**: L
- **Scope**: frontend | branding

## User story
As a product owner, I want the new brand identity rolled out consistently across the entire application so users see a cohesive, engaging, professional experience.

## Acceptance criteria

**Design System Integration:**
- [ ] Tailwind config updated with new color palette
- [ ] CSS custom properties defined for all brand colors
- [ ] Dark mode variables created and tested
- [ ] Global styles updated (backgrounds, text colors, borders)
- [ ] Accessibility tested (all contrast ratios met)

**Logo & Favicon Updates:**
- [ ] Logo component created (SVG, responsive)
- [ ] Favicon updated across all devices (16x16, 32x32, 180x180)
- [ ] App header uses new logo
- [ ] Favicon appears in browser tabs
- [ ] Social share preview images updated

**Component Updates (High Priority):**
- [ ] Buttons: New colors, improved hover states
- [ ] Cards: Updated shadows, new background color
- [ ] Inputs/Forms: Consistent with new palette
- [ ] Navigation: New header design with logo
- [ ] Badges/Tags: New semantic colors
- [ ] Modals: Travel-themed backgrounds

**Page Hero Images & Illustrations:**
- [ ] Landing page: Hero image + pattern overlay
- [ ] Signup page: Inspiring travel imagery
- [ ] Login page: Subtle travel theme
- [ ] Trips overview: Hero section with map pattern
- [ ] Destinations catalog: High-quality destination photos
- [ ] Empty states: Custom illustrations (no trips, no results, etc.)

**Patterns & Textures:**
- [ ] Subtle background patterns applied
  - Home page: Map grid watermark (10% opacity)
  - Card backgrounds: Linen texture overlay
  - Dividers: Compass rose pattern
  - Accents: Passport stamp decorations
- [ ] All patterns use new color palette
- [ ] Performance impact minimal (SVG or CSS patterns)

**Navigation & Layout Updates:**
- [ ] Header redesigned
  - New logo placement and sizing
  - Updated navigation menu styling
  - Improved mobile navigation
  - Sticky header with new brand colors
- [ ] Sidebar (if exists): Updated with new palette
- [ ] Footer: New logo, updated colors
- [ ] Breadcrumbs: Branded with new colors

**Content Updates:**
- [ ] Page titles/headings: Use Playfair Display typography
- [ ] Body text: Consistent Inter typography
- [ ] Data displays: Courier Prime for monospace data
- [ ] Accent text: Use new accent colors strategically

**Specific Page Implementations:**

**Home/Dashboard:**
- [ ] Hero section with travel imagery
- [ ] Welcome message in new typography
- [ ] Call-to-action buttons in new colors
- [ ] Recent trips cards with improved design
- [ ] Statistics with colored badges

**Destinations Catalog:**
- [ ] Destination cards: Enhanced with imagery
- [ ] Seasonal indicators: Styled with new colors
- [ ] Badges: New color scheme for archetypes/ratings
- [ ] Filters: Redesigned UI with new palette
- [ ] Map overlay: Travel-themed patterns

**Trip Pages:**
- [ ] Trip header: Destination photo + overlay
- [ ] Panels (budget, events, bookings): Updated styling
- [ ] Timeline/itinerary: Enhanced with new colors
- [ ] Status indicators: Semantic colors (success/warning)

**Comparison Page:**
- [ ] Destination cards: Travel-themed design
- [ ] Scoring visualization: New color palette
- [ ] Comparison table: Improved readability
- [ ] Export/share: Branded output

**Authentication Pages:**
- [ ] Login page: Subtle travel theme
- [ ] Signup page: Inspiring imagery
- [ ] Email verification: Branded confirmation
- [ ] Error states: New error color scheme

**Admin Pages:**
- [ ] Admin dashboard: Professional, data-focused
- [ ] Audit logs: Improved readability
- [ ] User management: Clear visual hierarchy
- [ ] Charts/graphs: New color palette

**Dark Mode Implementation:**
- [ ] All pages tested in dark mode
- [ ] Dark mode colors documented and applied
- [ ] Images tested for visibility in dark mode
- [ ] Contrast ratios verified (WCAG AAA)
- [ ] Pattern overlays adjusted for dark mode
- [ ] No forced light-only assets

**Performance Optimization:**
- [ ] Images optimized (compressed, responsive)
- [ ] Patterns use efficient CSS/SVG (not large image files)
- [ ] Page load time < 3 seconds (before: __, after: __)
- [ ] Lighthouse score maintained or improved
- [ ] Large images lazy-loaded where appropriate

**Browser & Device Testing:**
- [ ] Desktop (Chrome, Firefox, Safari, Edge)
- [ ] Mobile (iOS Safari, Chrome Android)
- [ ] Tablets (iPad, Android tablets)
- [ ] Dark mode tested on all platforms
- [ ] Print styles updated with new branding

**Documentation & Handoff:**
- [ ] Brand guidelines document published
- [ ] Component library documented
- [ ] Color palette reference created
- [ ] Icon usage guide provided
- [ ] Designer/developer communication established

**Quality Assurance:**
- [ ] Visual regression testing (screenshots before/after)
- [ ] A/B test new design (if possible)
- [ ] User feedback survey (optional)
- [ ] Analytics tracking for engagement changes
- [ ] No broken links or missing images

## Implementation Approach

**Phased rollout by page priority:**

**Phase 1 (Week 1):**
- Design system integration (colors, typography)
- Header/navigation redesign
- Buttons and core components
- Dark mode setup

**Phase 2 (Week 2):**
- Homepage and dashboard
- Authentication pages
- Destinations catalog
- Imagery and patterns

**Phase 3 (Week 3):**
- Trip pages and details
- Comparison page
- Admin pages
- Final refinements

**Testing throughout each phase**

## Notes

**Measurement:**
- Engagement metrics before/after
- Average session duration
- Page scroll depth (more images = more scrolling?)
- Click-through rates on CTAs
- User retention (weekly, monthly)
- Design/branding satisfaction survey

**Rollback plan:**
- Git branch for rebranding work
- Tag final commit for easy rollback
- Keep old color/style variables as fallback
- Monitor error rates post-launch

**Future enhancements:**
- Animated logo (Phase 2)
- Brand mascot (Phase 2)
- More illustration scenes (ongoing)
- Photography collection expansion (ongoing)

## Dependencies
- Design system finalized (STORY-visual-design.md)
- Brand name and logo approved (STORY-brand-naming.md)
- Images and illustrations sourced
- CSS preprocessor capability
- Design tokens exported
- Browser compatibility list

## Timeline
- 2-3 weeks for full implementation
- 1 week for refinement and QA
- Parallel: Gather user feedback
