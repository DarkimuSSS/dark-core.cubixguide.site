import type { ItemDefinition, MultiblockMaterial } from '../types/guide';

export const PRESET_ITEMS: ItemDefinition[] = [
  // Applied Energistics 2
  { id: 'ae2_me_controller', name: 'ME Controller', mod: 'Applied Energistics 2', icon: 'Cpu', color: '#8b5cf6', defaultTooltip: 'Central processing unit for ME storage networks' },
  { id: 'ae2_fluix_crystal', name: 'Fluix Crystal', mod: 'Applied Energistics 2', icon: 'Zap', color: '#a855f7', defaultTooltip: 'Resonant crystal used in network wiring and crafting' },
  { id: 'ae2_pure_certus', name: 'Pure Certus Quartz', mod: 'Applied Energistics 2', icon: 'Gem', color: '#38bdf8', defaultTooltip: 'Refined crystal for high-tier components' },
  { id: 'ae2_logic_processor', name: 'Logic Processor', mod: 'Applied Energistics 2', icon: 'CircuitBoard', color: '#eab308', defaultTooltip: 'Crafted with Gold, Redstone, and Printed Logic' },
  { id: 'ae2_engineering_processor', name: 'Engineering Processor', mod: 'Applied Energistics 2', icon: 'Cpu', color: '#06b6d4', defaultTooltip: 'Crafted with Diamond and Silicon' },
  { id: 'ae2_calculation_processor', name: 'Calculation Processor', mod: 'Applied Energistics 2', icon: 'Calculator', color: '#10b981', defaultTooltip: 'Crafted with Pure Certus and Redstone' },
  { id: 'ae2_dense_cable', name: 'ME Dense Smart Cable', mod: 'Applied Energistics 2', icon: 'Cable', color: '#ec4899', defaultTooltip: 'Carries up to 32 channels' },

  // Thermal Series / Automation
  { id: 'thermal_induction_smelter', name: 'Induction Smelter', mod: 'Thermal Expansion', icon: 'Flame', color: '#f97316', defaultTooltip: 'High-temperature alloy furnace' },
  { id: 'thermal_invar_ingot', name: 'Invar Ingot', mod: 'Thermal Series', icon: 'Shield', color: '#94a3b8', defaultTooltip: 'Blend of Iron and Nickel (2:1)' },
  { id: 'thermal_signalum_gear', name: 'Signalum Gear', mod: 'Thermal Expansion', icon: 'Cog', color: '#f43f5e', defaultTooltip: 'High-grade redstone transmission gear' },
  
  // Extreme Reactors / Mekanism
  { id: 'reactor_casing', name: 'Reactor Casing', mod: 'Extreme Reactors', icon: 'Box', color: '#64748b', defaultTooltip: 'Structural outer casing block' },
  { id: 'reactor_control_rod', name: 'Control Rod', mod: 'Extreme Reactors', icon: 'Sliders', color: '#10b981', defaultTooltip: 'Regulates reactor temperature and flux' },
  { id: 'mek_atomic_alloy', name: 'Atomic Alloy', mod: 'Mekanism', icon: 'Atom', color: '#8b5cf6', defaultTooltip: 'Refined in Metallurgic Infuser with Refined Obsidian' },

  // Vanilla / Base Items
  { id: 'vanilla_redstone', name: 'Redstone Dust', mod: 'Minecraft', icon: 'Activity', color: '#ef4444', defaultTooltip: 'Conductive redstone powder' },
  { id: 'vanilla_diamond', name: 'Diamond', mod: 'Minecraft', icon: 'Gem', color: '#06b6d4', defaultTooltip: 'Precious gemstone' },
  { id: 'vanilla_gold_ingot', name: 'Gold Ingot', mod: 'Minecraft', icon: 'Coins', color: '#eab308', defaultTooltip: 'Refined gold metal' },
  { id: 'vanilla_iron_ingot', name: 'Iron Ingot', mod: 'Minecraft', icon: 'Component', color: '#cbd5e1', defaultTooltip: 'Base structural metal' },
  { id: 'vanilla_ender_pearl', name: 'Ender Pearl', mod: 'Minecraft', icon: 'CircleDot', color: '#0d9488', defaultTooltip: 'Teleportation pearl' },
  { id: 'vanilla_obsidian', name: 'Obsidian', mod: 'Minecraft', icon: 'Square', color: '#334155', defaultTooltip: 'Blast resistant dark glass' },
  { id: 'vanilla_glass', name: 'Glass Block', mod: 'Minecraft', icon: 'Grid', color: '#94a3b8', defaultTooltip: 'Clear glass block' },
];

export const PRESET_MULTIBLOCK_MATERIALS: MultiblockMaterial[] = [
  { id: 'reactor_casing', name: 'Reactor Casing', icon: 'Box', color: '#475569' },
  { id: 'reactor_glass', name: 'Reactor Glass', icon: 'Grid', color: '#38bdf8' },
  { id: 'control_rod', name: 'Control Rod', icon: 'Sliders', color: '#10b981' },
  { id: 'fuel_rod', name: 'Fuel Rod', icon: 'Zap', color: '#f59e0b' },
  { id: 'reactor_controller', name: 'Reactor Controller', icon: 'Cpu', color: '#8b5cf6' },
  { id: 'access_port', name: 'Access Port', icon: 'ArrowDownRight', color: '#ec4899' },
  { id: 'ae2_frame', name: 'Fluix Matrix Frame', icon: 'Maximize2', color: '#a855f7' },
  { id: 'ae2_core', name: 'Quantum Core', icon: 'Disc', color: '#06b6d4' },
];
