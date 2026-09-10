<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import Multiblock3DViewer from './Multiblock3DViewer.vue';
import AuthorGalleryModal from './AuthorGalleryModal.vue';
import { PRESET_MULTIBLOCK_MATERIALS } from '../data/presetItems';
import type { GuideBlock, MultiblockLayer, MultiblockPaletteItem, AuthorMediaItem } from '../types/guide';

const props = defineProps<{
  block: GuideBlock;
  isEditing?: boolean;
  currentUsername?: string;
}>();

const emit = defineEmits<{
  (e: 'update', block: GuideBlock): void;
}>();

// Tool state
const activeTool = ref<'paint' | 'erase' | 'picker'>('paint');
const isGalleryOpen = ref(false);
const showNewMaterialModal = ref(false);

// New Material Creation State
const newMatName = ref('');
const newMatColor = ref('#38bdf8');
const newMatIcon = ref('Box');

// Current Palette & Selected Material
const currentPalette = computed<MultiblockPaletteItem[]>(() => 
  props.block.palette && props.block.palette.length > 0 ? props.block.palette : PRESET_MULTIBLOCK_MATERIALS
);

const selectedMaterialId = ref<string>(currentPalette.value[0]?.id || 'reactor_casing');

const selectedMat = computed(() => {
  return currentPalette.value.find(p => p.id === selectedMaterialId.value) || currentPalette.value[0];
});

// Dimensions
const currentSizeX = computed(() => {
  if (props.block.gridSizeX) return props.block.gridSizeX;
  if (props.block.layers && props.block.layers[0]?.grid[0]) return props.block.layers[0].grid[0].length;
  return props.block.gridSize || 3;
});

const currentSizeZ = computed(() => {
  if (props.block.gridSizeZ) return props.block.gridSizeZ;
  if (props.block.layers && props.block.layers[0]?.grid) return props.block.layers[0].grid.length;
  return props.block.gridSize || 3;
});

// Layers List
const layersList = computed<MultiblockLayer[]>(() => {
  if (props.block.layers && props.block.layers.length > 0) {
    return props.block.layers;
  }
  const sizeX = currentSizeX.value;
  const sizeZ = currentSizeZ.value;
  return [
    { layerNumber: 1, grid: Array(sizeZ).fill(null).map(() => Array(sizeX).fill(currentPalette.value[0]?.id || null)) },
    { layerNumber: 2, grid: Array(sizeZ).fill(null).map(() => Array(sizeX).fill(currentPalette.value[1]?.id || currentPalette.value[0]?.id || null)) },
    { layerNumber: 3, grid: Array(sizeZ).fill(null).map(() => Array(sizeX).fill(currentPalette.value[0]?.id || null)) },
  ];
});

// Set 3D Dimensions (X: Width, Y: Height, Z: Depth) with max limit of 16
const setDimensions = (newWidth: number, newHeight: number, newDepth: number) => {
  const width = Math.max(1, Math.min(16, newWidth));
  const height = Math.max(1, Math.min(16, newHeight));
  const depth = Math.max(1, Math.min(16, newDepth));
  
  const createGrid = () => Array(depth).fill(null).map(() => Array(width).fill(null));
  const newLayers: MultiblockLayer[] = [];
  
  for (let i = 0; i < height; i++) {
    newLayers.push({ layerNumber: i + 1, grid: createGrid() });
  }

  // Preserve existing voxel data within new bounds
  const oldLayers = layersList.value;
  for (let i = 0; i < Math.min(height, oldLayers.length); i++) {
    const oldGrid = oldLayers[i].grid;
    for (let r = 0; r < Math.min(depth, oldGrid.length); r++) {
      for (let c = 0; c < Math.min(width, oldGrid[r].length); c++) {
        newLayers[i].grid[r][c] = oldGrid[r][c];
      }
    }
  }

  emit('update', {
    ...props.block,
    gridSizeX: width,
    gridSizeZ: depth,
    layers: newLayers
  });

  if (maxVisibleLayer.value > height) {
    maxVisibleLayer.value = height;
  }
};

// Max visible layer state
const maxVisibleLayer = ref<number>(3);

watch(() => layersList.value.length, (newLen) => {
  if (maxVisibleLayer.value > newLen) {
    maxVisibleLayer.value = newLen;
  }
}, { immediate: true });

