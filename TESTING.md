# Testing Guide

This guide explains how to test the ClickUp to Monday.com Sync application from a user's perspective.

## Prerequisites

Before testing, ensure you have:
- Node.js 18+ installed
- Access to the deployed application URL
- Supabase credentials (for backend testing)
- ClickUp and Monday.com API tokens (for integration testing)

## Automated Testing Scripts

### 1. Test Deployment (User Perspective)

This script tests the deployed application as if you were a user visiting the website.

```bash
# Test production deployment
node scripts/test-deployment.js https://clickup-monday-sync.vercel.app

# Test preview deployment
node scripts/test-deployment.js https://clickup-monday-sync-git-feature-branch.vercel.app
```

**What it tests:**
- ✓ Home page loads correctly
- ✓ Dashboard page is accessible
- ✓ API endpoints respond appropriately
- ✓ Authentication errors are handled gracefully
- ✓ Static assets are served
- ✓ JSON responses are valid

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║          DEPLOYMENT TESTING SUITE                     ║
╚════════════════════════════════════════════════════════╝

[TEST] Home Page
  → GET https://clickup-monday-sync.vercel.app/
  ✓ Status: 200 (342ms)
  ✓ Content-Type: text/html
  ✓ Has <title>
  ✓ Has <body>

[TEST] Dashboard Page
  → GET https://clickup-monday-sync.vercel.app/dashboard
  ✓ Status: 200 (289ms)
  ...

╔════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                        ║
╚════════════════════════════════════════════════════════╝

Total Tests: 6
Passed: 6
Failed: 0
Success Rate: 100.0%
```

### 2. Add Test Accounts (Backend Setup)

This script creates test user accounts in your Supabase database.

```bash
# Load environment variables and run
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export ENCRYPTION_KEY=your-64-char-hex-key

node scripts/add-test-accounts.js
```

**What it creates:**
- 2 test user accounts with mock credentials
- Encrypted API tokens for both ClickUp and Monday
- Ready-to-use test data for API testing

## Manual Testing Checklist

### Frontend Testing

#### 1. Home Page (`/`)
- [ ] Page loads without errors
- [ ] All navigation links are visible
- [ ] Feature cards are displayed correctly
- [ ] Links to /auth, /sync, /replicate, /dashboard work
- [ ] Responsive design works on mobile

#### 2. Dashboard Page (`/dashboard`)
- [ ] Statistics cards display (Total Syncs, Files Transferred, Active Jobs)
- [ ] "Recent Jobs" section is visible
- [ ] Empty state message shows when no jobs exist
- [ ] Page layout is clean and professional

### Backend API Testing

Use a tool like Postman, Insomnia, or curl to test the API endpoints.

#### 3. Authentication API

**Test ClickUp OAuth URL Generation:**
```bash
# Should redirect to ClickUp OAuth
curl -I https://your-app.vercel.app/api/auth/clickup
```

**Test Monday OAuth URL Generation:**
```bash
# Should redirect to Monday OAuth
curl -I https://your-app.vercel.app/api/auth/monday
```

**Expected:** 302 redirect to OAuth provider

#### 4. File Sync API

**Start a Sync Job (should fail without credentials):**
```bash
curl -X POST https://your-app.vercel.app/api/sync/start \
  -H "Content-Type: application/json" \
  -d '{
    "clickupListId": "123456789",
    "mondayBoardId": 987654321,
    "batchSize": 10,
    "skipDuplicates": true
  }'
```

**Expected Response:**
```json
{
  "error": "Missing authentication credentials. Please connect both services."
}
```

**Check Sync Status:**
```bash
curl https://your-app.vercel.app/api/sync/status?jobId=test-job-id
```

**Expected Response:**
```json
{
  "error": "Job not found"
}
```

#### 5. List Replication API

**Analyze a ClickUp List:**
```bash
curl -X POST https://your-app.vercel.app/api/replication/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "clickupListId": "123456789"
  }'
```

**Expected Response:**
```json
{
  "error": "ClickUp not connected. Please authenticate first."
}
```

**Start a Replication:**
```bash
curl -X POST https://your-app.vercel.app/api/replication/start \
  -H "Content-Type: application/json" \
  -d '{
    "clickupListId": "123456789",
    "mondayBoardName": "Test Board",
    "mode": "full",
    "includeAttachments": true,
    "includeComments": true
  }'
