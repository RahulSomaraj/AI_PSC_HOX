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
> (`/reports/student-performance`), `points[].date` (the dashboard charts),
> `uploadedAt` (content). Others return a **full ISO timestamp**: `addedOn`
> (`/dashboard/recent-questions`), `recent[].date`
> (`/faculty/:id/contributions`), `viewedAt` (`/users/:id/recent-content`),
> `createdAt` (notifications, content).
>
> There is a defensible rule hiding in most of that — *anything bucketed into
> a day is a day string; anything that is one row's moment is ISO*. **But it
> already has an exception:** content's `uploadedAt` is one row's moment sent
> as a day, because the console's P2-5 asked for exactly that. So the rule is
> not only implicit, it is not quite true — the next endpoint is a coin flip,
> and a client rendering one screen already handles both.
>
> **Anaswar4 → Voyager211:** can we write a rule down — either the one above
> with `uploadedAt` named as the deliberate exception, or unify on ISO and let
> the client bucket? The one thing that should not happen is a third endpoint
> guessing.
>
> Day strings also carry a timezone choice — everything bucketed here uses
> `ACTIVITY_TIMEZONE` (default `Asia/Kolkata`). ISO timestamps do not.

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
  "activeSubscriptions": 842,
  "todaysExams": 0
}
```

| Field | Notes |
|---|---|
| `totalStudents` | Non-deleted accounts with `role=user`. Same figure as `GET /users/count?role=user`. |
| `activeBatches` | Batches whose `status` is `active` **or** `ongoing` — see the caveat below. |
| `activeSubscriptions` | Not expired, not cancelled, held by a live user. Same figure as `GET /subscriptions/stats/active-count`. |
| `todaysExams` | **Always `0` for now.** Nothing in the catalogue carries a date (decision **D1**), so there is nothing to count. Sent because the console's `DashboardSummary` requires the field — do not read the 0 as "no exams today". |

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
    "title": "Which article of the Constitution deals with the right to equality?",
    "subject": "Indian Polity",
    "addedOn": "2026-09-11T06:12:44.000Z",
    "difficulty": 3
  }
]
```

The console's `RecentQuestion` shape — `title`, `subject` as a name, and
`addedOn` — with `difficulty` as an extra it may ignore.

Newest first. Retired questions (`isActive: false`) are excluded. `title` is
the full question text, untruncated — the client decides how much to show.

`subject` is **`null` when the question is untagged**. The console types it as
a plain `string`, which does not cover that case; widen it to `string | null`
rather than have the API invent a label for "no subject".

### `GET /dashboard/exam-attempts`

Attempts per day, for the activity chart.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `range` | `1d` to `90d`, default `7d`. The console only sends `7d`. The old `days=7` is a `400`. |

**Response `200`** — the console's `DashboardSeries`:

```json
{
  "total": 70,
  "points": [
    { "label": "Mon", "value": 7, "date": "2026-09-14" },
    { "label": "Tue", "value": 0, "date": "2026-09-15" },
    { "label": "Wed", "value": 63, "date": "2026-09-16" }
  ]
}
```

Counts attempt rows by `createdAt`, whatever their status — an attempt left
`pending` and never started still counts. **`total` is the sum of the days**,
which is safe here: every attempt is its own row, so none can be counted on
two days.

### `GET /dashboard/dau`

Daily active students, for the engagement chart.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `range` | Same as `exam-attempts`. |

**Response `200`** — same shape as `exam-attempts`:

```json
{
  "total": 212,
  "points": [
    { "label": "Mon", "value": 148, "date": "2026-09-14" },
    { "label": "Tue", "value": 131, "date": "2026-09-15" }
  ]
}
```

Distinct students seen on each day, counted from presence tracking.

> **`total` is distinct students across the whole window — not the sum of the
> days.** A student active on Monday and again on Tuesday is one active
> student; summing the bars above would say 279 where the true figure is 212.
> This is what the console's spec asks the server to decide.

**Both series are oldest first and gap-filled.** A quiet day comes back as
`value: 0` rather than being absent, so the chart draws a continuous line.
Both bucket the day by `ACTIVITY_TIMEZONE` (default `Asia/Kolkata`), so the
two charts share a day boundary and can be overlaid.

`label` is the short weekday the x-axis draws. `date` is an extra beyond the
console type: weekday labels repeat once a window passes seven days, and
`date` does not.

### Not built

