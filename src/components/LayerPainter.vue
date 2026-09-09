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

const isGalleryOpen = ref(false);
const viewMode = ref<'3d' | '2d'>(props.isEditing ? '2d' : '3d');
const activeLayerIndex = ref<number>(0);
const selectedMaterialId = ref<string>(props.block.palette?.[0]?.id || PRESET_MULTIBLOCK_MATERIALS[0].id);
const activeTargetFace = ref<'all' | 'top' | 'bottom' | 'side'>('all');

const selectedMat = computed(() => {
  return currentPalette.value.find(p => p.id === selectedMaterialId.value) || currentPalette.value[0];
});

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
    emit('update', {
      ...props.block,
      palette: customPalette
    });
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

  emit('update', {
    ...props.block,
    palette: customPalette
  });
};

const handleSelectCustomModel = (model: MultiblockPaletteItem) => {
  const customPalette = [...currentPalette.value];
  if (!customPalette.some(p => p.id === model.id)) {
    customPalette.push(model);
    emit('update', {
      ...props.block,
      palette: customPalette
    });
  }
  selectedMaterialId.value = model.id;
};

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

const currentPalette = computed<MultiblockPaletteItem[]>(() => props.block.palette && props.block.palette.length > 0 ? props.block.palette : PRESET_MULTIBLOCK_MATERIALS);

const layersList = computed<MultiblockLayer[]>(() => {
  if (props.block.layers && props.block.layers.length > 0) {
    return props.block.layers;
  }
  const sizeX = currentSizeX.value;
  const sizeZ = currentSizeZ.value;
  return [
    { layerNumber: 1, grid: Array(sizeZ).fill(null).map(() => Array(sizeX).fill(currentPalette.value[0].id)) },
    { layerNumber: 2, grid: Array(sizeZ).fill(null).map(() => Array(sizeX).fill(currentPalette.value[1]?.id || currentPalette.value[0].id)) },
    { layerNumber: 3, grid: Array(sizeZ).fill(null).map(() => Array(sizeX).fill(currentPalette.value[0].id)) },
  ];
});

const activeLayer = computed(() => layersList.value[activeLayerIndex.value] || layersList.value[0]);

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

const paintCell = (rowIndex: number, colIndex: number) => {
  if (!props.isEditing) return;
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const targetLayer = newLayers[activeLayerIndex.value];
  if (!targetLayer) return;

  const currentCell = targetLayer.grid[rowIndex][colIndex];
  if (currentCell === selectedMaterialId.value) {
    targetLayer.grid[rowIndex][colIndex] = null;
  } else {
    targetLayer.grid[rowIndex][colIndex] = selectedMaterialId.value;
  }

  emit('update', {
    ...props.block,
    layers: newLayers
  });
};

const setCustomDimensions = (newWidth: number, newDepth: number) => {
  const width = Math.max(1, Math.min(12, newWidth));
  const depth = Math.max(1, Math.min(12, newDepth));
  
  const createGrid = () => Array(depth).fill(null).map(() => Array(width).fill(currentPalette.value[0].id));
  const numLayers = layersList.value.length || 3;
  const newLayers: MultiblockLayer[] = [];
  
  for (let i = 0; i < numLayers; i++) {
    newLayers.push({ layerNumber: i + 1, grid: createGrid() });
  }

  emit('update', {
    ...props.block,
    gridSizeX: width,
    gridSizeZ: depth,
    layers: newLayers
  });
  activeLayerIndex.value = 0;
};

const addLayer = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const nextNum = newLayers.length + 1;
  const width = currentSizeX.value;
  const depth = currentSizeZ.value;
  newLayers.push({
    layerNumber: nextNum,
    grid: Array(depth).fill(null).map(() => Array(width).fill(currentPalette.value[0].id))
  });
  emit('update', {
    ...props.block,
    layers: newLayers
  });
  activeLayerIndex.value = newLayers.length - 1;
};

const removeLayer = (index: number) => {
  if (layersList.value.length <= 1) return;
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  newLayers.splice(index, 1);
  newLayers.forEach((l, i) => l.layerNumber = i + 1);
  emit('update', {
    ...props.block,
    layers: newLayers
  });
  if (activeLayerIndex.value >= newLayers.length) {
    activeLayerIndex.value = newLayers.length - 1;
  }
};

const getMaterial = (id: string | null): MultiblockPaletteItem => {
  if (!id) return { id: 'empty', name: 'Воздух / Пусто', icon: 'Square', color: '#16181a' };
  return currentPalette.value.find(p => p.id === id) || { id, name: id, icon: 'Box', color: '#94a3b8' };
};
</script>

