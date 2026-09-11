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
