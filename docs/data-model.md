# QuickNotes Data Model Specification

This document defines the relational database architecture for QuickNotes, supporting 1 million users with multi-tagging capabilities, referential integrity, and efficient indexing.

---

## 1. Entities & Schema Specification

The data model consists of four core entities:

### 1.1 `users`
Represents registered user accounts.
- `id` (INTEGER, Primary Key, Auto-Increment): Unique user ID.
- `username` (VARCHAR(50), NOT NULL, UNIQUE): Unique display handle.
- `email` (VARCHAR(255), NOT NULL, UNIQUE): Verified email address for authentication.
- `password_hash` (VARCHAR(255), NOT NULL): Securely hashed credentials (bcrypt/argon2).
- `created_at` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP): Account registration timestamp.

### 1.2 `notes`
Represents note entries created by users.
- `id` (INTEGER, Primary Key, Auto-Increment): Unique note ID.
- `user_id` (INTEGER, NOT NULL, Foreign Key -> `users.id` ON DELETE CASCADE): Owner ID.
- `title` (VARCHAR(100), NOT NULL): Note title (1–100 characters).
- `body` (TEXT): Freeform note body content.
- `created_at` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP): Creation timestamp.
- `updated_at` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP): Last modification timestamp.

### 1.3 `tags`
Represents categorization labels.
- `id` (INTEGER, Primary Key, Auto-Increment): Unique tag ID.
- `name` (VARCHAR(30), NOT NULL, UNIQUE): Normalized lowercase tag label (e.g., `work`, `study`).

### 1.4 `note_tags` (Associative Join Table)
Connects notes with multiple tags.
- `note_id` (INTEGER, NOT NULL, Foreign Key -> `notes.id` ON DELETE CASCADE): Reference to the note.
- `tag_id` (INTEGER, NOT NULL, Foreign Key -> `tags.id` ON DELETE CASCADE): Reference to the tag.
- `PRIMARY KEY (note_id, tag_id)`: Composite primary key preventing duplicate tag assignments on a single note.

---

## 2. Entity Relationships & Join Table Rationale

- **`users` to `notes` (One-to-Many / 1:N)**: One user owns zero, one, or many notes. Each note belongs strictly to one user via `notes.user_id`.
- **`notes` to `tags` (Many-to-Many / M:N)**: One note can have multiple tags (e.g., a note tagged with `#backend` and `#scaling`), and one tag can label thousands of different notes across the system.
- **Why `note_tags` is needed**: Relational databases cannot store multi-valued arrays in a single column without violating First Normal Form (1NF). The `note_tags` join table decomposes the many-to-many relationship into two clean, indexed one-to-many relationships (`notes` -> `note_tags` and `tags` -> `note_tags`), enabling fast set operations and referential integrity.

---

## 3. SQL DDL Statements (`CREATE TABLE`)

```sql
-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notes Table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tags Table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE
);

-- 4. Note_Tags Join Table
CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    CONSTRAINT fk_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
4. Example Queries
Query 1: Fetch Recent Notes with Tags for a Specific User (Relational JOIN)
code
SQL
SELECT 
    n.id AS note_id,
    n.title,
    n.body,
    n.updated_at,
    COALESCE(ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tag_list
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 42
GROUP BY n.id
ORDER BY n.updated_at DESC
LIMIT 10 OFFSET 0;
Query 2: Search Notes by Keyword in Title or Body
code
SQL
SELECT id, title, body, updated_at
FROM notes
WHERE user_id = 42 
  AND (LOWER(title) LIKE '%architecture%' OR LOWER(body) LIKE '%architecture%')
ORDER BY updated_at DESC;
Query 3: Find All Notes Tagged with a Specific Label (e.g., 'capstone')
code
SQL
SELECT n.id, n.title, n.updated_at, u.username
FROM notes n
JOIN users u ON n.user_id = u.id
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.id
WHERE t.name = 'capstone' AND n.user_id = 42;
5. Performance Indexing Strategy
Proposed Index
code
SQL
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);
Justification
In a personal note-taking application, over 95% of queries request notes filtered by the authenticated user's ID and sorted chronologically (WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10). Without an index, the database must perform a sequential table scan of millions of notes. The composite index on (user_id, updated_at DESC) allows the database engine to perform an instant O(log N) B-tree index seek directly to the user's records and read them in pre-sorted order, avoiding expensive in-memory disk sorting.
6. SQL vs. NoSQL Paradigm Justification
For QuickNotes, SQL (Relational Database) is the optimal architectural choice over NoSQL:
Referential Integrity & Cascading Deletions: Deleting a user must reliably purge all associated notes and tag links without leaving orphaned records, a capability enforced automatically by relational foreign keys.
ACID Transaction Guarantees: Note updates and tag associations require transactional atomicity; if inserting into note_tags fails, the transaction must roll back cleanly.
Normalized Tag Management: Relational modeling avoids the massive data redundancy inherent in document stores (where changing or merging a tag requires updating millions of embedded tag strings across document collections).
Predictable Query Patterns: The schema is well-defined and stable, meaning the relational model provides superior query expressiveness and data consistency at scale.
