<script setup lang="ts">
import { computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { GuideBlock } from '../types/guide';
import { parseMarkdownLinks } from '../utils/linkParser';

const props = defineProps<{
  block: GuideBlock;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', block: GuideBlock): void;
}>();

const calloutConfig = computed(() => {
  switch (props.block.calloutType) {
    case 'info':
      return {
        label: 'Инфо',
        icon: 'Info',
        border: 'border-cyan-500/40',
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-300'
      };
    case 'recipe':
      return {
        label: 'Крафт',
        icon: 'Hammer',
        border: 'border-purple-500/40',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        badge: 'bg-purple-500/20 text-purple-300'
      };
    case 'note':
      return {
        label: 'Заметка',
        icon: 'FileText',
        border: 'border-indigo-500/40',
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        badge: 'bg-indigo-500/20 text-indigo-300'
      };
    case 'warning':
      return {
        label: 'Важно',
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

const setCalloutType = (type: 'tip' | 'warning' | 'danger' | 'info' | 'recipe' | 'note') => {
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
        <span class="text-[11px] font-bold uppercase tracking-wider text-dark-muted">Тип:</span>
        <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-lg border border-[#26292d]">
          <!-- Tip (Совет) -->
          <div class="relative group/calloutbtn">
            <button 
              type="button"
              @click="setCalloutType('tip')"
              :class="['p-1.5 rounded-md transition-all flex items-center justify-center', props.block.calloutType === 'tip' || !props.block.calloutType ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-dark-muted hover:text-white']"
            >
              <IconRenderer name="Lightbulb" size="14" />
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/calloutbtn:flex items-center pointer-events-none z-30">
              <div class="bg-[#0c0d0e] border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xl">Совет</div>
            </div>
          </div>

          <!-- Info (Информация) -->
          <div class="relative group/calloutbtn">
            <button 
              type="button"
              @click="setCalloutType('info')"
              :class="['p-1.5 rounded-md transition-all flex items-center justify-center', props.block.calloutType === 'info' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm' : 'text-dark-muted hover:text-white']"
            >
              <IconRenderer name="Info" size="14" />
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/calloutbtn:flex items-center pointer-events-none z-30">
              <div class="bg-[#0c0d0e] border border-cyan-500/40 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xl">Информация</div>
            </div>
          </div>

          <!-- Recipe (Крафт) -->
          <div class="relative group/calloutbtn">
            <button 
              type="button"
              @click="setCalloutType('recipe')"
              :class="['p-1.5 rounded-md transition-all flex items-center justify-center', props.block.calloutType === 'recipe' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm' : 'text-dark-muted hover:text-white']"
            >
              <IconRenderer name="Hammer" size="14" />
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/calloutbtn:flex items-center pointer-events-none z-30">
              <div class="bg-[#0c0d0e] border border-purple-500/40 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xl">Крафт / Мод</div>
            </div>
          </div>

          <!-- Note (Примечание) -->
          <div class="relative group/calloutbtn">
            <button 
              type="button"
              @click="setCalloutType('note')"
              :class="['p-1.5 rounded-md transition-all flex items-center justify-center', props.block.calloutType === 'note' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm' : 'text-dark-muted hover:text-white']"
            >
              <IconRenderer name="FileText" size="14" />
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/calloutbtn:flex items-center pointer-events-none z-30">
              <div class="bg-[#0c0d0e] border border-indigo-500/40 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xl">Заметка</div>
            </div>
          </div>

          <!-- Warning (Важно) -->
          <div class="relative group/calloutbtn">
            <button 
              type="button"
              @click="setCalloutType('warning')"
              :class="['p-1.5 rounded-md transition-all flex items-center justify-center', props.block.calloutType === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm' : 'text-dark-muted hover:text-white']"
            >
              <IconRenderer name="AlertTriangle" size="14" />
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/calloutbtn:flex items-center pointer-events-none z-30">
              <div class="bg-[#0c0d0e] border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xl">Важно</div>
            </div>
          </div>

          <!-- Danger (Опасность) -->
          <div class="relative group/calloutbtn">
            <button 
              type="button"
              @click="setCalloutType('danger')"
              :class="['p-1.5 rounded-md transition-all flex items-center justify-center', props.block.calloutType === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm' : 'text-dark-muted hover:text-white']"
            >
              <IconRenderer name="OctagonAlert" size="14" />
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/calloutbtn:flex items-center pointer-events-none z-30">
              <div class="bg-[#0c0d0e] border border-rose-500/40 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xl">Опасность</div>
            </div>
          </div>
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
            maxlength="120"
            class="w-full bg-dark-bg/80 border border-dark-border text-white text-sm font-semibold rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-accent/60 mb-2"
          />
          <textarea 
            :value="block.calloutText"
            @input="updateText(($event.target as HTMLTextAreaElement).value)"
            placeholder="Опишите важные детали или правила безопасности..."
            rows="2"
            maxlength="1000"
            class="w-full bg-dark-bg/80 border border-dark-border text-dark-muted focus:text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-emerald-accent/60 resize-y"
          ></textarea>
        </div>

        <div v-else>
          <h4 v-if="block.calloutTitle" :class="['text-sm font-semibold mb-1', calloutConfig.text]">
            {{ block.calloutTitle }}
          </h4>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line" v-html="parseMarkdownLinks(block.calloutText || 'Описание отсутствует.')">
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
