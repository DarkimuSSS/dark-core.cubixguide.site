<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import { PRESET_MULTIBLOCK_MATERIALS } from '../data/presetItems';
import type { GuideBlock, MultiblockLayer, MultiblockMaterial } from '../types/guide';

const props = defineProps<{
  block: GuideBlock;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', block: GuideBlock): void;
}>();

const activeLayerIndex = ref<number>(0);
const selectedMaterialId = ref<string>(props.block.palette?.[0]?.id || PRESET_MULTIBLOCK_MATERIALS[0].id);

const currentSize = computed(() => props.block.gridSize || 3);
const currentPalette = computed<MultiblockMaterial[]>(() => props.block.palette && props.block.palette.length > 0 ? props.block.palette : PRESET_MULTIBLOCK_MATERIALS);

const layersList = computed<MultiblockLayer[]>(() => {
  if (props.block.layers && props.block.layers.length > 0) {
    return props.block.layers;
  }
  const size = currentSize.value;
  return [
    { layerNumber: 1, grid: Array(size).fill(null).map(() => Array(size).fill(currentPalette.value[0].id)) },
    { layerNumber: 2, grid: Array(size).fill(null).map(() => Array(size).fill(currentPalette.value[1]?.id || currentPalette.value[0].id)) },
    { layerNumber: 3, grid: Array(size).fill(null).map(() => Array(size).fill(currentPalette.value[0].id)) },
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

const setGridSize = (size: 3 | 5) => {
  const newGrid = (size: number) => Array(size).fill(null).map(() => Array(size).fill(currentPalette.value[0].id));
  const newLayers: MultiblockLayer[] = [
    { layerNumber: 1, grid: newGrid(size) },
    { layerNumber: 2, grid: newGrid(size) },
    { layerNumber: 3, grid: newGrid(size) }
  ];
  emit('update', {
    ...props.block,
    gridSize: size,
    layers: newLayers
  });
  activeLayerIndex.value = 0;
};

const addLayer = () => {
  const newLayers = JSON.parse(JSON.stringify(layersList.value)) as MultiblockLayer[];
  const nextNum = newLayers.length + 1;
  const size = currentSize.value;
  newLayers.push({
    layerNumber: nextNum,
    grid: Array(size).fill(null).map(() => Array(size).fill(currentPalette.value[0].id))
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

const getMaterial = (id: string | null): MultiblockMaterial => {
  if (!id) return { id: 'empty', name: 'Воздух / Пусто', icon: 'Square', color: '#16181a' };
  return currentPalette.value.find(p => p.id === id) || { id, name: id, icon: 'Box', color: '#94a3b8' };
};
</script>

<template>
  <div class="bg-[#16181a] border border-[#26292d] rounded-xl p-5 shadow-lg space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#26292d] pb-4">
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <IconRenderer name="Layers" size="20" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">Редактор слоев мультиструктуры</h3>
          <p class="text-xs text-dark-muted">
            {{ isEditing ? 'Выберите блок из палитры и нажимайте на клетки сетки по слоям' : 'Послойная схема постройки мультиструктуры' }}
          </p>
        </div>
      </div>

      <!-- Size Switcher -->
      <div v-if="isEditing" class="flex items-center gap-2 bg-[#0c0d0e] p-1 rounded-lg border border-[#26292d]">
        <span class="text-xs text-dark-muted px-2 font-medium">Размер:</span>
        <button 
          type="button"
          @click="setGridSize(3)"
          :class="['px-2.5 py-1 text-xs font-semibold rounded transition-all', currentSize === 3 ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white']"
        >
          3x3
        </button>
        <button 
          type="button"
          @click="setGridSize(5)"
          :class="['px-2.5 py-1 text-xs font-semibold rounded transition-all', currentSize === 5 ? 'bg-cyan-600 text-white shadow' : 'text-dark-muted hover:text-white']"
        >
          5x5
        </button>
      </div>
    </div>

    <!-- Palette Picker -->
    <div v-if="isEditing" class="space-y-2">
      <div class="text-xs font-medium text-dark-muted uppercase tracking-wider">Палитра блоков (нажмите для выбора):</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="mat in currentPalette"
          :key="mat.id"
          type="button"
          @click="selectedMaterialId = mat.id"
          :class="[
            'px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all',
            selectedMaterialId === mat.id 
              ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md ring-1 ring-cyan-500/50' 
              : 'bg-[#121416] border-[#26292d] hover:border-[#3b3f46] text-slate-300'
          ]"
        >
          <span class="w-3 h-3 rounded-full border border-black/40" :style="{ backgroundColor: mat.color }"></span>
          <IconRenderer :name="mat.icon" size="14" :color="mat.color" />
          {{ mat.name }}
        </button>
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
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap',
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
        class="px-3 py-1.5 rounded-xl border border-dashed border-[#26292d] hover:border-cyan-500/50 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1.5 transition-all shrink-0"
      >
        <IconRenderer name="Plus" size="14" />
        Добавить Слой Y={{ layersList.length + 1 }}
      </button>
    </div>

    <!-- Grid Painter -->
    <div class="flex flex-col items-center justify-center p-6 bg-[#0c0d0e] rounded-xl border border-[#26292d]">
      <div class="text-xs font-medium text-dark-muted mb-3">
        Матрица Слоя {{ activeLayer.layerNumber }} ({{ currentSize }}x{{ currentSize }})
      </div>

      <div 
        class="grid gap-2 p-3 bg-[#121416] rounded-xl border border-[#26292d] shadow-2xl"
        :style="{ gridTemplateColumns: `repeat(${currentSize}, minmax(0, 1fr))` }"
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
            <IconRenderer 
              v-if="cellMatId" 
              :name="getMaterial(cellMatId).icon" 
              size="22" 
              :color="getMaterial(cellMatId).color" 
            />
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
</template>
