# QuickNotes System Design & Online API Client

QuickNotes is a full-featured system design specification and interactive frontend API client that evolves QuickNotes from an offline browser prototype into an enterprise-grade cloud service capable of supporting **1 million users**. This repository serves as the complete technical contract for backend engineering, database administration, and infrastructure teams.

---

## Technical Documentation Links

The system architecture and technical blueprints are documented in detail inside the [`docs/`](./docs) directory:

1. 📄 **[REST API Design Specification (`docs/api-design.md`)](./docs/api-design.md)**: Details seven RESTful endpoints, request/response JSON payloads, pagination, and standardized HTTP error code handling (400, 401, 403, 404, 500).
2. 🗄️ **[Relational Data Model (`docs/data-model.md`)](./docs/data-model.md)**: Details the normalized four-table database schema (`users`, `notes`, `tags`, `note_tags`), entity relationships, DDL `CREATE TABLE` scripts, example SQL queries with relational `JOIN`s, composite indexing strategy, and SQL vs. NoSQL justification.
3. 🏗️ **[System Architecture & Scaling Plan (`docs/architecture.md`)](./docs/architecture.md)**: Complete capacity planning for 1 million accounts (reads/sec, writes/sec, annual storage), high-availability distributed architecture diagram (DNS, CDN, Load Balancer, App Servers, Redis, Primary/Replica DB, Queue, Workers), request lifecycles, and failure mitigation strategies.

---

## Interactive API Client Features

This repository includes a lightweight, secure client application (`index.html`, `style.css`, `api.js`) demonstrating real-world integration with REST APIs:
- **`GET /posts?_limit=10`**: Fetches and renders notes dynamically using secure `document.createElement()` and `textContent` to prevent XSS vulnerabilities.
- **`POST /posts`**: Client-side validation enforcing required note titles (max 100 characters), sends JSON payloads, and prepends newly created notes with server status tracking.
- **`DELETE /posts/{id}`**: Dispatches delete calls to the server, displays status updates, and updates in-memory UI state cleanly.
- **State Feedback**: Explicit loading, success, error, and empty-state notifications with disabled button states during pending network requests.

---

## How to Run the API Client Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/owenjuniour-max/quicknotes-system-design.gitNavigate into the project folder:
code
Bash
cd quicknotes-system-design
Launch the web application:
Double-click index.html to open it in your default web browser (Chrome, Edge, Firefox, Safari).
Alternatively, open the directory in VS Code, right-click index.html, and choose Open with Live Server.
What I Learned
Asynchronous API Integration & Error Resilience: Designed a robust, reusable request() wrapper around the fetch() API incorporating response.ok checks, granular try / catch / finally exception handling, and user interface state synchronization (disabling buttons and displaying contextual status alerts).
Relational Data Modeling & Multi-Tier Normalization: Architected normalized schemas separating core content from categorization using associative join tables (note_tags) and composite foreign key constraints, coupled with targeted B-tree indexing on (user_id, updated_at) to eliminate expensive database table scans.
Distributed System Scaling & Fault Tolerance: Calculated real-world traffic volume (reads vs. writes) for 1 million users to design a fault-tolerant multi-tier architecture incorporating in-memory Redis caching, read replica database offloading, and asynchronous background worker queues to eliminate single points of failure (SPOF).
