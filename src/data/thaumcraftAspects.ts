export interface ThaumcraftAspect {
  id: string;
  nameRu: string;
  nameLat: string;
  description: string;
  color: string;
  isPrimal: boolean;
  components?: [string, string];
  items?: string[];
}

export const THAUMCRAFT_ASPECTS: Record<string, ThaumcraftAspect> = {
  // --- 6 PRIMAL ASPECTS ---
  aer: {
    id: 'aer',
    nameRu: 'Воздух',
    nameLat: 'Aer',
    description: 'Первичная стихия воздуха и ветра',
    color: '#ffff7e',
    isPrimal: true,
    items: ['Перо', 'Стрела', 'Cахарный тростник', 'Батут', 'Воздушный шар']
  },
  aqua: {
    id: 'aqua',
    nameRu: 'Вода',
    nameLat: 'Aqua',
    description: 'Первичная стихия воды и влаги',
    color: '#00c0ff',
    isPrimal: true,
    items: ['Ведро воды', 'Сырая рыба', 'Кувшинка', 'Снежок', 'Кувшин']
  },
  ignis: {
    id: 'ignis',
    nameRu: 'Огонь',
    nameLat: 'Ignis',
    description: 'Первичная стихия огня и тепла',
    color: '#ff3c00',
    isPrimal: true,
    items: ['Уголь', 'Факел', 'Огненный стержень (Блейз)', 'Лава', 'Адский камень']
  },
  terra: {
    id: 'terra',
    nameRu: 'Земля',
    nameLat: 'Terra',
    description: 'Первичная стихия земли и тверди',
    color: '#56c000',
    isPrimal: true,
    items: ['Bоздух/Земля/Камень', 'Булыжник', 'Грязь', 'Песок', 'Глина']
  },
  ordo: {
    id: 'ordo',
    nameRu: 'Порядок',
    nameLat: 'Ordo',
    description: 'Первичная стихия порядка и структуры',
    color: '#d5d5d5',
    isPrimal: true,
    items: ['Чистый кварц', 'Полированный камень', 'Стеклянный пузырек', 'Призмарин']
  },
  perditio: {
    id: 'perditio',
    nameRu: 'Хаос / Разрушение',
    nameLat: 'Perditio',
    description: 'Первичная стихия хаоса и энтропии',
    color: '#404040',
    isPrimal: true,
    items: ['Порох', 'Динамит (TNT)', 'Гнилая плоть', 'Кость', 'Разбитый аспект']
  },

  // --- TIER 1 COMPOUND ASPECTS ---
  gelum: {
    id: 'gelum',
    nameRu: 'Лёд',
    nameLat: 'Gelum',
    description: 'Мороз, лед и холод',
    color: '#e0ffff',
    isPrimal: false,
    components: ['ignis', 'perditio'],
    items: ['Плотный лёд', 'Снежный блок', 'Снежок', 'Сосулька']
  },
  lux: {
    id: 'lux',
    nameRu: 'Свет',
    nameLat: 'Lux',
    description: 'Свечение и яркость',
    color: '#fff600',
    isPrimal: false,
    components: ['aer', 'ignis'],
    items: ['Факел', 'Светящийся камень (Glowstone)', 'Светильник Джека', 'Лампа']
  },
  motus: {
    id: 'motus',
    nameRu: 'Движение',
    nameLat: 'Motus',
    description: 'Кинетическая энергия и движение',
    color: '#cdcdcd',
    isPrimal: false,
    components: ['aer', 'ordo'],
    items: ['Ворвань', 'Поршень', 'Рельсы', 'Лодка', 'Винт']
  },
  permutatio: {
    id: 'permutatio',
    nameRu: 'Обмен',
    nameLat: 'Permutatio',
    description: 'Превращение и обмен энергией',
    color: '#578357',
    isPrimal: false,
    components: ['motus', 'aqua'],
    items: ['Медный слиток', 'Воронка', 'Сундук', 'Семена']
  },
  potentia: {
    id: 'potentia',
    nameRu: 'Энергия / Сила',
    nameLat: 'Potentia',
    description: 'Мощность и чистая сила',
    color: '#c000c0',
    isPrimal: false,
    components: ['ordo', 'ignis'],
    items: ['Редстоун пыль', 'Огненный шар', 'Уголь', 'Лазурит']
  },
  tempestas: {
    id: 'tempestas',
    nameRu: 'Погода',
    nameLat: 'Tempestas',
    description: 'Буря, гроза и явления природы',
    color: '#ffffff',
    isPrimal: false,
    components: ['aer', 'gelum'],
    items: ['Снежный шар', 'Молниеотвод', 'Туча']
  },
  vacuos: {
    id: 'vacuos',
    nameRu: 'Пустота',
    nameLat: 'Vacuos',
    description: 'Вакуум и ничто',
    color: '#888888',
    isPrimal: false,
    components: ['aer', 'perditio'],
    items: ['Пустая колба', 'Мяч', 'Ведро (пустое)', 'Миска']
  },
  venenum: {
    id: 'venenum',
    nameRu: 'Яд',
    nameLat: 'Venenum',
    description: 'Токсины и отравление',
    color: '#89ce00',
    isPrimal: false,
    components: ['aqua', 'perditio'],
    items: ['Паучий глаз', 'Зелeварка', 'Ядовитый гриб', 'Отравленная стрела']
  },
  victus: {
    id: 'victus',
    nameRu: 'Жизнь',
    nameLat: 'Victus',
    description: 'Жизненная сила и биология',
    color: '#de0005',
    isPrimal: false,
    components: ['aqua', 'terra'],
    items: ['Яйцо', 'Жареная говядина', 'Яблоко', 'Семена пшеницы']
  },
  vitreus: {
    id: 'vitreus',
    nameRu: 'Стекло / Кристалл',
    nameLat: 'Vitreus',
    description: 'Прозрачность и кристаллы',
    color: '#80ffff',
    isPrimal: false,
    components: ['terra', 'ordo'],
    items: ['Стекло', 'Кварц', 'Алмаз', 'Стеклянная панель', 'Магический кристалл']
  },

  // --- TIER 2+ COMPOUND ASPECTS ---
  bestia: {
    id: 'bestia',
    nameRu: 'Зверь',
    nameLat: 'Bestia',
    description: 'Животный мир и фауна',
    color: '#996633',
    isPrimal: false,
    components: ['motus', 'victus'],
    items: ['Шерсть', 'Кожа', 'Перо', 'Сырое мясо', 'Паучий шелк']
  },
  cognitio: {
    id: 'cognitio',
    nameRu: 'Разум / Познание',
    nameLat: 'Cognitio',
    description: 'Мышление и знание',
    color: '#ffc080',
    isPrimal: false,
    components: ['ignis', 'potentia'],
    items: ['Книга', 'Бумага', 'Стол зачарования', 'Мозг зомби']
  },
  corpus: {
    id: 'corpus',
    nameRu: 'Плотность / Тело',
    nameLat: 'Corpus',
    description: 'Физическая плоть и тело',
    color: '#ee1100',
    isPrimal: false,
    components: ['mortuus', 'victus'],
    items: ['Сырая свинина', 'Гнилая плоть', 'Сырая говядина', 'Паучий глаз']
  },
  exanimis: {
    id: 'exanimis',
    nameRu: 'Нежить',
    nameLat: 'Exanimis',
    description: 'Восставшие мертвецы',
    color: '#3a4000',
    isPrimal: false,
    components: ['motus', 'mortuus'],
    items: ['Гнилая плоть', 'Кость черепа', 'Череп скелета-иссушителя']
  },
  herba: {
    id: 'herba',
    nameRu: 'Растение',
    nameLat: 'Herba',
    description: 'Флора и трава',
    color: '#01ac00',
    isPrimal: false,
    components: ['victus', 'terra'],
    items: ['Семена', 'Цветок', 'Листва', 'Трава', 'Кактус']
  },
  instrumentum: {
    id: 'instrumentum',
    nameRu: 'Орудие / Инструмент',
    nameLat: 'Instrumentum',
    description: 'Орудия труда и механизмы',
    color: '#4682b4',
    isPrimal: false,
    components: ['humanus', 'ordo'],
    items: ['Железная кирка', 'Меч', 'Топор', 'Лопата', 'Ножницы']
  },
  iter: {
    id: 'iter',
    nameRu: 'Дорога / Путь',
    nameLat: 'Iter',
    description: 'Путешествие и перемещение',
    color: '#e0e000',
    isPrimal: false,
    components: ['motus', 'victus'],
    items: ['Жемчуг Эндера', 'Ботинки', 'Седло', 'Компас', 'Вагонетка']
  },
  limus: {
    id: 'limus',
    nameRu: 'Слизь',
    nameLat: 'Limus',
    description: 'Вязкость и болотная слизь',
    color: '#01ffa8',
    isPrimal: false,
    components: ['victus', 'aqua'],
    items: ['Сгусток слизи', 'Липкий поршень', 'Слаймовый блок']
  },
  metallum: {
    id: 'metallum',
    nameRu: 'Металл',
    nameLat: 'Metallum',
    description: 'Руды и металлические сплавы',
    color: '#b5b5b5',
    isPrimal: false,
    components: ['vitreus', 'ordo'],
    items: ['Железный слиток', 'Золотой слиток', 'Железная руда', 'Ведро']
  },
  mortuus: {
    id: 'mortuus',
    nameRu: 'Смерть',
    nameLat: 'Mortuus',
    description: 'Увядание и уход жизни',
    color: '#880000',
    isPrimal: false,
    components: ['victus', 'perditio'],
    items: ['Кость', 'Костная мука', 'Гнилая плоть', 'Череп']
  },
  praecantatio: {
    id: 'praecantatio',
    nameRu: 'Магия',
    nameLat: 'Præcantatio',
    description: 'Чистое колдовство и чародейство',
    color: '#cf00ff',
    isPrimal: false,
    components: ['vacuos', 'potentia'],
    items: ['Осколок аспекта', 'Великое дерево', 'Магический кристал', 'Пузырек опыта']
  },
  sano: {
    id: 'sano',
    nameRu: 'Исцеление',
    nameLat: 'Sano',
    description: 'Лечение и восстановление',
    color: '#ff9999',
    isPrimal: false,
    components: ['victus', 'ordo'],
    items: ['Зелье лечения', 'Сверкающий арбуз', 'Золотое яблоко', 'Слеза Гаста']
  },
  sensus: {
    id: 'sensus',
    nameRu: 'Чувство',
    nameLat: 'Sensus',
    description: 'Восприятие и зрение',
    color: '#c0ffc0',
    isPrimal: false,
    components: ['aer', 'lux'],
    items: ['Светящаяся пыль', 'Око Эндера', 'Незер-кварц', 'Рамка']
  },
  tenebrae: {
    id: 'tenebrae',
    nameRu: 'Тьма',
    nameLat: 'Tenebrae',
    description: 'Мрак и отсутствие света',
    color: '#222222',
    isPrimal: false,
    components: ['lux', 'vacuos'],
    items: ['Чернильный мешок', 'Обсидиан', 'Глаз Эндермена']
  },
  vinculum: {
    id: 'vinculum',
    nameRu: 'Оковы / Ловушка',
    nameLat: 'Vinculum',
    description: 'Удержание и оцепенение',
    color: '#9a8070',
    isPrimal: false,
    components: ['motus', 'perditio'],
    items: ['Паутина', 'Забор', 'Сундук-ловушка', 'Нить']
  },
  volatus: {
    id: 'volatus',
    nameRu: 'Полет',
    nameLat: 'Volatus',
    description: 'Парение в воздухе',
    color: '#e7e7e7',
    isPrimal: false,
    components: ['aer', 'motus'],
    items: ['Перо', 'Стрела', 'Зелье прыгучести']
  },
  alienis: {
    id: 'alienis',
    nameRu: 'Чужое / Инородное',
    nameLat: 'Alienis',
    description: 'Иноизмерное и неизвестное',
    color: '#808080',
    isPrimal: false,
    components: ['vacuos', 'tenebrae'],
    items: ['Жемчуг Эндера', 'Эндер-няк', 'Око Эндера']
  },
  arbor: {
    id: 'arbor',
    nameRu: 'Дерево',
    nameLat: 'Arbor',
    description: 'Древесина и стволы',
    color: '#875000',
    isPrimal: false,
    components: ['aer', 'herba'],
    items: ['Дубовая древесина', 'Доски', 'Саженец', 'Палка']
  },
  auram: {
    id: 'auram',
    nameRu: 'Аура',
    nameLat: 'Auram',
    description: 'Эфирные магические поля',
    color: '#ffc0ff',
    isPrimal: false,
    components: ['praecantatio', 'aer'],
    items: ['Узел ауры в банке', 'Серебряное дерево', 'Эфирная эссенция']
  },
  fames: {
    id: 'fames',
    nameRu: 'Голод',
    nameLat: 'Fames',
    description: 'Ненасытность и истощение',
    color: '#9a0303',
    isPrimal: false,
    components: ['victus', 'vacuos'],
    items: ['Гнилая плоть', 'Зачарованное яблоко', 'Грибное рагу']
  },
  humanus: {
    id: 'humanus',
    nameRu: 'Человек',
    nameLat: 'Humanus',
    description: 'Человеческая раса и интеллект',
    color: '#ffd7ba',
    isPrimal: false,
    components: ['bestia', 'cognitio'],
    items: ['Гнилая плоть', 'Книга', 'Голова игрока', 'Изумруд']
  },
  lucrum: {
    id: 'lucrum',
    nameRu: 'Жадность / Богатство',
    nameLat: 'Lucrum',
    description: 'Накопительство и драгоценности',
    color: '#e6c619',
    isPrimal: false,
    components: ['humanus', 'fames'],
    items: ['Золотой слиток', 'Алмаз', 'Изумруд', 'Монета']
  },
  machina: {
    id: 'machina',
    nameRu: 'Механизм',
    nameLat: 'Machina',
    description: 'Устройства и шестеренки',
    color: '#8080a0',
    isPrimal: false,
    components: ['motus', 'instrumentum'],
    items: ['Редстоун повторитель', 'Раздаччик', 'Поршень', 'Замыкатель']
  },
  messis: {
    id: 'messis',
    nameRu: 'Урожай',
    nameLat: 'Messis',
    description: 'Сбор плодов и сельское хозяйство',
    color: '#e1c45a',
    isPrimal: false,
    components: ['herba', 'humanus'],
    items: ['Пшеница', 'Хлеб', 'Морковь', 'Картофель', 'Арбуз']
  },
  pannus: {
    id: 'pannus',
    nameRu: 'Ткань',
    nameLat: 'Pannus',
    description: 'Материя и текстиль',
    color: '#eec590',
    isPrimal: false,
    components: ['instrumentum', 'arbor'],
    items: ['Шерсть', 'Нить', 'Ковер', 'Кожаная куртка']
  },
  perfodio: {
    id: 'perfodio',
    nameRu: 'Шахта / Раскопки',
    nameLat: 'Perfodio',
    description: 'Добыча руд и бурение',
    color: '#d2b48c',
    isPrimal: false,
    components: ['humanus', 'ordo'],
    items: ['Железная кирка', 'Кирка', 'Зачарованная кирка', 'Булыжник']
  },
  telum: {
    id: 'telum',
    nameRu: 'Оружие',
    nameLat: 'Telum',
    description: 'Мечи, луки и боевые средства',
    color: '#c0392b',
    isPrimal: false,
    components: ['instrumentum', 'ignis'],
    items: ['Меч', 'Лук', 'Стрела', 'Трезубец', 'Динамит (TNT)']
  },
  tutamen: {
    id: 'tutamen',
    nameRu: 'Броня',
    nameLat: 'Tutamen',
    description: 'Защита и доспехи',
    color: '#008080',
    isPrimal: false,
    components: ['instrumentum', 'terra'],
    items: ['Железный нагрудник', 'Щит', 'Шлем', 'Кожаный шлем']
  },
  spiritus: {
    id: 'spiritus',
    nameRu: 'Дух',
    nameLat: 'Spiritus',
    description: 'Бесплотная душа',
    color: '#e0e0e0',
    isPrimal: false,
    components: ['victus', 'mortuus'],
    items: ['Песок душ', 'Слеза Гаста', 'Флакон душ']
  },
  fabrico: {
    id: 'fabrico',
    nameRu: 'Ремесло',
    nameLat: 'Fabrico',
    description: 'Создание вещей и сборка',
    color: '#808000',
    isPrimal: false,
    components: ['humanus', 'instrumentum'],
    items: ['Верстак', 'Верстак тауматурга', 'Сундук']
  },

  // --- ADDON & SIN ASPECTS (FORBIDDEN MAGIC / THAUMIC HORIZONS) ---
  superbia: {
    id: 'superbia',
    nameRu: 'Гордыня',
    nameLat: 'Superbia',
    description: 'Грех гордости и тщеславия',
    color: '#9a32cd',
    isPrimal: false,
    components: ['volatus', 'vacuos'],
    items: ['Корона', 'Перо элиты', 'Зачарованное золотое яблоко']
  },
  invidia: {
    id: 'invidia',
    nameRu: 'Зависть',
    nameLat: 'Invidia',
    description: 'Грех зависти и ревности',
    color: '#006400',
    isPrimal: false,
    components: ['sensus', 'fames'],
    items: ['Изумруд', 'Око Эндера', 'Зелье невидимости']
  },
  ira: {
    id: 'ira',
    nameRu: 'Гнев',
    nameLat: 'Ira',
    description: 'Грех ярости и злобы',
    color: '#b22222',
    isPrimal: false,
    components: ['telum', 'ignis'],
    items: ['Огненный меч', 'Порох', 'Огненный шар']
  },
  desidia: {
    id: 'desidia',
    nameRu: 'Лень / Праздность',
    nameLat: 'Desidia',
    description: 'Грех лени и апатии',
    color: '#696969',
    isPrimal: false,
    components: ['vinculum', 'motus'],
    items: ['Кровать', 'Паутина', 'Часы']
  },
  gula: {
    id: 'gula',
    nameRu: 'Чревоугодие',
    nameLat: 'Gula',
    description: 'Грех обжорства',
    color: '#8b4513',
    isPrimal: false,
    components: ['fames', 'victus'],
    items: ['Запеченный свиной окорок', 'Торт', 'Пирог', 'Грибной суп']
  },
  luxuria: {
    id: 'luxuria',
    nameRu: 'Похоть',
    nameLat: 'Luxuria',
    description: 'Грех вожделения',
    color: '#ff69b4',
    isPrimal: false,
    components: ['corpus', 'victus'],
    items: ['Сердце моря', 'Роза', 'Зелье регенерации']
  },
  infernus: {
    id: 'infernus',
    nameRu: 'Ад / Преисподняя',
    nameLat: 'Infernus',
    description: 'Пламя преисподней',
    color: '#ff4500',
    isPrimal: false,
    components: ['ignis', 'praecantatio'],
    items: ['Адский камень', 'Адский нарост', 'Лава', 'Стержень Ифрита']
  },
  terminus: {
    id: 'terminus',
    nameRu: 'Конец / Предел',
    nameLat: 'Terminus',
    description: 'Завершение и предел бытия',
    color: '#191970',
    isPrimal: false,
    components: ['lucrum', 'alienis'],
    items: ['Звезда Незера', 'Яйцо Дракона', 'Кристалл Края']
  },
  vitium: {
    id: 'vitium',
    nameRu: 'Порча / Скверна',
    nameLat: 'Vitium',
    description: 'Теневая порча и искажение',
    color: '#800080',
    isPrimal: false,
    components: ['praecantatio', 'perditio'],
    items: ['Зараженная слизь', 'Зараженный блок', 'Вредоносный кристалл']
  },
  tempus: {
    id: 'tempus',
    nameRu: 'Время',
    nameLat: 'Tempus',
    description: 'Течение времени и эпохи',
    color: '#b8860b',
    isPrimal: false,
    components: ['vacuos', 'ordo'],
    items: ['Часы', 'Песочные часы', 'Зачарованные часы']
  },
  meto: {
    id: 'meto',
    nameRu: 'Жатва',
    nameLat: 'Meto',
    description: 'Сбор урожая и серп',
    color: '#ee82ee',
    isPrimal: false,
    components: ['messis', 'instrumentum'],
    items: ['Мотыга', 'Зачарованная мотыга', 'Серп']
  }
};

