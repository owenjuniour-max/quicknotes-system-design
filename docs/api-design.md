# QuickNotes REST API Design

## 1. Overview & Authentication
- **Base URL**: `https://api.quicknotes.internal/v1`
- **Data Format**: `application/json` (UTF-8)
- **Authentication**: Bearer Token via HTTP header:
  ```http
  Authorization: Bearer <jwt_access_token>
Error Format: Every error returns a standard JSON object containing error, message, and timestamp.
2. API Endpoints
1. List Notes
Method: GET
Path: /notes
Description: Retrieves a paginated list of notes belonging to the authenticated user. Supports optional query parameters ?limit=10&page=1 and ?tag=work.
Success Status: 200 OK
Response Example:
code
JSON
{
  "page": 1,
  "limit": 10,
  "total": 42,
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "title": "Meeting notes with design team",
      "body": "Reviewed wireframes and finalized typography hierarchy.",
      "created_at": "2026-10-17T10:00:00Z",
      "updated_at": "2026-10-17T10:00:00Z",
      "tags": ["design", "work"]
    },
    {
      "id": 2,
      "user_id": 10,
      "title": "Grocery checklist",
      "body": "Milk, eggs, sourdough bread, coffee beans.",
      "created_at": "2026-10-17T11:30:00Z",
      "updated_at": "2026-10-17T11:30:00Z",
      "tags": ["personal"]
    }
  ]
}
2. Get Single Note
Method: GET
Path: /notes/{id}
Description: Retrieves the full details of a specific note by its ID.
Success Status: 200 OK
Response Example:
code
JSON
{
  "id": 1,
  "user_id": 10,
  "title": "Meeting notes with design team",
  "body": "Reviewed wireframes and finalized typography hierarchy.",
  "created_at": "2026-10-17T10:00:00Z",
  "updated_at": "2026-10-17T10:00:00Z",
  "tags": ["design", "work"]
}
3. Create Note
Method: POST
Path: /notes
Description: Creates a new note for the authenticated user after validating title length (max 100 chars).
Success Status: 201 Created
Request Body Example:
code
JSON
{
  "title": "Sprint 4 Retrospective",
  "body": "What went well: automated deploys. What needs work: test coverage.",
  "tags": ["work", "agile"]
}
Response Example:
code
JSON
{
  "id": 101,
  "user_id": 10,
  "title": "Sprint 4 Retrospective",
  "body": "What went well: automated deploys. What needs work: test coverage.",
  "created_at": "2026-10-17T14:15:00Z",
  "updated_at": "2026-10-17T14:15:00Z",
  "tags": ["work", "agile"]
}
4. Update Note
Method: PUT
Path: /notes/{id}
Description: Replaces or updates the title, body, and tags of an existing note.
Success Status: 200 OK
Request Body Example:
code
JSON
{
  "title": "Sprint 4 Retrospective - Final Action Items",
  "body": "Action items assigned to lead engineers for test coverage sprint.",
  "tags": ["work", "agile", "completed"]
}
Response Example:
code
JSON
{
  "id": 101,
  "user_id": 10,
  "title": "Sprint 4 Retrospective - Final Action Items",
  "body": "Action items assigned to lead engineers for test coverage sprint.",
  "created_at": "2026-10-17T14:15:00Z",
  "updated_at": "2026-10-17T15:00:00Z",
  "tags": ["work", "agile", "completed"]
}
5. Delete Note
Method: DELETE
Path: /notes/{id}
Description: Permanently removes a note owned by the authenticated user.
Success Status: 204 No Content
Response Body: (Empty body)
6. Search Notes by Tag or Keyword
Method: GET
Path: /notes/search
Description: Searches notes belonging to the authenticated user matching a search keyword (?q=retro) or tag (?tag=work).
Success Status: 200 OK
Response Example:
code
JSON
{
  "query": "retro",
  "matches": 1,
  "data": [
    {
      "id": 101,
      "user_id": 10,
      "title": "Sprint 4 Retrospective - Final Action Items",
      "body": "Action items assigned to lead engineers for test coverage sprint.",
      "created_at": "2026-10-17T14:15:00Z",
      "tags": ["work", "agile"]
    }
  ]
}
3. Error Status Codes & Examples
Code	Name	Trigger / When it happens
400	Bad Request	Validation failure (e.g. empty title, title longer than 100 characters, invalid JSON syntax).
401	Unauthorized	Missing, expired, or invalid Bearer authentication token.
403	Forbidden	Valid token, but the user attempts to view, edit, or delete another user's note.
404	Not Found	The requested note ID does not exist in the database.
500	Internal Server Error	Unhandled server exception (e.g., database connection pool exhaustion).
Example 400 Bad Request Response
code
JSON
{
  "error": "BAD_REQUEST",
  "message": "Title is required and must not exceed 100 characters.",
  "timestamp": "2026-10-17T14:20:00Z"
}
Example 401 Unauthorized Response
code
JSON
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token is missing or has expired. Please sign in.",
  "timestamp": "2026-10-17T14:20:00Z"
}
Example 403 Forbidden Response
code
JSON
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to access or modify this note.",
  "timestamp": "2026-10-17T14:20:00Z"
}
Example 404 Not Found Response
code
JSON
{
  "error": "NOT_FOUND",
  "message": "Note with ID 9999 was not found.",
  "timestamp": "2026-10-17T14:20:00Z"
}
Example 500 Internal Server Error Response
code
JSON
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected server error occurred. Please try again later.",
  "timestamp": "2026-10-17T14:20:00Z"
}
