# Admin console — completion plan for 2 developers

**Scope:** the 23 missing endpoints across 9 modules.
**Split:** Dev A = 11 · Dev B = 11 · Deferred = 1
**Baseline:** `develop` @ `5bb8c6a` (merge resolved, `nest build` exits 0)

---

## 1. Corrected blocker analysis — read this first

The "blocked by" column in the tracking sheet is wrong in five places. **Eight endpoints
are not blocked at all** and can start today; **two are blocked by something worse than
reported** — a missing data model, not a missing endpoint.

| Endpoint | Reported blocker | Actual blocker |
|---|---|---|
| `/dashboard/summary` | activity tracking; answer log | 🟢 **none** — assembles counts that already exist |
| `/dashboard/recent-questions` | activity tracking; answer log | 🟢 **none** — `questions ORDER BY createdAt DESC` |
| `/dashboard/exam-attempts` | activity tracking; answer log | 🟢 **none** — the `exams` table already timestamps every attempt |
| `/dashboard/dau` | activity tracking | 🟡 **approximable now** — `user_sessions` has `user` + `createdAt`. See caveat below |
| `/dashboard/upcoming-exams` | activity tracking; answer log | 🔴 **worse — nothing schedules an exam.** `exam_stages` has `durationMinutes` but no date; `exam_posts` has none either. Needs a new field or table |
| `/exams/:id/results` | answer log · `/exams` naming | 🔴 **worse — attempts do not reference the catalogue.** `exams` (attempt) carries `userId` + `courseId` only; no `examPostId` / `examStageId`. Needs an FK before results can be grouped by catalogue exam |
| `/faculty/:id/contributions` | nothing tracks authorship | 🟡 **partly wrong** — `Question.createdBy` exists, so authored-question counts work today. Only the *content* half waits on Content Library |
| Reports ×4 | the per-answer log | 🟢 correct — **but see backfill below** |
| `/users/:id/doubts` | chatbot | 🔴 correct — **the chatbot module does not exist**. Out of scope for this plan |

### Two findings that change the schedule

**The answer log can be backfilled.** `exams.answers` is a `json` column holding
`questionId → selectedAnswer` for every completed attempt, alongside `score` and
`completedAt`. Joined against `questions.correctAnswer` and the subject/topic/subtopic
tags, historical per-answer rows can be reconstructed retroactively. Reports therefore
do **not** have to wait weeks for data to accumulate — they can ship with history.
Write the backfill as part of the answer-log task, not as an afterthought.

**DAU from `user_sessions` is an approximation, not a substitute.** A session row is
created on login; refresh rotates the existing row without changing `createdAt`. So
distinct-users-per-day measures **daily logins**, not daily active users — a student who
stays signed in for a week counts once. Ship it as a stopgap if the chart is needed
early, label it honestly, and add a real `last_seen_at` touch later.

---

## 2. The split

Divided so the two developers **share exactly one file** (`app.module.ts`). See §5.

### Dev A — Analytics & Reporting · 11 endpoints

Owns everything that reads from the answer log. One new foundational module, then three
consumers.

| # | Task | Endpoints | Depends on |
|---|---|:--:|---|
| **A1** | **Answer-log module** — schema, write path, backfill | — | — |
| A2 | Dashboard | 5 | A1 for `/exam-attempts` accuracy only |
| A3 | Reports — all four tabs | 4 | **A1** |
| A4 | `/users/:id/weak-subjects` | 1 | **A1** |
| A5 | `/exams/:id/results` | 1 | **A1** + FK decision (D2) |

**A1 — Answer-log module** *(the critical path; start here)*

New table, roughly:

```
answer_log
  id, userId, questionId, examId (nullable — null for practice)
  subjectId, topicId, subtopicId     -- denormalised at write time
  selectedAnswer, isCorrect, timeTakenSec (nullable)
  answeredAt
```

Denormalising the three taxonomy IDs at write time is deliberate: every Reports query
and the weak-subjects panel group by subject or topic, and re-joining `questions` on
every aggregate will not hold up.

Two write points, both already stable:
- `QuestionsService.answerQuestion()` — practice answers
- the exam submit path in `ExamService` — one row per answer in the submitted map

Plus the **backfill** from `exams.answers`, described above.

**Ship A1 and deploy it before starting A3.** Every day it is not deployed is a day of
answers not being recorded — and unlike the backfill, live practice answers outside
exams are not recoverable after the fact.

**A2 — Dashboard.** Four of the five need nothing from A1:

| Endpoint | Source |
|---|---|
| `/dashboard/summary` | `users.count(role=user)` · active batches · `subscriptions/stats/active-count` |
| `/dashboard/recent-questions` | `questions ORDER BY createdAt DESC LIMIT n`, joined to subject |
| `/dashboard/exam-attempts` | `exams GROUP BY date(createdAt)` — last 7 days |
| `/dashboard/dau` | `user_sessions GROUP BY date(createdAt)`, distinct user — see caveat |
| `/dashboard/upcoming-exams` | ⛔ **blocked on D1** |

Start A2 on day one in parallel with A1 — it is the most visible screen and mostly
unblocked.

### Dev B — Content & Platform · 11 endpoints

Owns everything that writes or serves content, plus the two standalone modules.

| # | Task | Endpoints | Depends on |
|---|---|:--:|---|
| **B1** | **Uploads** — presigned URL | 1 | — |
| B2 | Content Library | 5 | **B1** |
| B3 | Notifications | 2 | — |
| B4 | `/settings/roles` | 1 | — |
| B5 | `/faculty/:id/contributions` | 1 | questions now; content after B2 |
| B6 | `/users/:id/recent-content` | 1 | **B2** |

