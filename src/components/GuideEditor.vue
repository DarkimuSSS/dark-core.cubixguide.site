<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import CraftingSlotPicker from './CraftingSlotPicker.vue';
import ImportExportModal from './ImportExportModal.vue';
import TemplateLibraryModal from './TemplateLibraryModal.vue';
import type { Guide, GuideBlock, Category, Difficulty, CraftingSlot, BlockType, BlockSpan, BlockAlign, BlockVariant, SectionColumn } from '../types/guide';
import { PRESET_ITEMS } from '../data/presetItems';

const props = defineProps<{
  guide: Guide;
}>();

const emit = defineEmits<{
  (e: 'update:guide', guide: Guide): void;
  (e: 'toggle-preview'): void;
  (e: 'publish'): void;
  (e: 'delete'): void;
}>();

const DEFAULT_SERVERS = [
  "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
  "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", "UltraSky", 
  "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
  "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", "TechnomagicTest", 
  "SkyTech", "MagicalTech"
];

const isPickerOpen = ref(false);
const activeSlotBlockId = ref<string | null>(null);
const activeSlotIndex = ref<number | null>(null);
const isOutputSlot = ref(false);
const activeSlotData = ref<CraftingSlot | null>(null);

const isImportExportOpen = ref(false);
const isTemplateModalOpen = ref(false);
const isHelpModalOpen = ref(false);
const isTreeModalOpen = ref(false);

const serverList = ref<string[]>([...DEFAULT_SERVERS]);

const activeResizingBlockId = ref<string | null>(null);

// UNDO / REDO HISTORY STACK
const historyStack = ref<string[]>([]);
const historyIndex = ref<number>(-1);
const isHistoryNavigating = ref<boolean>(false);

const pushHistoryState = (guideState: Guide) => {
  if (isHistoryNavigating.value) return;
  const snapshot = JSON.stringify(guideState);
  if (historyStack.value[historyIndex.value] === snapshot) return;
  
  historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  historyStack.value.push(snapshot);
  if (historyStack.value.length > 30) historyStack.value.shift();
  historyIndex.value = historyStack.value.length - 1;
};

onMounted(async () => {
  pushHistoryState(props.guide);
  window.addEventListener('keydown', handleGlobalHotkeys);
  try {
    const res = await fetch('/api/servers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        serverList.value = data;
      }
    }
  } catch (err) {
    console.error('Error fetching servers in editor:', err);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalHotkeys);
});

const undoState = () => {
  if (historyIndex.value > 0) {
    isHistoryNavigating.value = true;
    historyIndex.value--;
    const restored = JSON.parse(historyStack.value[historyIndex.value]);
    emit('update:guide', restored);
    setTimeout(() => { isHistoryNavigating.value = false; }, 50);
  }
};

const redoState = () => {
  if (historyIndex.value < historyStack.value.length - 1) {
    isHistoryNavigating.value = true;
    historyIndex.value++;
    const restored = JSON.parse(historyStack.value[historyIndex.value]);
    emit('update:guide', restored);
    setTimeout(() => { isHistoryNavigating.value = false; }, 50);
  }
};

const handleGlobalHotkeys = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (e.shiftKey) redoState();
    else undoState();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    redoState();
  }
};

const categories: Category[] = ['ХайТек', 'Магия RPG', 'СкайБлок', 'Автоматизация', 'Общий'];
const difficulties: Difficulty[] = ['Новичок', 'Опытный', 'Мастер'];

// Meta Updates
const updateTitle = (val: string) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, title: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateSummary = (val: string) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, summary: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateAuthor = (val: string) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, author: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateCoAuthors = (val: string) => {
  const list = val.split(',').map(s => s.trim()).filter(Boolean);
  const updated = { ...props.guide, meta: { ...props.guide.meta, coAuthors: list } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateCategory = (val: Category) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, category: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateDifficulty = (val: Difficulty) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, difficulty: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateServerTag = (val: string) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, server: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateCoverUrl = (val: string) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, coverUrl: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const updateCoverGradient = (val: string) => {
  const updated = { ...props.guide, meta: { ...props.guide.meta, coverGradient: val } };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

// Block Operations
const updateBlock = (updatedBlock: GuideBlock) => {
  const index = props.guide.blocks.findIndex(b => b.id === updatedBlock.id);
  if (index !== -1) {
    const newBlocks = [...props.guide.blocks];
    newBlocks[index] = updatedBlock;
    const updated = { ...props.guide, blocks: newBlocks };
    emit('update:guide', updated);
    pushHistoryState(updated);
  }
};

// Extract Sub-block from Section to Top Level
const extractSubBlockFromSection = (parentSection: GuideBlock, colId: string, subBlockId: string) => {
  if (!parentSection.columns) return;
  const newBlocks = [...props.guide.blocks];
  const sectionIdx = newBlocks.findIndex(b => b.id === parentSection.id);
  if (sectionIdx === -1) return;

  let extractedBlock: GuideBlock | null = null;

  const newCols = parentSection.columns.map(col => {
    if (col.id === colId) {
      const targetSub = col.blocks.find(b => b.id === subBlockId);
      if (targetSub) {
        extractedBlock = JSON.parse(JSON.stringify(targetSub));
        extractedBlock!.id = `extracted_${Date.now()}`;
        extractedBlock!.customWidth = 100;
      }
      return { ...col, blocks: col.blocks.filter(b => b.id !== subBlockId) };
    }
    return col;
  });

  if (extractedBlock) {
    newBlocks[sectionIdx] = { ...parentSection, columns: newCols };
    newBlocks.splice(sectionIdx + 1, 0, extractedBlock);
    const updated = { ...props.guide, blocks: newBlocks };
    emit('update:guide', updated);
    pushHistoryState(updated);
  }
};

// Pack Standalone Top-Level Block into adjacent Section Block
const packBlockIntoSection = (blockIndex: number, targetSectionId: string, colId: string) => {
  const newBlocks = [...props.guide.blocks];
  const targetBlock = newBlocks[blockIndex];
  if (!targetBlock || targetBlock.type === 'section') return;

  const sectionIdx = newBlocks.findIndex(b => b.id === targetSectionId);
  if (sectionIdx === -1) return;

  const targetSection = newBlocks[sectionIdx];
  if (!targetSection.columns) return;

  const packedSubBlock: GuideBlock = {
    ...JSON.parse(JSON.stringify(targetBlock)),
    id: `packed_${Date.now()}`,
    customWidth: 100
  };

  const newCols = targetSection.columns.map(col => {
    if (col.id === colId) {
      return { ...col, blocks: [...col.blocks, packedSubBlock] };
    }
    return col;
  });

  newBlocks[sectionIdx] = { ...targetSection, columns: newCols };
  newBlocks.splice(blockIndex, 1);

  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

// Quick Clean empty blocks
const cleanEmptyBlocks = () => {
  const cleaned = props.guide.blocks.filter(b => {
    if (b.type === 'text' && !b.textContent?.trim()) return false;
    if (b.type === 'heading' && !b.headingText?.trim()) return false;
    return true;
  });
  const updated = { ...props.guide, blocks: cleaned };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

// Add / Remove Column inside Section
const addColumnToSection = (block: GuideBlock) => {
  const columns = block.columns || [];
  if (columns.length >= 4) return;
  const count = columns.length + 1;
  const equalWidth = Math.floor(100 / count);

  const newCol: SectionColumn = {
    id: `col_${Date.now()}`,
    customWidth: equalWidth,
    blocks: [
      { id: `sb_${Date.now()}`, type: 'text', textContent: 'Новая колонка...', customWidth: 100 }
    ]
  };

  const newCols = columns.map(c => ({ ...c, customWidth: equalWidth }));
  newCols.push(newCol);
  updateBlock({ ...block, columns: newCols });
};

const removeColumnFromSection = (block: GuideBlock, colIdx: number) => {
  const columns = block.columns || [];
  if (columns.length <= 1) return;
  const newCols = columns.filter((_, idx) => idx !== colIdx);
  const equalWidth = Math.floor(100 / newCols.length);
  newCols.forEach(c => c.customWidth = equalWidth);
  updateBlock({ ...block, columns: newCols });
};

// Interactive Mouse Drag Resizing for Columns inside Section
const startColumnResizing = (e: MouseEvent, sectionBlock: GuideBlock, colIdx: number) => {
  e.preventDefault();
  e.stopPropagation();

  if (!sectionBlock.columns || sectionBlock.columns.length <= colIdx + 1) return;

  const sectionEl = document.getElementById(`section-container-${sectionBlock.id}`);
  if (!sectionEl) return;

  const sectionRect = sectionEl.getBoundingClientRect();
  const startX = e.clientX;

  const col1 = sectionBlock.columns[colIdx];
  const col2 = sectionBlock.columns[colIdx + 1];

  const initialCol1Width = col1.customWidth || (col1.span === 'span-4' ? 66 : col1.span === 'span-2' ? 33 : 50);
  const initialCol2Width = col2.customWidth || (col2.span === 'span-4' ? 66 : col2.span === 'span-2' ? 33 : 50);
  const totalWidth = initialCol1Width + initialCol2Width;

  const onMouseMove = (moveEv: MouseEvent) => {
    const deltaX = moveEv.clientX - startX;
    const deltaPercent = Math.round((deltaX / sectionRect.width) * 100);

    let newCol1Width = Math.min(85, Math.max(15, initialCol1Width + deltaPercent));
    let newCol2Width = Math.max(15, totalWidth - (newCol1Width - initialCol1Width));

    const newCols = [...sectionBlock.columns!];
    newCols[colIdx] = { ...col1, customWidth: newCol1Width };
    newCols[colIdx + 1] = { ...col2, customWidth: newCol2Width };

    updateBlock({ ...sectionBlock, columns: newCols });
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

// Extended Presets for Section Columns
type SectionPreset = '80-20' | '75-25' | '70-30' | '60-40' | '50-50' | '40-60' | '30-70' | '25-75' | '20-80' | '33-33-33' | '25-50-25';

const setSectionProportions = (block: GuideBlock, preset: SectionPreset) => {
  let newCols: SectionColumn[] = block.columns ? [...block.columns] : [];

  if (preset === '80-20') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 80, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 20, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '75-25') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 75, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 25, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '70-30') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 70, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 30, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '60-40') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 60, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 40, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '50-50') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 50, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 50, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '40-60') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 40, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 60, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '30-70') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 30, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 70, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '25-75') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 25, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 75, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '20-80') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 20, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 80, blocks: newCols[1]?.blocks || [] }
    ];
  } else if (preset === '33-33-33') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 33, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 33, blocks: newCols[1]?.blocks || [] },
      { id: newCols[2]?.id || `c3_${Date.now()}`, customWidth: 33, blocks: [{ id: `sb3_${Date.now()}`, type: 'text', textContent: '3-я колонка...' }] }
    ];
  } else if (preset === '25-50-25') {
    newCols = [
      { id: newCols[0]?.id || `c1_${Date.now()}`, customWidth: 25, blocks: newCols[0]?.blocks || [] },
      { id: newCols[1]?.id || `c2_${Date.now()}`, customWidth: 50, blocks: newCols[1]?.blocks || [] },
      { id: newCols[2]?.id || `c3_${Date.now()}`, customWidth: 25, blocks: [{ id: `sb3_${Date.now()}`, type: 'image', imageUrl: '', imageCaption: 'Правая иконка' }] }
    ];
  }

  updateBlock({ ...block, columns: newCols });
};

