# HostelFix API Specification

**Base path:** `/api/v1`

**Health-check path:** `/health`

All request bodies use JSON unless otherwise stated. Field names use camelCase.

**Status legend:**

- **Done:** Implemented.
- **Planned:** Not implemented.

---

## 1. Conventions

### 1.1 Authentication

Users authenticate using an email address and password.

On successful login, the API sets two HTTP-only cookies:

| Cookie         | Purpose                     | Default lifetime |
| -------------- | --------------------------- | ---------------- |
| `accessToken`  | Authenticates API requests  | 15 minutes       |
| `refreshToken` | Allows access-token renewal | 7 days           |

In production, cookies use the `secure` option. The current implementation uses `sameSite=strict`.

Protected endpoints require a valid authenticated session.

### 1.2 Roles

The API supports three roles:

- `student`
- `staff`
- `admin`

New registrations always receive the `student` role. Privileged roles cannot be assigned through public registration.

### 1.3 Standard error response

Errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

Common HTTP status codes:

| Status | Meaning                                        |
| ------ | ---------------------------------------------- |
| 400    | Invalid request or validation failure          |
| 401    | Authentication required or invalid credentials |
| 403    | Authenticated user lacks permission            |
| 404    | Resource not found                             |
| 409    | Conflict or invalid state transition           |
| 413    | Request body too large                         |
| 429    | Rate limit exceeded                            |
| 500    | Unexpected server error                        |

### 1.4 Pagination

List endpoints that support pagination use:

| Parameter | Type    | Default | Description                            |
| --------- | ------- | ------- | -------------------------------------- |
| `page`    | Integer | 1       | Page number                            |
| `limit`   | Integer | 10      | Number of records per page; maximum 50 |

List responses use pagination metadata where supported.

### 1.5 Resource identifiers

Responses expose MongoDB document identifiers as `id` rather than `_id`. Internal MongoDB version fields are not exposed.

---

## 2. Data models

### 2.1 User

Public user fields:

| Field             | Type    | Description                   |
| ----------------- | ------- | ----------------------------- |
| `id`              | String  | User identifier               |
| `name`            | String  | User's name                   |
| `email`           | String  | User's email address          |
| `role`            | String  | `student`, `staff` or `admin` |
| `isEmailVerified` | Boolean | Email verification status     |
| `createdAt`       | Date    | Creation timestamp            |

Password hashes and verification-token fields are never returned in public user responses.

### 2.2 Hostel

| Field       | Type   | Description              |
| ----------- | ------ | ------------------------ |
| `id`        | String | Hostel identifier        |
| `name`      | String | Unique hostel name       |
| `location`  | String | Optional hostel location |
| `createdAt` | Date   | Creation timestamp       |
| `updatedAt` | Date   | Last update timestamp    |

### 2.3 Room

| Field         | Type   | Description                                              |
| ------------- | ------ | -------------------------------------------------------- |
| `id`          | String | Room identifier                                          |
| `hostel`      | Object | Populated hostel information in formatted room responses |
| `hostel.id`   | String | Hostel identifier                                        |
| `hostel.name` | String | Hostel name                                              |
| `roomNumber`  | String | Room number                                              |
| `floor`       | Number | Optional floor number                                    |
| `createdAt`   | Date   | Creation timestamp                                       |
| `updatedAt`   | Date   | Last update timestamp                                    |

Room numbers must be unique within the same hostel. The same room number may exist in different hostels.

### 2.4 Ticket

| Field           | Type           | Description                    |
| --------------- | -------------- | ------------------------------ |
| `id`            | String         | Ticket identifier              |
| `title`         | String         | Ticket title                   |
| `description`   | String         | Issue description              |
| `category`      | String         | Maintenance category           |
| `priority`      | String         | Ticket priority                |
| `status`        | String         | Current ticket status          |
| `room`          | String         | Room identifier                |
| `reportedBy`    | String         | Reporting user's identifier    |
| `assignedTo`    | String or null | Assigned staff identifier      |
| `isRecurring`   | Boolean        | Indicates a recurring issue    |
| `comments`      | Array          | Embedded ticket comments       |
| `statusHistory` | Array          | Embedded status-change records |
| `createdAt`     | Date           | Creation timestamp             |
| `updatedAt`     | Date           | Last update timestamp          |
| `resolvedAt`    | Date or null   | Resolution timestamp           |
| `confirmedAt`   | Date or null   | Student confirmation timestamp |

