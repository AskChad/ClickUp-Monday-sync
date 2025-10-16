import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const encryptionKey = process.env.ENCRYPTION_KEY!;

// Client for browser/user operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Service role client for server-side operations (bypasses RLS)
export const getServiceSupabase = (): SupabaseClient<Database> => {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
};

// Encryption utilities for API tokens
export const encryptToken = (token: string): string => {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }

  const iv = crypto.randomBytes(16);
  const key = Buffer.from(encryptionKey, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

export const decryptToken = (encryptedToken: string): string => {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }

  const parts = encryptedToken.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = Buffer.from(encryptionKey, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Helper functions for database operations
export const saveCredentials = async (
  userId: string,
  service: 'clickup' | 'monday',
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    workspaceId?: string;
  }
) => {
  const db = getServiceSupabase();

  const { data, error } = await db
    .from('api_credentials')
    .upsert({
      user_id: userId,
      service,
      access_token: encryptToken(credentials.accessToken),
      refresh_token: credentials.refreshToken ? encryptToken(credentials.refreshToken) : null,
      expires_at: credentials.expiresAt || null,
      workspace_id: credentials.workspaceId || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,service'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save credentials: ${error.message}`);
  }

  return data;
};

export const getCredentials = async (
  userId: string,
  service: 'clickup' | 'monday'
) => {
  const db = getServiceSupabase();

  const { data, error } = await db
    .from('api_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No credentials found
    }
    throw new Error(`Failed to get credentials: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    access_token: data.access_token ? decryptToken(data.access_token) : null,
    refresh_token: data.refresh_token ? decryptToken(data.refresh_token) : null,
  };
};

export const logActivity = async (
  userId: string,
  action: string,
  details: any,
  jobId?: string
) => {
  const db = getServiceSupabase();

  const { error } = await db
    .from('activity_logs')
    .insert({
      user_id: userId,
      job_id: jobId || null,
      action,
      details,
    });

  if (error) {
    console.error('Failed to log activity:', error);
  }
};