// Convert a single standalone block into a multi-block Section Column Stack
const convertToColumnStack = (index: number, subType: BlockType = 'text') => {
  const newBlocks = [...props.guide.blocks];
  const targetBlock = newBlocks[index];

  const width = targetBlock.customWidth || 70;

  const subBlock: GuideBlock = {
    id: `sb_${Date.now()}`,
    type: subType,
    customWidth: 100,
    headingText: subType === 'heading' ? 'Второй заголовок' : undefined,
    textContent: subType === 'text' ? 'Второй блок в этой левой колонке...' : undefined,
    calloutType: 'warning',
    calloutTitle: 'Важная деталь',
    calloutText: 'Предупреждение к левой колонке',
    imageUrl: '',
    imageCaption: 'Иллюстрация'
  };

  const sectionBlock: GuideBlock = {
    id: `sec_${Date.now()}`,
    type: 'section',
    customWidth: 100,
    columns: [
      {
        id: `col_left_${Date.now()}`,
        customWidth: width >= 66 ? 70 : 50,
        blocks: [{ ...targetBlock, customWidth: 100 }, subBlock]
      },
      {
        id: `col_right_${Date.now()}`,
        customWidth: width >= 66 ? 30 : 50,
        blocks: [
          {
            id: `right_b_${Date.now()}`,
            type: 'image',
            imageUrl: '',
            imageCaption: 'Правый блок на всю высоту колонки',
            customWidth: 100
          }
        ]
      }
    ]
  };

  newBlocks[index] = sectionBlock;
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

// Mouse Drag Resizing Logic for standalone blocks
const startResizing = (e: MouseEvent, block: GuideBlock) => {
  e.preventDefault();
  e.stopPropagation();

  activeResizingBlockId.value = block.id;
  const startX = e.clientX;
  const startY = e.clientY;

  const blockEl = document.getElementById(`editor-block-${block.id}`);
  if (!blockEl) return;

  const rect = blockEl.getBoundingClientRect();
  const parentRect = blockEl.parentElement?.getBoundingClientRect() || rect;

  const initialWidthPercent = block.customWidth || Math.round((rect.width / parentRect.width) * 100);
  const initialHeightPx = block.customHeight || Math.round(rect.height);

  const onMouseMove = (moveEv: MouseEvent) => {
    const deltaX = moveEv.clientX - startX;
    const deltaY = moveEv.clientY - startY;

    const parentWidth = parentRect.width || 800;
    const newWidthPercent = Math.min(100, Math.max(15, Math.round(initialWidthPercent + (deltaX / parentWidth) * 100)));
    const newHeightPx = Math.min(1000, Math.max(90, Math.round(initialHeightPx + deltaY)));

    updateBlock({
      ...block,
      customWidth: newWidthPercent,
      customHeight: newHeightPx
    });
  };

  const onMouseUp = () => {
    activeResizingBlockId.value = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const moveBlock = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
  const newBlocks = [...props.guide.blocks];
  if (direction === 'top') {
    const [item] = newBlocks.splice(index, 1);
    newBlocks.unshift(item);
  } else if (direction === 'bottom') {
    const [item] = newBlocks.splice(index, 1);
    newBlocks.push(item);
  } else {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
  }
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const duplicateBlock = (index: number) => {
  const newBlocks = [...props.guide.blocks];
  const original = newBlocks[index];
  const copy: GuideBlock = JSON.parse(JSON.stringify(original));
  copy.id = `block_${Date.now()}`;
  newBlocks.splice(index + 1, 0, copy);
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

import ConfirmModal from './ConfirmModal.vue';

const isDeleteBlockModalOpen = ref(false);
const blockToDeleteIndex = ref<number | null>(null);

const isDeleteSubBlockModalOpen = ref(false);
const subBlockToDelete = ref<{ parentSection: GuideBlock; colId: string; subId: string } | null>(null);

const requestDeleteBlock = (index: number) => {
  blockToDeleteIndex.value = index;
  isDeleteBlockModalOpen.value = true;
};

const confirmDeleteBlock = () => {
  if (blockToDeleteIndex.value !== null) {
    deleteBlock(blockToDeleteIndex.value);
    blockToDeleteIndex.value = null;
  }
  isDeleteBlockModalOpen.value = false;
};

const requestDeleteSubBlock = (parentSection: GuideBlock, colId: string, subId: string) => {
  subBlockToDelete.value = { parentSection, colId, subId };
  isDeleteSubBlockModalOpen.value = true;
};

const confirmDeleteSubBlock = () => {
  if (subBlockToDelete.value) {
    const { parentSection, colId, subId } = subBlockToDelete.value;
    removeSubBlock(parentSection, colId, subId);
    subBlockToDelete.value = null;
  }
  isDeleteSubBlockModalOpen.value = false;
};

const deleteBlock = (index: number) => {
  if (props.guide.blocks.length <= 1) return;
  const newBlocks = [...props.guide.blocks];
  newBlocks.splice(index, 1);
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const addBlockAt = (index: number, type: BlockType) => {
  const newBlocks = [...props.guide.blocks];
  let newBlock: GuideBlock;

  switch (type) {
    case 'heading':
      newBlock = { id: `b_${Date.now()}`, type: 'heading', headingText: 'Новый раздел', headingLevel: 'h2', customWidth: 100 };
      break;
    case 'text':
      newBlock = { id: `b_${Date.now()}`, type: 'text', textContent: 'Опишите пошаговые инструкции или пояснения к гайду...', customWidth: 100 };
      break;
    case 'callout':
      newBlock = { 
        id: `b_${Date.now()}`, 
        type: 'callout', 
        calloutType: 'tip', 
        calloutTitle: 'Полезный совет', 
        calloutText: 'Добавьте важное примечание для игроков.',
        customWidth: 100
      };
      break;
    case 'crafting':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'crafting',
        customWidth: 100,
        craftingGrid: Array(9).fill(null).map((_, i) => ({ index: i, item: null, count: 1 })),
        craftingOutput: { index: 9, item: PRESET_ITEMS[0], count: 1 }
      };
      break;
    case 'multiblock':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'multiblock',
        customWidth: 100,
        gridSize: 3,
        palette: [
          { id: 'reactor_casing', name: 'Корпус реактора', icon: 'Box', color: '#475569' },
          { id: 'reactor_glass', name: 'Стекло реактора', icon: 'Grid', color: '#38bdf8' }
        ],
        layers: [
          { layerNumber: 1, grid: Array(3).fill(null).map(() => Array(3).fill('reactor_casing')) },
          { layerNumber: 2, grid: Array(3).fill(null).map(() => Array(3).fill('reactor_glass')) }
        ]
      };
      break;
    case 'checklist':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'checklist',
        customWidth: 100,
        checklistTitle: 'Чек-лист выполнения',
        checklistItems: [
          { id: 'c1', text: 'Собрать необходимые ресурсы', completed: false },
          { id: 'c2', text: 'Установить и подключить питание', completed: false }
        ]
      };
      break;
    case 'image':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'image',
        customWidth: 100,
        imageUrl: '',
        imageCaption: 'Подпись к скриншоту / иллюстрации'
      };
      break;
    case 'divider':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'divider',
        customWidth: 100,
        dividerStyle: 'line'
      };
      break;
    case 'section':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'section',
        customWidth: 100,
        columns: [
          {
            id: `col_${Date.now()}_1`,
            customWidth: 70,
            blocks: [
              { id: `sb1_${Date.now()}`, type: 'heading', headingText: 'Заголовок секции', headingLevel: 'h2', customWidth: 100 },
              { id: `sb2_${Date.now()}`, type: 'text', textContent: 'Описание шага инструкции...', customWidth: 100 }
            ]
          },
          {
            id: `col_${Date.now()}_2`,
            customWidth: 30,
            blocks: [
              { id: `sb3_${Date.now()}`, type: 'image', imageUrl: '', imageCaption: 'Иллюстрация', customWidth: 100 }
            ]
          }
        ]
      };
      break;
  }

  newBlocks.splice(index + 1, 0, newBlock);
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const handleAppendTemplate = (templateBlocks: GuideBlock[]) => {
  const newBlocks = [...props.guide.blocks, ...templateBlocks];
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const openSlotPicker = (blockId: string, slotIndex: number, isOutput: boolean = false) => {
  const findBlockRecursive = (blocks: GuideBlock[]): GuideBlock | null => {
    for (const b of blocks) {
      if (b.id === blockId) return b;
      if (b.type === 'section' && b.columns) {
        for (const col of b.columns) {
          const found = findBlockRecursive(col.blocks);
          if (found) return found;
        }
      }
    }
    return null;
  };

  const block = findBlockRecursive(props.guide.blocks);
  if (!block) return;
  
  activeSlotBlockId.value = blockId;
  activeSlotIndex.value = slotIndex;
  isOutputSlot.value = isOutput;

  if (isOutput) {
    activeSlotData.value = block.craftingOutput || { index: 9, item: null, count: 1 };
  } else {
    activeSlotData.value = block.craftingGrid?.[slotIndex] || { index: slotIndex, item: null, count: 1 };
  }

  isPickerOpen.value = true;
};

const handleSaveSlot = (updatedSlot: CraftingSlot) => {
  if (!activeSlotBlockId.value) return;

  const updateBlockRecursive = (blocks: GuideBlock[]): GuideBlock[] => {
    return blocks.map(b => {
      if (b.id === activeSlotBlockId.value) {
        const newBlock = { ...b };
        if (isOutputSlot.value) {
          newBlock.craftingOutput = updatedSlot;
        } else if (newBlock.craftingGrid) {
          const grid = [...newBlock.craftingGrid];
          grid[updatedSlot.index] = updatedSlot;
          newBlock.craftingGrid = grid;
        }
        return newBlock;
      }
      if (b.type === 'section' && b.columns) {
        return {
          ...b,
          columns: b.columns.map(col => ({
            ...col,
            blocks: updateBlockRecursive(col.blocks)
          }))
        };
      }
      return b;
    });
  };

  const newBlocks = updateBlockRecursive(props.guide.blocks);
  const updated = { ...props.guide, blocks: newBlocks };
  emit('update:guide', updated);
  pushHistoryState(updated);
};

const addChecklistItem = (block: GuideBlock) => {
  const items = [...(block.checklistItems || [])];
  items.push({ id: `chk_${Date.now()}`, text: 'Новый этап выполнения', completed: false });
  updateBlock({ ...block, checklistItems: items });
};

const removeChecklistItem = (block: GuideBlock, itemIndex: number) => {
  const items = [...(block.checklistItems || [])];
  items.splice(itemIndex, 1);
  updateBlock({ ...block, checklistItems: items });
};

const handleImageFileUpload = (e: Event, block: GuideBlock) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      updateBlock({ ...block, imageUrl: event.target.result as string });
    }
  };
  reader.readAsDataURL(file);
};