Ticket categories:

- `plumbing`
- `electrical`
- `furniture`
- `other`

Priorities:

- `low`
- `medium`
- `high`
- `urgent`

Statuses:

- `open`
- `assigned`
- `in_progress`
- `resolved`
- `closed`

---

## 3. Access rules

| Resource | Action                  | Student                                | Staff          | Admin                     |
| -------- | ----------------------- | -------------------------------------- | -------------- | ------------------------- |
| Tickets  | Create                  | Yes                                    | Yes            | Yes                       |
| Tickets  | List and view           | Own only                               | All            | All                       |
| Tickets  | Edit details            | Own, while open                        | All            | All                       |
| Tickets  | Delete                  | No                                     | No             | Yes                       |
| Tickets  | Assign                  | No                                     | Yes            | Yes                       |
| Tickets  | Status changes          | Confirm or reopen own resolved tickets | Up to resolved | All permitted transitions |
| Tickets  | Comment                 | Own tickets                            | All            | All                       |
| Hostels  | List and view           | Yes                                    | Yes            | Yes                       |
| Hostels  | Create, edit and delete | No                                     | No             | Yes                       |
| Rooms    | List and view           | Yes                                    | Yes            | Yes                       |
| Rooms    | Create, edit and delete | No                                     | Yes            | Yes                       |

A student requesting another student's ticket receives `403 FORBIDDEN`.

---

## 4. Health

### GET `/health`

**Access:** Public

Checks whether the application is running.

**Success: 200**

```json
{
  "status": "ok",
  "uptime": 123.4
}
```

---

## 5. Authentication

### Endpoint summary

| Method | Endpoint                           | Purpose                  | Access        | Success |
| ------ | ---------------------------------- | ------------------------ | ------------- | ------- |
| POST   | `/api/v1/auth/register`            | Register an account      | Public        | 201     |
| GET    | `/api/v1/auth/verify-email`        | Verify email             | Public        | 200     |
| POST   | `/api/v1/auth/resend-verification` | Resend verification link | Public        | 200     |
| POST   | `/api/v1/auth/login`               | Log in                   | Public        | 200     |
| GET    | `/api/v1/auth/me`                  | Retrieve current user    | Authenticated | 200     |
| DELETE | `/api/v1/auth/logout`              | Log out                  | Authenticated | 200     |

### 5.1 POST `/api/v1/auth/register`

Creates a new student account.

**Request body:**

```json
{
  "name": "Ada Student",
  "email": "ada@example.com",
  "password": "at-least-8-characters",
  "passwordConfirmation": "at-least-8-characters"
}
```

All fields are required. The password must be at least eight characters and match `passwordConfirmation`.

The email is normalised to lowercase. Unknown fields, including `role`, are rejected.

**Success: 201**

Returns a message and the newly created public user information. A verification email is sent.

If the email provider fails, the account remains created and the user can request another verification link.

**Errors:**

- `400 VALIDATION_ERROR`
- `409 CONFLICT`
- `429 RATE_LIMITED`

### 5.2 GET `/api/v1/auth/verify-email`

Verifies a user's email address.

**Query parameters:**

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `email`   | String | Yes      |
| `token`   | String | Yes      |

Verification tokens expire after 15 minutes. Only a hash of the token is stored.

**Success: 200**

```json
{
  "message": "Email verified successfully. You can now log in."
}
```

The same success response is returned if the email has already been verified.

**Errors:**

- `400 INVALID_VERIFICATION_LINK`

The same error response is used for an invalid, used or expired token and an unknown email.

### 5.3 POST `/api/v1/auth/resend-verification`

Requests a new email verification link.

**Request body:**

```json
{
  "email": "ada@example.com"
}
```

**Success: 200**

Returns a consistent message regardless of whether the account exists or is already verified.

**Errors:**

- `400 VALIDATION_ERROR`
- `429 RATE_LIMITED`

### 5.4 POST `/api/v1/auth/login`

Authenticates a user.

**Request body:**

```json
{
  "email": "ada@example.com",
  "password": "at-least-8-characters"
}
```

**Success: 200**

