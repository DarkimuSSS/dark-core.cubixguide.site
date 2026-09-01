<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import SpoilerBlock from './SpoilerBlock.vue';
import BeforeAfterSlider from './BeforeAfterSlider.vue';
import TextFormatToolbar from './TextFormatToolbar.vue';
import ImportExportModal from './ImportExportModal.vue';
import TemplateLibraryModal from './TemplateLibraryModal.vue';
import type { Guide, GuideBlock, Category, Difficulty, BlockType, BlockSpan, BlockVariant, SectionColumn } from '../types/guide';

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

const isImportExportOpen = ref(false);
const isTemplateModalOpen = ref(false);
const isHelpModalOpen = ref(false);
const isTreeModalOpen = ref(false);
const isMetaExpanded = ref(false);
const activeBlockMenuId = ref<string | null>(null);
const addBlockMenuAfterIndex = ref<number | null>(null);

const isToolbarExpanded = ref(false);

// FLOATING OUTLINE / SIDE NAVIGATION STATE
const isOutlineOpen = ref(true);
const headingOutline = computed(() => {
  const list: { id: string; title: string; level: 'h1' | 'h2' }[] = [];
  const searchHeadings = (blocks: GuideBlock[]) => {
    for (const b of blocks) {
      const isExplicitInOutline = b.showInOutline === true;
      const isExplicitOutOutline = b.showInOutline === false;

      if (!isExplicitOutOutline) {
        if (b.type === 'heading' && b.headingText?.trim()) {
          list.push({
            id: b.anchorId || b.id,
            title: b.headingText,
            level: b.headingLevel || 'h2'
          });
        } else if (isExplicitInOutline) {
          const title = b.headingText || b.checklistTitle || b.calloutTitle || b.imageCaption || `${b.type.toUpperCase()} блок`;
          list.push({
            id: b.anchorId || b.id,
            title: title,
            level: 'h2'
          });
        }
      }

      if (b.type === 'section' && b.columns) {
        b.columns.forEach(c => searchHeadings(c.blocks));
      }
    }
  };
  searchHeadings(props.guide.blocks);
  return list;
});

const scrollToHeadingBlock = (id: string) => {
  const el = document.getElementById(`editor-block-${id}`) || document.getElementById(`block-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-emerald-500');
    setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500'), 1500);
  }
};

// DRAG AND DROP STATE & HANDLERS
const draggedBlockIndex = ref<number | null>(null);
const dragOverBlockIndex = ref<number | null>(null);

const onBlockDragStart = (e: DragEvent, index: number) => {
  draggedBlockIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }
};

const onBlockDragOver = (e: DragEvent, index: number) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  dragOverBlockIndex.value = index;
};

const onBlockDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault();
  const fromIndex = draggedBlockIndex.value;
  if (fromIndex !== null && fromIndex !== targetIndex) {
    const newBlocks = [...props.guide.blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(targetIndex, 0, moved);
    const updated = { ...props.guide, blocks: newBlocks };
    emit('update:guide', updated);
    pushHistoryState(updated);
  }
  draggedBlockIndex.value = null;
  dragOverBlockIndex.value = null;
};

const onBlockDragEnd = () => {
  draggedBlockIndex.value = null;
  dragOverBlockIndex.value = null;
};

// DRAG AND DROP FOR CHECKLIST ITEMS
const draggedChecklistIdx = ref<{ blockId: string; itemIdx: number } | null>(null);
const dragOverChecklistIdx = ref<{ blockId: string; itemIdx: number } | null>(null);

const onChecklistDragStart = (e: DragEvent, block: GuideBlock, itemIdx: number) => {
  draggedChecklistIdx.value = { blockId: block.id, itemIdx };
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(itemIdx));
  }
};

const onChecklistDragOver = (e: DragEvent, block: GuideBlock, itemIdx: number) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverChecklistIdx.value = { blockId: block.id, itemIdx };
};

const onChecklistDrop = (e: DragEvent, block: GuideBlock, targetIdx: number) => {
  e.preventDefault();
  const from = draggedChecklistIdx.value;
  if (from && from.blockId === block.id && from.itemIdx !== targetIdx) {
    const items = [...(block.checklistItems || [])];
    const [moved] = items.splice(from.itemIdx, 1);
    items.splice(targetIdx, 0, moved);
    updateBlock({ ...block, checklistItems: items });
  }
  draggedChecklistIdx.value = null;
  dragOverChecklistIdx.value = null;
};

const onChecklistDragEnd = () => {
  draggedChecklistIdx.value = null;
  dragOverChecklistIdx.value = null;
};

// DRAG AND DROP FOR SECTION SUB-BLOCKS
const draggedSubBlock = ref<{ blockId: string; colId: string; subIdx: number } | null>(null);
const dragOverSubBlock = ref<{ blockId: string; colId: string; subIdx: number } | null>(null);

// DRAG AND DROP FOR SECTION COLUMNS
const draggedColIndex = ref<{ blockId: string; colIdx: number } | null>(null);
const dragOverColIndex = ref<{ blockId: string; colIdx: number } | null>(null);

const onColDragStart = (e: DragEvent, block: GuideBlock, colIdx: number) => {
  draggedColIndex.value = { blockId: block.id, colIdx };
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `col_${colIdx}`);
  }
};

const onColDragOver = (e: DragEvent, block: GuideBlock, colIdx: number) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverColIndex.value = { blockId: block.id, colIdx };
};

const onColDrop = (e: DragEvent, block: GuideBlock, targetColIdx: number) => {
  e.preventDefault();
  const from = draggedColIndex.value;
  if (from && from.blockId === block.id && from.colIdx !== targetColIdx) {
    moveColumn(block, from.colIdx, targetColIdx);
  }
  draggedColIndex.value = null;
  dragOverColIndex.value = null;
};

const onColDragEnd = () => {
  draggedColIndex.value = null;
  dragOverColIndex.value = null;
};

const moveColumn = (block: GuideBlock, fromIdx: number, toIdx: number) => {
  const columns = [...(block.columns || [])];
  if (fromIdx < 0 || fromIdx >= columns.length || toIdx < 0 || toIdx >= columns.length) return;
  const [movedCol] = columns.splice(fromIdx, 1);
  columns.splice(toIdx, 0, movedCol);
  updateBlock({ ...block, columns });
};

const onSubBlockDragStart = (e: DragEvent, block: GuideBlock, colId: string, subIdx: number) => {
  draggedSubBlock.value = { blockId: block.id, colId, subIdx };
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(subIdx));
  }
};

const onSubBlockDragOver = (e: DragEvent, block: GuideBlock, colId: string, subIdx: number) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverSubBlock.value = { blockId: block.id, colId, subIdx };
};

const onSubBlockDrop = (e: DragEvent, block: GuideBlock, targetColId: string, targetIdx: number) => {
  e.preventDefault();
  const from = draggedSubBlock.value;
  if (!from || from.blockId !== block.id) {
    draggedSubBlock.value = null;
    dragOverSubBlock.value = null;
    return;
  }

  // Same column, same position
  if (from.colId === targetColId && from.subIdx === targetIdx) {
    draggedSubBlock.value = null;
    dragOverSubBlock.value = null;
    return;
  }

  const columns = (block.columns || []).map(c => ({ ...c, blocks: [...(c.blocks || [])] }));
  const sourceCol = columns.find(c => c.id === from.colId);
  const destCol = columns.find(c => c.id === targetColId);

  if (sourceCol && destCol) {
    const [movedBlock] = sourceCol.blocks.splice(from.subIdx, 1);
    if (movedBlock) {
      const insertAt = targetIdx < 0 ? destCol.blocks.length : targetIdx;
      destCol.blocks.splice(insertAt, 0, movedBlock);
      updateBlock({ ...block, columns });
    }
  }

  draggedSubBlock.value = null;
  dragOverSubBlock.value = null;
};

const onSubBlockDragEnd = () => {
  draggedSubBlock.value = null;
  dragOverSubBlock.value = null;
};

// FLOATING TEXT FORMATTING HANDLER
const handleTextFormatSyntax = (syntax: 'bold' | 'italic' | 'code' | 'link' | 'highlight' | 'h1' | 'h2') => {
  const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
  if (!activeEl || (activeEl.tagName !== 'TEXTAREA' && activeEl.tagName !== 'INPUT')) return;

  const start = activeEl.selectionStart || 0;
  const end = activeEl.selectionEnd || 0;
  const val = activeEl.value || '';
  const selectedText = val.substring(start, end);

  let replacement = '';
  switch (syntax) {
    case 'bold':
      replacement = `**${selectedText || 'текст'}**`;
      break;
    case 'italic':
      replacement = `*${selectedText || 'текст'}*`;
      break;
    case 'code':
      replacement = `\`${selectedText || 'код'}\``;
      break;
    case 'link':
      replacement = `[${selectedText || 'текст ссылки'}](https://)`;
      break;
    case 'highlight':
      replacement = `<mark class="bg-amber-500/30 text-amber-200 px-1 rounded">${selectedText || 'выделение'}</mark>`;
      break;
  }

  activeEl.value = val.substring(0, start) + replacement + val.substring(end);
  activeEl.dispatchEvent(new Event('input', { bubbles: true }));
};

const serverList = ref<string[]>([...DEFAULT_SERVERS]);
const isEditorServerDropdownOpen = ref(false);
const editorServerSearch = ref('');

const filteredEditorServers = computed(() => {
  const q = editorServerSearch.value.toLowerCase().trim();
  if (!q) return serverList.value;
  return serverList.value.filter(s => s.toLowerCase().includes(q));
});

const getServerIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('hitech') || n.includes('industrial') || n.includes('gregtech')) return 'Zap';
  if (n.includes('magic') || n.includes('iceandfire')) return 'Sparkles';
  if (n.includes('sky') || n.includes('oneblock') || n.includes('ocean')) return 'Box';
  if (n.includes('create')) return 'Layers';
  if (n.includes('pixelmon') || n.includes('cobblemon')) return 'Grid';
  return 'Box';
};

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

  const sectionWidth = sectionEl.clientWidth;
  if (!sectionWidth) return;

  const startX = e.clientX;

  const col1 = sectionBlock.columns[colIdx];
  const col2 = sectionBlock.columns[colIdx + 1];

  const initialCol1Width = col1.customWidth || 50;
  const initialCol2Width = col2.customWidth || 50;
  const combinedWidth = initialCol1Width + initialCol2Width;

  let animationFrameId: number | null = null;
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';

  const onMouseMove = (moveEv: MouseEvent) => {
    if (animationFrameId !== null) return;

    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null;
      const deltaX = moveEv.clientX - startX;
      const deltaPercent = (deltaX / sectionWidth) * 100;

      let newCol1Width = Math.round(initialCol1Width + deltaPercent);
      if (newCol1Width < 15) newCol1Width = 15;
      if (newCol1Width > combinedWidth - 15) newCol1Width = combinedWidth - 15;

      const newCol2Width = combinedWidth - newCol1Width;

      const newCols = sectionBlock.columns!.map((col, idx) => {
        if (idx === colIdx) return { ...col, customWidth: newCol1Width };
        if (idx === colIdx + 1) return { ...col, customWidth: newCol2Width };
        return col;
      });

      updateBlock({ ...sectionBlock, columns: newCols });
    });
  };

  const onMouseUp = () => {
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
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
    imageCaption: ''
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
      newBlock = { id: `b_${Date.now()}`, type: 'heading', headingText: '', headingLevel: 'h2', customWidth: 100 };
      break;
    case 'text':
      newBlock = { id: `b_${Date.now()}`, type: 'text', textContent: '', customWidth: 100 };
      break;
    case 'callout':
      newBlock = { 
        id: `b_${Date.now()}`, 
        type: 'callout', 
        calloutType: 'tip', 
        calloutTitle: '', 
        calloutText: '',
        customWidth: 100
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
        checklistTitle: '',
        checklistItems: [
          { id: 'c1', text: '', completed: false },
          { id: 'c2', text: '', completed: false }
        ]
      };
      break;
    case 'image':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'image',
        customWidth: 100,
        imageUrl: '',
        imageCaption: ''
      };
      break;
    case 'spoiler':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'spoiler',
        customWidth: 100,
        spoilerTitle: '',
        spoilerContent: ''
      };
      break;
    case 'before_after':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'before_after',
        customWidth: 100,
        beforeImageUrl: '',
        afterImageUrl: '',
        beforeLabel: 'До',
        afterLabel: 'После'
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
              { id: `sb3_${Date.now()}`, type: 'image', imageUrl: '', imageCaption: '', customWidth: 100 }
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

const updateChecklistItemText = (block: GuideBlock, itemIndex: number, text: string) => {
  const items = [...(block.checklistItems || [])];
  if (items[itemIndex]) {
    items[itemIndex] = { ...items[itemIndex], text };
    updateBlock({ ...block, checklistItems: items });
  }
};

