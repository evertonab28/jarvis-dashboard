import { NextRequest, NextResponse } from 'next/server';

const JARVIS_BASE_URL = process.env.JARVIS_API_URL || 'http://localhost:5555';
const NOCODB_URL = process.env.NOCODB_URL;
const NOCODB_TOKEN = process.env.NOCODB_TOKEN;

// Helper to forward GET requests to the local Jarvis API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const path = (pathArray || []).join('/');
  
  if (!path) {
    return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 });
  }

  try {
    const res = await fetch(`${JARVIS_BASE_URL}/api/${path}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Proxy error for GET ${path}:`, error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to handle POST requests (specifically for creating Runs)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const path = (pathArray || []).join('/');

  if (path === 'runs') {
    try {
      const body = await request.json();
      const { workflow_type } = body;

      if (!NOCODB_URL || !NOCODB_TOKEN) {
        return NextResponse.json({ success: false, error: 'NocoDB credentials not configured in dashboard' }, { status: 500 });
      }

      // Hardcoded table ID for workflow_runs as per initial requirements
      const runsTableId = 'miiorrg0wrrvbzx';
      const nocoUrl = `${NOCODB_URL}/api/v3/data/pqy4tca0bm5w50o/${runsTableId}/records`;

      const response = await fetch(nocoUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            workflow_type: workflow_type || 'sistema_existente',
            status: 'queued',
            current_step: 'Initializing workflow via Dashboard...',
          }
        })
      });

      const data = await response.json();
      return NextResponse.json({ success: response.ok, data });
    } catch (error: any) {
      console.error(`Proxy error for POST ${path}:`, error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}

// Helper to handle PATCH requests (specifically for Tasks)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const path = (pathArray || []).join('/');

  if (path === 'tasks') {
    try {
      const body = await request.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Task ID is required for PATCH' }, { status: 400 });
      }

      if (!NOCODB_URL || !NOCODB_TOKEN) {
        return NextResponse.json({ success: false, error: 'NocoDB credentials not configured in dashboard' }, { status: 500 });
      }

      // Hardcoded table ID for tasks
      const tasksTableId = 'm9i9f568jusmspc';
      const nocoUrl = `${NOCODB_URL}/api/v3/data/pqy4tca0bm5w50o/${tasksTableId}/records`;

      const response = await fetch(nocoUrl, {
        method: 'PATCH',
        headers: {
          'xc-token': NOCODB_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Id: id,
          ...updates
        })
      });

      const data = await response.json();
      return NextResponse.json({ success: response.ok, data });
    } catch (error: any) {
      console.error(`Proxy error for PATCH ${path}:`, error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}
