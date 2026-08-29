<script setup lang="ts">
import { ref } from 'vue';
import GuideEditor from './components/GuideEditor.vue';
import GuideView from './components/GuideView.vue';
import IconRenderer from './components/IconRenderer.vue';
import { SAMPLE_GUIDES } from './data/sampleGuides';
import { PRESET_ITEMS } from './data/presetItems';
import type { Guide } from './types/guide';

const guides = ref<Guide[]>(SAMPLE_GUIDES);
const activeGuideId = ref<string>(SAMPLE_GUIDES[0].meta.id);
const mode = ref<'editor' | 'reader'>('editor');

// Notification Toast
const toastMessage = ref('');
const showToast = (msg: string) => {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
};

const activeGuide = ref<Guide>(JSON.parse(JSON.stringify(SAMPLE_GUIDES[0])));

const selectGuide = (guideId: string) => {
  activeGuideId.value = guideId;
  const found = guides.value.find(g => g.meta.id === guideId);
  if (found) {
    activeGuide.value = JSON.parse(JSON.stringify(found));
    showToast(`Loaded guide: ${found.meta.title}`);
  }
};

const updateActiveGuide = (updated: Guide) => {
  activeGuide.value = updated;
  const idx = guides.value.findIndex(g => g.meta.id === updated.meta.id);
  if (idx !== -1) {
    guides.value[idx] = updated;
  }
};

const createNewGuide = () => {
  const newGuide: Guide = {
    meta: {
      id: `guide_${Date.now()}`,
      title: 'Untitled Minecraft Guide',
      category: 'HiTech',
      author: 'Crafter',
      difficulty: 'Beginner',
      summary: 'New modded guide created with visual builder.',
      updatedAt: new Date().toISOString().split('T')[0],
      published: false
    },
    blocks: [
      {
        id: `b_${Date.now()}_1`,
        type: 'heading',
        headingText: 'Introduction & Setup',
        headingLevel: 'h1'
      },
      {
        id: `b_${Date.now()}_2`,
        type: 'text',
        textContent: 'Write your step-by-step modded guide instructions here without using markdown syntax...'
      },
      {
        id: `b_${Date.now()}_3`,
        type: 'callout',
        calloutType: 'tip',
        calloutTitle: 'Getting Started Tip',
        calloutText: 'Make sure to double check crafting recipes in JEI / REI.'
      },
      {
        id: `b_${Date.now()}_4`,
        type: 'crafting',
        craftingGrid: Array(9).fill(null).map((_, i) => ({ index: i, item: null, count: 1 })),
        craftingOutput: { index: 9, item: PRESET_ITEMS[0], count: 1 }
      }
    ]
  };

  guides.value.push(newGuide);
  activeGuideId.value = newGuide.meta.id;
  activeGuide.value = newGuide;
  mode.value = 'editor';
  showToast('Created new empty guide!');
};

const handlePublish = () => {
  activeGuide.value.meta.published = true;
  activeGuide.value.meta.updatedAt = new Date().toISOString().split('T')[0];
  updateActiveGuide(activeGuide.value);
  showToast('Guide published successfully! Switched to Wiki Reader view.');
  mode.value = 'reader';
};
</script>

<template>
  <div class="min-h-screen bg-[#0c0d0e] text-[#e2e8f0] font-sans antialiased">
    <!-- Top Platform Bar -->
    <header class="bg-[#16181a] border-b border-[#26292d] h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-950/50">
          <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center text-emerald-400">
            <IconRenderer name="Box" size="20" />
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold text-white tracking-tight">CubixGuide</span>
            <span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">No-Code Wiki</span>
          </div>
          <p class="text-[11px] text-dark-muted hidden sm:block">Modded Minecraft Guide Platform</p>
        </div>
      </div>

      <!-- Center Guide Switcher & Mode Toggles -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Guide Dropdown Selector -->
        <div class="relative hidden md:block">
          <select 
            :value="activeGuideId"
            @change="selectGuide(($event.target as HTMLSelectElement).value)"
            class="bg-[#0c0d0e] border border-[#26292d] text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-accent pr-8 cursor-pointer"
          >
            <option v-for="g in guides" :key="g.meta.id" :value="g.meta.id">
              {{ g.meta.title }}
            </option>
          </select>
        </div>

        <button
          type="button"
          @click="createNewGuide"
          class="px-3 py-2 rounded-xl bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <IconRenderer name="Plus" size="15" />
          <span class="hidden sm:inline">New Guide</span>
        </button>

        <!-- Mode Switcher Tabs -->
        <div class="flex items-center bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d]">
          <button
            type="button"
            @click="mode = 'editor'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              mode === 'editor' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-dark-muted hover:text-white'
            ]"
          >
            <IconRenderer name="Edit3" size="14" />
            <span>Builder</span>
          </button>
          <button
            type="button"
            @click="mode = 'reader'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              mode === 'reader' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-dark-muted hover:text-white'
            ]"
          >
            <IconRenderer name="BookOpen" size="14" />
            <span>Wiki Reader</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main View Mode Render -->
    <div class="pt-6">
      <GuideEditor
        v-if="mode === 'editor'"
        :guide="activeGuide"
        @update:guide="updateActiveGuide"
        @toggle-preview="mode = 'reader'"
        @publish="handlePublish"
      />

      <GuideView
        v-else
        :guide="activeGuide"
        :all-guides="guides"
        @select-guide="selectGuide"
        @edit-mode="mode = 'editor'"
      />
    </div>

    <!-- Notification Toast -->
    <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50 animate-bounce">
      <div class="bg-[#16181a] border border-emerald-500/50 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5">
        <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <IconRenderer name="Check" size="12" />
        </div>
        <span>{{ toastMessage }}</span>
      </div>
    </div>
  </div>
</template>
