// Central export for all types
export * from './clickup';
export * from './monday';
export * from './database';

// Common application types
export interface SyncProgress {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalTasks: number;
  processedTasks: number;
  currentTask?: string;
  errors: SyncError[];
  startedAt?: string;
  completedAt?: string;
}

export interface SyncError {
  taskId: string;
  taskName: string;
  error: string;
  timestamp: string;
  retryCount: number;
}

export interface SyncOptions {
  batchSize: number;
  skipDuplicates: boolean;
  includeAttachments: boolean;
  includeComments: boolean;
  includeSubtasks: boolean;
  clickupLinkField?: string;
}

export interface ReplicationOptions {
  mode: 'full' | 'structure_only' | 'data_only';
  includeAttachments: boolean;
  includeComments: boolean;
  includeSubtasks: boolean;
  preserveAssignees: boolean;
  preserveDates: boolean;
  customFieldMapping?: Record<string, string>;
}

export interface AuthCredentials {
  service: 'clickup' | 'monday';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  workspaceId?: string;
}

// API client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Rate limiting
export interface RateLimiter {
  checkLimit(): Promise<boolean>;
  waitForReset(): Promise<void>;
  getRemainingQuota(): number;
}
