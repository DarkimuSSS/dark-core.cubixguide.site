<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import type { Guide, BlockSpan, BlockAlign, BlockVariant, AuthorProfile } from '../types/guide';

const props = defineProps<{
  guide: Guide;
  allGuides: Guide[];
}>();

const emit = defineEmits<{
  (e: 'select-guide', guideId: string): void;
  (e: 'edit-mode'): void;
  (e: 'open-author', username: string): void;
}>();

const isMobileNavOpen = ref(false);
const sidebarSearchQuery = ref('');
const authorProfile = ref<AuthorProfile | null>(null);

const fetchAuthorProfile = async () => {
  if (!props.guide.meta.author) return;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(props.guide.meta.author)}`);
    if (res.ok) {
      authorProfile.value = await res.json();
    }
  } catch (e) {}
};

watch(() => props.guide.meta.author, () => {
  fetchAuthorProfile();
}, { immediate: true });

const filteredAllGuides = computed(() => {
  const q = sidebarSearchQuery.value.toLowerCase().trim();
  if (!q) return props.allGuides;
  return props.allGuides.filter(g => 
    g.meta.title.toLowerCase().includes(q) ||
    g.meta.author.toLowerCase().includes(q) ||
    (g.meta.category && g.meta.category.toLowerCase().includes(q)) ||
    (g.meta.server && g.meta.server.toLowerCase().includes(q))
  );
});

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
    <!-- Main Layout Container with Expanded 12-Column Grid -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
      
      <!-- WIDER EXPANDED SIDEBAR WITH LIVE SEARCH -->
      <aside :class="[
        'col-span-1 lg:col-span-3 fixed lg:sticky top-20 z-40 lg:z-0 bg-[#16181a] lg:bg-transparent border lg:border-none border-[#26292d] rounded-2xl p-4 sm:p-5 transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto',
        isMobileNavOpen ? 'left-4 shadow-2xl w-80' : '-left-96 lg:left-0 w-full'
      ]">
        <div class="space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-[#26292d]">
            <div class="text-xs font-extrabold uppercase tracking-wider text-dark-muted flex items-center gap-2">
              <IconRenderer name="BookOpen" size="16" class="text-emerald-400" />
              Каталог гайдов
            </div>
            <button @click="isMobileNavOpen = false" class="lg:hidden text-dark-muted hover:text-white">
              <IconRenderer name="X" size="16" />
            </button>
          </div>

          <!-- SIDEBAR LIVE SEARCH INPUT -->
          <div class="relative">
            <input
              type="text"
              v-model="sidebarSearchQuery"
              placeholder="Поиск по гайдам..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-8 pr-7 py-2.5 focus:outline-none focus:border-emerald-500/70 transition-all placeholder:text-dark-muted"
            />
            <IconRenderer name="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
            <button
              v-if="sidebarSearchQuery"
              @click="sidebarSearchQuery = ''"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white"
            >
              <IconRenderer name="X" size="13" />
            </button>
          </div>

          <!-- GUIDES LIST -->
          <div class="space-y-3">
            <div v-if="filteredAllGuides.length === 0" class="text-center py-6 text-xs text-dark-muted bg-[#0c0d0e] p-3 rounded-xl border border-[#26292d]">
              Гайды не найдены
            </div>

            <div 
              v-for="item in filteredAllGuides" 
              :key="item.meta.id"
              @click="emit('select-guide', item.meta.id); isMobileNavOpen = false;"
              :class="[
                'p-4 rounded-xl border text-left cursor-pointer transition-all space-y-2 shadow-sm',
                guide.meta.id === item.meta.id 
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-emerald-950/40 shadow-lg' 
                  : 'bg-[#121416] border-[#26292d] hover:border-emerald-500/40 text-slate-200'
              ]"
            >
              <div class="text-sm font-bold leading-snug line-clamp-2">{{ item.meta.title }}</div>
              <div class="flex items-center justify-between text-[11px] text-dark-muted pt-1 border-t border-[#26292d]/60">
                <span class="font-medium">автор: <strong class="text-slate-300">{{ item.meta.author }}</strong></span>
                <span class="text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{{ item.meta.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- CONTENT ZONE -->
      <main class="col-span-1 lg:col-span-9 min-w-0 space-y-8">
        <article class="bg-[#16181a] border border-[#26292d] p-6 sm:p-8 rounded-2xl shadow-xl space-y-5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/30">
              {{ guide.meta.category }}
            </span>
            <span v-if="guide.meta.server" class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              🎮 {{ guide.meta.server }}
            </span>
            <span class="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/30">
              Сложность: {{ guide.meta.difficulty }}
            </span>
            <span class="text-xs text-dark-muted ml-auto">Обновлено: {{ guide.meta.updatedAt }}</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {{ guide.meta.title }}
          </h1>

          <!-- AUTHORS / CO-AUTHORS SECTION -->
          <div class="pt-1 space-y-2">
            <div class="text-xs text-dark-muted font-semibold uppercase tracking-wider">
              {{ (guide.meta.coAuthors || []).length > 0 ? 'Авторы статьи:' : 'Автор статьи:' }}
            </div>
            
            <div class="flex flex-wrap items-center gap-3">
              <!-- MAIN AUTHOR CARD -->
              <div 
                @click="emit('open-author', guide.meta.author)" 
                class="bg-[#121416] hover:bg-[#181a1d] border border-emerald-500/40 hover:border-emerald-400 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl cursor-pointer transition-all duration-300 shadow-md flex items-center gap-3 group/author"
                title="Открыть профиль основного автора"
              >
                <!-- Avatar with Sleek Verified Badge -->
                <div class="relative flex-shrink-0">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-sm overflow-hidden">
                    <div class="w-full h-full bg-[#0c0d0e] rounded-[10px] flex items-center justify-center overflow-hidden">
                      <img v-if="authorProfile?.avatarUrl" :src="authorProfile.avatarUrl" class="w-full h-full object-cover" />
                      <span v-else class="text-sm font-black text-emerald-400">
                        {{ guide.meta.author ? guide.meta.author.charAt(0).toUpperCase() : 'A' }}
                      </span>
                    </div>
                  </div>
                  <!-- Minimalist Verified Badge -->
                  <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 border-2 border-[#121416] flex items-center justify-center text-white shadow-sm">
                    <IconRenderer name="Check" size="10" class="stroke-[3]" />
                  </div>
                </div>

                <!-- Nickname & Main Author Label -->
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm sm:text-base font-extrabold text-white group-hover/author:text-emerald-400 transition-colors">
                      {{ guide.meta.author }}
                    </span>
                    <span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-md font-bold">
                      Основной автор
                    </span>
                  </div>
                </div>

                <!-- Compact Cyan Square Link Icon Button -->
                <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover/author:bg-cyan-500 group-hover/author:text-white flex items-center justify-center transition-all shadow-sm ml-2">
                  <IconRenderer name="ExternalLink" size="14" />
                </div>
              </div>

              <!-- CO-AUTHORS / HELPERS CARDS -->
              <template v-for="coAuthor in (guide.meta.coAuthors || [])" :key="coAuthor">
                <div 
                  @click="emit('open-author', coAuthor)" 
                  class="bg-[#121416] hover:bg-[#181a1d] border border-[#26292d] hover:border-cyan-500/50 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-md flex items-center gap-3 group/coauthor"
                  title="Открыть профиль соавтора"
                >
                  <!-- Avatar -->
                  <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 flex items-center justify-center font-bold text-xs">
                    {{ coAuthor.charAt(0).toUpperCase() }}
                  </div>

                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs sm:text-sm font-bold text-slate-200 group-hover/coauthor:text-cyan-400 transition-colors">
                        {{ coAuthor }}
                      </span>
                      <span class="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded-md font-semibold">
                        Помощник / Соавтор
                      </span>
                    </div>
                  </div>

                  <div class="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover/coauthor:bg-cyan-500 group-hover/coauthor:text-white flex items-center justify-center transition-all shadow-sm ml-1">
                    <IconRenderer name="ExternalLink" size="12" />
                  </div>
                </div>
              </template>
            </div>
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
              'scroll-mt-24 transition-all flex flex-col justify-start',
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
                  'bg-[#16181a] border border-[#26292d] p-6 rounded-2xl shadow-xl flex flex-col justify-start gap-4 h-full'
                ]"
              >
                <!-- Stacked Sub-blocks inside Unified Column Card (Top-Aligned) -->
                <div class="space-y-4 flex-1 flex flex-col justify-start">
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
