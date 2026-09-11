# PROBLEMS — the merge on `develop`

**Status:** 🟢 **RESOLVED — `develop` compiles.** `npx nest build` exits 0.
**Branch:** `develop`
**Root cause:** commit `c6e18c0 "merge"`
**Investigated:** 2026-09-11 · **Resolved:** 2026-09-11

---

## Resolution summary

All 197 conflict hunks across 47 files are resolved and the backend builds.

Resolved **forward** on top of `develop` rather than by reset-and-replay as
originally proposed below: `develop` was already pushed and shared, so
rewriting history would have required a force push. The broken commit stays
in the log as a record; the fix moves forward from it. The pre-fix state is
preserved on branch **`backup/broken-merge-c6e18c0`**.

| # | Problem | Outcome |
|---|---|---|
| P1 | 47 files / 197 hunks | ✅ **Fixed** — 0 markers, `nest build` exits 0 |
| P2 | Duplicate syllabus modules | ✅ **Fixed** — kept `src/syllabus/`, deleted `exam-syllabi/` + `exam-syllabus-items/` |
| P3 | `app.module.ts` markers + duplicates | ✅ **Fixed** — hand-written, each module registered once |
| P4 | Two `Batch` entities | ✅ **Fixed** — resolved to 🅰️ as forced by `faculty.service` |
| P5 | `/exams` vs `/exam-posts` | ✅ **Decided** — `/exams` (🅰️). ⚠️ see follow-up below |
| P6 | `examId` vs `examPostId` | ✅ **Decided** — `examId` (🅰️), consistent with `/exams` and `src/syllabus/` |
| P7 | snake_case vs camelCase columns | ✅ **Decided** — snake_case (🅰️). ⚠️ see follow-up below |
| P8 | `users.service` — both sides had keepers | ✅ **Hand-merged** — 🅱️'s pagination/count/exams **plus** 🅰️'s self-lockout guard and session revocation |
| P9 | `numeric` → string vs number | ✅ **Fixed** — `DecimalTransformer` retained; marks now serialise as numbers |
| P10 | `Role.Staff` gates nothing | ⬜ **Open** — unchanged, needs a product decision |
| P11 | Two pagination shapes | ⬜ **Open** — `data` vs `items` still differ |
| P12 | No migrations | ⬜ **Open** — `synchronize: true` still on |

### Verification

```
grep -rc "^<<<<<<< " src           → no matches
npx nest build                     → exit 0
tsc --noEmit, production code      → 0 errors
tsc --noEmit, *.spec.ts            → 19 errors (pre-existing stale tests,
                                      identical set to before the fix;
                                      excluded by tsconfig.build.json)
@InjectRepository ↔ forFeature     → all registrations match
node dist/main.js                  → DI graph resolves; stops only at
                                      Postgres auth (28P01), a .env matter
```

Resolved surface: **19 controllers, 147 routes** — one implementation, no variants.

