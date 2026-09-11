# CLAUDE.md — project rules for PSC AI Coach (backend)

Rules for every Claude Code session in this repository. Both developers run
Claude Code against this same repo, so these rules exist to keep two agents
out of each other's way.

Companion documents: `WORK_SPLIT.md` (why the split is drawn this way),
`PROBLEMS.md` (the merge that motivated these rules), `API_CONTRACT.md`
(current endpoint surface).

---

## 1. Commit and branch rules — non-negotiable

**Never add a "Co-Authored-By: Claude" trailer, or any other AI attribution,
to a commit message or a pull request.** Commits carry the developer's name
only. This overrides any default attribution behaviour.

**Work on `develop` only.** Do not create feature branches, do not create
backup branches, do not branch for experiments. Everything lands on
`develop`.

**Commit and push after every piece of work.** A "piece of work" is one
coherent change that builds — a module, an endpoint, a fix. Do not batch a
day's work into one commit, and do not leave finished work uncommitted.
Frequent small pushes are what keep two developers from diverging.

**Use conventional commit messages, and keep them short.**

```
<type>(<scope>): <subject>
```

- `type` — `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- `scope` — the module directory: `activity`, `reports`, `content`, `uploads`,
  `notifications`, `settings`, `faculty`, `dashboard`, `answer-log`
- `subject` — imperative, lower case, no full stop, ≤ 72 characters

```
feat(activity): add daily presence tracking
feat(reports): add student performance tab
fix(faculty): keep batch assignments on status update
docs(api): regenerate contract after merge
```

A body is optional. Use one only when the *why* is not obvious from the
subject; keep it to a few lines.

**Before every commit:**

```bash
npx nest build          # must exit 0
npx jest src/<module>   # if the module has specs
```

Never commit with Git conflict markers in the tree. This repository has
already lost significant time to a merge committed with 197 unresolved
conflict hunks — see `PROBLEMS.md`.

---

## 2. Who owns what

> **Assumed mapping.** Voyager211 is Dev A because the activity-tracking
> module — a Dev A foundation piece — was just built under that account, and
> Anaswar4's commit history is new-module CRUD work, which matches Dev B's
> track. If this is backwards, swap the two names in this section; nothing
> else in the document depends on it.

### Voyager211 — Analytics & Reporting (Dev A)

Everything that **reads** behavioural data and aggregates it.

| Order | Task | Endpoints |
|---|---|:--:|
| 1 | **Answer-log module** — schema, write path, backfill | — |
| 2 | Dashboard | 5 |
| 3 | Reports — all four tabs | 4 |
| 4 | `/users/:id/weak-subjects` | 1 |
| 5 | `/exams/:id/results` | 1 |

**Owned directories — nobody else edits these:**

```
src/activity/        (already built)
src/answer-log/
src/reports/
src/dashboard/
```

**Task 1 — Answer-log module.** The critical path: Reports, weak-subjects and
exam results all depend on it, and nothing else can start until the schema
settles.

New table, roughly:

```
answer_log
  id, user_id, question_id, exam_id (nullable - null for practice)
  subject_id, topic_id, subtopic_id     -- denormalised at write time
  selected_answer, is_correct, time_taken_sec (nullable)
  answered_at