const getVariantClass = (variant?: BlockVariant) => {
  switch (variant) {
    case 'accent':
      return 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/20';
    case 'subtle':
      return 'bg-[#121416] border-[#26292d]';
    case 'bordered':
      return 'bg-[#16181a] border-2 border-cyan-500/40';
    case 'default':
    default:
      return 'bg-[#16181a] border border-[#26292d]';
  }
};

const updateSubBlock = (parentSection: GuideBlock, colId: string, subBlock: GuideBlock) => {
  if (!parentSection.columns) return;
  const newCols = parentSection.columns.map(col => {
    if (col.id === colId) {
      return {
        ...col,
        blocks: col.blocks.map(b => b.id === subBlock.id ? subBlock : b)
      };
    }
    return col;
  });
  updateBlock({ ...parentSection, columns: newCols });
};

const addSubBlock = (parentSection: GuideBlock, colId: string, type: BlockType) => {
  if (!parentSection.columns) return;
  const newSubBlock: GuideBlock = {
    id: `sb_${Date.now()}`,
    type,
    customWidth: 100,
    headingText: type === 'heading' ? 'Новый подзаголовок' : undefined,
    textContent: type === 'text' ? 'Текст подблока...' : undefined,
    calloutType: 'tip',
    calloutTitle: 'Совет',
    calloutText: 'Важная информация',
    imageUrl: '',
    imageCaption: 'Иллюстрация'
  };

  const newCols = parentSection.columns.map(col => {
    if (col.id === colId) {
      return { ...col, blocks: [...col.blocks, newSubBlock] };
    }
    return col;
  });
  updateBlock({ ...parentSection, columns: newCols });
};

const removeSubBlock = (parentSection: GuideBlock, colId: string, subId: string) => {
  if (!parentSection.columns) return;
  const newCols = parentSection.columns.map(col => {
    if (col.id === colId) {
      return { ...col, blocks: col.blocks.filter(b => b.id !== subId) };
    }
    return col;
  });
  updateBlock({ ...parentSection, columns: newCols });
};

