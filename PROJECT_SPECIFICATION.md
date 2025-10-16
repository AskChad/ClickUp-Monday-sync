# ClickUp to Monday.com Sync Application - Complete Project Specification

## Project Overview
Build a Next.js web application that synchronizes files and replicates entire lists between ClickUp and Monday.com. The application should handle authentication, field mapping, batch processing, and provide real-time progress tracking.

## Core Features Required

### 1. Dual Operation Modes
- **File Sync Mode**: Transfer attachments from existing ClickUp tasks to corresponding Monday.com items
- **Full List Replication**: Create new Monday.com boards from ClickUp lists with complete data migration

### 2. Authentication System
- OAuth 2.0 for ClickUp
- API token authentication for Monday.com
- Secure credential storage in Supabase with encryption
- Token refresh mechanism

### 3. File Synchronization Features
- Search ClickUp list for all tasks with attachments
- Match tasks to Monday.com items by name
- Transfer files while checking for duplicates
- Add ClickUp task links to specified Monday.com field
- Skip existing files based on name/hash comparison
- Batch processing with configurable size (0 = all)

### 4. List Replication Features
- Analyze ClickUp list structure and custom fields
- Create new Monday.com board with matching structure
- Map ClickUp fields to Monday.com column types automatically
- Migrate all tasks with their data
- Transfer attachments, comments, and subtasks
- Preserve task relationships and dependencies
- Support for task templates and recurring tasks

### 5. User Interface Requirements
- Authentication connection page
- Operation selection (File Sync vs List Replication)
- Configuration forms with field mapping
- Real-time progress dashboard
- Error reporting and recovery options
- Job history and logs

## Technical Stack
- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Vercel
- **APIs**: ClickUp API v2, Monday.com GraphQL API v2

## Database Requirements
- Users table with authentication
- Encrypted API credentials storage
- List replication tracking
- Field mapping configurations
- Sync job management
- Task relationship mappings
- File transfer logs
- Activity audit logs
- Scheduled sync support

## Security Requirements
- All API tokens must be encrypted using Supabase vault
- Implement Row Level Security (RLS) policies
- User data isolation
- HTTPS for all communications
- Rate limiting per user
- Session-based authentication

## Performance Requirements
- Support batch sizes from 1 to unlimited (0)
- Parallel processing capabilities
- Handle large files (chunked uploads)
- Retry failed operations (max 3 attempts)
- Rate limit compliance for both APIs
- Progress persistence for recovery

## Error Handling
- Graceful API rate limit handling with exponential backoff
- Automatic retry for network failures
- Detailed error logging
- User-friendly error messages
- Recovery options for partial failures