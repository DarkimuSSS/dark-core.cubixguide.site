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

const isExpanded = ref(props.block.isExpandedByDefault ?? false);
</script>

<template>
  <div class="bg-[#121416] border border-[#26292d] rounded-xl overflow-hidden transition-all shadow-md">
    <!-- Header toggle -->
    <div
      @click="isExpanded = !isExpanded"
      class="p-3 bg-[#16181a] hover:bg-[#1f2226] border-b border-[#26292d] flex items-center justify-between cursor-pointer transition-colors"
    >
      <div class="flex items-center gap-2 text-xs font-bold text-slate-200">
        <IconRenderer name="HelpCircle" size="14" class="text-cyan-400" />
        <span v-if="!isEditing">{{ block.spoilerTitle || 'Нажмите, чтобы развернуть спойлер' }}</span>
        <input
          v-else
          type="text"
          :value="block.spoilerTitle || ''"
          @click.stop
          @input="emit('update', { ...block, spoilerTitle: ($event.target as HTMLInputElement).value })"
          placeholder="Заголовок спойлера / аккордеона..."
          class="bg-transparent text-white font-bold text-xs focus:outline-none w-full"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[10px] text-dark-muted font-mono uppercase">{{ isExpanded ? 'Скрыть' : 'Открыть' }}</span>
        <IconRenderer :name="isExpanded ? 'ChevronUp' : 'ChevronDown'" size="14" class="text-slate-400" />
      </div>
    </div>

    <!-- Content area -->
    <div v-if="isExpanded || isEditing" class="p-4 bg-[#0c0d0e] border-t border-[#26292d]/50">
      <div v-if="!isEditing" class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
        {{ block.spoilerContent || 'Содержимое спойлера пусто.' }}
      </div>
      <textarea
        v-else
        :value="block.spoilerContent || ''"
        @input="emit('update', { ...block, spoilerContent: ($event.target as HTMLTextAreaElement).value })"
        placeholder="Содержимое спойлера (подробности, конфиг, длинный список)..."
        rows="4"
        maxlength="2000"
        class="w-full bg-[#121416] border border-[#26292d] text-slate-200 text-xs p-3 rounded-lg focus:outline-none resize-y"
      ></textarea>
    </div>
  </div>
</template>
