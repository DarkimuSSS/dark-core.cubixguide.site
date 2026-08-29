<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { Guide } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  guide: Guide;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'import', guide: Guide): void;
}>();

const activeTab = ref<'export' | 'import'>('export');
const jsonInput = ref('');
const copySuccess = ref(false);
const importError = ref('');

const formattedExportJson = computed(() => {
  return JSON.stringify(props.guide, null, 2);
});

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(formattedExportJson.value);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

const handleImport = () => {
  importError.value = '';
  try {
    const parsed = JSON.parse(jsonInput.value);
    if (!parsed || !parsed.meta || !Array.isArray(parsed.blocks)) {
      throw new Error('Invalid guide format. Object must contain "meta" and "blocks" array.');
    }
    emit('import', parsed);
    emit('close');
  } catch (err: any) {
    importError.value = err.message || 'Syntax error in JSON string.';
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-[#26292d] flex items-center justify-between bg-[#121416]">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <IconRenderer name="FileText" size="18" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">Import & Export Guide JSON</h3>
            <p class="text-xs text-dark-muted">Share guides easily via copy-paste JSON payload</p>
          </div>
        </div>
        <button 
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-1 rounded-md hover:bg-[#26292d] transition-colors"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-[#26292d] bg-[#0c0d0e]">
        <button 
          type="button"
          @click="activeTab = 'export'"
          :class="['flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all border-b-2', activeTab === 'export' ? 'border-cyan-500 text-cyan-400 bg-[#16181a]' : 'border-transparent text-dark-muted hover:text-white']"
        >
          <IconRenderer name="Download" size="15" />
          Export JSON
        </button>
        <button 
          type="button"
          @click="activeTab = 'import'"
          :class="['flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all border-b-2', activeTab === 'import' ? 'border-cyan-500 text-cyan-400 bg-[#16181a]' : 'border-transparent text-dark-muted hover:text-white']"
        >
          <IconRenderer name="Upload" size="15" />
          Import Guide
        </button>
      </div>

      <!-- Content -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        <!-- Export Tab -->
        <div v-if="activeTab === 'export'" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-dark-muted">Copy this JSON structure to share or store offline:</span>
            <button 
              type="button"
              @click="copyToClipboard"
              :class="['text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all', copySuccess ? 'bg-emerald-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white']"
            >
              <IconRenderer :name="copySuccess ? 'Check' : 'Copy'" size="14" />
              {{ copySuccess ? 'Copied to Clipboard!' : 'Copy Payload' }}
            </button>
          </div>
          <pre class="bg-[#0c0d0e] border border-[#26292d] p-4 rounded-xl text-xs text-emerald-400 font-mono overflow-x-auto max-h-80 select-all">{{ formattedExportJson }}</pre>
        </div>

        <!-- Import Tab -->
        <div v-else class="space-y-3">
          <label class="block text-xs text-dark-muted">Paste guide JSON payload below to replace active editor state:</label>
          <textarea 
            v-model="jsonInput" 
            placeholder="Paste raw JSON guide content here..." 
            rows="10"
            class="w-full bg-[#0c0d0e] border border-[#26292d] text-xs font-mono text-white p-3 rounded-xl focus:outline-none focus:border-cyan-accent"
          ></textarea>
          <div v-if="importError" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2">
            <IconRenderer name="OctagonAlert" size="16" />
            {{ importError }}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3.5 border-t border-[#26292d] bg-[#121416] flex items-center justify-end gap-2">
        <button 
          type="button"
          @click="emit('close')"
          class="text-xs text-dark-muted hover:text-white px-3 py-2 rounded-lg hover:bg-[#26292d] transition-colors"
        >
          Close
        </button>
        <button 
          v-if="activeTab === 'import'"
          type="button"
          @click="handleImport"
          class="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
        >
          <IconRenderer name="Check" size="14" />
          Apply & Load Guide
        </button>
      </div>
    </div>
  </div>
</template>