`GET /dashboard/upcoming-exams` — nothing in the catalogue carries a date, so
there is no schedule to read. Blocked on decision **D1** in `CLAUDE.md` §5.
The "Today's Exams" tile has no source until that is settled — which is why
`todaysExams` above is a fixed `0`.

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
a list but not an unread badge. Adding one means a per-recipient table and
another endpoint; it does not change the three below.

Every response uses the console's `AdminNotification` shape:

```json
{
  "id": 12,
  "title": "Friday class moved to 4 PM",
  "message": "This week only, the Friday revision class starts at 4 PM.",
  "channel": "app-push",
  "target": "LDC Evening 2026",
  "language": "en",
  "sentAt": "2026-09-11T10:35:00.000Z",
  "status": "sent",
  "batchId": 3
}
```

| Field | Notes |
|---|---|
| `message` | The text. This field was called `body` before. |
| `channel` | **Always `app-push`.** Nothing sends SMS or email; the column is ready for a sender. |
| `target` | The batch name it went to, or `"All Students"`. A batch deleted since keeps its name here. |
| `language` | `en` or `ml`. |
| `sentAt` | ISO timestamp. |
| `status` | **Always `sent`.** An in-app announcement cannot fail to deliver; `failed` becomes reachable only with a real sender. |
| `batchId` | Beyond the console type — the id `target` names, or `null`. |

### `POST /notifications`

**Roles:** `admin`

**Request** — exactly what the console's composer sends:

```json
{
  "title": "Friday class moved to 4 PM",
  "language": "en",
  "message": "This week only, the Friday revision class starts at 4 PM.",
  "target": "LDC Evening 2026"
}
```

| Field | Notes |
|---|---|
| `title` | Required, max 200. |
| `language` | Required, `en` or `ml`. |
| `message` | Max 5000. |
| `target` | Required. `"All Students"`, or the **exact name** of a live batch. |

`target` is a name, not an id, because the composer's picker is built from the
batch list's names. Batch names are unique among live batches, so a name
resolves to one batch or none.

The author is taken from the JWT — do not send `createdBy`, and note that
`forbidNonWhitelisted` makes any undeclared property a `400`, including the old
`body` and `batchId`.

**Response `201`** — one notification in the shape above.

| Status | When |
|---|---|
| `404` | `target` is not `"All Students"` and no live batch has that name — the message is **not** sent to everyone instead |

### `GET /notifications` — the admin list

Every announcement ever sent, newest first. Backs the Notifications screen.

**Roles:** `admin`

**Response `200`** — a **plain array** of notifications in the shape above. The
console searches, filters by `status` and pages this list itself.

> **This route changed meaning.** It used to be the student's own inbox. It is
> now the admin list, because that is what the console's Notifications screen
> calls; the inbox moved to `/notifications/mine` below. Nothing was reading
> the inbox yet.

### `GET /notifications/mine` — the caller's inbox

Everything sent to everyone, plus everything sent to the batch the **caller**
is in. Newest first.

**Roles:** any authenticated user.

**Query:** `page` (default 1), `limit` (default 10, max 100).

**Response `200`**

```json
{
  "data": [ { "id": 12, "title": "…", "message": "…", "target": "All Students", "…": "…" } ],
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
    "accuracy": 39.6,
    "name": "Indian Polity",
    "percentage": 39.6
  }
]
```

`name` and `percentage` are the names the console's `WeakSubject` type reads
(`{ subjectId, name, percentage }`). They carry the same values as
`subjectName` and `accuracy` and are sent beside them, not instead, so the
attempted/correct detail stays available.

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
| Content Usage | `GET /reports/content-usage` |
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

### `GET /reports/content-usage`

What students are actually reading.

| Query | Notes |
|---|---|
| `days` | 1–365, default 30. |
| `subjectId` | Only views of items filed under this subject **at the time they were read**. |
| `batchId` | Only views by readers who were in this batch **at the time they read**. |
| `page` / `limit` | For `items` only; 1-based, default 1; 1–100, default 25. |

**Response `200`**

