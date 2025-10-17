import { ClickUpAPI } from '@/lib/api/clickup';
import { MondayAPI } from '@/lib/api/monday';
import { getServiceSupabase } from '@/lib/db/supabase';
import { FieldMapper, mapDescriptionToUpdate } from './field-mapper';
import { BatchProcessor, BatchTask } from '@/lib/sync/batch-processor';
import type { ClickUpTask, ClickUpCustomField, ClickUpAttachment, ClickUpComment } from '@/types/clickup';
import type { MondayBoard, MondayItem, FieldMapping } from '@/types/monday';
import type { ReplicationOptions } from '@/types';

export interface ReplicationResult {
  success: boolean;
  boardId?: string;
  tasksCreated: number;
  tasksFailed: number;
  filesTransferred: number;
  commentsMigrated: number;
  errors: string[];
}

export class ListReplicator {
  private clickup: ClickUpAPI;
  private monday: MondayAPI;
  private replicationId: string;
  private userId: string;

  constructor(
    clickupToken: string,
    mondayToken: string,
    replicationId: string,
    userId: string
  ) {
    this.clickup = new ClickUpAPI(clickupToken);
    this.monday = new MondayAPI(mondayToken);
    this.replicationId = replicationId;
    this.userId = userId;
  }

  /**
   * Replicate a ClickUp list to a new Monday board
   */
  async replicate(
    clickupListId: string,
    mondayBoardName: string,
    options: ReplicationOptions
  ): Promise<ReplicationResult> {
    const result: ReplicationResult = {
      success: true,
      tasksCreated: 0,
      tasksFailed: 0,
      filesTransferred: 0,
      commentsMigrated: 0,
      errors: [],
    };

    try {
      console.log(`Starting replication of ClickUp list ${clickupListId}...`);
      await this.updateReplicationStatus('creating');

      // Step 1: Analyze ClickUp list structure
      console.log('Analyzing ClickUp list structure...');
      const listData = await this.clickup.getList(clickupListId);
      const customFields = options.mode !== 'data_only'
        ? await this.clickup.getCustomFields(clickupListId)
        : [];

      // Step 2: Create Monday board
      console.log(`Creating Monday board: ${mondayBoardName}...`);
      const board = await this.monday.createBoard(mondayBoardName);
      result.boardId = board.id;

      // Update replication record with board info
      await this.updateReplication({
        monday_board_id: board.id,
        monday_board_name: board.name,
        clickup_list_name: listData.name,
      });

      // Step 3: Create field mappings if not data_only mode
      let fieldMappings: FieldMapping[] = [];
      if (options.mode !== 'data_only') {
        console.log('Creating field mappings...');
        fieldMappings = await this.createFieldMappings(customFields, parseInt(board.id));
      }

      // Step 4: Migrate tasks if not structure_only mode
      if (options.mode !== 'structure_only') {
        console.log('Fetching tasks from ClickUp...');
        await this.updateReplicationStatus('migrating');

        const tasks = await this.clickup.getListTasks(clickupListId);
        console.log(`Found ${tasks.length} tasks to migrate`);

        // Update total count
        await this.updateProgress(0, tasks.length);

        // Process tasks using batch processor
        const batchResult = await this.migrateTasks(
          tasks,
          parseInt(board.id),
          fieldMappings,
          options
        );

        result.tasksCreated = batchResult.successful;
        result.tasksFailed = batchResult.failed;
      }

      // Mark as completed
      await this.updateReplicationStatus('completed', new Date().toISOString());
      console.log('Replication completed successfully!');

      return result;
    } catch (error: any) {
      console.error('Replication failed:', error);
      result.success = false;
      result.errors.push(error.message);

      await this.updateReplicationStatus('failed', undefined, error.message);
      throw error;
    }
  }

  /**
   * Create field mappings for custom fields
   */
  private async createFieldMappings(
    customFields: ClickUpCustomField[],
    boardId: number
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];
    const db = getServiceSupabase();

