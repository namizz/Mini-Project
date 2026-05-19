# Article Analytics API

A robust, scalable RESTful API built for managing and tracking article analytics. This project implements a role-based access control (RBAC) system for Authors and Readers, complete with view tracking and a secure Refresh Token architecture, powered entirely by PostgreSQL (no Redis required).

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** Short-Lived JWT Access Tokens & Long-Lived HttpOnly Refresh Tokens
- **Documentation:** Swagger UI

## Features
- **Identity Management:** Role-based access control (`AUTHOR` vs `READER`) with strict password policies.
- **Refresh Token Architecture:** Seamless `/auth/refresh` endpoint that rotates tokens securely using cookies without exposing long-lived credentials.
- **Article Workflows:** Full CRUD operations for authors, strict visibility filters, and Prisma client extensions for soft-deleting.
- **Public Feed:** Open access to published articles with powerful search filters (category, author, keywords).
- **Analytics Engine:** Automatically tracks unique reads (via JWT) and aggregates them into daily metrics natively in a non-blocking PostgreSQL transaction.
- **Strict Compliance:** Standardized responses (`{ Success, Message, Object, Errors }`), Pagination, and UUID primary keys across the board.

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory (do not commit this file) and provide your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/article_analytics?schema=public"
   PORT=3000
   JWT_SECRET="your-super-secret-key"
   ```

3. **Database Migration:**
   Because this project uses UUIDs and Refresh Tokens, start by resetting and migrating your database cleanly:
   ```bash
   npx prisma migrate reset --force
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **API Documentation:**
   Visit `http://localhost:3000/api-docs` in your browser to interact with the Swagger UI and test all endpoints!
