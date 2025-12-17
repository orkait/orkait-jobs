# Orkait Jobs

Job board application built with Next.js, Shadcn UI, and PostgreSQL (via Prisma).

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/orkait_jobs"

# Admin authentication
ADMIN_PASSWORD="admin" # Change this to a secure password

# Session security
SESSION_SECRET="complex_secret_key_here" # Random string for cookie encryption
```

## Getting Started

1.  **Install dependencies**
    ```bash
    bun install
    # or
    npm install
    ```

2.  **Setup Database**
    Ensure your PostgreSQL instance is running and reachable via `DATABASE_URL`.
    Then push the schema to the database:
    ```bash
    npx prisma db push
    ```

3.  **Run Development Server**
    ```bash
    bun dev
    # or
    npm run dev
    ```

4.  **Access the Application**
    - **Job Board**: [http://localhost:3000](http://localhost:3000)
    - **Admin Dashboard**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
