# HostelFix API

A backend API for reporting and tracking hostel maintenance issues.

> **Status:** Week 1 of the BuildLab Talent Accelerator (Stage 1, Back-End track). The ticket CRUD endpoints are built. Authentication, roles and status transitions come in Week 2. This README grows each week, and anything not marked as done is planned, not built.

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

![ERD](./docs/erd.png)

The ERD source is in [`/docs`](./docs), next to the full API spec.

## API overview

Base path: `/api/v1`

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/health` | Service health check | Done |
| POST | `/api/v1/tickets` | Create a ticket | Done |
| GET | `/api/v1/tickets` | List tickets (paginated, filterable, sortable) | Done |
| GET | `/api/v1/tickets/:id` | Get one ticket | Done |
| PATCH | `/api/v1/tickets/:id` | Update a ticket's details | Done |
| DELETE | `/api/v1/tickets/:id` | Delete a ticket | Done |
| POST | `/api/v1/auth/register`, `/api/v1/auth/login` | Sign up and log in | Week 2 |
| PATCH | `/api/v1/tickets/:id/status`, `/assign` | Status changes and assignment | Week 2 |
| POST | `/api/v1/tickets/:id/comments` | Add a comment | Week 2 |

**List query parameters:** `page` (default 1), `limit` (default 10, max 50), `status`, `priority`, `category`, `room`, `sort` (`createdAt` or `-createdAt`).

**Errors** always use one format:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": [] } }
```

**Week 1 note:** there is no authentication yet, so `reportedBy` is sent in the request body as a temporary stand-in. In Week 2 it is taken from the logged-in user.

The full spec (request and response bodies, status codes) is in [`/docs`](./docs).

## Getting started

### Prerequisites

- Node.js 20 or later
- A MongoDB database (local, or a free MongoDB Atlas cluster)

### Setup

```bash
git clone <repo-url>
cd <repo-folder>
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

### Seed sample data

```bash
npm run seed
```

This clears the database and creates dummy users, a hostel, rooms and tickets. It prints the user and room IDs, which you need for the sample requests. It refuses to run when `NODE_ENV=production`. Seeded accounts are for testing only and use dummy data.

### Sample requests


Import all three files from /request into Postman (the collection and the two environments). Select an environment, then replace `<paste-id-from-seed>` in `studentId` and `roomId` with a student user ID and a room ID from the `npm run seed` output. Run the collection in order: it creates a ticket, saves its ID automatically, and uses it for the get, update and delete requests.

### Test

```bash
npm test
```

## Live API

- **Base URL:** *https://hostelfix-l7hd.onrender.com*
- The API runs on a free host and may take up to a minute to wake up on the first request.

## Project structure

```
docs/        design documents (one-pager, work plan, ERD, API spec)
request/     Postman collection and environment
src/
  config/      environment and database setup
  middleware/  validation, error handler, not-found handler
  modules/     tickets, users, hostels, rooms
  utils/       logger and AppError
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