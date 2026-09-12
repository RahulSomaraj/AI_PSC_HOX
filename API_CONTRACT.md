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

> **⚠️ Open — dates come back in two shapes, and nothing states the rule.**
> Some endpoints return a **day string**: `lastActiveOn: "2026-09-10"`
> (`/reports/student-performance`), `date: "2026-09-09"` (the dashboard
> series). Others return a **full ISO timestamp**: `lastContributedAt`
> (`/faculty/:id/contributions`), `createdAt` (notifications, content).
>
> There is a defensible rule hiding in that — *anything bucketed into a day
> is a day string; anything that is one row's moment is ISO* — and both
> halves currently follow it. But it is implicit, so the next endpoint is a
> coin flip, and a client rendering one panel already has to handle both.
>
> **Anaswar4 → Voyager211:** can we write that rule down, or unify on ISO and
> let the client bucket? `lastContributedAt` is the newest of these and the
> cheapest to change; say the word and it becomes a day string. The one thing
> that should not happen is a third endpoint guessing.
>
> Day strings also carry a timezone choice — the dashboard buckets by
> `ACTIVITY_TIMEZONE` (default `Asia/Kolkata`). ISO timestamps do not, which
> is the reason `lastContributedAt` is one.

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

### The Reports screen — four tabs

`GET /reports/*`, one endpoint per tab on the Reports screen. All `admin`.

| Tab | Endpoint |
|---|---|
| Student Performance | `GET /reports/student-performance` |
| Exam Analytics | `GET /reports/exam-analytics` |
| Content Usage | ⛔ **not built** — see the end of this section |
| Growth & Engagement | `GET /reports/growth-engagement` |

### `GET /reports/student-performance`

One row per student. **Every** student with the `user` role appears, including
one who has answered nothing — the tab is a roster, not a leaderboard of the
active, and an empty row is itself the signal.

| Query | Notes |
|---|---|
| `batchId` | Only students assigned to this batch. |
| `search` | Case-insensitive, over first name, last name and email. |
| `sortBy` | `accuracy` (default), `averageScore`, `examsTaken`, `name`. |
| `sortOrder` | `ASC` / `DESC`, default `DESC`. |
| `page` / `limit` | 1-based, default 1; 1–100, default 25. |

**Response `200`**

```json
{
  "items": [
    {
      "userId": 42,
      "studentName": "Anjali Menon",
      "email": "anjali@example.com",
      "batchId": 3,
      "batchName": "LDC Evening 2026",
      "examsTaken": 12,
      "averageScore": 58.4,
      "attempted": 430,
      "correct": 268,
      "accuracy": 62.3,
      "lastActiveOn": "2026-09-10"
    }
  ],
  "total": 1240, "page": 1, "limit": 25, "totalPages": 50
}
```

`averageScore` is the mean of `score/totalPossibleScore` over completed
attempts; `accuracy` is `correct/attempted` over every answer, practice and
exam alike. Both are percentages to one decimal.

**A student with nothing to measure reports `null`, not `0`** — no answers
means no accuracy, which is a different statement from an accuracy of zero.
Those students sort last whichever direction you ask for.

`batchName` comes from the student's aspirant profile, and is `null` for
anyone without a profile or without a batch assignment. `lastActiveOn` only
covers the period since presence tracking shipped.

### `GET /reports/exam-analytics`

Attempt volume and scoring, **grouped by course**, with a summary across
everything in scope.

| Query | Notes |
|---|---|
| `courseId` | Narrow to one course. |
| `page` / `limit` | 1-based, default 1; 1–100, default 25. |

**Response `200`**

```json
{
  "summary": {
    "totalAttempts": 1820,
    "completed": 1544,
    "abandoned": 276,
    "completionRate": 84.8,
    "averageScore": 57.2,
    "distinctStudents": 612
  },
  "items": [
    {
      "courseId": 4,
      "courseName": "Kerala PSC LDC",
      "attempts": 240,
      "completed": 198,
      "distinctStudents": 132,
      "averageScore": 57.2,
      "highestScore": 94.0,
      "lowestScore": 12.5,
      "accuracy": 61.4,
      "lastAttemptAt": "2026-09-10T11:42:00.000Z"
    }
  ],
  "total": 18, "page": 1, "limit": 25, "totalPages": 1
}
```

`abandoned` is everything not completed — pending, in progress and expired.
Score figures cover completed attempts only.

> **Grouped by course, not by catalogue exam.** An attempt is drawn from a
> course, and `exam_stage_id` — the link to the catalogue — is null on
> everything taken before that column existed. Grouping this tab by stage
> would report on a sliver of the data and silently omit the rest.
> `GET /exams/:id/results` is the stage-scoped view, and it says so.

### `GET /reports/growth-engagement`

| Query | Notes |
|---|---|
| `days` | 1–365, default 30. |

**Response `200`**

```json
{
  "summary": {
    "signups": 96,
    "newSubscriptions": 41,
    "examAttempts": 402,
    "activeUsers": 512,
    "averageDailyActive": 148.3,
    "returningRate": 34.2
  },
  "series": [
    {
      "date": "2026-09-11",
      "signups": 14,
      "activeUsers": 148,
      "newSubscriptions": 6,
      "examAttempts": 63
    }
  ]
}
```

