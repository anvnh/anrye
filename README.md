# anrye

AnRye is a flexible note-taking platform that puts you in complete control of your data storage and access. It's designed for users who want the power of modern note-taking apps but with the freedom to choose exactly how and where their data is stored.

## Features

- Rich Markdown Editor with live preview, syntax highlighting, and LaTeX math support
- Wiki-style Linking - Create interconnected knowledge graphs like Obsidian
- Calendar Integration - Manage events and tasks alongside your notes
- Multiple Storage Options - Google Drive, Cloudflare R2, or local storage
- PWA Support - Install as a native app on any device


## Who it's for

- Data control enthusiasts who want to choose their own storage solution
- Users who want flexibility - switch between cloud convenience and self-hosting
- Knowledge workers who need powerful note-taking without vendor lock-in
- Anyone who wants the best of Obsidian/Notion but with storage choice
- Users who want Google Drive integration for easy access everywhere
- Self-hosters who prefer complete data ownership with Turso/R2
## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`GOOGLE_CLIENT_SECRET=""`

`GOOGLE_CLIENT_ID=""`

`MONGODB_DB=""`

`MONGODB_URI=""`

`GEMINI_API_KEY=""`

**Above environment variables are requires, otherwise it won't work**

If you want to use the Turso DB and Cloudflare R2 option, you don't need to put it into the `.env` file. 

You need to put these environment variables into notes storage setting

**R2 Object Storage Cloudflare**

R2_ACCESS_KEY_ID=""

R2_SECRET_ACCESS_KEY=""

R2_BUCKET_NAME=""

**Turso Database**

TURSO_DATABASE_URL=""

TURSO_AUTH_TOKEN=""

<image goes here>

## Run Locally

Clone the project

```bash
git clone https://github.com/anvnh/anrye.git
```

Go to the project directory

```bash
cd anrye
```

Install dependencies

```bash
pnpm install
```

Start the server

```bash
pnpm dev
```


## Tech Stack

Frontend:

- React 19 - UI library
- Next.js 15 - React framework with App Router
- TypeScript - Type-safe development
- Tailwind CSS 4 - Utility-first styling
- Radix UI - Accessible component primitives
- CodeMirror 6 - Code editor with syntax highlighting
- GSAP - Animation library
- React Hook Form - Form management
- Zod - Schema validation

Backend:

- Next.js API Routes - Serverless functions (no Express)
- NextAuth.js - Authentication framework
- JWT - Token-based authentication
- bcryptjs - Password hashing

Databases & Storage:

- MongoDB - User data and metadata
- Turso - SQLite database (LibSQL)
- Cloudflare R2 - Object storage
- Google Drive API - File storage and sync

Development Tools:

- pnpm - Package manager
- ESLint - Code linting
- Turbopack - Fast bundling (dev mode)

Key Libraries:

- React Markdown - Markdown rendering
- KaTeX - LaTeX math rendering
- Prism.js - Syntax highlighting
- Socket.io - Real-time communication
- Date-fns - Date manipulation