<template>
  <div class="space-y-4">
    <!-- View Mode Switcher (3D Model vs 2D Layers) -->
    <div class="flex items-center justify-between bg-[#16181a] border border-[#26292d] p-3 rounded-2xl">
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <IconRenderer name="Layers" size="20" />
        </div>
        <div>
          <h3 class="text-sm font-extrabold text-white">Мультиструктура (3D & Слои)</h3>
          <p class="text-xs text-dark-muted">
            {{ viewMode === '3d' ? 'Интерактивная 3D Модель (Вращение, Приближение, Срезы)' : 'Послойная схема редактора (2D Сетка)' }}
          </p>
        </div>
      </div>

      <!-- Mode Toggle Buttons -->
      <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
        <button
          type="button"
          @click="viewMode = '3d'"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer',
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
            'px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer',
            viewMode === '2d' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' : 'text-dark-muted hover:text-white'
          ]"
        >
          <IconRenderer name="Grid" size="14" />
          <span>Послойно (2D)</span>
        </button>
      </div>
    </div>

    <!-- VIEW 1: Interactive 3D Model -->
    <div v-if="viewMode === '3d'" class="animate-fadeIn">
      <Multiblock3DViewer 
        :layers="layersList" 
        :palette="currentPalette" 
      />
    </div>

    <!-- VIEW 2: 2D Layer Painter & Editor -->
    <div v-else class="bg-[#16181a] border border-[#26292d] rounded-2xl p-5 shadow-lg space-y-5 animate-fadeIn">
      <!-- Header Size Switcher -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#26292d] pb-4">
        <div class="text-xs font-bold text-slate-300 flex items-center gap-2">
          <span>Размеры постройки (ШхД):</span>
          <span class="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
            {{ currentSizeX }} x {{ currentSizeZ }} (Высота {{ layersList.length }})
          </span>
        </div>

        <div v-if="isEditing" class="flex flex-wrap items-center gap-1.5 bg-[#0c0d0e] p-1.5 rounded-xl border border-[#26292d]">
          <span class="text-[11px] text-dark-muted px-1 font-medium">Пресеты:</span>
          <button 
            type="button"
            @click="setCustomDimensions(3, 3)"
            :class="['px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer', currentSizeX === 3 && currentSizeZ === 3 ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white bg-[#121416]']"
          >
            3x3
          </button>
          <button 
            type="button"
            @click="setCustomDimensions(5, 5)"
            :class="['px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer', currentSizeX === 5 && currentSizeZ === 5 ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white bg-[#121416]']"
          >
            5x5
          </button>
          <button 
            type="button"
            @click="setCustomDimensions(4, 6)"
            :class="['px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer', currentSizeX === 4 && currentSizeZ === 6 ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white bg-[#121416]']"
          >
            4x6
          </button>
          <button 
            type="button"
            @click="setCustomDimensions(7, 7)"
            :class="['px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer', currentSizeX === 7 && currentSizeZ === 7 ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white bg-[#121416]']"
          >
            7x7
          </button>
        </div>
      </div>

      <!-- Palette Picker -->
      <div v-if="isEditing" class="space-y-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="text-xs font-medium text-dark-muted uppercase tracking-wider">Палитра блоков (нажмите для выбора):</div>
          
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="isGalleryOpen = true"
              class="px-2.5 py-1 rounded-lg bg-[#121416] hover:bg-[#1a1d21] text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Открыть коллекцию 3D моделей блоков"
            >
              <IconRenderer name="Box" size="13" class="text-cyan-400" />
              <span>3D-Модели</span>
            </button>

            <button
              type="button"
              @click="isGalleryOpen = true"
              class="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Открыть персональную галерею текстур"
            >
              <IconRenderer name="FolderPlus" size="13" />
              <span>Папка текстур</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="mat in currentPalette"
            :key="mat.id"
            type="button"
            @click="selectedMaterialId = mat.id"
            :class="[
              'px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer',
              selectedMaterialId === mat.id 
                ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md ring-1 ring-cyan-500/50' 
                : 'bg-[#121416] border-[#26292d] hover:border-[#3b3f46] text-slate-300'
            ]"
          >
            <!-- Texture Image Preview or Color Circle -->
            <img v-if="mat.imageUrl || mat.topImageUrl || mat.sideImageUrl" :src="mat.sideImageUrl || mat.topImageUrl || mat.imageUrl" class="w-4 h-4 rounded border border-white/20 object-cover" />
            <span v-else class="w-3 h-3 rounded-full border border-black/40" :style="{ backgroundColor: mat.color }"></span>
            <IconRenderer :name="mat.icon" size="14" :color="mat.color" />
            {{ mat.name }}
          </button>
        </div>

        <!-- Face Textures Configuration Box for Selected Block -->
        <div v-if="selectedMat" class="bg-[#0c0d0e] border border-[#26292d] p-3 rounded-xl space-y-2.5">
          <div class="flex items-center justify-between text-xs font-bold text-slate-300">
            <span class="flex items-center gap-1.5">
              <IconRenderer name="Layers" size="14" class="text-cyan-400" />
              <span>Текстуры граней блока: <strong class="text-cyan-300">{{ selectedMat.name }}</strong></span>
            </span>
            <span class="text-[10px] text-dark-muted font-medium">Верх, Бока и Низ могут иметь разную текстуру</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- 1. Top Face Texture -->
            <div class="bg-[#121416] p-2.5 rounded-xl border border-[#26292d] space-y-1.5">
              <div class="text-[11px] font-extrabold text-emerald-400 flex items-center justify-between">
                <span>⬆️ Верхняя грань (Top)</span>
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

            <!-- 2. Side Face Texture -->
            <div class="bg-[#121416] p-2.5 rounded-xl border border-[#26292d] space-y-1.5">
              <div class="text-[11px] font-extrabold text-cyan-400 flex items-center justify-between">
                <span>⬛ Боковые грани (Sides)</span>
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
                  placeholder="URL боков..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <!-- 3. Bottom Face Texture -->
            <div class="bg-[#121416] p-2.5 rounded-xl border border-[#26292d] space-y-1.5">
              <div class="text-[11px] font-extrabold text-amber-400 flex items-center justify-between">
                <span>⬇️ Нижняя грань (Bottom)</span>
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

      <!-- Layer Stepper / Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <div class="flex items-center gap-1.5 bg-[#0c0d0e] p-1.5 rounded-xl border border-[#26292d]">
          <button
            v-for="(layer, index) in layersList"
            :key="layer.layerNumber"
            type="button"
            @click="activeLayerIndex = index"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
              activeLayerIndex === index 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-inner' 
                : 'text-dark-muted hover:text-white hover:bg-[#16181a]'
            ]"
          >
            <span>Слой {{ layer.layerNumber }}</span>
            <span class="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-dark-muted">Y={{ layer.layerNumber }}</span>
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

        <button
          v-if="isEditing"
          type="button"
          @click="addLayer"
          class="px-3 py-1.5 rounded-xl border border-dashed border-[#26292d] hover:border-cyan-500/50 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <IconRenderer name="Plus" size="14" />
          Добавить Слой Y={{ layersList.length + 1 }}
        </button>
      </div>

      <!-- Grid Painter -->
      <div class="flex flex-col items-center justify-center p-6 bg-[#0c0d0e] rounded-xl border border-[#26292d]">
        <div class="text-xs font-medium text-dark-muted mb-3">
          Матрица Слоя {{ activeLayer.layerNumber }} (ШxД: {{ currentSizeX }}x{{ currentSizeZ }})
        </div>

        <div 
          class="grid gap-2 p-3 bg-[#121416] rounded-xl border border-[#26292d] shadow-2xl overflow-x-auto max-w-full"
          :style="{ gridTemplateColumns: `repeat(${currentSizeX}, minmax(0, 1fr))` }"
        >
          <template v-for="(row, rowIndex) in activeLayer.grid" :key="rowIndex">
            <button
              v-for="(cellMatId, colIndex) in row"
              :key="colIndex"
              type="button"
              @click="paintCell(rowIndex, colIndex)"
              :disabled="!isEditing"
              :class="[
                'w-12 h-12 sm:w-14 sm:h-14 rounded-lg border flex flex-col items-center justify-center relative transition-all duration-150 group',
                isEditing ? 'cursor-pointer hover:scale-105 hover:border-cyan-400' : 'cursor-default',
                cellMatId ? 'border-emerald-500/30 bg-[#16181a]' : 'border-[#26292d] bg-[#0c0d0e]'
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
              <span v-else class="text-[10px] text-dark-muted font-mono">.</span>

              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                <div class="bg-black/90 border border-dark-border text-white text-[11px] font-medium px-2 py-1 rounded shadow-xl whitespace-nowrap">
                  {{ getMaterial(cellMatId).name }}
                </div>
              </div>
            </button>
          </template>
        </div>
      </div>

      <!-- Materials Summary -->
      <div class="bg-[#121416] border border-[#26292d] p-4 rounded-xl space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
            <IconRenderer name="CheckCircle2" size="16" class="text-emerald-400" />
            Сводка необходимых блоков
          </div>
          <span class="text-xs text-dark-muted font-mono">
            Всего блоков: {{ materialSummary.reduce((acc, curr) => acc + curr.count, 0) }}
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          <div
            v-for="item in materialSummary"
            :key="item.material.id"
            class="bg-[#16181a] border border-[#26292d] p-2.5 rounded-lg flex items-center justify-between"
          >
            <div class="flex items-center gap-2 min-w-0">
              <IconRenderer :name="item.material.icon" size="16" :color="item.material.color" />
              <span class="text-xs text-slate-200 truncate">{{ item.material.name }}</span>
            </div>
            <span class="text-xs font-bold text-emerald-400 font-mono ml-2 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              x{{ item.count }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Author Gallery Modal for Custom Textures Selection -->
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

