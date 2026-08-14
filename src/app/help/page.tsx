import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Guide · Wanderless",
  description: "Learn how to use Wanderless to plan your trips and compare destinations.",
};

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <article className="prose prose-sm dark:prose-invert max-w-none">
        <h1>User Guide</h1>

        <p>How to use Wanderless.</p>

        <h2>The short version</h2>

        <ol>
          <li>
            <strong>Create a trip</strong> with a name and rough dates. Nothing else is
            required.
          </li>
          <li>
            <strong>Compare destinations</strong> for those dates, adjusting what matters to
            you.
          </li>
          <li>
            <strong>Shortlist, reject or choose</strong> straight from the results.
          </li>
        </ol>

        <p>Everything is reversible, and rejections are kept on purpose.</p>

        <h2>Creating a trip</h2>

        <p>
          <strong>Trips → New trip.</strong> Only a name is required; everything else can come
          later.
        </p>

        <p>Worth filling in early:</p>

        <ul>
          <li>
            <strong>Dates</strong> drive the whole comparison. If they are not fixed, put your
            best guess and set <em>How fixed are the dates?</em> — the flexibility setting is
            recorded and shown, so a future you knows how much room there was.
          </li>
          <li>
            <strong>Departure airport</strong> defaults to JFK. Journey times are quoted from
            here.
          </li>
          <li>
            <strong>Purpose</strong> is free text and is never touched by anything automated.
            It is the thing that makes a trip make sense again in two months.
          </li>
        </ul>

        <h2>Comparing destinations</h2>

        <p>Two ways in:</p>

        <ul>
          <li>
            <strong>Compare destinations</strong> in the sidebar — free-form, for exploring.
          </li>
          <li>
            <strong>Compare destinations</strong> from inside a trip — dates and departure
            airport are locked to that trip, so results always reflect the real plan.
          </li>
        </ul>

        <p>
          Leave the destination checkboxes empty to rank the whole catalog, or tick a few to
          compare just those.
        </p>

        <h3>Reading the result</h3>

        <p>
          <strong>Top of the ranking</strong> is the headline answer with a paragraph explaining
          itself, plus the gap to the runner-up.
        </p>

        <p>
          <strong>Side by side</strong> is the table. Each row is a destination; each column a
          category. Scan a column to see who wins on that dimension.
        </p>

        <p>
          <strong>The working</strong> is one card per destination: what is in its favour, what
          is against it, the full factor breakdown under <em>How the score is built</em>, and
          what the score rests on.
        </p>

        <h3>Two things that will look wrong at first</h3>

        <p>
          <strong>A destination can rank below one with a lower score.</strong> If it exceeds
          your maximum travel time, it sits below everything that fits, whatever it scores. It
          is marked <em>over travel limit</em>, and a note under the table says how many were
          demoted. Raise the travel-time slider to bring them back into contention.
        </p>

        <p>
          <strong>A score can be reduced after the fact.</strong> If the catalog rates a
          destination a poor time to visit in your months, the total is scaled down and shown as{" "}
          <code>×0.76 seasonal gate (was 76)</code>. This is deliberate — it stops somewhere
          being recommended because it is cheap and quiet in its worst season.
        </p>

        <h3>Adjusting the brief</h3>

        <p>Every slider re-runs the comparison. The two with the most effect:</p>

        <ul>
          <li>
            <strong>Ideal daytime high</strong> — the temperature the weather score is measured
            against, not a minimum.
          </li>
          <li>
            <strong>Maximum travel time</strong> — a hard boundary, not a preference. See above.
          </li>
        </ul>

        <p>
          <em>How much each category counts</em> at the bottom re-weights the seven categories.
          Setting one to zero keeps it visible but stops it affecting the total.
        </p>

        <p>
          <strong>The URL holds everything.</strong> Bookmark a comparison and it comes back
          exactly as it was. Copy the link and it carries every slider position with it.
        </p>

        <h2>Making a decision</h2>

        <p>
          From a trip's comparison, each destination card has <strong>Shortlist</strong>,{" "}
          <strong>Choose this</strong> and <strong>Reject</strong>.
        </p>

        <ul>
          <li>
            <strong>Shortlist</strong> — still in play.
          </li>
          <li>
            <strong>Choose this</strong> — the decision. Only one destination can hold it;
            choosing a second moves it. The trip's planning status advances automatically.
          </li>
          <li>
            <strong>Reject</strong> — out, but kept and visible. Knowing what you ruled out is
            half of why the record is worth having.
          </li>
        </ul>

        <h2>Laying out the itinerary</h2>

        <p>
          Once a trip has dates, the <strong>Itinerary</strong> panel on the trip page turns it
          into a sequence of stops. If you have already chosen a destination, one button starts
          you off with it for the whole trip.
        </p>

        <p>
          <strong>You allocate nights; the dates follow.</strong> Stop one starts on your
          departure date, and each stop begins where the last one ended. This is why there is
          no date picker per stop — it is not possible to leave a gap or double-book a night.
          Move the trip's start date and the whole itinerary moves with it.
        </p>

        <p>
          The panel tells you three things at the top: how many stops, how the nights add up
          against the trip, and how many hours you spend moving between stops.
        </p>

        <h2>Suggesting new destinations</h2>

        <p>
          Don't see a city you want to visit? Use the <strong>Destination catalog</strong> page
          to suggest new cities. Submit a city name and country, and it will be researched and
          added to Wanderless for everyone to use.
        </p>

        <ul>
          <li>Each user can suggest up to 10 cities per day</li>
          <li>Suggestions are reviewed and researched by Wanderless</li>
          <li>Approved cities appear in the catalog within 24-48 hours</li>
        </ul>

        <h2>Questions or feedback?</h2>

        <p>
          Contact us at <a href="mailto:support@wanderless.app">support@wanderless.app</a> with
          any questions, suggestions, or feedback.
        </p>
      </article>
    </div>
  );
}