Sets the `accessToken` and `refreshToken` cookies.

```json
{
  "message": "Login successful",
  "user": {
    "id": "6710ef00a1b2c3d4e5f60002",
    "name": "Ada Student",
    "email": "ada@example.com",
    "role": "student"
  }
}
```

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED` for an unknown email or incorrect password
- `403 EMAIL_NOT_VERIFIED`
- `429 RATE_LIMITED`

Unknown emails and incorrect passwords return the same authentication error message.

### 5.5 GET `/api/v1/auth/me`

Retrieves the currently authenticated user's information.

**Access:** Authenticated users.

**Success: 200**

```json
{
  "user": {
    "id": "6710ef00a1b2c3d4e5f60002",
    "name": "Ada Student",
    "email": "ada@example.com",
    "role": "student"
  }
}
```

The user information is obtained from the authenticated session. Password hashes and private authentication fields are not returned.

**Errors:**

- `401 UNAUTHORIZED`

### 5.6 DELETE `/api/v1/auth/logout`

Logs out the authenticated user.

The session is invalidated and both authentication cookies are cleared.

**Success: 200**

```json
{
  "status": "success"
}
```

**Errors:**

- `401 UNAUTHORIZED`

---

## 6. Tickets

All ticket endpoints require authentication.

### Endpoint summary

| Method | Endpoint                       | Purpose               | Access                                        |
| ------ | ------------------------------ | --------------------- | --------------------------------------------- |
| POST   | `/api/v1/tickets`              | Create ticket         | Authenticated                                 |
| GET    | `/api/v1/tickets`              | List tickets          | Authenticated                                 |
| GET    | `/api/v1/tickets/:id`          | Retrieve ticket       | Authenticated                                 |
| PATCH  | `/api/v1/tickets/:id`          | Update ticket details | Authenticated, role and ownership rules apply |
| DELETE | `/api/v1/tickets/:id`          | Delete ticket         | Admin                                         |
| PATCH  | `/api/v1/tickets/:id/assign`   | Assign ticket         | Staff, admin                                  |
| PATCH  | `/api/v1/tickets/:id/status`   | Change ticket status  | Role and ownership rules apply                |
| POST   | `/api/v1/tickets/:id/comments` | Add comment           | Authenticated, role and ownership rules apply |

### 6.1 POST `/api/v1/tickets`

Creates a maintenance ticket.

**Request body:**

```json
{
  "title": "Leaking tap in room B12",
  "description": "The bathroom tap has been dripping since Monday.",
  "category": "plumbing",
  "priority": "medium",
  "room": "6710efa1a1b2c3d4e5f60001"
}
```

Required fields:

- `title`
- `description`
- `category`
- `room`

Optional field:

- `priority`

The server sets `reportedBy`, `status`, `isRecurring` and the initial status history.

**Success: 201**

Returns the created ticket with `status: "open"`.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `404 ROOM_NOT_FOUND`
- `409 DUPLICATE_TICKET`

An unresolved ticket in the same room and category prevents another report from being created. Unresolved statuses are `open`, `assigned` and `in_progress`.

A new report may be created after the previous ticket is resolved. If the same room and category had a ticket within the preceding 30 days, the new ticket is marked as recurring.

### 6.2 GET `/api/v1/tickets`

Lists tickets.

Students can only see their own tickets. Staff and admins can see all tickets.

**Query parameters:**

| Parameter  | Type     | Description                              |
| ---------- | -------- | ---------------------------------------- |
| `page`     | Integer  | Page number; default 1                   |
| `limit`    | Integer  | Records per page; default 10, maximum 50 |
| `status`   | Enum     | Filter by ticket status                  |
| `priority` | Enum     | Filter by priority                       |
| `category` | Enum     | Filter by category                       |
| `room`     | ObjectId | Filter by room                           |
| `sort`     | String   | `createdAt` or `-createdAt`              |

The default sort order is newest first.

**Success: 200**

Returns a paginated list of ticket objects.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

### 6.3 GET `/api/v1/tickets/:id`

Retrieves a ticket, including its comments and status history.

**Success: 200**

Returns the requested ticket.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`

### 6.4 PATCH `/api/v1/tickets/:id`

Updates ticket details.

Permitted fields:

- `title`
- `description`
- `category`
- `priority`

