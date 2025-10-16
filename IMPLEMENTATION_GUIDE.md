# Implementation Guide for Claude Code

## Phase 1: Project Setup (First)

1. Create Next.js project with TypeScript:
```bash
npx create-next-app@latest clickup-monday-sync --typescript --tailwind --app
cd clickup-monday-sync
```

2. Install all dependencies from package.json

3. Set up Supabase:
- Create new Supabase project
- Run database_schema.sql in SQL editor
- Copy connection details to .env.local

4. Configure environment variables in .env.local

## Phase 2: Core Libraries Implementation

### Create src/lib/db/supabase.ts
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Create src/lib/api/clickup.ts
Implement ClickUp API client with methods:
- getList(listId)
- getListTasks(listId)
- getTask(taskId)
- getCustomFields(listId)
- getTaskComments(taskId)
- downloadAttachment(url)

### Create src/lib/api/monday.ts
Implement Monday.com GraphQL client with methods:
- createBoard(name)
- createColumn(boardId, title, type)
- createItem(boardId, name, values)
- searchItems(boardId, query)
- uploadFile(itemId, file)
- updateColumnValue(itemId, columnId, value)

## Phase 3: Authentication Implementation

### ClickUp OAuth (src/app/api/auth/clickup/route.ts)
1. Implement OAuth redirect
2. Handle callback with code exchange
3. Store tokens in Supabase

### Monday.com Auth (src/app/api/auth/monday/route.ts)
1. Implement API token validation
2. Store credentials securely

## Phase 4: List Replication Feature

### Create src/lib/replication/list-replicator.ts
Core class with methods:
- analyzeClickUpList(): Extract structure and fields
- createMondayBoard(): Create board with columns
- generateFieldMappings(): Auto-map field types
- migrateTasks(): Transfer all task data
- transferAttachments(): Handle file uploads

### Create src/lib/replication/field-mapper.ts
Implement intelligent field type mapping:
- ClickUp text → Monday text
- ClickUp number → Monday numbers
- ClickUp date → Monday date
- ClickUp dropdown → Monday status
- ClickUp users → Monday people
- Custom field handling

## Phase 5: File Sync Feature

### Create src/lib/sync/file-sync.ts
Implement file synchronization:
- fetchTasksWithAttachments()
- findMatchingMondayItems()
- checkDuplicates() using file hash
- transferFile() with retry logic
- updateClickUpLink()

### Create src/lib/sync/batch-processor.ts
Handle batch processing:
- createBatches(tasks, size)
- processWithRetry()
- respectRateLimit()
- trackProgress()

## Phase 6: User Interface

### Authentication Page (src/app/auth/page.tsx)
- Connect ClickUp button
- Connect Monday button
- Connection status display

### Operation Selection (src/app/page.tsx)
- File Sync option
- Full Replication option
- Navigation to respective flows

### List Replication UI (src/app/replicate/page.tsx)
- List selector dropdown
- Board name input
- Options checkboxes
- Field mapping review
- Start button

### File Sync UI (src/app/sync/page.tsx)
- List ID input
- Board ID input
- Batch size setting
- Skip duplicates option
- Progress display

### Progress Dashboard Component
- Real-time progress bar
- Task counter
- File transfer stats
- Error display
- Activity log

## Phase 7: API Routes

### Start Replication (src/app/api/replication/create-board/route.ts)
- Validate credentials
- Create replication record
- Start background job
- Return job ID

### Start Sync (src/app/api/sync/start/route.ts)
- Validate inputs
- Create sync job
- Process in batches
- Update progress

### Status Check (src/app/api/sync/status/route.ts)
- Query job status
- Return progress data
- Include error logs

## Phase 8: Testing & Deployment

1. Test with small lists first
2. Verify field mappings
3. Check duplicate detection
4. Test error recovery
5. Deploy to Vercel
6. Configure production environment variables

## Key Implementation Notes

### Rate Limiting
- ClickUp: 100 requests per minute
- Monday: 5000 complexity points per minute
- Implement exponential backoff

### Error Handling
- Wrap all API calls in try-catch
- Log errors to Supabase
- Provide user-friendly messages
- Implement retry mechanism

### Performance Optimization
- Use batch operations where possible
- Implement caching for repeated queries
- Parallel processing for file transfers
- Database connection pooling

### Security
- Never expose API keys to frontend
- Use server-side API routes
- Implement CSRF protection
- Validate all inputs
