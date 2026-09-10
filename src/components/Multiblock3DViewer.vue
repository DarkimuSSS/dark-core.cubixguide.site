<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { MultiblockLayer, MultiblockPaletteItem } from '../types/guide';

const props = defineProps<{
  layers: MultiblockLayer[];
  palette: MultiblockPaletteItem[];
  isEditing?: boolean;
  selectedMaterialId?: string;
  activeTool?: 'paint' | 'erase' | 'picker';
  gridSizeX?: number;
  gridSizeZ?: number;
  maxVisibleLayer?: number;
}>();

const emit = defineEmits<{
  (e: 'update-layers', layers: MultiblockLayer[]): void;
  (e: 'select-material', id: string): void;
  (e: 'add-layer'): void;
  (e: 'update:maxVisibleLayer', val: number): void;
}>();

// 3D Canvas / Projection Controls
const isDragging = ref(false);
const dragMoved = ref(false);
const previousMousePosition = ref({ x: 0, y: 0 });
const rotX = ref(-25); // Pitch
const rotY = ref(45);  // Yaw
const zoom = ref(1);   // Scale factor
const isAutoRotating = ref(false);
let autoRotateTimer: any = null;

// Slicing Control (Show layers up to maxLayer)
const internalMaxVisibleLayer = ref<number>(props.maxVisibleLayer ?? props.layers?.length ?? 3);

watch(() => props.maxVisibleLayer, (val) => {
  if (val !== undefined) internalMaxVisibleLayer.value = val;
});

watch(() => props.layers, (newLayers) => {
  if (newLayers && newLayers.length > 0 && internalMaxVisibleLayer.value > newLayers.length) {
    internalMaxVisibleLayer.value = newLayers.length;
    emit('update:maxVisibleLayer', newLayers.length);
  }
}, { immediate: true });

const setMaxVisibleLayer = (val: number) => {
  internalMaxVisibleLayer.value = val;
  emit('update:maxVisibleLayer', val);
};

// Mouse Drag Events for 3D Orbiting
const onMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  dragMoved.value = false;
  previousMousePosition.value = { x: e.clientX, y: e.clientY };
  if (isAutoRotating.value) isAutoRotating.value = false;
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - previousMousePosition.value.x;
  const deltaY = e.clientY - previousMousePosition.value.y;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    dragMoved.value = true;
  }

  rotY.value += deltaX * 0.5;
  rotX.value = Math.max(-85, Math.min(85, rotX.value - deltaY * 0.5));

  previousMousePosition.value = { x: e.clientX, y: e.clientY };
};

const onMouseUp = () => {
  isDragging.value = false;
};

// Touch Drag Support for Mobile
const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    isDragging.value = true;
    previousMousePosition.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
};

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || e.touches.length !== 1) return;
  const deltaX = e.touches[0].clientX - previousMousePosition.value.x;
  const deltaY = e.touches[0].clientY - previousMousePosition.value.y;

  rotY.value += deltaX * 0.6;
  rotX.value = Math.max(-85, Math.min(85, rotX.value - deltaY * 0.6));

  previousMousePosition.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
};

const onTouchEnd = () => {
  isDragging.value = false;
};

// Zoom Control
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoom.value = Math.max(0.4, Math.min(2.5, zoom.value + delta));
};

const resetView = () => {
  rotX.value = -25;
  rotY.value = 45;
  zoom.value = 1;
  setMaxVisibleLayer(props.layers.length);
};

const toggleAutoRotate = () => {
  isAutoRotating.value = !isAutoRotating.value;
};

onMounted(() => {
  autoRotateTimer = setInterval(() => {
    if (isAutoRotating.value) {
      rotY.value = (rotY.value + 0.8) % 360;
    }
  }, 16);
});

onUnmounted(() => {
  if (autoRotateTimer) clearInterval(autoRotateTimer);
});

const getMaterial = (id: string | null): MultiblockPaletteItem => {
  if (!id) return { id: 'empty', name: 'Воздух', icon: 'Square', color: 'transparent' };
  return props.palette?.find(p => p.id === id) || { id, name: id, icon: 'Box', color: '#94a3b8' };
};

