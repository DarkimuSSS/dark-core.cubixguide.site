<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import IconRenderer from './IconRenderer.vue';

const emit = defineEmits<{
  (e: 'format', syntax: 'bold' | 'italic' | 'code' | 'link' | 'highlight' | 'h1' | 'h2', linkUrl?: string, linkText?: string): void;
}>();

const isVisible = ref(false);
const position = ref({ top: 0, left: 0 });

// Link Modal state
const isLinkModalOpen = ref(false);
const customLinkUrl = ref('');
const customLinkText = ref('');

const handleSelectionChange = () => {
  if (isLinkModalOpen.value) return; // Don't hide toolbar if modal is open

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
      left: Math.max(20, rect.left + rect.width / 2 - 140)
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

const openLinkPrompt = () => {
  const selection = window.getSelection();
  const selectedStr = selection ? selection.toString().trim() : '';
  customLinkText.value = selectedStr || '';
  customLinkUrl.value = 'https://';
  isLinkModalOpen.value = true;
};

const confirmInsertLink = () => {
  let url = customLinkUrl.value.trim();
  if (!url) {
    url = 'https://';
  } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = 'https://' + url;
  }
  
  const text = customLinkText.value.trim() || 'ссылка';
  emit('format', 'link', url, text);
  isLinkModalOpen.value = false;
  isVisible.value = false;
};

const applyFormat = (syntax: 'bold' | 'italic' | 'code' | 'link' | 'highlight' | 'h1' | 'h2') => {
  if (syntax === 'link') {
    openLinkPrompt();
  } else {
    emit('format', syntax);
  }
};
</script>

<template>
  <Teleport to="body">
    <!-- Floating Toolbar -->
    <div
      v-if="isVisible && !isLinkModalOpen"
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
        title="Вставить гиперссылку [текст](url)"
        class="px-2 py-1 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition-all flex items-center gap-1"
      >
        <IconRenderer name="Link" size="14" />
        <span>Ссылка</span>
      </button>
    </div>

    <!-- Link Insertion Modal -->
    <div v-if="isLinkModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div class="bg-[#16181a] border border-cyan-500/40 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 text-left relative overflow-hidden">
        <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
          <div class="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <IconRenderer name="Link" size="18" />
            <span>Вставить гиперссылку в текст</span>
          </div>
          <button @click="isLinkModalOpen = false" class="text-dark-muted hover:text-white transition-colors">
            <IconRenderer name="X" size="18" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Текст ссылки / Ключевое слово:</label>
            <input 
              v-model="customLinkText"
              type="text" 
              placeholder="Например: Официальный сайт CubixWorld"
              class="w-full bg-[#121417] border border-[#26292d] focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">URL (Адрес ссылки):</label>
            <input 
              v-model="customLinkUrl"
              type="url" 
              placeholder="https://dark-core.ru/..."
              class="w-full bg-[#121417] border border-[#26292d] focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition-all"
              @keydown.enter.prevent="confirmInsertLink"
            />
            <p class="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
              <IconRenderer name="AlertCircle" size="12" class="shrink-0" />
              <span>Внешние ссылки вне *.dark-core.ru будут запрашивать подтверждение у читателей</span>
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#26292d]">
          <button 
            type="button" 
            @click="isLinkModalOpen = false"
            class="px-4 py-1.5 rounded-xl border border-[#26292d] text-slate-300 hover:text-white hover:bg-[#212429] text-xs font-semibold transition-all"
          >
            Отмена
          </button>
          <button 
            type="button" 
            @click="confirmInsertLink"
            class="px-5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            Вставить
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
