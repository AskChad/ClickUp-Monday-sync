import { NextRequest, NextResponse } from 'next/server';
import { getCredentials } from '@/lib/db/supabase';
import { ClickUpAPI } from '@/lib/api/clickup';
import { FieldMapper } from '@/lib/replication/field-mapper';

export async function POST(request: NextRequest) {
  try {
    const { clickupListId } = await request.json();

    if (!clickupListId) {
      return NextResponse.json({ error: 'clickupListId is required' }, { status: 400 });
    }

    const userId = 'temp-user-id'; // TODO: Get from session

    // Get credentials
    const clickupCreds = await getCredentials(userId, 'clickup');

    if (!clickupCreds?.access_token) {
      return NextResponse.json(
        { error: 'ClickUp not connected. Please authenticate first.' },
        { status: 401 }
      );
    }

    // Analyze list
    const clickup = new ClickUpAPI(clickupCreds.access_token);
    const list = await clickup.getList(clickupListId);
    const customFields = await clickup.getCustomFields(clickupListId);
    const tasks = await clickup.getListTasks(clickupListId);

    // Generate field mappings
    const fieldMappings = await FieldMapper.generateFieldMappings(customFields);

    return NextResponse.json({
      list: {
        id: list.id,
        name: list.name,
        taskCount: tasks.length,
      },
      customFields: customFields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required,
      })),
      suggestedMappings: fieldMappings,
      tasksWithAttachments: tasks.filter((t) => t.attachments?.length > 0).length,
    });
  } catch (error: any) {
    console.error('List analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze list', details: error.message },
      { status: 500 }
    );
  }
}