```json
{
  "summary": {
    "totalViews": 4820,
    "distinctViewers": 412,
    "itemsViewed": 148,
    "averageDailyViews": 160.7
  },
  "series": [
    { "date": "2026-09-13", "views": 163 }
  ],
  "bySubject": [
    {
      "subjectId": 12,
      "subjectName": "Indian Polity",
      "views": 1840,
      "distinctViewers": 268
    }
  ],
  "byBatch": [
    {
      "batchId": 3,
      "batchName": "LDC Evening 2026",
      "views": 962,
      "distinctViewers": 74
    }
  ],
  "items": [
    {
      "contentId": 91,
      "title": "Indian Polity - Fundamental Rights notes",
      "type": "pdf",
      "subjectId": 12,
      "subjectName": "Indian Polity",
      "views": 340,
      "distinctViewers": 212,
      "lastViewedAt": "2026-09-13T09:11:00.000Z"
    }
  ],
  "total": 148, "page": 1, "limit": 25, "totalPages": 6
}
```

`series` is oldest first and gap-filled, bucketed by `ACTIVITY_TIMEZONE` — the
same day boundary as `/dashboard/dau` and `/reports/growth-engagement`, so all
three overlay. `averageDailyViews` divides by every day in the window,
including silent ones.

`bySubject` and `byBatch` return the **top 20 by views** and are not paginated;
they are read as a chart legend. Only `items` pages, and `total` counts
distinct items opened in the window.

**`views` and `distinctViewers` are different questions.** 340 opens by 212
students means the item is being re-read. Both are reported everywhere rather
than making the client guess which one a number is.

**Nulls are buckets, not missing data:**

| Null | Means |
|---|---|
| `subjectId: null` | The item carried no subject when it was read — the untagged bucket. |
| `subjectName: null` with a `subjectId` | The subject row is gone. `subject_id` is denormalised and carries no foreign key, so the reading still reports. |
| `batchId: null` | The reader was in no batch at the time. |

**Soft-deleted items still appear**, with their title. They were read, and
retiring an item afterwards does not unmake that.

> **Three things that shape every number here**, all decided at the write site
> rather than in this endpoint — see **Content Library → view tracking**:
> staff opens are not recorded; there is no dedup window, so reopening an item
> three times is three views; and a failed write is swallowed, so a view can
> be missing but a read never fails because of one.

> **Rows exist from 2026-09-12 only.** Earlier days in a long window report
> zero because nothing was recorded, not because nothing was read, and there
> is nothing to backfill from. Read a 365-day window with that in mind.

---

## Content Library

Study material — video, PDFs, notes and links — following the shape in
`BACKEND_ISSUES.md` **P2-5**, which the console's Content Library screens were
built and tested against.

**Two fields go beyond P2-5:** `subtopicId` and `topicId`'s companion filters.
Questions are tagged to subtopic depth and Weak Subjects rolls up by subject,
so filing content the same way is what lets "you are weak on Fundamental
Rights, here is the material" exist later. Both are nullable — a client that
ignores them sees exactly the P2-5 shape.

**An item points at exactly one thing:** either `fileUrl` (from
`POST /uploads`) or `linkUrl` (hosted elsewhere). Both, or neither, is a `400`.

**Batches are a restriction, not a requirement.** `batchIds: []` means visible
to *every* student — the shared shelf. Attaching batches narrows it to those.

### `POST /content`

**Roles:** `admin`, `staff`

```json
{
  "title": "Indian Polity - Fundamental Rights notes",
  "description": "Covers Articles 12 to 35, with PYQ tags.",
  "type": "pdf",
  "fileUrl": "https://psc-uploads.s3.ap-south-1.amazonaws.com/content/2026/09/3f1a....pdf",
  "fileName": "kerala-psc-2024-notes.pdf",
  "subjectId": 1,
  "topicId": 5,
  "examLevelId": 2,
  "batchIds": [1, 4],
  "status": "draft"
}
```

| Field | Notes |
|---|---|
| `type` | `video`, `pdf`, `notes` or `links` — the four the form offers. The list's `article` type is **not** accepted; that is your Q40. |
| `fileUrl` / `linkUrl` | Exactly one. |
| `fileName` | Display name for an attached file. |
| `subjectId` | Optional. |
| `topicId` | Optional, must belong to `subjectId` — which is then required. |
| `subtopicId` | **Beyond P2-5.** Optional, must belong to `topicId`. |
| `examLevelId` | Optional. |
| `batchIds` | Optional. Omit or `[]` for every student. |
| `status` | `draft` (default) or `published`. |

| Status | When |
|---|---|
| `400` | Both or neither source · a topic with no subject · a topic not under the subject |
| `404` | Subject, topic, subtopic, exam level or batch not found |

### `GET /content`

**Roles:** any authenticated user — but **what comes back depends on who asks.**

