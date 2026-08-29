export type Category = 'HiTech' | 'MagicRPG' | 'SkyBlock' | 'Automation' | 'General';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ItemDefinition {
  id: string;
  name: string;
  mod: string;
  icon: string; // Lucide icon name or symbol
  color: string;
  defaultTooltip?: string;
}

export interface CraftingSlot {
  index: number;
  item: ItemDefinition | null;
  count: number;
  tooltip?: string;
}

export interface MultiblockMaterial {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface MultiblockLayer {
  layerNumber: number; // 1 = Bottom, 2 = Middle, 3 = Top, etc.
  grid: (string | null)[][]; // 2D array of material IDs
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type BlockType = 'heading' | 'text' | 'callout' | 'crafting' | 'multiblock' | 'checklist';

export interface GuideBlock {
  id: string;
  type: BlockType;
  // Heading & Text properties
  headingText?: string;
  headingLevel?: 'h1' | 'h2' | 'h3';
  textContent?: string;
  
  // Callout Box properties
  calloutType?: 'tip' | 'warning' | 'danger';
  calloutTitle?: string;
  calloutText?: string;
  
  // Crafting Grid properties
  craftingGrid?: CraftingSlot[]; // Array of 9 slots
  craftingOutput?: CraftingSlot; // 1 output slot
  
  // Multiblock Layer Builder properties
  gridSize?: 3 | 5;
  layers?: MultiblockLayer[];
  palette?: MultiblockMaterial[];
  
  // Step Checklist properties
  checklistTitle?: string;
  checklistItems?: ChecklistItem[];
}

export interface GuideMeta {
  id: string;
  title: string;
  category: Category;
  author: string;
  difficulty: Difficulty;
  summary: string;
  updatedAt: string;
  published: boolean;
}

export interface Guide {
  meta: GuideMeta;
  blocks: GuideBlock[];
}
