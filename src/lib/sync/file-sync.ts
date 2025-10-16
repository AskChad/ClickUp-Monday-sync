import { ClickUpAPI } from '@/lib/api/clickup';
import { MondayAPI } from '@/lib/api/monday';
import { DuplicateChecker } from './duplicate-checker';
import { getServiceSupabase } from '@/lib/db/supabase';
import type { ClickUpTask, ClickUpAttachment } from '@/types/clickup';
import type { MondayItem } from '@/types/monday';
import type { SyncOptions, SyncProgress, SyncError } from '@/types';

export interface FileSyncResult {
  success: boolean;
  filesTransferred: number;
  filesSkipped: number;
  errors: SyncError[];
}

export class FileSyncEngine {
  private clickupClient: ClickUpAPI;
  private mondayClient: MondayAPI;
  private jobId: string;
  private userId: string;

  constructor(
    clickupAccessToken: string,
    mondayAccessToken: string,
    jobId: string,
    userId: string
  ) {
    this.clickupClient = new ClickUpAPI(clickupAccessToken);
    this.mondayClient = new MondayAPI(mondayAccessToken);
    this.jobId = jobId;
    this.userId = userId;
  }

  /**
   * Sync files from ClickUp tasks to Monday items
   */
  async syncFiles(
    clickupListId: string,
    mondayBoardId: number,
    options: SyncOptions
  ): Promise<FileSyncResult> {
    const result: FileSyncResult = {
      success: true,
      filesTransferred: 0,
      filesSkipped: 0,
      errors: [],
    };

    try {
      // Get all tasks with attachments from ClickUp
      console.log(`Fetching tasks with attachments from ClickUp list ${clickupListId}...`);
      const tasksWithAttachments = await this.clickupClient.getTasksWithAttachments(clickupListId);

      console.log(`Found ${tasksWithAttachments.length} tasks with attachments`);
      await this.updateProgress(tasksWithAttachments.length, 0);

      // Process each task
      for (let i = 0; i < tasksWithAttachments.length; i++) {
        const task = tasksWithAttachments[i];

        try {
          await this.syncTaskFiles(task, mondayBoardId, options);
          result.filesTransferred += task.attachments?.length || 0;

          await this.updateProgress(tasksWithAttachments.length, i + 1);
        } catch (error: any) {
          result.success = false;
          result.errors.push({
            taskId: task.id,
            taskName: task.name,
            error: error.message,
            timestamp: new Date().toISOString(),
            retryCount: 0,
          });

          console.error(`Error syncing files for task ${task.name}:`, error);
        }
      }

      return result;
    } catch (error: any) {
      console.error('File sync failed:', error);
      result.success = false;
      result.errors.push({
        taskId: 'N/A',
        taskName: 'File Sync',
        error: error.message,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });

      return result;
    }
  }

  /**
   * Sync files for a single task
   */
  private async syncTaskFiles(
    task: ClickUpTask,
    mondayBoardId: number,
    options: SyncOptions
  ): Promise<void> {
    // Find matching Monday item by name
    const mondayItems = await this.mondayClient.searchItemsByName(mondayBoardId, task.name);

    if (mondayItems.length === 0) {
      console.warn(`No matching Monday item found for task: ${task.name}`);
      return;
    }

    // Use the first match (could be enhanced with better matching logic)
    const mondayItem = mondayItems[0];

    // Get existing assets on the Monday item
    const existingAssets = mondayItem.assets || [];

    // Process each attachment
    for (const attachment of task.attachments || []) {
      try {
        await this.transferAttachment(
          task,
          attachment,
          mondayItem,
          existingAssets,
          options
        );
      } catch (error: any) {
        console.error(`Failed to transfer attachment ${attachment.title}:`, error);
        throw error;
      }
    }

    // Optionally add ClickUp link to Monday item
    if (options.clickupLinkField) {
      await this.addClickUpLink(mondayItem.id, options.clickupLinkField, task.url);
    }
  }

