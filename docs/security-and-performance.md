# Security and Performance

This document explains what HostelFix does to stay secure and efficient, the limitations that remain, and the reasons behind its design choices.

## Security

### Secrets and Environment Variables

- Every secret, including the database URI, token secrets, and email API keys, is supplied through environment variables.
- The actual `.env` file is excluded from Git, while `.env.example` contains placeholders for the required configuration.
- Tests use fixed test values and an in-memory database rather than reading the real `.env` file. This prevents test runs from accidentally connecting to the production database.

### Passwords and Accounts

- Passwords are hashed with bcrypt before they are stored. Password hashes are excluded from queries by default and are never included in API responses or JWT payloads.
- Registration always creates a student account. A role supplied in the registration request is rejected, preventing users from registering themselves as staff or administrators.
- An incorrect password and an unknown email address return the same 401 response, preventing the API from revealing whether an email address is registered. The resend-verification endpoint follows the same principle.
- New accounts must verify their email address. Verification tokens are randomly generated, only their hashes are stored, and they expire after 15 minutes.

### Sessions and Tokens

- Login sets a short-lived access token and a longer-lived refresh token in `httpOnly` cookies, which JavaScript running in the browser cannot read.
- In production, cookies are also marked `secure`. The current cookie configuration uses `sameSite: "strict"`.
- Every login creates a stored session. Logging out invalidates the session and clears the authentication cookies, preventing the invalidated session's tokens from being used.
- Tokens contain only the user ID, role, and session ID.

### Authorisation

- Protected routes require an authenticated user. Public routes include health checks, registration, email verification, login, resend verification, and password recovery.
- Role-based permissions and resource ownership are checked in the service layer.
- Students can access and manage only their own tickets, while certain operations are restricted to staff or administrators.
- Attempts to access another user's ticket return a 403 Forbidden response.
- Authorisation and ownership rules are covered by automated tests.

### Input Validation and Error Handling

- Request bodies, query strings, and path parameters are validated using strict Zod schemas.
- Unknown fields are rejected, and values must match their expected types. This helps prevent unexpected input, including MongoDB operator injection attempts such as `{ "$ne": null }`.
- Request bodies are limited to 10 KB.
- Malformed JSON and oversized request bodies return controlled 400 and 413 responses respectively.
- A global error handler provides a consistent error response format.
- Unexpected errors are logged on the server, while clients receive generic messages. Stack traces and internal implementation details are not exposed through API responses.

### Network Protections

- **Rate limiting:** Failed login attempts are limited to 10 per 15 minutes per address, sign-ups to 10 per hour, verification emails to 5 per hour, and general API requests to 300 per 15 minutes. Requests exceeding the configured limits receive a 429 `RATE_LIMITED` response.
- **CORS:** The API allows configured frontend origins supplied through `CLIENT_URL`, with credentials enabled. Browsers block frontend JavaScript from accessing responses that do not have the appropriate CORS headers.
- **Security headers:** Helmet sets standard HTTP security headers, and the `X-Powered-By` header is removed.
- **Proxy configuration:** The API trusts one proxy hop so that client IP addresses can be identified correctly when requests pass through the hosting provider's load balancer.

### Known Security Limitations

- **No account lockout:** Repeated failed login attempts do not permanently lock an account. Rate limiting slows repeated attempts but does not replace an account-lockout mechanism.
- **In-memory rate limits:** Rate-limit counters are stored in memory. They reset when the server restarts and are not shared between multiple application instances.
- **No CSRF tokens:** The current implementation does not use dedicated CSRF tokens. It relies on `sameSite: "strict"` cookies as an additional browser-level protection. If the frontend and backend are deployed on different sites and the cookie policy must change, the authentication design should be reviewed and additional CSRF protection considered.
- **No general audit log:** The application does not maintain a complete audit trail of user actions. Ticket status history provides a record of status changes, but it is not a replacement for a system-wide audit log.
- **No automatic dependency scanning:** Dependencies are not automatically scanned for vulnerabilities. Run `npm audit` and review the results before releases.
- **Email deliverability:** Verification emails sent using a free personal sender address may be delivered to spam folders. A verified sending domain is recommended for production use.

## Performance

### Pagination

- List endpoints use pagination through `page` and `limit` query parameters.
- The default page size is 10, and the maximum is 50.
- Pagination prevents list endpoints from returning unbounded amounts of data in a single response.

### Stable Ordering

- List results are ordered by `createdAt`, with `_id` used as a tie-breaker.
- This provides a consistent ordering when records share the same creation timestamp and helps keep paginated results predictable.

### Database Indexes

Indexes are defined for fields commonly used in filtering, sorting, and lookup operations, including:

- Ticket `status`.
- Ticket `room`, `category`, and `createdAt`, which are also used by duplicate and recurring-ticket checks.
- Ticket `reportedBy` and `createdAt`.
- Unique user email addresses.
- Unique hostel names.
- Room numbers within a hostel.

These indexes help MongoDB locate relevant records without unnecessarily scanning entire collections.

### Parallel Queries

- List endpoints retrieve the requested page of records and the total record count in parallel.
- This avoids waiting for one database operation to finish before starting the other.

### Request Size and Validation Limits

- The 10 KB request-body limit prevents unnecessarily large request payloads.
- Field-length and schema validation limits help keep incoming requests predictable and reduce unnecessary processing.

### Known Performance Limitations

- **Offset pagination:** The current pagination approach uses `skip`, which can become slower when navigating very deep pages. Cursor-based pagination would be more suitable for significantly larger datasets.
- **Hosting performance:** Response times depend on the hosting provider and allocated resources. Small or scaled-down instances may experience slower responses after periods of inactivity. Actual cold-start behaviour should be measured on the deployed Hostless service rather than assumed.
- **No caching:** The application does not currently implement a caching layer. Since the expected workload is relatively small and application data changes frequently, database queries are used directly.
- **No load testing:** The application has not undergone formal load testing. The configured limits and performance choices are design decisions, not guarantees based on measured production traffic.

## Summary

HostelFix uses password hashing, session-backed JWT authentication, input validation, role and ownership checks, rate limiting, security headers, pagination, and database indexes to provide a safer and more efficient backend.

However, it is still an evolving project. Distributed rate limiting, dedicated CSRF protection where required, audit logging, automated dependency scanning, caching, cursor-based pagination, and formal load testing are potential areas for future improvement.
