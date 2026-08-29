<script setup lang="ts">
import { computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { GuideBlock } from '../types/guide';

const props = defineProps<{
  block: GuideBlock;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', block: GuideBlock): void;
}>();

const calloutConfig = computed(() => {
  switch (props.block.calloutType) {
    case 'warning':
      return {
        label: 'Предупреждение',
        icon: 'AlertTriangle',
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300'
      };
    case 'danger':
      return {
        label: 'Опасность',
        icon: 'OctagonAlert',
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300'
      };
    case 'tip':
    default:
      return {
        label: 'Совет',
        icon: 'Lightbulb',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300'
      };
  }
});

const setCalloutType = (type: 'tip' | 'warning' | 'danger') => {
  emit('update', {
    ...props.block,
    calloutType: type
  });
};

const updateTitle = (val: string) => {
  emit('update', {
    ...props.block,
    calloutTitle: val
  });
};

const updateText = (val: string) => {
  emit('update', {
    ...props.block,
    calloutText: val
  });
};
</script>

<template>
  <div :class="['rounded-lg p-4 border transition-all duration-200', calloutConfig.border, calloutConfig.bg]">
    <!-- Editing Controls -->
    <div v-if="isEditing" class="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-dark-border/50 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-dark-muted">Тип уведомления:</span>
        <div class="flex items-center gap-1.5 bg-dark-bg p-1 rounded-md border border-dark-border">
          <button 
            type="button"
            @click="setCalloutType('tip')"
            :class="['px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all', props.block.calloutType === 'tip' || !props.block.calloutType ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-dark-muted hover:text-white']"
          >
            <IconRenderer name="Lightbulb" size="14" />
            Совет
          </button>
          <button 
            type="button"
            @click="setCalloutType('warning')"
            :class="['px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all', props.block.calloutType === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-dark-muted hover:text-white']"
          >
            <IconRenderer name="AlertTriangle" size="14" />
            Важно
          </button>
          <button 
            type="button"
            @click="setCalloutType('danger')"
            :class="['px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all', props.block.calloutType === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-dark-muted hover:text-white']"
          >
            <IconRenderer name="OctagonAlert" size="14" />
            Опасность
          </button>
        </div>
      </div>
    </div>

    <!-- Callout Content -->
    <div class="flex items-start gap-3">
      <div :class="['p-2 rounded-lg shrink-0 mt-0.5', calloutConfig.badge]">
        <IconRenderer :name="calloutConfig.icon" size="20" />
      </div>

      <div class="flex-1 min-w-0">
        <div v-if="isEditing">
          <input 
            type="text" 
            :value="block.calloutTitle" 
            @input="updateTitle(($event.target as HTMLInputElement).value)"
            placeholder="Заголовок (например: Совет по настройке)..."
            class="w-full bg-dark-bg/80 border border-dark-border text-white text-sm font-semibold rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-accent/60 mb-2"
          />
          <textarea 
            :value="block.calloutText"
            @input="updateText(($event.target as HTMLTextAreaElement).value)"
            placeholder="Опишите важные детали или правила безопасности..."
            rows="2"
            class="w-full bg-dark-bg/80 border border-dark-border text-dark-muted focus:text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-emerald-accent/60 resize-y"
          ></textarea>
        </div>

        <div v-else>
          <h4 v-if="block.calloutTitle" :class="['text-sm font-semibold mb-1', calloutConfig.text]">
            {{ block.calloutTitle }}
          </h4>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            {{ block.calloutText || 'Описание отсутствует.' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