// Add Layer Y (up to 16)
const addLayer = () => {
  if (layersList.value.length >= 16) return;
  setDimensions(currentSizeX.value, layersList.value.length + 1, currentSizeZ.value);
};

// Remove Top Layer Y
const removeTopLayer = () => {
  if (layersList.value.length <= 1) return;
  setDimensions(currentSizeX.value, layersList.value.length - 1, currentSizeZ.value);
};

// Clear Entire Multiblock Structure
const clearEntireStructure = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  newLayers.forEach(l => {
    l.grid.forEach(r => r.fill(null));
  });
  emit('update', { ...props.block, layers: newLayers });
};

// Gallery & Custom Model handlers
const handleSelectGalleryMedia = (media: AuthorMediaItem) => {
  const customPalette = [...currentPalette.value];
  
  // Extract clean block name without (pack name) if present
  let cleanName = media.name;
  let packTitle = media.packTitle;

  const packMatch = media.name.match(/^(.*?)\s*\((.*?)\)$/);
  if (packMatch) {
    cleanName = packMatch[1].trim();
    if (!packTitle) packTitle = packMatch[2].trim();
  }

  const newMat: MultiblockPaletteItem = {
    id: `custom_${media.id}_${Date.now()}`,
    name: cleanName,
    icon: 'Image',
    color: '#06b6d4',
    packTitle: packTitle,
    imageUrl: media.url
  };

  customPalette.push(newMat);
  selectedMaterialId.value = newMat.id;
  emit('update', { ...props.block, palette: customPalette });
};

const handleSelectCustomModel = (model: MultiblockPaletteItem) => {
  const customPalette = [...currentPalette.value];
  if (!customPalette.some(p => p.id === model.id)) {
    customPalette.push(model);
    emit('update', { ...props.block, palette: customPalette });
  }
  selectedMaterialId.value = model.id;
};

// Add Custom Color Block
const addCustomMaterial = () => {
  if (!newMatName.value.trim()) return;
  const newId = `mat_${Date.now()}`;
  const newMat: MultiblockPaletteItem = {
    id: newId,
    name: newMatName.value.trim(),
    icon: newMatIcon.value || 'Box',
    color: newMatColor.value || '#38bdf8'
  };

  const updatedPalette = [...currentPalette.value, newMat];
  emit('update', { ...props.block, palette: updatedPalette });

  selectedMaterialId.value = newId;
  newMatName.value = '';
  showNewMaterialModal.value = false;
};

// Remove material from palette
const removeMaterialFromPalette = (matId: string) => {
  if (currentPalette.value.length <= 1) return;
  const updatedPalette = currentPalette.value.filter(p => p.id !== matId);
  emit('update', { ...props.block, palette: updatedPalette });
  if (selectedMaterialId.value === matId) {
    selectedMaterialId.value = updatedPalette[0].id;
  }
};
</script>