const toggleChecklistItem = (block: GuideBlock, itemIndex: number) => {
  const items = [...(block.checklistItems || [])];
  if (items[itemIndex]) {
    items[itemIndex] = { ...items[itemIndex], completed: !items[itemIndex].completed };
    updateBlock({ ...block, checklistItems: items });
  }
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

const updateBlockImageUrl = (block: GuideBlock, imageUrl: string) => {
  updateBlock({ ...block, imageUrl });
};

const updateBlockImageCaption = (block: GuideBlock, imageCaption: string) => {
  updateBlock({ ...block, imageCaption });
};

const updateBlockHeadingText = (block: GuideBlock, headingText: string) => {
  updateBlock({ ...block, headingText });
};

const updateBlockTextContent = (block: GuideBlock, textContent: string) => {
  updateBlock({ ...block, textContent });
};

const updateBlockAlign = (block: GuideBlock, align: 'left' | 'center' | 'right') => {
  updateBlock({ ...block, align });
};

const updateBlockWidth = (block: GuideBlock, customWidth: number) => {
  updateBlock({ ...block, customWidth });
};

const updateBlockVariant = (block: GuideBlock, variant: BlockVariant) => {
  updateBlock({ ...block, variant });
};

const updateBlockHeadingLevel = (block: GuideBlock, headingLevel: 'h1' | 'h2') => {
  updateBlock({ ...block, headingLevel });
};

const updateBlockChecklistTitle = (block: GuideBlock, checklistTitle: string) => {
  updateBlock({ ...block, checklistTitle });
};

const isBlockType = (block: GuideBlock, type: BlockType) => block.type === type;

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
    headingText: type === 'heading' ? '' : undefined,
    textContent: type === 'text' ? '' : undefined,
    calloutType: 'tip',
    calloutTitle: '',
    calloutText: '',
    imageUrl: '',
    imageCaption: ''
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

const addBottomFullSubBlock = (parentSection: GuideBlock, type: BlockType) => {
  const current = [...(parentSection.fullWidthBlocksBottom || [])];
  const newSubBlock: GuideBlock = {
    id: `bf_${Date.now()}`,
    type,
    customWidth: 100,
    headingText: type === 'heading' ? 'Подзаголовок во всю ширину' : undefined,
    textContent: type === 'text' ? 'Широкий текст под колонками...' : undefined,
    calloutType: 'tip',
    calloutTitle: 'Полезный совет',
    calloutText: 'Важное примечание во всю ширину секции',
    imageUrl: '',
    imageCaption: 'Широкое изображение'
  };
  current.push(newSubBlock);
  updateBlock({ ...parentSection, fullWidthBlocksBottom: current });
};

const removeBottomFullSubBlock = (parentSection: GuideBlock, subIdx: number) => {
  const current = [...(parentSection.fullWidthBlocksBottom || [])];
  current.splice(subIdx, 1);
  updateBlock({ ...parentSection, fullWidthBlocksBottom: current });
};

const updateBottomFullSubBlock = (parentSection: GuideBlock, subIdx: number, updatedSub: GuideBlock) => {
  const current = [...(parentSection.fullWidthBlocksBottom || [])];
  current[subIdx] = updatedSub;
  updateBlock({ ...parentSection, fullWidthBlocksBottom: current });
};

const changeBlockType = (block: GuideBlock, newType: BlockType) => {
  if (block.type === newType) return;
  const updated: GuideBlock = {
    ...block,
    type: newType,
    headingText: block.headingText || (block.type === 'text' ? block.textContent?.slice(0, 50) : undefined) || 'Заголовок',
    textContent: block.textContent || block.headingText || block.calloutText || 'Текст блока...',
    calloutTitle: block.calloutTitle || 'Уведомление',
    calloutText: block.calloutText || block.textContent || 'Содержимое уведомления',
    spoilerTitle: block.spoilerTitle || block.headingText || 'Спойлер',
    spoilerContent: block.spoilerContent || block.textContent || 'Содержимое спойлера...'
  };
  updateBlock(updated);
};

const changeSubBlockType = (parentSection: GuideBlock, colId: string, subBlock: GuideBlock, newType: BlockType) => {
  if (subBlock.type === newType) return;
  const updatedSub: GuideBlock = {
    ...subBlock,
    type: newType,
    headingText: subBlock.headingText || (subBlock.type === 'text' ? subBlock.textContent?.slice(0, 40) : undefined) || 'Подзаголовок',
    textContent: subBlock.textContent || subBlock.headingText || subBlock.calloutText || 'Текст...',
    calloutTitle: subBlock.calloutTitle || 'Совет',
    calloutText: subBlock.calloutText || subBlock.textContent || 'Содержимое совета',
    spoilerTitle: subBlock.spoilerTitle || subBlock.headingText || 'Спойлер',
    spoilerContent: subBlock.spoilerContent || subBlock.textContent || 'Содержимое спойлера'
  };
  updateSubBlock(parentSection, colId, updatedSub);
};

const scrollToBlockInEditor = (id: string) => {
  const el = document.getElementById(`editor-block-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};
</script>

<template>
  <div class="max-w-6xl ml-auto mr-4 pl-16 pb-32 relative" @click="activeBlockMenuId = null; addBlockMenuAfterIndex = null">
    
    <!-- VERTICAL FLOATING TOOLBAR DOCK (left side) -->
    <aside 
      :class="[
        'fixed top-20 left-4 z-40 bg-[#16181a]/95 backdrop-blur-xl border border-[#26292d] rounded-2xl shadow-2xl transition-all duration-300 flex flex-col',
        isToolbarExpanded ? 'w-48 p-3' : 'w-14 p-2 items-center'
      ]"
    >
      <!-- Header / Expand Toggle -->
      <button 
        type="button" 
        @click="isToolbarExpanded = !isToolbarExpanded" 
        :class="[
          'rounded-xl bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-slate-400 hover:text-white flex items-center transition-all group shrink-0',
          isToolbarExpanded ? 'w-full h-9 px-3 justify-between text-[11px] font-bold' : 'w-10 h-10 justify-center'
        ]"
        :title="isToolbarExpanded ? 'Свернуть панель' : 'Развернуть панель'"
      >
        <span v-if="isToolbarExpanded" class="text-slate-300 uppercase text-[10px] tracking-wider font-extrabold">Инструменты</span>
        <IconRenderer 
          :name="isToolbarExpanded ? 'ChevronLeft' : 'Maximize2'" 
          size="16" 
          class="text-cyan-400 group-hover:scale-110 transition-transform shrink-0" 
        />
      </button>

      <div class="w-full h-px bg-[#26292d] my-1.5 shrink-0"></div>

      <!-- Scrollable Tools List inside dock -->
      <div class="space-y-1.5 overflow-y-auto custom-scrollbar max-h-[calc(100vh-12rem)] pr-0.5">
        
        <!-- Undo / Redo Row -->
        <div :class="['flex items-center gap-1.5', isToolbarExpanded ? 'w-full' : 'flex-col']">
          <div class="relative group/tool flex-1 w-full">
            <button type="button" @click="undoState" :disabled="historyIndex <= 0" :class="['rounded-xl bg-[#121416] hover:bg-[#212429] disabled:opacity-30 text-cyan-400 border border-[#26292d] flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
              <IconRenderer name="RotateCcw" size="18" class="shrink-0" />
              <span v-if="isToolbarExpanded" class="text-xs font-semibold text-slate-200">Отменить</span>
            </button>
            <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
              <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Отменить (Ctrl+Z)</div>
            </div>
          </div>

          <div class="relative group/tool flex-1 w-full">
            <button type="button" @click="redoState" :disabled="historyIndex >= historyStack.length - 1" :class="['rounded-xl bg-[#121416] hover:bg-[#212429] disabled:opacity-30 text-cyan-400 border border-[#26292d] flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
              <IconRenderer name="RotateCw" size="18" class="shrink-0" />
              <span v-if="isToolbarExpanded" class="text-xs font-semibold text-slate-200">Повторить</span>
            </button>
            <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
              <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Повторить (Ctrl+Y)</div>
            </div>
          </div>
        </div>

        <div class="w-full h-px bg-[#26292d] my-1"></div>

        <!-- Add New Block Plus Button -->
        <div class="relative group/tool">
          <button
            type="button"
            @click.stop="addBlockMenuAfterIndex = (addBlockMenuAfterIndex === -1 ? null : -1); activeBlockMenuId = null"
            :class="['rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center transition-all shadow-lg shadow-emerald-950/50 cursor-pointer', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start font-bold w-full' : 'w-10 h-10 justify-center shrink-0']"
          >
            <IconRenderer name="Plus" size="20" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-bold">Новый блок</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Добавить новый блок</div>
          </div>

          <!-- Add block dropdown from sidebar -->
          <div v-if="addBlockMenuAfterIndex === -1" @click.stop class="absolute left-full top-0 ml-3 z-50 bg-[#16181a] border border-[#26292d] rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 w-56">
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'heading'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="FileText" size="14" class="text-cyan-400 shrink-0" />Заголовок</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'text'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Edit3" size="14" class="text-emerald-400 shrink-0" />Текст</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'image'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Image" size="14" class="text-pink-400 shrink-0" />Картинка</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'callout'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Lightbulb" size="14" class="text-amber-400 shrink-0" />Совет / Уведомление</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'checklist'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="CheckCircle2" size="14" class="text-emerald-400 shrink-0" />Чек-лист</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'spoiler'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="HelpCircle" size="14" class="text-cyan-400 shrink-0" />Спойлер / Аккордеон</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'before_after'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Maximize2" size="14" class="text-emerald-400 shrink-0" />Слайдер До / После</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'section'); addBlockMenuAfterIndex = null" class="text-left text-xs text-cyan-300 font-semibold hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Layout" size="14" class="text-cyan-400 shrink-0" />Секция с колонками</button>
            <button @click="addBlockAt(props.guide.blocks.length - 1, 'multiblock'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Layers" size="14" class="text-cyan-400 shrink-0" />Мультиструктура</button>
            <div class="border-t border-[#26292d] mt-0.5 pt-0.5">
              <button @click="addBlockAt(props.guide.blocks.length - 1, 'divider'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-400 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5 w-full"><IconRenderer name="Minus" size="14" class="text-slate-500 shrink-0" />Разделитель</button>
            </div>
          </div>
        </div>

        <div class="w-full h-px bg-[#26292d] my-1"></div>

        <!-- Templates Button -->
        <div class="relative group/tool">
          <button type="button" @click.stop="isTemplateModalOpen = true" :class="['rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="Layout" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold text-cyan-300">Шаблоны</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Библиотека шаблонов</div>
          </div>
        </div>

        <!-- Structure Tree Button -->
        <div class="relative group/tool">
          <button type="button" @click.stop="isTreeModalOpen = true" :class="['rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="Layers" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold text-purple-300">Структура</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-purple-500/40 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Структура блоков</div>
          </div>
        </div>

        <!-- Outline Navigation Button -->
        <div class="relative group/tool">
          <button type="button" @click.stop="isOutlineOpen = !isOutlineOpen" :class="['rounded-xl border flex items-center transition-all', isOutlineOpen ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-[#121416] hover:bg-[#212429] text-dark-muted hover:text-white border-[#26292d]', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="List" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold">Содержание</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Содержание / Навигация</div>
          </div>
        </div>

        <!-- Clean Empty Blocks -->
        <div class="relative group/tool">
          <button type="button" @click="cleanEmptyBlocks" :class="['rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="Sparkles" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold text-amber-300">Очистить</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Очистить пустые блоки</div>
          </div>
        </div>

        <!-- Import / Export JSON -->
        <div class="relative group/tool">
          <button type="button" @click.stop="isImportExportOpen = true" :class="['rounded-xl bg-[#121416] hover:bg-[#212429] text-dark-muted hover:text-white border border-[#26292d] flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="FileText" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold">Импорт/Экспорт</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Импорт / Экспорт JSON</div>
          </div>
        </div>

        <!-- Hotkeys Help -->
        <div class="relative group/tool">
          <button type="button" @click.stop="isHelpModalOpen = true" :class="['rounded-xl bg-[#121416] hover:bg-[#212429] text-cyan-400 border border-[#26292d] flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="HelpCircle" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold text-cyan-400">Горячие клавиши</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Горячие клавиши</div>
          </div>
        </div>

        <div class="w-full h-px bg-[#26292d] my-1"></div>

        <!-- Preview Toggle -->
        <div class="relative group/tool">
          <button type="button" @click="emit('toggle-preview')" :class="['rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 flex items-center transition-all shadow-md', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="Eye" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold text-cyan-300">Предпросмотр</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Предпросмотр</div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="relative group/tool">
          <button type="button" @click="emit('publish')" :class="['rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center transition-all shadow-lg shadow-emerald-950/50', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start font-bold w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="Check" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-bold">Сохранить</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Сохранить гайд</div>
          </div>
        </div>

        <!-- Delete Button -->
        <div class="relative group/tool">
          <button type="button" @click="emit('delete')" :class="['rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center transition-all', isToolbarExpanded ? 'h-10 px-3 gap-2.5 justify-start w-full' : 'w-10 h-10 justify-center shrink-0']">
            <IconRenderer name="Trash2" size="18" class="shrink-0" />
            <span v-if="isToolbarExpanded" class="text-xs font-semibold text-rose-400">Удалить</span>
          </button>
          <div v-if="!isToolbarExpanded" class="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/tool:flex items-center pointer-events-none z-50">
            <div class="bg-rose-950 border border-rose-500/50 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">Удалить гайд</div>
          </div>
        </div>

      </div>
    </aside>

    <!-- FLOATING OUTLINE NAVIGATION SIDEBAR -->
    <transition name="fade">
      <div
        v-if="isOutlineOpen && headingOutline.length > 0"
        class="fixed top-20 left-20 z-40 w-60 bg-[#16181a]/95 backdrop-blur-md border border-[#26292d] rounded-2xl p-4 shadow-2xl max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar space-y-3 hidden xl:block"
      >
        <div class="flex items-center justify-between border-b border-[#26292d] pb-2">
          <div class="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <IconRenderer name="List" size="14" />
            Содержание
          </div>
          <button @click="isOutlineOpen = false" class="text-dark-muted hover:text-white"><IconRenderer name="X" size="14" /></button>
        </div>
        <div class="space-y-1">
          <div
            v-for="h in headingOutline" :key="h.id"
            @click="scrollToHeadingBlock(h.id)"
            :class="['cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all truncate hover:bg-emerald-500/10 hover:text-emerald-300', h.level === 'h1' ? 'text-white font-bold border-l-2 border-emerald-500 pl-2' : 'text-slate-400 pl-4']"
            :title="h.title"
          >
            {{ h.title }}
          </div>
        </div>
      </div>
    </transition>

    <!-- ═══════════════════════════════════════════ -->
    <!-- META CARD: Title + Summary always visible  -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="bg-[#16181a] border border-[#26292d] rounded-2xl shadow-xl overflow-hidden mb-6 mt-4">

      <!-- Always visible: Title & Summary -->
      <div class="p-6 space-y-4">
        <input
          type="text"
          :value="guide.meta.title"
          @input="updateTitle(($event.target as HTMLInputElement).value)"
          placeholder="Название гайда..."
          class="w-full bg-transparent text-white text-2xl sm:text-3xl font-bold focus:outline-none placeholder:text-dark-muted/40 border-b border-transparent focus:border-[#26292d] transition-all pb-1"
        />
        <textarea
          :value="guide.meta.summary || ''"
          @input="updateSummary(($event.target as HTMLTextAreaElement).value)"
          placeholder="Краткое описание для главной страницы..."
          rows="2"
          class="w-full bg-transparent text-slate-400 text-sm focus:outline-none placeholder:text-dark-muted/40 resize-none"
        ></textarea>
      </div>

      <!-- Toggle button -->
      <button
        type="button"
        @click.stop="isMetaExpanded = !isMetaExpanded"
        class="w-full flex items-center justify-between px-6 py-3 border-t border-[#26292d] text-xs text-dark-muted hover:text-white hover:bg-[#1a1c1f] transition-all"
      >
        <span class="flex items-center gap-2 font-semibold">
          <IconRenderer name="Settings" size="14" />
          Настройки гайда (автор, сервер, категория, обложка)
        </span>
        <IconRenderer :name="isMetaExpanded ? 'ChevronUp' : 'ChevronDown'" size="14" />
      </button>

      <!-- Collapsible meta settings -->
      <transition name="meta-expand">
        <div v-if="isMetaExpanded" class="p-6 pt-4 border-t border-[#26292d] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Cover URL -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">Баннер-обложка (URL)</label>
            <input type="text" :value="guide.meta.coverUrl || ''" @input="updateCoverUrl(($event.target as HTMLInputElement).value)" placeholder="https://..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400" />
          </div>
          <!-- Cover gradient -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1.5">Или Градиент Обложки</label>
            <select :value="guide.meta.coverGradient || ''" @change="updateCoverGradient(($event.target as HTMLSelectElement).value)" class="w-full bg-[#0c0d0e] border border-[#26292d] text-purple-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400">
              <option value="">(Без пресет-градиента)</option>
              <option value="from-emerald-600 via-teal-700 to-cyan-900">Изумрудная Магия</option>
              <option value="from-purple-700 via-indigo-800 to-slate-950">Космическая Бездна</option>
              <option value="from-rose-600 via-orange-600 to-amber-700">Пламя Дракона</option>
              <option value="from-cyan-600 via-blue-700 to-indigo-950">Арканический Лёд</option>
            </select>
          </div>
          <!-- Author -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Основной Автор</label>
            <input type="text" :value="guide.meta.author" @input="updateAuthor(($event.target as HTMLInputElement).value)" placeholder="Ваш никнейм..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-accent" />
          </div>
          <!-- Co-authors -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5">Соавторы</label>
            <input type="text" :value="(guide.meta.coAuthors || []).join(', ')" @input="updateCoAuthors(($event.target as HTMLInputElement).value)" placeholder="через запятую..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-cyan-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500" />
          </div>
          <!-- Category -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Категория</label>
            <select :value="guide.meta.category" @change="updateCategory(($event.target as HTMLSelectElement).value as Category)" class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-accent">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <!-- Server -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Сервер CubixWorld</label>
            <div class="relative">
              <button type="button" @click.stop="isEditorServerDropdownOpen = !isEditorServerDropdownOpen" class="w-full bg-[#0c0d0e] border border-[#26292d] hover:border-emerald-500/50 text-xs font-bold rounded-lg px-3 py-2 flex items-center justify-between transition-all">
                <span :class="guide.meta.server ? 'text-cyan-300' : 'text-dark-muted'">{{ guide.meta.server || '(Все сервера)' }}</span>
                <IconRenderer name="ChevronDown" size="14" :class="['text-dark-muted transition-transform', isEditorServerDropdownOpen ? 'rotate-180' : '']" />
              </button>
              <div v-if="isEditorServerDropdownOpen" class="absolute top-full left-0 mt-1 bg-[#16181a] border border-[#26292d] rounded-xl shadow-2xl p-2 z-50 space-y-1 w-full">
                <input type="text" v-model="editorServerSearch" placeholder="Поиск..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-lg px-3 py-1.5 mb-1 focus:outline-none" />
                <div class="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  <button @click="updateServerTag(''); isEditorServerDropdownOpen = false" class="text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#212429] border border-[#26292d]">(Все)</button>
                  <button v-for="srv in filteredEditorServers" :key="srv" @click="updateServerTag(srv); isEditorServerDropdownOpen = false" :class="['text-left px-2 py-1.5 rounded-lg text-xs font-semibold truncate', guide.meta.server === srv ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-[#212429] border border-[#26292d]']">{{ srv }}</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Difficulty -->
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Сложность</label>
            <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-lg border border-[#26292d]">
              <button v-for="diff in difficulties" :key="diff" type="button" @click="updateDifficulty(diff)" :class="['flex-1 py-1 rounded text-[11px] font-semibold transition-all', guide.meta.difficulty === diff ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-dark-muted hover:text-white']">{{ diff }}</button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ════════════════════════════ -->
    <!-- BLOCKS CANVAS (Notion-style) -->
    <!-- ════════════════════════════ -->
    <div class="space-y-1">

      <!-- First "+ Add block" line (before all blocks) -->
      <div class="relative group/addfirst h-6 flex items-center">
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-transparent group-hover/addfirst:bg-[#26292d] transition-colors"></div>
        <button
          type="button"
          @click.stop="addBlockMenuAfterIndex = -1; activeBlockMenuId = null"
          class="relative z-10 mx-auto opacity-0 group-hover/addfirst:opacity-100 transition-opacity bg-[#26292d] hover:bg-emerald-600 text-dark-muted hover:text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md"
        >
          <IconRenderer name="Plus" size="14" />
        </button>
        <!-- Add block menu -->
        <div v-if="addBlockMenuAfterIndex === -1" @click.stop class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-[#16181a] border border-[#26292d] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 w-52">
          <button @click="addBlockAt(-1, 'heading'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="FileText" size="14" class="text-cyan-400 shrink-0" />Заголовок</button>
          <button @click="addBlockAt(-1, 'text'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Edit3" size="14" class="text-emerald-400 shrink-0" />Текст</button>
          <button @click="addBlockAt(-1, 'image'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Image" size="14" class="text-pink-400 shrink-0" />Картинка</button>
          <button @click="addBlockAt(-1, 'callout'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Lightbulb" size="14" class="text-amber-400 shrink-0" />Совет / Уведомление</button>
          <button @click="addBlockAt(-1, 'checklist'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="CheckCircle2" size="14" class="text-emerald-400 shrink-0" />Чек-лист</button>
          <button @click="addBlockAt(-1, 'spoiler'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="HelpCircle" size="14" class="text-cyan-400 shrink-0" />Спойлер / Аккордеон</button>
          <button @click="addBlockAt(-1, 'before_after'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Maximize2" size="14" class="text-emerald-400 shrink-0" />Слайдер До / После</button>
          <button @click="addBlockAt(-1, 'section'); addBlockMenuAfterIndex = null" class="text-left text-xs text-cyan-300 font-semibold hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Layout" size="14" class="text-cyan-400 shrink-0" />Секция с колонками</button>
          <button @click="addBlockAt(-1, 'multiblock'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Layers" size="14" class="text-cyan-400 shrink-0" />Мультиструктура</button>
          <div class="border-t border-[#26292d] mt-0.5 pt-0.5">
            <button @click="addBlockAt(-1, 'divider'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-400 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5 w-full"><IconRenderer name="Minus" size="14" class="text-slate-500 shrink-0" />Разделитель</button>
          </div>
        </div>
      </div>

      <!-- BLOCK LOOP -->
      <template v-for="(block, index) in guide.blocks" :key="block.id">

        <!-- THE BLOCK ITSELF -->
        <div
          :id="`editor-block-${block.id}`"
          @dragover="onBlockDragOver($event, index)"
          @drop="onBlockDrop($event, index)"
          @dragend="onBlockDragEnd"
          :class="[
            'group/block relative transition-all rounded-xl w-full',
            draggedBlockIndex === index ? 'opacity-40' : '',
            dragOverBlockIndex === index ? 'ring-2 ring-emerald-500/60' : ''
          ]"
        >
          <!-- LEFT CONTROLS (hover) — grip + context menu trigger (absolutely positioned on the left gutter) -->
          <div v-if="block.type !== 'divider'" class="absolute -left-9 top-2 flex flex-col items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity z-20">
            <!-- Drag grip -->
            <div
              draggable="true"
              @dragstart="onBlockDragStart($event, index)"
              class="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-[#26292d] text-dark-muted hover:text-cyan-400 transition-colors"
              title="Зажмите и потяните для перемещения блока"
            >
              <IconRenderer name="GripVertical" size="15" />
            </div>
            <!-- Context menu button -->
            <div class="relative">
              <button
                type="button"
                @click.stop="activeBlockMenuId = activeBlockMenuId === block.id ? null : block.id"
                class="p-1 rounded-lg hover:bg-[#26292d] text-dark-muted hover:text-slate-300 transition-colors"
                title="Действия с блоком"
              >
                <IconRenderer name="MoreVertical" size="15" />
              </button>
              <!-- Context dropdown -->
              <div
                v-if="activeBlockMenuId === block.id"
                @click.stop
                class="absolute left-full top-0 ml-1 z-50 bg-[#16181a] border border-[#26292d] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 w-48"
              >
                <!-- Change Block Type selector -->
                <div class="relative group/typechange">
                  <button type="button" class="w-full text-left text-xs text-amber-300 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center justify-between">
                    <span class="flex items-center gap-2">
                      <IconRenderer name="RefreshCw" size="14" class="text-amber-400 shrink-0" />
                      Сменить тип
                    </span>
                    <span class="text-[10px] text-dark-muted font-bold">▸</span>
                  </button>
                  <div class="absolute left-full top-0 ml-1 hidden group-hover/typechange:flex flex-col bg-[#16181a] border border-[#26292d] rounded-xl shadow-2xl p-1.5 gap-0.5 w-44 z-50">
                    <button @click="changeBlockType(block, 'heading'); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-2.5 py-1.5 rounded-lg flex items-center gap-2"><IconRenderer name="FileText" size="13" class="text-cyan-400" />Заголовок</button>
                    <button @click="changeBlockType(block, 'text'); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-2.5 py-1.5 rounded-lg flex items-center gap-2"><IconRenderer name="Edit3" size="13" class="text-emerald-400" />Текст</button>
                    <button @click="changeBlockType(block, 'callout'); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-2.5 py-1.5 rounded-lg flex items-center gap-2"><IconRenderer name="Lightbulb" size="13" class="text-amber-400" />Совет / Callout</button>
                    <button @click="changeBlockType(block, 'spoiler'); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-2.5 py-1.5 rounded-lg flex items-center gap-2"><IconRenderer name="HelpCircle" size="13" class="text-cyan-400" />Спойлер</button>
                    <button @click="changeBlockType(block, 'checklist'); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-2.5 py-1.5 rounded-lg flex items-center gap-2"><IconRenderer name="CheckCircle2" size="13" class="text-emerald-400" />Чек-лист</button>
                    <button @click="changeBlockType(block, 'image'); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-2.5 py-1.5 rounded-lg flex items-center gap-2"><IconRenderer name="Image" size="13" class="text-pink-400" />Картинка</button>
                  </div>
                </div>

                <button @click="duplicateBlock(index); activeBlockMenuId = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5">
                  <IconRenderer name="Copy" size="14" class="text-cyan-400 shrink-0" />Дублировать
                </button>
                <button @click="moveBlock(index, 'up'); activeBlockMenuId = null" :disabled="index === 0" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5 disabled:opacity-30">
                  <IconRenderer name="ArrowUp" size="14" class="text-slate-400 shrink-0" />Переместить вверх
                </button>
                <button @click="moveBlock(index, 'down'); activeBlockMenuId = null" :disabled="index === guide.blocks.length - 1" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5 disabled:opacity-30">
                  <IconRenderer name="ArrowDown" size="14" class="text-slate-400 shrink-0" />Переместить вниз
                </button>
                <div class="border-t border-[#26292d] my-0.5"></div>
                <button
                  @click="updateBlock({ ...block, showInOutline: !(block.showInOutline ?? (block.type === 'heading')) }); activeBlockMenuId = null"
                  class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center justify-between gap-2"
                >
                  <span class="flex items-center gap-2">
                    <IconRenderer name="List" size="14" class="text-emerald-400 shrink-0" />
                    В содержание
                  </span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0c0d0e]" :class="(block.showInOutline ?? (block.type === 'heading')) ? 'text-emerald-400' : 'text-dark-muted'">
                    {{ (block.showInOutline ?? (block.type === 'heading')) ? 'Да' : 'Нет' }}
                  </span>
                </button>
                <div class="border-t border-[#26292d] my-0.5"></div>
                <div class="px-3 py-1 text-[10px] text-dark-muted font-bold uppercase">Ширина</div>
                <div class="grid grid-cols-4 gap-1 px-2 pb-1">
                  <button v-for="w in [33, 50, 66, 100]" :key="w" @click="updateBlockWidth(block, w); activeBlockMenuId = null" :class="['text-[11px] font-bold py-1 rounded transition-all', (block.customWidth || 100) === w ? 'bg-emerald-600 text-white' : 'bg-[#0c0d0e] text-dark-muted hover:text-white']">{{ w }}%</button>
                </div>
                <div class="border-t border-[#26292d] my-0.5"></div>
                <div class="px-3 py-1 text-[10px] text-dark-muted font-bold uppercase">Стиль</div>
                <div class="grid grid-cols-2 gap-1 px-2 pb-1">
                  <button v-for="v in ['default', 'subtle', 'accent', 'bordered']" :key="v" @click="updateBlockVariant(block, v as BlockVariant); activeBlockMenuId = null" :class="['text-[11px] font-semibold py-1 rounded transition-all capitalize', (block.variant || 'default') === v ? 'bg-emerald-600 text-white' : 'bg-[#0c0d0e] text-dark-muted hover:text-white']">{{ v === 'default' ? 'Обычный' : v === 'subtle' ? 'Тёмный' : v === 'accent' ? 'Акцент' : 'Рамка' }}</button>
                </div>
                <div class="border-t border-[#26292d] my-0.5"></div>
                <button @click="requestDeleteBlock(index); activeBlockMenuId = null" :disabled="guide.blocks.length <= 1" class="text-left text-xs text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg flex items-center gap-2.5 disabled:opacity-30 w-full">
                  <IconRenderer name="Trash2" size="14" class="shrink-0" />Удалить блок
                </button>
              </div>
            </div>
          </div>

          <!-- BLOCK CONTENT -->
          <div
            :style="{
              width: block.type === 'divider' ? '100%' : (block.customWidth ? `calc(${block.customWidth}% - 2rem)` : '100%'),
              minHeight: block.customHeight ? `${block.customHeight}px` : undefined
            }"
            :class="[
              'relative transition-all flex-1 min-w-0',
              block.type === 'divider' ? 'py-2' :
              block.type === 'section' ? 'p-4 rounded-xl bg-[#121416] border border-[#26292d]' :
              'p-5 rounded-xl ' + getVariantClass(block.variant)
            ]"
          >

            <!-- DIVIDER -->
            <template v-if="block.type === 'divider'">
              <div class="flex items-center justify-center py-3">
                <div class="flex-1 border-t border-[#26292d]"></div>
                <div class="mx-3 bg-[#0c0d0e] px-3 py-1 text-dark-muted flex items-center gap-2 text-xs font-mono border border-[#26292d] rounded-full">
                  <IconRenderer name="Minus" size="12" class="text-cyan-400" />
                  Разделитель
                </div>
                <div class="flex-1 border-t border-[#26292d]"></div>
              </div>
            </template>

            <!-- SECTION -->
            <template v-else-if="block.type === 'section'">
              <div class="flex items-center justify-between mb-3 gap-2">
                <div class="flex items-center gap-2 flex-1 max-w-md">
                  <IconRenderer name="Layout" size="14" class="text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    :value="block.sectionTitle"
                    @input="updateBlock({ ...block, sectionTitle: ($event.target as HTMLInputElement).value })"
                    placeholder="Название секции (необязательно)..."
                    class="bg-[#121416] hover:bg-[#181a1d] focus:bg-[#181a1d] border border-[#26292d] focus:border-cyan-500/50 text-cyan-300 font-bold text-xs rounded-xl px-2.5 py-1.5 w-full focus:outline-none transition-all placeholder:text-dark-muted/60"
                  />
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Section Collapsing Permission Toggle -->
                  <button
                    type="button"
                    @click="updateBlock({ ...block, allowCollapsing: block.allowCollapsing === false ? true : false })"
                    :class="['text-[10px] px-2 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-all', block.allowCollapsing !== false ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300']"
                    :title="block.allowCollapsing !== false ? 'Сворачивание РАЗРЕШЕНО в просмотре' : 'Сворачивание ЗАПРЕЩЕНО в просмотре'"
                  >
                    <IconRenderer :name="block.allowCollapsing !== false ? 'ChevronUp' : 'Lock'" size="11" />
                    <span>{{ block.allowCollapsing !== false ? 'Сворачивание вкл' : 'Запрет сворачивания' }}</span>
                  </button>
                  <!-- Section Outer Style Toggle -->
                  <div class="flex items-center gap-1 bg-[#0c0d0e] border border-[#26292d] p-0.5 rounded-lg">
                    <button
                      type="button"
                      @click="updateBlock({ ...block, sectionStyle: 'card' })"
                      :class="['text-[10px] px-2 py-0.5 rounded font-semibold transition-all', (block.sectionStyle || 'card') === 'card' ? 'bg-cyan-600 text-white' : 'text-dark-muted hover:text-white']"
                      title="Общая единая карта для всех колонок"
                    >
                      Общая карта
                    </button>
                    <button
                      type="button"
                      @click="updateBlock({ ...block, sectionStyle: 'transparent' })"
                      :class="['text-[10px] px-2 py-0.5 rounded font-semibold transition-all', block.sectionStyle === 'transparent' ? 'bg-cyan-600 text-white' : 'text-dark-muted hover:text-white']"
                      title="Раздельные карты для каждой колонки"
                    >
                      Раздельные
                    </button>
                  </div>

                  <!-- Proportions quick presets -->
                  <div class="relative group/presets">
                    <button type="button" class="text-[10px] text-dark-muted hover:text-cyan-300 px-2 py-1 bg-[#0c0d0e] border border-[#26292d] rounded-lg flex items-center gap-1 transition-colors">
                      <IconRenderer name="Sliders" size="11" /> Пропорции
                    </button>
                    <div class="absolute right-0 top-full mt-1 hidden group-hover/presets:flex flex-col bg-[#16181a] border border-[#26292d] rounded-xl shadow-2xl p-2 z-30 w-36 gap-0.5">
                      <button v-for="preset in ['80-20','70-30','60-40','50-50','40-60','30-70','20-80','33-33-33','25-50-25']" :key="preset" @click="setSectionProportions(block, preset as SectionPreset)" class="text-left text-[11px] text-slate-300 hover:bg-[#26292d] px-2 py-1 rounded-lg">{{ preset }}</button>
                    </div>
                  </div>
                  <button @click="addColumnToSection(block)" class="text-[10px] text-cyan-300 px-2 py-1 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 rounded-lg flex items-center gap-1 transition-colors">
                    <IconRenderer name="Plus" size="11" /> Колонка
                  </button>
                </div>
              </div>

              <div :id="`section-container-${block.id}`" class="flex items-stretch w-full">
                <template v-for="(col, colIdx) in (block.columns || [])" :key="col.id">
                  <div
                    :style="{ width: `calc(${col.customWidth || 50}% - 0.5rem)` }"
                    @dragover="draggedColIndex?.blockId === block.id ? onColDragOver($event, block, colIdx) : onSubBlockDragOver($event, block, col.id, col.blocks.length)"
                    @drop="draggedColIndex?.blockId === block.id ? onColDrop($event, block, colIdx) : onSubBlockDrop($event, block, col.id, col.blocks.length)"
                    @dragend="onColDragEnd"
                    :class="[
                      'flex flex-col gap-3 bg-[#16181a] border p-3 rounded-xl shadow-sm relative min-h-[140px] transition-all',
                      draggedColIndex?.blockId === block.id && draggedColIndex?.colIdx === colIdx ? 'opacity-40 border-dashed border-cyan-500' :
                      dragOverColIndex?.blockId === block.id && dragOverColIndex?.colIdx === colIdx ? 'border-cyan-400 bg-cyan-500/10' :
                      'border-[#26292d]'
                    ]"
                  >
                    <!-- Column header -->
                    <div class="flex items-center justify-between text-[10px] text-dark-muted border-b border-[#26292d] pb-1.5">
                      <div class="flex items-center gap-1.5">
                        <div
                          draggable="true"
                          @dragstart="onColDragStart($event, block, colIdx)"
                          class="cursor-grab active:cursor-grabbing hover:text-cyan-400 transition-colors p-0.5 rounded"
                          title="Зажмите и потяните для перемещения колонки"
                        >
                          <IconRenderer name="GripVertical" size="12" />
                        </div>
                        <span class="font-bold uppercase">Кол. {{ colIdx + 1 }} · {{ col.customWidth || 50 }}%</span>
                      </div>
                      <button v-if="(block.columns?.length || 0) > 1" @click="removeColumnFromSection(block, colIdx)" class="text-dark-muted hover:text-rose-400 transition-colors">
                        <IconRenderer name="X" size="12" />
                      </button>
                    </div>

                    <!-- Sub-blocks -->
                    <div class="space-y-2 flex-1 min-h-[50px]">
                      <div
                        v-for="(sub, subIdx) in col.blocks" :key="sub.id"
                        @dragover.stop="onSubBlockDragOver($event, block, col.id, subIdx)"
                        @drop.stop="onSubBlockDrop($event, block, col.id, subIdx)"
                        @dragend="onSubBlockDragEnd()"
                        :class="['p-2.5 bg-[#0c0d0e] border rounded-xl group/sub transition-all', draggedSubBlock?.blockId === block.id && draggedSubBlock?.colId === col.id && draggedSubBlock?.subIdx === subIdx ? 'opacity-40 border-dashed border-emerald-500' : dragOverSubBlock?.blockId === block.id && dragOverSubBlock?.colId === col.id && dragOverSubBlock?.subIdx === subIdx ? 'border-emerald-400 bg-emerald-500/10' : 'border-[#26292d]']"
                      >
                        <div class="flex items-center justify-between mb-1.5 text-[10px] text-dark-muted">
                          <div class="flex items-center gap-1.5">
                            <div
                              draggable="true"
                              @dragstart.stop="onSubBlockDragStart($event, block, col.id, subIdx)"
                              class="cursor-grab active:cursor-grabbing hover:text-emerald-400 transition-colors p-0.5 rounded"
                              title="Зажмите и потяните для перемещения подблока"
                            >
                              <IconRenderer name="GripVertical" size="12" />
                            </div>
                            <!-- Quick Sub-block Type Switcher -->
                            <select
                              :value="sub.type"
                              @change="changeSubBlockType(block, col.id, sub, ($event.target as HTMLSelectElement).value as BlockType)"
                              class="bg-[#121416] border border-[#26292d] hover:border-cyan-500/50 text-cyan-300 font-bold uppercase text-[9px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                            >
                              <option value="heading">Заголовок</option>
                              <option value="text">Текст</option>
                              <option value="callout">Совет / Callout</option>
                              <option value="spoiler">Спойлер</option>
                              <option value="image">Картинка</option>
                            </select>
                          </div>
                          <div class="flex items-center gap-1">
                            <button
                              @click="updateSubBlock(block, col.id, { ...sub, fullWidth: !sub.fullWidth })"
                              :class="['transition-colors p-0.5 rounded', sub.fullWidth ? 'text-emerald-400 bg-emerald-500/20 font-bold' : 'text-dark-muted hover:text-white']"
                              :title="sub.fullWidth ? 'На всю ширину (100%)' : 'Обычный в колонке'"
                            >
                              ↔
                            </button>
                            <button @click="extractSubBlockFromSection(block, col.id, sub.id)" class="text-cyan-400 hover:text-cyan-300 transition-colors" title="Извлечь блок"><IconRenderer name="ExternalLink" size="11" /></button>
                            <button @click="requestDeleteSubBlock(block, col.id, sub.id)" class="text-dark-muted hover:text-rose-400 transition-colors"><IconRenderer name="X" size="11" /></button>
                          </div>
                        </div>

                        <div v-if="sub.type === 'heading'">
                          <input type="text" :value="sub.headingText" @input="updateSubBlock(block, col.id, { ...sub, headingText: ($event.target as HTMLInputElement).value })" placeholder="Заголовок..." class="w-full bg-transparent text-white text-sm font-bold focus:outline-none" />
                        </div>
                        <div v-else-if="sub.type === 'text'">
                          <textarea :value="sub.textContent" @input="updateSubBlock(block, col.id, { ...sub, textContent: ($event.target as HTMLTextAreaElement).value })" placeholder="Текст..." rows="3" class="w-full bg-transparent text-slate-200 text-xs focus:outline-none resize-y"></textarea>
                        </div>
                        <div v-else-if="sub.type === 'callout'">
                          <CalloutBlock :block="sub" :is-editing="true" @update="(updated) => updateSubBlock(block, col.id, updated)" />
                        </div>
                        <div v-else-if="sub.type === 'image'" class="space-y-1.5">
                          <div v-if="sub.imageUrl" class="rounded-xl border border-[#26292d] overflow-hidden bg-[#0c0d0e] h-48 w-full flex items-center justify-center p-1">
                            <img :src="sub.imageUrl" class="w-full h-full object-cover rounded-lg" />
                          </div>
                          <input type="text" :value="sub.imageUrl" @input="updateSubBlock(block, col.id, { ...sub, imageUrl: ($event.target as HTMLInputElement).value })" placeholder="URL картинки..." class="w-full bg-[#121416] border border-[#26292d] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none" />
                          <input type="text" :value="sub.imageCaption" @input="updateSubBlock(block, col.id, { ...sub, imageCaption: ($event.target as HTMLInputElement).value })" placeholder="Подпись к картинке (необязательно)..." class="w-full bg-[#121416]/70 border border-[#26292d] text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none placeholder:text-dark-muted/60" />
                        </div>
                      </div>
                    </div>

                    <!-- Add sub-block buttons -->
                    <div class="flex items-center gap-1 pt-1.5 border-t border-[#26292d]">
                      <!-- Heading -->
                      <div class="relative group/subbtn flex-1">
                        <button @click="addSubBlock(block, col.id, 'heading')" class="w-full text-[11px] font-bold text-dark-muted hover:text-cyan-300 py-1.5 rounded-lg hover:bg-[#26292d] transition-all flex items-center justify-center gap-1">
                          <IconRenderer name="FileText" size="13" /> H
                        </button>
                        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/subbtn:flex items-center pointer-events-none z-30">
                          <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl">Заголовок</div>
                        </div>
                      </div>

                      <!-- Text -->
                      <div class="relative group/subbtn flex-1">
                        <button @click="addSubBlock(block, col.id, 'text')" class="w-full text-[11px] font-bold text-dark-muted hover:text-emerald-300 py-1.5 rounded-lg hover:bg-[#26292d] transition-all flex items-center justify-center gap-1">
                          <IconRenderer name="Edit3" size="13" /> T
                        </button>
                        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/subbtn:flex items-center pointer-events-none z-30">
                          <div class="bg-[#0c0d0e] border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl">Текст</div>
                        </div>
                      </div>

                      <!-- Image -->
                      <div class="relative group/subbtn flex-1">
                        <button @click="addSubBlock(block, col.id, 'image')" class="w-full text-dark-muted hover:text-pink-300 py-1.5 rounded-lg hover:bg-[#26292d] transition-all flex items-center justify-center">
                          <IconRenderer name="Image" size="13" />
                        </button>
                        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/subbtn:flex items-center pointer-events-none z-30">
                          <div class="bg-[#0c0d0e] border border-pink-500/40 text-pink-300 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl">Картинка</div>
                        </div>
                      </div>

                      <!-- Callout -->
                      <div class="relative group/subbtn flex-1">
                        <button @click="addSubBlock(block, col.id, 'callout')" class="w-full text-dark-muted hover:text-amber-300 py-1.5 rounded-lg hover:bg-[#26292d] transition-all flex items-center justify-center">
                          <IconRenderer name="Lightbulb" size="13" />
                        </button>
                        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/subbtn:flex items-center pointer-events-none z-30">
                          <div class="bg-[#0c0d0e] border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl">Совет / Callout</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Column splitter drag handle -->
                  <div
                    v-if="colIdx < (block.columns?.length || 0) - 1"
                    @mousedown="(e) => startColumnResizing(e, block, colIdx)"
                    class="w-4 -mx-1 flex items-center justify-center cursor-col-resize group/splitter shrink-0 z-20 select-none"
                    title="Потяните влево/вправо для плавной смены ширины колонок"
                  >
                    <div class="w-1 h-12 bg-[#26292d] group-hover/splitter:bg-cyan-400 group-hover/splitter:w-1.5 rounded-full transition-all shadow-md"></div>
                  </div>
                </template>
              </div>

              <!-- Full-width Sub-blocks Zone (Inside Section Card below columns) -->
              <div class="mt-3 pt-3 border-t border-[#26292d] space-y-2">
                <div class="flex items-center justify-between text-[10px] text-dark-muted">
                  <span class="font-bold uppercase text-amber-400 flex items-center gap-1">
                    <IconRenderer name="Maximize2" size="11" />
                    Блоки во всю ширину секции (внизу)
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      @click="addBottomFullSubBlock(block, 'callout')"
                      class="text-[10px] text-amber-300 hover:bg-[#26292d] px-2 py-0.5 rounded border border-[#26292d] flex items-center gap-1 transition-all"
                    >
                      <IconRenderer name="Lightbulb" size="11" /> Совет
                    </button>
                    <button
                      @click="addBottomFullSubBlock(block, 'text')"
                      class="text-[10px] text-emerald-300 hover:bg-[#26292d] px-2 py-0.5 rounded border border-[#26292d] flex items-center gap-1 transition-all"
                    >
                      <IconRenderer name="Edit3" size="11" /> Текст
                    </button>
                    <button
                      @click="addBottomFullSubBlock(block, 'image')"
                      class="text-[10px] text-pink-300 hover:bg-[#26292d] px-2 py-0.5 rounded border border-[#26292d] flex items-center gap-1 transition-all"
                    >
                      <IconRenderer name="Image" size="11" /> Картинка
                    </button>
                  </div>
                </div>

                <div v-if="block.fullWidthBlocksBottom && block.fullWidthBlocksBottom.length > 0" class="space-y-2">
                  <div
                    v-for="(sub, subIdx) in block.fullWidthBlocksBottom"
                    :key="sub.id"
                    class="p-2.5 bg-[#0c0d0e] border border-[#26292d] rounded-xl relative group/bottomsub"
                  >
                    <div class="flex items-center justify-between mb-1.5 text-[10px] text-dark-muted border-b border-[#26292d]/50 pb-1">
                      <span class="font-bold uppercase text-amber-300">{{ sub.type }} (100% Ширина)</span>
                      <button @click="removeBottomFullSubBlock(block, subIdx)" class="text-dark-muted hover:text-rose-400 transition-colors">
                        <IconRenderer name="X" size="12" />
                      </button>
                    </div>

                    <div v-if="sub.type === 'callout'">
                      <CalloutBlock :block="sub" :is-editing="true" @update="(updated) => updateBottomFullSubBlock(block, subIdx, updated)" />
                    </div>
                    <div v-else-if="sub.type === 'text'">
                      <textarea :value="sub.textContent" @input="updateBottomFullSubBlock(block, subIdx, { ...sub, textContent: ($event.target as HTMLTextAreaElement).value })" placeholder="Широкий текст..." rows="2" class="w-full bg-transparent text-slate-200 text-xs focus:outline-none resize-y"></textarea>
                    </div>
                    <div v-else-if="sub.type === 'image'" class="space-y-1.5">
                      <div v-if="sub.imageUrl" class="rounded border border-[#26292d] overflow-hidden bg-black/60 max-h-40 flex items-center justify-center">
                        <img :src="sub.imageUrl" class="max-h-40 object-contain" />
                      </div>
                      <input type="text" :value="sub.imageUrl" @input="updateBottomFullSubBlock(block, subIdx, { ...sub, imageUrl: ($event.target as HTMLInputElement).value })" placeholder="URL картинки..." class="w-full bg-[#121416] border border-[#26292d] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none" />
                      <input type="text" :value="sub.imageCaption" @input="updateBottomFullSubBlock(block, subIdx, { ...sub, imageCaption: ($event.target as HTMLInputElement).value })" placeholder="Подпись к картинке (необязательно)..." class="w-full bg-[#121416]/70 border border-[#26292d] text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none placeholder:text-dark-muted/60" />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- HEADING -->
            <div v-else-if="block.type === 'heading'" class="space-y-2">
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <button @click="updateBlockHeadingLevel(block, 'h1')" :class="['text-[10px] font-bold px-2 py-0.5 rounded transition-all', block.headingLevel === 'h1' ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-muted hover:text-white']">H1</button>
                  <button @click="updateBlockHeadingLevel(block, 'h2')" :class="['text-[10px] font-bold px-2 py-0.5 rounded transition-all', (block.headingLevel === 'h2' || !block.headingLevel) ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-muted hover:text-white']">H2</button>
                  <div class="flex items-center gap-1 ml-2">
                    <button v-for="a in ['left','center','right']" :key="a" @click="updateBlockAlign(block, a as 'left'|'center'|'right')" :class="['text-[10px] px-1.5 py-0.5 rounded transition-all', block.align === a ? 'bg-[#26292d] text-white' : 'text-dark-muted hover:text-white']">
                      <IconRenderer :name="a === 'left' ? 'AlignLeft' : a === 'center' ? 'AlignCenter' : 'AlignRight'" size="12" />
                    </button>
                  </div>
                </div>

                <!-- Allow / Disallow Collapsing in Reader Mode -->
                <button
                  type="button"
                  @click="updateBlock({ ...block, allowCollapsing: block.allowCollapsing === false ? true : false })"
                  :class="['text-[10px] px-2 py-0.5 rounded-lg border font-semibold flex items-center gap-1 transition-all', block.allowCollapsing !== false ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300']"
                  :title="block.allowCollapsing !== false ? 'Сворачивание РАЗРЕШЕНО в просмотре' : 'Сворачивание ЗАПРЕЩЕНО в просмотре'"
                >
                  <IconRenderer :name="block.allowCollapsing !== false ? 'ChevronUp' : 'Lock'" size="11" />
                  <span>{{ block.allowCollapsing !== false ? 'Сворачивание вкл' : 'Запрет сворачивания' }}</span>
                </button>
              </div>
              <input
                type="text"
                :value="block.headingText"
                @input="updateBlockHeadingText(block, ($event.target as HTMLInputElement).value)"
                placeholder="Заголовок раздела..."
                :class="['w-full bg-transparent text-white font-bold focus:outline-none placeholder:text-dark-muted/40 border-b border-transparent focus:border-[#26292d] transition-all pb-1', block.headingLevel === 'h1' ? 'text-2xl' : 'text-xl', block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left']"
              />
            </div>

            <!-- TEXT -->
            <div v-else-if="block.type === 'text'">
              <textarea
                :value="block.textContent"
                @input="updateBlockTextContent(block, ($event.target as HTMLTextAreaElement).value)"
                placeholder="Опишите пошаговые инструкции или пояснения..."
                rows="4"
                :class="['w-full bg-transparent text-slate-200 text-sm focus:outline-none placeholder:text-dark-muted/40 resize-y', block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left']"
              ></textarea>
            </div>

            <!-- CALLOUT -->
            <div v-else-if="block.type === 'callout'">
              <CalloutBlock :block="block" :is-editing="true" @update="updateBlock" />
            </div>

            <!-- MULTIBLOCK -->
            <div v-else-if="block.type === 'multiblock'">
              <LayerPainter :block="block" :is-editing="true" @update="updateBlock" />
            </div>

            <!-- CHECKLIST -->
            <div v-else-if="block.type === 'checklist'" class="space-y-3">
              <input
                type="text"
                :value="block.checklistTitle"
                @input="updateBlockChecklistTitle(block, ($event.target as HTMLInputElement).value)"
                placeholder="Заголовок чек-листа..."
                class="w-full bg-transparent text-white text-sm font-semibold focus:outline-none placeholder:text-dark-muted/40 border-b border-transparent focus:border-[#26292d] pb-1 mb-1"
              />
              <div class="space-y-1.5">
                <div
                  v-for="(item, itemIdx) in (block.checklistItems || [])" :key="item.id"
                  draggable="true"
                  @dragstart="onChecklistDragStart($event, block, itemIdx)"
                  @dragover="onChecklistDragOver($event, block, itemIdx)"
                  @drop="onChecklistDrop($event, block, itemIdx)"
                  @dragend="onChecklistDragEnd()"
                  :class="['flex items-center gap-2.5 p-2 rounded-lg border transition-all', draggedChecklistIdx?.blockId === block.id && draggedChecklistIdx?.itemIdx === itemIdx ? 'opacity-40 border-dashed border-emerald-500' : dragOverChecklistIdx?.blockId === block.id && dragOverChecklistIdx?.itemIdx === itemIdx ? 'border-emerald-400 bg-emerald-500/10' : 'bg-[#0c0d0e] border-[#26292d]']"
                >
                  <div class="cursor-grab active:cursor-grabbing text-dark-muted hover:text-emerald-400 transition-colors shrink-0"><IconRenderer name="GripVertical" size="14" /></div>
                  <input type="checkbox" :checked="item.completed" @change="toggleChecklistItem(block, itemIdx)" class="w-4 h-4 accent-emerald-500 rounded shrink-0" />
                  <input type="text" :value="item.text" @input="updateChecklistItemText(block, itemIdx, ($event.target as HTMLInputElement).value)" class="flex-1 bg-transparent text-xs text-white focus:outline-none" />
                  <button type="button" @click="removeChecklistItem(block, itemIdx)" class="text-dark-muted hover:text-rose-400 shrink-0 transition-colors"><IconRenderer name="X" size="13" /></button>
                </div>
              </div>
              <button type="button" @click="addChecklistItem(block)" class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium">
                <IconRenderer name="Plus" size="14" /> Добавить этап
              </button>
            </div>

            <!-- SPOILER -->
            <div v-else-if="block.type === 'spoiler'">
              <SpoilerBlock :block="block" :is-editing="true" @update="updateBlock" />
            </div>

            <!-- BEFORE AFTER SLIDER -->
            <div v-else-if="block.type === 'before_after'">
              <BeforeAfterSlider :block="block" :is-editing="true" @update="updateBlock" />
            </div>

            <!-- IMAGE -->
            <div v-else class="space-y-3">
              <div v-if="block.imageUrl" class="relative group/img rounded-xl overflow-hidden border border-[#26292d] max-h-96 flex items-center justify-center bg-black/50">
                <img :src="block.imageUrl" :alt="block.imageCaption" class="max-h-96 object-contain rounded-xl" />
                <button type="button" @click="updateBlockImageUrl(block, '')" class="absolute top-2 right-2 bg-rose-600/80 hover:bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity">
                  <IconRenderer name="X" size="15" />
                </button>
              </div>
              <div v-else class="border-2 border-dashed border-[#26292d] rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-dark-muted">
                <IconRenderer name="Image" size="32" />
                <span class="text-sm">Вставьте URL или загрузите изображение</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] text-dark-muted mb-1">URL картинки</label>
                  <input type="text" :value="block.imageUrl" @input="updateBlockImageUrl(block, ($event.target as HTMLInputElement).value)" placeholder="https://..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-accent" />
                </div>
                <div>
                  <label class="block text-[11px] text-dark-muted mb-1">Или загрузить с ПК</label>
                  <input type="file" accept="image/*" @change="handleImageFileUpload($event, block)" class="w-full text-xs text-dark-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer" />
                </div>
              </div>
              <input type="text" :value="block.imageCaption" @input="updateBlockImageCaption(block, ($event.target as HTMLInputElement).value)" placeholder="Подпись к скриншоту..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-accent" />
            </div>

            <!-- Resize handle (bottom right) -->
            <div
              v-if="block.type !== 'divider' && block.type !== 'section'"
              @mousedown="(e) => startResizing(e, block)"
              class="absolute bottom-1.5 right-1.5 w-5 h-5 bg-emerald-500/0 hover:bg-emerald-500/20 rounded flex items-center justify-center cursor-se-resize text-dark-muted hover:text-emerald-400 opacity-0 group-hover/block:opacity-100 transition-all"
              title="Тяните для изменения размера"
            >
              <IconRenderer name="Maximize2" size="10" />
            </div>

          </div>
        </div>

        <!-- "+ Add block" line BETWEEN blocks -->
        <div class="relative group/add h-6 flex items-center">
          <div class="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-transparent group-hover/add:bg-[#26292d] transition-colors"></div>
          <button
            type="button"
            @click.stop="addBlockMenuAfterIndex = index; activeBlockMenuId = null"
            class="relative z-10 mx-auto opacity-0 group-hover/add:opacity-100 transition-opacity bg-[#26292d] hover:bg-emerald-600 text-dark-muted hover:text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md"
          >
            <IconRenderer name="Plus" size="14" />
          </button>
          <!-- Add block dropdown -->
          <div v-if="addBlockMenuAfterIndex === index" @click.stop class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-[#16181a] border border-[#26292d] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 w-52">
            <button @click="addBlockAt(index, 'heading'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="FileText" size="14" class="text-cyan-400 shrink-0" />Заголовок</button>
            <button @click="addBlockAt(index, 'text'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Edit3" size="14" class="text-emerald-400 shrink-0" />Текст</button>
            <button @click="addBlockAt(index, 'image'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Image" size="14" class="text-pink-400 shrink-0" />Картинка</button>
            <button @click="addBlockAt(index, 'callout'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Lightbulb" size="14" class="text-amber-400 shrink-0" />Совет / Уведомление</button>
            <button @click="addBlockAt(index, 'checklist'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="CheckCircle2" size="14" class="text-emerald-400 shrink-0" />Чек-лист</button>
            <button @click="addBlockAt(index, 'spoiler'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="HelpCircle" size="14" class="text-cyan-400 shrink-0" />Спойлер / Аккордеон</button>
            <button @click="addBlockAt(index, 'before_after'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Maximize2" size="14" class="text-emerald-400 shrink-0" />Слайдер До / После</button>
            <button @click="addBlockAt(index, 'section'); addBlockMenuAfterIndex = null" class="text-left text-xs text-cyan-300 font-semibold hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Layout" size="14" class="text-cyan-400 shrink-0" />Секция с колонками</button>
            <button @click="addBlockAt(index, 'multiblock'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-200 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5"><IconRenderer name="Layers" size="14" class="text-cyan-400 shrink-0" />Мультиструктура</button>
            <div class="border-t border-[#26292d] mt-0.5 pt-0.5">
              <button @click="addBlockAt(index, 'divider'); addBlockMenuAfterIndex = null" class="text-left text-xs text-slate-400 hover:bg-[#26292d] px-3 py-2 rounded-lg flex items-center gap-2.5 w-full"><IconRenderer name="Minus" size="14" class="text-slate-500 shrink-0" />Разделитель</button>
            </div>
          </div>
        </div>

      </template>
    </div>

    <!-- ═══════════ MODALS ═══════════ -->

    <!-- Structure Tree Modal -->
    <div v-if="isTreeModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div class="bg-[#16181a] border border-[#26292d] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2"><IconRenderer name="Layers" size="18" class="text-purple-400" />Структура блоков гайда</h3>
          <button @click="isTreeModalOpen = false" class="text-dark-muted hover:text-white"><IconRenderer name="X" size="18" /></button>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div
            v-for="(b, idx) in guide.blocks" :key="b.id"
            @click="scrollToBlockInEditor(b.id); isTreeModalOpen = false;"
            class="p-3 bg-[#0c0d0e] hover:bg-[#212429] border border-[#26292d] rounded-xl flex items-center justify-between cursor-pointer transition-all"
          >
            <div class="flex items-center gap-2.5 text-xs text-white">
              <span class="w-5 h-5 rounded bg-[#16181a] text-dark-muted font-mono flex items-center justify-center text-[10px] font-bold">#{{ idx + 1 }}</span>
              <span class="font-bold text-cyan-400 uppercase text-[10px]">{{ b.type }}</span>
              <span class="text-slate-300 line-clamp-1">{{ b.headingText || b.textContent || b.checklistTitle || b.imageCaption || 'Блок без названия' }}</span>
            </div>
            <span class="text-[10px] text-dark-muted font-mono bg-[#16181a] px-2 py-0.5 rounded">{{ b.customWidth || 100 }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Hotkeys Cheat Sheet Modal -->
    <div v-if="isHelpModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div class="bg-[#16181a] border border-[#26292d] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2"><IconRenderer name="HelpCircle" size="18" class="text-cyan-400" />Горячие клавиши и советы</h3>
          <button @click="isHelpModalOpen = false" class="text-dark-muted hover:text-white"><IconRenderer name="X" size="18" /></button>
        </div>
        <div class="space-y-2 text-xs text-slate-300">
          <div v-for="[label, value, color] in [['Отменить', 'Ctrl+Z', 'cyan'], ['Повторить', 'Ctrl+Y', 'cyan'], ['Перемещение блоков', 'Drag & Drop ⠿', 'emerald'], ['Добавить блок', 'Нажать + между блоками', 'emerald'], ['Меню блока', 'Нажать ⋮ при hover', 'amber'], ['Изменить размер', 'Тянуть ↗ в углу блока', 'emerald']]" :key="label" class="p-3 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex items-center justify-between">
            <span>{{ label }}</span>
            <code :class="`bg-[#16181a] px-2 py-0.5 rounded text-${color}-400 font-mono`">{{ value }}</code>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Text Format Toolbar -->
    <TextFormatToolbar @format="handleTextFormatSyntax" />

    <!-- Import & Export Modal -->
    <ImportExportModal :is-open="isImportExportOpen" :guide="guide" @close="isImportExportOpen = false" @import="(newGuide) => emit('update:guide', newGuide)" />

    <!-- Layout Template Library Modal -->
    <TemplateLibraryModal :is-open="isTemplateModalOpen" @close="isTemplateModalOpen = false" @select-template="handleAppendTemplate" />

    <!-- Block Deletion Confirm Modal -->
    <ConfirmModal :is-open="isDeleteBlockModalOpen" title="Удаление блока" message="Вы действительно хотите удалить этот блок из гайда?" confirm-text="Удалить блок" cancel-text="Отмена" type="danger" @confirm="confirmDeleteBlock" @cancel="isDeleteBlockModalOpen = false" />

    <!-- Sub-block Deletion Confirm Modal -->
    <ConfirmModal :is-open="isDeleteSubBlockModalOpen" title="Удаление элемента" message="Вы действительно хотите удалить этот элемент из колонки?" confirm-text="Удалить элемент" cancel-text="Отмена" type="danger" @confirm="confirmDeleteSubBlock" @cancel="isDeleteSubBlockModalOpen = false" />

  </div>
</template>
