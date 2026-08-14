# STORY: Phase 4 Sprint 2 — Flights & Weather Alerts

**Status:** pending
**Priority:** medium
**Sprint:** Phase 4 (after Sprint 1 complete)
**Estimate:** 1 week

## User Story

As a traveler planning a trip, I want to see real-time flight pricing and weather alerts so I can make informed decisions about when to visit.

## Scope

### Kiwi.com Flight Integration
- Real-time flight search by city + dates
- Display: nonstop availability, flight times, price ranges
- Show on: destination comparison cards, destination detail page
- Link to: Kiwi.com search for booking

**Free Tier:** 2,000 calls/month
**Effort:** 1 week (research extraction + caching strategy)

### OpenWeatherMap Real-time Alerts
- Severe weather warnings for selected dates
- Display: storm warnings, heat alerts, heavy rain
- Show on: destination cards as alert badges
- Fallback: Open-Meteo (already live)

**Free Tier:** 1,000 calls/day
**Effort:** 2-3 days (API integration + badge component)

## Acceptance Criteria

- [ ] Kiwi.com flight data fetches without blocking page load
- [ ] Flights display with nonstop badge, times, and price range
- [ ] OpenWeatherMap alerts show severity badges on cards
- [ ] Both APIs have graceful error handling (no broken pages)
- [ ] ISR caching prevents per-request API calls
- [ ] TypeScript strict mode passes
- [ ] All tests pass
- [ ] Documentation updated (user guide, API keys section)

## Implementation Notes

- Use ISR (Incremental Static Regeneration) for caching
- Fetch flights at build time, not per-request
- Cache weather alerts for 6-hour window
- Graceful fallback if APIs are down or over quota
- Display price range, not specific prices (honor free tier limits)

## Dependencies

- Sprint 1 (events + restaurants) must ship first
- Requires Kiwi.com API key (register free)
- Requires OpenWeatherMap API key (free tier)

## Related

- [[STORY-phase-4-sprint-1]] (completed)
- [[EPIC-phase-4-integrations]] (parent)
