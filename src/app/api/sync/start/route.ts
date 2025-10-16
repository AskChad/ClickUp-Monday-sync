import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getCredentials } from '@/lib/db/supabase';
import { FileSyncEngine } from '@/lib/sync/file-sync';
import type { SyncOptions } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clickupListId,
      mondayBoardId,
      batchSize = 10,
      skipDuplicates = true,
      includeAttachments = true,
      includeComments = false,
      includeSubtasks = false,
      clickupLinkField,
    } = body;

    // Validate input
    if (!clickupListId || !mondayBoardId) {
      return NextResponse.json(
        { error: 'clickupListId and mondayBoardId are required' },
        { status: 400 }
      );
    }

    const userId = 'temp-user-id'; // TODO: Get from session

    // Get credentials
    const clickupCreds = await getCredentials(userId, 'clickup');
    const mondayCreds = await getCredentials(userId, 'monday');

    if (!clickupCreds?.access_token || !mondayCreds?.access_token) {
      return NextResponse.json(
        { error: 'Missing authentication credentials. Please connect both services.' },
        { status: 401 }
      );
    }

    // Create sync job
    const db = getServiceSupabase();
    const { data: job, error: jobError } = await db
      .from('sync_jobs')
      .insert({
        user_id: userId,
        clickup_list_id: clickupListId,
        monday_board_id: mondayBoardId.toString(),
        job_type: 'file_sync',
        status: 'pending',
        batch_size: batchSize,
        options: {
          skipDuplicates,
          includeAttachments,
          includeComments,
          includeSubtasks,
          clickupLinkField,
        },
        started_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create sync job');
    }

    // Start sync in background
    const syncOptions: SyncOptions = {
      batchSize,
      skipDuplicates,
      includeAttachments,
      includeComments,
      includeSubtasks,
      clickupLinkField,
    };

    // Run sync asynchronously
    const syncEngine = new FileSyncEngine(
      clickupCreds.access_token,
      mondayCreds.access_token,
      job.id,
      userId
    );

    // Don't await - run in background
    syncEngine
      .syncFiles(clickupListId, parseInt(mondayBoardId), syncOptions)
      .then((result) => {
        console.log('Sync completed:', result);
      })
      .catch((error) => {
        console.error('Sync failed:', error);
      });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'File sync started',
    });
  } catch (error: any) {
    console.error('Sync start error:', error);
    return NextResponse.json(
      { error: 'Failed to start sync', details: error.message },
      { status: 500 }
    );
  }
}
