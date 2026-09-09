export type BlockType = 
  | 'heading' 
  | 'text' 
  | 'image' 
  | 'callout' 
  | 'multiblock' 
  | 'checklist'
  | 'divider'
  | 'section'
  | 'spoiler'
  | 'before_after'
  | 'youtube'
  | 'embed'
  | 'spreadsheet';

export type Category = 
  | 'Категория не выбрана'
  | 'ХайТек' 
  | 'Магия RPG' 
  | 'СкайБлок' 
  | 'Автоматизация' 
  | 'Крафты & Рецепты' 
  | 'Фермы & Заводы' 
  | 'Покемоны' 
  | 'Строительство' 
  | 'ПВП & Боссы' 
  | 'Общий';
export type Difficulty = 'Новичок' | 'Опытный' | 'Мастер';
export type CalloutType = 'info' | 'warning' | 'tip' | 'danger' | 'recipe' | 'note';
export type BlockSpan = 'span-1' | 'span-2' | 'span-3' | 'span-4' | 'span-6';
export type BlockAlign = 'left' | 'center' | 'right';
export type BlockVariant = 'default' | 'subtle' | 'accent' | 'bordered';

export interface PresetItem {
  id: string;
  name: string;
  mod: string;
  icon: string;
  color: string;
  defaultTooltip?: string;
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
  imageUrl?: string; // Custom texture / block image URL (default/sides)
  topImageUrl?: string; // Custom top face texture URL
  bottomImageUrl?: string; // Custom bottom face texture URL
  sideImageUrl?: string; // Custom side faces texture URL
  frontImageUrl?: string; // Custom front face texture URL
  backImageUrl?: string; // Custom back face texture URL
  leftImageUrl?: string; // Custom left face texture URL
  rightImageUrl?: string; // Custom right face texture URL
}

export interface ModelElement {
  id: string;
  name: string;
  posX: number;
  posY: number;
  posZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  color: string;
  opacity?: number;
  topImageUrl?: string;
  bottomImageUrl?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
}

export interface CustomBlockModel {
  id: string;
  name: string;
  color: string;
  description?: string;
  author?: string;
  category?: string;
  downloads?: number;
  icon?: string;
  imageUrl?: string;
  topImageUrl?: string;
  bottomImageUrl?: string;
  sideImageUrl?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  elements?: ModelElement[];
  createdAt: string;
}

export interface AuthorMediaItem {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface AssetPack {
  id: string;
  title: string;
  description: string;
  author: string;
  category: string;
  items: {
    id: string;
    name: string;
    url: string;
    type?: 'texture' | 'model';
    textures?: {
      top?: string;
      bottom?: string;
      north?: string;
      south?: string;
      east?: string;
      west?: string;
    };
  }[];
  models?: CustomBlockModel[];
  downloads: number;
  createdAt: string;
  updatedAt: string;
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
  sectionStyle?: 'card' | 'transparent';
  sectionTitle?: string; // Custom title for Section block
  fullWidth?: boolean; // If true inside section, block spans across full width (100%) below/above columns
  
  // Badge / Tag overlay
  badgeText?: string;
  badgeColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose';

  // Spoiler Block
  spoilerTitle?: string;
  spoilerContent?: string;
  isExpandedByDefault?: boolean;

  // Before / After Comparison Slider Block
  beforeImageUrl?: string;
  afterImageUrl?: string;
  beforeLabel?: string;
  afterLabel?: string;

  // YouTube Video Block
  youtubeUrl?: string;

  // Generic iFrame / Web Embed Block
  embedUrl?: string;
  embedTitle?: string;

  // Interactive Spreadsheet / Data Table Block (Google Sheets Style)
  spreadsheetTitle?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  
  anchorId?: string; // Custom anchor ID or manual link key
  showInOutline?: boolean; // Explicit toggle: force include or exclude from Table of Contents
  allowCollapsing?: boolean; // If false/true: explicitly allow or disallow collapsing in reader mode
  
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

  // Multiblock 3D Layer Painter (custom X, Y, Z dimensions)
  gridSize?: number;
  gridSizeX?: number; // Width (X axis: 1-12)
  gridSizeZ?: number; // Depth (Z axis: 1-12)
  palette?: MultiblockPaletteItem[];
  layers?: MultiblockLayer[];

  // Interactive Checklist Block
  checklistTitle?: string;
  checklistItems?: ChecklistItem[];

  // Divider Line Block (<hr>)
  dividerStyle?: 'line' | 'dashed' | 'dots';

  // Unified Multi-block Columns Container
  columns?: SectionColumn[];
  fullWidthBlocksBottom?: GuideBlock[]; // Sub-blocks displayed inside the section card below columns at 100% width
  fullWidthBlocksTop?: GuideBlock[]; // Sub-blocks displayed inside the section card above columns at 100% width

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
  published: boolean; // Опубликован ли гайд (true/false)
  isVisible: boolean; // Виден ли гайд обычным пользователям (true/false)
  status?: 'draft' | 'pending_moderation' | 'approved' | 'rejected' | 'pending_unpublish'; // Статус модерации гайда
  rejectionReason?: string;
  unpublishReason?: string;
  server?: string;
  coverUrl?: string;
  coverGradient?: string;
  variant?: BlockVariant;
  views?: number;
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

export type UserPermission =
  | 'create_guide'           // Создание собственных гайдов
  | 'edit_own_guide'         // Редактирование своих гайдов
  | 'edit_other_guide'       // Редактирование чужих гайдов
  | 'delete_own_guide'       // Удаление своих гайдов
  | 'delete_other_guide'     // Удаление чужих гайдов
  | 'publish_guide'          // Прямая публикация гайдов
  | 'unpublish_guide'        // Прямое снятие гайдов с публикации
  | 'request_unpublish'      // Отправка запроса на снятие гайда с публикации
  | 'approve_guide'          // Одобрение или отклонение модерации гайдов
  | 'manage_authors'         // Регистрация, сброс паролей и удаление авторов
  | 'manage_roles'           // Назначение ролей и кастомных прав
  | 'view_telemetry'         // Доступ к телеметрии и логам действий
  | 'view_rules'             // Просмотр страницы правил (Общие + Внутриигровые)
  | 'manage_rules';          // Управление и редактирование правил серверов

export type UserRole = 'dark_core_team' | 'dark_core_junior_team' | 'manager' | 'editor' | 'author' | 'helper' | 'guest';

export interface SystemRoleDefinition {
  role: UserRole;
  name: string;
  description: string;
  badgeColor: string;
  priority: number; // 0 = Высший приоритет (dark-core team), 999 = Низший (Читатель)
  permissions: UserPermission[];
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
  role?: UserRole;
  customPermissions?: UserPermission[];
  assignedServers?: string[]; // Сервера, за которыми закреплен автор
}