Regression check — all five items in [§2](#2-verified-not-broken) re-verified after the fix:
security guards on `/course` and `/categories`, question taxonomy tagging,
`targetExamId`, `/users/count`, `/users/:id/exams`, and the faculty module are
all intact.

### Kept from 🅱️ that a naive "take A" would have dropped

`6c8343c` predates question tagging, so its taxonomy services have no
question guard. Taking 🅰️ wholesale would have allowed a subject, topic, or
subtopic to be soft-deleted out from under questions still tagged to it.
`c934900`'s guard was re-applied to all three services, with the `Question`
repository registered in all three modules.

### Follow-ups this resolution leaves open

1. **`/exam` and `/exams` now coexist** — the student attempt session and the
   exam catalogue, one character apart. Rename the attempt controller to
   `/attempts` in its own commit (P5).
2. **Column naming changed to snake_case** — if a database already holds data
   in camelCase columns, **do not boot with `synchronize: true`**. Write the
   rename migration first (P7, P12).
3. **P10, P11, P12 remain open** by design — each needs a decision rather
   than a merge resolution.

---

## Original diagnosis

*Everything below is the investigation as written before the fix, kept as the
record of what was wrong and why each decision was made.*

---

## TL;DR

```
Commit c6e18c0 was committed and pushed with Git conflict markers
still in the source.

  47 files            contain <<<<<<< / ======= / >>>>>>>
 197 conflict hunks
 615 build errors     (npx nest build → TS1185)
```

Both merge parents are individually clean and compile:

| Parent | Commit | Branch identity |
|---|---|---|
| **A** (first parent / `HEAD`) | `6c8343c` | "batches crud" — exam structure + unified syllabus |
| **B** (second parent) | `c934900` | security fix + question tagging + user pagination |

Nobody resolved the conflicts; `git commit` was run while the working tree still held markers. The fix is to redo the merge properly — not to patch around it.

**Good news first:** the auto-merged portion resolved *correctly*. Everything outside the 47 conflicted files is intact, including the security fix. See §2 before assuming wider damage.

---

## 1. Problem index

| # | Problem | Severity | Blocks |
|---|---|---|---|
| [P1](#p1--47-files-contain-unresolved-conflict-markers) | 47 files contain conflict markers | 🔴 Critical | Everything — no build, no deploy |
| [P2](#p2--two-syllabus-implementations-map-the-same-two-tables) | Two syllabus modules map the same tables | 🔴 Critical | Schema corruption under `synchronize` |
| [P3](#p3--appmodulets-has-markers-and-duplicate-registrations) | `app.module.ts` markers + duplicate imports | 🔴 Critical | App bootstrap |
| [P4](#p4--two-incompatible-batch-entities--already-decided-by-the-faculty-module) | Two incompatible `Batch` entities | 🟠 High | Batches screen, Faculty module |
| [P5](#p5--exam-post-controller-mounted-at-two-different-paths) | Exam posts mounted at `/exams` vs `/exam-posts` | 🟠 High | Every exam-catalog request path |
| [P6](#p6--exam-stage-foreign-key-has-two-names) | Exam-stage FK named `examId` vs `examPostId` | 🟠 High | Stage create/filter payloads |
| [P7](#p7--two-database-column-naming-conventions) | snake_case vs camelCase DB columns | 🟠 High | Schema compatibility, live data |
| [P8](#p8--usersservice--both-sides-hold-features-worth-keeping) | `users.service` — both sides have keepers | 🟠 High | Students list + admin security |
| [P9](#p9--numeric-columns-serialise-differently) | `numeric` → `string` vs `number` | 🟡 Medium | Frontend arithmetic |
| [P10](#p10--rolestaff-gates-nothing) | `Role.Staff` gates nothing | 🟡 Medium | Faculty-facing screens |
| [P11](#p11--two-pagination-response-shapes) | Two pagination shapes (`data` vs `items`) | 🟡 Medium | Frontend list components |
| [P12](#p12--no-migrations-synchronize-true) | No migrations, `synchronize: true` | 🟡 Medium | Any schema change in production |

---

## 2. Verified NOT broken

Checked explicitly, because these were the obvious things to fear. **Do not spend time re-fixing them.**

| Concern | Actual state | Evidence |
|---|---|---|
| Did the security fix get reverted? | ✅ **Intact** | `src/course/course.controller.ts` has **0** `@Public()` and 3 admin guards; `categories.controller.ts` has 5 admin guards |
| Did question taxonomy tagging survive? | ✅ **Intact** | `subjectId` present in `questions/entities/question.entity.ts` |
| Did `targetExamId` survive? | ✅ **Intact** | present in `aspirant-profiles/entities/aspirant-profile.entity.ts` |
| Did `/users/count` and `/users/:id/exams` survive? | ✅ **Present** | both routes exist in `users.controller.ts` (inside conflict markers, but retained) |
| Is the new Faculty module damaged? | ✅ **Clean** | `src/faculty/` — **0** conflict markers, compiles, has tests |

The merge only failed where both branches edited the same eight resources. Everything else combined cleanly and correctly.

---

## P1 — 47 files contain unresolved conflict markers

### Evidence

```
$ grep -rln "^<<<<<<< " src --include=*.ts | wc -l
47

$ grep -rc "^<<<<<<< " src --include=*.ts | awk -F: '{s+=$2} END {print s}'
197

$ npx nest build
Found 615 error(s).   # TS1185: Merge conflict marker encountered
```

Worst-affected files:

| Hunks | File |
|---:|---|
| 12 | `src/exam-levels/exam-levels.controller.ts` |
| 11 | `src/exam-stages/exam-stages.controller.ts` |
| 10 | `src/subtopics/subtopics.service.ts` |
| 10 | `src/exam-levels/exam-levels.service.ts` |
| 10 | `src/batches/batches.controller.ts` |
| 9 | `src/topics/topics.service.ts`, `src/subtopics/subtopics.controller.ts`, `src/subjects/subjects.controller.ts`, `src/batches/batches.service.ts` |
| 8 | `src/topics/topics.controller.ts`, `src/subjects/subjects.service.ts`, `src/exam-stages/exam-stages.service.ts` |

Full list in [Appendix A](#appendix-a--all-47-conflicted-files).

### Impact

Nothing builds. No dev server, no deploy, no tests. The frontend team is blocked on eight resources and is currently building against a document that has to describe *both* sides of every conflict.

### Solution

**Do not hand-edit the 197 hunks in place.** Redo the merge from the two clean parents so Git re-presents each conflict with proper context:

```bash
git checkout develop
git branch backup/broken-merge-c6e18c0        # keep the evidence
git reset --hard 6c8343c                      # parent A, clean
git merge c934900                             # replay the merge
# resolve each conflict using §P4–P8 and Appendix A
npx nest build                                # must exit 0
git commit
```

Preserve `8bb8618` (faculty) by cherry-picking it on top afterwards, or by branching from it and rebasing.

**Acceptance:** `npx nest build` exits 0 and `grep -rc "^<<<<<<< " src` returns nothing.

---

## P2 — Two syllabus implementations map the same two tables

### Evidence

```
src/syllabus/entities/exam-syllabus.entity.ts:32       @Entity({ name: 'exam_syllabi' })
src/exam-syllabi/entities/exam-syllabus.entity.ts:26   @Entity({ name: 'exam_syllabi' })

src/syllabus/entities/exam-syllabus-item.entity.ts:49        @Entity({ name: 'exam_syllabus_items' })
src/exam-syllabus-items/entities/exam-syllabus-item.entity.ts:49  @Entity({ name: 'exam_syllabus_items' })
```

All three modules are registered in `app.module.ts` (`SyllabusModule`, `ExamSyllabiModule`, `ExamSyllabusItemsModule`), and `entities: [dist/**/*.entity.js]` loads every entity file it finds.

### Impact

Two TypeORM entity classes claiming one table, with **different columns**, under `synchronize: true`. At best TypeORM refuses to start; at worst it alternately adds and drops columns on every boot. This is the single most dangerous item here because it can destroy data rather than just fail loudly.

### Comparison

| | 🅰️ `src/syllabus/` | 🅱️ `exam-syllabi/` + `exam-syllabus-items/` |
|---|---|---|
| Modules | 1 | 2 |
| Endpoints | **17** | 10 |
| Base path | `/syllabus` | `/exam-syllabi`, `/exam-syllabus-items` |
| Syllabus FK | `examId` | `examPostId` |
| `title` | optional | **required**, ≤ 200 |
| Item audit fields | `createdAt`, `updatedAt`, `createdBy`, `updatedBy` | `createdAt` only |
| `marksWeightage` | `numeric(6,2)` → number | `numeric(5,2)` → string |
| Re-point an item | ❌ delete + recreate | ✅ PATCH with re-validation |
| Nested tree endpoint | ✅ `GET /:id/tree` | ❌ |
| One-call create | ✅ `POST /syllabus/mappings` | ❌ |
| Depth-scoped deletes | ✅ by subject/topic/subtopic | ❌ |
| Seed data | ✅ `exam-syllabus.seed.ts` (1046 lines) | ❌ |

### Solution

**Keep `src/syllabus/` (🅰️). Delete `src/exam-syllabi/` and `src/exam-syllabus-items/`.**

Reasons: it is the larger and more complete implementation (17 endpoints vs 10), it ships the render-ready `/tree` endpoint and the one-call `POST /mappings` that the syllabus-builder UI needs, it carries fuller audit columns on items, and it comes with seed data. Losing PATCH-based item re-pointing is an acceptable trade — delete-and-recreate is equivalent for a mapping row.

```bash
git rm -r src/exam-syllabi src/exam-syllabus-items
# remove ExamSyllabiModule + ExamSyllabusItemsModule from app.module.ts
```

Then check for stragglers — `subjects.service` on side A already imports from `../syllabus/`:

```bash
grep -rn "exam-syllabi\|exam-syllabus-items" src
```

**Acceptance:** exactly one `@Entity({ name: 'exam_syllabi' })` and one `@Entity({ name: 'exam_syllabus_items' })` in the tree.

---

## P3 — `app.module.ts` has markers and duplicate registrations

### Evidence

Two conflict hunks, one in the import block and one in the `imports:` array. Beyond the markers, the array registers **seven modules twice**: `SubjectsModule`, `TopicsModule`, `SubtopicsModule`, `BatchesModule`, `ExamLevelsModule`, `ExamPostsModule`, `ExamStagesModule`.

### Impact

The file cannot compile. Even once the markers go, duplicate registrations are a code smell that hides which modules are actually wired.

### Solution

Hand-write the `imports:` array rather than picking a side. Target state — each module **once**, grouped:

```ts
imports: [
  ConfigModule.forRoot(),
  TypeOrmModule.forRootAsync({ /* unchanged */ }),

  // Identity
  UsersModule, AuthModule, AspirantProfilesModule, FacultyModule,

  // Exam structure: level → post → stage → syllabus
  ExamLevelsModule, ExamPostsModule, ExamStagesModule, SyllabusModule,

  // Academic structure: subject → topic → subtopic
  SubjectsModule, TopicsModule, SubtopicsModule,

  // Cohorts and commerce
  BatchesModule, SubscriptionsModule,

  // Content and delivery
  CategoriesModule, CourseModule, QuestionsModule,
  EnrollmentsModule, ExamModule,
],
```

NestJS deduplicates module imports, so the duplicates were harmless at runtime — but they mask exactly the kind of mistake that produced this merge.

**Acceptance:** no markers; no module name appears twice.

---

## P4 — Two incompatible `Batch` entities — already decided by the faculty module

### Evidence

```
🅰️ 6c8343c  name(200, globally unique), examId FK, mode, studentCount,
            startDate, endDate, status, description
🅱️ c934900  name(100, unique per name+shift), shift, isActive
```

Only `id`, `name`, and the audit block overlap.

**The decision is already forced.** `src/faculty/faculty.service.ts:76` — part of the clean, newest commit — does:

```ts
.leftJoin('searchBatch.exam', 'searchExam', 'searchExam.deletedAt IS NULL')
```

`batch.exam` exists **only** on variant A. Variant B's Batch entity contains zero references to `exam`:

```
$ git show 6c8343c:src/batches/entities/batch.entity.ts | grep -c exam
9
$ git show c934900:src/batches/entities/batch.entity.ts | grep -c exam
0
```

### Impact

If the merge resolves batches to 🅱️, the faculty module stops compiling. Faculty is the newest, cleanest, most complete module in the codebase and is the only one of the frontend's nine requested modules that is live.

### Solution

**Resolve every `src/batches/**` conflict to variant 🅰️ (`6c8343c`).** Not a judgement call — it is the only option that keeps faculty working.

```bash
git checkout 6c8343c -- src/batches/
git checkout 6c8343c -- src/common/enums/batch-mode.enum.ts \
                        src/common/enums/batch-status.enum.ts
```

**Side effect worth telling the frontend team:** the Batches "8 of 10 fields missing" gap they reported was measured against 🅱️. Under 🅰️ that gap mostly closes for free — `examId`, `mode`, `status`, `startDate`, `endDate`, `studentCount`, and `description` all already exist.

**Note:** `shift` (Morning/Evening) exists in **neither** resolved outcome. If the designs still need it, it is a new field on 🅰️'s entity, not a reason to choose 🅱️.

**Acceptance:** `faculty.service.ts` compiles; `Batch` has `examId`, `mode`, `status`.

---

## P5 — Exam-post controller mounted at two different paths

### Evidence

```
src/exam-posts/exam-posts.controller.ts:48   @Controller('exams')      ← 🅰️
src/exam-posts/exam-posts.controller.ts:54   @Controller('exam-posts') ← 🅱️
```

Both decorators are currently present in the same file, separated by conflict markers.

### Impact

Every request path for the exam catalog. The frontend team's requested endpoint list (`GET /exams`, `POST /exams`, …) assumes 🅰️.

Complicating it: a **different**, stable controller already owns `/exam` (singular) — the student attempt session. So the tree would carry `/exam` and `/exams` as unrelated resources one character apart.

### Solution

**Adopt 🅰️'s `/exams`** — it matches what the frontend has already specced, and `exam_posts` is only an internal table name.

Then **rename the attempt-session controller** from `/exam` to something unambiguous — `/attempts` or `/exam-attempts` — in a separate, clearly-labelled commit. Two resources distinguished only by a trailing `s` will cause production bugs.

If renaming is too disruptive right now, take 🅱️'s `/exam-posts` instead and have the frontend adjust one constant. **Do not ship `/exam` and `/exams` side by side.**

**Acceptance:** one `@Controller` decorator in the file; no two route bases differing only by pluralisation.

---

## P6 — Exam-stage foreign key has two names

### Evidence

| | 🅰️ | 🅱️ |
|---|---|---|
| Property | `examId` | `examPostId` |
| DB column | `exam_id` | `examPostId` |
| Create body | `{ examId }` | `{ examPostId }` |
| List filter | `?examId=` | `?examPostId=` |
| Default `stageOrder` | 1 | 0 |

Both point at the same `exam_posts` row.

### Impact

Changes the request body and query string for every stage operation. Also affects the syllabus entity, which carries the same FK under the same two names.

### Solution

**Take 🅰️'s `examId`**, for consistency with the `/exams` path chosen in P5 and with `src/syllabus/`, which already uses `examId`.

Sweep for the losing name afterwards:

```bash
grep -rn "examPostId" src
```

Be aware 🅱️'s name is arguably clearer (`architecture.md` explains that `exams` is the attempt table and `exam_posts` the catalog). If P5 is resolved the other way, resolve P6 to `examPostId` too — **the two must agree**.

**Acceptance:** one FK name across exam-stages, syllabus, and every DTO.

---

## P7 — Two database column naming conventions

### Evidence

```ts
// 🅰️  src/subjects/entities/subject.entity.ts
@Column({ name: 'sort_order', type: 'int', default: 0 })  sortOrder: number;
@Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;
@CreateDateColumn({ name: 'created_at', … })
@Index('UQ_subjects_name_active', ['name'], { where: '"deleted_at" IS NULL' })

// 🅱️  same file, other side
@Column({ type: 'int', default: 0 })  sortOrder: number;      // column "sortOrder"
@Index('UQ_subjects_name_active', ['name'], { where: '"deletedAt" IS NULL' })
```

### Impact

**The JSON is identical either way** — the API emits camelCase in both cases, so the frontend is unaffected. But the two produce **different physical schemas**. Under `synchronize: true`, resolving to the opposite side of whatever is currently in the database will have TypeORM add new snake_case columns and leave the camelCase ones orphaned — silently, with the data stranded in the old columns.

Note the partial-index predicates differ too (`"deleted_at"` vs `"deletedAt"`), so a mismatch also breaks uniqueness enforcement.

### Solution

1. **Pick 🅰️ (snake_case)** — conventional for Postgres, already used by `faculty`, `aspirant_profiles`, and `subscriptions`.
2. **Before deploying, check what the database actually has:**
   ```sql
   SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema='public' AND column_name IN ('sortOrder','sort_order','isActive','is_active')
   ORDER BY table_name;
   ```
3. If live data sits in camelCase columns, **write a rename migration** — do not let `synchronize` do it:
   ```sql
   ALTER TABLE subjects RENAME COLUMN "sortOrder" TO sort_order;
   ```
4. See [P12](#p12--no-migrations-synchronize-true) — this is exactly why `synchronize: true` has to go.

**Acceptance:** one convention across all entities; index predicates quote the matching column name.

---

## P8 — `users.service` — both sides hold features worth keeping

### Evidence

This is the one conflict where **picking a side loses something real**.

🅰️ has a materially better `setStatus`:

```ts
// 🅰️  — self-lockout guard + session revocation
async setStatus(id: number, isActive: boolean, actorId?: number) {
  if (!isActive && actorId !== undefined && id === actorId) {
    throw new ForbiddenException('You cannot deactivate your own account');
  }
  user.isActive = isActive;
  user.updatedBy = actorId ?? null;
  const saved = await this.userRepositories.save(user);
  if (!isActive) {
    await this.sessionRepository.update({ user: { id }, revoked: false },
                                        { revoked: true });
  }
  return saved;
}

// 🅱️  — no guard, no revocation
async updateStatus(id: number, isActive: boolean) {
  user.isActive = isActive;
  return await this.userRepositories.save(user);
}
```

🅱️ has everything the Students screen depends on: paginated `findAll` with `search`/`role`/`courseId`/`targetExamId`/`batchId`/`isActive`/`sortBy`, plus `countByRole`, `findExamsForUser`, and `attachPscIds`. 🅰️ returns a bare array and has neither.

### Impact

- Resolve to 🅰️ → Students list loses pagination and filtering; the dashboard loses **Total Students**; the profile loses **Mock Test Scores**.
- Resolve to 🅱️ → an admin can deactivate their own account and lock themselves out, and a deactivated user keeps a live session able to mint fresh tokens through `POST /auth/refresh` (which does not check `isActive`).

Both outcomes are unacceptable. **This file must be merged by hand.**

### Solution

Combine them:

1. Take **🅱️'s** `findAll`, `countByRole`, `findExamsForUser`, `attachPscIds`, and the `FindUsersQueryDto` wiring.
2. Take **🅰️'s** `setStatus` body — the self-deactivation guard and the session revocation.
3. Keep **one** method name. Standardise on `updateStatus` (matches the existing `PATCH /users/:id/status` controller binding) but with 🅰️'s implementation, and thread `actorId` through from `@GetUser('id')`.
4. Inject **both** `UserSession` (🅰️) and `DataSource` (🅱️) — the two constructor hunks are additive, not exclusive.

Apply the same treatment to `src/users/users.controller.ts` (4 hunks): keep 🅱️'s `/count` and `/:id/exams` routes and its `Role.User`-scoped `findOne`, and pass the actor ID into the status route.

**Acceptance:** `GET /users` paginates; `/users/count` and `/users/:id/exams` respond; an admin cannot deactivate themselves; deactivating a user revokes their sessions.

---

## P9 — `numeric` columns serialise differently

### Evidence

🅰️ adds `src/common/transformers/decimal.transformer.ts`:

```ts
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
```

Applied to `ExamStage.totalMarks`, `ExamStage.negativeMark`, and syllabus-item `marksWeightage`. 🅱️ has no transformer, so the `pg` driver's raw strings reach the client: `"100.00"`.

### Impact

`"100.00" > 50` is `false` in JavaScript. Any frontend comparison or arithmetic on these fields is silently wrong under 🅱️. The precisions also differ — `marksWeightage` is `numeric(6,2)` on 🅰️ and `numeric(5,2)` on 🅱️.

### Solution

**Take 🅰️ — keep `DecimalTransformer`** and apply it to every `numeric` column, including any added later. Numbers crossing the API as numbers is the correct contract.

Until the merge lands, the frontend should keep wrapping these in `Number(...)`, which is safe under both.

**Acceptance:** every `type: 'numeric'` column declares `transformer: DecimalTransformer`; responses show `12.5`, not `"12.50"`.

---

## P10 — `Role.Staff` gates nothing

### Evidence

`8bb8618` added `Staff` to the role enum:

```ts
export enum Role { User = 'user', Admin = 'admin', Staff = 'staff' }
```

`POST /faculty` assigns it. But no route accepts it — every admin endpoint is `@Roles(Role.Admin)`, and the permissive ones are `@Roles(Role.User, Role.Admin)`.

### Impact

A faculty member can log in and then reach almost nothing. `RolesGuard` throws `ForbiddenException` on every admin route, and they are not `Role.User` either, so they fail the user+admin routes too. The role is currently write-only.

### Solution

Not urgent — no faculty-facing screens exist yet — but decide before building any:

1. Define what each `FacultyRole` may do. A first cut matching the designs:
   - `teacher` → read students and batches; read/write questions on their subject
   - `content_creator` → read/write Content Library and questions
   - `reviewer` → read-only across content; approve/reject questions
2. Add `Role.Staff` to the `@Roles(...)` list on the endpoints those map to.
3. For subject-scoped access, `RolesGuard` alone is not enough — it only checks the role string. A resource-level guard that compares `faculty.subjectId` against the target row is needed.

**Acceptance:** a `staff` user can reach the endpoints their `FacultyRole` implies and is refused elsewhere.

---

## P11 — Two pagination response shapes

### Evidence

| Endpoint | Rows key |
|---|---|
| `GET /users` (🅱️) | `data` |
| `GET /batches` (🅰️) | `data` |
| `GET /faculty` (clean, newest) | **`items`** |

All three otherwise return `{ total, page, limit, totalPages }`.

### Impact

The frontend cannot share one paginated list type or one table component without an adapter. New modules will keep copying whichever neighbour they were written next to.

### Solution

Pick one and apply it everywhere. **Recommend `items`** — it reads better against the sibling `total`, and it avoids `data.data` when the dev-mode response interceptor wraps the body.

Whichever is chosen, extract a shared DTO so the next module cannot drift:

```ts
// src/common/dto/paginated.dto.ts
export class PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Coordinate the rename with the frontend — it is a breaking change on two endpoints.

**Acceptance:** every paginated endpoint returns the same key; one shared DTO.

---

## P12 — No migrations, `synchronize: true`

### Evidence

`src/app.module.ts`:

```ts
const config: any = {
  type: 'postgres',
  entities: [join(process.cwd(), 'dist/**/*.entity.js')],
  synchronize: true,
  …
};
```

No `migrations` directory anywhere in the repo.

### Impact

TypeORM rewrites the live schema from the entity files on every boot. Combined with [P2](#p2--two-syllabus-implementations-map-the-same-two-tables) (two entities, one table) and [P7](#p7--two-database-column-naming-conventions) (two naming conventions), this is how data gets destroyed rather than merely how a deploy fails.

It also means the API contract can change under the frontend between deploys with no record of what changed.

### Solution

Before the resolved merge is deployed anywhere with real data:

1. Set `synchronize: process.env.NODE_ENV !== 'production'` as an immediate stopgap.
2. Generate a baseline migration from the current schema:
   ```bash
   npx typeorm migration:generate src/database/migrations/Baseline -d dist/data-source.js
   ```
3. Set `synchronize: false` and `migrationsRun: true`.
4. Every schema change after that is a reviewed migration file.

This is what makes P7's column rename safe instead of destructive.

**Acceptance:** `synchronize` is false in production; a `migrations/` directory exists and runs on boot.

---

## 3. Recommended resolution order

| Step | Action | Reference |
|---|---|---|
| 1 | Branch `backup/broken-merge-c6e18c0` off the current `develop` | [P1](#p1--47-files-contain-unresolved-conflict-markers) |
| 2 | Reset to `6c8343c`, replay `git merge c934900` | [P1](#p1--47-files-contain-unresolved-conflict-markers) |
| 3 | Settle the three naming decisions **first** — they change many files: `/exams` path, `examId` FK, snake_case columns | [P5](#p5--exam-post-controller-mounted-at-two-different-paths) [P6](#p6--exam-stage-foreign-key-has-two-names) [P7](#p7--two-database-column-naming-conventions) |
| 4 | Resolve the taxonomy and exam-structure files to 🅰️ | [Appendix A](#appendix-a--all-47-conflicted-files) |
| 5 | Resolve batches to 🅰️ (forced) | [P4](#p4--two-incompatible-batch-entities--already-decided-by-the-faculty-module) |
| 6 | Hand-merge `users.service.ts` and `users.controller.ts` | [P8](#p8--usersservice--both-sides-hold-features-worth-keeping) |
| 7 | Hand-write `app.module.ts` | [P3](#p3--appmodulets-has-markers-and-duplicate-registrations) |
| 8 | Delete `exam-syllabi/` and `exam-syllabus-items/` | [P2](#p2--two-syllabus-implementations-map-the-same-two-tables) |
| 9 | `npx nest build` → must exit 0 | |
| 10 | Cherry-pick `8bb8618` (faculty) if it was not carried through | |
| 11 | Verify §2's five "not broken" items are still not broken | [§2](#2-verified-not-broken) |
| 12 | Baseline migration, then `synchronize: false` | [P12](#p12--no-migrations-synchronize-true) |
| 13 | Regenerate `API_CONTRACT.md` against the resolved tree | |

Steps 1–10 are one focused session. Step 3 is the part to agree as a team before anyone starts editing — getting it wrong means redoing steps 4–6.

---

## Appendix A — all 47 conflicted files

`hunks` = count of `<<<<<<<` markers. **Verdict** is the recommended resolution.

### Take 🅰️ (`6c8343c`) — richer implementation, no 🅱️-only features to preserve

| Hunks | File |
|---:|---|
| 12 | `src/exam-levels/exam-levels.controller.ts` |
| 11 | `src/exam-stages/exam-stages.controller.ts` |
| 10 | `src/subtopics/subtopics.service.ts` |
| 10 | `src/exam-levels/exam-levels.service.ts` |
| 10 | `src/batches/batches.controller.ts` |
| 9 | `src/topics/topics.service.ts` |
| 9 | `src/subtopics/subtopics.controller.ts` |
| 9 | `src/subjects/subjects.controller.ts` |
| 9 | `src/batches/batches.service.ts` |
| 8 | `src/topics/topics.controller.ts` |
| 8 | `src/exam-stages/exam-stages.service.ts` |
| 6 | `src/exam-stages/dto/create-exam-stage.dto.ts` |
| 5 | `src/exam-posts/exam-posts.controller.ts` |
| 4 | `src/topics/entities/topic.entity.ts` |
| 4 | `src/topics/dto/create-topic.dto.ts` |
| 4 | `src/subtopics/entities/subtopic.entity.ts` |
| 4 | `src/subtopics/dto/create-subtopic.dto.ts` |
| 4 | `src/subjects/entities/subject.entity.ts` |
| 4 | `src/exam-stages/entities/exam-stage.entity.ts` |
| 4 | `src/exam-posts/entities/exam-post.entity.ts` |
| 4 | `src/exam-levels/entities/exam-level.entity.ts` |
| 3 | `src/subjects/dto/create-subject.dto.ts` |
| 3 | `src/exam-posts/dto/create-exam-post.dto.ts` |
| 3 | `src/exam-levels/dto/create-exam-level.dto.ts` |
| 2 | `src/exam-posts/exam-posts.service.ts` |
| 2 | `src/batches/entities/batch.entity.ts` |
| 2 | `src/batches/dto/create-batch.dto.ts` |
| 1 | `src/topics/topics.module.ts` |
| 1 | `src/topics/dto/update-topic.dto.ts` |
| 1 | `src/subtopics/subtopics.module.ts` |
| 1 | `src/subtopics/dto/update-subtopic.dto.ts` |
| 1 | `src/subjects/subjects.module.ts` |
| 1 | `src/subjects/dto/update-subject.dto.ts` |
| 1 | `src/exam-stages/exam-stages.module.ts` |
| 1 | `src/exam-stages/dto/update-exam-stage.dto.ts` |
| 1 | `src/exam-posts/exam-posts.module.ts` |
| 1 | `src/exam-posts/dto/update-exam-post.dto.ts` |
| 1 | `src/exam-levels/exam-levels.module.ts` |
| 1 | `src/exam-levels/dto/update-exam-level.dto.ts` |
| 1 | `src/batches/dto/update-batch.dto.ts` |
| 1 | `src/batches/batches.module.ts` |

### Take 🅰️ but re-add a 🅱️ guard

| Hunks | File | Note |
|---:|---|---|
| 8 | `src/subjects/subjects.service.ts` | 🅰️ guards delete against **syllabus items**; 🅱️ guards against **questions**. Keep 🅰️'s `getHierarchy()` and add 🅱️'s `Question` repository check — a subject with questions attached must not be deletable |

### Hand-merge — both sides have keepers

| Hunks | File | Note |
|---:|---|---|
| 4 | `src/users/users.service.ts` | See [P8](#p8--usersservice--both-sides-hold-features-worth-keeping) |
| 4 | `src/users/users.controller.ts` | See [P8](#p8--usersservice--both-sides-hold-features-worth-keeping) |
| 2 | `src/app.module.ts` | See [P3](#p3--appmodulets-has-markers-and-duplicate-registrations) — hand-write |

### Cosmetic — either side is functionally identical

| Hunks | File | Note |
|---:|---|---|
| 1 | `src/common/enums/exam-mode.enum.ts` | Same 7 values on both sides; only the comment differs |
| 1 | `src/common/enums/syllabus-priority.enum.ts` | Same 3 values on both sides; only the comment differs |

---

*Investigated 2026-09-11 against `develop` @ `8bb8618`. Conflicted sides read from clean parents `6c8343c` (🅰️) and `c934900` (🅱️). Companion document: `API_CONTRACT.md`.*