    for (const field of customFields) {
      try {
        // Map ClickUp field type to Monday column type
        const mondayColumnType = FieldMapper.mapFieldType(field.type);
        const columnName = FieldMapper.sanitizeColumnName(field.name);
        const columnSettings = FieldMapper.createColumnSettings(field);

        // Create Monday column
        const column = await this.monday.createColumn(
          boardId,
          columnName,
          mondayColumnType,
          columnSettings
        );

        // Create field mapping
        const mapping: FieldMapping = {
          clickupField: field.name,
          clickupFieldType: field.type,
          mondayColumn: column.id,
          mondayColumnType: column.type,
          transformationRule: FieldMapper.getTransformationRule(field.type),
        };

        // Save to database
        await db.from('field_mappings').insert({
          replication_id: this.replicationId,
          clickup_field_id: field.id,
          clickup_field_name: field.name,
          clickup_field_type: field.type,
          monday_column_id: column.id,
          monday_column_name: column.title,
          monday_column_type: column.type,
          mapping_status: 'auto',
        } as any);

        mappings.push(mapping);
        console.log(`✓ Mapped field: ${field.name} → ${column.title} (${column.type})`);
      } catch (error: any) {
        console.error(`Failed to create mapping for field ${field.name}:`, error);
        // Continue with other fields
      }
    }

