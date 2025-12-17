---
name: Job Board with PostgreSQL
overview: Create a job board system with PostgreSQL database, including a public jobs listing page, job application form, and admin interface for managing jobs and viewing applications.
todos: []
---

# Job Board Implementation Plan

## Overview

Create a `/job` page with job listings, application tracking, and password-protected admin interface using:

- **Frontend:** Next.js + Tailwind CSS + shadcn/ui components
- **Backend:** Next.js API routes (no separate backend)
- **Database:** PostgreSQL

**Architecture:** Full-stack Next.js monolithic application with frontend pages and API routes in the same codebase.

````mermaid
flowchart LR
    subgraph NextJsApp[Next.js Application - Single Codebase]
        subgraph Frontend[Frontend - React/Next.js]
            Pages[Pages:<br/>/job, /admin/jobs, etc.]
            Components[Components:<br/>shadcn/ui + Custom]
            Tailwind[Tailwind CSS Styling]
        end
        
        subgraph Backend[Backend - API Routes]
            PublicAPI[Public APIs:<br/>/api/jobs<br/>/api/applications]
            AdminAPI[Admin APIs:<br/>/api/admin/*<br/>/api/auth/*]
            Auth[Auth Middleware]
        end
        
        DBUtil[DB Utility:<br/>Connection Pool]
    end
    
    Pages -->|fetch| PublicAPI
    Pages -->|fetch| AdminAPI
    PublicAPI --> DBUtil
    AdminAPI --> Auth
    Auth --> DBUtil
    DBUtil -->|SQL| PostgreSQL[(PostgreSQL<br/>Database)]
    
    User[Public User] -->|Browse| Pages
    Admin[Admin User] -->|Manage| Pages


## Database Schema

### Tables

1. **jobs** table:

   - `id` (SERIAL PRIMARY KEY)
   - `title` (VARCHAR)
   - `description` (TEXT)
   - `location` (VARCHAR)
   - `type` (VARCHAR) - e.g., "Full-time", "Part-time", "Contract"
   - `department` (VARCHAR)
   - `requirements` (TEXT)
   - `status` (VARCHAR) - "active", "closed", "draft"
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **applications** table:

   - `id` (SERIAL PRIMARY KEY)
   - `job_id` (INTEGER REFERENCES jobs(id))
   - `name` (VARCHAR)
   - `email` (VARCHAR)
   - `phone` (VARCHAR)
   - `resume_url` (VARCHAR) - file path or URL
   - `cover_letter` (TEXT)
   - `linkedin_url` (VARCHAR)
   - `portfolio_url` (VARCHAR)
   - `status` (VARCHAR) - "pending", "bookmark", "selected", "rejected", "hold"
   - `is_bookmarked` (BOOLEAN) - Quick bookmark flag
   - `notes` (TEXT) - Admin notes about candidate
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

## Implementation Steps

### 0. UI Setup (shadcn/ui)

- Initialize shadcn/ui in the project
  ```bash
  npx shadcn-ui@latest init
  ```

- Install required shadcn/ui components:
  - `button` - For all action buttons
  - `card` - For job cards, candidate cards
  - `input` - For form inputs
  - `form` - For form handling
  - `select` - For dropdowns (filters, status)
  - `dialog` - For modals (delete confirmations)
  - `table` - For applications list
  - `badge` - For status badges
  - `textarea` - For cover letter, notes
  - `tabs` - For admin navigation
  - `dropdown-menu` - For action menus
  - `toast` - For notifications
- Configure Tailwind CSS (already set up)

### 1. Database Setup

- Install PostgreSQL client library (`pg` and `@types/pg`)
- Create database utility file `src/utils/db.ts` for connection pooling
- Create migration script or SQL file for schema initialization
- Add database connection URL to environment variables

#### Database Connection Handling

The connection will be managed using a **singleton pattern with connection pooling** to handle Next.js serverless environment efficiently:

**Connection Strategy:**

- Use `pg.Pool` for connection pooling (reuses connections, handles concurrent requests)
- Singleton pattern ensures only one pool instance exists across API routes
- Pool configuration:
  - `max: 10` - Maximum pool size
  - `idleTimeoutMillis: 30000` - Close idle connections after 30s
  - `connectionTimeoutMillis: 2000` - Connection timeout
- Environment variable: `DATABASE_URL` (PostgreSQL connection string)
- Error handling: Graceful connection errors, automatic retry logic
- Connection cleanup: Pool automatically manages connection lifecycle

**Implementation in `src/utils/db.ts`:**

```typescript
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}
````

**Usage in API routes:**

- Import `query` from `src/utils/db.ts`
- Use async/await for database operations
- No manual connection management needed (pool handles it)
- Connections are automatically returned to pool after query completes

### 2. Authentication & Authorization

- **Password Protection for Admin Routes**
                                - Simple password-based authentication (no complex user management)
                                - Session-based auth using HTTP-only cookies
                                - Password stored in environment variable `ADMIN_PASSWORD`
                                - Middleware to protect all `/admin/*` routes
                                - Login page at `/admin/login`

**Implementation:**

- `src/pages/api/auth/login.ts` - Login endpoint (validates password, sets session)
- `src/pages/api/auth/logout.ts` - Logout endpoint (clears session)
- `src/utils/auth.ts` - Auth utility functions (check session, protect routes)
- `src/pages/admin/login.tsx` - Admin login page
- Use `next-iron-session` or simple JWT/cookie-based session

### 3. API Routes

Create Next.js API routes in `src/pages/api/`:

**Public Routes:**

- **`/api/jobs`** (GET) - List all active jobs (public)
- **`/api/jobs/[id]`** (GET) - Get specific job details (public)
- **`/api/applications`** (POST) - Submit application (public)

**Protected Admin Routes (require authentication):**

- **`/api/admin/jobs`** (GET, POST) - List all jobs, create new job
- **`/api/admin/jobs/[id]`** (GET, PUT, DELETE) - Get/update/delete specific job
- **`/api/admin/applications`** (GET) - List all applications with filters
- **`/api/admin/applications/[id]`** (GET, PUT) - Get/update application details and status
- **`/api/admin/applications/[id]/status`** (PUT) - Update application status (bookmark/selected/rejected/hold)
- **`/api/admin/applications/[id]/bookmark`** (PUT) - Toggle bookmark status
- **`/api/admin/jobs/[id]/applications`** (GET) - Get applications for a specific job
- **`/api/auth/login`** (POST) - Admin login
- **`/api/auth/logout`** (POST) - Admin logout

### 3. Public Pages

- **`src/pages/job.tsx`** - Main jobs listing page
                                - Display all active jobs in cards/grid
                                - Filter by department/type
                                - Link to individual job details

- **`src/pages/job/[id].tsx`** - Individual job detail page
                                - Show full job description
                                - Application form component
                                - File upload for resume/CV

### 4. Admin Interface (Password Protected)

**Authentication:**

- **`src/pages/admin/login.tsx`** - Admin login page
                                - Password input form
                                - Redirects to admin dashboard after successful login
                                - Shows error message for invalid password

**Job Portal Control:**

- **`src/pages/admin/index.tsx`** or **`src/pages/admin/dashboard.tsx`** - Admin dashboard
                                - Overview statistics (total jobs, applications, etc.)
                                - Quick links to manage jobs and view applications
                                - Job portal control panel

- **`src/pages/admin/jobs.tsx`** - Job portal management
                                - List all jobs (active/draft/closed)
                                - Create/edit/delete jobs
                                - Toggle job status (active/closed/draft)
                                - Bulk actions
                                - Search and filter jobs

**Candidate Management:**

- **`src/pages/admin/applications.tsx`** - Applications list view
                                - List all applications with candidate info
                                - Filter by job, status (bookmark/selected/rejected/hold/pending)
                                - Search by candidate name/email
                                - Quick status actions (buttons for each status)
                                - Link to detailed candidate profile

- **`src/pages/admin/applications/[id].tsx`** - Candidate profile page
                                - Full candidate profile view
                                - Display all application details (name, email, phone, LinkedIn, portfolio)
                                - View/download resume
                                - Read cover letter
                                - Status management section with actions:
                                                                - Bookmark button (toggle)
                                                                - Selected button
                                                                - Rejected button
                                                                - Hold button
                                - Admin notes section (add/edit notes about candidate)
                                - Application timeline/history
                                - Link back to job posting

### 5. Components

- **`src/components/jobs/JobCard.tsx`** - Job listing card component
- **`src/components/jobs/JobApplicationForm.tsx`** - Application form
- **`src/components/jobs/JobFilters.tsx`** - Filter component for jobs
- **`src/components/admin/JobForm.tsx`** - Admin form for creating/editing jobs
- **`src/components/admin/ApplicationList.tsx`** - Admin application list view

### 6. File Upload Handling

- Use Next.js API route `/api/upload` for resume file uploads
- Store files in `public/uploads/resumes/` or use cloud storage
- Return file path/URL to store in database

### 7. Navigation Updates

- Add "Jobs" link to `src/components/Header.tsx` navigation (public)
- Add admin navigation link (protected, only visible when logged in)
- Admin navigation in admin layout with links to:
                                - Dashboard
                                - Manage Jobs
                                - View Applications
                                - Logout

## Files to Create/Modify

### New Files:

**Database & Utils:**

- `src/utils/db.ts` - Database connection utility
- `src/utils/auth.ts` - Authentication utility (session check, protect routes)
- `database/schema.sql` - Database schema SQL file

**Public Pages:**

- `src/pages/job.tsx` - Jobs listing page
- `src/pages/job/[id].tsx` - Job detail page

**Admin Pages (Protected):**

- `src/pages/admin/login.tsx` - Admin login page
- `src/pages/admin/index.tsx` or `src/pages/admin/dashboard.tsx` - Admin dashboard
- `src/pages/admin/jobs.tsx` - Job portal management
- `src/pages/admin/applications.tsx` - Applications list view
- `src/pages/admin/applications/[id].tsx` - Candidate profile page

**Public Components:**

- `src/components/jobs/JobCard.tsx`
- `src/components/jobs/JobApplicationForm.tsx`
- `src/components/jobs/JobFilters.tsx`

**Admin Components:**

- `src/components/admin/JobForm.tsx` - Admin form for creating/editing jobs
- `src/components/admin/ApplicationList.tsx` - Admin application list view
- `src/components/admin/CandidateProfile.tsx` - Full candidate profile display
- `src/components/admin/StatusActions.tsx` - Status action buttons
- `src/components/admin/AdminLayout.tsx` - Layout wrapper for admin pages
- `src/components/admin/LoginForm.tsx` - Login form component
- `src/components/admin/JobPortalControl.tsx` - Job portal control panel

**Public API Routes:**

- `src/pages/api/jobs/index.ts` - List active jobs (GET)
- `src/pages/api/jobs/[id].ts` - Get job details (GET)
- `src/pages/api/applications/index.ts` - Submit application (POST)

**Protected Admin API Routes:**

- `src/pages/api/admin/jobs/index.ts` - Admin jobs CRUD
- `src/pages/api/admin/jobs/[id].ts` - Admin job operations
- `src/pages/api/admin/applications/index.ts` - List applications (GET)
- `src/pages/api/admin/applications/[id].ts` - Get/update application
- `src/pages/api/admin/applications/[id]/status.ts` - Update status
- `src/pages/api/admin/applications/[id]/bookmark.ts` - Toggle bookmark
- `src/pages/api/admin/jobs/[id]/applications.ts` - Get job applications
- `src/pages/api/auth/login.ts` - Admin login
- `src/pages/api/auth/logout.ts` - Admin logout
- `src/pages/api/upload.ts` - File upload handler (resume)

### Modified Files:

- `package.json` - Add dependencies (via npm/pnpm install):
                                - `pg` and `@types/pg` - PostgreSQL client
                                - shadcn/ui dependencies (via shadcn CLI)
- `tailwind.config.ts` - Update with shadcn/ui configuration (auto-updated by shadcn CLI)
- `src/components/Header.tsx` - Add Jobs link to navigation
- `src/env.ts` - Add admin password environment variable handling
- `.env.local` - Add environment variables:
                                - `DATABASE_URL` - PostgreSQL connection string (user will provide)
                                - `ADMIN_PASSWORD` - Admin password for authentication
                                - `SESSION_SECRET` - Secret key for session encryption (generate random string)
- `src/styles/globals.scss` - May need to add shadcn CSS variables

## Data Flow

```mermaid
flowchart TD
    A[Public User] -->|Views| B[/job Page]
    B -->|Clicks Job| C[/job/id Page]
    C -->|Submits| D[Application Form]
    D -->|POST| E[/api/applications]
    E -->|Saves| F[(PostgreSQL)]
    
    G[Admin] -->|Manages| H[/admin/jobs]
    H -->|Creates/Edits| I[Job Form]
    I -->|POST/PUT| J[/api/jobs]
    J -->|Saves| F
    
    G -->|Views| K[/admin/applications]
    K -->|GET| L[/api/applications]
    L -->|Fetches| F
```

## Connection Flow

```mermaid
sequenceDiagram
    participant API as API Route
    participant DBUtil as db.ts
    participant Pool as Connection Pool
    participant PG as PostgreSQL
    
    API->>DBUtil: query(sql, params)
    DBUtil->>Pool: Check if pool exists
    alt Pool doesn't exist
        Pool->>PG: Create new pool connection
        PG-->>Pool: Connection established
    end
    Pool->>PG: Get connection from pool
    PG-->>Pool: Return available connection
    Pool->>PG: Execute query
    PG-->>Pool: Return results
    Pool->>Pool: Return connection to pool
    Pool-->>DBUtil: Query results
    DBUtil-->>API: Return data
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (to be provided by user)
                                - Format: `postgresql://user:password@host:port/database`
                                - Stored in `.env.local` (not committed to git)
                                - Accessed via `process.env.DATABASE_URL` in server-side code only

- `ADMIN_PASSWORD` - Password for admin authentication
                                - Plain text password (simple comparison, or use bcrypt for hashing)
                                - Stored in `.env.local` (not committed to git)
                                - Used in login API route

- `SESSION_SECRET` - Secret key for session encryption
                                - Random string (e.g., generate with `openssl rand -base64 32`)
                                - Used to sign/encrypt session cookies
                                - Stored in `.env.local` (not committed to git)

**Environment Setup:**

- Add all variables to `.env.local` file
- For production, set environment variables in deployment platform (Netlify/Vercel)
- Never commit `.env.local` to git (already in `.gitignore`)

## Tech Stack

**Frontend:**

- Next.js 14 (React framework)
- Tailwind CSS (styling)
- shadcn/ui (UI components)
- TypeScript

**Backend:**

- Next.js API Routes (no separate backend server)
- PostgreSQL (database)
- pg (PostgreSQL client)

**Architecture:**

- Monolithic Next.js application
- Frontend pages + API routes in same codebase
- Server-side rendering (SSR) for public pages
- Client-side interactivity for admin dashboard

## Dependencies to Install

**Database:**

- `pg` - PostgreSQL client
- `@types/pg` - TypeScript types for pg

**UI Components:**

- `shadcn/ui` components (install via CLI)
                                - Button, Card, Input, Form, Select, Dialog, etc.
                                - Install components as needed: `npx shadcn-ui@latest add button card input form`

**Additional:**

- `class-variance-authority` - For component variants (shadcn dependency)
- `clsx` - Utility for constructing className strings
- `tailwind-merge` - Merge Tailwind classes
- `lucide-react` - Icons (already installed ✓)