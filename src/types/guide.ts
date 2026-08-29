export type Category = 'ХайТек' | 'Магия RPG' | 'СкайБлок' | 'Автоматизация' | 'Общий';
export type Difficulty = 'Новичок' | 'Опытный' | 'Мастер';

export interface ItemDefinition {
  id: string;
  name: string;
  mod: string;
  icon: string;
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
  layerNumber: number;
  grid: (string | null)[][];
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
  headingText?: string;
  headingLevel?: 'h1' | 'h2' | 'h3';
  textContent?: string;
  calloutType?: 'tip' | 'warning' | 'danger';
  calloutTitle?: string;
  calloutText?: string;
  craftingGrid?: CraftingSlot[];
  craftingOutput?: CraftingSlot;
  gridSize?: 3 | 5;
  layers?: MultiblockLayer[];
  palette?: MultiblockMaterial[];
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
