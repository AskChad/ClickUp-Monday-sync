// Monday.com GraphQL API types

export interface MondayAuthResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface MondayUser {
  id: string;
  name: string;
  email: string;
  photo_thumb: string;
  title: string;
  enabled: boolean;
}

export interface MondayBoard {
  id: string;
  name: string;
  description: string;
  board_kind: string;
  board_folder_id: number | null;
  owner: MondayUser;
  permissions: string;
  state: 'active' | 'archived' | 'deleted';
  workspace_id: string;
  columns: MondayColumn[];
  groups: MondayGroup[];
  items?: MondayItem[];
  items_count?: number;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: MondayColumnType;
  settings_str: string;
  archived: boolean;
  width?: number;
}

export type MondayColumnType =
  | 'text'
  | 'long-text'
  | 'numbers'
  | 'status'
  | 'date'
  | 'people'
  | 'timeline'
  | 'checkbox'
  | 'dropdown'
  | 'email'
  | 'phone'
  | 'link'
  | 'file'
  | 'tags'
  | 'rating'
  | 'location'
  | 'color-picker'
  | 'creation-log'
  | 'last-updated'
  | 'auto-number'
  | 'dependency'
  | 'mirror'
  | 'connect-boards'
  | 'hour';

export interface MondayGroup {
  id: string;
  title: string;
  color: string;
  position: string;
  archived: boolean;
  deleted: boolean;
}

export interface MondayItem {
  id: string;
  name: string;
  state: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  creator_id: string;
  creator: MondayUser;
  board: {
    id: string;
  };
  group: {
    id: string;
    title: string;
  };
  column_values: MondayColumnValue[];
  assets?: MondayAsset[];
  subscribers?: MondayUser[];
  updates?: MondayUpdate[];
}

export interface MondayColumnValue {
  id: string;
  title: string;
  type: MondayColumnType;
  value: string | null;
  text: string;
  additional_info?: any;
}

export interface MondayAsset {
  id: string;
  name: string;
  url: string;
  public_url: string;
  file_extension: string;
  file_size: number;
  uploaded_by: MondayUser;
  created_at: string;
}

export interface MondayUpdate {
  id: string;
  body: string;
  text_body: string;
  created_at: string;
  updated_at: string;
  creator: MondayUser;
  assets: MondayAsset[];
  replies: MondayUpdate[];
}

// GraphQL query responses
export interface MondayBoardsResponse {
  data: {
    boards: MondayBoard[];
  };
}

export interface MondayItemsResponse {
  data: {
    items_by_column_values?: MondayItem[];
    items?: MondayItem[];
  };
}

export interface MondayCreateBoardResponse {
  data: {
    create_board: MondayBoard;
  };
}

export interface MondayCreateColumnResponse {
  data: {
    create_column: MondayColumn;
  };
}

export interface MondayCreateItemResponse {
  data: {
    create_item: MondayItem;
  };
}

export interface MondayChangeColumnValueResponse {
  data: {
    change_column_value: MondayItem;
  };
}

export interface MondayAddFileToColumnResponse {
  data: {
    add_file_to_column: MondayAsset;
  };
}

export interface MondayCreateUpdateResponse {
  data: {
    create_update: MondayUpdate;
  };
}

export interface MondayComplexityInfo {
  query: number;
  reset_in_x_seconds: number;
}

// Column settings interfaces
export interface StatusColumnSettings {
  labels: {
    [key: string]: string;
  };
  labels_colors: {
    [key: string]: {
      color: string;
      border: string;
    };
  };
}

export interface DropdownColumnSettings {
  labels: {
    [key: number]: string;
  };
}

export interface PeopleColumnSettings {
  notify_users_on_change: boolean;
}

// Field mapping types
export interface FieldMapping {
  clickupField: string;
  clickupFieldType: string;
  mondayColumn: string;
  mondayColumnType: MondayColumnType;
  transformationRule?: (value: any) => any;
}

// Error handling
export interface MondayError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  extensions?: {
    code: string;
  };
}

export interface MondayErrorResponse {
  errors: MondayError[];
  data?: any;
  account_id: number;
}

// GraphQL request/response
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: MondayError[];
  extensions?: {
    complexity?: MondayComplexityInfo;
  };
}
