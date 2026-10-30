# HostelFix API

A backend API for reporting and tracking hostel maintenance issues.

**Live API:** https://hostelfix-l7hd.onrender.com (free host, so the first request after a quiet period can take up to a minute)

> **Status:** The API is functionally complete and covered by automated tests: tickets, authentication with email verification, roles and ownership checks, hostels and rooms, assignment, status changes with a student confirm-or-reopen step, comments and a duplicate-report check. Security hardening (rate limiting, a restricted CORS policy and security headers) is planned next. Anything not marked **Done** is planned, not built.

## The problem

In many hostels, a broken fan, a leaking tap or a faulty socket gets reported verbally or through a chain of messages. Reports get lost, nobody knows who is handling what, and the same fault keeps coming back in the same room with no record of it.

HostelFix gives students one place to report an issue, and gives hostel staff one place to assign, track and close it, with a history of every status change.

## Who it is for

- **Students** report issues and follow their progress.
- **Hostel staff** assign, update and resolve tickets, and manage rooms.
- **Admins** manage hostels and everything else.

## Core idea

Each report is a **ticket** that moves through a lifecycle:

`open` → `assigned` → `in_progress` → `resolved` → `closed`

Staff mark a ticket resolved, and the student who reported it confirms the fix (closed) or reopens it. Every status change is recorded with who made it and when. Repeated issues in the same room are flagged so staff can spot recurring faults. A new report is rejected if the same room already has an unresolved ticket in the same category, so one fault does not need ten tickets.

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Authentication | JWT access and refresh tokens in httpOnly cookies, bcrypt password hashing, stored sessions |
| Email | Verification emails through Brevo (production) or Mailtrap (development) |
| Testing | Jest, ts-jest, Supertest, mongodb-memory-server |

**Why MongoDB:** a ticket is read together with its comments and status history, so embedding them in one document avoids joins. Users, hostels and rooms are separate collections and referenced by ID.

## Data model (summary)

Entities: **User**, **Session**, **Hostel**, **Room**, **Ticket** (with embedded comments and status history).

![ERD](./docs/erd.png)

The ERD source is in [`/docs`](./docs), next to the full API spec.

## Architecture

![Architecture](./docs/hostelfix-architecture.png)

A layered monolith. A request passes through auth and validation middleware, then routes and controllers, then services (business rules), then Mongoose models. Every error from any layer goes to one global error handler that returns the standard error format.

## Authentication and access

- Register, then verify your email through the link that is sent, then log in. Login sets `accessToken` and `refreshToken` cookies, and an expired access token is renewed from the refresh token. Logging out invalidates the session.
- New accounts are always **students**. Staff and admin accounts come from the seed script.
- Wrong credentials return 401, an unverified email returns 403, and acting outside your role returns 403.

| | Student | Staff | Admin |
| --- | --- | --- | --- |
| Create a ticket | yes | yes | yes |
| List and view tickets | own only | all | all |
| Edit ticket details | own, while `open` | all | all |
| Delete a ticket | no | no | yes |
| Assign a ticket | no | yes | yes |
| Move a ticket to in progress or resolved | no | yes | yes |
| Confirm or reopen a resolved ticket | own tickets | no | yes |
| Comment on a ticket | own tickets | all | all |
| Hostels (create, edit, delete) | no | no | yes |
| Rooms (create, edit, delete) | no | yes | yes |
| Read hostels and rooms | yes | yes | yes |

## API overview

Base path: `/api/v1`. The full spec, with request bodies, responses and status codes for every endpoint, is in [`/docs/api-spec.md`](./docs/api-spec.md).

| Area | Endpoints | Status |
| --- | --- | --- |
| Health | `GET /health` | Done |
| Auth | `POST /auth/register`, `GET /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`, `DELETE /auth/logout` | Done |
| Tickets | `POST /tickets`, `GET /tickets`, `GET /tickets/:id`, `PATCH /tickets/:id`, `DELETE /tickets/:id` | Done |
| Hostels | `GET /hostels`, `GET /hostels/:id`, `POST /hostels`, `PATCH /hostels/:id`, `DELETE /hostels/:id` | Done |
| Rooms | `GET /rooms`, `GET /rooms/:roomId`, `PATCH /rooms/:roomId`, `DELETE /rooms/:roomId`, `GET` and `POST /hostels/:hostelId/rooms` | Done |
| Ticket workflow | `PATCH /tickets/:id/assign`, `PATCH /tickets/:id/status`, `POST /tickets/:id/comments` | Done |

