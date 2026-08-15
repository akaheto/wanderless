import { PageHeader } from '@/components/ui';
import Link from 'next/link';

export const metadata = {
  title: 'Help & Documentation · Wanderless',
  description: 'Learn how to plan your next trip with Wanderless',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-surface-0">
      <PageHeader title="Help & Documentation" lede="Learn how to make the most of Wanderless" />

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-ink mb-6">Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="#quick-start" className="block p-6 rounded-lg border border-line bg-surface-1 hover:bg-surface-2 transition">
              <h3 className="font-semibold text-ink mb-2">🚀 Quick Start</h3>
              <p className="text-sm text-ink-2">Get your first trip planned in 5 minutes</p>
            </Link>

            <Link href="#comparing" className="block p-6 rounded-lg border border-line bg-surface-1 hover:bg-surface-2 transition">
              <h3 className="font-semibold text-ink mb-2">📊 Comparing Destinations</h3>
              <p className="text-sm text-ink-2">Understand how the ranking works</p>
            </Link>

            <Link href="#itinerary" className="block p-6 rounded-lg border border-line bg-surface-1 hover:bg-surface-2 transition">
              <h3 className="font-semibold text-ink mb-2">📅 Building an Itinerary</h3>
              <p className="text-sm text-ink-2">Plan your stops and travel time</p>
            </Link>
          </div>
        </section>

        {/* Quick Start */}
        <section id="quick-start" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-semibold text-ink mb-4">Quick Start (5 minutes)</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-surface-1 p-6">
              <h3 className="font-semibold text-ink mb-2">1. Create a trip</h3>
              <p className="text-sm text-ink-2">Click <strong>New Trip</strong> in the sidebar. Give it a name and pick dates. That's it!</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-1 p-6">
              <h3 className="font-semibold text-ink mb-2">2. Compare destinations</h3>
              <p className="text-sm text-ink-2">Click <strong>Compare</strong> to see all destinations ranked for your dates. Adjust the sliders to match what you care about — temperature, travel time, budget, etc.</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-1 p-6">
              <h3 className="font-semibold text-ink mb-2">3. Make a decision</h3>
              <p className="text-sm text-ink-2">Choose a destination and your trip advances to itinerary planning. Rejected options stay visible so you remember what didn't work.</p>
            </div>
          </div>
        </section>

        {/* Understanding Rankings */}
        <section id="comparing" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-semibold text-ink mb-4">Understanding the Ranking</h2>
          <div className="space-y-4 text-sm text-ink-2">
            <p>
              Every ranking shows the winner at the top with an explanation, a table to compare destinations side-by-side, and full working for each destination so you can see exactly what's in its favor and what's against it.
            </p>
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
              <p className="font-semibold text-ink mb-2">💡 Three things that look wrong but aren't:</p>
              <ul className="space-y-2">
                <li><strong>Score dropped</strong> — if a destination is a bad time to visit during your dates, we scale it down. This is the seasonal gate, working as intended.</li>
                <li><strong>Jumped below everything</strong> — if it exceeds your travel-time limit, it's demoted below everything that fits. Raise your slider to reconsider.</li>
                <li><strong>Decimal places</strong> — 76.43 vs 76 matters when destinations are close. We show it for transparency.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Itinerary */}
        <section id="itinerary" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-semibold text-ink mb-4">Building an Itinerary</h2>
          <div className="space-y-4 text-sm text-ink-2">
            <p>
              Once you've chosen a destination, click <strong>Itinerary</strong> to map out your stops. You allocate nights to each stop, and dates follow automatically.
            </p>
            <div className="rounded-lg border border-line bg-surface-1 p-4">
              <p className="font-semibold text-ink mb-2">⏱ Travel time is conservative</p>
              <p>A "2-hour flight" usually takes 4-5 hours door-to-door because the flight is the short part. These are the hours that hide in night counts, and why a "3-night stop" can feel like just one full day.</p>
            </div>
          </div>
        </section>

        {/* Full Guide */}
        <section className="mb-12 rounded-lg border border-accent/20 bg-accent/5 p-8">
          <h2 className="text-2xl font-semibold text-ink mb-4">📚 Complete User Guide</h2>
          <p className="text-ink-2 mb-6">
            For detailed walkthroughs on every feature, data sources, troubleshooting and more, read the full user guide:
          </p>
          <a
            href="/docs/user-guide"
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-strong transition"
          >
            Read Full User Guide →
          </a>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-ink mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="rounded-lg border border-line bg-surface-1 p-4 cursor-pointer group">
              <summary className="font-semibold text-ink group-open:text-accent">
                Can I undo a choice?
              </summary>
              <p className="text-sm text-ink-2 mt-3">
                Yes. Shortlist a different destination, then choose it. The old one goes back to shortlist.
              </p>
            </details>

            <details className="rounded-lg border border-line bg-surface-1 p-4 cursor-pointer group">
              <summary className="font-semibold text-ink group-open:text-accent">
                How accurate are the hotel prices?
              </summary>
              <p className="text-sm text-ink-2 mt-3">
                Hotel estimates are shoulder-season averages. Peak months are 20–50% higher. Extreme-low-season can be 20% cheaper. Use your budget tracker to refine as you search.
              </p>
            </details>

            <details className="rounded-lg border border-line bg-surface-1 p-4 cursor-pointer group">
              <summary className="font-semibold text-ink group-open:text-accent">
                Can multiple people edit one trip?
              </summary>
              <p className="text-sm text-ink-2 mt-3">
                Not yet. You can share your trip (read-only), but multi-user editing is planned for a future release.
              </p>
            </details>

            <details className="rounded-lg border border-line bg-surface-1 p-4 cursor-pointer group">
              <summary className="font-semibold text-ink group-open:text-accent">
                Why is climate data different from weather forecasts?
              </summary>
              <p className="text-sm text-ink-2 mt-3">
                Climate shows historical averages for those dates, not the actual forecast. Use a weather app 10 days before your trip for predictions.
              </p>
            </details>

            <details className="rounded-lg border border-line bg-surface-1 p-4 cursor-pointer group">
              <summary className="font-semibold text-ink group-open:text-accent">
                How do I delete or archive a trip?
              </summary>
              <p className="text-sm text-ink-2 mt-3">
                Click <strong>Archive</strong> on the trip page to hide it from your sidebar. Archived trips still exist and can be unarchived. Permanent deletion isn't available to prevent accidents.
              </p>
            </details>
          </div>
        </section>

        {/* Support */}
        <section className="mb-12 rounded-lg border border-line/50 bg-surface-1 p-8">
          <h2 className="text-2xl font-semibold text-ink mb-4">Need More Help?</h2>
          <p className="text-ink-2 mb-6">
            Check the <strong>Data & Sources</strong> page for where all numbers come from and additional FAQs. Found a bug or have a feature idea? We'd love to hear it.
          </p>
        </section>
      </div>
    </div>
  );
}
