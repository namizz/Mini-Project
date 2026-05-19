# Article Analytics API

A robust, scalable RESTful API built for managing and tracking article analytics. This project implements a role-based access control (RBAC) system for Authors and Readers, complete with view tracking and analytics debouncing purely driven by PostgreSQL.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT (JSON Web Tokens) & bcrypt
- **Documentation:** Swagger UI

## Features
- **Identity Management:** Role-based access control (`AUTHOR` vs `READER`).
- **Article Workflows:** Full CRUD operations for authors (including soft-deleting).
- **Public Feed:** Open access to published articles.
- **Analytics Engine:** Automatically tracks and aggregates unique views/reads per article.
- **Rate Limiting:** Debounces read events to prevent spamming (max 1 log per 10 seconds per IP), backed entirely by PostgreSQL.

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
   Apply the Prisma schema to your local PostgreSQL database:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **API Documentation:**
   Visit `http://localhost:3000/api-docs` in your browser to interact with the Swagger UI and test all endpoints!