const getFaceTextureStyle = (matId: string | null, face: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'side') => {
  const mat = getMaterial(matId);
  let url = mat.imageUrl;
  if (face === 'top' && mat.topImageUrl) url = mat.topImageUrl;
  else if (face === 'bottom' && mat.bottomImageUrl) url = mat.bottomImageUrl;
  else if (face === 'front' && mat.frontImageUrl) url = mat.frontImageUrl;
  else if (face === 'back' && mat.backImageUrl) url = mat.backImageUrl;
  else if (face === 'left' && mat.leftImageUrl) url = mat.leftImageUrl;
  else if (face === 'right' && mat.rightImageUrl) url = mat.rightImageUrl;
  else if (mat.sideImageUrl) url = mat.sideImageUrl;

  return {
    backgroundColor: mat.color,
    backgroundImage: url ? `url('${url}')` : 'none'
  };
};

// 3D Matrix Calculations
const numCols = computed(() => {
  if (props.gridSizeX) return props.gridSizeX;
  if (props.layers?.[0]?.grid?.[0]) return props.layers[0].grid[0].length;
  return 3;
});

const numRows = computed(() => {
  if (props.gridSizeZ) return props.gridSizeZ;
  if (props.layers?.[0]?.grid) return props.layers[0].grid.length;
  return 3;
});

const getVoxelStyle = (x: number, y: number, z: number, color: string) => {
  const cubeSize = 40; // exact size of cubic voxel
  const halfX = (numCols.value - 1) / 2;
  const halfZ = (numRows.value - 1) / 2;

  const posX = (x - halfX) * cubeSize;
  const posY = -(y * cubeSize); // Y goes up vertically
  const posZ = (z - halfZ) * cubeSize;

  return {
    transform: `translate3d(${posX}px, ${posY}px, ${posZ}px)`,
    backgroundColor: color
  };
};

// Interactive 3D Click & Place Logic
const handleVoxelFaceClick = (e: MouseEvent, colIdx: number, layerIdx: number, rowIdx: number, face: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right') => {
  e.stopPropagation();
  if (!props.isEditing || dragMoved.value) return;

  const currentMat = props.layers[layerIdx]?.grid[rowIdx]?.[colIdx];

  // Tool 1: Picker (Eyedropper)
  if (props.activeTool === 'picker') {
    if (currentMat) {
      emit('select-material', currentMat);
    }
    return;
  }

  // Tool 2: Erase (Right click, Shift+Click, or Erase Tool)
  if (props.activeTool === 'erase' || e.shiftKey || e.button === 2) {
    const newLayers = JSON.parse(JSON.stringify(props.layers)) as MultiblockLayer[];
    if (newLayers[layerIdx]?.grid[rowIdx]) {
      newLayers[layerIdx].grid[rowIdx][colIdx] = null;
      emit('update-layers', newLayers);
    }
    return;
  }

  // Tool 3: Placement (Calculate adjacent target voxel based on face clicked)
  let targetX = colIdx;
  let targetY = layerIdx;
  let targetZ = rowIdx;

  if (face === 'top') targetY += 1;
  else if (face === 'bottom') targetY -= 1;
  else if (face === 'front') targetZ += 1;
  else if (face === 'back') targetZ -= 1;
  else if (face === 'right') targetX += 1;
  else if (face === 'left') targetX -= 1;

  // Boundary Checks
  if (targetX < 0 || targetX >= numCols.value || targetZ < 0 || targetZ >= numRows.value) return;

  const newLayers = JSON.parse(JSON.stringify(props.layers)) as MultiblockLayer[];
  
  // Auto-expand Y layer if placing above current max layer
  while (newLayers.length <= targetY) {
    const nextNum = newLayers.length + 1;
    newLayers.push({
      layerNumber: nextNum,
      grid: Array(numRows.value).fill(null).map(() => Array(numCols.value).fill(null))
    });
  }

  if (targetY >= 0 && newLayers[targetY]) {
    newLayers[targetY].grid[targetZ][targetX] = props.selectedMaterialId || props.palette[0]?.id || 'reactor_casing';
    setMaxVisibleLayer(Math.max(internalMaxVisibleLayer.value, targetY + 1));
    emit('update-layers', newLayers);
  }
};

