# API Reference Guide

## ClickUp API Endpoints

### Authentication
```
POST https://api.clickup.com/api/v2/oauth/token
Headers: Content-Type: application/json
Body: {
  client_id, client_secret, code, redirect_uri
}
```

### Get List
```
GET https://api.clickup.com/api/v2/list/{list_id}
Headers: Authorization: {token}
```

### Get Tasks
```
GET https://api.clickup.com/api/v2/list/{list_id}/task
Query params: 
- include_closed=true
- subtasks=true
- include_task_templates=true
```

### Get Task Details
```
GET https://api.clickup.com/api/v2/task/{task_id}
Query params:
- custom_fields=true
- include_subtasks=true
```

### Get Custom Fields
```
GET https://api.clickup.com/api/v2/list/{list_id}/field
```

### Get Comments
```
GET https://api.clickup.com/api/v2/task/{task_id}/comment
```

## Monday.com GraphQL API

### Create Board
```graphql
mutation CreateBoard($name: String!) {
  create_board(board_name: $name, board_kind: public) {
    id
    name
  }
}
```

### Create Column
```graphql
mutation CreateColumn($boardId: Int!, $title: String!, $type: ColumnType!) {
  create_column(board_id: $boardId, title: $title, column_type: $type) {
    id
    title
    type
  }
}
```

### Create Item
```graphql
mutation CreateItem($boardId: Int!, $name: String!, $values: JSON!) {
  create_item(board_id: $boardId, item_name: $name, column_values: $values) {
    id
    name
  }
}
```

### Search Items
```graphql
query SearchItems($boardId: Int!) {
  boards(ids: [$boardId]) {
    items(limit: 500) {
      id
      name
      column_values {
        id
        value
      }
      assets {
        id
        name
        file_size
      }
    }
  }
}
```

### Upload File
```graphql
mutation AddFile($itemId: Int!, $file: File!) {
  add_file_to_column(item_id: $itemId, column_id: "files", file: $file) {
    id
    name
  }
}
```

### Update Column Value
```graphql
mutation UpdateColumnValue($itemId: Int!, $columnId: String!, $value: String!) {
  change_column_value(item_id: $itemId, column_id: $columnId, value: $value) {
    id
  }
}
```

### Create Subitem
```graphql
mutation CreateSubitem($parentItemId: Int!, $itemName: String!, $columnValues: JSON!) {
  create_subitem(parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues) {
    id
    name
  }
}
```

### Create Update (Comment)
```graphql
mutation CreateUpdate($itemId: Int!, $body: String!) {
  create_update(item_id: $itemId, body: $body) {
    id
    body
    created_at
  }
}
```

## Field Type Mappings

| ClickUp Type | Monday Type | Notes |
|-------------|------------|-------|
| text | text | Direct mapping |
| number | numbers | Parse to float |
| date | date | ISO format |
| dropdown | status | Map options |
| labels | tags | Array of tags |
| users | people | User IDs |
| checkbox | checkbox | Boolean |
| url | link | URL validation |
| email | email | Email format |
| phone | phone | Phone format |
| currency | numbers | Remove symbols |
| formula | formula | Custom logic |
| automatic_progress | numbers | Percentage |
| manual_progress | numbers | Percentage |
| emoji | text | Unicode support |

## Rate Limits

### ClickUp API
- Rate Limit: 100 requests per minute
- Burst Limit: 900 requests per 15 minutes
- Headers to check:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Monday.com API
- Complexity Budget: 5,000,000 points per minute
- Query complexity varies by operation
- Headers to check:
  - `X-Complexity-Budget-Remaining`
  - `X-Complexity-Query-Cost`

## Error Codes

### ClickUp Error Responses
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Rate Limited
- 500: Server Error

### Monday.com Error Responses
- `ComplexityException`: Query too complex
- `UserUnauthorizedException`: Invalid token
- `ResourceNotFoundException`: Item/board not found
- `ColumnValueException`: Invalid column value
- `InvalidArgumentException`: Invalid parameters
