# HostelFix API Spec

Base path: `/api/v1` (except `/health`). All bodies are JSON. Field names are camelCase. Resource names are plural nouns.

**Week markers:** W1 = built in Week 1, W2 = Week 2 (auth, roles, status rules). Week 1 endpoints work without login; Week 2 adds auth and ownership checks to them.

## Conventions

### Error format

Every error uses this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "title", "message": "Must be at least 3 characters" }]
  }
}
```

`details` appears only for validation errors. Stack traces are never returned.

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body or query fails validation, or body is empty on update |
| 400 | `INVALID_ID` | A path ID is not a valid ObjectId |
| 401 | `UNAUTHORIZED` | Missing or invalid token (W2) |
| 403 | `FORBIDDEN` | Logged in but not allowed (W2) |
| 404 | `NOT_FOUND` | Ticket does not exist |
| 404 | `ROOM_NOT_FOUND` | Referenced room does not exist |
| 409 | `INVALID_TRANSITION` | Illegal status change (W2) |
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

### Ticket object

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
  "resolvedAt": null
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Required, 3 to 100 characters |
| `description` | string | Required, 10 to 1000 characters |
| `category` | enum | `plumbing`, `electrical`, `furniture`, `other` |
| `priority` | enum | `low`, `medium`, `high`, `urgent`. Default `medium` |
| `status` | enum | `open`, `assigned`, `in_progress`, `resolved`. Starts `open`, set by the server |
| `room` | ObjectId | Must reference an existing room |
| `reportedBy` | ObjectId | Set from the logged-in user in W2. In W1 it is sent in the body (seeded user) as a temporary stand-in |
| `assignedTo` | ObjectId or null | Set only through the assign endpoint (W2) |
| `isRecurring` | boolean | Set by the server: true if the same room already has a ticket of the same category created in the last 30 days |
| `comments`, `statusHistory` | arrays | Embedded in the ticket |

---

## Endpoints (Week 1)

### GET `/health`

Checks that the service is running and can reach the database.

- **Auth:** none
- **200**

```json
{ "status": "ok", "uptime": 123.4 }
```

---

### POST `/api/v1/tickets`

Creates a ticket.

- **Auth:** none in W1. Any logged-in user in W2.
- **Body**

```json
{
  "title": "Leaking tap in room B12",
  "description": "The bathroom tap has been dripping since Monday and the floor is wet.",
  "category": "plumbing",
  "priority": "medium",
  "room": "6710efa1a1b2c3d4e5f60001",
  "reportedBy": "6710ef00a1b2c3d4e5f60002"
}
```

Required: `title`, `description`, `category`, `room` (and `reportedBy` in W1 only). Optional: `priority`. Unknown fields are rejected, and clients cannot set `status`, `assignedTo` or `isRecurring`.

- **201:** the created ticket object, with `status: "open"` and the first `statusHistory` entry.
- **400** `VALIDATION_ERROR` or `INVALID_ID`
- **404** `ROOM_NOT_FOUND`

---

### GET `/api/v1/tickets`

Lists tickets, newest first.

- **Auth:** none in W1. Students see only their own tickets, staff see all (W2).
- **Query parameters**

| Param | Type | Notes |
| --- | --- | --- |
| `page` | integer | Default 1 |
| `limit` | integer | Default 10, max 50 |
| `status` | enum | Filter by status |
| `priority` | enum | Filter by priority |
| `category` | enum | Filter by category |
| `room` | ObjectId | Filter by room |
| `sort` | string | `createdAt` or `-createdAt` (default), `priority` |

- **200:** paginated list, as in the Pagination section above. Each item is a ticket object.
- **400** `VALIDATION_ERROR` for an invalid filter value, `page` or `limit`

---

### GET `/api/v1/tickets/:id`

Returns one ticket, including comments and status history.

- **Auth:** none in W1. Owner or staff in W2.
- **200:** ticket object
- **400** `INVALID_ID`
- **404** `NOT_FOUND`

---

### PATCH `/api/v1/tickets/:id`

Partially updates a ticket's details.

- **Auth:** none in W1. Owner or staff in W2.
- **Body:** any of `title`, `description`, `category`, `priority`. Same validation rules as create.

```json
{ "priority": "high" }
```

`status`, `room`, `reportedBy`, `assignedTo` and `isRecurring` cannot be changed here. Sending any of them returns 400.

- **200:** the updated ticket, with a new `updatedAt`
- **400** `VALIDATION_ERROR` (including an empty body) or `INVALID_ID`
- **404** `NOT_FOUND`

---

### DELETE `/api/v1/tickets/:id`

Deletes a ticket permanently.

- **Auth:** none in W1. Admin only in W2.
- **204:** no body
- **400** `INVALID_ID`
- **404** `NOT_FOUND`

---

## Endpoints (Week 2)

Summaries only. Full detail is written when each one is built.

| Method | Path | Purpose | Auth | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Create an account (always role `student`) | None | 201 | 400, 409 |
| POST | `/api/v1/auth/login` | Log in and receive tokens | None | 200 | 400, 401 |
| PATCH | `/api/v1/tickets/:id/status` | Change status | Staff | 200 | 400, 401, 403, 404, 409 |
| PATCH | `/api/v1/tickets/:id/assign` | Assign a technician | Staff | 200 | 400, 401, 403, 404 |
| POST | `/api/v1/tickets/:id/comments` | Add a comment | Owner or staff | 201 | 400, 401, 403, 404 |

### Status transition rules

```
open → assigned → in_progress → resolved
```

- A ticket moves one step forward at a time. Skipping a step or moving backwards returns 409 `INVALID_TRANSITION`.
- `assigned` requires `assignedTo` to be set.
- Every change appends a `statusHistory` entry (`from`, `to`, `changedBy`, `changedAt`).
- Moving to `resolved` sets `resolvedAt`.
- Resolved tickets cannot be changed further.

---

## Design decisions

- **Embedded comments and status history:** they are only ever read with their ticket, so embedding avoids joins and keeps a ticket's history together.
- **Referenced users and rooms:** they exist independently of tickets and are reused across many tickets.
- **Dedicated status endpoint:** status changes follow rules and create history, so they are not part of the general PATCH.
- **Server-controlled fields:** `status`, `isRecurring` and timestamps are set by the server so clients cannot fake them.
- **`reportedBy` in the W1 body:** a temporary stand-in until authentication exists. It is replaced by the logged-in user in Week 2.
- **Single error format:** one shape for every error makes the API predictable for front-end developers.