| Caller | Sees |
|---|---|
| `admin`, `staff` | Everything, drafts included |
| a student | `published` only, and among those only ones with **no batches attached** or attached to **their own** batch |

**Query:** `page` (1), `limit` (10, max 100), `search`, `type`, `subjectId`,
`examLevelId`, `status` — plus `topicId`, `subtopicId` and `batchId` beyond
P2-5.

`search` matches the **title only**, per P2-5. `status` and `batchId` are staff
filters; a student sending them is not an error, they are ignored, because a
student's visibility is fixed by who they are.

Ordered newest first, `id` ascending within a day.

**Response `200`** — rows under `data`, the console's `Paginated<ContentItem>`:

```json
{
  "data": [
    {
      "id": 12,
      "title": "Indian Polity - Fundamental Rights notes",
      "description": "Covers Articles 12 to 35, with PYQ tags.",
      "type": "pdf",
      "fileUrl": "https://psc-uploads.s3.../content/2026/09/3f1a....pdf",
      "fileName": "kerala-psc-2024-notes.pdf",
      "linkUrl": null,
      "subjectId": 1,
      "topicId": 5,
      "subtopicId": null,
      "examLevelId": 2,
      "batchIds": [1, 4],
      "status": "published",
      "uploadedAt": "2026-09-12",

      "subject": { "id": 1, "name": "Indian Polity" },
      "topic": { "id": 5, "name": "Fundamental Rights" },
      "subtopic": null,
      "examLevel": { "id": 2, "name": "LDC (10th Level)" },
      "batches": [
        { "id": 1, "name": "Alpha Batch 2026" },
        { "id": 4, "name": "Evening LDC 2026" }
      ],
      "createdBy": 7,
      "createdAt": "2026-09-12T04:00:00.000Z",
      "updatedAt": "2026-09-12T04:00:00.000Z"
    }
  ],
  "total": 40, "page": 1, "limit": 10, "totalPages": 4
}
```

The fields above the blank line are P2-5. Below it are **extras you may
ignore** — the resolved names beside each id, so the Linked Batches chips and
the subject column render without a second round trip. `batches` is always the
item's *full* list, name-sorted, and `batchIds` follows the same order;
filtering by `batchId` does not trim either.

**`uploadedAt` is a day, never a timestamp** — as P2-5 asks. It is `createdAt`
bucketed in `ACTIVITY_TIMEZONE` (default `Asia/Kolkata`), so the day is decided
once on the server rather than shifting per client. The raw `createdAt` is
there too if you need the time.

### `GET /content/:id`

Same shape as one `items` entry, same visibility rule.

A student requesting a draft, or another batch's material, gets `404` rather
than `403` — being refused would itself confirm the item exists.

**This is also the endpoint that records a view.** See *view tracking* below.

### `PATCH /content/:id`

**Roles:** `admin`, `staff`. Any subset of the `POST` fields.

- **`batchIds` replaces the whole set.** Omit to leave attachments alone; send
  `[]` to detach everything and make the item visible to all students.
- Publish with `{ "status": "published" }`. Everything the console saves is a
  draft today, so this is the only way to publish.
- Taxonomy is validated **after** the merge. A PATCH sending only `subjectId`
  is rejected if the stored topic does not belong to the new subject — nothing
  in the body is wrong alone, but the resulting row would be.
- `forbidNonWhitelisted` applies: never PATCH back an object from a GET. The
  response carries `subject`, `uploadedAt`, `createdBy` and friends, none of
  which the DTO declares.

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
| `subject_id` | The item's subject, **copied in at write time**. Nullable, because `content.subject_id` is — so views-per-subject has an untagged bucket. |
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

What one faculty member has authored, in the console's
`FacultyContributions` shape: the four tiles of the "Content & Questions"
card and its recent-items table.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `limit` | 1–50, default 5. How many recent items. |

**Response `200`**

