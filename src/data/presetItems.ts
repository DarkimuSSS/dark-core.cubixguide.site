import type { ItemDefinition, MultiblockMaterial } from '../types/guide';

export const PRESET_ITEMS: ItemDefinition[] = [
  // Applied Energistics 2
  { id: 'ae2_me_controller', name: 'МЭ Контроллер', mod: 'Applied Energistics 2', icon: 'Cpu', color: '#8b5cf6', defaultTooltip: 'Центральный модуль МЭ сети' },
  { id: 'ae2_fluix_crystal', name: 'Изменчивый кристалл', mod: 'Applied Energistics 2', icon: 'Zap', color: '#a855f7', defaultTooltip: 'Резонирующий кристалл для кабелей и крафтов' },
  { id: 'ae2_pure_certus', name: 'Чистый истинный кварц', mod: 'Applied Energistics 2', icon: 'Gem', color: '#38bdf8', defaultTooltip: 'Очищенный кристалл для высоких тиров' },
  { id: 'ae2_logic_processor', name: 'Логический процессор', mod: 'Applied Energistics 2', icon: 'CircuitBoard', color: '#eab308', defaultTooltip: 'Создается из Золота, Редстоуна и Отпечатка' },
  { id: 'ae2_engineering_processor', name: 'Инженерный процессор', mod: 'Applied Energistics 2', icon: 'Cpu', color: '#06b6d4', defaultTooltip: 'Создается из Алмаза и Кремния' },
  { id: 'ae2_calculation_processor', name: 'Вычислительный процессор', mod: 'Applied Energistics 2', icon: 'Calculator', color: '#10b981', defaultTooltip: 'Создается из Истинного кварца и Редстоуна' },
  { id: 'ae2_dense_cable', name: 'МЭ Плотный умный кабель', mod: 'Applied Energistics 2', icon: 'Cable', color: '#ec4899', defaultTooltip: 'Проводит до 32 каналов' },

  // Thermal Series / Automation
  { id: 'thermal_induction_smelter', name: 'Индукционная плавильня', mod: 'Thermal Expansion', icon: 'Flame', color: '#f97316', defaultTooltip: 'Высокотемпературная печь для сплавов' },
  { id: 'thermal_invar_ingot', name: 'Инваровый слиток', mod: 'Thermal Series', icon: 'Shield', color: '#94a3b8', defaultTooltip: 'Сплав Железа и Никеля (2:1)' },
  { id: 'thermal_signalum_gear', name: 'Сигналиумовая шестерня', mod: 'Thermal Expansion', icon: 'Cog', color: '#f43f5e', defaultTooltip: 'Высококлассная редстоуновая шестерня' },
  
  // Extreme Reactors / Mekanism
  { id: 'reactor_casing', name: 'Корпус реактора', mod: 'Extreme Reactors', icon: 'Box', color: '#64748b', defaultTooltip: 'Внешний структурный блок реактора' },
  { id: 'reactor_control_rod', name: 'Управляющий стержень', mod: 'Extreme Reactors', icon: 'Sliders', color: '#10b981', defaultTooltip: 'Регулирует температуру и поток реактора' },
  { id: 'mek_atomic_alloy', name: 'Атомный сплав', mod: 'Mekanism', icon: 'Atom', color: '#8b5cf6', defaultTooltip: 'Очищается в Металлургическом обогатителе' },

  // Vanilla / Base Items
  { id: 'vanilla_redstone', name: 'Редстоуновая пыль', mod: 'Minecraft', icon: 'Activity', color: '#ef4444', defaultTooltip: 'Проводящий редстоуновый порошок' },
  { id: 'vanilla_diamond', name: 'Алмаз', mod: 'Minecraft', icon: 'Gem', color: '#06b6d4', defaultTooltip: 'Драгоценный минерал' },
  { id: 'vanilla_gold_ingot', name: 'Золотой слиток', mod: 'Minecraft', icon: 'Coins', color: '#eab308', defaultTooltip: 'Благородный металл' },
  { id: 'vanilla_iron_ingot', name: 'Железный слиток', mod: 'Minecraft', icon: 'Component', color: '#cbd5e1', defaultTooltip: 'Базовый конструкционный металл' },
  { id: 'vanilla_ender_pearl', name: 'Жемчуг Эндера', mod: 'Minecraft', icon: 'CircleDot', color: '#0d9488', defaultTooltip: 'Жемчужина телепортации' },
  { id: 'vanilla_obsidian', name: 'Обсидиан', mod: 'Minecraft', icon: 'Square', color: '#334155', defaultTooltip: 'Прочное темное стекло' },
  { id: 'vanilla_glass', name: 'Стекло', mod: 'Minecraft', icon: 'Grid', color: '#94a3b8', defaultTooltip: 'Прозрачное стекло' },
];

export const PRESET_MULTIBLOCK_MATERIALS: MultiblockMaterial[] = [
  { id: 'reactor_casing', name: 'Корпус реактора', icon: 'Box', color: '#475569' },
  { id: 'reactor_glass', name: 'Стекло реактора', icon: 'Grid', color: '#38bdf8' },
  { id: 'control_rod', name: 'Управляющий стержень', icon: 'Sliders', color: '#10b981' },
  { id: 'fuel_rod', name: 'Топливный стержень', icon: 'Zap', color: '#f59e0b' },
  { id: 'reactor_controller', name: 'Контроллер реактора', icon: 'Cpu', color: '#8b5cf6' },
  { id: 'access_port', name: 'Порт доступа', icon: 'ArrowDownRight', color: '#ec4899' },
  { id: 'ae2_frame', name: 'Каркас МЭ Матрицы', icon: 'Maximize2', color: '#a855f7' },
  { id: 'ae2_core', name: 'Квантовое ядро', icon: 'Disc', color: '#06b6d4' },
];
