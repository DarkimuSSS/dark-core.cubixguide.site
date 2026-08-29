import Database from 'better-sqlite3';
import path from 'path';
import type { Guide, AuthorProfile } from '../src/types/guide';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guides (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    author TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    summary TEXT,
    updated_at TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 1,
    server TEXT,
    blocks TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY,
    avatar_url TEXT,
    bio TEXT,
    server TEXT,
    social_vk TEXT,
    social_tg TEXT,
    social_ds TEXT,
    badges TEXT,
    pinned_guide_id TEXT,
    updated_at TEXT
  );
`);

// Add server column if missing in existing table
try {
  db.exec(`ALTER TABLE guides ADD COLUMN server TEXT;`);
} catch (e) {
  // Column already exists
}

// Helper to get or create profile
export function getAuthorProfile(username: string): AuthorProfile {
  const row = db.prepare('SELECT * FROM profiles WHERE LOWER(username) = LOWER(?)').get(username) as any;
  if (row) {
    return {
      username: row.username,
      avatarUrl: row.avatar_url || '',
      bio: row.bio || '',
      server: row.server || '',
      socialVk: row.social_vk || '',
      socialTg: row.social_tg || '',
      socialDs: row.social_ds || '',
      badges: JSON.parse(row.badges || '[]'),
      pinnedGuideId: row.pinned_guide_id || '',
      updatedAt: row.updated_at || ''
    };
  }

  // Default fallback profile
  return {
    username,
    avatarUrl: '',
    bio: `Автор руководств и сборщиков на серверах CubixWorld.`,
    server: 'MagicRPG',
    socialVk: '',
    socialTg: '',
    socialDs: '',
    badges: ['Автор Гайдов', 'Опытный Крафтер'],
    pinnedGuideId: '',
    updatedAt: new Date().toISOString().split('T')[0]
  };
}

export function saveAuthorProfile(profile: AuthorProfile): AuthorProfile {
  const stmt = db.prepare(`
    INSERT INTO profiles (username, avatar_url, bio, server, social_vk, social_tg, social_ds, badges, pinned_guide_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      avatar_url=excluded.avatar_url,
      bio=excluded.bio,
      server=excluded.server,
      social_vk=excluded.social_vk,
      social_tg=excluded.social_tg,
      social_ds=excluded.social_ds,
      badges=excluded.badges,
      pinned_guide_id=excluded.pinned_guide_id,
      updated_at=excluded.updated_at
  `);

  stmt.run(
    profile.username,
    profile.avatarUrl || '',
    profile.bio || '',
    profile.server || '',
    profile.socialVk || '',
    profile.socialTg || '',
    profile.socialDs || '',
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
    bio: 'Создатель базы знаний CubixGuide. Создаю схемы алтарей драконов, гайды по Магия RPG и Автоматизации!',
    server: 'MagicRPG',
    socialVk: 'https://vk.com',
    socialTg: 'https://t.me',
    socialDs: 'DarkimuSSS#0001',
    badges: ['🥇 Главный Архитектор', '🐉 Мастер Драконов', '⚡ Эксперт Сборок'],
    pinnedGuideId: 'guide_dragon_100',
    updatedAt: new Date().toISOString().split('T')[0]
  });
}

// Seed initial default guide if database is empty
const guideCount = db.prepare('SELECT COUNT(*) as count FROM guides').get() as { count: number };

if (guideCount.count === 0) {
  const defaultGuide: Guide = {
    meta: {
      id: 'guide-ae2-starter',
      title: 'Applied Energistics 2: Быстрый старт и МЭ Сеть',
      category: 'ХайТек',
      author: 'CubixAdmin',
      difficulty: 'Новичок',
      summary: 'Подробное руководство по созданию МЭ Контроллера и автоматизации хранилища предметов.',
      updatedAt: new Date().toISOString().split('T')[0],
      published: true,
      server: 'HiTech'
    },
    blocks: [
      {
        id: 'b1',
        type: 'heading',
        headingText: 'Введение в МЭ Сети',
        headingLevel: 'h1'
      },
      {
        id: 'b2',
        type: 'text',
        textContent: 'МЭ Контроллер — это центральный процессор вашей цифровой системы хранения в Applied Energistics 2. Каждая грань контроллера выдает до 32 каналов при подключении Плотного умного кабеля.'
      },
      {
        id: 'b3',
        type: 'callout',
        calloutType: 'tip',
        calloutTitle: 'Совет по каналам',
        calloutText: 'Не объединяйте контроллеры в замкнутое кольцо больше 7x7x7. Каждый блок контроллера не должен соприкасаться более чем с 3 соседними блоками контроллеров.'
      },
      {
        id: 'b4',
        type: 'heading',
        headingText: 'Рецепт сборки МЭ Контроллера',
        headingLevel: 'h2'
      },
      {
        id: 'b5',
        type: 'crafting',
        craftingGrid: [
          { index: 0, item: { id: 'ae2_pure_certus', name: 'Чистый истинный кварц', mod: 'Applied Energistics 2', icon: 'Gem', color: '#38bdf8' }, count: 1, tooltip: 'Верхний левый угол' },
          { index: 1, item: { id: 'ae2_engineering_processor', name: 'Инженерный процессор', mod: 'Applied Energistics 2', icon: 'Cpu', color: '#06b6d4' }, count: 1, tooltip: 'Верхний центр' },
          { index: 2, item: { id: 'ae2_pure_certus', name: 'Чистый истинный кварц', mod: 'Applied Energistics 2', icon: 'Gem', color: '#38bdf8' }, count: 1, tooltip: 'Верхний правый угол' },
          { index: 3, item: { id: 'ae2_fluix_crystal', name: 'Изменчивый кристалл', mod: 'Applied Energistics 2', icon: 'Zap', color: '#a855f7' }, count: 1, tooltip: 'Левый центр' },
          { index: 4, item: { id: 'vanilla_obsidian', name: 'Обсидиан', mod: 'Minecraft', icon: 'Square', color: '#334155' }, count: 1, tooltip: 'Центр Ядро' },
          { index: 5, item: { id: 'ae2_fluix_crystal', name: 'Изменчивый кристалл', mod: 'Applied Energistics 2', icon: 'Zap', color: '#a855f7' }, count: 1, tooltip: 'Правый центр' },
          { index: 6, item: { id: 'ae2_pure_certus', name: 'Чистый истинный кварц', mod: 'Applied Energistics 2', icon: 'Gem', color: '#38bdf8' }, count: 1, tooltip: 'Нижний левый' },
          { index: 7, item: { id: 'ae2_logic_processor', name: 'Логический процессор', mod: 'Applied Energistics 2', icon: 'CircuitBoard', color: '#eab308' }, count: 1, tooltip: 'Нижний центр' },
          { index: 8, item: { id: 'ae2_pure_certus', name: 'Чистый истинный кварц', mod: 'Applied Energistics 2', icon: 'Gem', color: '#38bdf8' }, count: 1, tooltip: 'Нижний правый' }
        ],
        craftingOutput: {
          index: 9,
          item: { id: 'ae2_me_controller', name: 'МЭ Контроллер', mod: 'Applied Energistics 2', icon: 'Cpu', color: '#8b5cf6' },
          count: 1,
          tooltip: 'Блок МЭ Контроллера'
        }
      },
      {
        id: 'b6',
        type: 'checklist',
        checklistTitle: 'Чек-лист запуска системы',
        checklistItems: [
          { id: 'c1', text: 'Скрафтить 4x Чистых истинных кварца и 2x Процессора', completed: true },
          { id: 'c2', text: 'Собрать МЭ Контроллер в верстаке 3x3', completed: true },
          { id: 'c3', text: 'Подключить Приемник энергии к источникам FE/RF', completed: false },
          { id: 'c4', text: 'Подсоединить МЭ Накопитель с Ячейкой памяти 64К', completed: false }
        ]
      }
    ]
  };

  const stmt = db.prepare(`
    INSERT INTO guides (id, title, category, author, difficulty, summary, updated_at, published, server, blocks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    defaultGuide.meta.id,
    defaultGuide.meta.title,
    defaultGuide.meta.category,
    defaultGuide.meta.author,
    defaultGuide.meta.difficulty,
    defaultGuide.meta.summary,
    defaultGuide.meta.updatedAt,
    defaultGuide.meta.published ? 1 : 0,
    defaultGuide.meta.server || null,
    JSON.stringify(defaultGuide.blocks)
  );
}
