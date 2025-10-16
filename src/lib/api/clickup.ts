import axios, { AxiosInstance, AxiosError } from 'axios';
import { RateLimiter, ExponentialBackoff, handleRateLimitResponse } from '@/lib/utils/rate-limiter';
import type {
  ClickUpList,
  ClickUpTask,
  ClickUpTasksResponse,
  ClickUpCustomField,
  ClickUpComment,
  ClickUpCommentsResponse,
  ClickUpWorkspace,
  ClickUpError,
} from '@/types/clickup';

export class ClickUpAPI {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // ClickUp rate limit: 100 requests per minute
    this.rateLimiter = new RateLimiter({
      maxRequests: 90, // Keep buffer of 10
      windowMs: 60 * 1000,
      minInterval: 100, // 100ms between requests
    });

    this.backoff = new ExponentialBackoff(3, 1000, 30000);

    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      (response) => {
        if (response.headers) {
          const limit = response.headers['x-ratelimit-limit'];
          const remaining = response.headers['x-ratelimit-remaining'];

          if (remaining && parseInt(remaining) < 10) {
            console.warn(`ClickUp rate limit warning: ${remaining} requests remaining`);
          }
        }
        return response;
      },
      async (error: AxiosError<ClickUpError>) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

          console.warn(`ClickUp rate limit hit. Waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));

          // Retry the request
          return this.client.request(error.config!);
        }
        return Promise.reject(error);
      }
    );
  }

  private async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
    await this.rateLimiter.waitForReset();

    const result = await this.backoff.execute(
      fn,
      ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
    );

    this.rateLimiter.recordRequest();
    return result;
  }

  // Workspace & User methods
  async getAuthorizedUser() {
    return this.makeRequest(async () => {
      const { data } = await this.client.get('/user');
      return data.user;
    });
  }

  async getWorkspaces() {
    return this.makeRequest(async () => {
      const { data } = await this.client.get('/team');
      return data.teams as ClickUpWorkspace[];
    });
  }

  // List methods
  async getList(listId: string): Promise<ClickUpList> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get(`/list/${listId}`);
      return data as ClickUpList;
    });
  }

  async getFolderLists(folderId: string): Promise<ClickUpList[]> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get(`/folder/${folderId}/list`);
      return data.lists as ClickUpList[];
    });
  }

  async getSpaceLists(spaceId: string): Promise<ClickUpList[]> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get(`/space/${spaceId}/list`);
      return data.lists as ClickUpList[];
    });
  }

  // Task methods
  async getListTasks(
    listId: string,
    options: {
      includeClosed?: boolean;
      page?: number;
      orderBy?: string;
      reverse?: boolean;
      includeSubtasks?: boolean;
    } = {}
  ): Promise<ClickUpTask[]> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get<ClickUpTasksResponse>(`/list/${listId}/task`, {
        params: {
          archived: false,
          include_closed: options.includeClosed ?? true,
          page: options.page ?? 0,
          order_by: options.orderBy ?? 'created',
          reverse: options.reverse ?? false,
          subtasks: options.includeSubtasks ?? true,
          include_markdown_description: true,
        },
      });
      return data.tasks;
    });
  }

  async getTask(taskId: string, includeSubtasks: boolean = true): Promise<ClickUpTask> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get<ClickUpTask>(`/task/${taskId}`, {
        params: {
          custom_task_ids: true,
          team_id: undefined,
          include_subtasks: includeSubtasks,
          include_markdown_description: true,
        },
      });
      return data;
    });
  }

  async getTasksWithAttachments(listId: string): Promise<ClickUpTask[]> {
    const tasks = await this.getListTasks(listId, { includeClosed: true });

    // Filter for tasks that have attachments
    return tasks.filter(task => task.attachments && task.attachments.length > 0);
  }

  // Custom field methods
  async getCustomFields(listId: string): Promise<ClickUpCustomField[]> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get(`/list/${listId}/field`);
      return data.fields as ClickUpCustomField[];
    });
  }

  // Comment methods
  async getTaskComments(taskId: string): Promise<ClickUpComment[]> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get<ClickUpCommentsResponse>(`/task/${taskId}/comment`);
      return data.comments;
    });
  }

  async createTaskComment(taskId: string, commentText: string, notifyAll: boolean = false): Promise<ClickUpComment> {
    return this.makeRequest(async () => {
      const { data } = await this.client.post(`/task/${taskId}/comment`, {
        comment_text: commentText,
        notify_all: notifyAll,
      });
      return data as ClickUpComment;
    });
  }

  // Attachment methods
  async downloadAttachment(url: string): Promise<Buffer> {
    return this.makeRequest(async () => {
      const { data } = await this.client.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(data);
    });
  }

  async uploadAttachment(taskId: string, file: Buffer, filename: string): Promise<any> {
    return this.makeRequest(async () => {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('attachment', file, filename);

      const { data } = await this.client.post(`/task/${taskId}/attachment`, form, {
        headers: {
          ...form.getHeaders(),
        },
      });
      return data;
    });
  }

  // Utility methods
  getRateLimitStatus() {
    return {
      remaining: this.rateLimiter.getRemainingQuota(),
    };
  }

  resetRateLimiter() {
    this.rateLimiter.reset();
  }
}

// OAuth helper functions
export const getClickUpOAuthURL = (clientId: string, redirectUri: string): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  return `https://app.clickup.com/api?${params.toString()}`;
};

export const exchangeClickUpCode = async (
  code: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string }> => {
  const response = await axios.post('https://api.clickup.com/api/v2/oauth/token', {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  });

  return response.data;
};
