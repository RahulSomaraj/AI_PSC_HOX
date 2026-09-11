# API_CONTRACT.md

The endpoint surface, for the frontend team.

Built up additively: each developer documents their own endpoints in their
own section as they ship them (see `CLAUDE.md` §4). Sections for endpoints
that predate this file get written as those endpoints are next touched.

Unless noted, every endpoint needs `Authorization: Bearer <jwt>`.

> **Response envelope differs by environment.** In development the response
> interceptor wraps everything as `{ status, message, data }`; in production
> it is not registered and the bare object is returned. The bodies below are
> the bare object.

---

## Uploads

### `POST /uploads`

Signs a single direct-to-storage upload. File bytes never pass through the
API: the client PUTs to `uploadUrl`, then sends `fileUrl` on whatever create
call the file belongs to.

**Roles:** `admin`, `staff`

**Request**

```json
{
  "purpose": "content",
  "fileName": "kerala-psc-2024-notes.pdf",
  "contentType": "application/pdf",
  "contentLength": 2400000
}
```

| Field | Notes |
|---|---|
| `purpose` | `content`, `question` or `avatar`. Selects the key prefix, the accepted content types and the size limit. |
| `fileName` | Original name, for you to store as a display name. It does **not** become the object key. |
| `contentType` | Exact MIME type. Goes into the signature. |
| `contentLength` | Exact size in bytes. Goes into the signature. |

**Response `201`**

```json
{
  "uploadUrl": "https://psc-uploads.s3.ap-south-1.amazonaws.com/content/2026/09/3f1ab2c4-....pdf?X-Amz-Algorithm=...",
  "fileUrl": "https://psc-uploads.s3.ap-south-1.amazonaws.com/content/2026/09/3f1ab2c4-....pdf",
  "key": "content/2026/09/3f1ab2c4-....pdf",
  "expiresAt": "2026-09-11T10:35:00.000Z",
  "requiredHeaders": {
    "Content-Type": "application/pdf",
    "Content-Length": "2400000"
  }
}
```

**Then PUT the file.** `requiredHeaders` is not advisory — the content type
and the byte length are part of the signature, so storage recomputes it over
them and answers `403` if either differs. A URL signed for a 2 MB PDF cannot
be used to upload anything else.

```js
await fetch(uploadUrl, {
  method: 'PUT',
  headers: requiredHeaders,
  body: file,
});
```

Single use, and valid for 5 minutes by default. Sign at the moment of upload,
not when the form opens.

**Limits by purpose**

| Purpose | Accepts | Max |
|---|---|--:|
| `content` | png, jpeg, webp, pdf, mp4, docx, pptx | 200 MB |
| `question` | png, jpeg, webp | 5 MB |
| `avatar` | png, jpeg, webp | 2 MB |

**Errors**

| Status | When |
|---|---|
| `413` | `contentLength` is over the limit for the purpose |
| `415` | `contentType` is not accepted for the purpose |
| `503` | Storage is not configured on this server (`S3_BUCKET` unset) |

---

## Dashboard

Admin home screen. All four need `admin`.

`GET /dashboard` is a separate, older endpoint that returns the
`GET /enrollments/stats` payload. It lives on `AppController` and is
unchanged — the routes below are additions beside it, not replacements.

### `GET /dashboard/summary`

The KPI tiles across the top, in one round trip.

**Roles:** `admin`

**Response `200`**

```json
{
  "totalStudents": 1240,
  "activeBatches": 18,
  "activeSubscriptions": 842
}
```

| Field | Notes |
|---|---|
| `totalStudents` | Non-deleted accounts with `role=user`. Same figure as `GET /users/count?role=user`. |
| `activeBatches` | Batches whose `status` is `active` **or** `ongoing` — see the caveat below. |
| `activeSubscriptions` | Not expired, not cancelled, held by a live user. Same figure as `GET /subscriptions/stats/active-count`. |

> **Caveat on `activeBatches`.** `batches.status` carries two unrelated ideas
> in one column: `active`/`inactive` are admin intent, `upcoming`/`ongoing`
> are lifecycle. A batch running right now may legitimately hold either
> `active` or `ongoing`, so both are counted. If the product owner means
> admin intent only, this becomes `status = 'active'` and the number drops.

### `GET /dashboard/recent-questions`

The newest questions, for the "recently added" list.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `limit` | 1–50, default 5. |

**Response `200`**

```json
[
  {
    "id": 4821,
    "question": "Which article of the Constitution deals with the right to equality?",
    "difficulty": 3,
    "subject": { "id": 12, "name": "Indian Polity" },
    "createdAt": "2026-09-11T06:12:44.000Z"
  }
]
```

