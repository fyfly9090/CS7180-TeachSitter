# API Documentation — TeachSitter

**Base URL (production):** `https://teachsitter.vercel.app`
**Base URL (local):** `http://localhost:3000`

All requests and responses use `application/json`. All protected routes require a Supabase session cookie or `Authorization: Bearer <token>` header.

---

## Routes

| Method | Route                                        | Auth    | Description                                                  |
| ------ | -------------------------------------------- | ------- | ------------------------------------------------------------ |
| POST   | `/api/auth/signup`                           | Public  | Register with email + password                               |
| POST   | `/api/auth/login`                            | Public  | Sign in with email + password                                |
| GET    | `/api/teachers/available`                    | Parent  | Search available teachers by date + classroom (Redis-cached) |
| GET    | `/api/teachers/[id]`                         | Auth    | Fetch teacher profile + availability                         |
| PATCH  | `/api/teachers/[id]`                         | Teacher | Update teacher profile (classroom, bio, expertise)           |
| POST   | `/api/teachers/[id]/availability`            | Teacher | Add an availability block                                    |
| DELETE | `/api/teachers/[id]/availability/[avail_id]` | Teacher | Remove an availability block                                 |
| POST   | `/api/match`                                 | Parent  | AI ranking of available teachers                             |
| POST   | `/api/bookings`                              | Parent  | Create a booking request                                     |
| PATCH  | `/api/bookings/[id]`                         | Teacher | Confirm or decline a booking                                 |
| GET    | `/api/evals`                                 | Admin   | Retrieve historical match eval metrics                       |

---

## Endpoint Details

### `POST /api/auth/signup`

Register a new user.

**Request**

```json
{
  "email": "patricia@example.com",
  "password": "hunter2",
  "role": "parent"
}
```

- `role`: `"parent"` | `"teacher"`

**Response `201`**

```json
{ "user": { "id": "uuid", "email": "patricia@example.com", "role": "parent" } }
```

**Errors:** `400` invalid input · `409` email already registered

---

### `POST /api/auth/login`

Sign in and receive a session token.

**Request**

```json
{
  "email": "patricia@example.com",
  "password": "hunter2"
}
```

**Response `200`**

```json
{ "session": { "access_token": "...", "expires_at": 1234567890 } }
```

**Errors:** `400` invalid input · `401` invalid credentials

---

### `GET /api/teachers/available`

Search for available teachers. Results are Redis-cached per query key.

**Query Parameters**

| Param        | Type         | Required | Description                            |
| ------------ | ------------ | -------- | -------------------------------------- |
| `start_date` | `YYYY-MM-DD` | Yes      | Start of desired date range            |
| `end_date`   | `YYYY-MM-DD` | Yes      | End of desired date range              |
| `classroom`  | string       | No       | Filter by classroom name               |
| `name`       | string       | No       | Filter by teacher name (partial match) |

**Response `200`**

```json
{
  "teachers": [
    {
      "id": "uuid",
      "name": "Tara Smith",
      "classroom": "Sunflower",
      "bio": "5 years experience...",
      "availability": [{ "start_date": "2026-06-16", "end_date": "2026-06-20" }]
    }
  ]
}
```

**Errors:** `400` missing required params · `401` unauthenticated

---

### `GET /api/teachers/[id]`

Fetch a teacher's profile and availability. Any authenticated user can call this endpoint. RLS automatically filters availability: parents see unbooked slots only; the owning teacher sees all their slots.

**Response `200`**

```json
{
  "teacher": {
    "id": "uuid",
    "classroom": "Sunflower",
    "bio": "5 years experience...",
    "full_name": "Ms. Tara Smith"
  },
  "availability": [
    {
      "id": "uuid",
      "start_date": "2026-06-16",
      "end_date": "2026-06-20",
      "start_time": null,
      "end_time": null,
      "is_booked": false
    }
  ]
}
```

**Errors:** `400` invalid ID format · `401` unauthenticated · `404` teacher not found

---

### `PATCH /api/teachers/[id]`

Teacher updates their own profile. Ownership verified.

**Request**

```json
{
  "classroom": "Sunflower Room",
  "bio": "5 years experience with preschoolers.",
  "expertise": ["Art & Crafts", "STEM Activities"]
}
```

