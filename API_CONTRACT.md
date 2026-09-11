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

---

## Reports

Analytics over the answer log. Served under `/users` rather than `/reports`
because the panel belongs to a student profile; `GET /dashboard/*` and these
are the two read surfaces over that table.

### `GET /users/:id/weak-subjects`

Backs the Weak Subjects panel on the student profile.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `limit` | 1–50, default 5. How many subjects to return. |
| `minAttempts` | 1–100, default 5. Noise floor — see below. |

**Response `200`**

```json
[
  {
    "subjectId": 12,
    "subjectName": "Indian Polity",
    "attempted": 48,
    "correct": 19,
    "incorrect": 29,
    "accuracy": 39.6
  }
]
```

Ordered by `accuracy` ascending, so the weakest subject is first. Ties break
towards the subject with more answers behind it, then by `subjectId`, so the
order is stable between calls. `accuracy` is `correct / attempted` as a
percentage to one decimal place.

**Counts practice and exam answers together.** A subject a student keeps
getting wrong in practice is a weakness whether or not it was under exam
conditions. Answers to untagged questions are skipped — they cannot be rolled
up by subject.

> **`minAttempts` is a noise floor, and the default of 5 is a guess.**
> One wrong answer out of one is not a weakness, so subjects with fewer than
> `minAttempts` answers are left out. The consequence is that a student who
> has barely started gets an empty panel. Pass `minAttempts=1` to see every
> subject they have touched. If the product owner wants a different floor,
> it is a one-line default change.

**No date window, deliberately.** `answer_log.answered_at` is the insert time
for backfilled rows, not the original attempt — the historical answers on
`exams.answers` carry no per-answer timestamp. A `?days=30` filter would
therefore silently mean "everything the backfill inserted". A windowed
version has to read `exams.completed_at` through `exam_id`, which will come
with the Reports tabs.

**`404`** for an unknown id, a soft-deleted account, or one whose role is not
`user` — matching `GET /users/:id` and `GET /users/:id/exams`. A student with
no answers yet is **`200` with `[]`**, not a 404.

### `GET /exams/:id/results`

Results for a catalogue exam. `:id` is an **exam post**, consistently with the
rest of `/exams`.

> Not to be confused with `/exam/:id` (singular), which is a student's own
> attempt session. Decision **D3** proposes renaming that one to `/attempts`.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `stageId` | Narrow to one stage of the post. |
| `page` | 1-based, default 1. |
| `limit` | 1–100, default 25. |

**Response `200`**

```json
{
  "items": [
    {
      "rank": 1,
      "attemptId": 913,
      "userId": 42,
      "studentName": "Anjali Menon",
      "email": "anjali@example.com",
      "stageId": 3,
      "stageName": "Prelims",
      "score": 184,
      "totalPossibleScore": 300,
      "percentage": 61.3,
      "attempted": 30,
      "correct": 19,
      "incorrect": 11,
      "completedAt": "2026-09-10T11:42:00.000Z"
    }
  ],
  "total": 128,
  "page": 1,
  "limit": 25,
  "totalPages": 6
}
```

Ordered by `percentage` descending. Equal percentages share a rank and the
next one skips (1, 2, 2, 4), and `rank` is the position in the whole roster,
not within the page. An attempt with no `totalPossibleScore` to divide by
reports `percentage: null` and sorts last rather than first. `correct` and
`incorrect` are counted from the answer log; an attempt older than that table
reports `attempted: 0` but keeps its score.

Completed attempts only — a pending or expired one has no score to rank.

**`404`** for an unknown or soft-deleted exam post. An exam nobody has sat is
**`200`** with an empty `items`.

> ### ⚠️ This endpoint requires a change on your side
>
> **An attempt only appears here if it was started with an `examStageId`.**
>
> `POST /exam` now accepts an optional `examStageId` (from `GET /exam-stages`)
> naming the catalogue sitting the attempt is made against. Send it whenever a
> student is sitting a real exam rather than free practice. Omit it and the
> attempt is a practice run and never appears in any results roster.
>
> **Attempts taken before this shipped carry no stage and cannot be given
> one.** An attempt row records a course and a list of question IDs, and
> neither identifies a catalogue exam — unlike the answer-log backfill, there
> is no source to reconstruct from. This roster therefore starts empty on an
> existing database and fills only as new attempts are taken.
>
> **Scores are comparable within a stage, not across a post.** A stage is the
> thing that carries a question count, marks and a duration. Omitting
> `stageId` returns every stage in one list, and ranking that mixed list means
> little — prefer one request per stage.
>
> **The attempt still uses its own rules, not the stage's.** `POST /exam`
> continues to draw up to 30 random questions from the course and ignores the
> stage's `totalQuestions`, `totalMarks` and `negativeMark`. Making a stage
> attempt actually follow the stage's rules is a separate decision, not part
> of this link.

