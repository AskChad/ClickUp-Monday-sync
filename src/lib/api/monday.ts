import { GraphQLClient, RequestDocument } from 'graphql-request';
import { gql } from 'graphql-request';
import axios from 'axios';
import FormData from 'form-data';
import { RateLimiter, ExponentialBackoff } from '@/lib/utils/rate-limiter';
import type {
  MondayBoard,
  MondayColumn,
  MondayItem,
  MondayColumnType,
  MondayUpdate,
  MondayAsset,
  GraphQLResponse,
  MondayComplexityInfo,
} from '@/types/monday';

export class MondayAPI {
  private client: GraphQLClient;
  private apiToken: string;
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;
  private complexityBudget: number = 5000000; // 5M per minute
  private complexityUsed: number = 0;
  private complexityResetTime: number = 0;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.client = new GraphQLClient('https://api.monday.com/v2', {
      headers: {
        'Authorization': apiToken,
        'API-Version': '2024-01',
        'Content-Type': 'application/json',
      },
    });

    // Monday rate limit: 5M complexity points per minute
    // Typical query uses 1000-50000 complexity
    this.rateLimiter = new RateLimiter({
      maxRequests: 60, // Conservative limit
      windowMs: 60 * 1000,
      minInterval: 500, // 500ms between requests
    });