    return mappings;
  }

  /**
   * Migrate tasks to Monday using batch processor
   */
  private async migrateTasks(
    tasks: ClickUpTask[],
    boardId: number,
    fieldMappings: FieldMapping[],
    options: ReplicationOptions
  ) {
    const batchProcessor = new BatchProcessor<ClickUpTask>(this.replicationId);

    return await batchProcessor.processBatch(
      tasks,
      10, // Batch size of 10 tasks
      async (task) => {
        return await this.migrateTask(task, boardId, fieldMappings, options);
      },
      {
        maxRetries: 3,
        parallel: false, // Sequential to maintain order
        delayBetweenBatches: 500,
        onProgress: async (processed, total) => {
          await this.updateProgress(processed, total);
        },
        onError: (error, task) => {
          console.error(`Error migrating task ${task.name}:`, error.message);
        },
      }
    );
  }

  /**
   * Migrate a single task
   */
  private async migrateTask(
    task: ClickUpTask,
    boardId: number,
    fieldMappings: FieldMapping[],
    options: ReplicationOptions
  ): Promise<MondayItem> {
    const db = getServiceSupabase();

    // Get full task details if needed
    const fullTask = options.includeAttachments || options.includeComments
      ? await this.clickup.getTask(task.id)
      : task;

    // Transform task data
    const { name, columnValues } = FieldMapper.transformStandardFields(fullTask);
    const customFieldValues = FieldMapper.transformCustomFieldValues(fullTask, fieldMappings);

    // Merge column values
    const allColumnValues = { ...columnValues, ...customFieldValues };

    // Create Monday item
    const item = await this.monday.createItem(
      boardId,
      name,
      allColumnValues
    );

    console.log(`✓ Created item: ${item.name}`);

    // Store task mapping
    await db.from('task_mappings').insert({
      replication_id: this.replicationId,
      clickup_task_id: task.id,
      monday_item_id: item.id,
      clickup_parent_id: task.parent || null,
      task_data: fullTask,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    } as any);

    // Handle description as an update/comment
    if (fullTask.description && options.includeComments) {
      const descriptionText = mapDescriptionToUpdate(fullTask.description);
      if (descriptionText) {
        await this.monday.createUpdate(parseInt(item.id), descriptionText);
      }
    }

    // Handle attachments
    if (options.includeAttachments && fullTask.attachments?.length > 0) {
      await this.transferAttachments(fullTask.attachments, item, fullTask.id);
    }

    // Handle comments
    if (options.includeComments) {
      const comments = await this.clickup.getTaskComments(task.id);
      await this.migrateComments(comments, parseInt(item.id));
    }

    // Handle subtasks
    if (options.includeSubtasks && fullTask.parent === null) {
      // This is a parent task, check for subtasks
      const allTasks = await this.clickup.getListTasks(fullTask.list.id);
      const subtasks = allTasks.filter(t => t.parent === fullTask.id);

      for (const subtask of subtasks) {
        await this.migrateSubtask(subtask, parseInt(item.id), boardId, fieldMappings, options);
      }
    }

    return item;
  }

  /**
   * Migrate a subtask as a Monday subitem
   */
  private async migrateSubtask(
    subtask: ClickUpTask,
    parentItemId: number,
    boardId: number,
    fieldMappings: FieldMapping[],
    options: ReplicationOptions
  ): Promise<void> {
    const db = getServiceSupabase();

    const { name, columnValues } = FieldMapper.transformStandardFields(subtask);
    const customFieldValues = FieldMapper.transformCustomFieldValues(subtask, fieldMappings);
    const allColumnValues = { ...columnValues, ...customFieldValues };

    // Create as subitem in Monday
    const subitem = await this.monday.createSubitem(
      parentItemId,
      name,
      allColumnValues
    );

    console.log(`  ↳ Created subitem: ${subitem.name}`);

    // Store mapping
    await db.from('task_mappings').insert({
      replication_id: this.replicationId,
      clickup_task_id: subtask.id,
      monday_item_id: subitem.id,
      clickup_parent_id: subtask.parent,
      monday_parent_id: parentItemId.toString(),
      task_data: subtask,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    } as any);
  }

  /**
   * Transfer attachments from ClickUp to Monday
   */
  private async transferAttachments(
    attachments: ClickUpAttachment[],
    item: MondayItem,
    clickupTaskId: string
  ): Promise<void> {
    const db = getServiceSupabase();

    // Ensure file column exists
    const board = await this.monday.getBoard(parseInt(item.board.id));
    let fileColumn = board.columns?.find(col => col.type === 'file');

    if (!fileColumn) {
      fileColumn = await this.monday.createColumn(parseInt(item.board.id), 'Files', 'file');
    }

    for (const attachment of attachments) {
      try {
        console.log(`  ↳ Transferring file: ${attachment.title}...`);

        const fileBuffer = await this.clickup.downloadAttachment(attachment.url);

        await this.monday.addFileToColumn(
          parseInt(item.id),
          fileColumn.id,
          fileBuffer,
          attachment.title
        );

        // Log successful transfer
        await db.from('file_transfers').insert({
          job_id: this.replicationId,
          clickup_task_id: clickupTaskId,
          monday_item_id: item.id,
          file_name: attachment.title,
          file_size: attachment.size,
          status: 'transferred',
          transferred_at: new Date().toISOString(),
        } as any);

        console.log(`    ✓ Transferred: ${attachment.title}`);
      } catch (error: any) {
        console.error(`    ✗ Failed to transfer ${attachment.title}:`, error.message);

        await db.from('file_transfers').insert({
          job_id: this.replicationId,
          clickup_task_id: clickupTaskId,
          monday_item_id: item.id,
          file_name: attachment.title,
          file_size: attachment.size,
          status: 'failed',
          error_message: error.message,
        } as any);
      }
    }
  }

  /**
   * Migrate comments from ClickUp to Monday updates
   */
  private async migrateComments(comments: ClickUpComment[], itemId: number): Promise<void> {
    for (const comment of comments) {
      try {
        const commentText = comment.comment_text ||
          comment.comment.map(c => c.text).join(' ');

        if (commentText.trim()) {
          await this.monday.createUpdate(itemId, commentText);
          console.log(`  ↳ Migrated comment`);
        }
      } catch (error: any) {
        console.error(`Failed to migrate comment:`, error.message);
      }
    }
  }

  /**
   * Update replication status
   */
  private async updateReplicationStatus(
    status: 'mapping' | 'creating' | 'migrating' | 'completed' | 'failed',
    completedAt?: string,
    errorMessage?: string
  ): Promise<void> {
    const db = getServiceSupabase();

    const updates: any = {
      status,
      ...(completedAt && { completed_at: completedAt }),
      ...(errorMessage && { error_message: errorMessage }),
      ...(status === 'migrating' && !updates.started_at && { started_at: new Date().toISOString() }),
    };

    await db
      .from('list_replications')
      .update(updates)
      .eq('id', this.replicationId);
  }

  /**
   * Update replication record
   */
  private async updateReplication(data: any): Promise<void> {
    const db = getServiceSupabase();
    await db
      .from('list_replications')
      .update(data)
      .eq('id', this.replicationId);
  }

  /**
   * Update migration progress
   */
  private async updateProgress(processed: number, total: number): Promise<void> {
    const db = getServiceSupabase();

    await db
      .from('list_replications')
      .update({
        migrated_tasks: processed,
        total_tasks: total,
      })
      .eq('id', this.replicationId);
  }
}
