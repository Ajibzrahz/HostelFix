# HostelFix API Spec

Base path: `/api/v1` (except `/health`). All bodies are JSON. Field names are camelCase. Resource names are plural nouns.

**Status legend:** *Done* = built and tested. *Planned* = designed here, not built yet (spec first, then code).

## Conventions

### Authentication

- Users log in with email and password. The server sets two `httpOnly` cookies: `accessToken` (short-lived, 15 minutes by default) and `refreshToken` (7 days by default). In production the cookies are `secure`, and all cookies use `sameSite=strict`.
- Each login creates a **session**. When the access token has expired, a valid refresh token silently issues a new access token cookie. Logging out invalidates the session, so both tokens stop working.
- **Public endpoints:** `/health`, register, verify email, resend verification and login. Every other endpoint needs a logged-in user.
- **Roles:** `student`, `staff`, `admin`. Registration always creates a `student`. Staff and admin accounts are created by seeding or by an admin, never through registration.
- Passwords are hashed with bcrypt. Tokens carry only the user ID, role and session ID, never the password hash.

### Error format

Every error uses this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "body.title", "message": "Too small: expected string to have >=3 characters" }]
  }
}
```

`details` appears only for validation errors. Stack traces are never returned.

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body, query or path parameters fail validation (including an invalid ID in the path, an unknown field, or an empty update body) |
| 400 | `INVALID_ID` | A value cannot be read as an ID (a fallback, since validation normally catches this first) |
| 400 | `INVALID_VERIFICATION_LINK` | Email verification link is wrong or expired |
| 400 | `INVALID_ASSIGNEE` | A ticket is assigned to someone who is not a staff member or an admin |
| 401 | `UNAUTHORIZED` | Not logged in, or wrong email or password at login |
| 403 | `FORBIDDEN` | Logged in but not allowed to do this |
| 403 | `EMAIL_NOT_VERIFIED` | Correct login, but the email address has not been verified |
| 404 | `NOT_FOUND` | Resource does not exist, or the route does not exist |
| 404 | `ROOM_NOT_FOUND` | Referenced room does not exist |
| 404 | `HOSTEL_NOT_FOUND` | Referenced hostel does not exist |
| 404 | `USER_NOT_FOUND` | Referenced user does not exist |
| 409 | `CONFLICT` | A unique value already exists (duplicate email, hostel name, or room number in a hostel) |
| 409 | `HOSTEL_HAS_ROOMS` | Cannot delete a hostel that still has rooms |
| 409 | `ROOM_HAS_TICKETS` | Cannot delete a room that still has tickets |
| 409 | `TICKET_LOCKED` | A student tries to edit a ticket after work has started |
| 409 | `DUPLICATE_TICKET` | An unresolved ticket (open, assigned or in progress) already exists for this room and category |
| 409 | `INVALID_TRANSITION` | Illegal status change, or assigning a resolved or closed ticket |
| 500 | `INTERNAL_ERROR` | Unexpected failure, generic message only |

### Pagination

List endpoints accept `page` (default 1) and `limit` (default 10, max 50) and return:

```json
{
  "data": [],
  "page": 1,
  "limit": 10,
  "total": 42,
  "totalPages": 5
}
```

A `page` beyond the last page returns 200 with an empty `data` array and the correct `total`.

### Objects

**Ticket**

```json
{
  "id": "6710f0c2a1b2c3d4e5f60718",
  "title": "Leaking tap in room B12",
  "description": "The bathroom tap has been dripping since Monday and the floor is wet.",
  "category": "plumbing",
  "priority": "medium",
  "status": "open",
  "room": "6710efa1a1b2c3d4e5f60001",
  "reportedBy": "6710ef00a1b2c3d4e5f60002",
  "assignedTo": null,
  "isRecurring": false,
  "comments": [],
  "statusHistory": [
    {
      "from": null,
      "to": "open",
      "changedBy": "6710ef00a1b2c3d4e5f60002",
      "changedAt": "2026-10-14T09:30:00.000Z"
    }
  ],
  "createdAt": "2026-10-14T09:30:00.000Z",
  "updatedAt": "2026-10-14T09:30:00.000Z",
  "resolvedAt": null,
  "confirmedAt": null
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Required, 3 to 100 characters |
| `description` | string | Required, 10 to 1000 characters |
| `category` | enum | `plumbing`, `electrical`, `furniture`, `other` |
| `priority` | enum | `low`, `medium`, `high`, `urgent`. Default `medium` |
| `status` | enum | `open`, `assigned`, `in_progress`, `resolved`, `closed`. Starts `open`, set by the server |
| `room` | ObjectId | Must reference an existing room |
| `reportedBy` | ObjectId | The logged-in user who created the ticket. Set by the server, never sent by the client |
| `assignedTo` | ObjectId or null | Set only through the assign endpoint |
| `isRecurring` | boolean | Set by the server: true if the same room already has a ticket of the same category created in the last 30 days |
| `comments` | array | Embedded: `author`, `body` (max 500 characters), `createdAt` |
| `statusHistory` | array | Embedded: `from`, `to`, `changedBy`, `changedAt` |
| `resolvedAt` | date or null | Set when staff mark the ticket resolved, cleared if it is reopened |
| `confirmedAt` | date or null | Set when the reporting student confirms the fix |

**Hostel:** `id`, `name` (unique), `location`, `createdAt`, `updatedAt`.

**Room:** `id`, `hostel` (ObjectId), `roomNumber` (unique within its hostel), `floor`, `createdAt`, `updatedAt`.

**User (public fields):** `id`, `name`, `email`, `role`, `isEmailVerified`, `createdAt`. The password hash and verification token fields are never returned.

---

## Access rules

| Resource | Action | Student | Staff | Admin |
| --- | --- | --- | --- | --- |
| Tickets | Create | yes | yes | yes |
| Tickets | List and view | own only | all | all |
| Tickets | Edit details | own, only while `open` | all | all |
| Tickets | Delete | no | no | yes |
| Tickets | Assign | no | yes | yes |
| Tickets | Status changes | confirm or reopen own resolved ticket | up to `resolved` | all |
| Tickets | Comment | own tickets | all | all |
| Hostels | List and view | yes | yes | yes |
| Hostels | Create, edit, delete | no | no | yes |
| Rooms | List and view | yes | yes | yes |
| Rooms | Create, edit, delete | no | yes | yes |

A student who requests another student's ticket gets 403, not 404.

---

## Health

### GET `/health`

Checks that the service is running. Public.

- **200**

```json
{ "status": "ok", "uptime": 123.4 }
```

---

## Auth

| Method | Path | Purpose | Access | Success | Errors | Status |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Create an account | Public | 201 | 400, 409 | Done |
| GET | `/api/v1/auth/verify-email` | Verify an email address | Public | 200 | 400 | Done |
| POST | `/api/v1/auth/resend-verification` | Send a new verification link | Public | 200 | 400 | Done |
| POST | `/api/v1/auth/login` | Log in and receive cookies | Public | 200 | 400, 401, 403 | Done |
| POST | `/api/v1/auth/logout` | Log out and invalidate the session | Logged in | 200 | 401 | Done |

### POST `/api/v1/auth/register`

```json
{
  "name": "Ada Student",
  "email": "ada@example.com",
  "password": "at-least-8-characters",
  "passwordConfirmation": "at-least-8-characters"
}
```

- All four fields are required. `password` must be at least 8 characters and match `passwordConfirmation`. The email is lowercased. Unknown fields (including `role`) are rejected.
- **201:** `{ "message": "...", "user": { ... } }`. A verification link is emailed. If the email provider fails, the account is still created and the message says to request a new link.
- **400** `VALIDATION_ERROR`
- **409** `CONFLICT` if the email is already registered

### GET `/api/v1/auth/verify-email?email=...&token=...`

- The link in the verification email. The token is valid for 15 minutes and only the newest link works. Only a hash of the token is stored.
- **200:** `{ "message": "Email verified successfully. You can now log in." }` (also returned if the email was already verified)
- **400** `INVALID_VERIFICATION_LINK` for a wrong, used or expired token. The same response is returned for an unknown email.

### POST `/api/v1/auth/resend-verification`

```json
{ "email": "ada@example.com" }
```

- **200:** always the same message, whether or not the account exists or is already verified, so the endpoint cannot be used to find out which emails are registered.
- **400** `VALIDATION_ERROR`

### POST `/api/v1/auth/login`

```json
{ "email": "ada@example.com", "password": "at-least-8-characters" }
```

- **200:** sets the `accessToken` and `refreshToken` cookies and returns `{ "message": "Login successful", "user": { "id", "name", "email", "role" } }`
- **400** `VALIDATION_ERROR`
- **401** `UNAUTHORIZED`: one message for both an unknown email and a wrong password
- **403** `EMAIL_NOT_VERIFIED`: checked only after the password is correct

### POST `/api/v1/auth/logout`

- **200:** `{ "status": "success" }`. The session is marked invalid and both cookies are cleared.
- **401** `UNAUTHORIZED` if not logged in

---

## Tickets

All ticket endpoints require a logged-in user.

| Method | Path | Purpose | Success | Errors | Status |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/tickets` | Create a ticket | 201 | 400, 401, 404, 409 | Done |
| GET | `/api/v1/tickets` | List tickets | 200 | 400, 401 | Done |
| GET | `/api/v1/tickets/:id` | Get one ticket | 200 | 400, 401, 403, 404 | Done |
| PATCH | `/api/v1/tickets/:id` | Edit ticket details | 200 | 400, 401, 403, 404, 409 | Done |
| DELETE | `/api/v1/tickets/:id` | Delete a ticket (admin) | 204 | 400, 401, 403, 404 | Done |
| PATCH | `/api/v1/tickets/:id/assign` | Assign a staff member | 200 | 400, 401, 403, 404, 409 | Done |
| PATCH | `/api/v1/tickets/:id/status` | Change status | 200 | 400, 401, 403, 404, 409 | Done |
| POST | `/api/v1/tickets/:id/comments` | Add a comment | 201 | 400, 401, 403, 404 | Done |

### POST `/api/v1/tickets`

```json
{
  "title": "Leaking tap in room B12",
  "description": "The bathroom tap has been dripping since Monday and the floor is wet.",
  "category": "plumbing",
  "priority": "medium",
  "room": "6710efa1a1b2c3d4e5f60001"
}
```

- Required: `title`, `description`, `category`, `room`. Optional: `priority`. Unknown fields are rejected, so clients cannot set `reportedBy`, `status`, `assignedTo` or `isRecurring`.
- **201:** the created ticket, with `status: "open"`, `reportedBy` set to the logged-in user, and the first `statusHistory` entry.
- **404** `ROOM_NOT_FOUND`
- **409** `DUPLICATE_TICKET` if an unresolved ticket (open, assigned or in progress) already exists for the same room and category. Once that ticket is resolved, a new report is allowed and is flagged `isRecurring` if it falls within 30 days.

### GET `/api/v1/tickets`

Lists tickets, newest first. Students see only their own tickets, staff and admins see all.

| Param | Type | Notes |
| --- | --- | --- |
| `page` | integer | Default 1 |
| `limit` | integer | Default 10, max 50 |
| `status` | enum | Filter by status |
| `priority` | enum | Filter by priority |
| `category` | enum | Filter by category |
| `room` | ObjectId | Filter by room |
| `sort` | string | `createdAt` (oldest first) or `-createdAt` (newest first, default) |

- **200:** paginated list of ticket objects
- **400** `VALIDATION_ERROR` for an invalid filter value, `page`, `limit` or `sort`, or an unknown query parameter

### GET `/api/v1/tickets/:id`

- **200:** the ticket, including comments and status history
- **403** `FORBIDDEN` if a student requests someone else's ticket
- **404** `NOT_FOUND`

### PATCH `/api/v1/tickets/:id`

- **Body:** any of `title`, `description`, `category`, `priority`. At least one is required. `status`, `room`, `reportedBy`, `assignedTo` and `isRecurring` cannot be changed here.
- **200:** the updated ticket
- **403** `FORBIDDEN` for a student editing someone else's ticket
- **409** `TICKET_LOCKED` if a student edits a ticket that is no longer `open`

### DELETE `/api/v1/tickets/:id`

- Admin only. Deletes the ticket permanently.
- **204:** no body

### PATCH `/api/v1/tickets/:id/assign`

```json
{ "assignedTo": "6710ef00a1b2c3d4e5f60003" }
```

- Staff and admin only. `assignedTo` must be the ID of an existing staff member or admin.
- Assigning an `open` ticket moves it to `assigned` and adds a status history entry. A ticket that is `assigned` or `in_progress` can be reassigned without a status change.
- **200:** the updated ticket
- **400** `VALIDATION_ERROR`, or `INVALID_ASSIGNEE` if the user is a student
- **404** `NOT_FOUND` (ticket) or `USER_NOT_FOUND` (assignee)
- **409** `INVALID_TRANSITION` if the ticket is `resolved` or `closed`

### PATCH `/api/v1/tickets/:id/status`

```json
{ "status": "in_progress" }
```

- The client sends only the new status. The server knows the current one.
- A move that is not in the table below returns 409 `INVALID_TRANSITION`. A listed move by someone who is not allowed to make it returns 403 `FORBIDDEN`. Admins can make any listed move.
- Every change appends a `statusHistory` entry (`from`, `to`, `changedBy`, `changedAt`).

| From | To | Who | Effect |
| --- | --- | --- | --- |
| `open` | `assigned` | staff, admin | Done through the assign endpoint, not this one |
| `assigned` | `in_progress` | staff, admin | |
| `in_progress` | `resolved` | staff, admin | Sets `resolvedAt` |
| `resolved` | `closed` | reporting student, admin | Student confirms the fix. Sets `confirmedAt` |
| `resolved` | `in_progress` | reporting student, admin | Student reopens it. Clears `resolvedAt` |

A `closed` ticket cannot be changed. A student who is not the reporter gets 403.

- **200:** the updated ticket
- **400** `VALIDATION_ERROR`
- **403** `FORBIDDEN`
- **404** `NOT_FOUND`
- **409** `INVALID_TRANSITION`, also returned if someone else changed the ticket at the same moment

### POST `/api/v1/tickets/:id/comments`

```json
{ "body": "The plumber came but the leak is still there." }
```

- Allowed for the ticket's reporter, staff and admin. The author is the logged-in user. `body` is required, 1 to 500 characters.
- **201:** the updated ticket
- **400** `VALIDATION_ERROR`
- **403** `FORBIDDEN` for a student commenting on someone else's ticket
- **404** `NOT_FOUND`

---

## Hostels

| Method | Path | Purpose | Access | Success | Errors | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/hostels` | List hostels (paginated) | Logged in | 200 | 400, 401 | Done |
| GET | `/api/v1/hostels/:id` | Get one hostel | Logged in | 200 | 400, 401, 404 | Done |
| POST | `/api/v1/hostels` | Create a hostel | Admin | 201 | 400, 401, 403, 409 | Done |
| PATCH | `/api/v1/hostels/:id` | Update a hostel | Admin | 200 | 400, 401, 403, 404, 409 | Done |
| DELETE | `/api/v1/hostels/:id` | Delete a hostel | Admin | 204 | 400, 401, 403, 404, 409 | Done |
| GET | `/api/v1/hostels/:hostelId/rooms` | List a hostel's rooms (paginated) | Logged in | 200 | 400, 401, 404 | Done |
| POST | `/api/v1/hostels/:hostelId/rooms` | Add a room to a hostel | Staff, admin | 201 | 400, 401, 403, 404, 409 | Done |

- **Create and update body:** `name` (required on create, 2 to 100 characters) and `location` (optional, up to 200 characters). Update needs at least one field.
- **409** `CONFLICT` for a duplicate hostel name. Deleting a hostel that still has rooms returns 409 `HOSTEL_HAS_ROOMS`.
- **Add a room body:** `roomNumber` (required, 1 to 20 characters) and `floor` (optional integer, 0 or more). The same room number can exist in different hostels, but not twice in one hostel (409 `CONFLICT`).

## Rooms

| Method | Path | Purpose | Access | Success | Errors | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/rooms` | List rooms (paginated, optional `hostel` filter) | Logged in | 200 | 400, 401 | Done |
| GET | `/api/v1/rooms/:roomId` | Get one room | Logged in | 200 | 400, 401, 404 | Done |
| PATCH | `/api/v1/rooms/:roomId` | Update `roomNumber` or `floor` | Staff, admin | 200 | 400, 401, 403, 404, 409 | Done |
| DELETE | `/api/v1/rooms/:roomId` | Delete a room | Staff, admin | 204 | 400, 401, 403, 404, 409 | Done |

Deleting a room that still has tickets returns 409 `ROOM_HAS_TICKETS`.

---

## Design decisions

- **Embedded comments and status history:** they are only ever read with their ticket, so embedding avoids joins and keeps a ticket's history together.
- **Referenced users, rooms and hostels:** they exist independently of tickets and are reused across many tickets.
- **Cookie sessions with access and refresh tokens:** short-lived access tokens limit the damage of a stolen token, and a stored session means logout takes effect immediately.
- **Server-controlled fields:** `reportedBy`, `status`, `isRecurring` and timestamps are set by the server so clients cannot fake them.
- **Registration always creates a student:** a role field is rejected, so nobody can sign up as an admin.
- **One message for failed logins:** an unknown email and a wrong password look the same, so attackers cannot learn which emails exist.
- **Email verification:** new accounts must verify their email before logging in. Only a hash of the token is stored, and it expires after 15 minutes.
- **403 for someone else's ticket:** a student who requests another student's ticket gets 403. This confirms the ticket exists, which is acceptable here.
- **Students cannot edit once work starts:** after a ticket leaves `open`, only staff and admins can change its details.
- **Assigning moves the ticket to `assigned`:** one step instead of two, so a ticket cannot be assigned without its status reflecting it.
- **Two-step closing:** staff mark a ticket `resolved`, and the reporting student confirms (`closed`) or reopens it, so tickets are not closed while the fault is still there.
- **Status changes are checked against the current status:** the update only applies if the ticket still has the status it had when it was read, so two people cannot apply conflicting changes at once.
- **Duplicate-report check:** creating a ticket for a room and category that already has an unresolved ticket is rejected without revealing the other ticket, so one fault does not need ten tickets. Two reports submitted at the same instant could both pass the check, which is acceptable at this scale.
- **Staff manage rooms, only admins manage hostels:** rooms change often, hostels rarely.
- **Parents with children cannot be deleted:** a hostel with rooms or a room with tickets returns 409 instead of leaving orphaned records.
- **One validation step:** every route validates body, query and path parameters together with Zod, and every error goes through one global handler.
- **Hard delete:** deleting a ticket removes it permanently. A production system might keep resolved tickets for an audit trail.
- **`isRecurring` is decided at creation:** it is not recalculated when a ticket's category is edited.
- **Offset pagination:** `page` and `limit` are simple and fit the expected data size. Cursor-based pagination would suit much larger data sets.
- **Stable ordering:** list results sort by `createdAt` with `_id` as a tiebreaker, so a ticket cannot appear on two pages or be skipped.
- **Unknown fields are rejected:** request bodies and query strings are validated strictly.
- **`id` instead of `_id`:** responses expose `id` and omit MongoDB's internal `__v`.