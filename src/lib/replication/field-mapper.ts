import type {
  ClickUpCustomField,
  ClickUpTask,
} from '@/types/clickup';
import type {
  MondayColumnType,
  FieldMapping,
} from '@/types/monday';

/**
 * Maps ClickUp field types to Monday.com column types
 */
export class FieldMapper {
  /**
   * Automatically map a ClickUp field type to the best Monday column type
   */
  static mapFieldType(clickupFieldType: string): MondayColumnType {
    const typeMap: Record<string, MondayColumnType> = {
      'text': 'text',
      'short_text': 'text',
      'textarea': 'long-text',
      'number': 'numbers',
      'currency': 'numbers',
      'date': 'date',
      'checkbox': 'checkbox',
      'drop_down': 'status',
      'labels': 'tags',
      'email': 'email',
      'phone': 'phone',
      'url': 'link',
      'users': 'people',
      'rating': 'rating',
      'location': 'location',
    };

    return typeMap[clickupFieldType.toLowerCase()] || 'text';
  }

  /**
   * Generate field mappings for a ClickUp list
   */
  static async generateFieldMappings(
    clickupFields: ClickUpCustomField[]
  ): Promise<FieldMapping[]> {
    return clickupFields.map(field => ({
      clickupField: field.name,
      clickupFieldType: field.type,
      mondayColumn: this.sanitizeColumnName(field.name),
      mondayColumnType: this.mapFieldType(field.type),
      transformationRule: this.getTransformationRule(field.type),
    }));
  }