// Floor Grid Base Click (Place on Layer 0)
const handleFloorClick = (e: MouseEvent, colIdx: number, rowIdx: number) => {
  e.stopPropagation();
  if (!props.isEditing || dragMoved.value) return;

  if (props.activeTool === 'erase' || e.shiftKey || e.button === 2) {
    const newLayers = JSON.parse(JSON.stringify(props.layers)) as MultiblockLayer[];
    if (newLayers[0]?.grid[rowIdx]) {
      newLayers[0].grid[rowIdx][colIdx] = null;
      emit('update-layers', newLayers);
    }
    return;
  }

  const newLayers = JSON.parse(JSON.stringify(props.layers)) as MultiblockLayer[];
  if (!newLayers[0]) {
    newLayers.push({
      layerNumber: 1,
      grid: Array(numRows.value).fill(null).map(() => Array(numCols.value).fill(null))
    });
  }
  newLayers[0].grid[rowIdx][colIdx] = props.selectedMaterialId || props.palette[0]?.id || 'reactor_casing';
  emit('update-layers', newLayers);
};

// Remove top layer
const removeTopLayer = () => {
  if (props.layers.length <= 1) return;
  const newLayers = JSON.parse(JSON.stringify(props.layers)) as MultiblockLayer[];
  newLayers.pop();
  newLayers.forEach((l, i) => l.layerNumber = i + 1);
  if (internalMaxVisibleLayer.value > newLayers.length) {
    setMaxVisibleLayer(newLayers.length);
  }
  emit('update-layers', newLayers);
};

// Materials Summary Counter
const materialSummary = computed(() => {
  const counts: Record<string, number> = {};
  (props.layers || []).forEach(l => {
    l.grid.forEach(row => {
      row.forEach(matId => {
        if (matId) {
          counts[matId] = (counts[matId] || 0) + 1;
        }
      });
    });
  });

  return Object.entries(counts).map(([matId, count]) => {
    const mat = getMaterial(matId);
    return { material: mat, count };
  });
});
</script>

