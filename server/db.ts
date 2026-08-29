import Database from 'better-sqlite3';
import path from 'path';
import type { Guide } from '../src/types/guide';

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
    blocks TEXT NOT NULL
  );
`);

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
      published: true
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
    INSERT INTO guides (id, title, category, author, difficulty, summary, updated_at, published, blocks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    JSON.stringify(defaultGuide.blocks)
  );
}
