import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function checkProjectAccess(userId, userRole, projectId) {
  if (userRole === 'DBA') return true;

  const [rows] = await pool.query(
    'SELECT 1 FROM project_members WHERE user_id = ? AND project_id = ?',
    [userId, projectId]
  );

  return rows.length > 0;
}

export async function checkDatabaseAccess(userId, userRole, projectId, databaseId) {
  if (userRole === 'DBA') return true;

  // 1. Check if user is a project member and has 'all_databases' access
  const [membership] = await pool.query(
    'SELECT all_databases FROM project_members WHERE user_id = ? AND project_id = ?',
    [userId, projectId]
  );

  if (membership.length === 0) return false;
  if (membership[0].all_databases) return true;

  // 2. Check if user is explicitly granted access to this specific database
  const [dbAccess] = await pool.query(
    'SELECT 1 FROM project_database_members WHERE user_id = ? AND project_id = ? AND database_id = ?',
    [userId, projectId, databaseId]
  );

  return dbAccess.length > 0;
}

export async function getUserPermittedDatabases(userId, userRole, projectId) {
  if (userRole === 'DBA') {
    const [rows] = await pool.query('SELECT id FROM list_all_db WHERE project_id = ?', [projectId]);
    return rows.map(r => r.id);
  }

  const [membership] = await pool.query(
    'SELECT all_databases FROM project_members WHERE user_id = ? AND project_id = ?',
    [userId, projectId]
  );

  if (membership.length === 0) return [];
  
  if (membership[0].all_databases) {
    const [rows] = await pool.query('SELECT id FROM list_all_db WHERE project_id = ?', [projectId]);
    return rows.map(r => r.id);
  }

  const [dbRows] = await pool.query(
    'SELECT database_id FROM project_database_members WHERE user_id = ? AND project_id = ?',
    [userId, projectId]
  );

  return dbRows.map(r => r.database_id);
}

export async function getUserProjects(userId, userRole) {
  if (userRole === 'DBA') {
    const [rows] = await pool.query('SELECT id FROM projects');
    return rows.map(r => r.id);
  }

  const [rows] = await pool.query(
    'SELECT project_id FROM project_members WHERE user_id = ?',
    [userId]
  );

  return rows.map(r => r.project_id);
}
