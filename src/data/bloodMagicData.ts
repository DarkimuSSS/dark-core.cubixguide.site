export interface BloodMagicRuneType {
  id: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  description: string;
  effectFormula: string;
  color: string;
}

export interface BloodMagicTierInfo {
  tier: number;
  name: string;
  totalRunes: number;
  baseCapacity: number;
  baseTransferRate: number;
  structures: {
    bloodAltar: number;
    runes: number;
    blankRuneDefault: number;
    glowstoneOrBricks?: { name: string; count: number };
    bloodBricks?: { name: string; count: number };
    beacons?: { name: string; count: number };
    crystalPillars?: { name: string; count: number };
  };
  dimensions: string;
  description: string;
}

export const BLOOD_MAGIC_RUNES: Record<string, BloodMagicRuneType> = {
  speed: {
    id: 'speed',
    nameRu: 'Руна скорости',
    nameEn: 'Rune of Speed',
    icon: 'Zap',
    description: 'Увеличивает скорость крафта и передачи LP на 20% за каждую руну (сложный процент).',
    effectFormula: '+20% к скорости работы за каждую руну',
    color: 'from-amber-500 to-yellow-500'
  },
  capacity: {
    id: 'capacity',
    nameRu: 'Руна емкости',
    nameEn: 'Rune of Capacity',
    icon: 'Database',
    description: 'Увеличивает максимальную емкость Кровавого Алтаря на +2,000 LP за каждую руну.',
    effectFormula: '+2,000 LP к емкости алтаря',
    color: 'from-rose-500 to-red-600'
  },
  augmented_capacity: {
    id: 'augmented_capacity',
    nameRu: 'Улучшенная руна емкости',
    nameEn: 'Rune of Augmented Capacity',
    icon: 'ShieldAlert',
    description: 'Увеличивает емкость на +10% от текущей максимальной емкости алтаря за каждую руну.',
    effectFormula: '+10% от полной емкости алтаря',
    color: 'from-purple-500 to-pink-600'
  },
  sacrifice: {
    id: 'sacrifice',
    nameRu: 'Руна жертвоприношения',
    nameEn: 'Rune of Sacrifice',
    icon: 'Skull',
    description: 'Увеличивает количество LP, получаемое при ритуальном убийстве мобов Кинжалом Жертвоприношения на +10%.',
    effectFormula: '+10% LP с мобов',
    color: 'from-crimson-500 to-rose-700'
  },
  self_sacrifice: {
    id: 'self_sacrifice',
    nameRu: 'Руна самопожертвования',
    nameEn: 'Rune of Self-Sacrifice',
    icon: 'HeartHandshake',
    description: 'Увеличивает количество LP, получаемое при использовании Жертвенного Ножа на себя на +10%.',
    effectFormula: '+10% LP с игрока (нож)',
    color: 'from-emerald-500 to-teal-600'
  },
  dislocation: {
    id: 'dislocation',
    nameRu: 'Руна перемещения',
    nameEn: 'Rune of Dislocation',
    icon: 'ArrowUpDown',
    description: 'Увеличивает скорость вкачивания и выкачивания LP трубами/жидкостными узлами на +20%.',
    effectFormula: '+20% к скорости выкачки/закачки LP',
    color: 'from-cyan-500 to-blue-600'
  },
  orb: {
    id: 'orb',
    nameRu: 'Руна шара',
    nameEn: 'Rune of the Orb',
    icon: 'Globe',
    description: 'Увеличивает емкость наполняемого Кровавого Шара на +2% за каждую руну.',
    effectFormula: '+2% к емкости шара в сети',
    color: 'from-indigo-500 to-purple-600'
  },
  acceleration: {
    id: 'acceleration',
    nameRu: 'Руна ускорения',
    nameEn: 'Rune of Acceleration',
    icon: 'FastForward',
    description: 'Сокращает задержку между операциями выкачки/крафта до 1 тика.',
    effectFormula: 'Уменьшает задержку тиков обработки',
    color: 'from-orange-500 to-amber-600'
  }
};

