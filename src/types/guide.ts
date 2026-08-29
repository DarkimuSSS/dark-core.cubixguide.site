export type Category = 'ХайТек' | 'Магия RPG' | 'СкайБлок' | 'Автоматизация' | 'Общий';

export type Difficulty = 'Новичок' | 'Опытный' | 'Мастер';

export type BlockType = 
  | 'heading' 
  | 'text' 
  | 'image' 
  | 'callout' 
  | 'crafting' 
  | 'multiblock' 
  | 'checklist'
  | 'divider'
  | 'section';

// Legacy grid span widths
export type BlockSpan = 'span-1' | 'span-2' | 'span-3' | 'span-4' | 'span-6';

// Block Alignment
export type BlockAlign = 'left' | 'center' | 'right';

// Card Styling Variant
export type BlockVariant = 'default' | 'subtle' | 'accent' | 'bordered';

export interface CraftingItem {
  id: string;
  name: string;
  mod: string;
  icon: string; // Lucide icon name
  color?: string; // Icon tint color
}

export interface CraftingSlot {
  index: number;
  item: CraftingItem | null;
  count: number;
  tooltip?: string;
}

export interface MultiblockPaletteItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface MultiblockLayer {
  layerNumber: number;
  grid: (string | null)[][]; // Matrix of palette IDs
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SectionColumn {
  id: string;
  span?: BlockSpan;
  customWidth?: number; // Custom % width (e.g. 70%, 30%, 33%)
  blocks: GuideBlock[];
}

export interface GuideBlock {
  id: string;
  type: BlockType;
  span?: BlockSpan; // 1 to 6 columns out of 6
  customWidth?: number; // Freeform percentage width (15% to 100%)
  customHeight?: number; // Freeform pixel minHeight (e.g. 200px)
  align?: BlockAlign;
  variant?: BlockVariant;
  
  // Type: heading
  headingText?: string;
  headingLevel?: 'h1' | 'h2';
  
  // Type: text
  textContent?: string;
  
  // Type: callout
  calloutType?: 'info' | 'warning' | 'danger' | 'tip';
  calloutTitle?: string;
  calloutText?: string;
  
  // Type: crafting
  craftingGrid?: CraftingSlot[]; // Array of 9 slots
  craftingOutput?: CraftingSlot; // 1 output slot
  
  // Type: multiblock
  gridSize?: number; // e.g., 3 for 3x3, 5 for 5x5
  palette?: MultiblockPaletteItem[];
  layers?: MultiblockLayer[];
  
  // Type: checklist
  checklistTitle?: string;
  checklistItems?: ChecklistItem[];

  // Type: image
  imageUrl?: string;
  imageCaption?: string;

  // Type: divider (<hr>)
  dividerStyle?: 'line' | 'dots' | 'dashed';

  // Type: section (stacked columns card)
  columns?: SectionColumn[];
}

export interface GuideMeta {
  id: string;
  title: string;
  category: Category;
  author: string;
  difficulty: Difficulty;
  summary?: string;
  updatedAt: string;
  published: boolean;
  server?: string;
}

export interface Guide {
  meta: GuideMeta;
  blocks: GuideBlock[];
}

export interface AuthorProfile {
  username: string;
  avatarUrl?: string;
  bio?: string;
  server?: string;
  socialVk?: string;
  socialTg?: string;
  socialDs?: string;
  badges?: string[];
  pinnedGuideId?: string;
  updatedAt?: string;
}