**Ticket list query parameters:** `page` (default 1), `limit` (default 10, max 50), `status`, `priority`, `category`, `room`, `sort` (`createdAt` or `-createdAt`).

**Errors** always use one format:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": [] } }
```

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

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Then open `.env` and fill in the values.

### Environment variables

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | Port the server listens on (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | Long random strings used to sign tokens |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL` | Token lifetimes in seconds (defaults 900 and 604800) |
| `EMAIL_PROVIDER` | `mailtrap` (default) or `brevo` |
| `MAIL_FROM` | Sender in the form `HostelFix <you@yourdomain.com>`. The address must be verified with the email provider |
| `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS` | Mailtrap SMTP settings (development) |
| `BREVO_API_KEY` | Brevo API key (when `EMAIL_PROVIDER=brevo`) |
| `SERVER_URL` | Public URL of this API, used in verification links |
| `CLIENT_URL` | Front-end URL (default `http://localhost:3000`) |

`.env.example` lists every variable with placeholder values. Never commit your real `.env`. Tests never read `.env`: they use the test values in `tests/setup/set-env.ts` and an in-memory database.

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

This clears the database and creates dummy users (a student, a staff member and an admin, all already verified), a hostel, rooms and tickets. It prints the IDs you need for sample requests and refuses to run when `NODE_ENV=production`. The accounts are for testing only. Their emails and the dummy password are in `src/seed.ts`.

### Sample requests

A Postman collection and two environments (local and live) are in [`/request`](./request). Import them into Postman, select an environment, and log in first with `POST /auth/login` using a seeded account. Postman keeps the cookies, so later requests are authenticated. Then replace `<paste-id-from-seed>` in `roomId` with a room ID from the seed output.

### Test

```bash
npm test                 # run all tests
npm run test:coverage    # run all tests and print the coverage report
```

Tests use an in-memory MongoDB, so they never touch a real database. **The first run downloads a MongoDB binary and can take a few minutes**, and it is cached afterwards. To use a local `mongod` instead, set the `MONGOMS_SYSTEM_BINARY` environment variable to its path. Each test file starts its own in-memory server, and the suite runs two files at a time so the servers can start reliably.

**Current results:** 9 test suites and 108 tests, all passing. Coverage: 95.7% of statements, 84.0% of branches, 91.2% of functions and 95.6% of lines.

**What is tested** (integration tests through the real Express app):
- Authentication: registration (including the rules that block self-assigned roles), email verification and resending, login, wrong-password and unknown-email handling, unverified accounts, token refresh, logout and invalid tokens.
- Tickets: creation, ownership (students see only their own tickets), the duplicate-report check, assignment, the status workflow (allowed, forbidden and skipped steps, confirm and reopen), comments and the status history.
- Hostels and rooms: role rules, listing, pagination, updates, duplicate names and numbers, and the rules that stop deleting a hostel with rooms or a room with tickets.
- The error handler: every error type is turned into the standard format, and unexpected errors never leak their details.

**What is not tested, and why:**
- Real email delivery. The email service is mocked, so the Brevo and Mailtrap code paths are checked by hand.
- The timing of token expiry, and two requests arriving at the same instant (the duplicate check can race).
- The seed script and server startup, which are checked by running them.
- The live deployment, which is checked by hand after each deploy.

The lowest figure is branch coverage. Most of the untested branches are rare error paths and optional fields.

## Project structure

```
docs/            one-pager, work plan, ERD, architecture diagram and API spec
request/         Postman collection and environments
src/
  config/          environment and database setup
  middleware/      authentication, roles, validation, error handler, not-found
  modules/         auth, users, sessions, hostels, rooms, tickets
  common/          route index, shared services (email) and utilities (errors, JWT)
tests/
  setup/           test environment and in-memory database
  helpers/         login helper and data factories
  auth/, tickets/, hostel-rooms/    integration tests by area
```

## Weekly progress

