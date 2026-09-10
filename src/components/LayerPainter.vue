<script setup lang="ts">
import { ref, computed } from 'vue';
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

// Editor modes & views
const viewMode = ref<'3d' | '2d'>(props.isEditing ? '2d' : '3d');
const activeTool = ref<'paint' | 'fill' | 'erase' | 'picker'>('paint');
const activeLayerIndex = ref<number>(0);
const isGalleryOpen = ref(false);
const activeTargetFace = ref<'all' | 'top' | 'bottom' | 'side'>('all');
const showNewMaterialModal = ref(false);

// Material Creation State
const newMatName = ref('');
const newMatColor = ref('#38bdf8');
const newMatIcon = ref('Box');

// Current Palette & Selection
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

const activeLayer = computed(() => layersList.value[activeLayerIndex.value] || layersList.value[0]);

// Material summary calculation
const materialSummary = computed(() => {
  const counts: Record<string, number> = {};
  layersList.value.forEach(l => {
    l.grid.forEach(row => {
      row.forEach(matId => {
        if (matId) {
          counts[matId] = (counts[matId] || 0) + 1;
        }
      });
    });
  });

  return Object.entries(counts).map(([matId, count]) => {
    const mat = currentPalette.value.find(p => p.id === matId) || {
      id: matId,
      name: matId,
      icon: 'Box',
      color: '#94a3b8'
    };
    return { material: mat, count };
  });
});

const getMaterial = (id: string | null): MultiblockPaletteItem => {
  if (!id) return { id: 'empty', name: 'Пусто / Воздух', icon: 'Square', color: '#121416' };
  return currentPalette.value.find(p => p.id === id) || { id, name: id, icon: 'Box', color: '#94a3b8' };
};

// Tool Actions on Grid
const handleCellClick = (rowIndex: number, colIndex: number) => {
  if (!props.isEditing) return;

  const currentCell = activeLayer.value.grid[rowIndex][colIndex];

  // Tool 1: Eyedropper / Picker
  if (activeTool.value === 'picker') {
    if (currentCell) {
      selectedMaterialId.value = currentCell;
    }
    activeTool.value = 'paint';
    return;
  }

  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const targetGrid = newLayers[activeLayerIndex.value].grid;

  // Tool 2: Erase
  if (activeTool.value === 'erase') {
    targetGrid[rowIndex][colIndex] = null;
  }
  // Tool 3: Fill (Flood Fill algorithm)
  else if (activeTool.value === 'fill') {
    const targetMat = targetGrid[rowIndex][colIndex];
    const fillMat = selectedMaterialId.value;
    if (targetMat === fillMat) return;

    const rows = targetGrid.length;
    const cols = targetGrid[0].length;
    const queue: [number, number][] = [[rowIndex, colIndex]];

    while (queue.length > 0) {
      const [r, c] = queue.pop()!;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      if (targetGrid[r][c] !== targetMat) continue;

      targetGrid[r][c] = fillMat;
      queue.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
  }
  // Tool 4: Paint
  else {
    if (currentCell === selectedMaterialId.value) {
      targetGrid[rowIndex][colIndex] = null; // Toggle off if clicked with same mat
    } else {
      targetGrid[rowIndex][colIndex] = selectedMaterialId.value;
    }
  }

  emit('update', { ...props.block, layers: newLayers });
};

// Layer Operations
const addLayer = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const nextNum = newLayers.length + 1;
  const width = currentSizeX.value;
  const depth = currentSizeZ.value;
  newLayers.push({
    layerNumber: nextNum,
    grid: Array(depth).fill(null).map(() => Array(width).fill(null))
  });
  emit('update', { ...props.block, layers: newLayers });
  activeLayerIndex.value = newLayers.length - 1;
};

const duplicateLayer = (index: number) => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const source = newLayers[index];
  const duplicatedGrid = JSON.parse(JSON.stringify(source.grid));
  newLayers.splice(index + 1, 0, {
    layerNumber: index + 2,
    grid: duplicatedGrid
  });
  newLayers.forEach((l, i) => l.layerNumber = i + 1);
  emit('update', { ...props.block, layers: newLayers });
  activeLayerIndex.value = index + 1;
};

