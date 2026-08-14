# User guide

How to use the Wanderless.

## The short version

1. **Create a trip** with a name and rough dates. Nothing else is required.
2. **Compare destinations** for those dates, adjusting what matters to you.
3. **Shortlist, reject or choose** straight from the results.

Everything is reversible, and rejections are kept on purpose.

## Creating a trip

**Trips → New trip.** Only a name is required; everything else can come later.

Worth filling in early:

- **Dates** drive the whole comparison. If they are not fixed, put your best guess and set
  *How fixed are the dates?* — the flexibility setting is recorded and shown, so a future
  you knows how much room there was.
- **Departure airport** defaults to JFK. Journey times are quoted from here.
- **Purpose** is free text and is never touched by anything automated. It is the thing that
  makes a trip make sense again in two months.

## Comparing destinations

Two ways in:

- **Compare destinations** in the sidebar — free-form, for exploring.
- **Compare destinations** from inside a trip — dates and departure airport are locked to
  that trip, so results always reflect the real plan.

Leave the destination checkboxes empty to rank the whole catalog, or tick a few to compare
just those.

### Reading the result

**Top of the ranking** is the headline answer with a paragraph explaining itself, plus the
gap to the runner-up.

**Side by side** is the table. Each row is a destination; each column a category. Scan a
column to see who wins on that dimension.

**The working** is one card per destination: what is in its favour, what is against it, the
full factor breakdown under *How the score is built*, and what the score rests on.

### Two things that will look wrong at first

**A destination can rank below one with a lower score.** If it exceeds your maximum travel
time, it sits below everything that fits, whatever it scores. It is marked *over travel
limit*, and a note under the table says how many were demoted. Raise the travel-time slider
to bring them back into contention.

**A score can be reduced after the fact.** If the catalog rates a destination a poor time
to visit in your months, the total is scaled down and shown as `×0.76 seasonal gate (was
76)`. This is deliberate — it stops somewhere being recommended because it is cheap and
quiet in its worst season.

### Adjusting the brief

Every slider re-runs the comparison. The two with the most effect:

- **Ideal daytime high** — the temperature the weather score is measured against, not a
  minimum.
- **Maximum travel time** — a hard boundary, not a preference. See above.

*How much each category counts* at the bottom re-weights the seven categories. Setting one
to zero keeps it visible but stops it affecting the total.

**The URL holds everything.** Bookmark a comparison and it comes back exactly as it was.
Copy the link and it carries every slider position with it.

## Making a decision

From a trip's comparison, each destination card has **Shortlist**, **Choose this** and
**Reject**.

- **Shortlist** — still in play.
- **Choose this** — the decision. Only one destination can hold it; choosing a second moves
  it. The trip's planning status advances automatically.
- **Reject** — out, but kept and visible. Knowing what you ruled out is half of why the
  record is worth having.

## Laying out the itinerary

Once a trip has dates, the **Itinerary** panel on the trip page turns it into a sequence of
stops. If you have already chosen a destination, one button starts you off with it for the
whole trip.

**You allocate nights; the dates follow.** Stop one starts on your departure date, and each
stop begins where the last one ended. This is why there is no date picker per stop — it is
not possible to leave a gap or double-book a night. Move the trip's start date and the whole
itinerary moves with it.

The panel tells you three things at the top: how many stops, how the nights add up against
the trip, and how many hours you spend moving between stops.

### When the nights don't add up

If your stops account for fewer nights than the trip has, you will see **"3 nights
unallocated"**. More, and you get **"6 nights over — the itinerary runs past the return
date"**. Neither is corrected for you; the stops keep the nights you gave them and the
problem is stated. Change a night count, or add or remove a stop.

### Transfer burden

Between each pair of stops is the journey: mode, hours door to door, distance, and a
judgement — *easy*, *half a day*, *a full day*, or *punishing*.

The hours are deliberately unflattering about flying. A 630 km domestic hop is modelled at
about four and a half hours, because the flight is the short part — the airport is the rest.
This is the number a night count hides, and the reason a "three-night stop" can turn out to
be one full day.