**B1 — Uploads** *(small, gates B2 — do it first)*

Presigned is the right call: keep the file bytes off the API process. Return
`{ uploadUrl, fileUrl, key, expiresAt }`; the client PUTs directly to storage and then
sends `fileUrl` on the subsequent create. Constrain content-type and size in the
signature, not only in the client.

**B3 and B4 are fully unblocked and small.** `/settings/roles` in particular is close to
free — `GET /faculty/options` already returns the `FacultyRole` list with labels; that
shape can be lifted directly.

**B5** splits cleanly: questions authored is `questions WHERE createdBy = faculty.userId`
and works today; content authored waits for B2. Ship the questions half first and extend
it, rather than holding the endpoint back.

### Deferred — 1 endpoint

`/users/:id/doubts` needs the AI chatbot, which does not exist as a module, a table, or a
provider. It is not a missing endpoint; it is a missing product surface. Take it out of
this plan and track it with the chatbot work.

---

## 3. Suggested order

Both developers start immediately; nothing in week 1 is blocked.

| | Dev A | Dev B |
|---|---|---|
| **First** | **A1** answer-log schema + write path + backfill → **deploy** | **B1** uploads → **B4** settings/roles |
| **Then** | **A2** dashboard (4 of 5 unblocked) | **B3** notifications → **B2** content library |
| **Then** | **A3** reports — the largest single task | **B2** content library (cont.) |
| **Last** | **A4** weak-subjects → **A5** exam results | **B5** contributions → **B6** recent-content |

Rationale: A1 gates the most downstream work *and* loses data every day it is not
deployed, so it goes first and ships on its own. B1 is small and gates B2, so it also
goes first. After that the two tracks are independent.

---

## 4. Decisions needed before A5 and `/upcoming-exams`

Both are product-owner calls, not engineering ones. **Raise them in week 1** — A5 and one
dashboard endpoint are blocked until they land.

**D1 — Where does an exam schedule live?** Nothing in the catalogue carries a date.
Options: a `scheduledAt` on `exam_stages` (simplest, one stage = one sitting); or an
`exam_schedules` table if one stage can run on several dates for different batches. The
second is more likely right given the batch model, but it is a bigger change.

**D2 — How does an attempt link to the catalogue?** `exams` (the attempt) references
`courseId` only. `/exams/:id/results` asks for results grouped by catalogue exam, which
cannot be answered today. Adding a nullable `examPostId` / `examStageId` to the attempt
is the minimal fix; the broader question is whether attempts should hang off the
catalogue rather than off `course`, which is the legacy model.

**D3 — `/exam` vs `/exams`.** Already flagged in `PROBLEMS.md`. The attempt controller
sits at `/exam` and the catalogue at `/exams`. Rename the attempt controller to
`/attempts` before A5 adds `/exams/:id/results`, or the two will be permanently confusing.

---

## 5. Working rules — so this does not end in another broken merge

This repository just lost time to a merge committed with 197 unresolved conflict hunks
(`PROBLEMS.md`). That happened because two branches edited the same eight resources. The
split above is drawn so it cannot repeat.

**Each new module is a new directory.** `answer-log/`, `reports/`, `content/`,
`notifications/`, `settings/`, `uploads/`. No shared files, no shared entities.

**Do not put the student-profile endpoints in `users.controller.ts`.** Both developers
need a `/users/:id/*` route — A4 `weak-subjects`, B6 `recent-content` — and that file is
the obvious collision. NestJS allows several controllers on one base path, so:

- Dev A: `reports/student-analytics.controller.ts` → `@Controller('users')` → `:id/weak-subjects`
- Dev B: `content/student-content.controller.ts` → `@Controller('users')` → `:id/recent-content`

Same public URLs, zero shared source.

**`app.module.ts` is the one shared file.** Rule: append your module to the end of the
`imports` array, one line, never reorder. A one-line append conflict resolves in seconds;
a reordered array does not.

**Rebase daily, never let a branch run more than ~2 days.** The broken merge grew out of
two long-lived divergent branches.

**Never `git commit` with conflict markers present.** Add a pre-commit hook:

```bash
git diff --cached -U0 | grep -qE '^\+(<{7}|={7}|>{7})' \
  && { echo "conflict markers staged - aborting"; exit 1; } || exit 0
```

**Before deploying to any database with real data** — the merge moved columns to
snake_case, and `synchronize: true` is still on. Write the rename migration first
(`PROBLEMS.md` P7, P12). This applies to both developers regardless of task.

---

## 6. Load summary

| | Dev A | Dev B |
|---|---|---|
| Endpoints | 11 | 11 |
| New modules | 3 — answer-log, reports, dashboard | 4 — uploads, content, notifications, settings |
| Existing files touched | `questions.service`, `exam.service` (write hooks) | `faculty.service` (contributions) |
| Foundation task | A1 answer-log **(critical path)** | B1 uploads |
| Unblocked on day 1 | 4 of 11 | 4 of 11 |
| Blocked on a decision | 1 (A5 → D2) | 0 |

Dev A carries the critical path and the single largest task (Reports). Dev B has more
modules but each is smaller and none blocks anything Dev A needs — if one track slips,
it does not stall the other.

---

*Written 2026-09-11 against `develop` @ `5bb8c6a`. Companions: `API_CONTRACT.md`
(current endpoint surface), `PROBLEMS.md` (merge resolution and open items).*
