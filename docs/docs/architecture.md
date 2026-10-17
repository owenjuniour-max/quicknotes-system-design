# QuickNotes System Architecture & Scaling Plan

This document defines the high-level distributed systems architecture for QuickNotes to scale from a single-user prototype to a highly available, fault-tolerant cloud platform supporting **1,000,000 registered users**.

---

## 1. System Requirements

### 1.1 Functional Requirements
- Users can create, view, search, edit, and delete text notes with optional tags.
- Users can view their personal notes feed sorted by the most recent updates.
- Asynchronous indexing and notification processing occurs in the background.

### 1.2 Non-Functional Requirements
- **High Availability**: 99.95% uptime with zero single points of failure (SPOF).
- **Low Latency**: P95 feed read response time under 100 ms; write confirmation under 250 ms.
- **Consistency**: Strong consistency for note creation/updating; eventual consistency for full-text search indexing and read replicas.
- **Data Durability**: Zero data loss through primary-replica database replication and automated backups.

---

## 2. Capacity Planning & Load Estimates (1 Million Users)

### 2.1 Assumptions
- **Total Registered Accounts**: 1,000,000 users.
- **Daily Active Users (DAU)**: 20% = **200,000 active users / day**.
- **User Activity per Day**:
  - Each active user creates **2 notes / day**.
  - Each active user reads their feed / searches **20 times / day**.
- **Average Note Size**: 1 KB (title: ~50 bytes, body: ~900 bytes, metadata/tags: ~100 bytes).
- **Peak Multiplier**: 5x average load.
- **Seconds per day**: 86,400 seconds.

### 2.2 Writes per Second
- **Daily Writes**: 200,000 x 2 = 400,000 note creations / day.
- **Average Writes / Sec**: 400,000 / 86,400 = **4.63 writes/sec**
- **Peak Writes / Sec (5x)**: 4.63 x 5 = **23.15 writes/sec**

### 2.3 Reads per Second
- **Daily Reads**: 200,000 x 20 = 4,000,000 feed reads / day.
- **Average Reads / Sec**: 4,000,000 / 86,400 = **46.30 reads/sec**
- **Peak Reads / Sec (5x)**: 46.30 x 5 = **231.50 reads/sec**
- **Read-to-Write Ratio**: 10:1 (Read-Heavy).

### 2.4 Storage per Year
- **Daily Data Storage**: 400,000 notes x 1 KB = 400,000 KB ≈ **400 MB / day**
- **Yearly Data Storage**: 400 MB/day x 365 days ≈ **146 GB / year**
- Even over 5 years, raw text storage is under 1 TB, easily managed on SSD-backed relational instances.

---

## 3. Distributed Architecture Diagram
code
Code
[ User Clients (Web & Mobile) ]
                                        |
                                        v
                             [ Route 53 (DNS Layer) ]
                                        |
                           +------------+------------+
                           |                         |
                           v (Static Assets)         v (API Traffic)
                  [ CDN (Cloudflare) ]       [ Load Balancer (ALB) ]
                                                     |
                                   +-----------------+-----------------+
                                   |                                   |
                                   v                                   v
                         [ App Server 1 ]                    [ App Server 2 ]
                           (Node.js/Express)                  (Node.js/Express)
                                   |                                   |
                 +-----------------+-----------------+-----------------+
                 |                 |                 |                 |
                 v                 v                 v                 v
         [ Redis Cache ]  [ Primary DB (Write) ] [ Message Queue ]  [ Full-Text Search ]
          (User Feeds)     (PostgreSQL Master)   (RabbitMQ / SQS)      (Elasticsearch)
                                   |                         |
                                   v (Replication)           v
                         [ Read Replica DB ]         [ Background Worker ]
                         (PostgreSQL Slave)         (Search Indexing / Audit)
code
Code
---

## 4. Component Explanations (One Sentence per Component)

