<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import IconRenderer from './IconRenderer.vue';

const emit = defineEmits<{
  (e: 'format', syntax: 'bold' | 'italic' | 'code' | 'link' | 'highlight' | 'h1' | 'h2'): void;
}>();

const isVisible = ref(false);
const position = ref({ top: 0, left: 0 });

const handleSelectionChange = () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    isVisible.value = false;
    return;
  }

  const activeEl = document.activeElement;
  const isInputOrTextarea = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
  const isInsideEditor = activeEl && activeEl.closest('.guide-editor-container');

  if (!isInsideEditor && !isInputOrTextarea) {
    isVisible.value = false;
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width > 0 && rect.height > 0) {
    position.value = {
      top: Math.max(10, rect.top - 48),
      left: Math.max(20, rect.left + rect.width / 2 - 120)
    };
    isVisible.value = true;
  } else {
    isVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange);
  window.addEventListener('scroll', handleSelectionChange, true);
});

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
  window.removeEventListener('scroll', handleSelectionChange, true);
});

const applyFormat = (syntax: 'bold' | 'italic' | 'code' | 'link' | 'highlight' | 'h1' | 'h2') => {
  emit('format', syntax);
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      class="fixed z-50 flex items-center gap-1 bg-[#1c1f24] border border-[#34383e] shadow-2xl rounded-xl p-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      <button
        @mousedown.prevent="applyFormat('bold')"
        title="Жирный (**текст**)"
        class="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center min-w-[28px]"
      >
        B
      </button>
      <button
        @mousedown.prevent="applyFormat('italic')"
        title="Курсив (*текст*)"
        class="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-emerald-500/20 text-xs italic font-serif transition-all flex items-center justify-center min-w-[28px]"
      >
        I
      </button>
      <button
        @mousedown.prevent="applyFormat('code')"
        title="Код (`текст`)"
        class="px-2 py-1 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition-all flex items-center justify-center"
      >
        &lt;/&gt;
      </button>
      <div class="w-px h-4 bg-[#34383e] mx-0.5"></div>
      <button
        @mousedown.prevent="applyFormat('highlight')"
        title="Выделение (подсветка)"
        class="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-all"
      >
        <IconRenderer name="Sparkles" size="14" />
      </button>
      <button
        @mousedown.prevent="applyFormat('link')"
        title="Вставить ссылку [текст](url)"
        class="p-1 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all"
      >
        <IconRenderer name="Link" size="14" />
      </button>
    </div>
  </Teleport>
</template>
