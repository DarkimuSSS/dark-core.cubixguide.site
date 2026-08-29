<script setup lang="ts">
import { ref } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import CraftingSlotPicker from './CraftingSlotPicker.vue';
import ImportExportModal from './ImportExportModal.vue';
import type { Guide, GuideBlock, Category, Difficulty, CraftingSlot, BlockType, BlockWidth, BlockAlign, BlockVariant } from '../types/guide';
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

const isPickerOpen = ref(false);
const activeSlotBlockId = ref<string | null>(null);
const activeSlotIndex = ref<number | null>(null);
const isOutputSlot = ref(false);
const activeSlotData = ref<CraftingSlot | null>(null);

const isImportExportOpen = ref(false);

const categories: Category[] = ['ХайТек', 'Магия RPG', 'СкайБлок', 'Автоматизация', 'Общий'];
const difficulties: Difficulty[] = ['Новичок', 'Опытный', 'Мастер'];

// Meta Updates
const updateTitle = (val: string) => {
  emit('update:guide', { ...props.guide, meta: { ...props.guide.meta, title: val } });
};

const updateAuthor = (val: string) => {
  emit('update:guide', { ...props.guide, meta: { ...props.guide.meta, author: val } });
};

const updateCategory = (val: Category) => {
  emit('update:guide', { ...props.guide, meta: { ...props.guide.meta, category: val } });
};

const updateDifficulty = (val: Difficulty) => {
  emit('update:guide', { ...props.guide, meta: { ...props.guide.meta, difficulty: val } });
};

// Block Operations
const updateBlock = (updatedBlock: GuideBlock) => {
  const index = props.guide.blocks.findIndex(b => b.id === updatedBlock.id);
  if (index !== -1) {
    const newBlocks = [...props.guide.blocks];
    newBlocks[index] = updatedBlock;
    emit('update:guide', { ...props.guide, blocks: newBlocks });
  }
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
  emit('update:guide', { ...props.guide, blocks: newBlocks });
};

const duplicateBlock = (index: number) => {
  const newBlocks = [...props.guide.blocks];
  const original = newBlocks[index];
  const copy: GuideBlock = JSON.parse(JSON.stringify(original));
  copy.id = `block_${Date.now()}`;
  newBlocks.splice(index + 1, 0, copy);
  emit('update:guide', { ...props.guide, blocks: newBlocks });
};

const deleteBlock = (index: number) => {
  if (props.guide.blocks.length <= 1) return;
  const newBlocks = [...props.guide.blocks];
  newBlocks.splice(index, 1);
  emit('update:guide', { ...props.guide, blocks: newBlocks });
};

const addBlockAt = (index: number, type: BlockType) => {
  const newBlocks = [...props.guide.blocks];
  let newBlock: GuideBlock;

  switch (type) {
    case 'heading':
      newBlock = { id: `b_${Date.now()}`, type: 'heading', headingText: 'Новый раздел', headingLevel: 'h2', width: 'full' };
      break;
    case 'text':
      newBlock = { id: `b_${Date.now()}`, type: 'text', textContent: 'Опишите пошаговые инструкции или пояснения к гайду...', width: 'full' };
      break;
    case 'callout':
      newBlock = { 
        id: `b_${Date.now()}`, 
        type: 'callout', 
        calloutType: 'tip', 
        calloutTitle: 'Полезный совет', 
        calloutText: 'Добавьте важное примечание для игроков.',
        width: 'full'
      };
      break;
    case 'crafting':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'crafting',
        width: 'full',
        craftingGrid: Array(9).fill(null).map((_, i) => ({ index: i, item: null, count: 1 })),
        craftingOutput: { index: 9, item: PRESET_ITEMS[0], count: 1 }
      };
      break;
    case 'multiblock':
      newBlock = {
        id: `b_${Date.now()}`,
        type: 'multiblock',
        width: 'full',
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
        width: 'full',
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
        width: 'full',
        imageUrl: '',
        imageCaption: 'Подпись к скриншоту / иллюстрации'
      };
      break;
  }

  newBlocks.splice(index + 1, 0, newBlock);
  emit('update:guide', { ...props.guide, blocks: newBlocks });
};

// Crafting Slot Picker trigger
const openSlotPicker = (blockId: string, slotIndex: number, isOutput: boolean = false) => {
  const block = props.guide.blocks.find(b => b.id === blockId);
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
  const block = props.guide.blocks.find(b => b.id === activeSlotBlockId.value);
  if (!block) return;

  const newBlock = { ...block };
  if (isOutputSlot.value) {
    newBlock.craftingOutput = updatedSlot;
  } else if (newBlock.craftingGrid) {
    const grid = [...newBlock.craftingGrid];
    grid[updatedSlot.index] = updatedSlot;
    newBlock.craftingGrid = grid;
  }

  updateBlock(newBlock);
};

// Checklist helpers
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

