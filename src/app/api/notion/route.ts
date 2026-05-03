import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

const notionHeaders = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

// Step 1: Get ALL databases (id + name) from the workspace
async function fetchAllDatabases(): Promise<{ id: string; name: string }[]> {
  const databases: { id: string; name: string }[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const body: any = {
      filter: { value: 'database', property: 'object' },
      page_size: 100,
    };
    if (startCursor) body.start_cursor = startCursor;

    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: notionHeaders,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Search failed: ${data.message}`);

    for (const db of data.results) {
      const name =
        db.title?.[0]?.plain_text ||
        db.title?.[0]?.text?.content ||
        'Untitled DB';
      databases.push({ id: db.id, name });
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log(
    '✅ Notion DBs found:',
    databases.map((d) => `${d.name} → ${d.id}`)
  );

  return databases;
}

// Step 2: Fetch all pages from a single database (with pagination)
async function fetchTasksFromDatabase(dbId: string): Promise<any[]> {
  let allResults: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const body: any = {
      sorts: [{ property: 'Due', direction: 'ascending' }],
      page_size: 100,
    };
    if (startCursor) body.start_cursor = startCursor;

    const res = await fetch(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.warn(`Skipping DB ${dbId}: ${data.message}`);
      return [];
    }

    allResults = allResults.concat(data.results);
    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return allResults;
}

// Step 3: Map raw Notion page to a clean task object
function mapPageToTask(page: any) {
  const props = page.properties;
  return {
    id: page.id,
    url: page.url,
    name: props['Task name']?.title?.[0]?.plain_text || 'Untitled',
    status: props['Status']?.status?.name || 'No Status',
    priority: props['Priority']?.select?.name || null,
    due: props['Due']?.date?.start || null,
    tags: props['Tags']?.multi_select?.map((t: any) => t.name) || [],
    assignees:
      props['Assignee']?.people?.map((p: any) => ({
        id: p.id,
        name: p.name || 'Unknown',
        email: p.person?.email?.toLowerCase() || null,
        avatar: p.avatar_url || null,
      })) || [],
    summary: props['Summary']?.rich_text?.[0]?.plain_text || null,
  };
}

// Master: fetch all DBs → fetch tasks → group by database
async function fetchAllTasksGrouped(filterFn: (task: any) => boolean) {
  const databases = await fetchAllDatabases();

  const grouped = await Promise.all(
    databases.map(async (db) => {
      const pages = await fetchTasksFromDatabase(db.id);
      const tasks = pages.map(mapPageToTask).filter(filterFn);
      return {
        databaseId: db.id,
        databaseName: db.name,
        totalTasks: tasks.length,
        tasks,
      };
    })
  );

  // Only return DBs that have at least 1 matching task
  return grouped.filter((db) => db.tasks.length > 0);
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const u = user as any;
    const isAdmin = u.role === 'ADMIN';
    const userEmail = u.email?.toLowerCase();
    const { searchParams } = new URL(req.url);
    const filterEmail = searchParams.get('email')?.toLowerCase();

    // Define filter based on role
    let filterFn: (task: any) => boolean;

    if (isAdmin) {
      if (filterEmail) {
        filterFn = (task) =>
          task.assignees.some((a: any) => a.email === filterEmail);
      } else {
        filterFn = () => true; // admin sees everything
      }
    } else {
      filterFn = (task) =>
        task.assignees.some((a: any) => a.email === userEmail);
    }

    const databases = await fetchAllTasksGrouped(filterFn);

    // Total tasks across all DBs
    const total = databases.reduce((sum, db) => sum + db.totalTasks, 0);

    // These admins also have tasks assigned to them in Notion
    const ADMIN_EMAILS_WITH_TASKS = [
      'bilal.altaf@dartmarketing.io',
      'umair@dartmarketing.io',
      'aizaz@dartmarketing.io',
    ];

    let teamMembers = null;
    if (isAdmin) {
      // Fetch both MEMBERs + specific admins who also have tasks
      teamMembers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: 'MEMBER' },
            { email: { in: ADMIN_EMAILS_WITH_TASKS } },
          ],
        },
        select: { id: true, name: true, email: true, avatar: true },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({
      total,
      databases,
      teamMembers,
    });
  } catch (err: any) {
    console.error('Notion error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}