const removeLayer = (index: number) => {
  if (layersList.value.length <= 1) return;
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  newLayers.splice(index, 1);
  newLayers.forEach((l, i) => l.layerNumber = i + 1);
  emit('update', { ...props.block, layers: newLayers });
  if (activeLayerIndex.value >= newLayers.length) {
    activeLayerIndex.value = newLayers.length - 1;
  }
};

const clearCurrentLayer = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const targetGrid = newLayers[activeLayerIndex.value].grid;
  for (let r = 0; r < targetGrid.length; r++) {
    for (let c = 0; c < targetGrid[r].length; c++) {
      targetGrid[r][c] = null;
    }
  }
  emit('update', { ...props.block, layers: newLayers });
};

const fillCurrentLayerBorder = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const targetGrid = newLayers[activeLayerIndex.value].grid;
  const rows = targetGrid.length;
  const cols = targetGrid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        targetGrid[r][c] = selectedMaterialId.value;
      }
    }
  }
  emit('update', { ...props.block, layers: newLayers });
};

const fillEntireCurrentLayer = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const targetGrid = newLayers[activeLayerIndex.value].grid;
  for (let r = 0; r < targetGrid.length; r++) {
    for (let c = 0; c < targetGrid[r].length; c++) {
      targetGrid[r][c] = selectedMaterialId.value;
    }
  }
  emit('update', { ...props.block, layers: newLayers });
};

