export interface ThaumcraftAspect {
  id: string;
  nameRu: string;
  nameLat: string;
  description: string;
  color: string;
  isPrimal: boolean;
  components?: [string, string];
}

export const THAUMCRAFT_ASPECTS: Record<string, ThaumcraftAspect> = {
  // --- 6 PRIMAL ASPECTS ---
  aer: {
    id: 'aer',
    nameRu: 'Воздух',
    nameLat: 'Aer',
    description: 'Первичная стихия воздуха и ветра',
    color: '#ffff7e',
    isPrimal: true
  },
  aqua: {
    id: 'aqua',
    nameRu: 'Вода',
    nameLat: 'Aqua',
    description: 'Первичная стихия воды и влаги',
    color: '#00c0ff',
    isPrimal: true
  },
  ignis: {
    id: 'ignis',
    nameRu: 'Огонь',
    nameLat: 'Ignis',
    description: 'Первичная стихия огня и тепла',
    color: '#ff3c00',
    isPrimal: true
  },
  terra: {
    id: 'terra',
    nameRu: 'Земля',
    nameLat: 'Terra',
    description: 'Первичная стихия земли и тверди',
    color: '#56c000',
    isPrimal: true
  },
  ordo: {
    id: 'ordo',
    nameRu: 'Порядок',
    nameLat: 'Ordo',
    description: 'Первичная стихия порядка и структуры',
    color: '#d5d5d5',
    isPrimal: true
  },
  perditio: {
    id: 'perditio',
    nameRu: 'Хаос / Разрушение',
    nameLat: 'Perditio',
    description: 'Первичная стихия хаоса и энтропии',
    color: '#404040',
    isPrimal: true
  },

  // --- TIER 1 COMPOUND ASPECTS ---
  gelum: {
    id: 'gelum',
    nameRu: 'Лёд',
    nameLat: 'Gelum',
    description: 'Мороз, лед и холод',
    color: '#e0ffff',
    isPrimal: false,
    components: ['ignis', 'perditio']
  },
  lux: {
    id: 'lux',
    nameRu: 'Свет',
    nameLat: 'Lux',
    description: 'Свечение и яркость',
    color: '#fff600',
    isPrimal: false,
    components: ['aer', 'ignis']
  },
  motus: {
    id: 'motus',
    nameRu: 'Движение',
    nameLat: 'Motus',
    description: 'Кинетическая энергия и движение',
    color: '#cdcdcd',
    isPrimal: false,
    components: ['aer', 'ordo']
  },
  permutatio: {
    id: 'permutatio',
    nameRu: 'Обмен',
    nameLat: 'Permutatio',
    description: 'Превращение и обмен энергией',
    color: '#578357',
    isPrimal: false,
    components: ['motus', 'aqua']
  },
  potentia: {
    id: 'potentia',
    nameRu: 'Энергия / Сила',
    nameLat: 'Potentia',
    description: 'Мощность и чистая сила',
    color: '#c000c0',
    isPrimal: false,
    components: ['ordo', 'ignis']
  },
  tempestas: {
    id: 'tempestas',
    nameRu: 'Погода',
    nameLat: 'Tempestas',
    description: 'Буря, гроза и явления природы',
    color: '#ffffff',
    isPrimal: false,
    components: ['aer', 'gelum']
  },
  vacuos: {
    id: 'vacuos',
    nameRu: 'Пустота',
    nameLat: 'Vacuos',
    description: 'Вакуум и ничто',
    color: '#888888',
    isPrimal: false,
    components: ['aer', 'perditio']
  },
  venenum: {
    id: 'venenum',
    nameRu: 'Яд',
    nameLat: 'Venenum',
    description: 'Токсины и отравление',
    color: '#89ce00',
    isPrimal: false,
    components: ['aqua', 'perditio']
  },
  victus: {
    id: 'victus',
    nameRu: 'Жизнь',
    nameLat: 'Victus',
    description: 'Жизненная сила и биология',
    color: '#de0005',
    isPrimal: false,
    components: ['aqua', 'terra']
  },
  vitreus: {
    id: 'vitreus',
    nameRu: 'Стекло / Кристалл',
    nameLat: 'Vitreus',
    description: 'Прозрачность и кристаллы',
    color: '#80ffff',
    isPrimal: false,
    components: ['terra', 'ordo']
  },

  // --- TIER 2+ COMPOUND ASPECTS ---
  bestia: {
    id: 'bestia',
    nameRu: 'Зверь',
    nameLat: 'Bestia',
    description: 'Животный мир и фауна',
    color: '#996633',
    isPrimal: false,
    components: ['motus', 'victus']
  },
  cognitio: {
    id: 'cognitio',
    nameRu: 'Разум / Познание',
    nameLat: 'Cognitio',
    description: 'Мышление и знание',
    color: '#ffc080',
    isPrimal: false,
    components: ['ignis', 'potentia']
  },
  corpus: {
    id: 'corpus',
    nameRu: 'Плотность / Тело',
    nameLat: 'Corpus',
    description: 'Физическая плоть и тело',
    color: '#ee1100',
    isPrimal: false,
    components: ['mortuus', 'victus']
  },
  exanimis: {
    id: 'exanimis',
    nameRu: 'Нежить',
    nameLat: 'Exanimis',
    description: 'Восставшие мертвецы',
    color: '#3a4000',
    isPrimal: false,
    components: ['motus', 'mortuus']
  },
  herba: {
    id: 'herba',
    nameRu: 'Растение',
    nameLat: 'Herba',
    description: 'Флора и трава',
    color: '#01ac00',
    isPrimal: false,
    components: ['victus', 'terra']
  },
  instrumentum: {
    id: 'instrumentum',
    nameRu: 'Орудие / Инструмент',
    nameLat: 'Instrumentum',
    description: 'Орудия труда и механизмы',
    color: '#4682b4',
    isPrimal: false,
    components: ['humanus', 'ordo']
  },
  iter: {
    id: 'iter',
    nameRu: 'Дорога / Путь',
    nameLat: 'Iter',
    description: 'Путешествие и перемещение',
    color: '#e0e000',
    isPrimal: false,
    components: ['motus', 'victus']
  },
  limus: {
    id: 'limus',
    nameRu: 'Слизь',
    nameLat: 'Limus',
    description: 'Вязкость и болотная слизь',
    color: '#01ffa8',
    isPrimal: false,
    components: ['victus', 'aqua']
  },
  metallum: {
    id: 'metallum',
    nameRu: 'Металл',
    nameLat: 'Metallum',
    description: 'Руды и металлические сплавы',
    color: '#b5b5b5',
    isPrimal: false,
    components: ['vitreus', 'ordo']
  },
  mortuus: {
    id: 'mortuus',
    nameRu: 'Смерть',
    nameLat: 'Mortuus',
    description: 'Увядание и уход жизни',
    color: '#880000',
    isPrimal: false,
    components: ['victus', 'perditio']
  },
  praecantatio: {
    id: 'praecantatio',
    nameRu: 'Магия',
    nameLat: 'Præcantatio',
    description: 'Чистое колдовство и чародейство',
    color: '#cf00ff',
    isPrimal: false,
    components: ['vacuos', 'potentia']
  },
  sano: {
    id: 'sano',
    nameRu: 'Исцеление',
    nameLat: 'Sano',
    description: 'Лечение и восстановление',
    color: '#ff9999',
    isPrimal: false,
    components: ['victus', 'ordo']
  },
  sensus: {
    id: 'sensus',
    nameRu: 'Чувство',
    nameLat: 'Sensus',
    description: 'Восприятие и зрение',
    color: '#c0ffc0',
    isPrimal: false,
    components: ['aer', 'lux']
  },
  tenebrae: {
    id: 'tenebrae',
    nameRu: 'Тьма',
    nameLat: 'Tenebrae',
    description: 'Мрак и отсутствие света',
    color: '#222222',
    isPrimal: false,
    components: ['lux', 'vacuos']
  },
  vinculum: {
    id: 'vinculum',
    nameRu: 'Оковы / Ловушка',
    nameLat: 'Vinculum',
    description: 'Удержание и оцепенение',
    color: '#9a8070',
    isPrimal: false,
    components: ['motus', 'perditio']
  },
  volatus: {
    id: 'volatus',
    nameRu: 'Полет',
    nameLat: 'Volatus',
    description: 'Парение в воздухе',
    color: '#e7e7e7',
    isPrimal: false,
    components: ['aer', 'motus']
  },
  alienis: {
    id: 'alienis',
    nameRu: 'Чужое / Инородное',
    nameLat: 'Alienis',
    description: 'Иноизмерное и неизвестное',
    color: '#808080',
    isPrimal: false,
    components: ['vacuos', 'tenebrae']
  },
  arbor: {
    id: 'arbor',
    nameRu: 'Дерево',
    nameLat: 'Arbor',
    description: 'Древесина и стволы',
    color: '#875000',
    isPrimal: false,
    components: ['aer', 'herba']
  },
  auram: {
    id: 'auram',
    nameRu: 'Аура',
    nameLat: 'Auram',
    description: 'Эфирные магические поля',
    color: '#ffc0ff',
    isPrimal: false,
    components: ['praecantatio', 'aer']
  },
  fames: {
    id: 'fames',
    nameRu: 'Голод',
    nameLat: 'Fames',
    description: 'Ненасытность и истощение',
    color: '#9a0303',
    isPrimal: false,
    components: ['victus', 'vacuos']
  },
  humanus: {
    id: 'humanus',
    nameRu: 'Человек',
    nameLat: 'Humanus',
    description: 'Человеческая раса и интеллект',
    color: '#ffd7ba',
    isPrimal: false,
    components: ['bestia', 'cognitio']
  },
  lucrum: {
    id: 'lucrum',
    nameRu: 'Жадность / Богатство',
    nameLat: 'Lucrum',
    description: 'Накопительство и драгоценности',
    color: '#e6c619',
    isPrimal: false,
    components: ['humanus', 'fames']
  },
  machina: {
    id: 'machina',
    nameRu: 'Механизм',
    nameLat: 'Machina',
    description: 'Устройства и шестеренки',
    color: '#8080a0',
    isPrimal: false,
    components: ['motus', 'instrumentum']
  },
  messis: {
    id: 'messis',
    nameRu: 'Урожай',
    nameLat: 'Messis',
    description: 'Сбор плодов и сельское хозяйство',
    color: '#e1c45a',
    isPrimal: false,
    components: ['herba', 'humanus']
  },
  metamorphosis: {
    id: 'metamorphosis',
    nameRu: 'Метаморфоза',
    nameLat: 'Metamorphosis',
    description: 'Изменение формы и превращение',
    color: '#586f7c',
    isPrimal: false,
    components: ['permutatio', 'instrumentum']
  },
  pannus: {
    id: 'pannus',
    nameRu: 'Ткань',
    nameLat: 'Pannus',
    description: 'Материя и текстиль',
    color: '#eec590',
    isPrimal: false,
    components: ['instrumentum', 'arbor']
  },
  perfodio: {
    id: 'perfodio',
    nameRu: 'Шахта / Раскопки',
    nameLat: 'Perfodio',
    description: 'Добыча руд и бурение',
    color: '#d2b48c',
    isPrimal: false,
    components: ['humanus', 'ordo']
  },
  telum: {
    id: 'telum',
    nameRu: 'Оружие',
    nameLat: 'Telum',
    description: 'Мечи, луки и боевые средства',
    color: '#c0392b',
    isPrimal: false,
    components: ['instrumentum', 'ignis']
  },
  tutamen: {
    id: 'tutamen',
    nameRu: 'Броня',
    nameLat: 'Tutamen',
    description: 'Защита и доспехи',
    color: '#008080',
    isPrimal: false,
    components: ['instrumentum', 'terra']
  },
  spiritus: {
    id: 'spiritus',
    nameRu: 'Дух',
    nameLat: 'Spiritus',
    description: 'Бесплотная душа',
    color: '#e0e0e0',
    isPrimal: false,
    components: ['victus', 'mortuus']
  },
  fabrico: {
    id: 'fabrico',
    nameRu: 'Ремесло',
    nameLat: 'Fabrico',
    description: 'Создание вещей и сборка',
    color: '#808000',
    isPrimal: false,
    components: ['humanus', 'instrumentum']
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
