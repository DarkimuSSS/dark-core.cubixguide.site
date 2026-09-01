import express from 'express';
import cors from 'cors';
import { db, getAuthorProfile, saveAuthorProfile, registerAuthorByAdmin, loginUser, listAllAuthors, changeUserPassword, resetAuthorPasswordByAdmin, deleteAuthorByAdmin, updateAuthorPermissionsByAdmin, recordTelemetryEvent, getTelemetryStats, upsertCubixAuthor, getServerRules, saveServerRules } from './db';
import { authenticateViaCubixTcp } from './cubixAuth';
import type { Guide, GuideMeta, GuideBlock, AuthorProfile } from '../src/types/guide';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DEFAULT_CUBIX_SERVERS = [
  "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
  "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", "UltraSky", 
  "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
  "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", "TechnomagicTest", 
  "SkyTech", "MagicalTech"
];

// Helper to format DB row to Guide object
function formatGuideRow(row: any): Guide {
  let coAuthors: string[] = [];
  try {
    if (row.co_authors) {
      coAuthors = JSON.parse(row.co_authors);
    }
  } catch (e) {
    if (typeof row.co_authors === 'string') {
      coAuthors = row.co_authors.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  const published = Boolean(row.published);
  const rawVisible = row.is_visible !== undefined ? Boolean(row.is_visible) : false;
  // По условию: если не опубликован (published === false), то автоматически НЕ виден обычным пользователям
  const isVisible = published ? rawVisible : false;

  return {
    meta: {
      id: row.id,
      title: row.title,
      category: row.category,
      author: row.author,
      coAuthors: coAuthors,
      difficulty: row.difficulty,
      summary: row.summary || '',
      updatedAt: row.updated_at,
      published: published,
      isVisible: isVisible,
      server: row.server || undefined,
      coverUrl: row.cover_url || undefined,
      coverGradient: row.cover_gradient || undefined
    },
    blocks: JSON.parse(row.blocks || '[]')
  };
}

// REST API Endpoints

// 0. Live CubixWorld Servers Proxy Endpoint
app.get('/api/servers', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('https://online.cubix.world/api/metrics/server-list', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Cubix metrics API returned status ${response.status}`);
    }

    const data: any = await response.json();
    const serverMap = new Map<string, string>();

    if (Array.isArray(data)) {
      data.forEach((srv: any) => {
        if (srv.name) {
          const cleanName = String(srv.name).trim();
          serverMap.set(cleanName.toLowerCase(), cleanName);
        }
      });
    }

    DEFAULT_CUBIX_SERVERS.forEach(srv => {
      if (!serverMap.has(srv.toLowerCase())) {
        serverMap.set(srv.toLowerCase(), srv);
      }
    });

    const uniqueServers = Array.from(serverMap.values());
    res.json(uniqueServers);
  } catch (err: any) {
    res.json(DEFAULT_CUBIX_SERVERS);
  }
});

// AUTHENTICATION ENDPOINTS

// Login Author (Local SQLite)
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните никнейм и пароль' });
    }
    const user = loginUser(username, password);
    res.json(user);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// CubixWorld Native TCP Authentication Endpoint
app.post('/api/auth/cubix-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Укажите никнейм и пароль CubixWorld' });
    }

    const authResult = await authenticateViaCubixTcp(username, password);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error || 'Неверный никнейм или пароль CubixWorld' });
    }

    // User authenticated successfully via CubixWorld TCP -> Upsert author profile with accountInfo
    const authorUser = upsertCubixAuthor(authResult.username || username, authResult.accountInfo);
    res.json(authorUser);
  } catch (err: any) {
    res.status(500).json({ error: `Ошибка авторизации CubixWorld: ${err.message}` });
  }
});

// Author Self-Service Password Change Endpoint
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Укажите никнейм, текущий пароль и новый пароль' });
    }
    const result = changeUserPassword(username, oldPassword, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN-ONLY AUTHOR & PERMISSIONS MANAGEMENT ENDPOINTS

// Register New Author (Only Admin can do this manually)
app.post('/api/admin/register-author', (req, res) => {
  try {
    const { username, password, adminUsername } = req.body;
    if (!username || !password || !adminUsername) {
      return res.status(400).json({ error: 'Укажите никнейм автора, пароль и аккаунт админа' });
    }
    const result = registerAuthorByAdmin(username, password, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Author Permissions & Verification (Admin)
app.post('/api/admin/update-permissions', (req, res) => {
  try {
    const { targetUsername, canEditOthers, canCreateGuides, isVerified, adminUsername } = req.body;
    if (!targetUsername || !adminUsername) {
      return res.status(400).json({ error: 'Не указан целевой автор или админ' });
    }
    const result = updateAuthorPermissionsByAdmin(targetUsername, canEditOthers, canCreateGuides, isVerified, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Reset Author Password (Admin)
app.post('/api/admin/reset-password', (req, res) => {
  try {
    const { targetUsername, newPassword, adminUsername } = req.body;
    if (!targetUsername || !newPassword || !adminUsername) {
      return res.status(400).json({ error: 'Укажите никнейм автора и новый пароль' });
    }
    const result = resetAuthorPasswordByAdmin(targetUsername, newPassword, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Delete Author Account (Admin)
app.delete('/api/admin/authors/:username', (req, res) => {
  try {
    const { adminUsername } = req.query;
    if (!adminUsername) {
      return res.status(400).json({ error: 'Не указан админ' });
    }
    const result = deleteAuthorByAdmin(req.params.username, String(adminUsername));
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// List All Authors (Admin)
app.get('/api/admin/authors', (req, res) => {
  try {
    const authors = listAllAuthors();
    res.json(authors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AUTHOR PROFILES API

// Get Author Profile (including verification flag)
app.get('/api/profiles/:username', (req, res) => {
  try {
    const userRow = db.prepare('SELECT is_verified FROM users WHERE LOWER(username) = LOWER(?)').get(req.params.username) as any;
    const isVerified = userRow ? Boolean(userRow.is_verified) : (req.params.username.toLowerCase() === 'darkimusss');
    const profile = getAuthorProfile(req.params.username);
    res.json({ ...profile, isVerified });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create / Save Author Profile
app.post('/api/profiles/:username', (req, res) => {
  try {
    const profileData: AuthorProfile = req.body;
    if (!profileData || !profileData.username) {
      return res.status(400).json({ error: 'Неверные данные профиля' });
    }
    const saved = saveAuthorProfile({
      ...profileData,
      username: req.params.username
    });
    const userRow = db.prepare('SELECT is_verified FROM users WHERE LOWER(username) = LOWER(?)').get(req.params.username) as any;
    const isVerified = userRow ? Boolean(userRow.is_verified) : (req.params.username.toLowerCase() === 'darkimusss');
    res.json({ ...saved, isVerified });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Get all guides
app.get('/api/guides', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM guides ORDER BY updated_at DESC').all();
    const guides = rows.map(formatGuideRow);
    res.json(guides);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get single guide by ID
app.get('/api/guides/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Гайд не найден' });
    }
    const formatted = formatGuideRow(row);
    recordTelemetryEvent('guide_view', {
      guideId: formatted.meta.id,
      guideTitle: formatted.meta.title,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry API Endpoints (For Admin Stats & Client Track)
app.post('/api/telemetry/track', (req, res) => {
  try {
    const { eventType, guideId, guideTitle, username } = req.body;
    if (eventType) {
      recordTelemetryEvent(eventType, {
        guideId,
        guideTitle,
        username,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
        userAgent: req.headers['user-agent']
      });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telemetry/stats', (req, res) => {
  try {
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);
    if (requestingUser) {
      const userRow = db.prepare('SELECT is_admin FROM users WHERE LOWER(username) = LOWER(?)').get(requestingUser) as any;
      if (!userRow || !userRow.is_admin) {
        return res.status(403).json({ error: 'Доступ разрешен только Администрации' });
      }
    }
    const stats = getTelemetryStats();
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Create new guide
app.post('/api/guides', (req, res) => {
  try {
    const guide: Guide = req.body;
    if (!guide || !guide.meta || !guide.meta.id) {
      return res.status(400).json({ error: 'Неверные данные гайда' });
    }

    const requestingUser = (req.headers['x-author-username'] as string) || guide.meta.author;
    recordTelemetryEvent(guide.meta.published ? 'guide_publish' : 'guide_create', {
      guideId: guide.meta.id,
      guideTitle: guide.meta.title,
      username: requestingUser,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });

    const isPublished = Boolean(guide.meta.published);
    // Если не опубликован, автоматически НЕ виден
    const isVisible = isPublished ? Boolean(guide.meta.isVisible) : false;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO guides (id, title, category, author, co_authors, difficulty, summary, updated_at, published, is_visible, server, cover_url, cover_gradient, blocks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      guide.meta.id,
      guide.meta.title || '',
      guide.meta.category,
      guide.meta.author,
      JSON.stringify(guide.meta.coAuthors || []),
      guide.meta.difficulty,
      guide.meta.summary || '',
      guide.meta.updatedAt,
      isPublished ? 1 : 0,
      isVisible ? 1 : 0,
      guide.meta.server || null,
      guide.meta.coverUrl || null,
      guide.meta.coverGradient || null,
      JSON.stringify(guide.blocks || [])
    );

    res.json(guide);
  } catch (err: any) {
    console.error('API /api/guides POST Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to check author permission on guide modification
function canUserModifyGuide(requestingUsername: string | undefined, guideId: string): boolean {
  if (!requestingUsername) return true; // If unspecified in dev mode, allow; if present, check strictly
  const userRow = db.prepare('SELECT is_admin, can_edit_others FROM users WHERE LOWER(username) = LOWER(?)').get(requestingUsername) as any;
  if (!userRow) return false;

  if (userRow.is_admin || userRow.can_edit_others) return true;

  const existingGuide = db.prepare('SELECT author, co_authors FROM guides WHERE id = ?').get(guideId) as any;
  if (!existingGuide) return true;

  const isOwner = existingGuide.author.toLowerCase() === requestingUsername.toLowerCase();
  if (isOwner) return true;

  let isCoAuthor = false;
  try {
    const coAuthors: string[] = JSON.parse(existingGuide.co_authors || '[]');
    isCoAuthor = coAuthors.some((ca: string) => ca.toLowerCase() === requestingUsername.toLowerCase());
  } catch (e) {}

  return isCoAuthor;
}

// 4. Update existing guide
app.put('/api/guides/:id', (req, res) => {
  try {
    const guideId = req.params.id;
    const guide: Guide = req.body;
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);

    if (requestingUser && !canUserModifyGuide(requestingUser, guideId)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования чужого гайда' });
    }

    recordTelemetryEvent('guide_edit', {
      guideId: guideId,
      guideTitle: guide?.meta?.title,
      username: requestingUser,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });

    const existingRow = db.prepare('SELECT * FROM guides WHERE id = ?').get(guideId);
    
    const isPublished = Boolean(guide.meta.published);
    const isVisible = isPublished ? Boolean(guide.meta.isVisible) : false;

    if (!existingRow) {
      const stmt = db.prepare(`
        INSERT INTO guides (id, title, category, author, co_authors, difficulty, summary, updated_at, published, is_visible, server, cover_url, cover_gradient, blocks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        guideId,
        guide.meta.title || '',
        guide.meta.category,
        guide.meta.author,
        JSON.stringify(guide.meta.coAuthors || []),
        guide.meta.difficulty,
        guide.meta.summary || '',
        guide.meta.updatedAt,
        isPublished ? 1 : 0,
        isVisible ? 1 : 0,
        guide.meta.server || null,
        guide.meta.coverUrl || null,
        guide.meta.coverGradient || null,
        JSON.stringify(guide.blocks || [])
      );
    } else {
      const stmt = db.prepare(`
        UPDATE guides
        SET title = ?, category = ?, author = ?, co_authors = ?, difficulty = ?, summary = ?, updated_at = ?, published = ?, is_visible = ?, server = ?, cover_url = ?, cover_gradient = ?, blocks = ?
        WHERE id = ?
      `);
      stmt.run(
        guide.meta.title || '',
        guide.meta.category,
        guide.meta.author,
        JSON.stringify(guide.meta.coAuthors || []),
        guide.meta.difficulty,
        guide.meta.summary || '',
        guide.meta.updatedAt,
        isPublished ? 1 : 0,
        isVisible ? 1 : 0,
        guide.meta.server || null,
        guide.meta.coverUrl || null,
        guide.meta.coverGradient || null,
        JSON.stringify(guide.blocks || []),
        guideId
      );
    }

    res.json(guide);
  } catch (err: any) {
    console.error('API /api/guides PUT Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete guide
app.delete('/api/guides/:id', (req, res) => {
  try {
    const guideId = req.params.id;
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);

    if (requestingUser && !canUserModifyGuide(requestingUser, guideId)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления чужого гайда' });
    }

    recordTelemetryEvent('guide_delete', {
      guideId: guideId,
      username: requestingUser,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });

    const stmt = db.prepare('DELETE FROM guides WHERE id = ?');
    const result = stmt.run(guideId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Гайд не найден' });
    }
// Server rules API Endpoints
app.get('/api/server-rules/:serverId', (req, res) => {
  try {
    const { serverId } = req.params;
    const rules = getServerRules(serverId);
    if (!rules) {
      return res.status(404).json({ error: 'Правила для данного сервера не найдены' });
    }
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/server-rules', (req, res) => {
  try {
    const rulesData = req.body;
    if (!rulesData || !rulesData.server_id || !rulesData.server_name) {
      return res.status(400).json({ error: 'Обязательные поля: server_id, server_name' });
    }
    const saved = saveServerRules(rulesData);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Parser Endpoint from Forum Topic URL
app.post('/api/admin/parse-rules', async (req, res) => {
  try {
    const { forumUrl, serverId, serverName } = req.body;
    if (!forumUrl || !serverId) {
      return res.status(400).json({ error: 'Укажите forumUrl и serverId' });
    }

    const { parseForumRulesPage } = await import('./parseRules');
    const parsedData = await parseForumRulesPage(forumUrl, serverId, serverName);
    
    // Автоматически сохраняем распарсенные правила в БД
    const saved = saveServerRules(parsedData);
    res.json({ success: true, message: `Правила для ${serverId} успешно спарсены и сохранены в БД!`, data: saved });
  } catch (err: any) {
    console.error('Ошибка автопарсинга:', err);
    res.status(500).json({ error: `Ошибка парсинга: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`[SQLite Server] Server running on http://localhost:${PORT}`);
});