<template>
  <div class="bg-[#121416] border border-[#26292d] rounded-2xl overflow-hidden shadow-2xl relative select-none">
    
    <!-- Top Toolbar Controls -->
    <div class="bg-[#16181a] border-b border-[#26292d] p-3 px-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <IconRenderer name="Box" size="18" />
        </div>
        <div>
          <h4 class="text-xs font-extrabold text-white">3D Просмотр Мультиструктуры</h4>
          <p class="text-[10.5px] text-dark-muted">Вращайте мышкой • Приближайте колесиком</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          @click="toggleAutoRotate"
          :class="[
            'px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer',
            isAutoRotating ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md' : 'bg-[#0c0d0e] text-slate-300 border-[#26292d] hover:bg-[#1a1d21]'
          ]"
          title="Автоматическое вращение"
        >
          <IconRenderer name="RotateCw" size="13" :class="{ 'animate-spin': isAutoRotating }" />
          <span class="hidden sm:inline">Вращение</span>
        </button>

        <button
          type="button"
          @click="zoom = Math.min(2.5, zoom + 0.2)"
          class="p-1.5 rounded-xl bg-[#0c0d0e] border border-[#26292d] hover:bg-[#1a1d21] text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Приблизить"
        >
          <IconRenderer name="ZoomIn" size="15" />
        </button>

        <button
          type="button"
          @click="zoom = Math.max(0.4, zoom - 0.2)"
          class="p-1.5 rounded-xl bg-[#0c0d0e] border border-[#26292d] hover:bg-[#1a1d21] text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Отдалить"
        >
          <IconRenderer name="ZoomOut" size="15" />
        </button>

        <button
          type="button"
          @click="resetView"
          class="p-1.5 rounded-xl bg-[#0c0d0e] border border-[#26292d] hover:bg-[#1a1d21] text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer"
          title="Сбросить камеру"
        >
          <IconRenderer name="RefreshCw" size="15" />
        </button>
      </div>
    </div>

    <!-- 3D Canvas Area -->
    <div 
      class="h-80 sm:h-96 w-full relative flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden bg-radial-gradient viewport-3d-container"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @wheel="onWheel"
    >
      <!-- Isometric Background Grid Indicator -->
      <div class="absolute inset-0 bg-[radial-gradient(#26292d_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

      <!-- 3D Scene Wrapper -->
      <div 
        class="scene-3d transition-transform duration-75 ease-out"
        :style="{
          transform: `scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`
        }"
      >
        <!-- 3D Floor Base Grid for Placing First Blocks -->
        <div v-if="isEditing" class="floor-grid-3d">
          <template v-for="rIdx in numRows" :key="rIdx">
            <template v-for="cIdx in numCols" :key="cIdx">
              <div 
                class="floor-cell-3d"
                :style="getVoxelStyle(cIdx - 1, 0, rIdx - 1, 'transparent')"
                @click="handleFloorClick($event, cIdx - 1, rIdx - 1)"
              ></div>
            </template>
          </template>
        </div>

        <!-- Render 3D Voxels Layer by Layer -->
        <template v-for="(layer, layerIdx) in layers" :key="layer.layerNumber">
          <template v-if="layerIdx < internalMaxVisibleLayer">
            <template v-for="(row, rowIdx) in layer.grid" :key="rowIdx">
              <template v-for="(matId, colIdx) in row" :key="colIdx">
                <div 
                  v-if="matId"
                  class="voxel-cube group"
                  :style="getVoxelStyle(colIdx, layerIdx, rowIdx, getMaterial(matId).color)"
                  :title="`${getMaterial(matId).name} (Слой Y=${layer.layerNumber})`"
                >
                  <!-- Cube Faces with custom multi-face textures & interactive clicks -->
                  <div class="face front" :style="getFaceTextureStyle(matId, 'front')" @click="handleVoxelFaceClick($event, colIdx, layerIdx, rowIdx, 'front')"></div>
                  <div class="face back" :style="getFaceTextureStyle(matId, 'back')" @click="handleVoxelFaceClick($event, colIdx, layerIdx, rowIdx, 'back')"></div>
                  <div class="face top" :style="getFaceTextureStyle(matId, 'top')" @click="handleVoxelFaceClick($event, colIdx, layerIdx, rowIdx, 'top')"></div>
                  <div class="face bottom" :style="getFaceTextureStyle(matId, 'bottom')" @click="handleVoxelFaceClick($event, colIdx, layerIdx, rowIdx, 'bottom')"></div>
                  <div class="face left" :style="getFaceTextureStyle(matId, 'left')" @click="handleVoxelFaceClick($event, colIdx, layerIdx, rowIdx, 'left')"></div>
                  <div class="face right" :style="getFaceTextureStyle(matId, 'right')" @click="handleVoxelFaceClick($event, colIdx, layerIdx, rowIdx, 'right')"></div>
                </div>
              </template>
            </template>
          </template>
        </template>
      </div>
    </div>

    <!-- Viewer Mode Layer Stepper (Below 3D canvas when viewing) -->
    <div v-if="!isEditing && layers.length > 1" class="bg-[#111315] border-t border-[#26292d] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-xs font-bold text-slate-300">
        <IconRenderer name="Layers" size="14" class="text-cyan-400" />
        <span>Срез слоев:</span>
        <span class="text-cyan-300 font-mono font-extrabold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
          {{ internalMaxVisibleLayer === layers.length ? 'Все слои (1–' + layers.length + ')' : 'Слой ' + internalMaxVisibleLayer + ' из ' + layers.length }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          @click="setMaxVisibleLayer(internalMaxVisibleLayer === layers.length ? 1 : Math.max(1, internalMaxVisibleLayer - 1))"
          class="px-2 py-1 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1 transition-all"
          title="Предыдущий слой"
        >
          <IconRenderer name="ChevronLeft" size="13" />
          <span>Пред.</span>
        </button>

        <button
          v-for="l in layers.length"
          :key="l"
          type="button"
          @click="setMaxVisibleLayer(l)"
          :class="[
            'w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer border',
            internalMaxVisibleLayer === l 
              ? 'bg-cyan-500 text-white border-cyan-400 shadow-md' 
              : 'bg-[#0c0d0e] text-dark-muted border-[#26292d] hover:text-white'
          ]"
        >
          {{ l }}
        </button>

        <button
          type="button"
          @click="setMaxVisibleLayer(internalMaxVisibleLayer === layers.length ? 1 : Math.min(layers.length, internalMaxVisibleLayer + 1))"
          class="px-2 py-1 rounded-lg bg-[#16181a] border border-[#26292d] hover:bg-[#202328] text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1 transition-all"
          title="Следующий слой"
        >
          <span>След.</span>
          <IconRenderer name="ChevronRight" size="13" />
        </button>

        <button
          type="button"
          @click="setMaxVisibleLayer(layers.length)"
          :class="[
            'px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
            internalMaxVisibleLayer === layers.length ? 'bg-cyan-500 text-white border-cyan-400 shadow-md' : 'bg-[#16181a] border-[#26292d] text-slate-300 hover:text-white'
          ]"
        >
          Все
        </button>
      </div>
    </div>

    <!-- Required Materials Summary Table -->
    <div class="bg-[#16181a] border-t border-[#26292d] p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h5 class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <IconRenderer name="CheckCircle" size="14" class="text-emerald-400" />
          Необходимые блоки для постройки
        </h5>
        <span class="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          Всего: {{ materialSummary.reduce((acc, curr) => acc + curr.count, 0) }} шт.
        </span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div 
          v-for="item in materialSummary" 
          :key="item.material.id"
          class="bg-[#0c0d0e] border border-[#26292d] p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-sm"
        >
          <div class="flex items-center gap-2 min-w-0">
            <img 
              v-if="item.material.imageUrl || item.material.topImageUrl || item.material.sideImageUrl" 
              :src="item.material.sideImageUrl || item.material.topImageUrl || item.material.imageUrl" 
              class="w-5 h-5 rounded border border-white/20 object-cover shrink-0" 
            />
            <span v-else-if="item.material.color" class="w-4 h-4 rounded-md border border-white/20 shrink-0" :style="{ backgroundColor: item.material.color }"></span>
            
            <span class="text-xs font-bold text-slate-200 truncate">{{ item.material.name.replace(/\s*\(.*?\)$/, '') }}</span>
          </div>
          <span class="text-xs font-extrabold text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20 shrink-0">
            x{{ item.count }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport-3d-container {
  perspective: 1000px;
  -webkit-perspective: 1000px;
  perspective-origin: 50% 50%;
  -webkit-perspective-origin: 50% 50%;
}

.scene-3d {
  position: relative;
  width: 0;
  height: 0;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
  will-change: transform;
}

.floor-grid-3d {
  position: absolute;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
}

.floor-cell-3d {
  position: absolute;
  top: -20px;
  left: -20px;
  width: 40px;
  height: 40px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  transform: rotateX(90deg) translateZ(20px);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  cursor: pointer;
}
.floor-cell-3d:hover {
  background-color: rgba(6, 182, 212, 0.25);
  border-color: rgba(6, 182, 212, 0.6);
}

.voxel-cube {
  position: absolute;
  top: -20px;
  left: -20px;
  width: 40px;
  height: 40px;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.35);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  cursor: pointer;
  transition: filter 0.15s ease, border-color 0.15s ease;
}

.face:hover {
  filter: brightness(1.3) !important;
  border-color: #38bdf8 !important;
  box-shadow: inset 0 0 8px rgba(56, 189, 248, 0.6);
}

.front  { transform: translateZ(20px); filter: brightness(0.95); }
.back   { transform: rotateY(180deg) translateZ(20px); filter: brightness(0.5); }
.top    { transform: rotateX(90deg) translateZ(20px); filter: brightness(1.2); }
.bottom { transform: rotateX(-90deg) translateZ(20px); filter: brightness(0.35); }
.left   { transform: rotateY(-90deg) translateZ(20px); filter: brightness(0.7); }
.right  { transform: rotateY(90deg) translateZ(20px); filter: brightness(0.85); }
</style>
