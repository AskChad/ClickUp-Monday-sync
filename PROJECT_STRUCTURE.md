# Project File Structure

Create the following directory structure:

```
clickup-monday-sync/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── clickup/
│   │   │   │   │   └── route.ts
│   │   │   │   └── monday/
│   │   │   │       └── route.ts
│   │   │   ├── sync/
│   │   │   │   ├── start/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── status/
│   │   │   │   │   └── route.ts
│   │   │   │   └── cancel/
│   │   │   │       └── route.ts
│   │   │   └── replication/
│   │   │       ├── create-board/
│   │   │       │   └── route.ts
│   │   │       ├── analyze-list/
│   │   │       │   └── route.ts
│   │   │       └── map-fields/
│   │   │           └── route.ts
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   └── page.tsx
│   │   ├── sync/
│   │   │   └── page.tsx
│   │   ├── replicate/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   ├── ConnectButton.tsx
│   │   │   └── ConnectionStatus.tsx
│   │   ├── sync/
│   │   │   ├── FileSync.tsx
│   │   │   ├── BatchSettings.tsx
│   │   │   └── ProgressTracker.tsx
│   │   ├── replication/
│   │   │   ├── ListSelector.tsx
│   │   │   ├── FieldMapper.tsx
│   │   │   └── ReplicationOptions.tsx
│   │   └── ui/
│   │       └── (shadcn components)
│   ├── lib/
│   │   ├── api/
│   │   │   ├── clickup.ts
│   │   │   ├── monday.ts
│   │   │   └── rate-limiter.ts
│   │   ├── db/
│   │   │   └── supabase.ts
│   │   ├── sync/
│   │   │   ├── file-sync.ts
│   │   │   ├── batch-processor.ts
│   │   │   └── duplicate-checker.ts
│   │   ├── replication/
│   │   │   ├── list-replicator.ts
│   │   │   ├── field-mapper.ts
│   │   │   └── data-transformer.ts
│   │   └── utils/
│   │       ├── encryption.ts
│   │       └── helpers.ts
│   └── types/
│       ├── clickup.ts
│       ├── monday.ts
│       └── database.ts
├── public/
├── .env.local
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Directory Descriptions

### `/src/app`
Next.js 14 App Router structure
- `/api` - API route handlers
- `/dashboard` - Main dashboard page
- `/auth` - Authentication page
- `/sync` - File sync configuration page
- `/replicate` - List replication page

### `/src/components`
React components organized by feature
- `/auth` - Authentication related components
- `/sync` - File sync components
- `/replication` - List replication components
- `/ui` - Shared UI components (Shadcn)

### `/src/lib`
Core business logic and utilities
- `/api` - External API clients (ClickUp, Monday)
- `/db` - Database client and queries
- `/sync` - File synchronization logic
- `/replication` - List replication logic
- `/utils` - Helper functions and utilities

### `/src/types`
TypeScript type definitions
- `clickup.ts` - ClickUp API types
- `monday.ts` - Monday.com API types
- `database.ts` - Database schema types

## Key Files

### Configuration Files
- `.env.local` - Environment variables (create from .env.example)
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

### Database
- `database_schema.sql` - Supabase schema definition
- Migration files in `/supabase/migrations`

### Documentation
- `README.md` - Project overview and setup instructions
- `IMPLEMENTATION_GUIDE.md` - Step-by-step implementation guide
- `CLICKUP_MONDAY_API_REFERENCE.md` - API documentation
- `PROJECT_SPECIFICATION.md` - Complete requirements