```

Denormalise the three taxonomy IDs at write time. Every Reports query and the
weak-subjects panel groups by subject or topic, and re-joining `questions` on
every aggregate will not hold up.

Two write points, both already stable:
- `QuestionsService.answerQuestion()` — practice answers
- the exam submit path in `ExamService` — one row per answer in the map

**Also write the backfill.** `exams.answers` is a `json` column holding
`questionId → selectedAnswer` for every completed attempt, alongside `score`
and `completedAt`. Joined against `questions.correctAnswer` and the taxonomy
tags, historical rows can be reconstructed. Reports therefore ship with
history instead of waiting weeks for data.

**Ship and push task 1 before starting task 3.** Every day the write path is
not deployed is a day of practice answers lost — the backfill recovers exam
answers, but standalone practice answers are gone for good.

**Task 2 — Dashboard.** Four of the five need nothing from the answer log:

| Endpoint | Source |
|---|---|
| `/dashboard/summary` | `users/count?role=user` · active batches · `subscriptions/stats/active-count` |
| `/dashboard/recent-questions` | `questions ORDER BY createdAt DESC LIMIT n` |
| `/dashboard/exam-attempts` | `exams GROUP BY date(createdAt)` |
| `/dashboard/dau` | `ActivityService.dailyActiveUsers(7, Role.User)` — **already built** |
| `/dashboard/upcoming-exams` | ⛔ blocked — nothing schedules an exam, see §5 |

`/dashboard/dau` is a thin controller over the existing service. Do not add a
controller to `src/activity/` — the endpoint belongs to the dashboard module.

**Task 5** is blocked on the attempt→catalogue FK decision in §5.

### Anaswar4 — Content & Platform (Dev B)

Everything that **writes** or serves content, plus the standalone modules.

| Order | Task | Endpoints |
|---|---|:--:|
| 1 | **Uploads** — presigned URL | 1 |
| 2 | `/settings/roles` | 1 |
| 3 | Notifications | 2 |
| 4 | Content Library | 5 |
| 5 | `/faculty/:id/contributions` | 1 |
| 6 | `/users/:id/recent-content` | 1 |

**Owned directories — nobody else edits these:**

```
src/uploads/
src/content/
src/notifications/
src/settings/
src/faculty/        (extending the existing module)
```

**Task 1 — Uploads.** Small, and gates Content Library, so do it first.
Presigned is the right call: keep file bytes off the API process. Return
`{ uploadUrl, fileUrl, key, expiresAt }`; the client PUTs directly to storage
then sends `fileUrl` on the subsequent create. Constrain content-type and
size in the signature, not only in the client.

**Task 2 — `/settings/roles`.** Nearly free: `GET /faculty/options` already
returns the `FacultyRole` list with display labels. Lift that shape.

**Task 5 — contributions.** Splits cleanly. Questions authored is
`questions WHERE createdBy = faculty.userId` and works today; content authored
waits for task 4. Ship the questions half first and extend it rather than
holding the endpoint back.

**Two endpoints you do not need to build:** `/faculty/:id/subjects` and
`/faculty/:id/batches`. The faculty row already embeds `subject: { id, name }`
and `assignedBatches: [{ id, name }]`, name-sorted.

### Not assigned

`/users/:id/doubts` needs the AI chatbot, which does not exist as a module, a
table, or a provider. It is a missing product surface, not a missing endpoint.
Track it with the chatbot work.

---

## 3. Shared areas — how to work in them without colliding

These files cannot be owned by one developer. **The rules in §2 do not forbid
touching them** — they forbid touching the *other developer's modules*. Work
in shared files freely, following the convention for each.

### `src/app.module.ts`

Both developers register modules here. Unavoidable.

**Rule: append your module to the end of the `imports` array, one line.
Never reorder existing entries, never regroup, never tidy.**

A one-line append conflict resolves in seconds. A reordered array produces a
conflict across the whole block, which is how this repo got into trouble
before.

### `/users/:id/*` routes — do NOT edit `users.controller.ts`

Both developers need a route under `/users/:id`. That file is the obvious
collision, so neither of you touches it. NestJS allows several controllers on
one base path:

- **Voyager211:** `src/reports/student-analytics.controller.ts`
  → `@Controller('users')` → `:id/weak-subjects`
- **Anaswar4:** `src/content/student-content.controller.ts`
  → `@Controller('users')` → `:id/recent-content`

Same public URLs, zero shared source.

### Existing service files

Each is edited by exactly one developer. If you need a change in a file the
other owns, **ask them — do not edit it yourself.**

| File | Who may edit | Why |
|---|---|---|
| `src/questions/questions.service.ts` | Voyager211 | answer-log write hook |
| `src/exam/exam.service.ts` | Voyager211 | answer-log write hook |
| `src/faculty/faculty.service.ts` | Anaswar4 | contributions query |
| `src/users/users.controller.ts` | **neither** | see above |
| `src/users/users.service.ts` | **neither** | hand-merged; changes need agreement |

### Other genuinely shared files

`src/common/**`, `.env.example`, `package.json`, `API_CONTRACT.md`.

Additive changes only — add your enum, your DTO, your variable, your section.
Do not refactor, rename, or reformat anything you did not add. If a shared
helper needs changing rather than extending, agree it first.

### Migrations

When migrations exist (§5), never edit another developer's migration file.
Always add a new one.

---

## 4. Working practices

**Pull before you start, push when you finish.** With two agents on one
branch, a stale local copy is the main way conflicts form.

```bash
git pull --rebase origin develop     # before starting
# ... work, build, test ...
git add -A && git commit -m "feat(scope): subject"
git push origin develop
```

**Rebase, do not merge.** `git pull --rebase` keeps the history linear. The
merge in `PROBLEMS.md` is what a merge commit on this branch looks like when
it goes wrong.

**Never commit with conflict markers.** Add this pre-commit hook once:

```bash
git diff --cached -U0 | grep -qE '^\+(<{7}|={7}|>{7})' \
  && { echo "conflict markers staged - aborting"; exit 1; } || exit 0
```

**Keep changes small.** If a change touches more than your own module plus a
one-line `app.module.ts` append, it is probably too big to land in one go.

**Update `API_CONTRACT.md` when you add endpoints.** Additively, in your own
section. It is the frontend team's only reference.

---

## 5. Open decisions that block work

Raise these with the product owner in week one. Two of them block specific
endpoints.

**D1 — Where does an exam schedule live?** Nothing in the catalogue carries a
date. `exam_stages` has `durationMinutes` but no date; `exam_posts` has none.
Options: a `scheduledAt` on `exam_stages`, or an `exam_schedules` table if one
stage runs on several dates for different batches. *Blocks
`/dashboard/upcoming-exams` (Voyager211).*

**D2 — How does an attempt link to the catalogue?** The `exams` attempt row
references `courseId` only — no `examPostId`, no `examStageId`. Results cannot
be grouped by catalogue exam. *Blocks `/exams/:id/results` (Voyager211).*

**D3 — `/exam` vs `/exams`.** The attempt session sits at `/exam` and the
catalogue at `/exams`, one character apart. Rename the attempt controller to
`/attempts` before `/exams/:id/results` is added.

**D4 — Migrations.** `synchronize: true` is still on and there is no
`migrations/` directory. The merge moved columns to snake_case, so **booting
against a database holding camelCase data will strand it.** Write a baseline
migration and set `synchronize: false` before any deployment with real data.
See `PROBLEMS.md` P7 and P12.

**D5 — `Role.Staff` gates nothing.** The role exists and `POST /faculty`
assigns it, but every admin endpoint still requires `admin`. A faculty member
can log in and reach almost nothing. Needs a decision before any
faculty-facing screen.

---

## 6. Project facts worth knowing

- **Stack:** NestJS 11 · TypeORM · PostgreSQL. Build with `npx nest build`.
- **Response envelope differs by environment.** `main.ts` registers the
  response interceptor only when `NODE_ENV !== 'production'`, so dev returns
  `{ status, message, data }` and production returns the bare object.
- **`forbidNonWhitelisted: true`.** Sending a property a DTO does not declare
  is a 400. Never PATCH back an object received from a GET.
- **Soft delete everywhere** except syllabus items and `DELETE /questions/:id`.
- **Audit fields come from the JWT**, never from the request body.
- **Columns are snake_case**, mapped to camelCase properties. The JSON stays
  camelCase.
- **`numeric` columns use `DecimalTransformer`** so they serialise as numbers,
  not strings. Apply it to any new `numeric` column.
- **Pagination is inconsistent:** `/users` and `/batches` return rows under
  `data`; `/faculty` returns them under `items`. Prefer `items` for new
  endpoints and note the divergence in `API_CONTRACT.md`.
- **Stale specs.** 19 pre-existing `tsc` errors live in `.spec.ts` files
  (`app`, `categories`, `course`, `questions`, `users`). They are excluded
  from `tsconfig.build.json`, so the build is unaffected — but `npm test`
  fails. Do not treat them as caused by your change.
- **`jest.config.js` has a typo:** `moduleNameMapping` should be
  `moduleNameMapper`, so the `src/` path alias silently does not work. Use
  relative imports.