Newest first. `subject` is `null` when the question is untagged. Retired
questions (`isActive: false`) are excluded. `question` is the full text,
untruncated — the client decides how much to show.

### `GET /dashboard/exam-attempts`

Attempts per day, for the activity chart.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `days` | 1–90, default 7. |

**Response `200`**

```json
[
  { "date": "2026-09-09", "count": 7 },
  { "date": "2026-09-10", "count": 0 },
  { "date": "2026-09-11", "count": 63 }
]
```

Counts attempt rows by `createdAt`, whatever their status — an attempt left
`pending` and never started still counts.

### `GET /dashboard/dau`

Daily active students, for the engagement chart.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `days` | 1–90, default 7. |

**Response `200`** — same shape as `exam-attempts`:

```json
[
  { "date": "2026-09-10", "count": 0 },
  { "date": "2026-09-11", "count": 148 }
]
```

Distinct students seen on each day, counted from presence tracking.

**Both series are oldest first and gap-filled.** A day with no activity comes
back as `count: 0` rather than being absent, so the chart draws a continuous
line instead of joining across a missing point. Both bucket the day by
`ACTIVITY_TIMEZONE` (default `Asia/Kolkata`), so the two charts share a day
boundary and can be overlaid.

### Not built

`GET /dashboard/upcoming-exams` — nothing in the catalogue carries a date, so
there is no schedule to read. Blocked on decision **D1** in `CLAUDE.md` §5.
The "Today's Exams" tile has no source until that is settled.

---

## Settings

### `GET /settings/roles`

The faculty roles an admin can assign. These are **job titles on a faculty
record**, not account permissions — permissions are the `user` / `admin` /
`staff` role carried on the JWT.

**Roles:** `admin`

**Response `200`**

```json
[
  { "value": "teacher", "label": "Teacher" },
  { "value": "reviewer", "label": "Reviewer" },
  { "value": "content_creator", "label": "Content Creator" }
]
```

Send `value` when writing a faculty record (`POST /faculty`, `PATCH
/faculty/:id`) or filtering one (`GET /faculty?role=`); show `label`.

Identical to the `roles` key of `GET /faculty/options`, and served from the
same constant — the two cannot drift. Use `/faculty/options` when you are
rendering the faculty form and need subjects and batches anyway; use this
when roles are all you need.

The list is a compile-time enum, not table rows: it changes only with a
deploy, so it is safe to fetch once and cache for the session.

---

## Notifications

Announcements an admin sends to students. One row per announcement, not per
recipient: a message to a 400-student batch is a single row, fanned out at
read time.

There is **no read/unread state** in this iteration, so a bell icon can show
a list but not an unread badge. Adding one means a per-recipient table and a
third endpoint; it does not change the two below.

### `POST /notifications`

**Roles:** `admin`

**Request**

```json
{
  "title": "Friday class moved to 4 PM",
  "body": "This week only, the Friday revision class starts at 4 PM.",
  "batchId": 3
}
```

| Field | Notes |
|---|---|
| `title` | Max 200 characters. |
| `body` | Max 5000 characters. |
| `batchId` | Optional. Send to one batch. **Omit to send to every student.** |

The author is taken from the JWT — do not send `createdBy`, and note that
`forbidNonWhitelisted` makes any undeclared property a `400`.

**Response `201`**

```json
{
  "id": 12,
  "title": "Friday class moved to 4 PM",
  "body": "This week only, the Friday revision class starts at 4 PM.",
  "batchId": 3,
  "createdAt": "2026-09-11T10:35:00.000Z"
}
```

| Status | When |
|---|---|
| `404` | `batchId` names a batch that does not exist or was deleted |

### `GET /notifications`

Everything sent to everyone, plus everything sent to the batch the **caller**
is in. Newest first.

**Roles:** any authenticated user.

**Query:** `page` (default 1), `limit` (default 10, max 100).

**Response `200`**

```json
{
  "items": [
    {
      "id": 12,
      "title": "Friday class moved to 4 PM",
      "body": "This week only, the Friday revision class starts at 4 PM.",
      "batchId": 3,
      "createdAt": "2026-09-11T10:35:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

The batch is resolved from the caller's own aspirant profile — there is no
way to ask for another user's notifications. A caller with no profile or no
batch (an admin, a staff account, an unassigned student) sees the global
announcements only, which is a `200` with a shorter list, not an error.

Note this is the *recipient's* view. An admin calling it sees what was sent
to everyone, **not** an audit of everything they have sent — a batch-targeted
announcement is invisible to its author here. An admin listing endpoint is
not part of this iteration.
