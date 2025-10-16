// Database schema types for Supabase

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          updated_at?: string;
        };
      };
      api_credentials: {
        Row: {
          id: string;
          user_id: string;
          service: 'clickup' | 'monday';
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          workspace_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service: 'clickup' | 'monday';
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          workspace_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service?: 'clickup' | 'monday';
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          workspace_id?: string | null;
          updated_at?: string;
        };
      };
      list_replications: {
        Row: {
          id: string;
          user_id: string;
          clickup_list_id: string;
          clickup_list_name: string | null;
          monday_board_id: string | null;
          monday_board_name: string | null;
          status: 'mapping' | 'creating' | 'migrating' | 'completed' | 'failed';
          total_tasks: number;
          migrated_tasks: number;
          replication_mode: 'full' | 'structure_only' | 'data_only';
          options: any;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          clickup_list_id: string;
          clickup_list_name?: string | null;
          monday_board_id?: string | null;
          monday_board_name?: string | null;
          status?: 'mapping' | 'creating' | 'migrating' | 'completed' | 'failed';
          total_tasks?: number;
          migrated_tasks?: number;
          replication_mode?: 'full' | 'structure_only' | 'data_only';
          options?: any;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          monday_board_id?: string | null;
          status?: 'mapping' | 'creating' | 'migrating' | 'completed' | 'failed';
          total_tasks?: number;
          migrated_tasks?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      field_mappings: {
        Row: {
          id: string;
          replication_id: string;
          clickup_field_id: string | null;
          clickup_field_name: string;
          clickup_field_type: string;
          monday_column_id: string | null;
          monday_column_name: string | null;
          monday_column_type: string | null;
          mapping_status: 'auto' | 'manual' | 'skipped';
          transformation_rule: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          replication_id: string;
          clickup_field_id?: string | null;
          clickup_field_name: string;
          clickup_field_type: string;
          monday_column_id?: string | null;
          monday_column_name?: string | null;
          monday_column_type?: string | null;
          mapping_status?: 'auto' | 'manual' | 'skipped';
          transformation_rule?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          monday_column_id?: string | null;
          monday_column_name?: string | null;
          monday_column_type?: string | null;
          mapping_status?: 'auto' | 'manual' | 'skipped';
          transformation_rule?: any | null;
        };
      };
      sync_jobs: {
        Row: {
          id: string;
          user_id: string;
          replication_id: string | null;
          clickup_list_id: string;
          monday_board_id: string;
          job_type: 'file_sync' | 'full_replication' | 'update_sync';
          status: 'pending' | 'running' | 'completed' | 'failed';
          total_tasks: number;
          processed_tasks: number;
          batch_size: number;
          options: any;
          error_log: any[];
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          replication_id?: string | null;
          clickup_list_id: string;
          monday_board_id: string;
          job_type?: 'file_sync' | 'full_replication' | 'update_sync';
          status?: 'pending' | 'running' | 'completed' | 'failed';
          total_tasks?: number;
          processed_tasks?: number;
          batch_size?: number;
          options?: any;
          error_log?: any[];
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: 'pending' | 'running' | 'completed' | 'failed';
          total_tasks?: number;
          processed_tasks?: number;
          error_log?: any[];
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      task_mappings: {
        Row: {
          id: string;
          replication_id: string;
          clickup_task_id: string;
          monday_item_id: string | null;
          clickup_parent_id: string | null;
          monday_parent_id: string | null;
          task_data: any | null;
          sync_status: 'pending' | 'synced' | 'updated' | 'failed';
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          replication_id: string;
          clickup_task_id: string;
          monday_item_id?: string | null;
          clickup_parent_id?: string | null;
          monday_parent_id?: string | null;
          task_data?: any | null;
          sync_status?: 'pending' | 'synced' | 'updated' | 'failed';
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          monday_item_id?: string | null;
          monday_parent_id?: string | null;
          sync_status?: 'pending' | 'synced' | 'updated' | 'failed';
          last_synced_at?: string | null;
        };
      };
      file_transfers: {
        Row: {
          id: string;
          job_id: string;
          clickup_task_id: string;
          monday_item_id: string | null;
          file_name: string;
          file_size: number | null;
          file_hash: string | null;
          status: 'pending' | 'transferred' | 'skipped' | 'failed';
          error_message: string | null;
          clickup_link: string | null;
          transferred_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          clickup_task_id: string;
          monday_item_id?: string | null;
          file_name: string;
          file_size?: number | null;
          file_hash?: string | null;
          status?: 'pending' | 'transferred' | 'skipped' | 'failed';
          error_message?: string | null;
          clickup_link?: string | null;
          transferred_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          monday_item_id?: string | null;
          status?: 'pending' | 'transferred' | 'skipped' | 'failed';
          error_message?: string | null;
          transferred_at?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          job_id: string | null;
          action: string;
          details: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id?: string | null;
          action: string;
          details?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
        };
      };
    };
  };
}
