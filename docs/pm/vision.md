# Vision

## Problem

Planning a trip generates a surprising amount of thinking, and almost none of it is kept.

The research happens across twenty browser tabs, three chat threads and a spreadsheet that
made sense at the time. Two months later the trip is booked but the *reasoning* is gone —
why Hoi An over Hanoi, why not November, what the other four options were and what was
wrong with them. When the next trip comes around, none of it carries over. You start again.

Worse, the tools that promise to help mostly answer a different question than the one being
asked. "Where is warm in January" returns a list of coordinates. It does not know that the
place at the top has six hours of daylight, that its museums are shut, that the sea is too
cold to swim in, or that getting there costs thirty hours and two connections. It is
technically correct and practically useless — and it is confidently wrong in a way that is
hard to notice, because every individual number it shows you is true.

The failure is structural, not a bug: **a destination in its worst season looks good on
most metrics.** It is cheap, it is uncrowded, flights are available, hotels have vacancies.
Every signal that is easy to measure points the right way. The signals that matter — is
this actually a good idea in February — are editorial, and editorial judgement is exactly
what the automated tools leave out.

## Solution

A private workspace that holds one structured record per trip, and a comparison engine that
answers *where should I go* for **specific dates** against a **curated catalog of places
that are actually worth visiting**.

Three commitments make it different from a search box:

**It knows what it knows.** Every number belongs to one of three tiers, and they never
blur. *Measured* data is fetched from a named source with a date attached. *Curated* data
is editorial judgement with a review date — the seasonal ratings, the cost bands, the
honest flight time. *Personal* data is yours, and a data refresh cannot touch it. The tier
is visible at the point of use, so you always know whether you are looking at an
observation, an opinion, or your own note.

**It shows its working.** The ranking is deterministic arithmetic, not a model's summary.
Every score opens into named factors with their own values and weights. You can disagree
with a specific factor rather than with the tool as a whole — and if you change a
weighting, you can see exactly what moved.

**It refuses to be plausibly wrong.** Two rules exist solely to prevent the failure above.
A destination the catalog rates a poor time to visit has its score scaled down, with the
multiplier shown. Somewhere beyond your travel-time limit is still scored and explained,
but never ranked above somewhere that fits. Both are enforced by regression tests, because
both are the kind of thing that quietly stops working.

## Success looks like

You are deciding where to go in March. You open the app, enter the dates, and say beaches
matter and you will not fly more than fourteen hours. You get a ranked list where the top
answer comes with a paragraph explaining itself, four things in its favour, three against,
and a note that one option was demoted for being twenty-six hours away.

You disagree with one of the weightings, change it, and watch the order shift. You shortlist
two, reject one with the reason preserved, and choose the third.

Six weeks later you come back. The trip still explains itself — what you chose, what you
ruled out, and why. And when you plan the next one, the catalog has improved rather than
reset.

## Out of scope

**Booking.** The product informs decisions and records what was booked elsewhere. It never
transacts and never holds payment details. This is a deliberate limit, not a missing
feature — the moment it books, it needs to be right in a way that a planning tool does not.

**Ranking arbitrary coordinates.** The catalog is curated because the curation *is* the
product. A destination cannot be scored until someone has decided what its months are like.

**Forecasting.** Historical normals until a trip is close enough for a forecast to mean
something, and then they stay labelled as different things.

**Being for everyone.** This is a single-user tool that reflects one person's priorities.
The data model leaves room for other people later; the design does not compromise for them
now.