---

## Content Library

Study material — notes, lecture video, documents — filed against the same
`subject → topic → subtopic` taxonomy questions use, and optionally
restricted to one or more batches.

**An item points at exactly one thing:** either `fileUrl` (something uploaded
through `POST /uploads`) or `sourceUrl` (a link to material hosted
elsewhere). Sending both, or neither, is a `400`.

**Batches are a restriction, not a requirement.** An item with no batches
attached is visible to every student — the shared shelf. Attaching batches
narrows it to those batches only.

### `POST /content`

**Roles:** `admin`, `staff`

```json
{
  "title": "Indian Polity - Fundamental Rights notes",
  "description": "Covers Articles 12 to 35, with PYQ tags.",
  "type": "document",
  "fileUrl": "https://psc-uploads.s3.ap-south-1.amazonaws.com/content/2026/09/3f1a....pdf",
  "subjectId": 1,
  "topicId": 5,
  "batchIds": [1, 4],
  "isPublished": false
}
```

| Field | Notes |
|---|---|
| `type` | `note`, `video` or `document`. A label for filtering and icons — a `video` may be either an upload or a link. |
| `fileUrl` / `sourceUrl` | Exactly one. |
| `subjectId` | **Required.** |
| `topicId` | Optional, must belong to `subjectId`. |
| `subtopicId` | Optional, must belong to `topicId` — which then becomes required. |
| `batchIds` | Optional. Omit or send `[]` for every student. |
| `isPublished` | Defaults to `false`, i.e. draft. |

Returns the created item in the `GET /content/:id` shape below.

| Status | When |
|---|---|
| `400` | Both or neither source · a subtopic with no topic · a topic not under the subject |
| `404` | Subject, topic, subtopic or batch not found |

### `GET /content`

**Roles:** any authenticated user — but **what comes back depends on who asks.**

| Caller | Sees |
|---|---|
| `admin`, `staff` | Everything, drafts included |
| a student | Published items only, and among those only ones with **no batches attached** or attached to **their own** batch |

**Query:** `page` (default 1), `limit` (default 10, max 100), `search`
(title and description), `type`, `subjectId`, `topicId`, `subtopicId`,
`batchId`, `isPublished`.

`batchId` and `isPublished` are staff filters. A student sending them is not
an error — they are ignored, because a student's visibility is fixed by who
they are.

**Response `200`**

```json
{
  "items": [
    {
      "id": 12,
      "title": "Indian Polity - Fundamental Rights notes",
      "description": "Covers Articles 12 to 35, with PYQ tags.",
      "type": "document",
      "fileUrl": "https://psc-uploads.s3.../content/2026/09/3f1a....pdf",
      "sourceUrl": null,
      "subject": { "id": 1, "name": "Indian Polity" },
      "topic": { "id": 5, "name": "Fundamental Rights" },
      "subtopic": null,
      "batches": [
        { "id": 1, "name": "Alpha Batch 2026" },
        { "id": 4, "name": "Evening LDC 2026" }
      ],
      "isPublished": true,
      "createdBy": 7,
      "createdAt": "2026-09-11T10:35:00.000Z",
      "updatedAt": "2026-09-11T10:35:00.000Z"
    }
  ],
  "total": 40,
  "page": 1,
  "limit": 10,
  "totalPages": 4
}
```

`batches` is always the item's **full** batch list, name-sorted — filtering
by `batchId` does not trim it. `[]` means visible to everyone.

### `GET /content/:id`

Same shape as one `items` entry. Same visibility rule.

A student requesting a draft, or another batch's material, gets `404` rather
than `403` — being refused would itself confirm the item exists.

### `PATCH /content/:id`

**Roles:** `admin`, `staff`. Any subset of the `POST` fields.

- **`batchIds` replaces the whole set.** Omit it to leave attachments alone;
  send `[]` to detach everything and make the item visible to all students.
- Publish by sending `{ "isPublished": true }`.
- Taxonomy is validated **after** the merge, not on the body alone. A PATCH
  sending only `subjectId` is rejected if the topic already stored does not
  belong to the new subject — nothing in the body is wrong on its own, but
  the resulting row would be.
- `forbidNonWhitelisted` applies: never PATCH back an object you got from a
  GET. The response carries `subject`, `createdBy` and friends, none of which
  the DTO declares.

### `DELETE /content/:id`

**Roles:** `admin`, `staff`. Soft delete; `deleted_by` records who.

```json
{ "message": "Content deleted successfully" }
```