**Response `200`**

```json
{ "teacher": { "id": "uuid", "classroom": "Sunflower Room", "bio": "..." } }
```

**Errors:** `400` invalid input · `401` unauthenticated · `403` not teacher / not owner · `404` teacher not found

---

### `POST /api/teachers/[id]/availability`

Add a single availability block for the teacher. Teacher role + ownership required.

**Request**

```json
{ "start_date": "2026-06-16", "end_date": "2026-06-20" }
```

**Response `201`**

```json
{
  "availability": {
    "id": "uuid",
    "teacher_id": "uuid",
    "start_date": "2026-06-16",
    "end_date": "2026-06-20",
    "start_time": null,
    "end_time": null,
    "is_booked": false,
    "created_at": "2026-06-01T10:00:00Z"
  }
}
```

**Errors:** `400` invalid input · `401` unauthenticated · `403` not teacher / not owner · `404` teacher not found

---

### `DELETE /api/teachers/[id]/availability/[avail_id]`

Remove a single availability block. Cannot delete booked blocks (returns 409).

**Response `204`** — no body on success

**Errors:** `400` invalid ID format · `401` unauthenticated · `403` not teacher / not owner · `404` availability not found · `409` availability is booked

---

### `POST /api/match`

AI-powered teacher ranking. Runs Gemini 1.5 Pro and Claude 3.5 Sonnet in parallel; returns first successful response. Logs all inputs/outputs to `match_evals`. LLM-as-judge scores the result asynchronously (0–10).

**Request**

```json
{
  "parent_id": "uuid",
  "child_classroom": "Sunflower",
  "start_date": "2026-06-16",
  "end_date": "2026-06-20",
  "teachers": [{ "id": "uuid", "name": "Tara Smith", "classroom": "Sunflower", "bio": "..." }]
}
```

**Response `200`**

```json
{
  "ranked_teachers": [
    {
      "id": "uuid",
      "name": "Tara Smith",
      "rank": 1,
      "reasoning": "Same classroom as child — highest familiarity."
    }
  ],
  "eval_id": "uuid"
}
```

**Errors:** `400` invalid input · `401` unauthenticated · `502` both AI providers failed

---

### `POST /api/bookings`

Parent creates a booking request for a teacher.

**Request**

```json
{
  "teacher_id": "uuid",
  "start_date": "2026-06-16",
  "end_date": "2026-06-20",
  "message": "Hi Tara, my daughter Lily loved your class!"
}
```

**Response `201`**

```json
{
  "booking": {
    "id": "uuid",
    "parent_id": "uuid",
    "teacher_id": "uuid",
    "start_date": "2026-06-16",
    "end_date": "2026-06-20",
    "status": "pending"
  }
}
```

**Errors:** `400` invalid input · `401` unauthenticated · `409` teacher unavailable for dates

---

### `PATCH /api/bookings/[id]`

Teacher confirms or declines a booking request.

**Request**

```json
{ "status": "confirmed" }
```

- `status`: `"confirmed"` | `"declined"`

**Response `200`**

```json
{ "booking": { "id": "uuid", "status": "confirmed" } }
```

**Errors:** `400` invalid status · `401` unauthenticated · `403` not the booking's teacher · `404` booking not found

---

### `GET /api/evals`

Retrieve historical AI match eval records and judge scores.

**Query Parameters**

| Param    | Type    | Required | Description                                         |
| -------- | ------- | -------- | --------------------------------------------------- |
| `limit`  | integer | No       | Number of records to return (default: 20, max: 100) |
| `offset` | integer | No       | Pagination offset (default: 0)                      |

**Response `200`**

```json
{
  "evals": [
    {
      "id": "uuid",
      "parent_id": "uuid",
      "ranked_teachers": [...],
      "judge_score": 8,
      "created_at": "2026-06-16T10:00:00Z"
    }
  ],
  "total": 42
}
```

**Errors:** `401` unauthenticated · `403` admin only

---

## Error Format

All error responses follow this shape:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "start_date is required"
  }
}
```

Internal error details (stack traces, DB messages) are never exposed to the client.