```json
{
  "facultyId": 10,
  "userId": 20,
  "stats": {
    "questionsCreated": 1250,
    "contentUploads": 82,
    "avgDifficulty": 7.2,
    "approvalRate": 94
  },
  "recent": [
    {
      "id": 12,
      "title": "Fundamental Rights",
      "type": "content",
      "date": "2025-10-09T00:00:00.000Z",
      "status": "approved"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `userId` | The staff account that wrote the rows. Audit columns carry this, not `facultyId`. |
| `stats.questionsCreated` | Questions authored, retired ones included. |
| `stats.contentUploads` | Live content items authored. |
| `stats.avgDifficulty` | **Out of 10.** Stored difficulty is 1–5 and is doubled, because the tile prints `/10`. Which scale is right is the console's open **Q78**. `0` when no questions. |
| `stats.approvalRate` | Whole percent of authored questions **and** content that are `published`. `0` when nothing authored. |
| `recent[]` | Newest first, questions and content merged. |
| `recent[].id` | Unique only **with** `type` — a question and a content item can share an id. Key rows by both. |
| `recent[].title` | Content title, or the question text reduced to plain words (it is stored as HTML). |
| `recent[].status` | `approved` if published; `pending` for anything not yet published (draft, pending-review). |
| `recent[].date` | ISO timestamp. |

**"Approved" means published.** There is no separate approval step in the API:
a published item is the approved one, and everything short of that is pending.
If a real review workflow is ever specified, `approvalRate` and `status` should
read it instead.

**The two kinds count differently, because the two tables delete
differently.** `DELETE /questions/:id` is a *hard* delete, so every question row
that survives is a real contribution, a retired one included. Content is
soft-deleted, so a deleted item leaves the counts entirely — a contribution
someone withdrew is not a contribution.

**`404`** for an unknown id, a soft-deleted faculty record, or one whose
account is no longer staff — the same rule `GET /faculty/:id` applies.

A faculty member with nothing authored is **`200` with zeroes and an empty
`recent`**, not a 404.

### `GET /users/:id/recent-content`

Backs the Recently Viewed Content panel on the student profile. Implements
the `RecentContent` shape in `BACKEND_ISSUES.md`, *Shapes we have already
built against*.

**Roles:** `admin`

| Query | Notes |
|---|---|
| `limit` | 1–50, default 5. |

**Response `200`** — newest first:

```json
[
  {
    "id": 12,
    "title": "Indian Polity - Fundamental Rights notes",
    "kind": "pdf",
    "viewedAt": "2026-09-12T04:00:00.000Z"
  }
]
```

`id` is the **content item**, not the view — `GET /content/:id` opens it, as
P2-6 asked ("should reference a real `ContentItem` id rather than carrying a
loose title"). `kind` is the same enum as `ContentItem.type`, also as asked,
so it can now return `links` as well as the three P2-6 listed.

**One row per open, not per item.** Reopening the same PDF twice appears
twice — the panel is *recently viewed*, not *distinct items viewed*, and the
underlying table counts the same way.

**Not filtered by `status`.** This is history: an item that was published
when it was read stays in the record after it is pulled back to draft. Items
that have since been **soft-deleted do** drop out, rather than being listed
as something nobody can open.

**`404`** for an unknown id, a soft-deleted account, or one whose role is not
`user` — the same rule as `GET /users/:id/weak-subjects` beside it. A student
who has opened nothing is **`200` with `[]`**.

> **Rows only exist from 2026-09-12**, when `GET /content/:id` started
> recording opens. Unlike the answer log there is nothing to backfill from,
> so this panel is empty for any reading that happened before that date.

---

## Batches

Only the parts reshaped to match the console are documented here; the rest
of the batch surface is unchanged.

### Request and response names

| Console | Stored as | Notes |
|---|---|---|
| `targetExamId` | `exam_id` | **Required on create.** The request field is `targetExamId`; sending the old `examId` is a `400`. Responses carry both. |
| `timings` | `timings` | Free text, max 100 — `"10:00 AM - 12:00 PM"`. |
| `imageUrl` | `image_url` | A `fileUrl` from `POST /uploads`. |
| `isActive` | — | Response only, derived: `false` only when `status` is `inactive`. |
| `shift` | — | **Accepted and ignored.** The table has no shift — `mode` replaced it. Allowed only so the console's `shift.ts` guess does not trip `forbidNonWhitelisted`. Delete it from the console and it can come out of the DTO. |

### `GET /batches` — paging is opt-in

**Without `page`, a plain array** of every matching batch, ordered by start
date. This is what the console reads: four of its screens fetch `/batches`
whole — the batch list and three batch pickers — and it filters and pages the
list itself.

**With `page`,** one page as `{ data, total, page, limit, totalPages }` —
`limit` defaults to 10, capped at 100.

The `examId`, `mode`, `status` and `search` filters apply either way.

> This used to be paged by default, under `items`. Nothing was reading it that
> way: the console always expected the array.

### `POST /batches` — what the console sends

```json
{
  "name": "Alpha Batch 2026",
  "targetExamId": 3,
  "description": "Weekend online batch",
  "mode": "online",
  "timings": "10:00 AM - 12:00 PM",
  "startDate": "2026-01-01",
  "endDate": "2026-12-01"
}
```

### Still missing from the Batch details screen

The **Subjects** panel (each subject with its faculty) and the **Linked
Exams** panel need new relations — batch↔subject carrying a faculty, and
batch↔exam. Neither exists yet.

---

## Questions

Only what changed to match the Question Bank is documented here — the eight
columns in `BACKEND_ISSUES.md` **P1-1**, plus paging and search.

### Fields added

| Field | Stored | Notes |
|---|---|---|
| `code` | no — derived | `Q-001`, `Q-042`, `Q-1234`, from the id. Stable and unique with no column to keep so. Never sent on create. |
| `status` | yes | `draft` · `pending-review` · `published`. Defaults to `draft`. |
| `language` | yes | `en` · `ml`. Defaults to `en`. |
| `timeSeconds` | yes | Integer ≥ 1, or `null` on a draft. |
| `imageUrl` | yes | A `fileUrl` from `POST /uploads` (purpose `question`), or `null`. |
| `type` | **no** | Accepted, ignored, always returned `null`. |
| `year` | **no** | Accepted, ignored, always returned `null`. |
| `examLevelId` | **no** | Accepted, ignored, always returned `null`. |

**Why `type`, `year` and `examLevelId` are not stored.** The Add Question form
has no field for any of them, so every question the console saves sends
`null` — P1-1 asks that the columns wait for Q33 rather than exist with
nothing to write them. They are still *accepted* because the console sends
them on every save, and `forbidNonWhitelisted` would otherwise turn each save
into a `400`. The Type, Year and Exam Level filters therefore cannot work
until Q33 is settled.

### Drafts and publishing

A **draft** may be saved with only the question text: empty options, no
correct answer (`correctAnswer: ""`), no marks and no time.

A question being **published** needs a correct answer, and it must be one of
the four `answers` — otherwise `400`. The same rule applies on `PATCH`, checked
against the row as it will be: sending just `{ "status": "published" }` to a
draft with no answer marked is refused.

If a draft *does* name an answer, it must still be one of the choices.

> **Existing questions came through as `published`.** The `status` column's
> database default is `published` so that questions students are answering
> today were not demoted to drafts when the column was added. New questions
> are `draft` unless the request says otherwise.

> ⚠️ **Saving reorders the options.** `POST` and a `PATCH` carrying `answers`
> shuffle them, as they always have, so what the admin typed as option B may
> come back as option D. The correct answer is tracked by value, so marking
> survives — but an editor that shows options by position will see them move.
> Unchanged here; worth a decision.

### `GET /questions` — paging and search

| Query | Notes |
|---|---|
| `page` | **Opt-in.** Send it to get one page back. Omit it for the full array, exactly as before. |
| `limit` | 1–100, default 10, when `page` is sent. |
| `search` | Matches the question text — or a code: `Q-012` finds question 12. |
| `language` | `en` or `ml`. |
| `courseId`, `subjectId`, `topicId`, `subtopicId` | Unchanged. |

Paging is opt-in because the **Exam Builder loads the whole bank** to pick
questions from. Switching this route to pages outright would silently hand it
page one.

**With `page`:**

```json
{
  "data": [ { "id": 12, "code": "Q-012", "status": "published", "…": "…" } ],
  "total": 21,
  "page": 3,
  "limit": 10,
  "totalPages": 3
}
```

Without `page`, a plain array of the same question objects. Retired questions
(`isActive: false`) are excluded either way.

---

## Exam catalogue

### `/exams` and `/exam-posts` — the same routes

The exam / post catalogue answers at **both** paths, with identical handlers,
guards and responses:

| Also at | Same as |
|---|---|
| `GET /exam-posts` | `GET /exams` — a plain array of catalogue exams |
| `GET /exam-posts/:id` | `GET /exams/:id` |
| `POST`, `PATCH`, `DELETE /exam-posts…` | the matching `/exams…` route |

The console reads the catalogue as `/exam-posts` (the exam picker on the
Batches form). Everything in the API already used `/exams` — including
`GET /exams/:id/results` on a separate controller — so both stay rather than
one being renamed.

`/exam` (singular) is unrelated: it is the attempt session a student sits.