| Week | Focus | Tag |
| --- | --- | --- |
| 1 | Design, data model and core CRUD | `week-1` |
| 2 | Authentication, authorisation, relationships and ticket workflow | `week-2` |
| 3 | Tests, documentation, security and deployment | `week-3` |

## Issue log

Bugs found, options considered and how each was resolved.

| # | Issue | What I tried | Resolution |
| --- | --- | --- | --- |
| 1 | Deploy stuck waiting for the health check even though the app started and connected to the database | Checked the logs, then the route | `/health` was mounted under `/api/v1`, but the host checks `/health` at the root. Moved it to the root, before the routers |
| 2 | Validation failed with "Unrecognized keys: body, query, params" | Compared the middleware with the schemas | The middleware validated `{ body, query, params }` but my schemas described only the body. Wrapped every schema in that shape and used one `validate` for all routes |
| 3 | Query parameters could not be written back after validation | Tried assigning to `req.query` | Express 5 makes `req.query` read-only. Cleaned values are stored in `res.locals` instead |
| 4 | Seed data was not appearing in Atlas | Read the seed output | `.env` pointed at a local database. Pointed it at Atlas and added a log line that prints the database name and host |
| 5 | Every email verification link was rejected as expired | Read the verification code, then logged the checks | The expiry field is hidden by default (`select: false`) and was never loaded, so it always looked expired. Selected both hidden token fields in the query |
| 6 | Registration returned an error after the account had been created | Reproduced with a failing email provider | The email send was awaited and its failure bubbled up, and retrying gave 409. Email failures are now caught and logged, and a resend endpoint exists |
| 7 | Ticket filters were ignored in the list endpoint | Printed the filter object | The student restriction overwrote the whole filter. Added it to the existing filter instead |
| 8 | Login risked accepting any password and leaking the hash in tokens | Reviewed the login handler | `comparePassword` is async and needs `await`, and the token payload omitted the wrong field name. Awaited the comparison and put only the user ID, role and session ID in tokens |
| 9 | Verification emails never arrived, although the app logged success | Checked the app logs, then the email provider's delivery log | The provider accepted the request, then rejected the sending because `MAIL_FROM` still held a placeholder address. Verified a real sender and set `MAIL_FROM` on the host |
| 10 | A student could report a fault again after staff had started working on it | Reviewed the duplicate check | It only looked for `open` tickets. It now checks open, assigned and in progress tickets |
| 11 | Tests could not connect to the in-memory database ("Missing required sub-document 'driver'") | Ran the same connection outside Jest (worked), in a bare Jest test (failed) and in another runner (worked) | The MongoDB driver (7.6 and later) failed to resolve a runtime module inside Jest's sandbox. Passed the `os` module to the driver explicitly in the test setup |
| 12 | A test login failed with a validation error | Read the error from the test helper | The API expected the password in a field called `passwordHash`. Renamed the request field to `password` to match the spec. `passwordHash` stays the stored field |
| 13 | Login returned 500 ("data and hash arguments required") | Logged what reached the function | A leftover `passwordHash` in the function's arguments meant the typed password was never passed. Jest does not type-check here, so only `tsc --noEmit` shows this kind of error |
| 14 | The first test run timed out | Read the output | The first run downloads a MongoDB binary, which exceeded the hook timeout. It is cached afterwards, and the README now warns about it |
| 15 | Logout tests got a 404 | Compared the route with the tests | Logout is `DELETE`, and the tests and docs said `POST`. Corrected both |
| 16 | `deserializeUser` ran twice on the logout route | Compared the router and the route file | It was mounted on the router and on the route. Kept only the router-level one |
| 17 | The test suite failed intermittently with "Instance failed to start within 10000ms" | Compared the failing and passing suites | Every test file started its own database server at the same moment, and some missed the start timeout. Limited Jest to two workers and raised the server start timeout |

## Limitations

- Two reports submitted at the same instant could both pass the duplicate check.
- Comments cannot be edited or deleted.
- Verification emails sent from a free personal address can land in spam, so a verified domain is better for real use.
- Rate limiting, a restricted CORS policy and security headers are not added yet.
- Cookies use `sameSite=strict`, so a front end on a different site would need this relaxed.
- The free host sleeps when idle, so the first request can be slow.
- There is no front end. The API is used through Postman or any HTTP client.

## Author

Ajibona Raheem