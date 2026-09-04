import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { Guide, AuthorProfile } from '../src/types/guide';

const envDbPath = process.env.DATABASE_PATH;
const dbPath = envDbPath 
  ? path.resolve(envDbPath) 
  : path.resolve(process.cwd(), '..', 'wiki.dark-core.sqlite');

export const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    can_edit_others INTEGER NOT NULL DEFAULT 0,
    can_create_guides INTEGER NOT NULL DEFAULT 1,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guides (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    author TEXT NOT NULL,
    co_authors TEXT,
    difficulty TEXT NOT NULL,
    summary TEXT,
    updated_at TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 0,
    server TEXT,
    cover_url TEXT,
    cover_gradient TEXT,
    blocks TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    server TEXT,
    social_vk TEXT,
    social_tg TEXT,
    social_ds TEXT,
    custom_links TEXT,
    badges TEXT,
    pinned_guide_id TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    guide_id TEXT,
    guide_title TEXT,
    username TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS server_rules (
    server_id TEXT PRIMARY KEY,
    server_name TEXT NOT NULL,
    description TEXT,
    sections TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export function getServerRules(serverId: string) {
  const row = db.prepare('SELECT * FROM server_rules WHERE server_id = ?').get(serverId) as any;
  if (!row) return null;
  return {
    server_id: row.server_id,
    server_name: row.server_name,
    description: row.description || '',
    sections: JSON.parse(row.sections || '[]'),
    updated_at: row.updated_at
  };
}

export function saveServerRules(rulesData: { server_id: string; server_name: string; description?: string; sections: any[] }) {
  const stmt = db.prepare(`
    INSERT INTO server_rules (server_id, server_name, description, sections, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(server_id) DO UPDATE SET
      server_name = excluded.server_name,
      description = excluded.description,
      sections = excluded.sections,
      updated_at = excluded.updated_at
  `);

  const updatedAt = new Date().toISOString().split('T')[0];
  stmt.run(
    rulesData.server_id,
    rulesData.server_name,
    rulesData.description || '',
    JSON.stringify(rulesData.sections || []),
    updatedAt
  );

  return getServerRules(rulesData.server_id);
}

export function recordTelemetryEvent(
  eventType: string,
  details: {
    guideId?: string;
    guideTitle?: string;
    username?: string;
    ipAddress?: string;
    userAgent?: string;
    extraData?: string;
    durationSeconds?: number;
  }
) {
  try {
    const stmt = db.prepare(`
      INSERT INTO telemetry_logs (event_type, guide_id, guide_title, username, ip_address, user_agent, extra_data, duration_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      eventType,
      details.guideId || null,
      details.guideTitle || null,
      details.username || null,
      details.ipAddress || null,
      details.userAgent || null,
      details.extraData || null,
      details.durationSeconds || null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Ошибка записи телеметрии:', err);
  }
}

export function getTelemetryStats() {
  const totalViews = (db.prepare(`SELECT COUNT(*) as count FROM telemetry_logs WHERE event_type IN ('guide_view', 'page_view')`).get() as any)?.count || 0;
  const totalEdits = (db.prepare(`SELECT COUNT(*) as count FROM telemetry_logs WHERE event_type IN ('guide_edit', 'guide_create', 'guide_publish')`).get() as any)?.count || 0;
  const totalLogins = (db.prepare(`SELECT COUNT(*) as count FROM telemetry_logs WHERE event_type = 'user_login'`).get() as any)?.count || 0;
  const totalSearches = (db.prepare(`SELECT COUNT(*) as count FROM telemetry_logs WHERE event_type = 'search_query'`).get() as any)?.count || 0;
  const totalBookmarks = (db.prepare(`SELECT COUNT(*) as count FROM telemetry_logs WHERE event_type = 'bookmark_toggle'`).get() as any)?.count || 0;
  
  const recentLogs = db.prepare(`
    SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 50
  `).all();

  const topGuides = db.prepare(`
    SELECT guide_id, guide_title, COUNT(*) as views 
    FROM telemetry_logs 
    WHERE event_type = 'guide_view' AND guide_id IS NOT NULL 
    GROUP BY guide_id 
    ORDER BY views DESC LIMIT 5
  `).all();

  const topSearches = db.prepare(`
    SELECT extra_data as query, COUNT(*) as count
    FROM telemetry_logs
    WHERE event_type = 'search_query' AND extra_data IS NOT NULL AND extra_data != ''
    GROUP BY extra_data
    ORDER BY count DESC LIMIT 5
  `).all();

  const categoryClicks = db.prepare(`
    SELECT extra_data as category, COUNT(*) as count
    FROM telemetry_logs
    WHERE event_type = 'category_select' AND extra_data IS NOT NULL
    GROUP BY extra_data
    ORDER BY count DESC LIMIT 5
  `).all();

  return {
    totalViews,
    totalEdits,
    totalLogins,
    totalSearches,
    totalBookmarks,
    topGuides,
    topSearches,
    categoryClicks,
    recentLogs
  };
}

try { db.exec(`ALTER TABLE users ADD COLUMN can_edit_others INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN can_create_guides INTEGER NOT NULL DEFAULT 1;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'author';`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN custom_permissions TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN assigned_servers TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN custom_links TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN banner_url TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN status TEXT DEFAULT 'approved';`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN rejection_reason TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN co_authors TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN cover_url TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN cover_gradient TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE telemetry_logs ADD COLUMN extra_data TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE telemetry_logs ADD COLUMN duration_seconds INTEGER;`); } catch (e) {}

// Password hashing helper (SHA-256 with salt from environment)
export function hashPassword(password: string): string {
  const salt = process.env.SECRET_SALT;
  if (!salt) {
    throw new Error('КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: В файле .env не задана переменная SECRET_SALT!');
  }
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Admin-only Author Registration Helper
export function registerAuthorByAdmin(username: string, password: string, adminUsername: string) {
  const cleanUsername = username.trim();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Никнейм должен состоять минимум из 3 символов');
  }
  if (!password || password.length < 4) {
    throw new Error('Пароль должен состоять минимум из 4 символов');
  }

  // Check if caller is admin
  const adminRow = db.prepare('SELECT is_admin FROM users WHERE LOWER(username) = LOWER(?)').get(adminUsername) as any;
  if (!adminRow || !adminRow.is_admin) {
    throw new Error('Только Главный Администратор может регистрировать новых авторов');
  }

  const existing = db.prepare('SELECT username FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
  if (existing) {
    throw new Error('Автор с таким никнеймом уже зарегистрирован');
  }

  const pwdHash = hashPassword(password);
  const createdAt = new Date().toISOString().split('T')[0];

  const stmt = db.prepare('INSERT INTO users (username, password_hash, is_admin, can_edit_others, can_create_guides, is_verified, created_at) VALUES (?, ?, 0, 0, 1, 0, ?)');
  stmt.run(cleanUsername, pwdHash, createdAt);

  // Initialize default profile for new author
  saveAuthorProfile({
    username: cleanUsername,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
    bio: '',
    server: 'MagicRPG',
    badges: ['Автор Гайдов'],
    updatedAt: createdAt
  });

  return { username: cleanUsername, createdAt };
}

const ROLE_PRIORITIES: Record<string, number> = {
  super_admin: 0,
  admin: 10,
  editor: 20,
  author: 30,
  helper: 40,
  guest: 999
};

function getPriorityForRole(role: string | undefined, isAdmin?: boolean): number {
  if (!role) return isAdmin ? 0 : 999;
  return ROLE_PRIORITIES[role] ?? 999;
}

function checkHierarchyPermission(callerUsername: string, targetUsername: string, actionName: string): { callerRole: string; targetRole: string } {
  const cleanCaller = callerUsername.trim();
  const cleanTarget = targetUsername.trim();

  const callerRow = db.prepare('SELECT is_admin, role FROM users WHERE LOWER(username) = LOWER(?)').get(cleanCaller) as any;
  if (!callerRow) {
    throw new Error('Пользователь, выполняющий действие, не найден в системе');
  }

  const callerRole = callerRow.role || (callerRow.is_admin ? 'super_admin' : 'author');
  const targetRow = db.prepare('SELECT is_admin, role FROM users WHERE LOWER(username) = LOWER(?)').get(cleanTarget) as any;
  
  if (!targetRow) {
    throw new Error('Целевой пользователь не найден в системе');
  }

  const targetRole = targetRow.role || (targetRow.is_admin ? 'super_admin' : 'author');

  if (callerRole === 'super_admin') {
    return { callerRole, targetRole };
  }

  const callerPriority = getPriorityForRole(callerRole, Boolean(callerRow.is_admin));
  const targetPriority = getPriorityForRole(targetRole, Boolean(targetRow.is_admin));

  if (callerPriority >= targetPriority) {
    throw new Error(`Отказано в доступе: Вы не можете ${actionName} пользователя с равной или более высокой ролью (${targetRole})`);
  }

  return { callerRole, targetRole };
}

// Update Author Permissions (Admin)
export function updateAuthorPermissionsByAdmin(targetUsername: string, canEditOthers: boolean, canCreateGuides: boolean, isVerified: boolean, adminUsername: string) {
  const cleanTarget = targetUsername.trim();
  checkHierarchyPermission(adminUsername, cleanTarget, 'редактировать права');

  const stmt = db.prepare('UPDATE users SET can_edit_others = ?, can_create_guides = ?, is_verified = ? WHERE LOWER(username) = LOWER(?)');
  stmt.run(canEditOthers ? 1 : 0, canCreateGuides ? 1 : 0, isVerified ? 1 : 0, cleanTarget);

  return { success: true, message: `Права и верификация автора ${cleanTarget} успешно обновлены!` };
}

// Admin-only Reset Author Password Helper
export function resetAuthorPasswordByAdmin(targetUsername: string, newPassword: string, adminUsername: string) {
  const cleanTarget = targetUsername.trim();
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Новый пароль должен содержать минимум 4 символа');
  }

  checkHierarchyPermission(adminUsername, cleanTarget, 'сбрасывать пароль');

  const pwdHash = hashPassword(newPassword);
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE LOWER(username) = LOWER(?)');
  const res = stmt.run(pwdHash, cleanTarget);

  if (res.changes === 0) {
    throw new Error('Автор не найден');
  }

  return { success: true, message: `Пароль автора ${cleanTarget} успешно изменен!` };
}

// Admin-only Delete Author Helper
export function deleteAuthorByAdmin(targetUsername: string, adminUsername: string) {
  const cleanTarget = targetUsername.trim();

  // Prevent deleting Super Admin
  if (cleanTarget.toLowerCase() === 'darkimusss') {
    throw new Error('Нельзя удалить Главного Администратора DarkimuSSS');
  }

  checkHierarchyPermission(adminUsername, cleanTarget, 'удалять');

  db.prepare('DELETE FROM users WHERE LOWER(username) = LOWER(?)').run(cleanTarget);
  db.prepare('DELETE FROM profiles WHERE LOWER(username) = LOWER(?)').run(cleanTarget);

  return { success: true, message: `Автор ${cleanTarget} успешно удален!` };
}

// Change User Password Helper (Author self-service)
export function changeUserPassword(username: string, oldPassword: string, newPassword: string) {
  const cleanUsername = username.trim();
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Новый пароль должен содержать минимум 4 символа');
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;
  if (!user) {
    throw new Error('Пользователь не найден');
  }

  const oldPwdHash = hashPassword(oldPassword);
  if (user.password_hash !== oldPwdHash) {
    throw new Error('Неверный старый пароль');
  }

  const newPwdHash = hashPassword(newPassword);
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE LOWER(username) = LOWER(?)');
  stmt.run(newPwdHash, cleanUsername);

  return { success: true, message: 'Пароль успешно обновлен!' };
}

export function loginUser(username: string, password: string) {
  const cleanUsername = username.trim();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;
  if (!user) {
    throw new Error('Неверный никнейм или пароль');
  }

  const pwdHash = hashPassword(password);
  if (user.password_hash !== pwdHash) {
    throw new Error('Неверный никнейм или пароль');
  }

  let customPerms = [];
  try {
    if (user.custom_permissions) customPerms = JSON.parse(user.custom_permissions);
  } catch (e) {}

  let assignedSrvs = [];
  try {
    if (user.assigned_servers) assignedSrvs = JSON.parse(user.assigned_servers);
  } catch (e) {}

  const role = user.role || (user.is_admin ? 'super_admin' : 'author');

  return {
    username: user.username,
    isAdmin: Boolean(user.is_admin) || role === 'super_admin' || role === 'admin',
    canEditOthers: Boolean(user.can_edit_others),
    canCreateGuides: Boolean(user.can_create_guides),
    isVerified: Boolean(user.is_verified),
    role: role,
    customPermissions: customPerms,
    assignedServers: assignedSrvs,
    createdAt: user.created_at
  };
}

export function getAuthorUserByUsername(username: string) {
  const cleanUsername = username.trim();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;
  if (!user) return null;

  let customPerms = [];
  try {
    if (user.custom_permissions) customPerms = JSON.parse(user.custom_permissions);
  } catch (e) {}

  let assignedSrvs = [];
  try {
    if (user.assigned_servers) assignedSrvs = JSON.parse(user.assigned_servers);
  } catch (e) {}

  const role = user.role || (user.is_admin ? 'super_admin' : 'author');

  return {
    username: user.username,
    isAdmin: Boolean(user.is_admin) || role === 'super_admin' || role === 'admin',
    canEditOthers: Boolean(user.can_edit_others),
    canCreateGuides: Boolean(user.can_create_guides),
    isVerified: Boolean(user.is_verified),
    role: role,
    customPermissions: customPerms,
    assignedServers: assignedSrvs,
    createdAt: user.created_at
  };
}

// Cache & Sync for https://cubixworld.net/api/team
let teamApiCache: { timestamp: number; data: any } | null = null;

export async function fetchCubixTeamData() {
  const now = Date.now();
  if (teamApiCache && now - teamApiCache.timestamp < 5 * 60 * 1000) { // 5 minutes cache
    return teamApiCache.data;
  }

  try {
    const fetch = (await import('node-fetch')).default as any;
    const res = await fetch('https://cubixworld.net/api/team', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    if (res.ok) {
      const data = await res.json();
      teamApiCache = { timestamp: now, data };
      return data;
    }
  } catch (err) {
    console.error('Ошибка обращения к https://cubixworld.net/api/team:', err);
  }
  return teamApiCache?.data || null;
}

export async function syncAuthorWithCubixTeam(cleanUsername: string) {
  const teamData = await fetchCubixTeamData();
  if (!teamData || !teamData.team) return;

  const foundRoles: { serverName: string; groupName: string }[] = [];
  const seniorAdminServers: string[] = [];

  // Iterate over all servers in CubixWorld team API
  Object.values(teamData.team).forEach((srvObj: any) => {
    const rawSrvName = srvObj.server_name || '';
    // Normalize server name e.g. "HiTech #1" -> "HiTech"
    const normalizedServer = rawSrvName.split('#')[0].trim();

    if (srvObj.team) {
      Object.values(srvObj.team).forEach((member: any) => {
        if (member.name && member.name.toLowerCase() === cleanUsername.toLowerCase()) {
          foundRoles.push({
            serverName: rawSrvName,
            groupName: member.group_name
          });

          // Check if "Старший администратор"
          if (member.group_name && member.group_name.toLowerCase().includes('старший администратор')) {
            if (!seniorAdminServers.includes(normalizedServer)) {
              seniorAdminServers.push(normalizedServer);
            }
          }
        }
      });
    }
  });

  // If user is Senior Admin on one or multiple servers -> Auto-assign those servers in DB
  if (seniorAdminServers.length > 0) {
    const user = db.prepare('SELECT assigned_servers FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;
    if (user) {
      let existingAssigned: string[] = [];
      try {
        if (user.assigned_servers) existingAssigned = JSON.parse(user.assigned_servers);
      } catch (e) {}

      const mergedServers = Array.from(new Set([...existingAssigned, ...seniorAdminServers]));
      db.prepare('UPDATE users SET assigned_servers = ? WHERE LOWER(username) = LOWER(?)').run(JSON.stringify(mergedServers), cleanUsername);
    }
  }

  return { foundRoles, seniorAdminServers };
}

export function upsertCubixAuthor(cleanUsername: string, accountInfo?: any) {
  let user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;

  const badges = ['CubixWorld Игрок'];
  if (accountInfo?.rank) {
    badges.unshift(accountInfo.rank);
  }

  const officialAvatarUrl = `https://cubixworld.net/api/account.load.avatar?login=${encodeURIComponent(cleanUsername)}`;

  if (!user) {
    // Automatically create author account for valid CubixWorld user
    const pwdHash = hashPassword(`cubix_tcp_${Date.now()}_${Math.random()}`);
    const createdAt = new Date().toISOString().split('T')[0];

    const stmt = db.prepare('INSERT INTO users (username, password_hash, is_admin, can_edit_others, can_create_guides, is_verified, created_at) VALUES (?, ?, 0, 0, 1, 1, ?)');
    stmt.run(cleanUsername, pwdHash, createdAt);

    saveAuthorProfile({
      username: cleanUsername,
      avatarUrl: officialAvatarUrl,
      bio: '',
      server: accountInfo?.groups?.[0]?.server_main_name || 'HiTech',
      badges: badges,
      updatedAt: createdAt
    });

    user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as any;
  } else {
    // Update avatar URL for existing CubixWorld user
    const existingProfile = getAuthorProfile(cleanUsername);
    if (existingProfile) {
      const isDefaultBio = existingProfile.bio === 'Игрок и автор руководств проекта CubixWorld.' || existingProfile.bio === 'Автор руководств на серверах CubixWorld.';
      saveAuthorProfile({
        ...existingProfile,
        avatarUrl: officialAvatarUrl,
        bio: isDefaultBio ? '' : existingProfile.bio,
        badges: Array.from(new Set([...badges, ...(existingProfile.badges || [])]))
      });
    }
  }

  // Trigger background sync with CubixWorld Team API
  syncAuthorWithCubixTeam(cleanUsername).catch(err => console.error('Team sync error:', err));

  return {
    username: user.username,
    isAdmin: Boolean(user.is_admin),
    canEditOthers: Boolean(user.can_edit_others),
    canCreateGuides: Boolean(user.can_create_guides),
    isVerified: Boolean(user.is_verified),
    createdAt: user.created_at,
    accountInfo
  };
}

export function updateAuthorRoleByAdmin(
  targetUsername: string,
  role: string,
  customPermissions: string[] | null,
  assignedServers: string[] | null,
  adminUsername: string
) {
  const cleanTarget = targetUsername.trim();
  const { callerRole } = checkHierarchyPermission(adminUsername, cleanTarget, 'изменять роль');

  // Verify that caller cannot assign a role equal to or higher than caller's own role (unless super_admin)
  if (callerRole !== 'super_admin') {
    const callerPriority = getPriorityForRole(callerRole);
    const newRolePriority = getPriorityForRole(role);
    if (callerPriority >= newRolePriority) {
      throw new Error(`Отказано в доступе: Вы не можете назначить роль (${role}), равную или превышающую вашу собственную.`);
    }
  }

  const customPermsJson = customPermissions && customPermissions.length > 0 ? JSON.stringify(customPermissions) : null;
  const assignedServersJson = assignedServers && assignedServers.length > 0 ? JSON.stringify(assignedServers) : null;
  const isAdminFlag = role === 'super_admin' || role === 'admin' ? 1 : 0;
  
  const stmt = db.prepare('UPDATE users SET role = ?, custom_permissions = ?, assigned_servers = ?, is_admin = ? WHERE LOWER(username) = LOWER(?)');
  stmt.run(role, customPermsJson, assignedServersJson, isAdminFlag, cleanTarget);

  return { success: true, message: `Роль, закрепленные сервера и права автора ${cleanTarget} успешно обновлены!` };
}

export function listAllAuthors() {
  const rows = db.prepare('SELECT username, is_admin, can_edit_others, can_create_guides, is_verified, role, custom_permissions, assigned_servers, created_at FROM users ORDER BY created_at DESC').all();
  return rows.map((r: any) => {
    let customPerms = [];
    try {
      if (r.custom_permissions) customPerms = JSON.parse(r.custom_permissions);
    } catch (e) {}

    let assignedSrvs = [];
    try {
      if (r.assigned_servers) assignedSrvs = JSON.parse(r.assigned_servers);
    } catch (e) {}

    const role = r.role || (r.is_admin ? 'super_admin' : 'author');

    return {
      username: r.username,
      isAdmin: Boolean(r.is_admin) || role === 'super_admin' || role === 'admin',
      canEditOthers: Boolean(r.can_edit_others),
      canCreateGuides: Boolean(r.can_create_guides),
      isVerified: Boolean(r.is_verified),
      role: role,
      customPermissions: customPerms,
      assignedServers: assignedSrvs,
      createdAt: r.created_at
    };
  });
}

// Seed Super Admin with username and password strictly from environment
const superAdminUsername = (process.env.ADMIN_USERNAME || 'DarkimuSSS').trim();
const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE LOWER(username) = LOWER(?)').get(superAdminUsername) as { count: number };
if (adminCount.count === 0) {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminPassword) {
    try {
      const pwdHash = hashPassword(adminPassword);
      const createdAt = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO users (username, password_hash, is_admin, can_edit_others, can_create_guides, is_verified, created_at) VALUES (?, ?, 1, 1, 1, 1, ?)').run(superAdminUsername, pwdHash, createdAt);
    } catch (e) {
      console.error('Ошибка создания аккаунта суперадмина:', e);
    }
  } else {
    console.warn('Внимание: Переменная ADMIN_SEED_PASSWORD не задана в .env. Первоначальный аккаунт администратора не создан.');
  }
} else {
  // Ensure Super Admin has all permissions and verification
  db.prepare('UPDATE users SET is_admin = 1, can_edit_others = 1, can_create_guides = 1, is_verified = 1 WHERE LOWER(username) = LOWER(?)').run(superAdminUsername);
}

// Helper to get or create profile
export function getAuthorProfile(username: string): AuthorProfile {
  const userRow = db.prepare('SELECT is_verified FROM users WHERE LOWER(username) = LOWER(?)').get(username) as any;
  const isVerified = userRow ? Boolean(userRow.is_verified) : (username.toLowerCase() === 'darkimusss');

  const row = db.prepare('SELECT * FROM profiles WHERE LOWER(username) = LOWER(?)').get(username) as any;
  if (row) {
    let customLinks = [];
    try {
      if (row.custom_links) customLinks = JSON.parse(row.custom_links);
    } catch (e) {}

    return {
      username: row.username,
      avatarUrl: row.avatar_url || '',
      bannerUrl: row.banner_url || '',
      bio: row.bio || '',
      server: row.server || '',
      socialVk: row.social_vk || '',
      socialTg: row.social_tg || '',
      socialDs: row.social_ds || '',
      customLinks: customLinks,
      badges: JSON.parse(row.badges || '[]'),
      pinnedGuideId: row.pinned_guide_id || '',
      updatedAt: row.updated_at || ''
    };
  }

  // Default fallback profile
  return {
    username,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    bannerUrl: '',
    bio: `Автор руководств и сборщиков на серверах CubixWorld.`,
    server: 'MagicRPG',
    socialVk: '',
    socialTg: '',
    socialDs: '',
    customLinks: [
      { id: 'l1', label: 'Telegram', url: 'https://t.me/darkimusss' }
    ],
    badges: ['Автор Гайдов'],
    pinnedGuideId: '',
    updatedAt: new Date().toISOString().split('T')[0]
  };
}

export function saveAuthorProfile(profile: AuthorProfile): AuthorProfile {
  const stmt = db.prepare(`
    INSERT INTO profiles (username, avatar_url, banner_url, bio, server, social_vk, social_tg, social_ds, custom_links, badges, pinned_guide_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      avatar_url=excluded.avatar_url,
      banner_url=excluded.banner_url,
      bio=excluded.bio,
      server=excluded.server,
      social_vk=excluded.social_vk,
      social_tg=excluded.social_tg,
      social_ds=excluded.social_ds,
      custom_links=excluded.custom_links,
      badges=excluded.badges,
      pinned_guide_id=excluded.pinned_guide_id,
      updated_at=excluded.updated_at
  `);

  stmt.run(
    profile.username,
    profile.avatarUrl || '',
    profile.bannerUrl || '',
    profile.bio || '',
    profile.server || '',
    profile.socialVk || '',
    profile.socialTg || '',
    profile.socialDs || '',
    JSON.stringify(profile.customLinks || []),
    JSON.stringify(profile.badges || []),
    profile.pinnedGuideId || '',
    profile.updatedAt || new Date().toISOString().split('T')[0]
  );

  return getAuthorProfile(profile.username);
}

// Seed default DarkimuSSS profile if database profiles empty
const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
if (profileCount.count === 0) {
  saveAuthorProfile({
    username: 'DarkimuSSS',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DarkimuSSS',
    bannerUrl: '',
    bio: 'Главный Администратор базы знаний CubixGuide. Создаю схемы алтарей драконов, гайды по Магия RPG и Автоматизации!',
    server: 'MagicRPG',
    socialVk: '',
    socialTg: '',
    socialDs: '',
    customLinks: [
      { id: 'l1', label: 'Telegram', url: 'https://t.me/darkimusss' }
    ],
    badges: ['👑 Главный Админ', '🐉 Мастер Драконов', '⚡ Эксперт Сборок'],
    pinnedGuideId: 'guide_dragon_100',
    updatedAt: new Date().toISOString().split('T')[0]
  });
}

// Initial One-Time Seed from guides_export.json ONLY if guides table is completely empty
const guideCount = db.prepare('SELECT COUNT(*) as count FROM guides').get() as { count: number };
if (guideCount.count === 0) {
  try {
    const exportPath = path.resolve(process.cwd(), 'guides_export.json');
    if (fs.existsSync(exportPath)) {
      const raw = fs.readFileSync(exportPath, 'utf-8');
      const items = JSON.parse(raw);
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO guides (id, title, category, author, co_authors, difficulty, summary, updated_at, published, is_visible, server, cover_url, cover_gradient, blocks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const g of items) {
        const isPub = g.published !== undefined ? g.published : 1;
        const isVis = g.is_visible !== undefined ? g.is_visible : (isPub ? 1 : 0);
        stmt.run(
          g.id,
          g.title,
          g.category,
          g.author,
          g.co_authors || '[]',
          g.difficulty,
          g.summary || '',
          g.updated_at || new Date().toISOString().split('T')[0],
          isPub,
          isVis,
          g.server || '',
          g.cover_url || '',
          g.cover_gradient || '',
          g.blocks || '[]'
        );
      }
    }
  } catch (e) {
    console.error('Error seeding initial guides:', e);
  }
}

// Seed default OneBlock & Create rules into server_rules table if empty
const rulesCount = db.prepare('SELECT COUNT(*) as count FROM server_rules WHERE server_id = ?').get('OneBlock') as { count: number };
if (rulesCount.count === 0) {
  try {
    const { ONEBLOCK_RULES_DATA } = require('../src/data/serverRulesData');
    saveServerRules(ONEBLOCK_RULES_DATA);
  } catch (e) {
    console.error('Error seeding initial server rules:', e);
  }
}

const rulesModules = [
  { name: 'CREATE_1211_RULES_DATA', path: '../src/data/createRulesData', extraId: 'Create' },
  { name: 'GALAXY_RULES_DATA', path: '../src/data/galaxyRulesData' },
  { name: 'GREGTECH_RULES_DATA', path: '../src/data/gregtechRulesData' },
  { name: 'HITECH_RULES_DATA', path: '../src/data/hitechRulesData' },
  { name: 'ICEANDFIRE_RULES_DATA', path: '../src/data/iceandfireRulesData', extraId: 'IceAndFire' },
  { name: 'INDUSTRIAL_RULES_DATA', path: '../src/data/industrialRulesData' },
  { name: 'MAGICRPG_RULES_DATA', path: '../src/data/magicrpgRulesData' },
  { name: 'SKYTECH_RULES_DATA', path: '../src/data/skytechRulesData' },
  { name: 'TECHNOMAGIC_RULES_DATA', path: '../src/data/technomagicRulesData' },
  { name: 'PIXELMON_1211_RULES_DATA', path: '../src/data/pixelmon1211RulesData' },
  { name: 'PIXELMON_1165_RULES_DATA', path: '../src/data/pixelmon1165RulesData' },
  { name: 'OCEANBLOCK_1165_RULES_DATA', path: '../src/data/oceanblock1165RulesData' },
  { name: 'COBBLEMON_1211_RULES_DATA', path: '../src/data/cobblemon1211RulesData' }
];

for (const mod of rulesModules) {
  try {
    const loaded = require(mod.path);
    const data = loaded[mod.name];
    if (data) {
      saveServerRules(data);
      if (mod.extraId) {
        saveServerRules({ ...data, server_id: mod.extraId });
      }
    }
  } catch (e) {
    console.error(`Failed to load/seed server rules module [${mod.name}]:`, e);
  }
}