  /**
   * Sanitize column names for Monday.com (remove special chars, limit length)
   */
  static sanitizeColumnName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .substring(0, 255);
  }

  /**
   * Get transformation rule for converting ClickUp values to Monday values
   */
  static getTransformationRule(fieldType: string): ((value: any) => any) | undefined {
    const transformations: Record<string, (value: any) => any> = {
      'drop_down': (value: any) => {
        if (!value) return null;
        // ClickUp dropdown returns selected option name or id
        const optionName = typeof value === 'object' ? value.name : value;
        return { label: optionName };
      },

      'checkbox': (value: any) => {
        // ClickUp checkbox is boolean, Monday expects {checked: "true"/"false"}
        return { checked: value ? 'true' : 'false' };
      },

      'date': (value: any) => {
        if (!value) return null;
        // ClickUp dates are timestamps, Monday expects ISO date strings
        const timestamp = typeof value === 'object' ? value.date : value;
        if (!timestamp) return null;

        const date = new Date(parseInt(timestamp));
        return { date: date.toISOString().split('T')[0] };
      },

      'users': (value: any) => {
        if (!value) return null;
        // ClickUp users array -> Monday people column
        const users = Array.isArray(value) ? value : [value];
        return {
          personsAndTeams: users.map((u: any) => ({
            id: u.id,
            kind: 'person',
          })),
        };
      },

      'labels': (value: any) => {
        if (!value) return null;
        // ClickUp labels -> Monday tags
        const labels = Array.isArray(value) ? value : [value];
        return {
          tag_ids: labels.map((l: any) => l.id || l.name),
        };
      },

      'number': (value: any) => {
        if (value === null || value === undefined) return null;
        return parseFloat(value) || 0;
      },

      'currency': (value: any) => {
        if (!value) return null;
        return parseFloat(value) || 0;
      },

      'email': (value: any) => {
        if (!value) return null;
        return {
          email: value,
          text: value,
        };
      },

      'phone': (value: any) => {
        if (!value) return null;
        return {
          phone: value,
          countryShortName: 'US', // Default to US, can be enhanced
        };
      },

      'url': (value: any) => {
        if (!value) return null;
        return {
          url: value,
          text: value,
        };
      },

      'rating': (value: any) => {
        if (!value) return null;
        return { rating: parseInt(value) || 0 };
      },

      'location': (value: any) => {
        if (!value) return null;
        if (typeof value === 'string') {
          return {
            address: value,
            lat: null,
            lng: null,
          };
        }
        return value;
      },
    };

    return transformations[fieldType.toLowerCase()];
  }

  /**
   * Transform a ClickUp task's custom field values to Monday column values
   */
  static transformCustomFieldValues(
    task: ClickUpTask,
    fieldMappings: FieldMapping[]
  ): Record<string, any> {
    const columnValues: Record<string, any> = {};

    for (const field of task.custom_fields || []) {
      const mapping = fieldMappings.find(m => m.clickupField === field.name);
      if (!mapping) continue;

      const transform = mapping.transformationRule || this.getTransformationRule(field.type);
      const value = transform ? transform(field.value) : field.value;

      if (value !== null && value !== undefined) {
        // Use the Monday column ID from mapping if available
        const columnKey = mapping.mondayColumn;
        columnValues[columnKey] = value;
      }
    }

    return columnValues;
  }

  /**
   * Transform standard ClickUp task fields to Monday item properties
   */
  static transformStandardFields(task: ClickUpTask): {
    name: string;
    columnValues: Record<string, any>;
  } {
    const columnValues: Record<string, any> = {};

    // Map status
    if (task.status) {
      columnValues['status'] = {
        label: task.status.status,
      };
    }

    // Map due date
    if (task.due_date) {
      const dueDate = new Date(parseInt(task.due_date));
      columnValues['due_date'] = {
        date: dueDate.toISOString().split('T')[0],
      };
    }

    // Map assignees
    if (task.assignees && task.assignees.length > 0) {
      columnValues['people'] = {
        personsAndTeams: task.assignees.map(assignee => ({
          id: assignee.id,
          kind: 'person',
        })),
      };
    }

    // Map priority
    if (task.priority) {
      const priorityMap: Record<string, string> = {
        '1': 'Urgent',
        '2': 'High',
        '3': 'Normal',
        '4': 'Low',
      };
      columnValues['priority'] = {
        label: priorityMap[task.priority.id] || 'Normal',
      };
    }

    // Map tags
    if (task.tags && task.tags.length > 0) {
      columnValues['tags'] = {
        tag_ids: task.tags.map(tag => tag.name),
      };
    }

    return {
      name: task.name,
      columnValues,
    };
  }

  /**
   * Create Monday column settings for a ClickUp field
   */
  static createColumnSettings(field: ClickUpCustomField): any {
    const settingsMap: Record<string, (field: ClickUpCustomField) => any> = {
      'drop_down': (field) => {
        if (!field.type_config || !field.type_config.options) {
          return {};
        }

        const labels: Record<string, string> = {};
        const labelsColors: Record<string, { color: string; border: string }> = {};

        field.type_config.options.forEach((option: any, index: number) => {
          const key = index.toString();
          labels[key] = option.name;
          labelsColors[key] = {
            color: option.color || '#0073ea',
            border: option.color || '#0073ea',
          };
        });

        return {
          labels,
          labels_colors: labelsColors,
        };
      },

      'rating': (field) => {
        return {
          max_rating: field.type_config?.max || 5,
        };
      },

      'number': (field) => {
        return {
          precision: field.type_config?.precision || 0,
        };
      },
    };

    const settingsFn = settingsMap[field.type.toLowerCase()];
    return settingsFn ? settingsFn(field) : {};
  }

  /**
   * Validate that a value is compatible with a Monday column type
   */
  static validateValue(value: any, columnType: MondayColumnType): boolean {
    const validators: Record<MondayColumnType, (v: any) => boolean> = {
      'text': (v) => typeof v === 'string',
      'long-text': (v) => typeof v === 'string',
      'numbers': (v) => typeof v === 'number' || !isNaN(parseFloat(v)),
      'status': (v) => v && typeof v.label === 'string',
      'date': (v) => v && typeof v.date === 'string',
      'people': (v) => v && Array.isArray(v.personsAndTeams),
      'checkbox': (v) => v && (v.checked === 'true' || v.checked === 'false'),
      'dropdown': (v) => v && typeof v.labels === 'object',
      'email': (v) => v && typeof v.email === 'string',
      'phone': (v) => v && typeof v.phone === 'string',
      'link': (v) => v && typeof v.url === 'string',
      'file': () => true, // Files are uploaded separately, not validated here
      'tags': (v) => v && Array.isArray(v.tag_ids),
      'rating': (v) => v && typeof v.rating === 'number',
      'location': (v) => v && typeof v.address === 'string',
      'timeline': (v) => v && typeof v.from === 'string' && typeof v.to === 'string',
      'color-picker': (v) => v && typeof v.color === 'string',
      'creation-log': () => true, // Read-only
      'last-updated': () => true, // Read-only
      'auto-number': () => true, // Auto-generated
      'dependency': (v) => v && Array.isArray(v.item_ids),
      'mirror': () => true, // Mirrored from other column
      'connect-boards': (v) => v && Array.isArray(v.item_ids),
      'hour': (v) => v && typeof v.hour === 'number',
    };

    const validator = validators[columnType];
    return validator ? validator(value) : true;
  }
}

/**
 * Helper to create default Monday columns for a new board
 */
export const getDefaultMondayColumns = (): Array<{
  title: string;
  type: MondayColumnType;
}> => {
  return [
    { title: 'Status', type: 'status' },
    { title: 'Owner', type: 'people' },
    { title: 'Due Date', type: 'date' },
    { title: 'Priority', type: 'status' },
    { title: 'Notes', type: 'long-text' },
  ];
};

/**
 * Map ClickUp task description to Monday item update
 */
export const mapDescriptionToUpdate = (description: string): string => {
  if (!description) return '';

  // Convert ClickUp markdown to Monday-compatible markdown
  // Monday supports basic markdown but has some differences
  return description
    .replace(/\[([^\]]+)\]\(clickup:\/\/[^\)]+\)/g, '$1') // Remove ClickUp internal links
    .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '[Image: $1]($2)') // Convert images
    .trim();
};
