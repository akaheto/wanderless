'use client';

import { PageHeader } from '@/components/ui';
import Link from 'next/link';

export const metadata = {
  title: 'User Guide · Wanderless',
  description: 'Complete guide to planning your trips with Wanderless',
};

export default function UserGuidePage() {
  return (
    <div className="min-h-screen bg-surface-0">
      <PageHeader title="Wanderless User Guide" subtitle="Find your next trip with confidence" />

      <article className="mx-auto max-w-3xl px-6 py-8 prose prose-sm dark:prose-invert">
        <div className="mb-12">
          <p className="text-lg text-ink-2 leading-relaxed">
            Wanderless replaces scattered browser tabs, spreadsheets, and half-remembered advice with one structured record that survives being put down for a month and picked back up.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 rounded-lg border border-line bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">📖 Table of Contents</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="#quick-start" className="text-accent hover:underline">Quick Start (5 minutes)</Link></li>
            <li><Link href="#understanding" className="text-accent hover:underline">Understanding the Ranking</Link></li>
            <li><Link href="#planning" className="text-accent hover:underline">Planning a Trip Step by Step</Link></li>
            <li><Link href="#itinerary" className="text-accent hover:underline">Building an Itinerary</Link></li>
            <li><Link href="#destination" className="text-accent hover:underline">Exploring a Destination</Link></li>
            <li><Link href="#places" className="text-accent hover:underline">Recording Places</Link></li>
            <li><Link href="#budget" className="text-accent hover:underline">Budget & Bookings</Link></li>
            <li><Link href="#tips" className="text-accent hover:underline">Tips & Tricks</Link></li>
            <li><Link href="#faq" className="text-accent hover:underline">FAQ</Link></li>
          </ul>
        </nav>

        {/* Quick Start */}
        <section id="quick-start" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Quick Start (5 minutes)</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">1. Create a trip</h3>
              <ul className="space-y-2 text-ink-2">
                <li>• Click <strong>New Trip</strong> in the sidebar</li>
                <li>• Give it a name (e.g., "Summer 2026 Europe")</li>
                <li>• Pick rough dates (they can change later)</li>
                <li>• Everything else is optional</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">2. Compare destinations</h3>
              <ul className="space-y-2 text-ink-2">
                <li>• Click <strong>Compare</strong> to rank the catalog for your dates</li>
                <li>• Adjust the sliders to match what you care about:
                  <ul className="mt-2 ml-4 space-y-1">
                    <li>◦ <strong>Temperature</strong> — what feels good to you</li>
                    <li>◦ <strong>Travel time</strong> — how long you'll tolerate getting there</li>
                    <li>◦ <strong>Budget</strong> — what you're willing to spend per night</li>
                    <li>◦ <strong>Other factors</strong> — toggle what matters</li>
                  </ul>
                </li>
                <li>• The ranking updates live as you slide</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">3. Make a decision</h3>
              <ul className="space-y-2 text-ink-2">
                <li>• Choose a destination directly, or shortlist several to decide between</li>
                <li>• Your trip planning status advances automatically</li>
                <li>• Rejected destinations stay visible so you remember what didn't work</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Understanding Rankings */}
        <section id="understanding" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Understanding the Ranking</h2>

          <h3 className="text-lg font-semibold text-ink mb-3">Why is destination X ranked here?</h3>
          <p className="text-ink-2 mb-6">
            Every ranking shows the winner at the top with an explanation, a table to compare destinations side-by-side, and full working for each destination so you can see exactly what's in its favor and what's against it.
          </p>

          <div className="rounded-lg bg-accent/5 border border-accent/20 p-6 mb-6">
            <h4 className="font-semibold text-ink mb-3">💡 Three things that look wrong but aren't:</h4>
            <div className="space-y-3 text-sm text-ink-2">
              <p>
                <strong>A destination scores lower after shortlisting it</strong> — if the catalog rates it a bad time to visit during your dates, the score is automatically scaled down to prevent recommending somewhere because it's cheap and quiet in its worst season. This is labeled as a <strong>seasonal gate</strong> and it's intentional.
              </p>
              <p>
                <strong>A destination jumps below everything else</strong> — if it exceeds your maximum travel time, it's demoted below all destinations that fit, regardless of score. It's marked <strong>over travel limit</strong>. Raise your travel-time slider to bring it back.
              </p>
              <p>
                <strong>The score uses decimal places</strong> — 76.43 is more precise than 76, and that precision matters when destinations are close. The app shows it because tie-breaking is worth seeing.
              </p>
            </div>
          </div>
        </section>

        {/* Planning a Trip */}
        <section id="planning" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Planning a Trip Step by Step</h2>

          <h3 className="text-lg font-semibold text-ink mb-3">Setting up your trip</h3>
          <p className="text-ink-2 mb-6">
            <strong>Dates matter most.</strong> They drive the comparison. If your dates are fixed, set them exactly. If they're flexible, set your best guess and note the flexibility.
          </p>

          <p className="text-ink-2 mb-6">
            <strong>Departure airport</strong> defaults to JFK (New York). If you're leaving from somewhere else, change it — journey times are calculated from here.
          </p>

          <p className="text-ink-2 mb-6">
            <strong>Purpose</strong> is free text and never touched by automation. Examples: "Anniversary trip," "Recovering from a conference," "Winter escape." This is what makes the record make sense again in two months.
          </p>

          <h3 className="text-lg font-semibold text-ink mb-3 mt-8">Comparing destinations within your trip</h3>
          <p className="text-ink-2 mb-4">
            Click <strong>Compare destinations</strong> from your trip page. Your dates and departure airport are locked to this trip, so results always reflect your real plan.
          </p>
          <p className="text-ink-2 mb-6">
            <strong>Adjusting your preferences</strong> — every slider re-runs the ranking. The two with the most effect are <strong>ideal daytime high</strong> and <strong>maximum travel time</strong>.
          </p>

          <p className="text-ink-2">
            <strong>Bookmark the URL.</strong> Every comparison is stored in the link, so you can share it or come back to it exactly as you left it.
          </p>
        </section>

        {/* Itinerary */}
        <section id="itinerary" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Building an Itinerary</h2>

          <p className="text-ink-2 mb-6">
            Click <strong>Itinerary</strong> on your trip page. This is where you map out which cities you'll visit and how long you'll spend in each.
          </p>

          <h3 className="text-lg font-semibold text-ink mb-3">You allocate nights, dates follow</h3>
          <ul className="space-y-2 text-ink-2 mb-6">
            <li>• <strong>Stop 1</strong> starts on your trip's departure date</li>
            <li>• <strong>Stop 2</strong> starts where Stop 1 ends</li>
            <li>• And so on — no gaps, no double-bookings</li>
          </ul>

          <div className="rounded-lg bg-accent/5 border border-accent/20 p-6 mb-6">
            <h4 className="font-semibold text-ink mb-3">⏱ Travel time is conservative</h4>
            <p className="text-sm text-ink-2">
              A "2-hour flight" usually takes 4-5 hours door-to-door because the flight is the short part. These are the hours that hide in night counts, and why a "3-night stop" can feel like just one full day.
            </p>
          </div>

          <p className="text-ink-2">
            Use the ↑ and ↓ arrows to try different sequences. Sequencing stops geographically rather than by preference often saves surprising amounts of travel time.
          </p>
        </section>

        {/* Exploring */}
        <section id="destination" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Exploring a Destination</h2>

          <p className="text-ink-2 mb-6">
            Click <strong>Destination Catalog</strong> in the sidebar, then any destination. Use the date picker at the top to see what that destination is like for your specific dates.
          </p>

          <div className="space-y-4 text-ink-2">
            <p>
              <strong>Climate through the year</strong> — A graph of the annual shape, with your chosen dates highlighted.
            </p>
            <p>
              <strong>Day-by-day normals</strong> — Temperature and rain for each calendar day (not a forecast, but a historical average).
            </p>
            <p>
              <strong>What it actually means</strong> — Plain-language reading for sightseeing, beach, outdoor dining, and daylight. This is interpretation and is labeled as such.
            </p>
            <p>
              <strong>Season-by-season ratings</strong> — The curated month ratings (1–5 scale) and the editorial notes behind them.
            </p>
          </div>
        </section>

        {/* Places */}
        <section id="places" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Recording Places</h2>

          <p className="text-ink-2 mb-6">
            The <strong>Places</strong> panel on your trip holds everything worth remembering: restaurants, beaches, markets, day trips, viewpoints. Each entry records <strong>who recommended it</strong> and <strong>when it was last checked</strong>.
          </p>

          <h3 className="text-lg font-semibold text-ink mb-3">Verify places as you research</h3>
          <p className="text-ink-2 mb-6">
            When adding a place, tick <strong>I have just checked these details</strong> only if you actually did. Otherwise, it saves as <strong>never verified</strong>, which is honest and gets flagged.
          </p>

          <div className="rounded-lg bg-surface-1 border border-line p-4 mb-6">
            <p className="font-semibold text-ink mb-3">Staleness depends on what it is:</p>
            <ul className="space-y-1 text-sm text-ink-2">
              <li>• Restaurants, bars, cafés — go stale after 18 months</li>
              <li>• Shops and markets — after 2 years</li>
              <li>• Museums and sights — after 3 years</li>
              <li>• Beaches, viewpoints, neighborhoods — after 5 years</li>
            </ul>
          </div>

          <p className="text-ink-2">
            <strong>Standing notes</strong> — Leave a place unattached to any trip and it becomes a standing note on the destination. Next time you visit that destination, the place is offered to you.
          </p>
        </section>

        {/* Budget */}
        <section id="budget" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Budget & Bookings</h2>

          <p className="text-ink-2 mb-6">
            The <strong>Budget</strong> panel on your trip tracks what you plan to spend and what's booked. Record estimated costs as you plan and actual costs as you book. This is where "why did that trip cost so much" gets answered.
          </p>

          <p className="text-ink-2">
            Track flights, hotels, activities, dining, and anything else. Include confirmation numbers and notes (early check-in fee, luggage allowance, etc.).
          </p>
        </section>

        {/* Tips */}
        <section id="tips" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Tips & Tricks</h2>

          <div className="space-y-4 text-ink-2">
            <p>
              <strong>Finding your way back</strong> — Bookmark comparisons, star your trips, or search for trip name in the sidebar.
            </p>
            <p>
              <strong>Making better decisions</strong> — Adjust one slider at a time so you see what matters most. Check the seasonal gate explanation if a destination drops unexpectedly.
            </p>
            <p>
              <strong>Keeping notes useful</strong> — Update places as you research. Write context, not just names. Standing notes are worth creating for your next trip.
            </p>
            <p>
              <strong>Handling trip changes</strong> — Change dates and the whole itinerary shifts. Replace a destination by choosing a new one. Skip a stop by setting nights to 0.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-ink mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                q: 'Can I undo a choice?',
                a: 'Yes. Shortlist a different destination, then choose it. The old one goes back to shortlist. If you reject something by mistake, click its name to view it, then choose or shortlist it again.',
              },
              {
                q: 'What happens to my budget if I change the dates?',
                a: 'It stays put. Hotel costs are recalculated for the new dates if you re-run a comparison, but flight and explicit bookings stay as recorded.',
              },
              {
                q: 'Can multiple people edit one trip?',
                a: 'Not yet. You can share your trip (read-only), but multi-user editing is planned for a future release.',
              },
              {
                q: 'Why is my hotel estimate way off?',
                a: 'Hotel costs are shoulder-season averages. Peak months (July–August) are 20–50% higher. Extreme-low-season can be 20% cheaper.',
              },
              {
                q: 'Why is climate data different from weather forecasts?',
                a: 'Climate shows historical averages for those dates, not the actual forecast. Use a weather app 10 days before your trip for predictions.',
              },
              {
                q: 'Why is the travel time estimate so high?',
                a: 'It includes airport time and connections, not just flight time. A "2-hour flight" usually takes 4–5 hours door to door.',
              },
            ].map((item, i) => (
              <details key={i} className="rounded-lg border border-line bg-surface-1 p-4 cursor-pointer group">
                <summary className="font-semibold text-ink group-open:text-accent">
                  {item.q}
                </summary>
                <p className="text-sm text-ink-2 mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Footer */}
        <section className="mt-16 pt-8 border-t border-line">
          <p className="text-sm text-ink-3">
            <strong>Version:</strong> 2.0  •  <strong>Last updated:</strong> August 2026  •  <strong>Applies to:</strong> Wanderless Release 8+
          </p>
          <p className="text-sm text-ink-3 mt-4">
            <Link href="/help" className="text-accent hover:underline">← Back to Help Center</Link>
          </p>
        </section>
      </article>
    </div>
  );
}