Two flags worth acting on:

- **"Transfer costs more than the stop is worth"** — the journey eats more than a third of
  the waking hours the stop buys you. Stay longer or cut it.
- **"A lot of this trip is transit"** — across the whole trip you are spending more time
  moving than the itinerary can carry. Usually means one stop too many.

**Reordering changes the total.** Sequencing stops geographically rather than by preference
often saves hours — the ↑ and ↓ arrows are worth experimenting with.

### Climate per stop

Each stop shows the temperature and expected wet days for **its own** dates, not the trip's
average. On a long trip this matters more than it sounds: a fortnight in Vietnam can span
Hanoi at 77°F and Ho Chi Minh City at 95°F.

Transfer times are estimates from distance and typical airport overhead — not searched
routes. The panel says so. Real flight timings arrive with Release 5; a few legs the model
gets wrong are corrected by hand already, such as Krabi to Koh Samui, which crosses the
peninsula and is a bus and a ferry rather than a drive.

## Looking at one destination

**Destination catalog** → any destination. The date picker at *Day by day, for these dates*
changes the window everything is calculated for.

- **Climate through the year** — the annual shape, with your months highlighted.
- **Day by day** — normals for your exact calendar days. Not a forecast.
- **What that actually means** — plain-language readings for sightseeing, beach, outdoor
  dining and daylight. This is interpretation, and is labelled as such.
- **Compared with New York** — the same dates at home, for context.
- **Season by season** — the curated month ratings and the notes behind them.

## Where the numbers come from

**Data & sources** explains every source, when it was fetched, and — importantly — what is
missing. Worth reading once.

Three kinds of number, marked wherever they appear:

- **Measured** — from a named source with a date. Climate, holidays.
- **Curated** — editorial judgement with a review date. Seasonal ratings, cost bands,
  journey times.
- **Personal** — yours. Never overwritten by anything.

Two gaps worth knowing about now:

- **Holiday data is thin in places.** There is none for Thailand, the UAE or the Maldives,
  and Vietnam's list omits Tết. An empty holiday list is not proof of a quiet week — the
  app says so where it applies.
- **Hotel costs are planning estimates**, not quotes, and flight times are typical journeys
  rather than searched availability.

## Not built yet

Flights and hotels, and budget, appear as labelled placeholders on the trip page with the
release they are coming in. They are shown rather than hidden so it is clear what the record
will eventually hold.

## Saving places

The **Places** panel on a trip holds everything you have been told about — restaurants,
beaches, markets, day trips. What makes it worth keeping, rather than a notes app, is that
each entry records **who recommended it** and **when it was last checked**.

Places are grouped under the stop they belong to, so you see what is near you when. A place
whose destination is not on the itinerary appears under *Not on the itinerary* rather than
being hidden.

### Verified, and how stale

Adding a place does not claim you checked it. Tick *I have just checked these details* only
if you actually did — otherwise it saves as **never verified**, which is honest and is
flagged.

Staleness depends on what kind of place it is:

- **Restaurants, bars, cafés** go stale after about eighteen months.
- **Shops and markets** after two years.
- **Museums and sights** after three.
- **Beaches, viewpoints, neighbourhoods** after five — a beach does not close.

Anything stale or unverified gets a **Re-check this** link. Filling it in marks the place
verified today. **It cannot touch your notes or your priority** — only the factual fields.
That separation is deliberate: a refresh should never overwrite something you wrote.

As departure gets closer the warnings sharpen. A stale place six months out is a note; three
weeks out it is a problem worth acting on.

### Standing notes

Leave a place unattached to any trip and it becomes a standing note on the destination. Next
time you go there it is offered again, and **Add to this trip** copies it across while
leaving the original in place. This is how the record gets better each time you use it.

You do not need an API key for any of this. Details are typed in by hand, which is the
normal path — the best recommendations usually come from people rather than a database.