export const BLOOD_MAGIC_TIERS: BloodMagicTierInfo[] = [
  {
    tier: 1,
    name: 'Tier I — Базовый Алтарь',
    totalRunes: 0,
    baseCapacity: 10000,
    baseTransferRate: 20,
    structures: {
      bloodAltar: 1,
      runes: 0,
      blankRuneDefault: 0
    },
    dimensions: '1x1x1 (Только блок Алтаря)',
    description: 'Самый первый уровень алтаря. Создается крафтом одного блока Кровавого Алтаря. Руны не используются.'
  },
  {
    tier: 2,
    name: 'Tier II — Малый Алтарь',
    totalRunes: 8,
    baseCapacity: 10000,
    baseTransferRate: 20,
    structures: {
      bloodAltar: 1,
      runes: 8,
      blankRuneDefault: 8
    },
    dimensions: '3x3x1 (Кольцо из 8 рун под алтарем)',
    description: 'Второй уровень. Алтарь поднимается на 1 блок вверх, под ним выкладывается кольцо 3x3 из 8 рун.'
  },
  {
    tier: 3,
    name: 'Tier III — Средний Алтарь',
    totalRunes: 28,
    baseCapacity: 10000,
    baseTransferRate: 20,
    structures: {
      bloodAltar: 1,
      runes: 28,
      blankRuneDefault: 28,
      glowstoneOrBricks: { name: 'Светящийся камень / Каменные кирпичи', count: 4 }
    },
    dimensions: '7x7x3 (С колоннами высотой 2 блока по углам)',
    description: 'Третий уровень. Добавляются 4 угол-столба высотой 2 блока со Светящимся камнем или Каменными кирпичами на вершине.'
  },
  {
    tier: 4,
    name: 'Tier IV — Большой Алтарь',
    totalRunes: 60,
    baseCapacity: 10000,
    baseTransferRate: 20,
    structures: {
      bloodAltar: 1,
      runes: 60,
      blankRuneDefault: 60,
      glowstoneOrBricks: { name: 'Светящийся камень / Каменные кирпичи', count: 4 },
      bloodBricks: { name: 'Большие кровавые кирпичи / Blood Stone Bricks', count: 4 }
    },
    dimensions: '11x11x5 (С высокими колоннами высотой 4 блока)',
    description: 'Четвертый уровень. Требует 60 рун и 4 столба из Кровавого камня высотой 4 блока с Большими кровавыми кирпичами наверху.'
  },
  {
    tier: 5,
    name: 'Tier V — Величественный Алтарь',
    totalRunes: 108,
    baseCapacity: 10000,
    baseTransferRate: 20,
    structures: {
      bloodAltar: 1,
      runes: 108,
      blankRuneDefault: 108,
      glowstoneOrBricks: { name: 'Светящийся камень', count: 4 },
      bloodBricks: { name: 'Большие кровавые кирпичи', count: 4 },
      beacons: { name: 'Маяки (Beacon)', count: 4 }
    },
    dimensions: '17x17x7 (С 4 Маяками по углам)',
    description: 'Пятый уровень. Мощный алтарь с 108 рунами и 4 активными/неактивными Маяками по самым крайним углам.'
  },
  {
    tier: 6,
    name: 'Tier VI — Древний/Высший Алтарь',
    totalRunes: 164,
    baseCapacity: 10000,
    baseTransferRate: 20,
    structures: {
      bloodAltar: 1,
      runes: 164,
      blankRuneDefault: 164,
      glowstoneOrBricks: { name: 'Светящийся камень', count: 4 },
      bloodBricks: { name: 'Большие кровавые кирпичи', count: 4 },
      beacons: { name: 'Маяки (Beacon)', count: 4 },
      crystalPillars: { name: 'Кристальные пилоны / Crystal Clusters', count: 4 }
    },
    dimensions: '23x23x9 (Максимальный уровень Blood Magic)',
    description: 'Шестой финальный уровень. Требует 164 руны и 4 Кристальных пилона (Crystal Clusters) на вершинах угловых столбов.'
  }
];

export interface BloodAltarStats {
  capacity: number;
  speedMultiplier: number;
  sacrificeBonusPct: number;
  selfSacrificeBonusPct: number;
  dislocationBonusPct: number;
  orbBonusPct: number;
  lpPerSelfSacrifice: number; // Base 200 LP per heart / use
  lpPerMobSacrifice: number; // Base 500 LP average mob
}

export function calculateBloodAltarStats(tier: number, runeCounts: Record<string, number>): BloodAltarStats {
  const tierInfo = BLOOD_MAGIC_TIERS.find(t => t.tier === tier) || BLOOD_MAGIC_TIERS[0];
  
  const speedCount = runeCounts['speed'] || 0;
  const capacityCount = runeCounts['capacity'] || 0;
  const augCapacityCount = runeCounts['augmented_capacity'] || 0;
  const sacrificeCount = runeCounts['sacrifice'] || 0;
  const selfSacrificeCount = runeCounts['self_sacrifice'] || 0;
  const dislocationCount = runeCounts['dislocation'] || 0;
  const orbCount = runeCounts['orb'] || 0;

  // 1. Calculate Capacity: Base (10,000) + (Capacity Runes * 2000), then multiplied by Aug Capacity (1 + 0.1 * aug)
  let rawCapacity = tierInfo.baseCapacity + (capacityCount * 2000);
  if (augCapacityCount > 0) {
    rawCapacity = Math.floor(rawCapacity * Math.pow(1.10, augCapacityCount));
  }

  // 2. Speed Multiplier: (1.20 ^ speedCount)
  const speedMultiplier = Math.pow(1.20, speedCount);

  // 3. Sacrifice bonus: +10% additive per rune
  const sacrificeBonusPct = sacrificeCount * 10;
  
  // 4. Self Sacrifice bonus: +10% additive per rune
  const selfSacrificeBonusPct = selfSacrificeCount * 10;

  // 5. Dislocation: +20% per rune (compound)
  const dislocationBonusPct = (Math.pow(1.20, dislocationCount) - 1) * 100;

  // 6. Orb capacity bonus: +2% per rune
  const orbBonusPct = orbCount * 2;

  // Base outputs
  const lpPerSelfSacrifice = Math.floor(200 * (1 + selfSacrificeBonusPct / 100));
  const lpPerMobSacrifice = Math.floor(500 * (1 + sacrificeBonusPct / 100));

  return {
    capacity: rawCapacity,
    speedMultiplier: parseFloat(speedMultiplier.toFixed(2)),
    sacrificeBonusPct,
    selfSacrificeBonusPct,
    dislocationBonusPct: parseFloat(dislocationBonusPct.toFixed(1)),
    orbBonusPct,
    lpPerSelfSacrifice,
    lpPerMobSacrifice
  };
}