- **DNS (Amazon Route 53)**: Resolves user domain requests to the nearest edge IP address using geo-DNS and latency-based routing.
- **CDN (Cloudflare / CloudFront)**: Caches static web assets (HTML, CSS, JS, UI icons) at globally distributed edge nodes to accelerate page loads.
- **Load Balancer (AWS ALB)**: Terminates SSL/TLS connections and distributes incoming HTTP traffic evenly across backend application servers using health-check monitoring.
- **App Servers (Stateless Instances)**: Execute authentication, request validation, business logic, and database operations without saving session state locally.
- **Cache (Redis Cluster)**: Stores active user sessions and pre-computed recent notes in high-speed RAM to return read requests in under 5 ms.
- **Primary Database (PostgreSQL Master)**: Handles all transactional insert, update, and delete statements with strict ACID guarantees and data integrity.
- **Read Replica Database (PostgreSQL Slave)**: Replicates the primary database asynchronously to handle heavy read queries, freeing write resources.
- **Message Queue (RabbitMQ / AWS SQS)**: Decouples write operations from non-blocking background tasks like full-text search indexing and audit logging.
- **Background Worker**: Consumes queued events asynchronously to index new notes into Elasticsearch and dispatch activity notifications.

---

## 5. End-to-End Request Flows

### 5.1 Request Flow: `GET /api/v1/notes` (Read Path)
1. **DNS Resolution & Edge Access**: The client resolves `api.quicknotes.com` via DNS and connects to the Load Balancer with an `Authorization: Bearer <token>` header.
2. **Load Balancing**: The Load Balancer forwards the request to an available healthy App Server using round-robin routing.
3. **Authentication**: The App Server verifies the JWT signature and extracts the `userId`.
4. **Cache Lookup (Cache-Aside)**: The App Server queries the Redis Cache for `cache:notes:user:{userId}:page:1`.
   - **Cache Hit**: Returns the cached JSON payload immediately (< 10 ms).
   - **Cache Miss**: The App Server queries the **Read Replica Database** via the index `idx_notes_user_updated`.
5. **Cache Population**: The App Server saves the retrieved note array into Redis with a 5-minute Time-To-Live (TTL).
6. **Response Delivery**: The App Server returns `200 OK` with the paginated notes list to the client.

### 5.2 Request Flow: `POST /api/v1/notes` (Write Path)
1. **Request Reception**: Client sends `POST /api/v1/notes` with JSON payload `{ title, body, tags }` through the Load Balancer to an App Server.
2. **Validation**: The App Server validates title presence, length (<= 100 characters), and user authentication.
3. **Primary DB Transaction**: The App Server opens a database transaction on the **Primary Database (Master)**:
   - Inserts row into `notes`.
   - Resolves or creates tags in `tags`.
   - Inserts relational records into `note_tags`.
   - Commits transaction.
4. **Cache Invalidation**: The App Server deletes or refreshes the user's cached notes key in Redis (`cache:notes:user:{userId}:*`).
5. **Background Event Enqueueing**: The App Server publishes a `NoteCreatedEvent` containing `{ noteId, title, body, userId }` to the **Message Queue**.
6. **Client Confirmation**: The App Server returns `201 Created` with the newly created note object.
7. **Asynchronous Background Processing**: A Background Worker consumes the event from the queue and updates the Elasticsearch search index.

---

## 6. Architectural Trade-offs & Fault Tolerance

### Trade-off 1: Cache-Aside vs. Direct Database Queries
- **Decision**: Implement Redis in front of the database using the cache-aside pattern.
- **Pros**: Reduces read query load on the database by 85–90%, keeping P95 latency under 20 ms.
- **Cons**: Adds operational complexity and potential cache staleness during race conditions, managed via active invalidation and 5-minute TTLs.

### Trade-off 2: Asynchronous Search Indexing vs. Synchronous Indexing
- **Decision**: Index notes for full-text search asynchronously using a message queue and worker rather than inside the HTTP request.
- **Pros**: Fast, reliable note creation with response times under 150 ms; protects the API if the search service is temporarily down.
- **Cons**: Introduces **eventual consistency**; a newly created note is searchable within 500 ms to 1 second rather than instantly.

---

## 7. Eliminating Single Points of Failure (SPOF)

1. **Stateless Redundant App Servers**: At least two application servers run across independent Availability Zones (AZs). If one server crashes, the Load Balancer redirects traffic to healthy instances in real time.
2. **High-Availability Database with Automated Failover**: The Primary Database continuously replicates data to a standby replica in a different AZ. If the primary node fails, health probes trigger automatic failover to the replica within 30 seconds.
3. **Multi-AZ Redis & Queue Clustering**: Redis and RabbitMQ operate with master-replica topologies across multiple zones, ensuring persistence and queue durability even during hardware outages.
