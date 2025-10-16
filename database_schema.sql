-- Complete database schema for ClickUp-Monday Sync Application
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Credentials table  
CREATE TABLE public.api_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('clickup', 'monday')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  workspace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- List Replications table
CREATE TABLE public.list_replications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  clickup_list_id TEXT NOT NULL,
  clickup_list_name TEXT,
  monday_board_id TEXT,
  monday_board_name TEXT,
  status TEXT CHECK (status IN ('mapping', 'creating', 'migrating', 'completed', 'failed')) DEFAULT 'mapping',
  total_tasks INTEGER DEFAULT 0,
  migrated_tasks INTEGER DEFAULT 0,
  replication_mode TEXT CHECK (replication_mode IN ('full', 'structure_only', 'data_only')) DEFAULT 'full',
  options JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field Mappings table
CREATE TABLE public.field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  replication_id UUID REFERENCES public.list_replications(id) ON DELETE CASCADE,
  clickup_field_id TEXT,
  clickup_field_name TEXT NOT NULL,
  clickup_field_type TEXT NOT NULL,
  monday_column_id TEXT,
  monday_column_name TEXT,
  monday_column_type TEXT,
  mapping_status TEXT CHECK (mapping_status IN ('auto', 'manual', 'skipped')) DEFAULT 'auto',
  transformation_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Jobs table
CREATE TABLE public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  replication_id UUID REFERENCES public.list_replications(id) ON DELETE SET NULL,
  clickup_list_id TEXT NOT NULL,
  monday_board_id TEXT NOT NULL,
  job_type TEXT CHECK (job_type IN ('file_sync', 'full_replication', 'update_sync')) DEFAULT 'file_sync',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  total_tasks INTEGER DEFAULT 0,
  processed_tasks INTEGER DEFAULT 0,
  batch_size INTEGER DEFAULT 10,
  options JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Mappings table
CREATE TABLE public.task_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  replication_id UUID REFERENCES public.list_replications(id) ON DELETE CASCADE,
  clickup_task_id TEXT UNIQUE NOT NULL,
  monday_item_id TEXT,
  clickup_parent_id TEXT,
  monday_parent_id TEXT,
  task_data JSONB,
  sync_status TEXT CHECK (sync_status IN ('pending', 'synced', 'updated', 'failed')) DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Transfers table
CREATE TABLE public.file_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  clickup_task_id TEXT NOT NULL,
  monday_item_id TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'transferred', 'skipped', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  clickup_link TEXT,
  transferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_api_credentials_user_service ON public.api_credentials(user_id, service);
CREATE INDEX idx_list_replications_user_id ON public.list_replications(user_id);
CREATE INDEX idx_field_mappings_replication_id ON public.field_mappings(replication_id);
CREATE INDEX idx_sync_jobs_user_id ON public.sync_jobs(user_id);
CREATE INDEX idx_task_mappings_replication_id ON public.task_mappings(replication_id);
CREATE INDEX idx_file_transfers_job_id ON public.file_transfers(job_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_replications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can manage own credentials" ON public.api_credentials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own replications" ON public.list_replications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sync jobs" ON public.sync_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own activity" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_credentials_updated_at BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();