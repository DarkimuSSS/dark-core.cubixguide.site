<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import type { Guide } from '../types/guide';

const props = defineProps<{
  guide: Guide;
  allGuides: Guide[];
}>();

const emit = defineEmits<{
  (e: 'select-guide', guideId: string): void;
  (e: 'edit-mode'): void;
}>();

const isMobileNavOpen = ref(false);

const tableOfContents = computed(() => {
  return props.guide.blocks
    .filter(b => b.type === 'heading' && b.headingText)
    .map(b => ({
      id: b.id,
      text: b.headingText as string,
      level: b.headingLevel || 'h2'
    }));
});

const activeHeadingId = ref<string>('');

const scrollToBlock = (id: string) => {
  activeHeadingId.value = id;
  const el = document.getElementById(`block-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#0c0d0e] text-[#e2e8f0] flex flex-col">
    <!-- Top Reader Navigation Bar -->
    <header class="h-16 border-b border-[#26292d] bg-[#16181a]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button 
          @click="isMobileNavOpen = !isMobileNavOpen"
          class="lg:hidden text-dark-muted hover:text-white p-2 rounded-lg hover:bg-[#26292d]"
        >
          <IconRenderer name="BookOpen" size="20" />
        </button>

        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <IconRenderer name="BookOpen" size="18" />
          </div>
          <div>
            <h1 class="text-sm font-bold text-white tracking-tight">CubixGuide Вики</h1>
            <p class="text-[10px] text-dark-muted font-medium">База знаний майнкрафт серверов</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
            {{ guide.meta.category }}
          </span>
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
            Уровень: {{ guide.meta.difficulty }}
          </span>
        </div>

        <button
          type="button"
          @click="emit('edit-mode')"
          class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <IconRenderer name="Edit3" size="14" />
          Редактировать
        </button>
      </div>
    </header>

    <!-- Main Layout Container -->
    <div class="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
      
      <!-- LEFT SIDEBAR -->
      <aside :class="[
        'fixed lg:sticky top-20 z-40 lg:z-0 w-64 shrink-0 bg-[#16181a] lg:bg-transparent border lg:border-none border-[#26292d] rounded-2xl p-4 transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto',
        isMobileNavOpen ? 'left-4 shadow-2xl' : '-left-80 lg:left-0'
      ]">
        <div class="space-y-6">
          <div class="flex items-center justify-between pb-3 border-b border-[#26292d]">
            <div class="text-xs font-bold uppercase tracking-wider text-dark-muted flex items-center gap-1.5">
              <IconRenderer name="BookOpen" size="14" class="text-emerald-400" />
              Каталог гайдов
            </div>
            <button @click="isMobileNavOpen = false" class="lg:hidden text-dark-muted hover:text-white">
              <IconRenderer name="X" size="16" />
            </button>
          </div>

          <div class="space-y-2">
            <div 
              v-for="item in allGuides" 
              :key="item.meta.id"
              @click="emit('select-guide', item.meta.id); isMobileNavOpen = false;"
              :class="[
                'p-3 rounded-xl border text-left cursor-pointer transition-all',
                guide.meta.id === item.meta.id 
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md' 
                  : 'bg-[#121416] border-[#26292d] hover:border-[#3b3f46] text-slate-300'
              ]"
            >
              <div class="text-xs font-semibold line-clamp-1 mb-1">{{ item.meta.title }}</div>
              <div class="flex items-center justify-between text-[10px] text-dark-muted">
                <span>автор: {{ item.meta.author }}</span>
                <span class="text-cyan-400 font-mono">{{ item.meta.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- CENTER ARTICLE -->
      <main class="flex-1 min-w-0 max-w-3xl space-y-8">
        <article class="bg-[#16181a] border border-[#26292d] p-6 sm:p-8 rounded-2xl shadow-xl space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/30">
              {{ guide.meta.category }}
            </span>
            <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              {{ guide.meta.difficulty }}
            </span>
            <span class="text-xs text-dark-muted ml-auto">Обновлено: {{ guide.meta.updatedAt }}</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {{ guide.meta.title }}
          </h1>

          <div class="flex items-center gap-2 text-xs text-dark-muted border-t border-[#26292d] pt-3">
            <IconRenderer name="Edit3" size="14" class="text-emerald-400" />
            <span>Автор статьи: <strong class="text-slate-200">{{ guide.meta.author }}</strong></span>
          </div>
        </article>

        <!-- Article Blocks -->
        <div class="space-y-8">
          <div 
            v-for="block in guide.blocks" 
            :key="block.id" 
            :id="`block-${block.id}`"
            class="scroll-mt-24"
          >
            <!-- Heading Block -->
            <div v-if="block.type === 'heading'" class="border-b border-[#26292d] pb-2 mb-4">
              <h2 v-if="block.headingLevel === 'h1'" class="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {{ block.headingText }}
              </h2>
              <h3 v-else class="text-lg font-bold text-slate-100 tracking-tight">
                {{ block.headingText }}
              </h3>
            </div>

            <!-- Text Block -->
            <div v-else-if="block.type === 'text'" class="text-slate-300 text-sm sm:text-base leading-relaxed">
              <p class="whitespace-pre-line">{{ block.textContent }}</p>
            </div>

            <!-- Image / Screenshot Block -->
            <div v-else-if="block.type === 'image'" class="bg-[#16181a] border border-[#26292d] p-4 rounded-2xl shadow-xl space-y-2">
              <div v-if="block.imageUrl" class="rounded-xl overflow-hidden bg-black/60 border border-[#26292d] flex items-center justify-center">
                <img :src="block.imageUrl" :alt="block.imageCaption || 'Скриншот гайда'" class="max-h-[500px] w-auto object-contain rounded-xl" />
              </div>
              <p v-if="block.imageCaption" class="text-xs text-center text-dark-muted font-medium italic pt-1">
                {{ block.imageCaption }}
              </p>
            </div>

            <!-- Callout Box Block -->
            <div v-else-if="block.type === 'callout'">
              <CalloutBlock :block="block" :is-editing="false" />
            </div>

            <!-- Visual Crafting Grid 3x3 -->
            <div v-else-if="block.type === 'crafting'" class="bg-[#16181a] border border-[#26292d] p-6 rounded-2xl shadow-xl space-y-4">
              <div class="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <IconRenderer name="Grid" size="16" class="text-emerald-400" />
                Схема крафта
              </div>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-[#0c0d0e] rounded-xl border border-[#26292d]">
                <div class="grid grid-cols-3 gap-2.5 p-3 bg-[#121416] rounded-xl border border-[#26292d]">
                  <div
                    v-for="(slot, slotIdx) in (block.craftingGrid || Array(9).fill(null))"
                    :key="slotIdx"
                    class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-[#26292d] bg-[#16181a] flex flex-col items-center justify-center relative transition-all group shadow-inner hover:border-emerald-500/60"
                  >
                    <template v-if="slot && slot.item">
                      <IconRenderer :name="slot.item.icon" size="24" :color="slot.item.color" />
                      <span v-if="slot.count > 1" class="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-bold px-1 rounded">
                        {{ slot.count }}
                      </span>
                    </template>
                    <span v-else class="text-dark-muted/20 text-xs font-mono">.</span>

                    <div v-if="slot && slot.item" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 pointer-events-none">
                      <div class="bg-[#16181a] border border-[#26292d] p-2.5 rounded-lg shadow-2xl min-w-44 text-left">
                        <div class="text-xs font-bold text-white flex items-center gap-1.5" :style="{ color: slot.item.color }">
                          <IconRenderer :name="slot.item.icon" size="14" />
                          {{ slot.item.name }}
                        </div>
                        <div class="text-[10px] text-dark-muted mb-1">{{ slot.item.mod }}</div>
                        <div v-if="slot.tooltip" class="text-[11px] text-emerald-300 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                          {{ slot.tooltip }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-emerald-400 flex flex-col items-center gap-1">
                  <IconRenderer name="ChevronRight" size="32" class="hidden sm:block" />
                  <IconRenderer name="ArrowDown" size="32" class="block sm:hidden" />
                </div>

                <div class="flex flex-col items-center gap-1.5">
                  <span class="text-[11px] font-semibold text-dark-muted">Результат</span>
                  <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-emerald-500/60 bg-[#16181a] flex flex-col items-center justify-center relative transition-all group shadow-xl">
                    <template v-if="block.craftingOutput?.item">
                      <IconRenderer :name="block.craftingOutput.item.icon" size="32" :color="block.craftingOutput.item.color" />
                      <span v-if="(block.craftingOutput.count || 1) > 1" class="absolute bottom-1 right-1 bg-emerald-600 text-white text-[11px] font-bold px-1.5 rounded">
                        x{{ block.craftingOutput.count }}
                      </span>
                    </template>
                    <span v-else class="text-dark-muted text-xs">Выход</span>

                    <div v-if="block.craftingOutput?.item" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 pointer-events-none">
                      <div class="bg-[#16181a] border border-[#26292d] p-2.5 rounded-lg shadow-2xl min-w-44 text-left">
                        <div class="text-xs font-bold text-white flex items-center gap-1.5" :style="{ color: block.craftingOutput.item.color }">
                          <IconRenderer :name="block.craftingOutput.item.icon" size="14" />
                          {{ block.craftingOutput.item.name }}
                        </div>
                        <div class="text-[10px] text-dark-muted">{{ block.craftingOutput.item.mod }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Multiblock Painter in Reader Mode -->
            <div v-else-if="block.type === 'multiblock'">
              <LayerPainter :block="block" :is-editing="false" />
            </div>

            <!-- Interactive Reader Step Checklist -->
            <div v-else-if="block.type === 'checklist'" class="bg-[#16181a] border border-[#26292d] p-6 rounded-2xl shadow-xl space-y-4">
              <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
                <div class="text-sm font-bold text-white flex items-center gap-2">
                  <IconRenderer name="CheckCircle2" size="18" class="text-emerald-400" />
                  {{ block.checklistTitle || 'Пошаговый чек-лист' }}
                </div>
              </div>

              <div class="space-y-2">
                <label 
                  v-for="item in (block.checklistItems || [])" 
                  :key="item.id"
                  class="flex items-center gap-3 p-3 rounded-xl bg-[#0c0d0e] border border-[#26292d] cursor-pointer hover:border-[#3b3f46] transition-all"
                >
                  <input
                    type="checkbox"
                    v-model="item.completed"
                    class="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span :class="['text-xs sm:text-sm transition-all', item.completed ? 'line-through text-dark-muted' : 'text-slate-200']">
                    {{ item.text }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- RIGHT SIDEBAR: Table of Contents -->
      <aside v-if="tableOfContents.length > 0" class="hidden xl:block w-56 shrink-0 sticky top-20 h-fit space-y-4">
        <div class="bg-[#16181a] border border-[#26292d] p-4 rounded-2xl space-y-3">
          <div class="text-xs font-bold uppercase tracking-wider text-dark-muted flex items-center gap-1.5 border-b border-[#26292d] pb-2">
            <IconRenderer name="Sliders" size="14" class="text-cyan-400" />
            Содержание статьи
          </div>

          <nav class="space-y-1">
            <button
              v-for="item in tableOfContents"
              :key="item.id"
              @click="scrollToBlock(item.id)"
              :class="[
                'w-full text-left text-xs py-1.5 px-2 rounded-lg transition-all line-clamp-1',
                activeHeadingId === item.id 
                  ? 'bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400' 
                  : 'text-dark-muted hover:text-white hover:bg-[#121416]'
              ]"
            >
              {{ item.text }}
            </button>
          </nav>
        </div>
      </aside>

    </div>
  </div>
</template>
