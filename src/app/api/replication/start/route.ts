import { NextResponse } from 'next/server';
import { ListReplicator } from '@/lib/replication/list-replicator';
import { supabase } from '@/lib/db/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clickupListId,
      mondayBoardName,
      options,
      userId
    } = body;
    
    // Get user's API credentials
    const { data: credentials } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('user_id', userId);
    
    const clickupCred = credentials?.find(c => c.service === 'clickup');
    const mondayCred = credentials?.find(c => c.service === 'monday');
    
    if (!clickupCred || !mondayCred) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 401 }
      );
    }
    
    // Create replication record
    const { data: replication } = await supabase
      .from('list_replications')
      .insert({
        user_id: userId,
        clickup_list_id: clickupListId,
        clickup_list_name: mondayBoardName,
        status: 'mapping',
        replication_mode: 'full',
        options: options
      })
      .select()
      .single();
    
    if (!replication) {
      throw new Error('Failed to create replication record');
    }
    
    // Start replication process
    const replicator = new ListReplicator(
      clickupCred.access_token,
      mondayCred.access_token,
      replication.id
    );
    
    // Run async without waiting (background job)
    replicator.replicate(clickupListId, mondayBoardName, options)
      .catch(error => {
        console.error('Replication failed:', error);
        // Update status to failed
        supabase
          .from('list_replications')
          .update({ 
            status: 'failed',
            error_message: error.message 
          })
          .eq('id', replication.id);
      });
    
    return NextResponse.json({
      success: true,
      replicationId: replication.id,
      message: 'Replication started successfully'
    });
    
  } catch (error) {
    console.error('Failed to start replication:', error);
    return NextResponse.json(
      { error: 'Failed to start replication' },
      { status: 500 }
    );
  }
}
