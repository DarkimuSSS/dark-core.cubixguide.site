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

export type BlockType = 'heading' | 'text' | 'callout' | 'crafting' | 'multiblock' | 'checklist' | 'image' | 'divider' | 'section';

// 6-Column Grid Spans
export type BlockSpan = 'span-6' | 'span-3' | 'span-2' | 'span-4' | 'span-1';
export type BlockAlign = 'left' | 'center' | 'right';
export type BlockVariant = 'default' | 'subtle' | 'bordered' | 'accent';

export interface SectionColumn {
  id: string;
  span: BlockSpan; // e.g. span-4, span-2, span-3
  blocks: GuideBlock[];
}

export interface GuideBlock {
  id: string;
  type: BlockType;
  
  // 6-Column Grid & Styling Controls
  span?: BlockSpan;
  align?: BlockAlign;
  variant?: BlockVariant;

  // Content Fields
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
  imageUrl?: string;
  imageCaption?: string;
  dividerStyle?: 'line' | 'dashed' | 'dots' | 'icon';

  // Nested Multi-Block Columns (for 'section' block type)
  columns?: SectionColumn[];
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