// Set Grid Sizes
const setCustomDimensions = (newWidth: number, newDepth: number) => {
  const width = Math.max(1, Math.min(12, newWidth));
  const depth = Math.max(1, Math.min(12, newDepth));
  
  const createGrid = () => Array(depth).fill(null).map(() => Array(width).fill(null));
  const numLayers = layersList.value.length || 3;
  const newLayers: MultiblockLayer[] = [];
  
  for (let i = 0; i < numLayers; i++) {
    newLayers.push({ layerNumber: i + 1, grid: createGrid() });
  }

  // Preserve existing center if resizing
  for (let i = 0; i < Math.min(numLayers, layersList.value.length); i++) {
    const oldGrid = layersList.value[i].grid;
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
  activeLayerIndex.value = 0;
};

// Gallery & Face Textures handlers
const openGalleryForFace = (face: 'all' | 'top' | 'bottom' | 'side') => {
  activeTargetFace.value = face;
  isGalleryOpen.value = true;
};

const updateSelectedMatFace = (face: 'top' | 'bottom' | 'side' | 'all', url: string) => {
  const customPalette = [...currentPalette.value];
  const idx = customPalette.findIndex(p => p.id === selectedMaterialId.value);
  if (idx !== -1) {
    const mat = { ...customPalette[idx] };
    if (face === 'top') mat.topImageUrl = url;
    else if (face === 'bottom') mat.bottomImageUrl = url;
    else if (face === 'side') mat.sideImageUrl = url;
    else mat.imageUrl = url;

    customPalette[idx] = mat;
    emit('update', { ...props.block, palette: customPalette });
  }
};

const handleSelectGalleryMedia = (media: AuthorMediaItem) => {
  const customPalette = [...currentPalette.value];
  let targetIdx = customPalette.findIndex(p => p.id === selectedMaterialId.value);

  if (targetIdx === -1) {
    const newMat: MultiblockPaletteItem = {
      id: `custom_${media.id}_${Date.now()}`,
      name: media.name,
      icon: 'Image',
      color: '#06b6d4',
      imageUrl: media.url
    };
    if (activeTargetFace.value === 'top') newMat.topImageUrl = media.url;
    if (activeTargetFace.value === 'bottom') newMat.bottomImageUrl = media.url;
    if (activeTargetFace.value === 'side') newMat.sideImageUrl = media.url;

    customPalette.push(newMat);
    selectedMaterialId.value = newMat.id;
  } else {
    const mat = { ...customPalette[targetIdx] };
    if (activeTargetFace.value === 'all') {
      mat.imageUrl = media.url;
    } else if (activeTargetFace.value === 'top') {
      mat.topImageUrl = media.url;
    } else if (activeTargetFace.value === 'bottom') {
      mat.bottomImageUrl = media.url;
    } else if (activeTargetFace.value === 'side') {
      mat.sideImageUrl = media.url;
      if (!mat.imageUrl) mat.imageUrl = media.url;
    }
    customPalette[targetIdx] = mat;
  }

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

// Add New Custom Material
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
  <div class="space-y-4 font-sans text-slate-200">
    <!-- Top Bar: Title & Mode Switcher -->
    <div class="flex items-center justify-between bg-[#16181a] border border-[#26292d] p-3.5 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
          <IconRenderer name="Layers" size="20" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-extrabold text-white">Конструктор Мультиструктуры</h3>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              {{ currentSizeX }}×{{ currentSizeZ }} × Y={{ layersList.length }}
            </span>
          </div>
          <p class="text-xs text-dark-muted">
            {{ viewMode === '3d' ? 'Интерактивный 3D-просмотр (орбитальная камера, послойные срезы)' : 'Интерактивный 2D-редактор слоев постройки' }}
          </p>
        </div>
      </div>

      <!-- Mode Toggle -->
      <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
        <button
          type="button"
          @click="viewMode = '3d'"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer',
            viewMode === '3d' ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          <IconRenderer name="Box" size="14" />
          <span>3D Вид</span>
        </button>

        <button
          type="button"
          @click="viewMode = '2d'"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer',
            viewMode === '2d' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          <IconRenderer name="Grid" size="14" />
          <span>Конструктор (2D)</span>
        </button>
      </div>
    </div>

    <!-- VIEW 1: Interactive 3D Model Viewer -->
    <div v-if="viewMode === '3d'" class="animate-fadeIn">
      <Multiblock3DViewer 
        :layers="layersList" 
        :palette="currentPalette" 
        :is-editing="isEditing"
        :selected-material-id="selectedMaterialId"
        :active-tool="activeTool"
        :grid-size-x="currentSizeX"
        :grid-size-z="currentSizeZ"
        @update-layers="(newLayers) => emit('update', { ...props.block, layers: newLayers })"
        @select-material="(id) => selectedMaterialId = id"
      />
    </div>

    <!-- VIEW 2: Interactive 2D Grid Constructor -->
    <div v-else class="bg-[#16181a] border border-[#26292d] rounded-2xl p-5 shadow-2xl space-y-6 animate-fadeIn">
      
      <!-- Toolbar & Dimension Controls (When Editing) -->
      <div v-if="isEditing" class="space-y-4">
        
        <!-- Controls Row 1: Dimensions & Quick Presets -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#26292d] pb-4">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-slate-300">Размер сетки:</span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="setCustomDimensions(currentSizeX - 1, currentSizeZ - 1)"
                class="w-7 h-7 rounded-lg bg-[#0c0d0e] border border-[#26292d] hover:bg-[#1a1d21] text-slate-300 flex items-center justify-center font-mono font-bold cursor-pointer"
                title="Уменьшить сетку"
              >-</button>
              <span class="font-mono text-cyan-400 bg-[#0c0d0e] px-2.5 py-1 rounded-lg border border-[#26292d] text-xs font-extrabold">
                {{ currentSizeX }} x {{ currentSizeZ }}
              </span>
              <button
                type="button"
                @click="setCustomDimensions(currentSizeX + 1, currentSizeZ + 1)"
                class="w-7 h-7 rounded-lg bg-[#0c0d0e] border border-[#26292d] hover:bg-[#1a1d21] text-slate-300 flex items-center justify-center font-mono font-bold cursor-pointer"
                title="Увеличить сетку"
              >+</button>
            </div>
          </div>

          <div class="flex items-center gap-1.5 bg-[#0c0d0e] p-1.5 rounded-xl border border-[#26292d]">
            <span class="text-[11px] text-dark-muted px-1 font-medium">Быстрые размеры:</span>
            <button 
              v-for="dim in [[3,3], [5,5], [7,7], [9,9], [4,6]]"
              :key="`${dim[0]}x${dim[1]}`"
              type="button"
              @click="setCustomDimensions(dim[0], dim[1])"
              :class="[
                'px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer', 
                currentSizeX === dim[0] && currentSizeZ === dim[1] ? 'bg-cyan-600 text-white shadow-md' : 'text-dark-muted hover:text-white bg-[#121416]'
              ]"
            >
              {{ dim[0] }}x{{ dim[1] }}
            </button>
          </div>
        </div>

        <!-- Controls Row 2: Drawing Tools & Palette Selector -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Drawing Tools Panel -->
          <div class="lg:col-span-4 bg-[#0c0d0e] p-3 rounded-xl border border-[#26292d] space-y-2">
            <div class="text-[11px] font-bold text-dark-muted uppercase tracking-wider flex items-center justify-between">
              <span>Инструменты рисования</span>
              <span class="text-cyan-400 capitalize font-mono">{{ activeTool }}</span>
            </div>
            
            <div class="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                @click="activeTool = 'paint'"
                :class="[
                  'p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer',
                  activeTool === 'paint' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-inner' : 'bg-[#121416] border-[#26292d] text-dark-muted hover:text-white'
                ]"
                title="Рисование блоком"
              >
                <IconRenderer name="Pencil" size="16" />
                <span class="text-[10px]">Кисть</span>
              </button>

              <button
                type="button"
                @click="activeTool = 'fill'"
                :class="[
                  'p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer',
                  activeTool === 'fill' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-inner' : 'bg-[#121416] border-[#26292d] text-dark-muted hover:text-white'
                ]"
                title="Заливка связной области"
              >
                <IconRenderer name="Paintbucket" size="16" />
                <span class="text-[10px]">Заливка</span>
              </button>

              <button
                type="button"
                @click="activeTool = 'erase'"
                :class="[
                  'p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer',
                  activeTool === 'erase' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-inner' : 'bg-[#121416] border-[#26292d] text-dark-muted hover:text-white'
                ]"
                title="Ластик (Удаление блоков)"
              >
                <IconRenderer name="Eraser" size="16" />
                <span class="text-[10px]">Ластик</span>
              </button>

              <button
                type="button"
                @click="activeTool = 'picker'"
                :class="[
                  'p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer',
                  activeTool === 'picker' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-inner' : 'bg-[#121416] border-[#26292d] text-dark-muted hover:text-white'
                ]"
                title="Пипетка (Пикнуть блок с сетки)"
              >
                <IconRenderer name="Pipette" size="16" />
                <span class="text-[10px]">Пипетка</span>
              </button>
            </div>
          </div>

          <!-- Material Palette Grid -->
          <div class="lg:col-span-8 bg-[#0c0d0e] p-3 rounded-xl border border-[#26292d] space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                Палитра блоков ({{ currentPalette.length }})
              </span>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="showNewMaterialModal = true"
                  class="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <IconRenderer name="Plus" size="12" />
                  <span>Новый блок</span>
                </button>

                <button
                  type="button"
                  @click="isGalleryOpen = true"
                  class="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Выбрать текстуру из медиагалереи"
                >
                  <IconRenderer name="FolderPlus" size="12" />
                  <span>Текстуры</span>
                </button>
              </div>
            </div>

            <!-- Palette Items Carousel/Grid -->
            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              <div
                v-for="mat in currentPalette"
                :key="mat.id"
                class="relative group"
              >
                <button
                  type="button"
                  @click="selectedMaterialId = mat.id"
                  :class="[
                    'px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                    selectedMaterialId === mat.id 
                      ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md ring-1 ring-cyan-500/50' 
                      : 'bg-[#121416] border-[#26292d] hover:border-[#3b3f46] text-slate-300'
                  ]"
                >
                  <img 
                    v-if="mat.imageUrl || mat.topImageUrl || mat.sideImageUrl" 
                    :src="mat.sideImageUrl || mat.topImageUrl || mat.imageUrl" 
                    class="w-4 h-4 rounded border border-white/20 object-cover" 
                  />
                  <span v-else class="w-3 h-3 rounded-full border border-black/40" :style="{ backgroundColor: mat.color }"></span>
                  <IconRenderer :name="mat.icon" size="13" :color="mat.color" />
                  <span>{{ mat.name }}</span>
                </button>

                <!-- Delete Material Button -->
                <button
                  v-if="currentPalette.length > 1"
                  type="button"
                  @click.stop="removeMaterialFromPalette(mat.id)"
                  class="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-rose-600 text-white items-center justify-center text-[10px] shadow cursor-pointer"
                  title="Удалить из палитры"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Face Texture Customizer Box for Selected Material -->
        <div v-if="selectedMat" class="bg-[#0c0d0e] border border-[#26292d] p-3 rounded-xl space-y-2.5">
          <div class="flex items-center justify-between text-xs font-bold text-slate-300">
            <span class="flex items-center gap-2">
              <IconRenderer name="Palette" size="14" class="text-cyan-400" />
              <span>Текстурирование граней: <strong class="text-cyan-300 font-mono">{{ selectedMat.name }}</strong></span>
            </span>
            <span class="text-[10px] text-dark-muted font-normal">Поддержка настраиваемых Top, Sides и Bottom текстур</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- 1. Top Face -->
            <div class="bg-[#121416] p-2.5 rounded-xl border border-[#26292d] space-y-1.5">
              <div class="text-[11px] font-extrabold text-emerald-400 flex items-center justify-between">
                <span>Верх (Top)</span>
                <button type="button" @click="openGalleryForFace('top')" class="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer">Галерея</button>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-[#16181a] border border-white/10 overflow-hidden flex-shrink-0">
                  <img v-if="selectedMat.topImageUrl || selectedMat.imageUrl" :src="selectedMat.topImageUrl || selectedMat.imageUrl" class="w-full h-full object-cover" />
                </div>
                <input
                  type="text"
                  :value="selectedMat.topImageUrl || ''"
                  @input="updateSelectedMatFace('top', ($event.target as HTMLInputElement).value)"
                  placeholder="URL верха..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <!-- 2. Side Face -->
            <div class="bg-[#121416] p-2.5 rounded-xl border border-[#26292d] space-y-1.5">
              <div class="text-[11px] font-extrabold text-cyan-400 flex items-center justify-between">
                <span>Бока (Sides)</span>
                <button type="button" @click="openGalleryForFace('side')" class="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer">Галерея</button>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-[#16181a] border border-white/10 overflow-hidden flex-shrink-0">
                  <img v-if="selectedMat.sideImageUrl || selectedMat.imageUrl" :src="selectedMat.sideImageUrl || selectedMat.imageUrl" class="w-full h-full object-cover" />
                </div>
                <input
                  type="text"
                  :value="selectedMat.sideImageUrl || selectedMat.imageUrl || ''"
                  @input="updateSelectedMatFace('side', ($event.target as HTMLInputElement).value)"
                  placeholder="URL боковой грани..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <!-- 3. Bottom Face -->
            <div class="bg-[#121416] p-2.5 rounded-xl border border-[#26292d] space-y-1.5">
              <div class="text-[11px] font-extrabold text-amber-400 flex items-center justify-between">
                <span>Низ (Bottom)</span>
                <button type="button" @click="openGalleryForFace('bottom')" class="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer">Галерея</button>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-[#16181a] border border-white/10 overflow-hidden flex-shrink-0">
                  <img v-if="selectedMat.bottomImageUrl || selectedMat.imageUrl" :src="selectedMat.bottomImageUrl || selectedMat.imageUrl" class="w-full h-full object-cover" />
                </div>
                <input
                  type="text"
                  :value="selectedMat.bottomImageUrl || ''"
                  @input="updateSelectedMatFace('bottom', ($event.target as HTMLInputElement).value)"
                  placeholder="URL низа..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Layer Selector Tabs & Quick Layer Actions -->
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <!-- Layer Tabs -->
          <div class="flex items-center gap-1.5 bg-[#0c0d0e] p-1.5 rounded-xl border border-[#26292d]">
            <button
              v-for="(layer, index) in layersList"
              :key="layer.layerNumber"
              type="button"
              @click="activeLayerIndex = index"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
                activeLayerIndex === index 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-inner' 
                  : 'text-dark-muted hover:text-white hover:bg-[#16181a]'
              ]"
            >
              <span>Слой {{ layer.layerNumber }}</span>
              <span class="text-[10px] bg-black/50 px-1.5 py-0.5 rounded font-mono text-dark-muted">Y={{ layer.layerNumber }}</span>
              <button 
                v-if="isEditing && layersList.length > 1" 
                type="button"
                @click.stop="removeLayer(index)"
                class="text-rose-400 hover:text-rose-300 ml-1 p-0.5"
                title="Удалить слой"
              >
                <IconRenderer name="X" size="12" />
              </button>
            </button>
          </div>

          <!-- Add New Layer Button -->
          <button
            v-if="isEditing"
            type="button"
            @click="addLayer"
            class="px-3.5 py-1.5 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <IconRenderer name="Plus" size="14" />
            Добавить Слой Y={{ layersList.length + 1 }}
          </button>
        </div>

        <!-- Layer Operations Bar (Fill Ring, Fill Layer, Duplicate, Clear) -->
        <div v-if="isEditing" class="flex flex-wrap items-center justify-between gap-2 bg-[#0c0d0e] p-2 rounded-xl border border-[#26292d]">
          <div class="text-[11px] font-bold text-dark-muted flex items-center gap-1.5 px-1">
            <IconRenderer name="Wrench" size="13" class="text-cyan-400" />
            <span>Действия со слоем Y={{ activeLayer.layerNumber }}:</span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              @click="duplicateLayer(activeLayerIndex)"
              class="px-2.5 py-1 rounded-lg bg-[#16181a] hover:bg-[#1f2226] text-xs font-semibold text-slate-300 border border-[#26292d] flex items-center gap-1 transition-all cursor-pointer"
              title="Создать копию текущего слоя выше"
            >
              <IconRenderer name="Copy" size="12" />
              <span>Дублировать слой</span>
            </button>

            <button
              type="button"
              @click="fillCurrentLayerBorder"
              class="px-2.5 py-1 rounded-lg bg-[#16181a] hover:bg-[#1f2226] text-xs font-semibold text-slate-300 border border-[#26292d] flex items-center gap-1 transition-all cursor-pointer"
              title="Заполнить стены/контур выбранным блоком"
            >
              <IconRenderer name="Square" size="12" />
              <span>Контур стен</span>
            </button>

            <button
              type="button"
              @click="fillEntireCurrentLayer"
              class="px-2.5 py-1 rounded-lg bg-[#16181a] hover:bg-[#1f2226] text-xs font-semibold text-slate-300 border border-[#26292d] flex items-center gap-1 transition-all cursor-pointer"
              title="Заполнить весь слой текущим блоком"
            >
              <IconRenderer name="Grid" size="12" />
              <span>Залить весь слой</span>
            </button>

            <button
              type="button"
              @click="clearCurrentLayer"
              class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer"
              title="Очистить слой"
            >
              <IconRenderer name="Trash2" size="12" />
              <span>Очистить</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main 2D Grid Canvas -->
      <div class="flex flex-col items-center justify-center p-6 bg-[#0c0d0e] rounded-xl border border-[#26292d] relative shadow-inner">
        <div class="text-xs font-bold text-dark-muted mb-4 flex items-center gap-2">
          <span>Вид сверху (Слой {{ activeLayer.layerNumber }}, Y={{ activeLayer.layerNumber }})</span>
          <span class="text-[10px] text-cyan-400 font-mono">
            Нажмите на ячейку для {{ isEditing ? 'нанесения / удаления' : 'просмотра' }}
          </span>
        </div>

        <!-- 2D Grid Matrix -->
        <div 
          class="grid gap-2 p-4 bg-[#121416] rounded-xl border border-[#26292d] shadow-2xl overflow-x-auto max-w-full"
          :style="{ gridTemplateColumns: `repeat(${currentSizeX}, minmax(0, 1fr))` }"
        >
          <template v-for="(row, rowIndex) in activeLayer.grid" :key="rowIndex">
            <button
              v-for="(cellMatId, colIndex) in row"
              :key="colIndex"
              type="button"
              @click="handleCellClick(rowIndex, colIndex)"
              :disabled="!isEditing"
              :class="[
                'w-12 h-12 sm:w-14 sm:h-14 rounded-lg border flex flex-col items-center justify-center relative transition-all duration-150 group shadow-md',
                isEditing ? 'cursor-pointer hover:scale-105 hover:border-cyan-400 active:scale-95' : 'cursor-default',
                cellMatId ? 'border-emerald-500/30 bg-[#16181a]' : 'border-[#26292d] bg-[#0c0d0e] hover:bg-[#16181a]'
              ]"
              :style="{ borderColor: cellMatId ? getMaterial(cellMatId).color : '#26292d' }"
            >
              <template v-if="cellMatId">
                <img 
                  v-if="getMaterial(cellMatId).topImageUrl || getMaterial(cellMatId).sideImageUrl || getMaterial(cellMatId).imageUrl"
                  :src="getMaterial(cellMatId).topImageUrl || getMaterial(cellMatId).sideImageUrl || getMaterial(cellMatId).imageUrl" 
                  class="w-full h-full object-cover rounded-md p-0.5" 
                  :alt="getMaterial(cellMatId).name"
                />
                <IconRenderer 
                  v-else 
                  :name="getMaterial(cellMatId).icon" 
                  size="22" 
                  :color="getMaterial(cellMatId).color" 
                />
              </template>
              <span v-else class="text-[10px] text-dark-muted font-mono select-none">.</span>

              <!-- Hover Tooltip -->
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 pointer-events-none">
                <div class="bg-black/95 border border-dark-border text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getMaterial(cellMatId).color }"></span>
                  <span>{{ getMaterial(cellMatId).name }}</span>
                </div>
              </div>
            </button>
          </template>
        </div>
      </div>

      <!-- Materials Summary & Totals -->
      <div class="bg-[#121416] border border-[#26292d] p-4 rounded-xl space-y-3 shadow-md">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-2.5">
          <div class="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wider">
            <IconRenderer name="CheckCircle2" size="16" class="text-emerald-400" />
            <span>Сводка ресурсов и блоков постройки</span>
          </div>
          <span class="text-xs font-bold text-cyan-400 font-mono bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
            Всего блоков: {{ materialSummary.reduce((acc, curr) => acc + curr.count, 0) }}
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          <div
            v-for="item in materialSummary"
            :key="item.material.id"
            class="bg-[#16181a] border border-[#26292d] p-2.5 rounded-xl flex items-center justify-between"
          >
            <div class="flex items-center gap-2 min-w-0">
              <img 
                v-if="item.material.imageUrl || item.material.topImageUrl || item.material.sideImageUrl" 
                :src="item.material.sideImageUrl || item.material.topImageUrl || item.material.imageUrl" 
                class="w-5 h-5 rounded border border-white/20 object-cover shrink-0" 
              />
              <IconRenderer v-else :name="item.material.icon" size="16" :color="item.material.color" class="shrink-0" />
              <span class="text-xs text-slate-200 truncate font-semibold">{{ item.material.name }}</span>
            </div>
            <span class="text-xs font-extrabold text-emerald-400 font-mono ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
              x{{ item.count }}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal 1: Create Custom Material -->
    <div v-if="showNewMaterialModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-[#16181a] border border-[#26292d] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
            <IconRenderer name="Plus" size="16" class="text-emerald-400" />
            Добавить новый блок в палитру
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
              placeholder="Например: Плотный Кабельный Контроллер" 
              class="w-full bg-[#0c0d0e] border border-[#26292d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Цвет иконки</label>
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
            Создать блок
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 2: Author Media Gallery Modal -->
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