  /**
   * Transfer a single attachment from ClickUp to Monday
   */
  private async transferAttachment(
    task: ClickUpTask,
    attachment: ClickUpAttachment,
    mondayItem: MondayItem,
    existingAssets: any[],
    options: SyncOptions
  ): Promise<void> {
    // Validate file
    const validation = DuplicateChecker.validateFile(attachment);
    if (!validation.valid) {
      console.warn(`Skipping invalid file ${attachment.title}: ${validation.error}`);
      return;
    }

    // Check for duplicates if enabled
    if (options.skipDuplicates) {
      const duplicateCheck = await DuplicateChecker.check(attachment, existingAssets);
      if (duplicateCheck.isDuplicate) {
        console.log(
          `Skipping duplicate file: ${attachment.title} (${duplicateCheck.reason})`
        );
        await this.logFileTransfer(task.id, mondayItem.id, attachment, 'skipped');
        return;
      }
    }

    // Download file from ClickUp
    console.log(`Downloading ${attachment.title} from ClickUp...`);
    const fileBuffer = await this.clickupClient.downloadAttachment(attachment.url);

    // Upload to Monday
    console.log(`Uploading ${attachment.title} to Monday item ${mondayItem.id}...`);

    // Monday file uploads typically go to a file column
    // We need to find or create a file column
    const fileColumnId = await this.ensureFileColumn(parseInt(mondayItem.board.id));

    await this.mondayClient.addFileToColumn(
      parseInt(mondayItem.id),
      fileColumnId,
      fileBuffer,
      attachment.title
    );

    console.log(`✓ Successfully transferred ${attachment.title}`);
    await this.logFileTransfer(task.id, mondayItem.id, attachment, 'transferred');
  }

  /**
   * Ensure a file column exists on the board
   */
  private async ensureFileColumn(boardId: number): Promise<string> {
    const board = await this.mondayClient.getBoard(boardId);

    // Look for existing file column
    const fileColumn = board.columns?.find(col => col.type === 'file');

    if (fileColumn) {
      return fileColumn.id;
    }

    // Create new file column if none exists
    console.log('Creating file column on Monday board...');
    const newColumn = await this.mondayClient.createColumn(boardId, 'Files', 'file');
    return newColumn.id;
  }

  /**
   * Add ClickUp task link to a Monday item
   */
  private async addClickUpLink(
    mondayItemId: string,
    columnId: string,
    clickupUrl: string
  ): Promise<void> {
    try {
      await this.mondayClient.changeColumnValue(
        parseInt(mondayItemId),
        columnId,
        {
          url: clickupUrl,
          text: 'View in ClickUp',
        }
      );
      console.log(`Added ClickUp link to Monday item ${mondayItemId}`);
    } catch (error: any) {
      console.error('Failed to add ClickUp link:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Log file transfer to database
   */
  private async logFileTransfer(
    clickupTaskId: string,
    mondayItemId: string,
    attachment: ClickUpAttachment,
    status: 'pending' | 'transferred' | 'skipped' | 'failed'
  ): Promise<void> {
    const db = getServiceSupabase();

    await db.from('file_transfers').insert({
      job_id: this.jobId,
      clickup_task_id: clickupTaskId,
      monday_item_id: mondayItemId,
      file_name: attachment.title,
      file_size: attachment.size,
      status,
      transferred_at: status === 'transferred' ? new Date().toISOString() : null,
    });
  }

  /**
   * Update job progress
   */
  private async updateProgress(totalTasks: number, processedTasks: number): Promise<void> {
    const db = getServiceSupabase();

    await db
      .from('sync_jobs')
      .update({
        total_tasks: totalTasks,
        processed_tasks: processedTasks,
        status: processedTasks < totalTasks ? 'running' : 'completed',
        completed_at: processedTasks >= totalTasks ? new Date().toISOString() : null,
      })
      .eq('id', this.jobId);
  }

  /**
   * Find matching Monday items for ClickUp tasks using various strategies
   */
  async findMatchingItems(
    clickupTasks: ClickUpTask[],
    mondayBoardId: number
  ): Promise<Map<string, MondayItem>> {
    const matches = new Map<string, MondayItem>();

    // Get all Monday items
    const mondayItems = await this.mondayClient.getItems(mondayBoardId);

    for (const task of clickupTasks) {
      // Strategy 1: Exact name match
      let match = mondayItems.find(
        item => item.name.toLowerCase() === task.name.toLowerCase()
      );

      // Strategy 2: Fuzzy name match (contains)
      if (!match) {
        match = mondayItems.find(item =>
          item.name.toLowerCase().includes(task.name.toLowerCase()) ||
          task.name.toLowerCase().includes(item.name.toLowerCase())
        );
      }

      if (match) {
        matches.set(task.id, match);
      }
    }

    return matches;
  }
}
