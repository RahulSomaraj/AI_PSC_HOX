# Exam and Syllabus Architecture

Two independent structures joined by a syllabus.

| Structure | Tables |
|---|---|
| **Exam** | `exam_levels` → `exam_posts` → `exam_stages` |
| **Academic** | `subjects` → `topics` → `subtopics` |
| **Bridge** | `exam_syllabi` (one per stage) → `exam_syllabus_items` |

## Why the academic rows are global

"Indian Constitution" is one subject row. Every exam reaches it through a syllabus item — there is no per-exam copy such as "SI Constitution" or "LDC Constitution".

This is the point of the design. Without it, the same subject exists once per exam, and any question tagged to a subject can only ever be counted against one exam's analytics.

## Mapping depth

A syllabus item can map at three depths, which is why `topic_id` and `subtopic_id` are nullable.

| Item specifies | Meaning |
|---|---|
| subject only | the whole subject is in the syllabus |
| subject + topic | only that topic |
| subject + topic + subtopic | only that subtopic |

## Conventions

**Audit block.** Every table except `exam_syllabus_items` carries the same six columns, omitted from the diagram for readability:

```
created_at, updated_at, deleted_at     -- soft delete
created_by, updated_by, deleted_by     -- user ids, taken from the JWT
```

**`exam_syllabus_items` is hard-deleted.** It's a mapping, not a record worth keeping once it leaves a syllabus.

**Uniqueness uses partial indexes**, for two reasons. A soft-deleted row shouldn't reserve a name forever. And on the item table, Postgres treats NULLs in a unique index as distinct, so the nullable `topic_id` / `subtopic_id` combination needs three indexes rather than one.

## Naming: `exams` vs `exam_posts`

These are different things and both are live.

- **`exams`** — an attempt session. One row per user's run through a set of questions. Already exists.
- **`exam_posts`** — the catalog entry. The exam as a thing that exists before anyone sits it.

The catalog entity is called `exam_posts` precisely because `exams` was already taken.

## Diagram

```mermaid
erDiagram

    %% ======================= EXAM STRUCTURE =======================

    EXAM_LEVELS ||--o{ EXAM_POSTS : "groups"
    EXAM_POSTS ||--o{ EXAM_STAGES : "is held in"
    EXAM_STAGES ||--o| EXAM_SYLLABI : "has at most one"
    EXAM_POSTS ||--o{ EXAM_SYLLABI : "owns"
    EXAM_SYLLABI ||--o{ EXAM_SYLLABUS_ITEMS : "contains"

    %% ===================== ACADEMIC STRUCTURE =====================

    SUBJECTS ||--o{ TOPICS : "is split into"
    TOPICS ||--o{ SUBTOPICS : "is split into"

    %% ==================== BRIDGE (reuse, no copies) ===============

    SUBJECTS ||--o{ EXAM_SYLLABUS_ITEMS : "mapped by (required)"
    TOPICS ||--o{ EXAM_SYLLABUS_ITEMS : "narrowed by (optional)"
    SUBTOPICS ||--o{ EXAM_SYLLABUS_ITEMS : "narrowed by (optional)"

    %% ============ EXISTING MODULES - NOT PART OF THIS WORK ========

    USERS ||--o{ EXAMS : "attempts"
    COURSE ||--o{ EXAMS : "is attempted through"
    COURSE ||--o{ QUESTIONS : "holds"
    USERS ||--o{ ENROLLMENTS : "enrols via"
    COURSE ||--o{ ENROLLMENTS : "is enrolled in"
    USERS ||--o| ASPIRANT_PROFILES : "has"

    EXAM_LEVELS {
        int id PK
        varchar name "unique while not deleted"
        text description
        int sort_order "ascending"
        boolean is_active
    }

    EXAM_POSTS {
        int id PK
        int exam_level_id FK "RESTRICT"
        varchar name "unique per level while not deleted"
        varchar short_name
        text description
        varchar department
        text qualification
        int sort_order
        boolean is_active
    }

    EXAM_STAGES {
        int id PK
        int exam_id FK "RESTRICT - to exam_posts"
        varchar name "unique per exam while not deleted"
        int stage_order "dynamic - stages are data, not code"
        varchar exam_mode "objective descriptive practical physical interview document_verification other"
        int total_questions
        numeric total_marks
        int duration_minutes
        numeric negative_mark
        text description
        boolean is_active
    }

    SUBJECTS {
        int id PK
        varchar name "globally unique while not deleted"
        text description
        int sort_order
        boolean is_active
    }

    TOPICS {
        int id PK
        int subject_id FK "RESTRICT"
        varchar name "unique per subject while not deleted"
        text description
        int sort_order
        boolean is_active
    }

    SUBTOPICS {
        int id PK
        int topic_id FK "RESTRICT"
        varchar name "unique per topic while not deleted"
        text description
        int sort_order
        boolean is_active
    }

    EXAM_SYLLABI {
        int id PK
        int exam_id FK "RESTRICT - kept in step with the stage"
        int exam_stage_id FK "RESTRICT - one live syllabus per stage"
        varchar title
        text description
        boolean is_active
    }

    EXAM_SYLLABUS_ITEMS {
        int id PK
        int syllabus_id FK "CASCADE"
        int subject_id FK "RESTRICT - required"
        int topic_id FK "RESTRICT - nullable, must belong to subject_id"
        int subtopic_id FK "RESTRICT - nullable, must belong to topic_id"
        varchar priority "high medium low"
        numeric marks_weightage
        int question_weightage
        int sort_order
        boolean is_active
        timestamptz created_at "hard-deleted - no deleted_at"
    }

    USERS {
        int id PK
        varchar email "unique while not deleted"
        varchar role "user admin"
    }

    EXAMS {
        int id PK
        int userId FK "attempt session - NOT the exam catalog"
        int courseId FK
        json questionIds
        json answers
        int score
    }

    COURSE {
        int id PK
        varchar courseId "unique"
        varchar courseName
    }

    QUESTIONS {
        int id PK
        int courseId FK "future: also subject_id, topic_id, subtopic_id"
        text question
        json answers
    }

    ENROLLMENTS {
        int id PK
        int userId FK
        int courseId FK
    }

    ASPIRANT_PROFILES {
        int id PK
        int user_id FK "unique"
        date date_of_birth
    }
```

## Tables in this diagram

**New — this work**

`exam_levels`, `exam_posts`, `exam_stages`, `subjects`, `topics`, `subtopics`, `exam_syllabi`, `exam_syllabus_items`

**Existing — shown for context only**

`users`, `exams`, `course`, `questions`, `enrollments`, `aspirant_profiles`

## Open items

Not covered by this diagram, but required by the admin designs:

- `batches` — Students list column and filter, student profile, dashboard card, its own sidebar section
- `subscriptions` — dashboard card, student profile panel
- **Per-answer log** — one row per answer, tagged by subject. `questions` is noted as gaining `subject_id` / `topic_id` / `subtopic_id`, which makes subject-level analytics *possible*, but nothing yet records individual answers. The Weak Subjects panel depends on it.
- **PSC ID** — a column on `users`, or possibly on `aspirant_profiles`
- **Activity tracking** — Daily Active Users chart, student profile Activity tab