/**
 * BFS algorithm to find the shortest aspect bridge in Thaumcraft 4 Research Table
 */
export function findShortestAspectBridge(startId: string, targetId: string): string[] {
  if (!THAUMCRAFT_ASPECTS[startId] || !THAUMCRAFT_ASPECTS[targetId]) return [];
  if (startId === targetId) return [startId];

  // Build adjacency map (two aspects connect if one is component of another or they share a component)
  const adj = new Map<string, Set<string>>();

  Object.values(THAUMCRAFT_ASPECTS).forEach(asp => {
    if (!adj.has(asp.id)) adj.set(asp.id, new Set());

    if (asp.components) {
      const [c1, c2] = asp.components;
      if (!adj.has(c1)) adj.set(c1, new Set());
      if (!adj.has(c2)) adj.set(c2, new Set());

      adj.get(asp.id)!.add(c1);
      adj.get(c1)!.add(asp.id);

      adj.get(asp.id)!.add(c2);
      adj.get(c2)!.add(asp.id);
    }
  });

  // BFS Queue
  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];

    if (node === targetId) {
      return path;
    }

    const neighbors = adj.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
  }

  return [];
}

/**
 * Calculates step-by-step sequential synthesis tree (how to create a target aspect step-by-step from base aspects)
 */
export interface SynthesisStep {
  result: string;
  component1: string;
  component2: string;
  stepNumber: number;
}

export function getAspectSynthesisSteps(targetId: string): { steps: SynthesisStep[]; primalCosts: Record<string, number> } {
  const steps: SynthesisStep[] = [];
  const primalCosts: Record<string, number> = {
    aer: 0,
    aqua: 0,
    ignis: 0,
    terra: 0,
    ordo: 0,
    perditio: 0
  };

  const synthesized = new Set<string>(['aer', 'aqua', 'ignis', 'terra', 'ordo', 'perditio']);

  function resolve(id: string) {
    const asp = THAUMCRAFT_ASPECTS[id];
    if (!asp) return;

    if (asp.isPrimal) {
      primalCosts[id] = (primalCosts[id] || 0) + 1;
      return;
    }

    if (asp.components) {
      const [c1, c2] = asp.components;
      resolve(c1);
      resolve(c2);

      if (!synthesized.has(id)) {
        synthesized.add(id);
        steps.push({
          result: id,
          component1: c1,
          component2: c2,
          stepNumber: steps.length + 1
        });
      }
    }
  }

  resolve(targetId);

  return { steps, primalCosts };
}
