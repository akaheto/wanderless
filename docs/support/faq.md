# FAQ

## Why can't I search for any city?

Only destinations in the curated catalog can be ranked. A destination is admissible once
someone has decided what its months are actually like — that judgement is the product, and
no API provides it. Ranking arbitrary coordinates is how you get told to spend January
somewhere with six hours of daylight. See ADR 0003.

## Why does the top result change when I change the dates?

Because it should. Seasonal suitability is a large part of the score, and it is month-
specific. Hoi An beats Hanoi in March and loses to it in November, because central Vietnam's
monsoon runs opposite to the north's.

## Is the weather a forecast?

No. Everything shown is a **normal** — what those calendar dates have historically looked
like over 2015–2024. Forecasts arrive in Release 5, for trips near enough for one to mean
something, and will be labelled distinctly.

## How accurate are the hotel costs?

They are curated planning estimates — bands for a given standard of hotel in a given season
— not quotes, and not live rates. Every comparison carries a warning saying so. Real pricing
arrives with Release 5.

## Why is there no holiday data for Thailand?

Nager.Date, the free public-holiday source, does not cover it. Rather than show an empty
list — which would read as "no holidays" — the app marks the data unavailable and lowers the
comparison's confidence. The same applies to the UAE and the Maldives, and Vietnam's list
omits Tết.

## Can I change the seasonal ratings?

Yes — they are curated data in `src/data/destinations.ts`, version-controlled and meant to
be argued with. Note that some are asserted by tests, deliberately: changing them may break
a regression test that exists to prevent a known failure.

## Will my notes ever be overwritten?

No. Personal data lives in the database and nothing generated writes to it. A data refresh
regenerates only the measured tier.

## Can I share a comparison?

A comparison is a URL containing all its state, so the link reproduces exactly what you saw
— but only for someone with access to your instance. Real sharing is Release 8.

## Why is the catalog only 27 destinations?

Each one takes roughly an hour to research and write a defensible profile for. It grows as
trips get planned. The bias is real and worth knowing: the catalog reflects one person's
travel interests, and a destination that was never added looks identical to one that was
considered and rejected.

## Does this book anything?

No, and it is not intended to. It informs decisions and records what was booked elsewhere.
See the charter's out-of-scope list.