<template>
  <div class="space-y-3 font-sans text-slate-200">
    
    <!-- Header Controls (Only when editing) -->
    <div v-if="isEditing" class="flex flex-wrap items-center justify-between gap-3 bg-[#16181a] border border-[#26292d] p-3 rounded-2xl shadow-lg">
      
      <!-- 3D Grid Dimensions (X, Y, Z) -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-bold text-dark-muted px-1">Размеры (макс. 16):</span>
        
        <!-- X: Width -->
        <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
          <span class="text-[11px] font-bold text-cyan-400 px-1 font-mono">X:</span>
          <button
            type="button"
            @click="setDimensions(currentSizeX - 1, layersList.length, currentSizeZ)"
            :disabled="currentSizeX <= 1"
            class="w-5 h-5 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] disabled:opacity-30 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
          >-</button>
          <input 
            type="number" 
            min="1" 
            max="16" 
            :value="currentSizeX" 
            @change="(e) => setDimensions(parseInt((e.target as HTMLInputElement).value) || 1, layersList.length, currentSizeZ)"
            class="w-7 text-center font-mono text-cyan-400 text-xs font-extrabold bg-transparent focus:outline-none"
          />
          <button
            type="button"
            @click="setDimensions(currentSizeX + 1, layersList.length, currentSizeZ)"
            :disabled="currentSizeX >= 16"
            class="w-5 h-5 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] disabled:opacity-30 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
          >+</button>
        </div>

        <!-- Y: Height -->
        <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
          <span class="text-[11px] font-bold text-cyan-400 px-1 font-mono">Y:</span>
          <button
            type="button"
            @click="setDimensions(currentSizeX, layersList.length - 1, currentSizeZ)"
            :disabled="layersList.length <= 1"
            class="w-5 h-5 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] disabled:opacity-30 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
          >-</button>
          <input 
            type="number" 
            min="1" 
            max="16" 
            :value="layersList.length" 
            @change="(e) => setDimensions(currentSizeX, parseInt((e.target as HTMLInputElement).value) || 1, currentSizeZ)"
            class="w-7 text-center font-mono text-cyan-400 text-xs font-extrabold bg-transparent focus:outline-none"
          />
          <button
            type="button"
            @click="setDimensions(currentSizeX, layersList.length + 1, currentSizeZ)"
            :disabled="layersList.length >= 16"
            class="w-5 h-5 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] disabled:opacity-30 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
          >+</button>
        </div>

        <!-- Z: Depth -->
        <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
          <span class="text-[11px] font-bold text-cyan-400 px-1 font-mono">Z:</span>
          <button
            type="button"
            @click="setDimensions(currentSizeX, layersList.length, currentSizeZ - 1)"
            :disabled="currentSizeZ <= 1"
            class="w-5 h-5 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] disabled:opacity-30 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
          >-</button>
          <input 
            type="number" 
            min="1" 
            max="16" 
            :value="currentSizeZ" 
            @change="(e) => setDimensions(currentSizeX, layersList.length, parseInt((e.target as HTMLInputElement).value) || 1)"
            class="w-7 text-center font-mono text-cyan-400 text-xs font-extrabold bg-transparent focus:outline-none"
          />
          <button
            type="button"
            @click="setDimensions(currentSizeX, layersList.length, currentSizeZ + 1)"
            :disabled="currentSizeZ >= 16"
            class="w-5 h-5 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] disabled:opacity-30 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
          >+</button>
        </div>

        <!-- Size Presets -->
        <div class="hidden xl:flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
          <button 
            v-for="p in [[3,3,3], [5,5,5], [7,5,7], [9,9,9], [16,16,16]]"
            :key="`${p[0]}x${p[1]}x${p[2]}`"
            type="button"
            @click="setDimensions(p[0], p[1], p[2])"
            :class="[
              'px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer font-mono', 
              currentSizeX === p[0] && layersList.length === p[1] && currentSizeZ === p[2] ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white'
            ]"
          >
            {{ p[0] }}×{{ p[1] }}×{{ p[2] }}
          </button>
        </div>
      </div>

      <!-- 3D Tools (Paint, Erase, Picker) -->
      <div class="flex items-center gap-1.5">
        <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
          <button
            type="button"
            @click="activeTool = 'paint'"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
              activeTool === 'paint' ? 'bg-cyan-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
            ]"
            title="ЛКМ ставить выбранный блок"
          >
            <IconRenderer name="Pencil" size="13" />
            <span>Кисть</span>
          </button>

          <button
            type="button"
            @click="activeTool = 'erase'"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
              activeTool === 'erase' ? 'bg-rose-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
            ]"
            title="Ломать блоки при клике"
          >
            <IconRenderer name="Eraser" size="13" />
            <span>Ластик</span>
          </button>

          <button
            type="button"
            @click="activeTool = 'picker'"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
              activeTool === 'picker' ? 'bg-amber-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
            ]"
            title="Пипетка: подхватить блок из 3D-модели"
          >
            <IconRenderer name="Pipette" size="13" />
            <span>Пипетка</span>
          </button>
        </div>

        <button
          type="button"
          @click="clearEntireStructure"
          class="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
          title="Очистить всю постройку"
        >
          <IconRenderer name="Trash2" size="13" />
          <span>Очистить всё</span>
        </button>
      </div>
    </div>

    <!-- MAIN 3D BUILDER WORKSPACE: 3D Canvas (Left) + Palette & Layer Control (Right) -->
    <div :class="['grid gap-3 font-sans', isEditing ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1']">
      
      <!-- LEFT: 3D INTERACTIVE CANVAS -->
      <div :class="[isEditing ? 'lg:col-span-8' : 'w-full', 'relative rounded-2xl overflow-hidden shadow-2xl']">
        <Multiblock3DViewer 
          :layers="layersList" 
          :palette="currentPalette" 
          :is-editing="isEditing"
          :selected-material-id="selectedMaterialId"
          :active-tool="activeTool"
          :grid-size-x="currentSizeX"
          :grid-size-z="currentSizeZ"
          :max-visible-layer="maxVisibleLayer"
          @update-layers="(newLayers) => emit('update', { ...props.block, layers: newLayers })"
          @update:max-visible-layer="(val) => maxVisibleLayer = val"
          @select-material="(id) => selectedMaterialId = id"
          @add-layer="addLayer"
        />
      </div>

      <!-- RIGHT: LAYER CONTROL & BLOCK PALETTE (Only when editing) -->
      <div v-if="isEditing" class="lg:col-span-4 space-y-3 flex flex-col justify-between">
        <div class="space-y-3">
          <!-- 1. Layer Management Card -->
          <div class="bg-[#16181a] border border-[#26292d] p-3.5 rounded-2xl space-y-3 shadow-xl">
            <div class="flex items-center justify-between border-b border-[#26292d] pb-2.5">
              <div class="flex items-center gap-2">
                <IconRenderer name="Layers" size="15" class="text-cyan-400" />
                <span class="text-xs font-extrabold text-white uppercase tracking-wider">Слои по высоте (Y)</span>
              </div>
              <span class="text-[11px] font-mono text-cyan-400 font-extrabold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                {{ maxVisibleLayer === layersList.length ? 'Все (' + layersList.length + ')' : maxVisibleLayer + ' / ' + layersList.length }}
              </span>
            </div>

            <!-- Layer Slice Filter Pills -->
            <div class="space-y-2">
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  @click="maxVisibleLayer = layersList.length"
                  :class="[
                    'px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border',
                    maxVisibleLayer === layersList.length 
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-950/50' 
                      : 'bg-[#0c0d0e] text-dark-muted border-[#26292d] hover:text-white hover:border-[#3b3f46]'
                  ]"
                >
                  Все
                </button>

                <button
                  v-for="l in layersList.length"
                  :key="l"
                  type="button"
                  @click="maxVisibleLayer = l"
                  :class="[
                    'w-7 h-7 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all shrink-0 cursor-pointer border',
                    maxVisibleLayer === l 
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-950/50' 
                      : 'bg-[#0c0d0e] text-dark-muted border-[#26292d] hover:text-white hover:border-[#3b3f46]'
                  ]"
                >
                  {{ l }}
                </button>
              </div>

              <!-- Add/Delete Layer Buttons -->
              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  @click="addLayer"
                  :disabled="layersList.length >= 16"
                  class="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Добавить новый слой Y в высоту"
                >
                  <IconRenderer name="Plus" size="14" />
                  <span>+ Слой Y</span>
                </button>

                <button
                  v-if="layersList.length > 1"
                  type="button"
                  @click="removeTopLayer"
                  class="py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="Удалить верхний слой Y"
                >
                  <IconRenderer name="Trash2" size="13" />
                  <span>Удалить Y</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Block Palette Card -->
          <div class="bg-[#16181a] border border-[#26292d] p-3.5 rounded-2xl space-y-3 shadow-xl">
            <div class="flex items-center justify-between gap-2 border-b border-[#26292d] pb-2.5">
              <span class="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <IconRenderer name="Palette" size="15" class="text-cyan-400" />
                <span>Палитра блоков</span>
              </span>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  @click="showNewMaterialModal = true"
                  class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                  title="Добавить новый цвет блока"
                >
                  <IconRenderer name="Plus" size="13" />
                </button>

                <button
                  type="button"
                  @click="isGalleryOpen = true"
                  class="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Папка текстур и моделей"
                >
                  <IconRenderer name="FolderPlus" size="12" />
                  <span>Текстуры</span>
                </button>
              </div>
            </div>

          <!-- Vertical Palette List -->
          <div class="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            <div
              v-for="mat in currentPalette"
              :key="mat.id"
              class="relative group flex items-center justify-between bg-[#0c0d0e] border border-[#26292d] hover:border-[#3b3f46] rounded-xl p-2 transition-all cursor-pointer shadow-sm"
              :class="{
                'bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 border-cyan-400 text-white ring-1 ring-cyan-400/50 shadow-md': selectedMaterialId === mat.id
              }"
              @click="selectedMaterialId = mat.id"
            >
              <!-- Left: Image & Clean Name -->
              <div class="flex items-center gap-2 min-w-0 pr-2">
                <img 
                  v-if="mat.imageUrl || mat.topImageUrl || mat.sideImageUrl" 
                  :src="mat.sideImageUrl || mat.topImageUrl || mat.imageUrl" 
                  class="w-5 h-5 rounded border border-white/20 object-cover shrink-0" 
                />
                <span v-else-if="mat.color" class="w-4 h-4 rounded-md border border-black/40 shrink-0" :style="{ backgroundColor: mat.color }"></span>
                
                <span class="text-xs font-bold text-slate-200 truncate">{{ mat.name.replace(/\s*\(.*?\)$/, '') }}</span>

                <!-- Pack Origin Question Icon + Custom Tooltip -->
                <div 
                  v-if="mat.packTitle || mat.name.includes('(')" 
                  class="relative group/pack flex items-center justify-center text-cyan-400 hover:text-cyan-300 shrink-0 ml-0.5"
                  @click.stop
                >
                  <IconRenderer name="HelpCircle" size="13" class="opacity-70 hover:opacity-100" />
                  <div class="absolute right-0 bottom-full mb-1.5 hidden group-hover/pack:block z-50 pointer-events-none">
                    <div class="bg-[#090a0b] border border-cyan-500/50 text-cyan-300 text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap">
                      Пак: {{ mat.packTitle || (mat.name.match(/\((.*?)\)/)?.[1] || 'Ресурспак') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Selected Badge or Delete Button (No overlapping) -->
              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="selectedMaterialId === mat.id" class="text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                  Выбран
                </span>

                <button
                  v-if="currentPalette.length > 1"
                  type="button"
                  @click.stop="removeMaterialFromPalette(mat.id)"
                  class="w-5 h-5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-all cursor-pointer shadow"
                  title="Удалить блок из палитры"
                >
                  ✕
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Help Info Box -->
        <div class="bg-[#0c0d0e] border border-[#26292d] p-3 rounded-xl text-[11px] text-dark-muted space-y-1">
          <div class="font-bold text-slate-300 flex items-center gap-1">
            <IconRenderer name="Info" size="12" class="text-cyan-400" />
            <span>Подсказка:</span>
          </div>
          <p>Выберите блок в палитре и кликайте по граням 3D-модели для установки.</p>
        </div>
      </div>
    </div>

    <!-- Modal: Create New Color Block -->
    <div v-if="showNewMaterialModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-[#16181a] border border-[#26292d] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
            <IconRenderer name="Plus" size="16" class="text-emerald-400" />
            Добавить новый блок
          </h4>
          <button type="button" @click="showNewMaterialModal = false" class="text-dark-muted hover:text-white cursor-pointer">
            <IconRenderer name="X" size="16" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1">Название блока</label>
            <input 
              v-model="newMatName"
              type="text" 
              placeholder="Например: Магический рунический блок" 
              class="w-full bg-[#0c0d0e] border border-[#26292d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Цвет блока</label>
              <input 
                v-model="newMatColor"
                type="color" 
                class="w-full h-9 rounded-xl bg-[#0c0d0e] border border-[#26292d] cursor-pointer p-1"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Иконка</label>
              <select 
                v-model="newMatIcon"
                class="w-full bg-[#0c0d0e] border border-[#26292d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Box">Куб (Box)</option>
                <option value="Grid">Сетка (Grid)</option>
                <option value="Cpu">Процессор (Cpu)</option>
                <option value="Zap">Энергия (Zap)</option>
                <option value="Flame">Огонь (Flame)</option>
                <option value="Layers">Слои (Layers)</option>
                <option value="Sliders">Стержень (Sliders)</option>
                <option value="Disc">Ядро (Disc)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#26292d]">
          <button 
            type="button" 
            @click="showNewMaterialModal = false"
            class="px-3.5 py-1.5 rounded-xl bg-[#0c0d0e] text-xs font-bold text-dark-muted hover:text-white cursor-pointer"
          >
            Отмена
          </button>
          <button 
            type="button" 
            @click="addCustomMaterial"
            class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold shadow-md cursor-pointer"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Texture Gallery -->
    <AuthorGalleryModal
      :is-open="isGalleryOpen"
      :username="currentUsername || ''"
      :is-select-mode="true"
      @close="isGalleryOpen = false"
      @select="handleSelectGalleryMedia"
      @select-model="handleSelectCustomModel"
    />
  </div>
</template>



