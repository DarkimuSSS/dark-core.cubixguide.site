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

export type Category = 'ХайТек' | 'Магия RPG' | 'СкайБлок' | 'Автоматизация' | 'Общий';
export type Difficulty = 'Новичок' | 'Опытный' | 'Мастер';
export type CalloutType = 'info' | 'warning' | 'tip' | 'danger';
export type BlockSpan = 'span-1' | 'span-2' | 'span-3' | 'span-4' | 'span-6';
export type BlockAlign = 'left' | 'center' | 'right';
export type BlockVariant = 'default' | 'subtle' | 'accent' | 'bordered';

export interface PresetItem {
  id: string;
  name: string;
  mod: string;
  icon: string;
  color: string;
}

export interface CraftingSlot {
  index: number;
  item: PresetItem | null;
  count: number;
  tooltip?: string;
}

export interface MultiblockLayer {
  layerNumber: number;
  grid: (string | null)[][]; // Matrix storing block IDs from palette
}

export interface MultiblockPaletteItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SectionColumn {
  id: string;
  span?: BlockSpan;
  customWidth?: number;
  blocks: GuideBlock[];
}

export interface GuideBlock {
  id: string;
  type: BlockType;
  span?: BlockSpan; // Grid column span
  customWidth?: number; // Custom percentage width (15% - 100%)
  customHeight?: number; // Custom height in pixels (90px - 1000px)
  align?: BlockAlign;
  variant?: BlockVariant;
  
  // Heading Block
  headingText?: string;
  headingLevel?: 'h1' | 'h2';
  
  // Text Block
  textContent?: string;
  
  // Image Block
  imageUrl?: string;
  imageCaption?: string;
  
  // Callout Box Block
  calloutType?: CalloutType;
  calloutTitle?: string;
  calloutText?: string;
  
  // Crafting Grid 3x3 Block
  craftingGrid?: (CraftingSlot | null)[];
  craftingOutput?: CraftingSlot;

  // Multiblock 3D Layer Painter
  gridSize?: number;
  palette?: MultiblockPaletteItem[];
  layers?: MultiblockLayer[];

  // Interactive Checklist Block
  checklistTitle?: string;
  checklistItems?: ChecklistItem[];

  // Divider Line Block (<hr>)
  dividerStyle?: 'line' | 'dashed' | 'dots';

  // Unified Multi-block Columns Container
  columns?: SectionColumn[];
}

export interface GuideMeta {
  id: string;
  title: string;
  category: Category;
  author: string;
  coAuthors?: string[]; // Collaborators and helpers
  difficulty: Difficulty;
  summary: string;
  updatedAt: string;
  published: boolean;
  server?: string;
  coverUrl?: string;
  coverGradient?: string;
}

export interface Guide {
  meta: GuideMeta;
  blocks: GuideBlock[];
}

export interface CustomAuthorLink {
  id: string;
  label: string;
  url: string;
}

export interface AuthorProfile {
  username: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  server?: string;
  socialVk?: string;
  socialTg?: string;
  socialDs?: string;
  customLinks?: CustomAuthorLink[];
  badges?: string[];
  pinnedGuideId?: string;
  updatedAt?: string;
}
