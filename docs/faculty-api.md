# Faculty & Staff API

Backend support for the Faculty & Staff administration screen. All routes require
`Authorization: Bearer <admin-access-token>`. The base path is `/faculty`;
Swagger documentation is available at `/docs` when the application runs.

| Action | Request |
| --- | --- |
| Add faculty | `POST /faculty` |
| List/search/filter | `GET /faculty` |
| Populate dropdowns | `GET /faculty/options` |
| View details | `GET /faculty/:id` |
| Edit details and assignments | `PATCH /faculty/:id` |
| Activate/deactivate | `PATCH /faculty/:id/status` |
| Delete | `DELETE /faculty/:id` |

## Add faculty

```json
{
  "firstName": "Omari",
  "lastName": "Everett",
  "email": "omari@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "subjectId": 1,
  "role": "teacher",
  "batchIds": [1, 2],
  "isActive": true
}
```

Required: first and last name, email, phone, password, subject ID, and job role.
Optional: `photoURL`, `batchIds` (defaults to no assignments), and `isActive`
(defaults to true). Phone and password validation follows account registration.
The subject and every batch must exist and must not be soft-deleted.

Job roles are `teacher`, `reviewer`, and `content_creator`. These belong to the
faculty profile. The linked login account always has the separate `staff`
permission role; creating or editing a faculty member cannot grant admin access.
This change does not grant staff permission to administer questions, exams, or
other resources. Those permissions remain governed by their existing routes.

Creation writes the account, hashed password, faculty profile, and assignments
in one database transaction. Existing live account emails return `409`, including
when simultaneous requests race to register the same email. This endpoint creates
a new account; it does not convert an existing student or administrator.

## List and filters

```text
GET /faculty?page=1&limit=10&search=Omari&subjectId=1&role=teacher&isActive=true
```

All filters are optional and combine with AND:

| Parameter | Meaning |
| --- | --- |
| `search` | Case-insensitive match on full name, email, subject, assigned batch, or its exam name; maximum 100 characters |
| `subjectId` | Subject filter |
| `role` | Job role filter |
| `isActive` | `true` or `false`; omit for all statuses |
| `batchId` | Assigned batch filter |
| `page` | One-based page, default 1 |
| `limit` | Rows per page, 1–100, default 10 |

The response payload is:

```json
{
  "items": [
    {
      "id": 1,
      "userId": 12,
      "firstName": "Omari",
      "lastName": "Everett",
      "name": "Omari Everett",
      "email": "omari@example.com",
      "phone": "9876543210",
      "photoURL": null,
      "subjectId": 1,
      "subject": { "id": 1, "name": "Physics" },
      "role": "teacher",
      "assignedBatches": [{ "id": 1, "name": "Batch A" }],
      "isActive": true,
      "lastLogin": null,
      "createdAt": "2026-09-10T08:00:00.000Z",
      "updatedAt": "2026-09-10T08:00:00.000Z",
      "subjects": ["Physics"],
      "batches": ["Batch A"],
      "lastLoginAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

Results are ordered by creation date, then ID, descending. Multiple batches do
not duplicate faculty rows; filtering on one batch still returns all current
assignments. An empty result has `items: []` and `totalPages: 0`.

The existing development response interceptor wraps this payload under `data`
with `status` and `message`; production currently returns the payload directly.
Using `items` inside the payload keeps pagination metadata together in both modes.

**`subjects`, `batches` and `lastLoginAt` are the console's `FacultyMember`
names**, sent beside the fuller fields rather than replacing them:

| Console field | Same data as | Notes |
| --- | --- | --- |
| `subjects: string[]` | `subject.name` | A list because the design draws several. The table holds **one** subject per faculty member, so this is `[]` or a single name. Several subjects needs a `faculty_subjects` join table. |
| `batches: string[]` | `assignedBatches[].name` | Same name-sorted order. Use `assignedBatches` when you need the ids. |
| `lastLoginAt` | `lastLogin` | Always an ISO timestamp, or `null`. |

Table mapping: compute serial number as `(page - 1) * limit + rowIndex + 1`;
render `name`, `subject.name`, the role label, `assignedBatches[].name`,
`lastLogin`, and the Active/Inactive label for `isActive`. Format login timestamps
in the viewer's timezone. `lastLogin` is the most recent session creation time,
including revoked/expired sessions; it is null before the first login. Refreshing
a token does not change it. Password hashes and session tokens are never returned.

`GET /faculty/options` returns `subjects`, `batches`, `roles`, and `statuses`.
Subjects/batches contain `{ id, name }`; roles/statuses contain `{ value, label }`.
Use these for both the filter controls and add/edit forms. Deleted subjects and
batches are excluded. If an assigned subject is subsequently soft-deleted, the
faculty row remains visible with `subject: null`; deleted batches are omitted
from the visible assignments.

## Edit, status, and delete

`PATCH /faculty/:id` accepts any subset of the create fields except `password`.
Omitted fields retain their values. Send `batchIds: []` to clear all assignments;
send another array to replace them. An empty update returns `400`. Password
changes use the existing authentication endpoints. IDs and audit actors cannot
be supplied in the body.

```json
{
  "role": "reviewer",
  "subjectId": 2,
  "batchIds": [3]
}
```

`PATCH /faculty/:id/status` requires a JSON boolean, for example
`{ "isActive": false }`. Deactivation updates the login account and revokes its
sessions in the same transaction. Reactivation enables new sessions; it does not
revive old sessions.

`DELETE /faculty/:id` soft-deletes both the faculty profile and linked account,
deactivates the account, revokes sessions, and invalidates unused password-reset
tokens in one transaction. It keeps audit history and historical assignments.
Deleted records disappear from lists and return `404` on view/edit/delete.
The linked subject and batches are not deleted.

## Schema and verification

The new TypeORM entities use `faculty` and `faculty_batches`. Account identity,
credentials, and status remain in `users`. The project currently uses TypeORM
`synchronize: true`; no separate migration runner exists. Schema changes were
not applied to a database during this task.

Run the focused tests with:

```text
npm test -- --runInBand --testPathPatterns=faculty --silent
```

55 tests cover service behavior and HTTP contracts. Database operations are
mocked, as are the existing conflicted Subject/Batch entity modules. The real
faculty DTOs, service, controller, and role guard are exercised; HTTP tests replace
JWT verification with an authenticated identity fixture. They do not constitute
a database integration or full login test.

The checkout already contains committed merge-conflict markers in application,
user, batch, subject, topic, and exam modules. `npm run build` currently fails on
those existing markers. The faculty source has no TypeScript diagnostics, but the
application cannot run until the baseline conflicts are resolved. In particular,
exam-name search uses the `Batch.exam` relation from the exam-targeted batch model
on the HEAD side of the existing conflict. Preserve that relation when resolving
the batch model, or adapt the search if a different model is chosen.

This repository contains no frontend application; the UI can consume the routes
above once the backend builds and its database schema is initialized.