```

**Expected Response:**
```json
{
  "error": "Missing authentication credentials. Please connect both services."
}
```

### Integration Testing (With Real Credentials)

If you have access to ClickUp and Monday.com API tokens:

#### 6. Full Integration Test

1. **Set up credentials:**
   - Use the add-test-accounts.js script with real tokens
   - Or manually insert credentials into Supabase

2. **Test File Sync:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/sync/start \
     -H "Content-Type: application/json" \
     -d '{
       "clickupListId": "<real-list-id>",
       "mondayBoardId": <real-board-id>,
       "batchSize": 5,
       "skipDuplicates": true
     }'
   ```

3. **Monitor Progress:**
   ```bash
   # Use the jobId from the response
   curl https://your-app.vercel.app/api/sync/status?jobId=<job-id>
   ```

4. **Verify Results:**
   - Check Monday.com board for transferred files
   - Check Supabase `file_transfers` table for logs
   - Verify no errors in `sync_jobs` table

#### 7. Full Replication Test

1. **Analyze the list:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/replication/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "clickupListId": "<real-list-id>"
     }'
   ```

2. **Start replication:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/replication/start \
     -H "Content-Type: application/json" \
     -d '{
       "clickupListId": "<real-list-id>",
       "mondayBoardName": "Replicated Board",
       "mode": "full",
       "includeAttachments": true,
       "includeComments": true,
       "includeSubtasks": true
     }'
   ```

3. **Verify Results:**
   - New board created in Monday.com
   - All tasks replicated with correct data
   - Custom fields mapped correctly
   - Files transferred successfully

## Database Verification

### Check Data in Supabase

**View Sync Jobs:**
```sql
SELECT * FROM sync_jobs ORDER BY created_at DESC LIMIT 10;
```

**View File Transfers:**
```sql
SELECT * FROM file_transfers ORDER BY transferred_at DESC LIMIT 20;
```

**View List Replications:**
```sql
SELECT * FROM list_replications ORDER BY created_at DESC LIMIT 10;
```

**View Field Mappings:**
```sql
SELECT * FROM field_mappings WHERE replication_id = '<replication-id>';
```

**View Task Mappings:**
```sql
SELECT * FROM task_mappings WHERE replication_id = '<replication-id>';
```

## Performance Testing

### Load Testing

Use tools like Apache Bench or k6 to test performance:

```bash
# Test home page load time
ab -n 100 -c 10 https://your-app.vercel.app/

# Test API endpoint performance
ab -n 50 -c 5 -p payload.json -T application/json \
  https://your-app.vercel.app/api/replication/analyze
```

### Expected Performance:
- Home page: < 500ms
- Dashboard: < 700ms
- API endpoints: < 1000ms
- File sync: Depends on file sizes (monitor progress)

## Error Scenarios to Test

1. **Missing credentials:** Should return 401 with clear message
2. **Invalid list/board IDs:** Should return 404 or appropriate error
3. **Network timeouts:** Should retry with exponential backoff
4. **Rate limit exceeded:** Should wait and retry automatically
5. **Invalid file formats:** Should skip with error log
6. **Large files (>100MB):** Should handle gracefully or timeout appropriately

## Troubleshooting

### Common Issues

**"Missing authentication credentials" error:**
- Check that credentials are stored in Supabase
- Verify tokens are properly encrypted
- Ensure user_id matches the one used in API calls

**"Job not found" error:**
- Verify the jobId is correct
- Check that the job exists in the database
- Ensure RLS policies allow access

**Files not transferring:**
- Check file size limits
- Verify file URLs are accessible
- Check network connectivity
- Review error logs in file_transfers table

**TypeScript/Build errors:**
- Run `npm run build` locally first
- Check for missing type assertions
- Verify all dependencies are installed

## Continuous Testing

Add these scripts to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test Deployment
on: [deployment_status]
jobs:
  test:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v3
      - name: Test deployment
        run: node scripts/test-deployment.js ${{ github.event.deployment_status.target_url }}
```

## Reporting Issues

When reporting issues, include:
1. URL of the deployment
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots (for UI issues)
5. Browser console errors
6. API response samples
7. Supabase logs (if applicable)

---

**Last Updated:** 2025-10-16
**Maintainer:** Claude Code