    this.backoff = new ExponentialBackoff(3, 1000, 30000);
  }

  private async makeRequest<T>(query: RequestDocument, variables?: any): Promise<T> {
    await this.rateLimiter.waitForReset();

    // Check complexity budget
    if (this.complexityUsed > this.complexityBudget * 0.9) {
      const now = Date.now() / 1000;
      if (now < this.complexityResetTime) {
        const waitTime = (this.complexityResetTime - now) * 1000;
        console.log(`Monday complexity budget nearly exceeded. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
        this.complexityUsed = 0;
      }
    }

    const result = await this.backoff.execute(async () => {
      const response = await this.client.request<any>(query, variables);

      // Track complexity if available
      if (response?.account_id || response?.data) {
        const complexity = response?.extensions?.complexity;
        if (complexity) {
          this.complexityUsed += complexity.query;
          this.complexityResetTime = Date.now() / 1000 + complexity.reset_in_x_seconds;

          if (this.complexityUsed > this.complexityBudget * 0.8) {
            console.warn(
              `Monday complexity warning: ${this.complexityUsed}/${this.complexityBudget} used`
            );
          }
        }
      }

      return response;
    }, ['ETIMEDOUT', 'ECONNRESET', 'complexity_budget_exhausted']);

    this.rateLimiter.recordRequest();
    return result as T;
  }

  // Board methods
  async getBoards(ids?: number[], limit: number = 50): Promise<MondayBoard[]> {
    const query = gql`
      query GetBoards($ids: [ID], $limit: Int) {
        boards(ids: $ids, limit: $limit) {
          id
          name
          description
          board_kind
          state
          workspace_id
          columns {
            id
            title
            type
            settings_str
            archived
          }
          groups {
            id
            title
            color
            position
            archived
          }
        }
      }
    `;

    const data = await this.makeRequest<{ boards: MondayBoard[] }>(query, { ids, limit });
    return data.boards;
  }

  async getBoard(boardId: number): Promise<MondayBoard> {
    const boards = await this.getBoards([boardId]);
    if (!boards || boards.length === 0) {
      throw new Error(`Board ${boardId} not found`);
    }
    return boards[0];
  }

  async createBoard(
    name: string,
    boardKind: 'public' | 'private' | 'share' = 'public',
    workspaceId?: number
  ): Promise<MondayBoard> {
    const mutation = gql`
      mutation CreateBoard($name: String!, $boardKind: BoardKind!, $workspaceId: ID) {
        create_board(
          board_name: $name
          board_kind: $boardKind
          workspace_id: $workspaceId
        ) {
          id
          name
          description
          board_kind
          state
          workspace_id
        }
      }
    `;

    const data = await this.makeRequest<{ create_board: MondayBoard }>(mutation, {
      name,
      boardKind,
      workspaceId,
    });
    return data.create_board;
  }

  // Column methods
  async createColumn(
    boardId: number,
    title: string,
    columnType: MondayColumnType,
    defaults?: any
  ): Promise<MondayColumn> {
    const mutation = gql`
      mutation CreateColumn($boardId: ID!, $title: String!, $columnType: ColumnType!, $defaults: JSON) {
        create_column(
          board_id: $boardId
          title: $title
          column_type: $columnType
          defaults: $defaults
        ) {
          id
          title
          type
          settings_str
          archived
        }
      }
    `;

    const data = await this.makeRequest<{ create_column: MondayColumn }>(mutation, {
      boardId,
      title,
      columnType,
      defaults: defaults ? JSON.stringify(defaults) : undefined,
    });
    return data.create_column;
  }

  // Item methods
  async getItems(boardId: number, limit: number = 500): Promise<MondayItem[]> {
    const query = gql`
      query GetItems($boardId: ID!, $limit: Int) {
        boards(ids: [$boardId]) {
          items_page(limit: $limit) {
            items {
              id
              name
              state
              created_at
              updated_at
              creator_id
              group {
                id
                title
              }
              column_values {
                id
                title
                type
                value
                text
              }
            }
          }
        }
      }
    `;

    const data = await this.makeRequest<{ boards: Array<{ items_page: { items: MondayItem[] } }> }>(
      query,
      { boardId, limit }
    );

    return data.boards[0]?.items_page?.items || [];
  }

  async searchItemsByName(boardId: number, searchQuery: string): Promise<MondayItem[]> {
    const items = await this.getItems(boardId);
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  async createItem(
    boardId: number,
    itemName: string,
    columnValues?: Record<string, any>,
    groupId?: string
  ): Promise<MondayItem> {
    const mutation = gql`
      mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON, $groupId: String) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
          group_id: $groupId
        ) {
          id
          name
          state
          created_at
          group {
            id
            title
          }
        }
      }
    `;

    const data = await this.makeRequest<{ create_item: MondayItem }>(mutation, {
      boardId: parseInt(boardId.toString()),
      itemName,
      columnValues: columnValues ? JSON.stringify(columnValues) : undefined,
      groupId,
    });
    return data.create_item;
  }

  async createSubitem(
    parentItemId: number,
    itemName: string,
    columnValues?: Record<string, any>
  ): Promise<MondayItem> {
    const mutation = gql`
      mutation CreateSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON) {
        create_subitem(
          parent_item_id: $parentItemId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
          name
          state
        }
      }
    `;

    const data = await this.makeRequest<{ create_subitem: MondayItem }>(mutation, {
      parentItemId: parseInt(parentItemId.toString()),
      itemName,
      columnValues: columnValues ? JSON.stringify(columnValues) : undefined,
    });
    return data.create_subitem;
  }

  async changeColumnValue(
    itemId: number,
    columnId: string,
    value: any
  ): Promise<MondayItem> {
    const mutation = gql`
      mutation ChangeColumnValue($itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(
          item_id: $itemId
          column_id: $columnId
          value: $value
        ) {
          id
        }
      }
    `;

    const data = await this.makeRequest<{ change_column_value: MondayItem }>(mutation, {
      itemId: parseInt(itemId.toString()),
      columnId,
      value: JSON.stringify(value),
    });
    return data.change_column_value;
  }

  // Update methods (comments)
  async createUpdate(itemId: number, body: string): Promise<MondayUpdate> {
    const mutation = gql`
      mutation CreateUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
          body
          text_body
          created_at
          updated_at
          creator {
            id
            name
            email
          }
        }
      }
    `;

    const data = await this.makeRequest<{ create_update: MondayUpdate }>(mutation, {
      itemId: parseInt(itemId.toString()),
      body,
    });
    return data.create_update;
  }

  // File upload method
  async addFileToColumn(
    itemId: number,
    columnId: string,
    file: Buffer,
    fileName: string
  ): Promise<MondayAsset> {
    const form = new FormData();

    // Create the GraphQL query
    const query = `
      mutation ($file: File!) {
        add_file_to_column (
          item_id: ${itemId},
          column_id: "${columnId}",
          file: $file
        ) {
          id
          name
          url
          file_extension
          file_size
        }
      }
    `;

    const map = {
      file: ['variables.file'],
    };

    form.append('query', query);
    form.append('map', JSON.stringify(map));
    form.append('file', file, fileName);

    try {
      const response = await axios.post('https://api.monday.com/v2/file', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: this.apiToken,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.data.errors) {
        throw new Error(`Monday file upload error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data.add_file_to_column;
    } catch (error: any) {
      throw new Error(`Failed to upload file to Monday: ${error.message}`);
    }
  }

  // Utility methods
  getRateLimitStatus() {
    return {
      remaining: this.rateLimiter.getRemainingQuota(),
      complexityUsed: this.complexityUsed,
      complexityBudget: this.complexityBudget,
      complexityRemaining: this.complexityBudget - this.complexityUsed,
    };
  }

  resetRateLimiter() {
    this.rateLimiter.reset();
    this.complexityUsed = 0;
  }
}

// OAuth helper functions (Monday also supports OAuth)
export const getMondayOAuthURL = (clientId: string, redirectUri: string): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  return `https://auth.monday.com/oauth2/authorize?${params.toString()}`;
};

export const exchangeMondayCode = async (
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string }> => {
  const response = await axios.post('https://auth.monday.com/oauth2/token', {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  return response.data;
};
