import { getServiceSupabase } from '@/lib/db/supabase';
import { ExponentialBackoff } from '@/lib/utils/rate-limiter';

export interface BatchTask {
  id: string;
  name: string;
  [key: string]: any;
}

export interface BatchResult<T = any> {
  successful: number;
  failed: number;
  skipped: number;
  results: TaskResult<T>[];
  duration: number;
}

export interface TaskResult<T = any> {
  taskId: string;
  taskName?: string;
  success: boolean;
  error?: string;
  data?: T;
  retryCount: number;
  duration: number;
}

export interface BatchOptions {
  maxRetries?: number;
  parallel?: boolean;
  maxParallel?: number;
  delayBetweenBatches?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, task: BatchTask) => void;
}

export class BatchProcessor<T extends BatchTask = BatchTask> {
  private jobId: string;
  private backoff: ExponentialBackoff;

  constructor(jobId: string) {
    this.jobId = jobId;
    this.backoff = new ExponentialBackoff();
  }

  /**
   * Process tasks in batches with configurable options
   */
  async processBatch<R = any>(
    tasks: T[],
    batchSize: number,
    processor: (task: T) => Promise<R>,
    options: BatchOptions = {}
  ): Promise<BatchResult<R>> {
    const startTime = Date.now();
    const batches = this.createBatches(tasks, batchSize);
    const results: TaskResult<R>[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    const {
      maxRetries = 3,
      parallel = false,
      maxParallel = 5,
      delayBetweenBatches = 650,
      onProgress,
      onError,
    } = options;
    
    for (const [index, batch] of batches.entries()) {
      try {
        // Process batch (parallel or sequential)
        const batchResults = parallel
          ? await this.processParallel(batch, processor, maxParallel, maxRetries, onError)
          : await this.processSequential(batch, processor, maxRetries, onError);

        // Count results
        for (const result of batchResults) {
          if (result.success) {
            successful++;
          } else if (result.error?.includes('skipped')) {
            skipped++;
          } else {
            failed++;
          }
        }

        results.push(...batchResults);

        // Update progress
        const processed = (index + 1) * (batchSize === 0 ? tasks.length : batchSize);
        const actualProcessed = Math.min(processed, tasks.length);

        await this.updateProgress(actualProcessed, tasks.length);

        // Call progress callback if provided
        if (onProgress) {
          onProgress(actualProcessed, tasks.length);
        }

        // Wait between batches
        if (index < batches.length - 1 && delayBetweenBatches > 0) {
          await this.wait(delayBetweenBatches);
        }
      } catch (error) {
        console.error(`Batch ${index} failed:`, error);
        await this.logError(`Batch ${index} processing failed`, error);
        failed += batch.length;
      }
    }

    return {
      successful,
      failed,
      skipped,
      results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Process tasks sequentially with retry logic
   */
  private async processSequential<R>(
    tasks: T[],
    processor: (task: T) => Promise<R>,
    maxRetries: number,
    onError?: (error: Error, task: T) => void
  ): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = [];

    for (const task of tasks) {
      const result = await this.processTaskWithRetry(task, processor, maxRetries, onError);
      results.push(result);
    }

    return results;
  }

  /**
   * Process tasks in parallel with concurrency limit
   */
  private async processParallel<R>(
    tasks: T[],
    processor: (task: T) => Promise<R>,
    maxParallel: number,
    maxRetries: number,
    onError?: (error: Error, task: T) => void
  ): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = [];
    const queue = [...tasks];
    const inProgress: Promise<TaskResult<R>>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      // Fill up to max parallel tasks
      while (queue.length > 0 && inProgress.length < maxParallel) {
        const task = queue.shift()!;
        const promise = this.processTaskWithRetry(task, processor, maxRetries, onError);
        inProgress.push(promise);
      }

      // Wait for one to complete
      const result = await Promise.race(inProgress);
      results.push(result);

      // Remove completed from in progress
      const index = inProgress.findIndex(p => p === Promise.resolve(result));
      if (index !== -1) {
        inProgress.splice(index, 1);
      }
    }

    return results;
  }

