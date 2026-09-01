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
  eventType: 'page_view' | 'guide_view' | 'guide_create' | 'guide_edit' | 'guide_publish' | 'guide_delete' | 'user_login',
  details: {
    guideId?: string;
    guideTitle?: string;
    username?: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    const stmt = db.prepare(`
      INSERT INTO telemetry_logs (event_type, guide_id, guide_title, username, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      eventType,
      details.guideId || null,
      details.guideTitle || null,
      details.username || null,
      details.ipAddress || null,
      details.userAgent || null,
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

  return {
    totalViews,
    totalEdits,
    totalLogins,
    topGuides,
    recentLogs
  };
}

// Migration helpers for missing columns on pre-existing database tables
try { db.exec(`ALTER TABLE users ADD COLUMN can_edit_others INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN can_create_guides INTEGER NOT NULL DEFAULT 1;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN custom_links TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN banner_url TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN server TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN co_authors TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN cover_url TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN cover_gradient TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE guides ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}

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

// Update Author Permissions (Admin)
export function updateAuthorPermissionsByAdmin(targetUsername: string, canEditOthers: boolean, canCreateGuides: boolean, isVerified: boolean, adminUsername: string) {
  const cleanTarget = targetUsername.trim();

  const adminRow = db.prepare('SELECT is_admin FROM users WHERE LOWER(username) = LOWER(?)').get(adminUsername) as any;
  if (!adminRow || !adminRow.is_admin) {
    throw new Error('Только Главный Администратор может изменять права и верификацию авторов');
  }

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

  const adminRow = db.prepare('SELECT is_admin FROM users WHERE LOWER(username) = LOWER(?)').get(adminUsername) as any;
  if (!adminRow || !adminRow.is_admin) {
    throw new Error('Только Главный Администратор может сбрасывать пароли авторов');
  }

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

  const adminRow = db.prepare('SELECT is_admin FROM users WHERE LOWER(username) = LOWER(?)').get(adminUsername) as any;
  if (!adminRow || !adminRow.is_admin) {
    throw new Error('Только Главный Администратор может удалять авторов');
  }

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

  return {
    username: user.username,
    isAdmin: Boolean(user.is_admin),
    canEditOthers: Boolean(user.can_edit_others),
    canCreateGuides: Boolean(user.can_create_guides),
    isVerified: Boolean(user.is_verified),
    createdAt: user.created_at
  };
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

export function listAllAuthors() {
  const rows = db.prepare('SELECT username, is_admin, can_edit_others, can_create_guides, is_verified, created_at FROM users ORDER BY created_at DESC').all();
  return rows.map((r: any) => ({
    username: r.username,
    isAdmin: Boolean(r.is_admin),
    canEditOthers: Boolean(r.can_edit_others),
    canCreateGuides: Boolean(r.can_create_guides),
    isVerified: Boolean(r.is_verified),
    createdAt: r.created_at
  }));
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

try {
  const { CREATE_1211_RULES_DATA } = require('../src/data/createRulesData');
  saveServerRules(CREATE_1211_RULES_DATA);
  saveServerRules({ ...CREATE_1211_RULES_DATA, server_id: "Create" });

  const { GALAXY_RULES_DATA } = require('../src/data/galaxyRulesData');
  saveServerRules(GALAXY_RULES_DATA);

  const { GREGTECH_RULES_DATA } = require('../src/data/gregtechRulesData');
  saveServerRules(GREGTECH_RULES_DATA);

  const { HITECH_RULES_DATA } = require('../src/data/hitechRulesData');
  saveServerRules(HITECH_RULES_DATA);

  const { ICEANDFIRE_RULES_DATA } = require('../src/data/iceandfireRulesData');
  saveServerRules(ICEANDFIRE_RULES_DATA);

  const { INDUSTRIAL_RULES_DATA } = require('../src/data/industrialRulesData');
  saveServerRules(INDUSTRIAL_RULES_DATA);

  const { MAGICRPG_RULES_DATA } = require('../src/data/magicrpgRulesData');
  saveServerRules(MAGICRPG_RULES_DATA);

  const { SKYTECH_RULES_DATA } = require('../src/data/skytechRulesData');
  saveServerRules(SKYTECH_RULES_DATA);
} catch (e) {
  console.error('Error seeding server rules:', e);
}
