%% ---------------------------------------------------------------------------
%% PSC backend - exam and syllabus architecture
%% ---------------------------------------------------------------------------
%%
%% Two independent structures joined by a syllabus:
%%
%%   EXAM STRUCTURE       exam_levels -> exam_posts -> exam_stages
%%   ACADEMIC STRUCTURE   subjects -> topics -> subtopics
%%   BRIDGE               exam_syllabi (one per stage) -> exam_syllabus_items
%%
%% The academic rows are global. "Indian Constitution" is ONE subject row that
%% every exam maps through a syllabus item - there is no per-exam copy such as
%% "SI Constitution" or "LDC Constitution".
%%
%% A syllabus item may map at three depths, which is why topic_id and
%% subtopic_id are nullable:
%%
%%   subject only              the whole subject is in the syllabus
%%   subject + topic           only that topic
%%   subject + topic + sub     only that subtopic
%%
%% Every table below except exam_syllabus_items carries the same audit block,
%% omitted from the diagram to keep it readable:
%%
%%   created_at, updated_at, deleted_at (soft delete)
%%   created_by, updated_by, deleted_by (user ids, taken from the JWT)
%%
%% exam_syllabus_items is hard-deleted: it is a mapping, not a record worth
%% keeping once it is removed from a syllabus.
%%
%% Uniqueness is enforced by PARTIAL unique indexes so a soft-deleted row does
%% not reserve a name forever, and - on the item table - because Postgres
%% treats NULLs in a unique index as distinct values, which is why the item
%% table needs three indexes rather than one.
%% ---------------------------------------------------------------------------

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
    %% EXAMS here is the attempt-session table (a user's run through a set of
    %% questions), which is why the catalog entity above is EXAM_POSTS. The
    %% two are different things and both are live.

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

    %% ---------------- existing tables, shown for context ----------

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
