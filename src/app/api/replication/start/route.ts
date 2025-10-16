import { NextRequest, NextResponse } from 'next/server';
import { ListReplicator } from '@/lib/replication/list-replicator';
import { getServiceSupabase, getCredentials } from '@/lib/db/supabase';
import type { ReplicationOptions } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clickupListId,
      mondayBoardName,
      mode = 'full',
      includeAttachments = true,
      includeComments = false,
      includeSubtasks = true,
      preserveAssignees = true,
      preserveDates = true,
    } = body;

    if (!clickupListId || !mondayBoardName) {
      return NextResponse.json(
        { error: 'clickupListId and mondayBoardName are required' },
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

    // Create replication record
    const db = getServiceSupabase();
    const { data: replication, error: repError } = (await db
      .from('list_replications')
      .insert({
        user_id: userId,
        clickup_list_id: clickupListId,
        status: 'mapping',
        replication_mode: mode,
        options: {
          includeAttachments,
          includeComments,
          includeSubtasks,
          preserveAssignees,
          preserveDates,
        },
      } as any)
      .select()
      .single()) as { data: any; error: any };

    if (repError || !replication) {
      throw new Error('Failed to create replication record');
    }

    // Start replication
    const replicator = new ListReplicator(
      clickupCreds.access_token,
      mondayCreds.access_token,
      replication.id,
      userId
    );

    const options: ReplicationOptions = {
      mode,
      includeAttachments,
      includeComments,
      includeSubtasks,
      preserveAssignees,
      preserveDates,
    };

    // Run async without waiting (background job)
    replicator
      .replicate(clickupListId, mondayBoardName, options)
      .then((result) => {
        console.log('Replication completed:', result);
      })
      .catch((error) => {
        console.error('Replication failed:', error);
      });

    return NextResponse.json({
      success: true,
      replicationId: replication.id,
      message: 'List replication started',
    });
  } catch (error: any) {
    console.error('Failed to start replication:', error);
    return NextResponse.json(
      { error: 'Failed to start replication', details: error.message },
      { status: 500 }
    );
  }
}
