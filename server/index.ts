import express from 'express';
import cors from 'cors';
import { db } from './db';
import type { Guide, GuideMeta, GuideBlock } from '../src/types/guide';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to format DB row to Guide object
function formatGuideRow(row: any): Guide {
  return {
    meta: {
      id: row.id,
      title: row.title,
      category: row.category,
      author: row.author,
      difficulty: row.difficulty,
      summary: row.summary || '',
      updatedAt: row.updated_at,
      published: Boolean(row.published),
      server: row.server || undefined
    },
    blocks: JSON.parse(row.blocks || '[]')
  };
}

// REST API Endpoints

// 0. Live CubixWorld Servers Proxy Endpoint
app.get('/api/servers', async (req, res) => {
  try {
    const response = await fetch('https://online.cubix.world/api/metrics/server-list');
    if (!response.ok) throw new Error('CUBIX_API_ERROR');
    const serversList = await response.json();
    res.json(serversList);
  } catch (err) {
    // Fallback list if external network error occurs
    res.json([
      "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
      "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", "UltraSky", 
      "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
      "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", "TechnomagicTest", 
      "SkyTech", "MagicalTech"
    ]);
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
      INSERT INTO guides (id, title, category, author, difficulty, summary, updated_at, published, server, blocks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      guide.meta.id,
      guide.meta.title,
      guide.meta.category,
      guide.meta.author,
      guide.meta.difficulty,
      guide.meta.summary || '',
      guide.meta.updatedAt || new Date().toISOString().split('T')[0],
      guide.meta.published ? 1 : 0,
      guide.meta.server || null,
      JSON.stringify(guide.blocks || [])
    );

    res.status(201).json(guide);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update existing guide
app.put('/api/guides/:id', (req, res) => {
  try {
    const guide: Guide = req.body;
    const guideId = req.params.id;

    const stmt = db.prepare(`
      UPDATE guides
      SET title = ?, category = ?, author = ?, difficulty = ?, summary = ?, updated_at = ?, published = ?, server = ?, blocks = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      guide.meta.title,
      guide.meta.category,
      guide.meta.author,
      guide.meta.difficulty,
      guide.meta.summary || '',
      guide.meta.updatedAt || new Date().toISOString().split('T')[0],
      guide.meta.published ? 1 : 0,
      guide.meta.server || null,
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
    const stmt = db.prepare('DELETE FROM guides WHERE id = ?');
    const result = stmt.run(req.params.id);
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