// Helper for CSS width classes
const getWidthClass = (width?: BlockWidth) => {
  switch (width) {
    case 'half':
      return 'w-full md:w-[calc(50%-0.75rem)]';
    case 'third':
      return 'w-full md:w-[calc(33.333%-0.75rem)]';
    case 'two-thirds':
      return 'w-full md:w-[calc(66.666%-0.75rem)]';
    case 'full':
    default:
      return 'w-full';
  }
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
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6 pb-24">
    <!-- Top Action Toolbar -->
    <div class="sticky top-4 z-30 bg-[#16181a]/90 backdrop-blur-md border border-[#26292d] p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Гибкий Конструктор
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="isImportExportOpen = true"
          class="px-3 py-1.5 rounded-lg border border-[#26292d] bg-[#121416] hover:bg-[#212429] text-dark-muted hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
        >
          <IconRenderer name="FileText" size="14" />
          JSON
        </button>

        <button
          type="button"
          @click="emit('toggle-preview')"
          class="px-3.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <IconRenderer name="Eye" size="14" />
          Просмотр
        </button>

        <button
          type="button"
          @click="emit('publish')"
          class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50"
        >
          <IconRenderer name="Check" size="14" />
          Сохранить
        </button>

        <button
          type="button"
          @click="emit('delete')"
          class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
          title="Удалить гайд"
        >
          <IconRenderer name="Trash2" size="16" />
        </button>
      </div>
    </div>

    <!-- Meta Header Card -->
    <div class="bg-[#16181a] border border-[#26292d] p-6 sm:p-8 rounded-2xl shadow-xl space-y-5">
      <div class="space-y-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-dark-muted">Название гайда</label>
        <input
          type="text"
          :value="guide.meta.title"
          @input="updateTitle(($event.target as HTMLInputElement).value)"
          placeholder="Назовите ваш гайд (например: Настройка МЭ Сети)..."
          class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xl sm:text-2xl font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-accent/70 transition-all placeholder:text-dark-muted/50"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#26292d]">
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
          <label class="block text-[11px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">Автор гайда</label>
          <input
            type="text"
            :value="guide.meta.author"
            @input="updateAuthor(($event.target as HTMLInputElement).value)"
            placeholder="Ваш никнейм..."
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-accent"
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

    <!-- Flexible Resizable Blocks Layout Container -->
    <div class="flex flex-wrap gap-6 items-start">
      <div 
        v-for="(block, index) in guide.blocks" 
        :key="block.id"
        :class="[
          'group relative p-5 rounded-2xl transition-all shadow-md',
          getWidthClass(block.width),
          getVariantClass(block.variant)
        ]"
      >
        <!-- Floating Customization Controls Bar (Top Right Header) -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#26292d] pb-2 mb-3">
          <!-- Left: Block Type Label & Alignment -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-dark-muted flex items-center gap-1">
              <IconRenderer name="Box" size="14" class="text-emerald-400" />
              {{ block.type }}
            </span>

            <!-- Text Align Buttons -->
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

          <!-- Right: Width & Position Controls -->
          <div class="flex items-center gap-1.5">
            <!-- Width Selector Dropdown -->
            <div class="flex items-center bg-[#0c0d0e] p-0.5 rounded border border-[#26292d]">
              <button 
                type="button"
                @click="updateBlock({ ...block, width: 'full' })"
                :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', block.width === 'full' || !block.width ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                title="Ширина 100%"
              >
                100%
              </button>
              <button 
                type="button"
                @click="updateBlock({ ...block, width: 'half' })"
                :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', block.width === 'half' ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                title="Ширина 50% (два в ряд)"
              >
                50%
              </button>
              <button 
                type="button"
                @click="updateBlock({ ...block, width: 'third' })"
                :class="['px-1.5 py-0.5 text-[10px] font-bold rounded', block.width === 'third' ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-muted hover:text-white']"
                title="Ширина 33% (три в ряд)"
              >
                33%
              </button>
            </div>

            <!-- Variant Selector -->
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

            <!-- Re-order & Management Buttons -->
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
              @click="deleteBlock(index)"
              :disabled="guide.blocks.length <= 1"
              class="p-1 text-rose-400 hover:text-rose-300 disabled:opacity-30 rounded hover:bg-[#26292d]"
              title="Удалить блок"
            >
              <IconRenderer name="Trash2" size="13" />
            </button>
          </div>
        </div>

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
            rows="3"
            :class="[
              'w-full bg-[#0c0d0e] border border-[#26292d] text-slate-200 text-sm rounded-lg p-3 focus:outline-none focus:border-emerald-accent/60 resize-y',
              block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
            ]"
          ></textarea>
        </div>

        <!-- Block 3: Callout Box -->
        <div v-else-if="block.type === 'callout'">
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

        <!-- Floating "+ Add Block" -->
        <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div class="relative group/menu">
            <button
              type="button"
              class="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 transition-transform transform hover:scale-105"
            >
              <IconRenderer name="Plus" size="13" />
              Добавить блок
            </button>

            <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/menu:flex bg-[#16181a] border border-[#26292d] rounded-xl p-1.5 shadow-2xl flex-col gap-1 w-48 z-30">
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
              <button @click="addBlockAt(index, 'multiblock')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                <IconRenderer name="Layers" size="14" class="text-cyan-400" /> Мультиструктура
              </button>
              <button @click="addBlockAt(index, 'checklist')" class="text-left text-xs text-slate-200 hover:bg-[#26292d] p-2 rounded-lg flex items-center gap-2">
                <IconRenderer name="CheckCircle2" size="14" class="text-emerald-400" /> Чек-лист этапов
              </button>
            </div>
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
  </div>
</template>
