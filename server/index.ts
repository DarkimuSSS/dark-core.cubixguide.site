import express from 'express';
import cors from 'cors';
import { db, getAuthorProfile, saveAuthorProfile, registerAuthorByAdmin, loginUser, listAllAuthors, changeUserPassword, resetAuthorPasswordByAdmin, deleteAuthorByAdmin, updateAuthorPermissionsByAdmin } from './db';
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
      published: Boolean(row.published),
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
    }
    res.json(DEFAULT_CUBIX_SERVERS);
  } catch (err) {
    res.json(DEFAULT_CUBIX_SERVERS);
  }
});

// AUTHENTICATION ENDPOINTS

// Login Author
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
      return res.status(400).json({ error: 'Заполните никнейм и пароль нового автора' });
    }
    const result = registerAuthorByAdmin(username, password, adminUsername);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Update Author Permissions & Verification (Admin)
app.post('/api/admin/permissions', (req, res) => {
  try {
    const { targetUsername, canEditOthers, canCreateGuides, isVerified, adminUsername } = req.body;
    if (!targetUsername || !adminUsername) {
      return res.status(400).json({ error: 'Укажите никнейм автора' });
    }
    const result = updateAuthorPermissionsByAdmin(targetUsername, Boolean(canEditOthers), Boolean(canCreateGuides), Boolean(isVerified), adminUsername);
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
    res.json(formatGuideRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create new guide
app.post('/api/guides', (req, res) => {
  try {
    const guide: Guide = req.body;
    if (!guide || !guide.meta || !guide.meta.title) {
      return res.status(400).json({ error: 'Неверные данные гайда' });
    }

    const stmt = db.prepare(`
      INSERT INTO guides (id, title, category, author, co_authors, difficulty, summary, updated_at, published, server, cover_url, cover_gradient, blocks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      guide.meta.id,
      guide.meta.title,
      guide.meta.category,
      guide.meta.author,
      JSON.stringify(guide.meta.coAuthors || []),
      guide.meta.difficulty,
      guide.meta.summary || '',
      guide.meta.updatedAt || new Date().toISOString().split('T')[0],
      guide.meta.published ? 1 : 0,
      guide.meta.server || null,
      guide.meta.coverUrl || null,
      guide.meta.coverGradient || null,
      JSON.stringify(guide.blocks || [])
    );

    res.status(201).json(guide);
  } catch (err: any) {
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
    const guide: Guide = req.body;
    const guideId = req.params.id;
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);

    if (requestingUser && !canUserModifyGuide(requestingUser, guideId)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования чужого гайда' });
    }

    const stmt = db.prepare(`
      UPDATE guides
      SET title = ?, category = ?, author = ?, co_authors = ?, difficulty = ?, summary = ?, updated_at = ?, published = ?, server = ?, cover_url = ?, cover_gradient = ?, blocks = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      guide.meta.title,
      guide.meta.category,
      guide.meta.author,
      JSON.stringify(guide.meta.coAuthors || []),
      guide.meta.difficulty,
      guide.meta.summary || '',
      guide.meta.updatedAt || new Date().toISOString().split('T')[0],
      guide.meta.published ? 1 : 0,
      guide.meta.server || null,
      guide.meta.coverUrl || null,
      guide.meta.coverGradient || null,
      JSON.stringify(guide.blocks || []),
      guideId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Гайд не найден для обновления' });
    }

    res.json(guide);
  } catch (err: any) {
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

    const stmt = db.prepare('DELETE FROM guides WHERE id = ?');
    const result = stmt.run(guideId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Гайд не найден' });
    }
    res.json({ success: true, message: 'Гайд успешно удален' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[SQLite Server] Server running on http://localhost:${PORT}`);
});
