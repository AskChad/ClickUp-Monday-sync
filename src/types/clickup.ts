// ClickUp API types

export interface ClickUpOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string;
}

export interface ClickUpWorkspace {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: ClickUpUser[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
  multiple_assignees: boolean;
  features: any;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: {
    id: string;
    name: string;
  };
  task_count: string;
  lists: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  content: string;
  status: ClickUpStatus | null;
  priority: ClickUpPriority | null;
  assignee: ClickUpUser | null;
  task_count: number;
  due_date: string | null;
  start_date: string | null;
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
    name: string;
    access: boolean;
  };
  archived: boolean;
  override_statuses: boolean;
  statuses: ClickUpStatus[];
  permission_level: string;
}

export interface ClickUpTask {
  id: string;
  custom_id: string | null;
  name: string;
  text_content: string;
  description: string;
  status: ClickUpStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  checklists: ClickUpChecklist[];
  tags: ClickUpTag[];
  parent: string | null;
  priority: ClickUpPriority | null;
  due_date: string | null;
  start_date: string | null;
  time_estimate: number | null;
  time_spent: number | null;
  custom_fields: ClickUpCustomField[];
  dependencies: string[];
  linked_tasks: string[];
  list: {
    id: string;
    name: string;
    access: boolean;
  };
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
  };
  url: string;
  attachments: ClickUpAttachment[];
}

export interface ClickUpStatus {
  id?: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: 'drop_down' | 'text' | 'number' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'currency' | 'labels' | 'users';
  type_config: any;
  date_created: string;
  hide_from_guests: boolean;
  value?: any;
  required: boolean;
}

export interface ClickUpAttachment {
  id: string;
  date: string;
  title: string;
  type: number;
  source: number;
  version: number;
  extension: string;
  thumbnail_small: string | null;
  thumbnail_medium: string | null;
  thumbnail_large: string | null;
  url: string;
  parent_id: string;
  size: number;
  user: ClickUpUser;
  deleted: boolean;
  email_data: any | null;
  url_w_query: string;
  url_w_host: string;
  hidden: boolean;
  orientation: string | null;
}

export interface ClickUpComment {
  id: string;
  comment: Array<{
    text: string;
    attributes?: any;
  }>;
  comment_text: string;
  user: ClickUpUser;
  resolved: boolean;
  assignee: ClickUpUser | null;
  assigned_by: ClickUpUser | null;
  reactions: any[];
  date: string;
}

export interface ClickUpChecklist {
  id: string;
  task_id: string;
  name: string;
  date_created: string;
  orderindex: number;
  creator: number;
  resolved: number;
  unresolved: number;
  items: ClickUpChecklistItem[];
}

export interface ClickUpChecklistItem {
  id: string;
  name: string;
  orderindex: number;
  assignee: ClickUpUser | null;
  resolved: boolean;
  parent: string | null;
  date_created: string;
  children: string[];
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator: number;
}

// API Response wrappers
export interface ClickUpListResponse {
  lists: ClickUpList[];
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

export interface ClickUpCustomFieldsResponse {
  fields: ClickUpCustomField[];
}

export interface ClickUpCommentsResponse {
  comments: ClickUpComment[];
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// Error handling
export interface ClickUpError {
  err: string;
  ECODE: string;
}
