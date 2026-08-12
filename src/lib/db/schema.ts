/**
 * Database schema — the PERSONAL tier.
 *
 * This holds everything the traveller creates: trips, shortlists, their own notes and
 * their own weightings. It never holds climate normals or catalog data, which are
 * regenerable reference files. That split is deliberate: `npm run build:data` can
 * rewrite every fact about the world without touching a single judgement you made.
 *
 * Tables marked "Phase N" are the record definitions from Phase 0 of the product plan.
 * They are created now so the data model is settled and migrations stay additive; the
 * MVP only reads and writes the trip and comparison tables.
 */

export const MIGRATIONS: { name: string; statements: string[] }[] = [
  {
    name: "0001_core",
    statements: [
      `CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idea',
        start_date TEXT,
        end_date TEXT,
        flexibility TEXT NOT NULL DEFAULT 'fixed',
        departure_airport TEXT NOT NULL DEFAULT 'JFK',
        travelers INTEGER NOT NULL DEFAULT 2,
        purpose TEXT NOT NULL DEFAULT '',
        priorities TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Candidate destinations for a trip — the shortlist, and the record of what was
      // rejected. Rejections are kept: knowing you already ruled out Bali in February is
      // worth as much as knowing Phuket is shortlisted.
      `CREATE TABLE IF NOT EXISTS trip_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        destination_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'considering',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE (trip_id, destination_id)
      )`,

      // Per-trip comparison preferences. Stored as JSON because the shape belongs to the
      // scoring engine and will grow with it; there is nothing to query across here.
      `CREATE TABLE IF NOT EXISTS trip_preferences (
        trip_id INTEGER PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS trip_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_candidates_trip ON trip_candidates (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_links_trip ON trip_links (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trips_archived ON trips (archived, start_date)`,
    ],
  },
  {
    name: "0002_itinerary_and_places",
    statements: [
      // Phase 4 — multi-city structure. Defined now, built later.
      `CREATE TABLE IF NOT EXISTS trip_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        destination_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        nights INTEGER NOT NULL DEFAULT 0,
        arrive_date TEXT,
        note TEXT NOT NULL DEFAULT ''
      )`,

      // Phase 5 — saved places. `verified_on` and `source_id` are not optional extras:
      // a place record without them cannot be trusted for hours, prices or bookings.
      `CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destination_id TEXT NOT NULL,
        trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        neighborhood TEXT NOT NULL DEFAULT '',
        lat REAL,
        lon REAL,
        description TEXT NOT NULL DEFAULT '',
        why_it_matters TEXT NOT NULL DEFAULT '',
        price_level INTEGER,
        hours TEXT NOT NULL DEFAULT '',
        reservation_required INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'considering',
        notes TEXT NOT NULL DEFAULT '',
        source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
        verified_on TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Phase 9 — every time-sensitive fact traces back to one of these.
      `CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'web',
        retrieved_on TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_stops_trip ON trip_stops (trip_id, position)`,
      `CREATE INDEX IF NOT EXISTS idx_places_destination ON places (destination_id)`,
      `CREATE INDEX IF NOT EXISTS idx_places_trip ON places (trip_id)`,
    ],
  },
  {
    name: "0003_bookings",
    statements: [
      // Phases 7 and 8 — defined so trip cost has somewhere to live, unused in the MVP.
      `CREATE TABLE IF NOT EXISTS flights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        direction TEXT NOT NULL DEFAULT 'outbound',
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        airline TEXT NOT NULL DEFAULT '',
        flight_number TEXT NOT NULL DEFAULT '',
        depart_at TEXT,
        arrive_at TEXT,
        cabin TEXT NOT NULL DEFAULT '',
        fare_class TEXT NOT NULL DEFAULT '',
        connections INTEGER NOT NULL DEFAULT 0,
        total_minutes INTEGER,
        status TEXT NOT NULL DEFAULT 'option',
        cost_usd REAL,
        confirmation TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS hotels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        destination_id TEXT NOT NULL,
        name TEXT NOT NULL,
        check_in TEXT,
        check_out TEXT,
        nightly_usd REAL,
        taxes_usd REAL,
        resort_fee_usd REAL,
        refundable INTEGER NOT NULL DEFAULT 1,
        cancel_by TEXT,
        breakfast_included INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'option',
        confirmation TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS budget_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        label TEXT NOT NULL,
        estimated_usd REAL,
        booked_usd REAL,
        refundable INTEGER NOT NULL DEFAULT 1,
        due_on TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_flights_trip ON flights (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_hotels_trip ON hotels (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_budget_trip ON budget_items (trip_id)`,
    ],
  },
  {
    // Release 2. Nights are the source of truth and dates are derived from the trip's
    // start (ADR 0010) — a stored arrival date alongside them could disagree with the
    // night counts, so it goes. A fresh database creates the column in 0002 and drops it
    // here; that is deliberate, since rewriting 0002 would skip the drop on databases
    // that already ran it.
    name: "0004_stops_drop_arrive_date",
    statements: [`ALTER TABLE trip_stops DROP COLUMN arrive_date`],
  },
  {
    // Release 3. Fields the places spec needs that migration 0002 did not anticipate.
    // Deliberately all in the "fetched" group (ADR 0014) — the personal fields were
    // already right.
    name: "0005_places_enrichment_fields",
    statements: [
      `ALTER TABLE places ADD COLUMN address TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE places ADD COLUMN url TEXT NOT NULL DEFAULT ''`,
      // Kept for de-duplication when the same place arrives by two routes. Null when the
      // place was entered by hand, which is the default and supported path.
      `ALTER TABLE places ADD COLUMN provider_place_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_places_provider ON places (provider_place_id)`,
    ],
  },
  {
    /*
     * Release 4 correction. `departure_airport` was a single free-text code that fed the UI
     * and nothing else — journey figures were always JFK's (ADR 0015). It becomes an ordered
     * list of the airports the traveller will actually use, which does feed scoring.
     *
     * Backfilled so an existing trip keeps its stated airport first and gains the other two
     * behind it, which is the closest honest reading of "I depart from X".
     */
    name: "0006_trips_origins",
    statements: [
      `ALTER TABLE trips ADD COLUMN origins TEXT NOT NULL DEFAULT 'JFK,LGA,EWR'`,
      `UPDATE trips SET origins = CASE
         WHEN departure_airport = 'LGA' THEN 'LGA,JFK,EWR'
         WHEN departure_airport = 'EWR' THEN 'EWR,JFK,LGA'
         ELSE 'JFK,LGA,EWR'
       END`,
      `ALTER TABLE trips DROP COLUMN departure_airport`,
    ],
  },
  {
    /*
     * Release 5. Stored flight and hotel searches, with the moment they were retrieved
     * (ADR 0016). A search is the result of an explicit user action and persists with its
     * timestamp so staleness is visible, never silent. The schema mirrors FlightSearchResult
     * and matches the provider interface.
     */
    name: "0007_flight_and_hotel_searches",
    statements: [
      `CREATE TABLE IF NOT EXISTS flight_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        origin TEXT NOT NULL,
        destination_airport TEXT NOT NULL,
        depart_date TEXT NOT NULL,
        return_date TEXT,
        payload TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT '',
        retrieved_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS hotel_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        destination_id TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        payload TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT '',
        retrieved_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_flight_searches_trip ON flight_searches (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_hotel_searches_trip ON hotel_searches (trip_id)`,
    ],
  },
  {
    /*
     * Release 4. Date-constrained events — departures, festivals, school holidays,
     * entry requirement deadlines — that exist independently of destination selection.
     * They are trip-level constraints, not destination-level, because "Oktoberfest
     * Sep 21–Oct 6" applies to any trip overlapping those dates.
     */
    name: "0008_trip_events",
    statements: [
      `CREATE TABLE IF NOT EXISTS trip_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'constraint',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_events_trip ON trip_events (trip_id, start_date)`,
    ],
  },
  {
    /*
     * Release 8. Ownership and collaboration. Every table gets an owner (the user who
     * created it), and trips get collaborators with permission levels. Existing rows are
     * backfilled with a system user (id 0) as owner — these are the initial user's data.
     *
     * Sharing is anonymous (no auth required) but curated: a share link shows only
     * destination, itinerary, bookings, places — not notes, priorities, or rejected options.
     */
    name: "0009_ownership_and_sharing",
    statements: [
      // Users table: tracks email, created_at, last login for permission checks
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )`,

      // Trip ownership and permissions
      `ALTER TABLE trips ADD COLUMN owner_id TEXT NOT NULL DEFAULT '0'`,
      `ALTER TABLE trips ADD COLUMN permission TEXT NOT NULL DEFAULT 'private'`,

      // Collaborators: who can edit this trip
      `CREATE TABLE IF NOT EXISTS trip_collaborators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'editor',
        added_at TEXT NOT NULL,
        UNIQUE (trip_id, user_id)
      )`,

      // Shared links: anonymous access to curated trip data
      `CREATE TABLE IF NOT EXISTS trip_shares (
        id TEXT PRIMARY KEY,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        note TEXT NOT NULL DEFAULT ''
      )`,

      `CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip ON trip_collaborators (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user ON trip_collaborators (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trip_shares_trip ON trip_shares (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trip_shares_token ON trip_shares (token)`,
    ],
  },
  {
    /*
     * Release 9. Authentication system. Users can now sign up with email/password.
     * Sessions track active logins, password_hash stores bcrypted passwords.
     */
    name: "0010_authentication",
    statements: [
      // Add password_hash column to users table
      `ALTER TABLE users ADD COLUMN password_hash TEXT`,

      // Sessions: track active logins with expiration
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token)`,
    ],
  },
  {
    /*
     * Release 10. Email-based collaborator invitations. Users can invite collaborators
     * by email without requiring them to sign up first. Invites expire after 7 days.
     */
    name: "0011_trip_invites",
    statements: [
      `CREATE TABLE IF NOT EXISTS trip_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        invited_email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'editor',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_trip_invites_token ON trip_invites (token)`,
      `CREATE INDEX IF NOT EXISTS idx_trip_invites_trip ON trip_invites (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trip_invites_email ON trip_invites (invited_email)`,
    ],
  },
  {
    /*
     * Release 11. Multi-currency support for trips.
     * Each trip specifies its primary currency for budgeting (defaults to USD).
     * Costs are displayed in original currency + converted to USD via Frankfurter API.
     */
    name: "0012_trips_currency",
    statements: [
      `ALTER TABLE trips ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'`,
    ],
  },
  {
    /*
     * Release 12. Audit logging. Append-only record of all significant user actions
     * for compliance, debugging, and analytics. Never deleted, only read.
     */
    name: "0013_audit_log",
    statements: [
      `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        trip_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trip ON audit_log (trip_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at)`,
    ],
  },
  {
    /*
     * Release 13. Email verification. Users must verify their email address before
     * accessing the app. Verification tokens expire after 24 hours.
     */
    name: "0014_email_verification",
    statements: [
      `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN verification_token TEXT`,
      `ALTER TABLE users ADD COLUMN verification_token_expires_at TEXT`,

      `CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token)`,
    ],
  },
  {
    /*
     * Release 6/11. Money as integer minor units with explicit currency (ADR 0013).
     * Replaces all *_usd REAL columns with currency-aware integer minor units.
     * This prevents float rounding errors that compound silently across a budget.
     * Backfill: all legacy rows are implicitly USD, so multiply by 100 and round.
     */
    name: "0015_money_minor_units",
    statements: [
      // budget_items: add currency and minor-unit columns, backfill, drop old columns
      `ALTER TABLE budget_items ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'`,
      `ALTER TABLE budget_items ADD COLUMN estimated_minor INTEGER`,
      `ALTER TABLE budget_items ADD COLUMN booked_minor INTEGER`,
      `ALTER TABLE budget_items ADD COLUMN paid INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE budget_items ADD COLUMN refundable_until TEXT`,

      // Backfill: convert from USD decimals to minor units (× 100, rounded)
      `UPDATE budget_items SET estimated_minor = CAST(ROUND(COALESCE(estimated_usd, 0) * 100) AS INTEGER) WHERE estimated_usd IS NOT NULL`,
      `UPDATE budget_items SET booked_minor = CAST(ROUND(COALESCE(booked_usd, 0) * 100) AS INTEGER) WHERE booked_usd IS NOT NULL`,

      // Drop old columns (following the additive-migration pattern from 0004)
      `ALTER TABLE budget_items DROP COLUMN estimated_usd`,
      `ALTER TABLE budget_items DROP COLUMN booked_usd`,

      // flights: add currency and cost_minor, backfill, drop old column
      `ALTER TABLE flights ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'`,
      `ALTER TABLE flights ADD COLUMN cost_minor INTEGER`,
      `UPDATE flights SET cost_minor = CAST(ROUND(COALESCE(cost_usd, 0) * 100) AS INTEGER) WHERE cost_usd IS NOT NULL`,
      `ALTER TABLE flights DROP COLUMN cost_usd`,

      // hotels: add currency and minor-unit columns, backfill, drop old columns
      `ALTER TABLE hotels ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'`,
      `ALTER TABLE hotels ADD COLUMN nightly_minor INTEGER`,
      `ALTER TABLE hotels ADD COLUMN taxes_minor INTEGER`,
      `ALTER TABLE hotels ADD COLUMN resort_fee_minor INTEGER`,
      `UPDATE hotels SET nightly_minor = CAST(ROUND(COALESCE(nightly_usd, 0) * 100) AS INTEGER) WHERE nightly_usd IS NOT NULL`,
      `UPDATE hotels SET taxes_minor = CAST(ROUND(COALESCE(taxes_usd, 0) * 100) AS INTEGER) WHERE taxes_usd IS NOT NULL`,
      `UPDATE hotels SET resort_fee_minor = CAST(ROUND(COALESCE(resort_fee_usd, 0) * 100) AS INTEGER) WHERE resort_fee_usd IS NOT NULL`,
      `ALTER TABLE hotels DROP COLUMN nightly_usd`,
      `ALTER TABLE hotels DROP COLUMN taxes_usd`,
      `ALTER TABLE hotels DROP COLUMN resort_fee_usd`,
    ],
  },
];
