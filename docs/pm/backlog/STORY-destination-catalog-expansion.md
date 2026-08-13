# Story: Destination catalog expansion with user contributions

- **Epic**: Destination discovery & curation
- **Status**: planned
- **Size**: M
- **Scope**: both

## User story
As a traveler, I want to see more curated destinations and suggest new cities to add, so that I can discover more travel options and help shape the catalog.

## Acceptance criteria
- [ ] Destination catalog expanded to 100+ cities (currently ~47) across underrepresented regions
- [ ] Users can access a "Suggest a destination" form from the destination catalog page
- [ ] Suggestion form captures: city name, country, reason for suggestion, optional personal experience
- [ ] Suggestions are validated (duplicate check, basic geocoding) and stored in a moderation queue
- [ ] Admin dashboard shows pending suggestions with voting/approval workflow
- [ ] Approved suggestions trigger data-pipeline curation process (climate fetch, rating assignment)
- [ ] Users receive confirmation email when their suggestion is approved and added
- [ ] Catalog expansion includes at least 5 cities from Africa, 5 from South Asia, 5 from Southeast Asia
- [ ] All new cities include full climate data, ratings, and month notes
- [ ] Documentation updated with new city additions and curation criteria

## Notes
**Data gaps to address:**
- Africa: Minimal Tier 1/2 coverage; recommend: Cape Town (done), Nairobi, Lagos, Accra, Dakar
- South Asia: Only Delhi/Goa; recommend: Bangalore, Jaipur, Colombo, Kathmandu, Chiang Mai
- Southeast Asia: Bangkok only; recommend: Hanoi, Hoi An, Ubud, Manila, Luang Prabang
- Middle East: No coverage; recommend: Dubai, Istanbul (bridge), Beirut (travel timing-dependent)

**Moderation workflow:**
- Auto-reject: duplicates (name matching), coordinates within 50km of existing city
- Auto-flag: cities with limited climate data, visa complexity, safety concerns (review before approval)
- Voting: internal team (minimum 2 approvals) before data pipeline triggers

**Related:**
- ADR 0013 (curation workflow) — user contributions fit existing pipeline
- STORY-research-automation.md — data pipeline can be triggered by approved suggestions
- STORY-offline-city-guides.md — new cities need guide data for offline sync

**Future phases:**
- Phase 1: Curated expansion + basic suggestion form (this story)
- Phase 2: Community voting on suggestions (like/dislike visibility)
- Phase 3: User-contributed content (tips, photos, seasonal notes)

## Dependencies
- STORY-research-automation.md (data pipeline in place for curation)
- Climate data API access (Frankfurter or alternative)
- Email service configured (for approval notifications)
