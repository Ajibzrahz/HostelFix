# HostelFix API

A backend API for reporting and tracking hostel maintenance issues.

> **Status:** Week 1 of the BuildLab Talent Accelerator (Stage 1, Back-End track). This README grows each week. Anything not marked as done is planned, not built.

## The problem

In many hostels, a broken fan, a leaking tap or a faulty socket gets reported verbally or through a chain of messages. Reports get lost, nobody knows who is handling what, and the same fault keeps coming back in the same room with no record of it.

HostelFix gives students one place to report an issue, and gives hostel staff one place to assign, track and close it, with a history of every status change.

## Who it is for

- **Students** report issues and follow their progress.
- **Hostel staff / admins** assign technicians, update status and see recurring faults.

## Core idea

Each report is a **ticket** that moves through a lifecycle:

`open` → `assigned` → `in_progress` → `resolved`

Every status change is recorded with who made it and when. Tickets have a priority, and repeated issues in the same room are flagged so staff can spot recurring faults.

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Testing | Jest, Supertest, mongodb-memory-server |

**Why MongoDB:** a ticket is read together with its comments and status history, so embedding them in one document avoids joins. Users, hostels and rooms are separate collections and referenced by ID.

## Data model (summary)

Entities: **User**, **Hostel**, **Room**, **Ticket** (with embedded comments and status history).

The full ERD and field list are in [`/docs`](./docs) *(added during Week 1)*.

## API overview

Base path: `/api/v1`

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/health` | Service health check | Planned |
| POST | `/tickets` | Create a ticket | Planned |
| GET | `/tickets` | List tickets (paginated, filterable) | Planned |
| GET | `/tickets/:id` | Get one ticket | Planned |
| PATCH | `/tickets/:id` | Update a ticket | Planned |
| DELETE | `/tickets/:id` | Delete a ticket | Planned |

The full spec (request and response bodies, status codes) is in [`/docs`](./docs).

## Getting started

### Prerequisites

- Node.js 20 or later
- A MongoDB database (local, or a free MongoDB Atlas cluster)

### Setup

```bash
git clone https://github.com/Ajibzrahz/HostelFix.git
cd HostelFix
npm install
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Open `.env` and fill in the values (see below).

### Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | Port the server listens on |
| `MONGODB_URI` | MongoDB connection string |
| `NODE_ENV` | `development`, `test` or `production` |

`.env.example` lists every variable with placeholder values. Never commit your real `.env`.

### Run

```bash
npm run dev     # development with auto-reload
npm run build   # compile TypeScript to dist/
npm start       # run the compiled build
```

### Test

```bash
npm test
```

## Live API

- **Base URL:** *(added after deploy)*
- The API runs on a free host and may take up to a minute to wake up on the first request.

## Project structure

```
docs/        design documents (one-pager, work plan, ERD, API spec)
src/         application code
tests/       automated tests
```

## Weekly progress

| Week | Focus | Tag |
| --- | --- | --- |
| 1 | Design, data model and core CRUD | `week-1` |
| 2 | Authentication, authorisation, validation, error handling | `week-2` |
| 3 | Tests, documentation, security, deployment | `week-3` |

## Issue log

Bugs found, options considered and how each was resolved.

| # | Issue | What I tried | Resolution |
| --- | --- | --- | --- |
| 1 | | | |

## Limitations


## Author

Raheem Ajibona