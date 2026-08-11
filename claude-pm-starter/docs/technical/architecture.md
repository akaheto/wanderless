# Architecture

Keep this current — it describes the system as it is, not as it was
planned. For the reasoning behind a specific choice, write an ADR instead
of expanding this file with justification.

## Overview
<A short description and, ideally, a diagram (even ASCII) of the major
components and how they connect.>

## Components
### Frontend (`frontend/`)
- **Responsibility**: <UI, routing, client-side state>
- **Talks to**: backend API at `<base URL / env var>`
- **Framework**: Next.js App Router, TypeScript, Tailwind

### Backend (`backend/`)
- **Responsibility**: <API surface, business logic, data access>
- **Framework**: <e.g. FastAPI/Flask/Django — fill in>
- **Depends on**: <database, external services>

### <Additional component name>
- **Responsibility**: <what it does>
- **Depends on**: <other components / external services>
- **Location**: <path in repo>

## Data flow
<How a request/event moves through the system — frontend to backend to
data layer and back — at a level useful to a new contributor.>

## External dependencies
| Service | Purpose | Notes |
|---|---|---|
| | | |
