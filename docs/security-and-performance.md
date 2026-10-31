# Security and performance notes

What HostelFix does to stay safe and fast, what it does not do, and why.

## Security

### Secrets

- Every secret (database URI, token secrets, email API key) comes from environment variables. The real `.env` is ignored by git, and `.env.example` holds placeholders only.
- Tests never read `.env`. They use fixed test values and an in-memory database, so a test run can never touch real data.

### Passwords and accounts

- Passwords are hashed with bcrypt before they are stored. The hash is hidden from queries by default and never appears in a response or a token.
- Registration always creates a student. A role in the request is rejected, so nobody can sign up as staff or an admin.
- A wrong password and an unknown email return the same 401 message, so the API does not reveal which emails are registered. The same goes for the resend-verification endpoint.
- New accounts must verify their email. The verification token is random, only its hash is stored, and it expires after 15 minutes.

### Sessions and tokens

- Login sets a short-lived access token and a longer-lived refresh token in `httpOnly` cookies, which JavaScript on a page cannot read. In production the cookies are also `secure`, and all cookies use `sameSite=strict`.
- Every login creates a stored session. Logging out invalidates it, so both tokens stop working straight away.
- Tokens carry only the user ID, role and session ID.

### Authorisation

- Every route except health, registration, verification and login needs a logged-in user.
- Roles and ownership are checked in the service layer on every request. Students see and change only their own tickets, and some actions are limited to staff or admins.
- Someone else's ticket returns 403, and the rules are covered by automated tests.

### Input and error handling

- Every request body, query string and path parameter is validated with strict Zod schemas. Unknown fields are rejected, and values must be the expected type, which also blocks MongoDB operator injection such as `{ "$ne": null }`.
- Request bodies are limited to 10 KB. Malformed JSON and oversized bodies return clean 400 and 413 errors.
- One global error handler returns a standard format. Unexpected errors return a generic message and are logged on the server, and stack traces and internal details never reach the client.

### Network protections

- **Rate limiting:** failed logins (10 per 15 minutes per address), sign-ups (10 per hour), verification emails (5 per hour) and the whole API (300 per 15 minutes) are limited. Over the limit, the API returns 429 `RATE_LIMITED`.
- **CORS:** only the configured front-end origin (`CLIENT_URL`) is allowed, with credentials. Other origins receive no CORS headers, so browsers block them.
- **Security headers:** `helmet` sets the standard headers, and the `X-Powered-By` header is removed.
- **Proxy:** the API trusts one proxy hop, so rate limits apply to the real client address behind the host's load balancer.

### Known limitations

- No account lockout after repeated failures. The rate limit slows attacks but does not lock accounts.
- Rate limit counters are kept in memory, so they reset when the server restarts and are not shared between instances.
- No CSRF tokens. `sameSite=strict` cookies are the protection, and a front end on a different site would need a different design.
- No audit log of who did what, apart from the status history on tickets.
- Dependencies are not scanned automatically. Run `npm audit` before each release.
- Verification emails from a free personal sender address can land in spam. A verified domain is better for real use.

## Performance

- **Pagination everywhere:** every list endpoint takes `page` and `limit` (default 10, maximum 50), so a response never returns an unbounded list.
- **Stable ordering:** list results sort by `createdAt` with `_id` as a tiebreaker, so pages stay consistent.
- **Indexes** on the fields the API filters and sorts by: ticket `status`, `room` with `category` and `createdAt` (also used by the duplicate and recurring checks), `reportedBy` and `createdAt`; unique indexes on user email, hostel name and a room number within a hostel.
- **Parallel queries:** list endpoints fetch the page and the total count at the same time.
- **Limits on input size:** the 10 KB body limit and field length limits keep requests cheap to process.

### Known limitations

- Offset pagination (`skip`) slows down on very deep pages. Cursor-based pagination would suit much larger data sets.
- The free host sleeps when idle, so the first request after a quiet period can take up to a minute.
- No caching. The data changes often and the expected load is small.
- Nothing has been load tested, so the figures above are design choices and not measured results.
