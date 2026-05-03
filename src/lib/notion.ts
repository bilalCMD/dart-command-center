// src/lib/notion.ts
// Notion API integration — read-only task sync
// Pulls tasks assigned to each user from the Notion tasks database

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// Simple in-memory cache (replace with Redis in production if needed)
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface NotionTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: string;
  due: string | null;
  assignedTo: string | null; // email
}

export async function getTasksForUser(userEmail: string): Promise<NotionTask[]> {
  const allTasks = await getAllTasks();
  return allTasks.filter((t) => t.assignedTo === userEmail);
}

export async function getAllTasks(): Promise<NotionTask[]> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        // Only get tasks that aren't archived
        property: 'Status', // Adjust property name to match your Notion DB
        status: {
          does_not_equal: 'Archived',
        },
      },
      sorts: [{ property: 'Due', direction: 'ascending' }],
      page_size: 100,
    });

    const tasks: NotionTask[] = response.results.map((page: any) => {
      const props = page.properties;

      // IMPORTANT: Subhan — adjust these property names to match
      // the exact property names in your Notion tasks database.
      // Use the Notion API Explorer to inspect your DB schema.
      return {
        id: page.id,
        title: extractTitle(props['Name'] || props['Task'] || props['Title']),
        status: extractSelect(props['Status']),
        priority: extractSelect(props['Priority']),
        project: extractSelect(props['Project'] || props['Client']),
        due: extractDate(props['Due'] || props['Due Date']),
        assignedTo: extractPerson(props['Assigned To'] || props['Assign']),
      };
    });

    // Update cache
    cache = { data: tasks, timestamp: Date.now() };
    return tasks;
  } catch (error) {
    console.error('Notion API error:', error);
    return cache?.data || [];
  }
}

// ── Property extractors ──

function extractTitle(prop: any): string {
  if (!prop) return 'Untitled';
  if (prop.type === 'title') return prop.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
  return 'Untitled';
}

function extractSelect(prop: any): string {
  if (!prop) return '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'status') return prop.status?.name || '';
  return '';
}

function extractDate(prop: any): string | null {
  if (!prop) return null;
  if (prop.type === 'date') return prop.date?.start || null;
  return null;
}

function extractPerson(prop: any): string | null {
  if (!prop) return null;
  if (prop.type === 'people' && prop.people?.length > 0) {
    return prop.people[0]?.person?.email || null;
  }
  return null;
}
