import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAuthenticatedUser, getUserProjects, getUserPermittedDatabases } from '@/app/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedProjectId = searchParams.get('projectId');
  const unassigned = searchParams.get('unassigned') === 'true';
  const includeOthers = searchParams.get('includeOthers') === 'true';

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let query = `
      SELECT d.*, i.name as instance_name, p.name as project_name 
      FROM list_all_db d
      JOIN instances i ON d.instance_id = i.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by project access
    if (user.role !== 'DBA') {
      if (requestedProjectId) {
        // If searching within a specific project, only show databases user is permitted to see
        const permittedDbIds = await getUserPermittedDatabases(user.id, user.role, requestedProjectId);
        if (permittedDbIds.length === 0) return NextResponse.json([]);
        query += ` AND d.id IN (?)`;
        params.push(permittedDbIds);
      } else {
        // Global list: show databases from ALL projects user has memberships in
        const permittedProjectIds = await getUserProjects(user.id, user.role);
        if (permittedProjectIds.length === 0) return NextResponse.json([]);
        
        // This is a bit more complex since for each project we might have different DB subsets.
        // For simplicity, we'll fetch all permitted DB IDs across all projects first.
        let allPermittedDbIds = [];
        for (const pid of permittedProjectIds) {
          const pDbs = await getUserPermittedDatabases(user.id, user.role, pid);
          allPermittedDbIds = [...allPermittedDbIds, ...pDbs];
        }

        if (allPermittedDbIds.length === 0) return NextResponse.json([]);
        query += ` AND d.id IN (?)`;
        params.push(allPermittedDbIds);
      }
    }

    if (unassigned) {
      query += ` AND d.project_id IS NULL`;
    } else if (requestedProjectId) {
      if (includeOthers) {
        query += ` AND (d.project_id != ? OR d.project_id IS NULL)`;
        params.push(requestedProjectId);
      } else {
        query += ` AND d.project_id = ?`;
        params.push(requestedProjectId);
      }
    }

    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Databases GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch databases' }, { status: 500 });
  }
}

// POST for transferring databases
export async function POST(request) {
  try {
    const { databaseIds, projectId } = await request.json();

    if (!Array.isArray(databaseIds) || databaseIds.length === 0) {
      return NextResponse.json({ error: 'No databases selected' }, { status: 400 });
    }

    // Update the project_id for the selected databases
    await pool.query(
      `UPDATE list_all_db SET project_id = ? WHERE id IN (?)`,
      [projectId || null, databaseIds]
    );

    return NextResponse.json({ success: true, message: 'Databases transferred successfully' });
  } catch (error) {
    console.error('Databases Transfer Error:', error);
    return NextResponse.json({ error: 'Failed to transfer databases' }, { status: 500 });
  }
}