At least one field is required.

Students may only edit their own tickets while the ticket is `open`. Staff and admins have broader editing permissions.

Fields such as `status`, `room`, `reportedBy`, `assignedTo` and `isRecurring` cannot be modified through this endpoint.

**Success: 200**

Returns the updated ticket.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 TICKET_LOCKED`

### 6.5 DELETE `/api/v1/tickets/:id`

Deletes a ticket permanently.

**Access:** Admin only.

**Success: 204**

No response body.

**Errors:**

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`

### 6.6 PATCH `/api/v1/tickets/:id/assign`

Assigns a ticket to a staff member or admin.

**Request body:**

```json
{
  "assignedTo": "6710ef00a1b2c3d4e5f60003"
}
```

Assigning an open ticket moves it to `assigned`. An already assigned or in-progress ticket can be reassigned without changing its status.

**Access:** Staff and admins.

**Success: 200**

Returns the updated ticket.

**Errors:**

- `400 VALIDATION_ERROR` or `INVALID_ASSIGNEE`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND` or `USER_NOT_FOUND`
- `409 INVALID_TRANSITION`

### 6.7 PATCH `/api/v1/tickets/:id/status`

Changes a ticket's status.

**Request body:**

```json
{
  "status": "in_progress"
}
```

The server validates the requested transition against the ticket's current status.

| Current status | New status    | Permitted user                              |
| -------------- | ------------- | ------------------------------------------- |
| `open`         | `assigned`    | Staff or admin, through the assign endpoint |
| `assigned`     | `in_progress` | Staff or admin                              |
| `in_progress`  | `resolved`    | Staff or admin                              |
| `resolved`     | `closed`      | Reporting student or admin                  |
| `resolved`     | `in_progress` | Reporting student or admin                  |

Every successful transition adds a status history record containing `from`, `to`, `changedBy` and `changedAt`.

When a ticket is resolved, `resolvedAt` is set. When reopened, `resolvedAt` is cleared. When confirmed and closed, `confirmedAt` is set.

A closed ticket cannot be changed.

**Success: 200**

Returns the updated ticket.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 INVALID_TRANSITION`

### 6.8 POST `/api/v1/tickets/:id/comments`

Adds a comment to a ticket.

**Request body:**

```json
{
  "body": "The plumber came but the leak is still there."
}
```

The comment body is required and must contain between 1 and 500 characters.

The author is taken from the authenticated user.

**Access:** The reporting student, staff and admins.

**Success: 201**

Returns the updated ticket.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`

---

## 7. Hostels

### Endpoint summary

| Method | Endpoint                          | Purpose                | Access        |
| ------ | --------------------------------- | ---------------------- | ------------- |
| GET    | `/api/v1/hostels`                 | List hostels           | Authenticated |
| GET    | `/api/v1/hostels/:id`             | Retrieve a hostel      | Authenticated |
| POST   | `/api/v1/hostels`                 | Create hostel          | Admin         |
| PATCH  | `/api/v1/hostels/:id`             | Update hostel          | Admin         |
| DELETE | `/api/v1/hostels/:id`             | Delete hostel          | Admin         |
| GET    | `/api/v1/hostels/:hostelId/rooms` | List rooms in a hostel | Authenticated |
| POST   | `/api/v1/hostels/:hostelId/rooms` | Add room to a hostel   | Staff, admin  |

### 7.1 Hostel creation and update

**Request body:**

```json
{
  "name": "Block A",
  "location": "North Campus"
}
```

For creation, `name` is required and must contain between 2 and 100 characters. `location` is optional and may contain up to 200 characters.

Updates require at least one valid field.

**Success:**

- `201` for creation
- `200` for update

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`

Hostel names must be unique. A hostel containing rooms cannot be deleted and returns `409 HOSTEL_HAS_ROOMS`.

### 7.2 GET `/api/v1/hostels/:hostelId/rooms`

Lists rooms belonging to a particular hostel.

**Access:** Any authenticated user, including students.

Supports pagination where provided by the list endpoint.

**Success: 200**

Returns a paginated list of rooms. Each room uses the formatted room response structure described in the Rooms section.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `404 NOT_FOUND`

### 7.3 POST `/api/v1/hostels/:hostelId/rooms`

Creates a room under a hostel.

