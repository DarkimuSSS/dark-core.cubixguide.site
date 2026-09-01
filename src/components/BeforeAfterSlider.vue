<script setup lang="ts">
import { ref } from 'vue';
import type { GuideBlock } from '../types/guide';
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  block: GuideBlock;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', block: GuideBlock): void;
}>();

const sliderPosition = ref(50);
const isDragging = ref(false);

const handleMove = (clientX: number, containerRect: DOMRect) => {
  const x = clientX - containerRect.left;
  let percent = (x / containerRect.width) * 100;
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;
  sliderPosition.value = Math.round(percent);
};

const onMouseDown = () => {
  isDragging.value = true;
};

const onMouseUp = () => {
  isDragging.value = false;
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const container = (e.currentTarget as HTMLElement).getBoundingClientRect();
  handleMove(e.clientX, container);
};

const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 0) return;
  const container = (e.currentTarget as HTMLElement).getBoundingClientRect();
  handleMove(e.touches[0].clientX, container);
};
</script>

<template>
  <div class="space-y-3">
    <!-- Editable Settings in Editor Mode -->
    <div v-if="isEditing" class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#0c0d0e] border border-[#26292d] rounded-xl text-xs">
      <div>
        <label class="block font-bold text-cyan-400 mb-1">Изображение «ДО» (URL)</label>
        <input
          type="text"
          :value="block.beforeImageUrl || ''"
          @input="emit('update', { ...block, beforeImageUrl: ($event.target as HTMLInputElement).value })"
          placeholder="https://... (до)"
          class="w-full bg-[#121416] border border-[#26292d] text-white p-2 rounded-lg focus:outline-none"
        />
        <input
          type="text"
          :value="block.beforeLabel || 'До'"
          @input="emit('update', { ...block, beforeLabel: ($event.target as HTMLInputElement).value })"
          placeholder="Подпись ДО"
          class="w-full mt-1 bg-[#121416] border border-[#26292d] text-slate-300 p-1.5 rounded-lg focus:outline-none text-[11px]"
        />
      </div>
      <div>
        <label class="block font-bold text-emerald-400 mb-1">Изображение «ПОСЛЕ» (URL)</label>
        <input
          type="text"
          :value="block.afterImageUrl || ''"
          @input="emit('update', { ...block, afterImageUrl: ($event.target as HTMLInputElement).value })"
          placeholder="https://... (после)"
          class="w-full bg-[#121416] border border-[#26292d] text-white p-2 rounded-lg focus:outline-none"
        />
        <input
          type="text"
          :value="block.afterLabel || 'После'"
          @input="emit('update', { ...block, afterLabel: ($event.target as HTMLInputElement).value })"
          placeholder="Подпись ПОСЛЕ"
          class="w-full mt-1 bg-[#121416] border border-[#26292d] text-slate-300 p-1.5 rounded-lg focus:outline-none text-[11px]"
        />
      </div>
    </div>

    <!-- Interactive Visual Comparison Slider -->
    <div
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchmove="onTouchMove"
      @touchend="onMouseUp"
      class="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-[#26292d] bg-black select-none cursor-ew-resize group"
    >
      <!-- BEFORE IMAGE (Full Background) -->
      <div class="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0c0d0e]">
        <img
          v-if="block.beforeImageUrl"
          :src="block.beforeImageUrl"
          class="w-full h-full object-cover"
        />
        <div v-else class="flex flex-col items-center gap-1 text-dark-muted">
          <IconRenderer name="Image" size="28" />
          <span class="text-xs">Вставьте URL для «ДО»</span>
        </div>
        <span class="absolute top-3 left-3 bg-black/70 border border-white/10 backdrop-blur-md text-cyan-300 font-bold text-xs px-2.5 py-1 rounded-lg">
          {{ block.beforeLabel || 'До' }}
        </span>
      </div>

      <!-- AFTER IMAGE (Clipped overlay) -->
      <div
        class="absolute top-0 bottom-0 left-0 overflow-hidden bg-[#0c0d0e] flex items-center justify-center"
        :style="{ width: `${sliderPosition}%` }"
      >
        <div class="absolute inset-0 w-full h-full">
          <img
            v-if="block.afterImageUrl"
            :src="block.afterImageUrl"
            class="w-full h-full object-cover"
          />
          <div v-else class="flex flex-col items-center justify-center w-full h-full gap-1 text-dark-muted">
            <IconRenderer name="Image" size="28" />
            <span class="text-xs">Вставьте URL для «ПОСЛЕ»</span>
          </div>
        </div>
        <span class="absolute top-3 left-3 bg-black/70 border border-white/10 backdrop-blur-md text-emerald-300 font-bold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap">
          {{ block.afterLabel || 'После' }}
        </span>
      </div>

      <!-- SLIDER HANDLE LINE -->
      <div
        @mousedown="onMouseDown"
        @touchstart="onMouseDown"
        class="absolute top-0 bottom-0 w-1 bg-emerald-400 shadow-2xl flex items-center justify-center z-20 cursor-ew-resize"
        :style="{ left: `${sliderPosition}%` }"
      >
        <div class="w-7 h-7 rounded-full bg-emerald-500 text-white border-2 border-white shadow-xl flex items-center justify-center text-xs -ml-0.5 group-hover:scale-110 transition-transform">
          ↔
        </div>
      </div>
    </div>
  </div>
</template>