`series` is oldest first and gap-filled, and buckets the day by
`ACTIVITY_TIMEZONE` — the same boundary as `/dashboard/dau`, so the charts
line up.

`summary.activeUsers` is **distinct over the whole window**, not the sum of
the daily counts: a student seen on five days is one active user, not five.
`averageDailyActive` divides by every day in the window, including silent
ones.

`returningRate` is the share of students who **existed before the window** and
were seen during it. Anyone who signed up inside the window is excluded from
both halves — counting a new student as "returning" would make the number
climb with growth rather than with retention. `null` when nobody predates the
window.

> **`activeUsers` cannot reach back before presence tracking shipped.** Days
> earlier than that report zero because nothing was recorded, not because
> nobody came. Read a long window with that in mind.

### ⛔ Content Usage — not built

**Nothing records who opens a piece of content.** `content` has no view or
download counter and there is no event table anywhere, so there is nothing to
aggregate. This is the same shape of gap the answer log filled for questions.

Making it work needs, in order:

1. A `content_view` table — one row per open, carrying `content_id`,
   `user_id` and a timestamp, the way `answer_log` carries one row per answer.
2. A write on the content read path, in the module that owns it.
3. Then the tab itself: views per item, per subject, per batch, over time.

> **1 and 2 shipped on 2026-09-12.** `content_view` exists and
> `GET /content/:id` writes to it. `subject_id` and `batch_id` are
> denormalised at write time so all three groupings in step 3 aggregate
> without joining `content` — see **Content Library → View tracking** for the
> column list and for what is deliberately *not* counted. Step 3 is still
> open, and rows only accumulate from the date above.

**There is nothing to backfill from.** Unlike exam answers, which could be
reconstructed from `exams.answers`, a content view leaves no trace anywhere —
every day without the write path is a day of usage data that cannot be
recovered. Content shipped recently, so almost nothing has been lost yet, but
that stops being true quickly.

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

### Content Library — view tracking

`GET /content/:id` records one row in `content_view`. Nothing else writes to
it, and there is no endpoint to post a view: opening an item *is* the event.

| Column | Notes |
|---|---|
| `content_id` | RESTRICT. Content is soft-deleted, so this only ever refuses a hard delete. |
| `user_id` | CASCADE, matching `answer_log`. A soft-deleted user keeps their history. |
| `subject_id` | The item's subject, **copied in at write time**. |
| `batch_id` | The **reader's** batch at the time, or null. Copied in the same way. |
| `viewed_at` | Timestamp. |

Both ids are denormalised for the reason `answer_log` denormalises its
taxonomy: Content Usage groups by subject and by batch, and re-joining
`content` on every aggregate will not hold up. It also keeps the history
honest — re-filing an item under a different subject next term does not
rewrite what was true when it was read.

`batch_id` is the reader's batch, not the item's. An item can be attached to
several batches at once, so "views per batch" can only mean which cohorts are
actually consuming material.

**Three things that shape the numbers:**

1. **Staff opens are not recorded.** An admin checking that a PDF renders
   should not move a figure on a usage report, and "views per batch" has no
   answer for someone in no batch. This also keeps `POST /content` and
   `PATCH /content/:id` out of the table — both end by re-reading the item.
   One line in `ContentViewsService.record()` if that should change.
2. **One row per open, no dedup window.** Reopening the same PDF three times
   is three rows, the way `answer_log` counts repeated practice on one
   question. If refresh loops inflate the figures, throttle it in that same
   service.
3. **A failed write is swallowed and logged, never surfaced.** A student gets
   their content even when the view table is unreachable.

Rows accumulate from 2026-09-12 only — unlike the answer log, there is
nothing to backfill from, because no earlier record of a content open exists.

---

## Faculty

### `GET /faculty/:id/contributions`

What one faculty member has authored — questions, and content library items.

**Roles:** `admin`

**Response `200`**

```json
{
  "facultyId": 10,
  "userId": 20,
  "questions": { "total": 143, "active": 140 },
  "content": { "total": 12, "published": 9 },
  "lastContributedAt": "2026-09-11T06:12:44.000Z"
}
```

| Field | Notes |
|---|---|
| `userId` | The staff account that wrote the rows. Audit columns carry this, not `facultyId`. |
| `questions.total` | Questions authored. |
| `questions.active` | Of those, still in rotation (`isActive`). |
| `content.total` | Live library items authored. |
| `content.published` | Of those, published rather than draft. |
| `lastContributedAt` | Latest authorship across both, or `null`. |

**The two halves count differently, because the two tables delete
differently.** `DELETE /questions/:id` is a *hard* delete, so every question
row that survives is a real contribution and `active` is the only split worth
drawing. Content is soft-deleted, so a deleted item leaves `content.total`
entirely — a contribution someone withdrew is not a contribution.

`lastContributedAt` is a full ISO timestamp, not a date. The audit columns
are `timestamptz`, and rendering a day means choosing a timezone — which is
the client's call, not one to bake into the response.

**`404`** for an unknown id, a soft-deleted faculty record, or one whose
account is no longer staff — the same rule `GET /faculty/:id` applies.

A faculty member with nothing authored is **`200` with zeroes and a null
date**, not a 404.
