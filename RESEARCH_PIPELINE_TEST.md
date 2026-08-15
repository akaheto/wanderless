# Research Pipeline v2 - Complete Test Plan

## Test Scope
1. **Existing failed cities**: Austin, New York, Weimar, Accra (had guessed data, now need re-research)
2. **New city**: Buenos Aires (never researched, start from scratch)

## Test Workflow

### For Each City:

#### Step 1: Submit/Retry
- **Austin, New York, Weimar, Accra**: Click "Retry Research" button in admin panel
- **Buenos Aires**: Submit via `/destinations/suggest`

#### Step 2: Auto-Research (Backend)
Research system runs:
1. Fetches reliable data:
   - Climate from Open-Meteo (most reliable)
   - Flights from route database
   - Visa info from web search
2. Generates suggestions (Claude):
   - Suggests hotel prices (NOT auto-used)
   - Suggests influencer spots (candidates only)
3. Status: "draft_for_review" (ready for admin)

#### Step 3: Admin Review (/admin/research/[id])
1. See auto-collected reliable data (read-only):
   - ✓ Climate from Open-Meteo
   - ✓ Flights data
   - ✓ Visa requirements
2. Edit manually-researched data:
   - Hotel prices (research on Booking.com, take shoulder-season avg)
   - Influencer spots (accept suggestions, add/remove as needed, min 20-50)
   - Summary (edit if needed)
   - Admin notes (explain sources)
3. Click "Approve & Publish"

#### Step 4: Verification
- Database updated with approved data
- Status changes to "reviewed"
- Ready for catalog (eventually auto-adds when flag is off)

## Test Data Points

### Buenos Aires
- **Climate**: [Open-Meteo auto]
- **Flights**: ~10-12 hours from JFK, likely 1 connection
- **Visa**: None needed for US citizens
- **Hotels**: Research on Booking.com
  - 4-star: ~$150-200
  - 5-star: ~$300-400
- **Influencer spots**: La Boca, San Telmo, Puerto Madero, Recoleta Cemetery, etc.

### Austin (retry with new data)
- **Climate**: [Open-Meteo auto]
- **Flights**: Nonstop from JFK, ~4-5 hours
- **Visa**: None (US city)
- **Hotels**: Reassess current market
  - May have changed since first attempt
- **Influencer spots**: Retry extraction, should get better results now

## Success Criteria

✓ Each city completes full workflow
✓ Admin can see and edit all fields
✓ Approved cities marked "reviewed" in database
✓ No data fabricated (all verified by admin)
✓ Configuration flag REQUIRE_ADMIN_APPROVAL = true (working correctly)

## Next Step After Test

Once all 5 cities are approved:
- Can toggle REQUIRE_ADMIN_APPROVAL = false (no longer need admin review)
- Future cities auto-approve and publish automatically
- Workflow becomes: Suggest → Auto-research → Auto-publish

## Files to Monitor

- `src/lib/config/research-config.ts` — Feature flag location
- `src/app/admin/research/[id]/page.tsx` — Admin review UI
- `/api/admin/research/[id]/approve` — Approval endpoint
- Database: city_suggestions table status field
