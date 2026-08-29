<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import type { Guide, BlockSpan, BlockAlign, BlockVariant } from '../types/guide';

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
  const result: { id: string; text: string; level: string }[] = [];
  const collectHeadings = (blocks: any[]) => {
    for (const b of blocks) {
      if (b.type === 'heading' && b.headingText) {
        result.push({ id: b.id, text: b.headingText, level: b.headingLevel || 'h2' });
      } else if (b.type === 'section' && b.columns) {
        for (const col of b.columns) {
          collectHeadings(col.blocks);
        }
      }
    }
  };
  collectHeadings(props.guide.blocks);
  return result;
});

const activeHeadingId = ref<string>('');

const scrollToBlock = (id: string) => {
  activeHeadingId.value = id;
  const el = document.getElementById(`block-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const getGridSpanClass = (span?: BlockSpan) => {
  switch (span) {
    case 'span-3':
      return 'w-full md:w-[calc(50%-0.75rem)]';
    case 'span-2':
      return 'w-full md:w-[calc(33.333%-0.75rem)]';
    case 'span-4':
      return 'w-full md:w-[calc(66.666%-0.75rem)]';
    case 'span-1':
      return 'w-full md:w-[calc(16.666%-0.75rem)]';
    case 'span-6':
    default:
      return 'w-full';
  }
};

const getVariantClass = (variant?: BlockVariant) => {
  switch (variant) {
    case 'accent':
      return 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/20';
    case 'subtle':
      return 'bg-[#121416] border-[#26292d]';
    case 'bordered':
      return 'bg-[#16181a] border-2 border-cyan-500/40';
    case 'default':
    default:
      return 'bg-[#16181a] border border-[#26292d]';
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
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
      
      <!-- SIDEBAR -->
      <aside :class="[
        'col-span-1 fixed lg:sticky top-20 z-40 lg:z-0 bg-[#16181a] lg:bg-transparent border lg:border-none border-[#26292d] rounded-2xl p-4 transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto',
        isMobileNavOpen ? 'left-4 shadow-2xl w-64' : '-left-80 lg:left-0 w-full'
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

      <!-- CONTENT ZONE -->
      <main class="col-span-1 lg:col-span-5 min-w-0 space-y-8">
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

        <!-- Dynamic Freeform Resizable Blocks Layout -->
        <div class="flex flex-wrap gap-6 items-stretch">
          <div 
            v-for="block in guide.blocks" 
            :key="block.id" 
            :id="`block-${block.id}`"
            :style="{
              width: block.type === 'divider' ? '100%' : (block.customWidth ? `calc(${block.customWidth}% - 1rem)` : undefined),
              minHeight: block.customHeight ? `${block.customHeight}px` : undefined
            }"
            :class="[
              'scroll-mt-24 transition-all flex flex-col justify-between',
              block.type === 'divider' ? 'w-full my-2' : 
              block.type === 'section' ? 'w-full' :
              (!block.customWidth ? getGridSpanClass(block.span) : '') + ' h-full'
            ]"
          >
            <!-- Divider Section Separator (<hr>) -->
            <div v-if="block.type === 'divider'" class="w-full py-4 flex items-center justify-center">
              <hr class="w-full border-t border-[#26292d]" />
            </div>

            <!-- Unified Section Block (Stacked Multi-block Columns) -->
            <div v-else-if="block.type === 'section'" class="flex flex-wrap gap-6 items-stretch w-full">
              <div 
                v-for="col in (block.columns || [])" 
                :key="col.id"
                :style="{ width: col.customWidth ? `calc(${col.customWidth}% - 0.75rem)` : undefined }"
                :class="[
                  !col.customWidth ? getGridSpanClass(col.span) : '',
                  'bg-[#16181a] border border-[#26292d] p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-4 h-full'
                ]"
              >
                <!-- Stacked Sub-blocks inside Unified Column Card -->
                <div class="space-y-4 flex-1 flex flex-col justify-between">
                  <div v-for="sub in col.blocks" :key="sub.id" :id="`block-${sub.id}`">
                    <!-- Sub Heading -->
                    <div v-if="sub.type === 'heading'" class="border-b border-[#26292d] pb-3 mb-2">
                      <h2 v-if="sub.headingLevel === 'h1'" class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ sub.headingText }}</h2>
                      <h3 v-else class="text-lg font-bold text-slate-100 tracking-tight">{{ sub.headingText }}</h3>
                    </div>

                    <!-- Sub Text -->
                    <div v-else-if="sub.type === 'text'" class="bg-[#121416] border border-[#26292d] p-4 rounded-xl text-slate-300 text-sm leading-relaxed shadow-sm">
                      <p class="whitespace-pre-line">{{ sub.textContent }}</p>
                    </div>

                    <!-- Sub Callout -->
                    <div v-else-if="sub.type === 'callout'">
                      <CalloutBlock :block="sub" :is-editing="false" />
                    </div>

                    <!-- Sub Image -->
                    <div v-else-if="sub.type === 'image'" class="h-full flex flex-col justify-center items-center space-y-2">
                      <div v-if="sub.imageUrl" class="rounded-xl overflow-hidden bg-black/60 border border-[#26292d] flex items-center justify-center w-full h-full p-2">
                        <img :src="sub.imageUrl" :alt="sub.imageCaption" class="max-h-[500px] w-auto object-contain rounded-xl" />
                      </div>
                      <p v-if="sub.imageCaption" class="text-xs text-center text-dark-muted font-medium italic pt-1">{{ sub.imageCaption }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Standalone Heading Block -->
            <div v-else-if="block.type === 'heading'" :class="['p-5 rounded-2xl h-full flex flex-col justify-center border border-[#26292d]', getVariantClass(block.variant)]">
              <h2 
                v-if="block.headingLevel === 'h1'" 
                :class="['text-xl sm:text-2xl font-bold text-white tracking-tight', block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left']"
              >
                {{ block.headingText }}
              </h2>
              <h3 
                v-else 
                :class="['text-lg font-bold text-slate-100 tracking-tight', block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left']"
              >
                {{ block.headingText }}
              </h3>
            </div>

            <!-- Standalone Text Block -->
            <div 
              v-else-if="block.type === 'text'" 
              :class="[
                'p-5 rounded-2xl h-full flex flex-col justify-center text-slate-300 text-sm sm:text-base leading-relaxed',
                getVariantClass(block.variant),
                block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
              ]"
            >
              <p class="whitespace-pre-line">{{ block.textContent }}</p>
            </div>

            <!-- Standalone Image Block -->
            <div v-else-if="block.type === 'image'" :class="['p-5 rounded-2xl h-full flex flex-col justify-between shadow-xl space-y-2', getVariantClass(block.variant)]">
              <div v-if="block.imageUrl" class="rounded-xl overflow-hidden bg-black/60 border border-[#26292d] flex items-center justify-center flex-1">
                <img :src="block.imageUrl" :alt="block.imageCaption || 'Скриншот гайда'" class="max-h-[500px] w-auto object-contain rounded-xl" />
              </div>
              <p v-if="block.imageCaption" class="text-xs text-center text-dark-muted font-medium italic pt-1">
                {{ block.imageCaption }}
              </p>
            </div>

            <!-- Standalone Callout Box Block -->
            <div v-else-if="block.type === 'callout'" class="h-full flex flex-col justify-center">
              <CalloutBlock :block="block" :is-editing="false" />
            </div>

            <!-- Visual Crafting Grid 3x3 -->
            <div v-else-if="block.type === 'crafting'" :class="['p-6 rounded-2xl h-full flex flex-col justify-between shadow-xl space-y-4', getVariantClass(block.variant)]">
              <div class="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <IconRenderer name="Grid" size="16" class="text-emerald-400" />
                Схема крафта
              </div>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-[#0c0d0e] rounded-xl border border-[#26292d] flex-1">
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

            <!-- Multiblock Painter -->
            <div v-else-if="block.type === 'multiblock'" class="h-full flex flex-col justify-between">
              <LayerPainter :block="block" :is-editing="false" />
            </div>

            <!-- Interactive Reader Step Checklist -->
            <div v-else-if="block.type === 'checklist'" :class="['p-6 rounded-2xl h-full flex flex-col justify-between shadow-xl space-y-4', getVariantClass(block.variant)]">
              <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
                <div class="text-sm font-bold text-white flex items-center gap-2">
                  <IconRenderer name="CheckCircle2" size="18" class="text-emerald-400" />
                  {{ block.checklistTitle || 'Пошаговый чек-лист' }}
                </div>
              </div>

              <div class="space-y-2 flex-1">
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

    </div>
  </div>
</template>
