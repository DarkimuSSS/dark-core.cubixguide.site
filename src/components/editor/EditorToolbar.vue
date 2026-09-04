<script setup lang="ts">
import IconRenderer from '../IconRenderer.vue';
import type { Guide } from '../../types/guide';

const props = defineProps<{
  guide: Guide;
  canApprove?: boolean;
  canDirectUnpublish?: boolean;
  isLockedForEdit?: boolean;
  isAuthorRole?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  hasUnsavedChanges?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-preview'): void;
  (e: 'publish'): void;
  (e: 'submit-moderation'): void;
  (e: 'request-unpublish'): void;
  (e: 'direct-unpublish'): void;
  (e: 'approve'): void;
  (e: 'reject'): void;
  (e: 'delete'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'open-settings'): void;
  (e: 'open-templates'): void;
  (e: 'open-export'): void;
}>();
</script>

<template>
  <div class="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b backdrop-blur-md bg-[var(--bg-card)] border-[var(--border-color)]">
    <!-- Left Section: Title & Status Badge -->
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-bold text-[var(--text-primary)] truncate max-w-xs md:max-w-md">
        {{ guide.meta.title || 'Новый гайд' }}
      </h2>

      <!-- Status Badges -->
      <span 
        v-if="guide.meta.status === 'pending_moderation'" 
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"
      >
        <IconRenderer icon="Clock" class="w-3.5 h-3.5" />
        На модерации
      </span>
      <span 
        v-else-if="guide.meta.published || guide.meta.status === 'published'" 
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      >
        <IconRenderer icon="CheckCircle" class="w-3.5 h-3.5" />
        Опубликован
      </span>
      <span 
        v-else 
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30"
      >
        <IconRenderer icon="FileText" class="w-3.5 h-3.5" />
        Черновик
      </span>

      <!-- Unsaved Changes Pill -->
      <span v-if="hasUnsavedChanges" class="text-xs text-amber-400/80 animate-pulse hidden sm:inline">
        • Несохраненные изменения
      </span>
    </div>

    <!-- Actions & Toolbar Controls -->
    <div class="flex items-center flex-wrap gap-2">
      <!-- Undo / Redo -->
      <button 
        @click="emit('undo')" 
        :disabled="!canUndo"
        title="Отменить действие (Ctrl+Z)"
        class="p-2 text-sm font-medium transition rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <IconRenderer icon="Undo" class="w-4 h-4" />
      </button>
      <button 
        @click="emit('redo')" 
        :disabled="!canRedo"
        title="Повторить действие (Ctrl+Y)"
        class="p-2 text-sm font-medium transition rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <IconRenderer icon="Redo" class="w-4 h-4" />
      </button>

      <!-- Settings & Templates -->
      <button 
        @click="emit('open-settings')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] transition"
      >
        <IconRenderer icon="Settings" class="w-4 h-4" />
        <span class="hidden sm:inline">Настройки</span>
      </button>
      <button 
        @click="emit('open-templates')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] transition"
      >
        <IconRenderer icon="Layout" class="w-4 h-4" />
        <span class="hidden sm:inline">Шаблоны</span>
      </button>
      <button 
        @click="emit('open-export')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] transition"
      >
        <IconRenderer icon="Download" class="w-4 h-4" />
        <span class="hidden sm:inline">Экспорт</span>
      </button>

      <!-- Preview Button -->
      <button 
        @click="emit('toggle-preview')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
      >
        <IconRenderer icon="Eye" class="w-4 h-4" />
        Предпросмотр
      </button>

      <!-- Primary Action Buttons -->
      <button 
        v-if="canApprove"
        @click="emit('approve')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
      >
        <IconRenderer icon="Check" class="w-4 h-4" />
        Одобрить
      </button>

      <button 
        v-if="isAuthorRole && guide.meta.status !== 'pending_moderation' && !guide.meta.published"
        @click="emit('submit-moderation')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
      >
        <IconRenderer icon="Send" class="w-4 h-4" />
        На модерацию
      </button>

      <button 
        v-if="guide.meta.published"
        @click="canDirectUnpublish ? emit('direct-unpublish') : emit('request-unpublish')" 
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition"
      >
        <IconRenderer icon="Slash" class="w-4 h-4" />
        Снять с публикации
      </button>
    </div>
  </div>
</template>