**Request body:**

```json
{
  "roomNumber": "B12",
  "floor": 2
}
```

`roomNumber` is required and must contain between 1 and 20 characters.

`floor` is optional and must be an integer greater than or equal to zero.

**Access:** Staff and admins.

**Success: 201**

Returns the created room using the formatted room response structure.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`

Room numbers must be unique within the same hostel.

---

## 8. Rooms

### Endpoint summary

| Method | Endpoint                | Purpose         | Access        |
| ------ | ----------------------- | --------------- | ------------- |
| GET    | `/api/v1/rooms`         | List rooms      | Authenticated |
| GET    | `/api/v1/rooms/:roomId` | Retrieve a room | Authenticated |
| PATCH  | `/api/v1/rooms/:roomId` | Update a room   | Staff, admin  |
| DELETE | `/api/v1/rooms/:roomId` | Delete a room   | Staff, admin  |

### 8.1 Formatted room response

Room endpoints return a populated hostel object rather than exposing only the hostel ObjectId.

Example:

```json
{
  "id": "6710efa1a1b2c3d4e5f60001",
  "hostel": {
    "id": "6710efa1a1b2c3d4e5f60010",
    "name": "Block A"
  },
  "roomNumber": "B12",
  "floor": 2,
  "createdAt": "2026-10-14T09:30:00.000Z",
  "updatedAt": "2026-10-14T09:30:00.000Z"
}
```

`floor` is omitted when no floor value has been assigned.

### 8.2 GET `/api/v1/rooms`

Lists rooms, with an optional hostel filter and pagination.

**Access:** Any authenticated user, including students.

**Success: 200**

Returns a paginated list of formatted room objects.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

### 8.3 GET `/api/v1/rooms/:roomId`

Retrieves a single room.

**Access:** Any authenticated user.

**Success: 200**

Returns the formatted room object.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `404 NOT_FOUND`

### 8.4 PATCH `/api/v1/rooms/:roomId`

Updates a room.

Permitted fields:

| Field        | Type               | Required |
| ------------ | ------------------ | -------- |
| `roomNumber` | String             | No       |
| `floor`      | Integer, minimum 0 | No       |

At least one valid field must be provided.

**Access:** Staff and admins.

**Success: 200**

Returns the updated formatted room object.

**Errors:**

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`

### 8.5 DELETE `/api/v1/rooms/:roomId`

Deletes a room.

**Access:** Staff and admins.

A room containing tickets cannot be deleted.

**Success: 204**

No response body.

**Errors:**

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 ROOM_HAS_TICKETS`

---

## 9. Design decisions

- **Embedded comments and status history:** These records are normally retrieved with their parent ticket, so embedding keeps related information together.
- **Referenced users, rooms and hostels:** These entities exist independently and may be reused across multiple records.
- **Cookie-based authentication:** Access and refresh tokens are stored in HTTP-only cookies, while stored sessions allow logout to invalidate a session.
- **Server-controlled fields:** Ownership, status and recurring-ticket information are controlled by the backend.
- **Student-only public registration:** Public registration cannot create staff or admin accounts.
- **Email verification:** Accounts must verify their email before logging in.
- **Ownership checks:** Students can only access and manage their own tickets where the permission rules allow it.
- **Two-step ticket resolution:** Staff resolve tickets, while reporting students can confirm or reopen them.
- **Duplicate-report prevention:** Unresolved tickets with the same room and category prevent duplicate reports.
- **Strict validation:** Zod validates request bodies, query parameters and route parameters.
- **Consistent error handling:** Errors are handled centrally and returned in a standard format.
- **Offset pagination:** Page-based pagination is used for the expected application scale.
- **Stable ordering:** List queries use creation time and an identifier as a tie-breaker.
- **Parent deletion protection:** Hostels with rooms and rooms with tickets cannot be deleted.

---

## 10. Known limitations

- Two simultaneous duplicate-ticket requests could pass the duplicate check.
- Comments cannot currently be edited or deleted.
- Rate-limit counters are stored in memory and reset when the application restarts.
- There is no account lockout after repeated failed login attempts.
- There is no dedicated CSRF-token implementation.
- Offset pagination may become less efficient with very large datasets.
- The current cookie configuration may require adjustment when the frontend and backend are deployed on different sites.
