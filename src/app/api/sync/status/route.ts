import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const db = getServiceSupabase();

    // Get job status
    const { data: job, error: jobError } = (await db
      .from('sync_jobs')
      .select('*')
      .eq('id', jobId)
      .single()) as { data: any; error: any };

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get file transfer stats
    const { data: files } = (await db
      .from('file_transfers')
      .select('status')
      .eq('job_id', jobId)) as { data: any[] | null };

    const fileStats = {
      total: files?.length || 0,
      transferred: files?.filter((f) => f.status === 'transferred').length || 0,
      skipped: files?.filter((f) => f.status === 'skipped').length || 0,
      failed: files?.filter((f) => f.status === 'failed').length || 0,
    };

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        totalTasks: job.total_tasks,
        processedTasks: job.processed_tasks,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorLog: job.error_log,
      },
      files: fileStats,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status', details: error.message },
      { status: 500 }
    );
  }
}