  /**
   * Process a single task with retry logic
   */
  private async processTaskWithRetry<R>(
    task: T,
    processor: (task: T) => Promise<R>,
    maxRetries: number,
    onError?: (error: Error, task: T) => void
  ): Promise<TaskResult<R>> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= maxRetries) {
      try {
        const data = await processor(task);

        return {
          taskId: task.id,
          taskName: task.name,
          success: true,
          data,
          retryCount,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        if (onError) {
          onError(lastError, task);
        }

        if (retryCount <= maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          await this.wait(delay);
        }
      }
    }

    // Failed after all retries
    await this.logTaskFailure(task.id, lastError?.message || 'Unknown error');

    return {
      taskId: task.id,
      taskName: task.name,
      success: false,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`,
      retryCount,
      duration: Date.now() - startTime,
    };
  }
  
  /**
   * Create batches from array of items
   */
  private createBatches<U>(items: U[], size: number): U[][] {
    if (size === 0 || size >= items.length) {
      return [items]; // Process all at once
    }

    const batches: U[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }
  
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Update job progress in database
   */
  private async updateProgress(processed: number, total: number): Promise<void> {
    try {
      const db = getServiceSupabase();
      await db
        .from('sync_jobs')
        .update({
          processed_tasks: processed,
          total_tasks: total,
          status: processed >= total ? 'completed' : 'running',
        })
        .eq('id', this.jobId);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  /**
   * Log error to database
   */
  private async logError(message: string, error: any): Promise<void> {
    try {
      const db = getServiceSupabase();
      const { data: job } = await db
        .from('sync_jobs')
        .select('error_log')
        .eq('id', this.jobId)
        .single();

      const errorLog = job?.error_log || [];
      errorLog.push({
        timestamp: new Date().toISOString(),
        message,
        error: error instanceof Error ? error.message : String(error),
      });

      await db
        .from('sync_jobs')
        .update({ error_log: errorLog })
        .eq('id', this.jobId);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Log task failure
   */
  private async logTaskFailure(taskId: string, errorMessage: string): Promise<void> {
    try {
      const db = getServiceSupabase();
      await db.from('file_transfers').insert({
        job_id: this.jobId,
        clickup_task_id: taskId,
        file_name: 'N/A',
        file_size: 0,
        status: 'failed',
        error_message: errorMessage,
      } as any);
    } catch (error) {
      console.error('Failed to log task failure:', error);
    }
  }
  
  /**
   * Check if file already exists in database
   */
  async checkDuplicates(fileName: string, mondayItemId: string): Promise<boolean> {
    try {
      const db = getServiceSupabase();
      const { data } = await db
        .from('file_transfers')
        .select('id')
        .eq('monday_item_id', mondayItemId)
        .eq('file_name', fileName)
        .eq('status', 'transferred')
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Track file transfer in database
   */
  async trackFileTransfer(
    clickupTaskId: string,
    mondayItemId: string,
    fileName: string,
    fileSize: number,
    status: 'transferred' | 'skipped' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const db = getServiceSupabase();
      await db.from('file_transfers').insert({
        job_id: this.jobId,
        clickup_task_id: clickupTaskId,
        monday_item_id: mondayItemId,
        file_name: fileName,
        file_size: fileSize,
        status,
        error_message: errorMessage,
        transferred_at: status === 'transferred' ? new Date().toISOString() : null,
      } as any);
    } catch (error) {
      console.error('Failed to track file transfer:', error);
    }
  }

  /**
   * Get current job status
   */
  async getJobStatus() {
    try {
      const db = getServiceSupabase();
      const { data } = await db
        .from('sync_jobs')
        .select('*')
        .eq('id', this.jobId)
        .single();

      return data;
    } catch (error) {
      console.error('Failed to get job status:', error);
      return null;
    }
  }
}