const scrollToBlockInEditor = (id: string) => {
  const el = document.getElementById(`editor-block-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6 pb-24 relative">
    
    <!-- HIGH-FUNCTIONALITY VERTICAL FLOATING TOOLBAR DOCK -->
    <aside class="fixed top-20 right-4 z-40 bg-[#16181a]/95 backdrop-blur-md border border-[#26292d] p-2 rounded-2xl shadow-2xl flex flex-col gap-2 items-center">
      
      <!-- 1. Undo Ctrl+Z -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="undoState"
          :disabled="historyIndex <= 0"
          class="w-10 h-10 rounded-xl bg-[#121416] hover:bg-[#212429] disabled:opacity-30 text-cyan-400 border border-[#26292d] flex items-center justify-center transition-all"
        >
          <IconRenderer name="RotateCcw" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Отменить (Ctrl+Z)
          </div>
        </div>
      </div>

      <!-- 2. Redo Ctrl+Y -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="redoState"
          :disabled="historyIndex >= historyStack.length - 1"
          class="w-10 h-10 rounded-xl bg-[#121416] hover:bg-[#212429] disabled:opacity-30 text-cyan-400 border border-[#26292d] flex items-center justify-center transition-all"
        >
          <IconRenderer name="RotateCw" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Повторить (Ctrl+Y)
          </div>
        </div>
      </div>

      <div class="w-full h-[1px] bg-[#26292d] my-0.5"></div>

      <!-- 3. Layout Templates Modal -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="isTemplateModalOpen = true"
          class="w-10 h-10 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center transition-all shadow-md"
        >
          <IconRenderer name="Layout" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Библиотека шаблонов
          </div>
        </div>
      </div>

      <!-- 4. Block Tree / Structure Organizer -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="isTreeModalOpen = true"
          class="w-10 h-10 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center transition-all"
        >
          <IconRenderer name="Layers" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-purple-500/40 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Дерево и структура блоков
          </div>
        </div>
      </div>

      <!-- 5. Clean Empty Blocks -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="cleanEmptyBlocks"
          class="w-10 h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-all"
        >
          <IconRenderer name="Sparkles" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Очистить пустые блоки
          </div>
        </div>
      </div>

      <!-- 6. JSON Import/Export -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="isImportExportOpen = true"
          class="w-10 h-10 rounded-xl bg-[#121416] hover:bg-[#212429] text-dark-muted hover:text-white border border-[#26292d] flex items-center justify-center transition-all"
        >
          <IconRenderer name="FileText" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Импорт / Экспорт JSON
          </div>
        </div>
      </div>

      <!-- 7. Author Guide & Hotkeys Cheat Sheet -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="isHelpModalOpen = true"
          class="w-10 h-10 rounded-xl bg-[#121416] hover:bg-[#212429] text-cyan-400 border border-[#26292d] flex items-center justify-center transition-all"
        >
          <IconRenderer name="HelpCircle" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Шпоргалка и горячие клавиши
          </div>
        </div>
      </div>

      <!-- 8. Preview Wiki Reader -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="emit('toggle-preview')"
          class="w-10 h-10 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 flex items-center justify-center transition-all shadow-md"
        >
          <IconRenderer name="Eye" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Предпросмотр в режиме Вики
          </div>
        </div>
      </div>

      <div class="w-full h-[1px] bg-[#26292d] my-0.5"></div>

      <!-- 9. Save Guide to DB -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="emit('publish')"
          class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-lg shadow-emerald-950/50"
        >
          <IconRenderer name="Check" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Сохранить гайд в базу данных
          </div>
        </div>
      </div>

      <!-- 10. Delete Guide -->
      <div class="relative group/tool">
        <button
          type="button"
          @click="emit('delete')"
          class="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-all"
        >
          <IconRenderer name="Trash2" size="18" />
        </button>
        <div class="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/tool:flex items-center">
          <div class="bg-rose-950 border border-rose-500/50 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
            Удалить этот гайд
          </div>
        </div>
      </div>
    </aside>

    <!-- Meta Header Card -->
    <div class="bg-[#16181a] border border-[#26292d] p-6 sm:p-8 rounded-2xl shadow-xl space-y-5">
      <div class="space-y-4">
        <div>
          <label class="text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1 block">Название гайда</label>
          <input
            type="text"
            :value="guide.meta.title"
            @input="updateTitle(($event.target as HTMLInputElement).value)"
            placeholder="Назовите ваш гайд (например: Настройка МЭ Сети)..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xl sm:text-2xl font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-accent/70 transition-all placeholder:text-dark-muted/50"
          />
        </div>

        <!-- Dedicated Summary Field for Homepage Card -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <IconRenderer name="FileText" size="14" />
              Краткое описание (Отображается на карточке Главной страницы)
            </label>
            <span class="text-[10px] text-dark-muted font-mono">1-2 предложения</span>
          </div>
          <textarea
            :value="guide.meta.summary || ''"
            @input="updateSummary(($event.target as HTMLTextAreaElement).value)"
            placeholder="Опишите в 1-2 предложениях, о чем этот гайд (например: Полное руководство по призыву драконов, схемам алтарей и амулетам)..."
            rows="2"
            class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-accent text-slate-200 text-xs rounded-xl p-3 focus:outline-none transition-all placeholder:text-dark-muted/50 resize-y"
          ></textarea>
        </div>
      </div>

      <!-- Card Cover Banner & Gradient Settings -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#26292d]">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">Баннер-обложка карточки (URL)</label>
          <input
            type="text"
            :value="guide.meta.coverUrl || ''"
            @input="updateCoverUrl(($event.target as HTMLInputElement).value)"
            placeholder="https://example.com/cover.jpg..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">Или Градиент Обложки</label>
          <select
            :value="guide.meta.coverGradient || ''"
            @change="updateCoverGradient(($event.target as HTMLSelectElement).value)"
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-purple-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
          >
            <option value="">(Без пресет-градиента)</option>
            <option value="from-emerald-600 via-teal-700 to-cyan-900">Изумрудная Магия (Emerald-Teal)</option>
            <option value="from-purple-700 via-indigo-800 to-slate-950">Космическая Бездна (Purple-Indigo)</option>
            <option value="from-rose-600 via-orange-600 to-amber-700">Пламя Дракона (Dragon Fire)</option>
            <option value="from-cyan-600 via-blue-700 to-indigo-950">Арканический Лёд (Arcane Ice)</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-3 border-t border-[#26292d]">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Категория</label>
          <select
            :value="guide.meta.category"
            @change="updateCategory(($event.target as HTMLSelectElement).value as Category)"
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-accent"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Сервер CubixWorld</label>
          <select
            :value="guide.meta.server || ''"
            @change="updateServerTag(($event.target as HTMLSelectElement).value)"
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-cyan-300 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-accent"
          >
            <option value="">(Все сервера)</option>
            <option v-for="srv in serverList" :key="srv" :value="srv">{{ srv }}</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Основной Автор</label>
          <input
            type="text"
            :value="guide.meta.author"
            @input="updateAuthor(($event.target as HTMLInputElement).value)"
            placeholder="Ваш никнейм..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-accent"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5">Соавторы / Помощники</label>
          <input
            type="text"
            :value="(guide.meta.coAuthors || []).join(', ')"
            @input="updateCoAuthors(($event.target as HTMLInputElement).value)"
            placeholder="через запятую (AlexCraft, CubixFan)..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-cyan-300 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Сложность</label>
          <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-lg border border-[#26292d]">
            <button
              v-for="diff in difficulties"
              :key="diff"
              type="button"
              @click="updateDifficulty(diff)"
              :class="[
                'flex-1 py-1 rounded text-[11px] font-semibold transition-all',
                guide.meta.difficulty === diff 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                  : 'text-dark-muted hover:text-white'
              ]"
            >
              {{ diff }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Freeform Resizable Block Container (Flex Wrap with custom width % and minHeight px) -->
    <div class="flex flex-wrap gap-6 items-stretch">
      <div 
        v-for="(block, index) in guide.blocks" 
        :key="block.id"
        :id="`editor-block-${block.id}`"
        :style="{
          width: block.type === 'divider' ? '100%' : (block.customWidth ? `calc(${block.customWidth}% - 1rem)` : '100%'),
          minHeight: block.customHeight ? `${block.customHeight}px` : undefined
        }"
        :class="[
          'group relative rounded-2xl transition-all shadow-md flex flex-col justify-between select-none',
          block.type === 'divider' ? 'w-full p-2 bg-transparent shadow-none border-none' : 
          block.type === 'section' ? 'w-full p-4 bg-[#121416] border border-[#26292d]' :
          'p-5 ' + getVariantClass(block.variant),
          activeResizingBlockId === block.id ? 'ring-2 ring-emerald-400 shadow-2xl z-40' : ''
        ]"
      >
        <!-- Resizing Badge Tooltip -->
        <div v-if="activeResizingBlockId === block.id" class="absolute -top-7 right-4 bg-emerald-600 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow-lg z-50 animate-bounce">
          Ширина: {{ block.customWidth || 100 }}% | Высота: {{ block.customHeight || 'Авто' }}px
        </div>

        <!-- Divider Special Render -->
        <template v-if="block.type === 'divider'">
          <div class="py-4 relative flex items-center justify-center">
            <div class="w-full border-t border-[#26292d]"></div>
            <div class="absolute bg-[#0c0d0e] px-3 text-dark-muted flex items-center gap-2 text-xs font-mono border border-[#26292d] rounded-full">
              <IconRenderer name="Sliders" size="12" class="text-cyan-400" />
              <span>Разделитель секций</span>
            </div>
          </div>
        </template>

        <!-- Nested Section Container with Expanded Presets Toolbar & Column Management -->
        <template v-else-if="block.type === 'section'">
          <div class="flex flex-wrap items-center justify-between border-b border-[#26292d] pb-2 mb-4 gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <IconRenderer name="Layout" size="14" />
                Составная Секция
              </span>

              <!-- Expanded Preset Ratios Toolbar -->
              <div class="flex flex-wrap items-center bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d] text-[10px] gap-1">
                <button @click="setSectionProportions(block, '80-20')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">80/20</button>
                <button @click="setSectionProportions(block, '75-25')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">75/25</button>
                <button @click="setSectionProportions(block, '70-30')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">70/30</button>
                <button @click="setSectionProportions(block, '60-40')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">60/40</button>
                <button @click="setSectionProportions(block, '50-50')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">50/50</button>
                <button @click="setSectionProportions(block, '40-60')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">40/60</button>
                <button @click="setSectionProportions(block, '30-70')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">30/70</button>
                <button @click="setSectionProportions(block, '25-75')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">25/75</button>
                <button @click="setSectionProportions(block, '20-80')" class="px-1.5 py-0.5 bg-[#16181a] hover:bg-cyan-500/20 text-cyan-300 font-bold rounded">20/80</button>
                <div class="h-3 w-[1px] bg-[#26292d] mx-0.5"></div>
                <button @click="setSectionProportions(block, '33-33-33')" class="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded">3 Колонки (33x3)</button>
                <button @click="setSectionProportions(block, '25-50-25')" class="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded">25 / 50 / 25</button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button 
                @click="addColumnToSection(block)"
                class="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                title="Добавить еще одну колонку в эту секцию"
              >
                <IconRenderer name="Plus" size="12" />
                + Колонка
              </button>
              <button @click="duplicateBlock(index)" class="p-1 text-cyan-400 hover:text-cyan-300 rounded"><IconRenderer name="Copy" size="13" /></button>
              <button @click="requestDeleteBlock(index)" class="p-1 text-rose-400 hover:text-rose-300 rounded"><IconRenderer name="Trash2" size="13" /></button>
            </div>
          </div>

          <div :id="`section-container-${block.id}`" class="flex flex-wrap items-stretch w-full relative">
            <template v-for="(col, colIdx) in (block.columns || [])" :key="col.id">
              <div 
                :style="{ width: `calc(${col.customWidth || (col.span === 'span-4' ? 66 : col.span === 'span-2' ? 33 : 50)}% - 0.75rem)` }"
                class="flex flex-col gap-4 h-full justify-between bg-[#16181a] border border-[#26292d] p-4 rounded-xl shadow-md transition-all relative group/col"
              >
                <!-- Column Header & Custom % Input -->
                <div class="flex items-center justify-between border-b border-[#26292d] pb-1.5 mb-1">
                  <span class="text-[10px] text-dark-muted font-bold uppercase flex items-center gap-1">
                    Колонка #{{ colIdx + 1 }}
                    <button 
                      v-if="(block.columns?.length || 0) > 1" 
                      @click="removeColumnFromSection(block, colIdx)"
                      class="text-rose-400 hover:text-rose-300 ml-1" 
                      title="Удалить эту колонку"
                    >
                      <IconRenderer name="X" size="12" />
                    </button>
                  </span>

                  <div class="flex items-center bg-[#0c0d0e] px-1.5 py-0.5 rounded border border-[#26292d] gap-1 text-[10px]">
                    <span class="text-dark-muted">Ширина:</span>
                    <input
                      type="number"
                      min="15"
                      max="85"
                      :value="col.customWidth || (col.span === 'span-4' ? 66 : col.span === 'span-2' ? 33 : 50)"
                      @change="() => {
                        const val = Number(($event.target as HTMLInputElement).value);
                        col.customWidth = val;
                        if (block.columns && block.columns[colIdx === 0 ? 1 : 0]) {
                          block.columns[colIdx === 0 ? 1 : 0].customWidth = 100 - val;
                        }
                        updateBlock(block);
                      }"
                      class="w-8 bg-[#16181a] border border-[#26292d] text-cyan-300 font-bold text-center rounded"
                    />
                    <span class="text-cyan-400 font-bold">%</span>
                  </div>
                </div>

                <div class="space-y-4 flex-1 flex flex-col justify-between">
                  <div v-for="sub in col.blocks" :key="sub.id" class="p-3 bg-[#0c0d0e] border border-[#26292d] rounded-xl relative group/sub shadow-sm">
                    <div class="flex items-center justify-between border-b border-[#26292d] pb-1.5 mb-2 text-[10px] text-dark-muted font-bold uppercase">
                      <span>{{ sub.type }}</span>
                      
                      <div class="flex items-center gap-1.5">
                        <!-- EXTRACT SUB-BLOCK TO TOP-LEVEL BUTTON -->
                        <button
                          type="button"
                          @click="extractSubBlockFromSection(block, col.id, sub.id)"
                          class="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-[#121416] px-1.5 py-0.5 rounded border border-[#26292d]"
                          title="Извлечь блок из секции в основной список"
                        >
                          <IconRenderer name="ExternalLink" size="11" />
                          <span>Извлечь</span>
                        </button>

                        <button @click="requestDeleteSubBlock(block, col.id, sub.id)" class="text-rose-400 hover:text-rose-300"><IconRenderer name="X" size="12" /></button>
                      </div>
                    </div>

                    <div v-if="sub.type === 'heading'">
                      <input
                        type="text"
                        :value="sub.headingText"
                        @input="updateSubBlock(block, col.id, { ...sub, headingText: ($event.target as HTMLInputElement).value })"
                        placeholder="Заголовок..."
                        class="w-full bg-[#121416] border border-[#26292d] text-white text-base font-bold rounded p-2"
                      />
                    </div>

                    <div v-else-if="sub.type === 'text'">
                      <textarea
                        :value="sub.textContent"
                        @input="updateSubBlock(block, col.id, { ...sub, textContent: ($event.target as HTMLTextAreaElement).value })"
                        placeholder="Текст..."
                        rows="3"
                        class="w-full bg-[#121416] border border-[#26292d] text-slate-200 text-xs rounded p-2 resize-y"
                      ></textarea>
                    </div>

                    <div v-else-if="sub.type === 'callout'">
                      <CalloutBlock :block="sub" :is-editing="true" @update="(updated) => updateSubBlock(block, col.id, updated)" />
                    </div>

                    <div v-else-if="sub.type === 'image'" class="space-y-2">
                      <div v-if="sub.imageUrl" class="rounded border border-[#26292d] overflow-hidden bg-black/60 max-h-48 flex items-center justify-center">
                        <img :src="sub.imageUrl" class="max-h-48 object-contain" />
                      </div>
                      <input
                        type="text"
                        :value="sub.imageUrl"
                        @input="updateSubBlock(block, col.id, { ...sub, imageUrl: ($event.target as HTMLInputElement).value })"
                        placeholder="URL картинки..."
                        class="w-full bg-[#121416] border border-[#26292d] text-white text-xs rounded p-1.5"
                      />
                    </div>

                    <div v-else-if="sub.type === 'crafting'" class="p-2 bg-[#121416] rounded border border-[#26292d]">
                      <div class="text-[10px] text-emerald-400 font-bold mb-1">Крафт 3x3</div>
                      <button type="button" @click="openSlotPicker(sub.id, 9, true)" class="w-full py-2 bg-emerald-600/20 text-emerald-300 text-xs font-semibold rounded border border-emerald-500/30">
                        Настроить выходы крафта
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Add sub-block to column button -->
                <div class="pt-2 border-t border-[#26292d] flex items-center justify-between">
                  <span class="text-[10px] text-cyan-400 font-bold font-mono">{{ col.customWidth || 50 }}%</span>
                  <div class="flex items-center gap-1">
                    <button @click="addSubBlock(block, col.id, 'text')" class="px-2 py-1 bg-[#121416] border border-[#26292d] hover:border-emerald-500 text-[10px] text-slate-200 rounded font-semibold">+ Текст</button>
                    <button @click="addSubBlock(block, col.id, 'image')" class="px-2 py-1 bg-[#121416] border border-[#26292d] hover:border-pink-500 text-[10px] text-slate-200 rounded font-semibold">+ Картинка</button>
                    <button @click="addSubBlock(block, col.id, 'callout')" class="px-2 py-1 bg-[#121416] border border-[#26292d] hover:border-amber-500 text-[10px] text-slate-200 rounded font-semibold">+ Совет</button>
                  </div>
                </div>
              </div>

              <!-- Interactive Mouse Drag Column Splitter / Divider Bar -->
              <div 
                v-if="colIdx < (block.columns?.length || 0) - 1"
                @mousedown="(e) => startColumnResizing(e, block, colIdx)"
                class="w-3 mx-1 flex items-center justify-center cursor-col-resize group/splitter hover:w-4 transition-all"
                title="Зажмите мышку и двигайте влево/вправо для смены пропорций колонок"
              >
                <div class="w-1 h-12 bg-[#26292d] group-hover/splitter:bg-cyan-400 group-hover/splitter:w-1.5 rounded-full transition-all shadow-lg"></div>
              </div>
            </template>
          </div>
        </template>

        <template v-else>
          <!-- Floating Controls Bar with Custom % Input & Quick Presets & Pack into Section Action -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#26292d] pb-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-dark-muted flex items-center gap-1">
                <IconRenderer name="Box" size="14" class="text-emerald-400" />
                {{ block.type }}
              </span>

              <!-- Alignment -->
              <div class="flex items-center bg-[#0c0d0e] p-0.5 rounded border border-[#26292d]">
                <button 
                  type="button" 
                  @click="updateBlock({ ...block, align: 'left' })"
                  :class="['px-1.5 py-0.5 rounded text-[10px] font-bold', block.align === 'left' || !block.align ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-muted hover:text-white']"
                  title="По левому краю"
                >
                  L
                </button>
                <button 
                  type="button" 
                  @click="updateBlock({ ...block, align: 'center' })"
                  :class="['px-1.5 py-0.5 rounded text-[10px] font-bold', block.align === 'center' ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-muted hover:text-white']"
                  title="По центру"
                >
                  C
                </button>
                <button 
                  type="button" 
                  @click="updateBlock({ ...block, align: 'right' })"
                  :class="['px-1.5 py-0.5 rounded text-[10px] font-bold', block.align === 'right' ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-muted hover:text-white']"
                  title="По правому краю"
                >
                  R
                </button>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <!-- PACK STANDALONE BLOCK INTO SECTION -->
              <template v-if="guide.blocks.some(b => b.type === 'section')">
                <div class="relative group/pack">
                  <button
                    type="button"
                    class="px-2 py-0.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                  >
                    <IconRenderer name="FolderInput" size="12" />
                    Поместить в секцию
                  </button>

                  <div class="absolute right-0 top-full mt-1 hidden group-hover/pack:flex bg-[#16181a] border border-[#26292d] rounded-xl p-2 shadow-2xl flex-col gap-1 w-56 z-30">
                    <div class="text-[10px] text-dark-muted font-bold px-2 py-0.5">Выберите секцию:</div>
                    <template v-for="sec in guide.blocks.filter(b => b.type === 'section')" :key="sec.id">
                      <div class="text-[10px] font-semibold text-cyan-400 px-2 pt-1">Секция #{{ sec.id.slice(-4) }}</div>
                      <button
                        v-for="(col, cIdx) in (sec.columns || [])"
                        :key="col.id"
                        @click="packBlockIntoSection(index, sec.id, col.id)"
                        class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-1.5 rounded flex items-center justify-between"
                      >
                        <span>Колонка #{{ cIdx + 1 }}</span>
                        <span class="text-[10px] text-dark-muted font-mono">{{ col.customWidth || 50 }}%</span>
                      </button>
                    </template>
                  </div>
                </div>
              </template>

              <!-- Fast Stack Action -->
              <button
                type="button"
                @click="convertToColumnStack(index, 'text')"
                class="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                title="Создать стек колонку из этого блока"
              >
                <IconRenderer name="Plus" size="12" />
                +В колонку
              </button>

              <!-- Custom Width Percentage Selector / Input -->
              <div class="flex items-center bg-[#0c0d0e] px-2 py-0.5 rounded border border-[#26292d] gap-1 text-[10px]">
                <span class="text-dark-muted font-semibold">Ширина:</span>
                <input
                  type="number"
                  min="15"
                  max="100"
                  :value="block.customWidth || 100"
                  @change="updateBlock({ ...block, customWidth: Number(($event.target as HTMLInputElement).value) })"
                  class="w-10 bg-[#16181a] border border-[#26292d] text-cyan-300 font-bold text-center rounded px-1"
                />
                <span class="text-cyan-400 font-bold">%</span>
              </div>

              <!-- Quick Presets -->
              <div class="flex items-center bg-[#0c0d0e] p-0.5 rounded border border-[#26292d]">
                <button 
                  type="button"
                  @click="updateBlock({ ...block, customWidth: 100 })"
                  :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', (block.customWidth || 100) === 100 ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                >
                  100%
                </button>
                <button 
                  type="button"
                  @click="updateBlock({ ...block, customWidth: 50 })"
                  :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', block.customWidth === 50 ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                >
                  50%
                </button>
                <button 
                  type="button"
                  @click="updateBlock({ ...block, customWidth: 33 })"
                  :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', block.customWidth === 33 ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                >
                  33%
                </button>
                <button 
                  type="button"
                  @click="updateBlock({ ...block, customWidth: 66 })"
                  :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', block.customWidth === 66 ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                >
                  66%
                </button>
              </div>

              <select
                :value="block.variant || 'default'"
                @change="updateBlock({ ...block, variant: ($event.target as HTMLSelectElement).value as BlockVariant })"
                class="bg-[#0c0d0e] border border-[#26292d] text-dark-muted text-[10px] rounded px-1.5 py-0.5"
              >
                <option value="default">Обычный</option>
                <option value="subtle">Темный</option>
                <option value="accent">Акцент</option>
                <option value="bordered">Рамка</option>
              </select>

              <button
                type="button"
                @click="moveBlock(index, 'up')"
                :disabled="index === 0"
                class="p-1 text-dark-muted hover:text-white disabled:opacity-30 rounded hover:bg-[#26292d]"
                title="Переместить вверх"
              >
                <IconRenderer name="ArrowUp" size="13" />
              </button>
              <button
                type="button"
                @click="moveBlock(index, 'down')"
                :disabled="index === guide.blocks.length - 1"
                class="p-1 text-dark-muted hover:text-white disabled:opacity-30 rounded hover:bg-[#26292d]"
                title="Переместить вниз"
              >
                <IconRenderer name="ArrowDown" size="13" />
              </button>
              <button
                type="button"
                @click="duplicateBlock(index)"
                class="p-1 text-cyan-400 hover:text-cyan-300 rounded hover:bg-[#26292d]"
                title="Дублировать блок"
              >
                <IconRenderer name="Copy" size="13" />
              </button>
              <button
                type="button"
                @click="requestDeleteBlock(index)"
                :disabled="guide.blocks.length <= 1"
                class="p-1 text-rose-400 hover:text-rose-300 disabled:opacity-30 rounded hover:bg-[#26292d]"
                title="Удалить блок"
              >
                <IconRenderer name="Trash2" size="13" />
              </button>
            </div>
          </div>

          <!-- Main Block Content Body -->
          <div class="flex-1 flex flex-col justify-center">
            <!-- Block 1: Heading -->
            <div v-if="block.type === 'heading'" class="space-y-2">
              <div class="flex items-center justify-between text-xs text-dark-muted font-medium mb-1">
                <span>Заголовок раздела</span>
                <div class="flex items-center gap-1">
                  <button 
                    type="button"
                    @click="updateBlock({ ...block, headingLevel: 'h1' })"
                    :class="['px-2 py-0.5 rounded text-[10px] font-bold', block.headingLevel === 'h1' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#0c0d0e] text-dark-muted']"
                  >
                    H1
                  </button>
                  <button 
                    type="button"
                    @click="updateBlock({ ...block, headingLevel: 'h2' })"
                    :class="['px-2 py-0.5 rounded text-[10px] font-bold', block.headingLevel === 'h2' || !block.headingLevel ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#0c0d0e] text-dark-muted']"
                  >
                    H2
                  </button>
                </div>
              </div>
              <input
                type="text"
                :value="block.headingText"
                @input="updateBlock({ ...block, headingText: ($event.target as HTMLInputElement).value })"
                placeholder="Текст заголовка..."
                :class="[
                  'w-full bg-[#0c0d0e] border border-[#26292d] text-white text-lg font-bold rounded-lg px-3.5 py-2 focus:outline-none focus:border-emerald-accent/60',
                  block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
                ]"
              />
            </div>

            <!-- Block 2: Text -->
            <div v-else-if="block.type === 'text'" class="space-y-2">
              <div class="text-xs text-dark-muted font-medium">Текстовый блок</div>
              <textarea
                :value="block.textContent"
                @input="updateBlock({ ...block, textContent: ($event.target as HTMLTextAreaElement).value })"
                placeholder="Опишите подробности инструкции..."
                rows="4"
                :class="[
                  'w-full bg-[#0c0d0e] border border-[#26292d] text-slate-200 text-sm rounded-lg p-3 focus:outline-none focus:border-emerald-accent/60 resize-y h-full',
                  block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
                ]"
              ></textarea>
            </div>

            <!-- Block 3: Callout Box -->
            <div v-else-if="block.type === 'callout'" class="h-full flex flex-col justify-center">
              <CalloutBlock :block="block" :is-editing="true" @update="updateBlock" />
            </div>

            <!-- Block 4: Crafting Grid 3x3 -->
            <div v-else-if="block.type === 'crafting'" class="space-y-4">
              <div class="flex items-center justify-between text-xs text-dark-muted font-semibold uppercase tracking-wider">
                <span class="flex items-center gap-1.5 text-white">
                  <IconRenderer name="Grid" size="16" class="text-emerald-400" />
                  Сетка верстака 3x3
                </span>
              </div>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-[#0c0d0e] rounded-xl border border-[#26292d]">
                <div class="grid grid-cols-3 gap-2.5 p-3 bg-[#121416] rounded-xl border border-[#26292d]">
                  <button
                    v-for="(slot, slotIdx) in (block.craftingGrid || Array(9).fill(null))"
                    :key="slotIdx"
                    type="button"
                    @click="openSlotPicker(block.id, slotIdx, false)"
                    class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-[#26292d] bg-[#16181a] hover:border-emerald-500 flex flex-col items-center justify-center relative transition-all group shadow-inner"
                  >
                    <div v-if="slot && slot.item" class="flex flex-col items-center">
                      <IconRenderer :name="slot.item.icon" size="24" :color="slot.item.color" />
                      <span v-if="slot.count > 1" class="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-bold px-1 rounded">
                        {{ slot.count }}
                      </span>
                    </div>
                    <span v-else class="text-dark-muted/40 text-xs font-mono">+</span>
                    
                    <div v-if="slot && slot.item" class="absolute bottom-full mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div class="bg-black/90 border border-dark-border text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl">
                        {{ slot.item.name }}
                      </div>
                    </div>
                  </button>
                </div>

                <div class="text-emerald-400 flex flex-col items-center gap-1">
                  <IconRenderer name="ChevronRight" size="32" class="hidden sm:block" />
                  <IconRenderer name="ArrowDown" size="32" class="block sm:hidden" />
                </div>

                <div class="flex flex-col items-center gap-1.5">
                  <span class="text-[11px] font-semibold text-dark-muted">Результат</span>
                  <button
                    type="button"
                    @click="openSlotPicker(block.id, 9, true)"
                    class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-emerald-500/50 bg-[#16181a] hover:border-emerald-400 flex flex-col items-center justify-center relative transition-all group shadow-xl"
                  >
                    <div v-if="block.craftingOutput?.item" class="flex flex-col items-center">
                      <IconRenderer :name="block.craftingOutput.item.icon" size="32" :color="block.craftingOutput.item.color" />
                      <span v-if="(block.craftingOutput.count || 1) > 1" class="absolute bottom-1 right-1 bg-emerald-600 text-white text-[11px] font-bold px-1.5 rounded">
                        x{{ block.craftingOutput.count }}
                      </span>
                    </div>
                    <span v-else class="text-dark-muted text-xs">Выход</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Block 5: Multiblock Painter -->
            <div v-else-if="block.type === 'multiblock'">
              <LayerPainter :block="block" :is-editing="true" @update="updateBlock" />
            </div>

            <!-- Block 6: Checklist -->
            <div v-else-if="block.type === 'checklist'" class="space-y-3">
              <input
                type="text"
                :value="block.checklistTitle"
                @input="updateBlock({ ...block, checklistTitle: ($event.target as HTMLInputElement).value })"
                placeholder="Заголовок чек-листа..."
                class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-accent/60 mb-2"
              />

              <div class="space-y-2">
                <div 
                  v-for="(item, itemIdx) in (block.checklistItems || [])" 
                  :key="item.id"
                  class="flex items-center gap-2.5 bg-[#0c0d0e] p-2 rounded-lg border border-[#26292d]"
                >
                  <input
                    type="checkbox"
                    :checked="item.completed"
                    @change="() => {
                      const items = [...(block.checklistItems || [])];
                      items[itemIdx].completed = !items[itemIdx].completed;
                      updateBlock({ ...block, checklistItems: items });
                    }"
                    class="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    :value="item.text"
                    @input="($event) => {
                      const items = [...(block.checklistItems || [])];
                      items[itemIdx].text = ($event.target as HTMLInputElement).value;
                      updateBlock({ ...block, checklistItems: items });
                    }"
                    class="flex-1 bg-transparent text-xs text-white focus:outline-none"
                  />
                  <button 
                    type="button"
                    @click="removeChecklistItem(block, itemIdx)"
                    class="text-dark-muted hover:text-rose-400 p-1"
                  >
                    <IconRenderer name="X" size="14" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                @click="addChecklistItem(block)"
                class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium pt-1"
              >
                <IconRenderer name="Plus" size="14" />
                Добавить этап
              </button>
            </div>

            <!-- Block 7: Image Block -->
            <div v-else-if="block.type === 'image'" class="space-y-3">
              <div class="text-xs text-dark-muted font-medium flex items-center justify-between">
                <span>Иллюстрация / Скриншот</span>
              </div>

              <div class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-xl space-y-3">
                <div v-if="block.imageUrl" class="relative group/img rounded-lg overflow-hidden border border-[#26292d] max-h-96 flex items-center justify-center bg-black/50">
                  <img :src="block.imageUrl" :alt="block.imageCaption" class="max-h-96 object-contain rounded-lg" />
                  <button 
                    type="button"
                    @click="updateBlock({ ...block, imageUrl: '' })"
                    class="absolute top-2 right-2 bg-rose-600/80 hover:bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <IconRenderer name="X" size="16" />
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] text-dark-muted mb-1">Ссылка на картинку (URL)</label>
                    <input
                      type="text"
                      :value="block.imageUrl"
                      @input="updateBlock({ ...block, imageUrl: ($event.target as HTMLInputElement).value })"
                      placeholder="https://example.com/screenshot.png..."
                      class="w-full bg-[#121416] border border-[#26292d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-accent"
                    />
                  </div>

                  <div>
                    <label class="block text-[11px] text-dark-muted mb-1">Или Загрузить файл с ПК</label>
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleImageFileUpload($event, block)"
                      class="w-full text-xs text-dark-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] text-dark-muted mb-1">Подпись к скриншоту</label>
                  <input
                    type="text"
                    :value="block.imageCaption"
                    @input="updateBlock({ ...block, imageCaption: ($event.target as HTMLInputElement).value })"
                    placeholder="например: Алтарь призыва драконов на спавне..."
                    class="w-full bg-[#121416] border border-[#26292d] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom-Right Interactive Mouse Drag Handle -->
          <div 
            v-if="block.type !== 'divider'"
            @mousedown="(e) => startResizing(e, block)"
            class="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500/10 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-br-xl rounded-tl-lg flex items-center justify-center cursor-se-resize text-emerald-400 opacity-60 hover:opacity-100 transition-all shadow-md group/handle"
            title="Зажмите и тяните мышкой для изменения ширины и высоты блока"
          >
            <IconRenderer name="Sliders" size="12" />
          </div>

          <!-- Inline Floating "+ Add Block" -->
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div class="relative group/menu">
              <button
                type="button"
                class="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 transition-transform transform hover:scale-105"
              >
                <IconRenderer name="Plus" size="13" />
                Добавить блок
              </button>

              <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/menu:flex bg-[#16181a] border border-[#26292d] rounded-xl p-1.5 shadow-2xl flex-col gap-1 w-52 z-30">
                <button @click="addBlockAt(index, 'heading')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="FileText" size="14" class="text-cyan-400" /> Заголовок
                </button>
                <button @click="addBlockAt(index, 'text')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="Edit3" size="14" class="text-emerald-400" /> Текст
                </button>
                <button @click="addBlockAt(index, 'image')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="Box" size="14" class="text-pink-400" /> Картинка / Скриншот
                </button>
                <button @click="addBlockAt(index, 'callout')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="Lightbulb" size="14" class="text-amber-400" /> Уведомление / Совет
                </button>
                <button @click="addBlockAt(index, 'crafting')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="Grid" size="14" class="text-purple-400" /> Крафт 3x3
                </button>
                <button @click="addBlockAt(index, 'section')" class="text-left text-xs text-cyan-300 font-semibold hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="Layout" size="14" class="text-cyan-400" /> Составная Секция
                </button>
                <button @click="addBlockAt(index, 'multiblock')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="Layers" size="14" class="text-cyan-400" /> Мультиструктура
                </button>
                <button @click="addBlockAt(index, 'checklist')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                  <IconRenderer name="CheckCircle2" size="14" class="text-emerald-400" /> Чек-лист этапов
                </button>
                <button @click="addBlockAt(index, 'divider')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2 border-t border-[#26292d] pt-1.5">
                  <IconRenderer name="Sliders" size="14" class="text-slate-400" /> Разделитель (&lt;hr&gt;)
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Structure Tree / Block Organizer Modal -->
    <div v-if="isTreeModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div class="bg-[#16181a] border border-[#26292d] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <IconRenderer name="Layers" size="18" class="text-purple-400" />
            Структура блоков гайда
          </h3>
          <button @click="isTreeModalOpen = false" class="text-dark-muted hover:text-white"><IconRenderer name="X" size="18" /></button>
        </div>

        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div 
            v-for="(b, idx) in guide.blocks" 
            :key="b.id" 
            @click="scrollToBlockInEditor(b.id); isTreeModalOpen = false;"
            class="p-3 bg-[#0c0d0e] hover:bg-[#212429] border border-[#26292d] rounded-xl flex items-center justify-between cursor-pointer transition-all"
          >
            <div class="flex items-center gap-2.5 text-xs text-white">
              <span class="w-5 h-5 rounded bg-[#16181a] text-dark-muted font-mono flex items-center justify-center text-[10px] font-bold">#{{ idx + 1 }}</span>
              <span class="font-bold text-cyan-400 uppercase text-[10px]">{{ b.type }}</span>
              <span class="text-slate-300 line-clamp-1">
                {{ b.headingText || b.textContent || b.checklistTitle || b.imageCaption || 'Блок без названия' }}
              </span>
            </div>
            <span class="text-[10px] text-dark-muted font-mono bg-[#16181a] px-2 py-0.5 rounded">{{ b.customWidth || 100 }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Author Guide / Hotkeys Cheat Sheet Modal -->
    <div v-if="isHelpModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div class="bg-[#16181a] border border-[#26292d] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <IconRenderer name="HelpCircle" size="18" class="text-cyan-400" />
            Горячие клавиши и Советы Авторам
          </h3>
          <button @click="isHelpModalOpen = false" class="text-dark-muted hover:text-white"><IconRenderer name="X" size="18" /></button>
        </div>

        <div class="space-y-3 text-xs text-slate-300">
          <div class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>Отменить действие</span>
            <code class="bg-[#16181a] px-2 py-0.5 rounded text-cyan-400 font-mono">Ctrl + Z</code>
          </div>
          <div class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>Повторить отмененное</span>
            <code class="bg-[#16181a] px-2 py-0.5 rounded text-cyan-400 font-mono">Ctrl + Y</code>
          </div>
          <div class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>Интерактивный Drag-Resize</span>
            <span class="text-emerald-400">Зажать зелёный значок мышкой в углу</span>
          </div>
          <div class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>Сменить ширину колонок</span>
            <span class="text-cyan-400">Перетянуть вертикальную линию мышкой</span>
          </div>
          <div class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>Извлечь блок из секции</span>
            <span class="text-cyan-400">Кнопка «Извлечь» на шапке подблока</span>
          </div>
          <div class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>Поместить блок в секцию</span>
            <span class="text-purple-400">Кнопка «Поместить в секцию»</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Crafting Slot Picker Modal -->
    <CraftingSlotPicker
      :is-open="isPickerOpen"
      :slot="activeSlotData"
      :slot-label="isOutputSlot ? 'Результат крафта' : `Слот #${(activeSlotIndex || 0) + 1}`"
      @close="isPickerOpen = false"
      @save="handleSaveSlot"
    />

    <!-- Import & Export Modal -->
    <ImportExportModal
      :is-open="isImportExportOpen"
      :guide="guide"
      @close="isImportExportOpen = false"
      @import="(newGuide) => emit('update:guide', newGuide)"
    />

    <!-- Layout Template Library Modal -->
    <TemplateLibraryModal
      :is-open="isTemplateModalOpen"
      @close="isTemplateModalOpen = false"
      @select-template="handleAppendTemplate"
    />

    <!-- Block Deletion Confirm Modal -->
    <ConfirmModal
      :is-open="isDeleteBlockModalOpen"
      title="Удаление блока"
      message="Вы действительно хотите удалить этот блок из гайда?"
      confirm-text="Удалить блок"
      cancel-text="Отмена"
      type="danger"
      @confirm="confirmDeleteBlock"
      @cancel="isDeleteBlockModalOpen = false"
    />

    <!-- Sub-block Deletion Confirm Modal -->
    <ConfirmModal
      :is-open="isDeleteSubBlockModalOpen"
      title="Удаление элемента"
      message="Вы действительно хотите удалить этот элемент из колонки?"
      confirm-text="Удалить элемент"
      cancel-text="Отмена"
      type="danger"
      @confirm="confirmDeleteSubBlock"
      @cancel="isDeleteSubBlockModalOpen = false"
    />
  </div>
</template>
