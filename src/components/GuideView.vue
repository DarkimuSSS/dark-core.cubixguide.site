<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import CalloutBlock from './CalloutBlock.vue';
import LayerPainter from './LayerPainter.vue';
import SpoilerBlock from './SpoilerBlock.vue';
import BeforeAfterSlider from './BeforeAfterSlider.vue';
import type { Guide, BlockSpan, BlockVariant, AuthorProfile } from '../types/guide';

const props = defineProps<{
  guide: Guide;
  allGuides: Guide[];
  isFavorited?: boolean;
  isPreviewMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-guide', guideId: string): void;
  (e: 'toggle-bookmark', guideId: string): void;
  (e: 'edit-mode'): void;
  (e: 'open-author', username: string): void;
  (e: 'exit-preview'): void;
}>();

const isMobileNavOpen = ref(false);
const isOtherGuidesOpen = ref(false);
const isTocOpen = ref(true);
const sidebarSearchQuery = ref('');
const authorProfile = ref<AuthorProfile | null>(null);
const activeZoomImage = ref<string | null>(null);

// Collapsible Sections state (map of blockId -> boolean)
const collapsedBlocks = ref<Record<string, boolean>>({});

// Reader checklist progress stored in localStorage (itemId -> boolean)
const userChecklistState = ref<Record<string, boolean>>({});

const loadChecklistState = () => {
  try {
    const saved = localStorage.getItem(`cubix_chk_progress_${props.guide.meta.id}`);
    if (saved) {
      userChecklistState.value = JSON.parse(saved);
    } else {
      userChecklistState.value = {};
    }
  } catch (err) {}
};

const toggleChecklistItemProgress = (itemId: string, defaultCompleted?: boolean) => {
  const current = userChecklistState.value[itemId] ?? defaultCompleted ?? false;
  userChecklistState.value[itemId] = !current;
  try {
    localStorage.setItem(`cubix_chk_progress_${props.guide.meta.id}`, JSON.stringify(userChecklistState.value));
  } catch (err) {}
};

const isChecklistItemCompleted = (itemId: string, defaultCompleted?: boolean) => {
  if (userChecklistState.value[itemId] !== undefined) {
    return userChecklistState.value[itemId];
  }
  return !!defaultCompleted;
};

watch(() => props.guide.meta.id, () => {
  loadChecklistState();
}, { immediate: true });

const toggleBlockCollapse = (blockId: string) => {
  collapsedBlocks.value[blockId] = !collapsedBlocks.value[blockId];
};

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

interface TocItem {
  id: string;
  title: string;
  level: 'h1' | 'h2';
  children: { id: string; title: string }[];
}

// Collapsed state for H1 items in Table of Contents
const collapsedTocH1 = ref<Record<string, boolean>>({});

const toggleTocH1 = (id: string) => {
  collapsedTocH1.value[id] = !collapsedTocH1.value[id];
};

const headingOutlineTree = computed(() => {
  const groups: TocItem[] = [];
  let currentH1: TocItem | null = null;

  const searchHeadings = (blocks: GuideBlock[]) => {
    for (const b of blocks) {
      const isExplicitInOutline = b.showInOutline === true;
      const isExplicitOutOutline = b.showInOutline === false;

      if (!isExplicitOutOutline) {
        if (b.type === 'section' && b.sectionTitle?.trim()) {
          const itemObj = {
            id: b.anchorId || b.id,
            title: b.sectionTitle,
            level: 'h1' as const,
            children: []
          };
          currentH1 = itemObj;
          groups.push(currentH1);
        } else if (b.type === 'heading' && b.headingText?.trim()) {
          const itemLevel = b.headingLevel || 'h2';
          const itemObj = {
            id: b.anchorId || b.id,
            title: b.headingText,
            level: itemLevel,
            children: []
          };

          if (itemLevel === 'h1') {
            currentH1 = itemObj;
            groups.push(currentH1);
          } else {
            if (currentH1) {
              currentH1.children.push({ id: itemObj.id, title: itemObj.title });
            } else {
              // Top-level standalone H2
              groups.push(itemObj);
            }
          }
        } else if (isExplicitInOutline) {
          const title = b.headingText || b.checklistTitle || b.calloutTitle || b.imageCaption || `${b.type.toUpperCase()} блок`;
          const itemObj = {
            id: b.anchorId || b.id,
            title: title,
            level: 'h2' as const,
            children: []
          };
          if (currentH1) {
            currentH1.children.push({ id: itemObj.id, title: itemObj.title });
          } else {
            groups.push(itemObj);
          }
        }
      }

      if (b.type === 'section' && b.columns) {
        b.columns.forEach(c => searchHeadings(c.blocks));
      }
    }
  };

  searchHeadings(props.guide.blocks);
  return groups;
});

const scrollToHeadingBlock = (id: string) => {
  const el = document.getElementById(`block-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-emerald-500');
    setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500'), 1500);
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
  <div class="w-full flex items-start gap-5 relative">
    
    <!-- FLOATING PREVIEW CONTROL BAR OVERLAY -->
    <div 
      v-if="isPreviewMode" 
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#121417]/95 backdrop-blur-2xl border-2 border-cyan-500/60 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6 duration-300 ring-4 ring-cyan-950/50"
    >
      <div class="flex items-center gap-2.5">
        <div class="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></div>
        <IconRenderer name="Eye" size="18" class="text-cyan-400" />
        <div class="flex flex-col">
          <span class="text-xs font-black text-white uppercase tracking-wider">Режим Предпросмотра</span>
          <span class="text-[10px] text-cyan-300/80">Статья отображается так, как её увидят читатели</span>
        </div>
      </div>
      <div class="h-6 w-px bg-cyan-500/30"></div>
      <button 
        @click="emit('exit-preview')" 
        class="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
      >
        <IconRenderer name="Edit3" size="14" />
        <span>Вернуться в конструктор</span>
      </button>
    </div>
    
    <!-- LEFT SIDEBAR: FIXED POSITION CATALOG -->
    <aside :class="[
      'w-80 shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] flex flex-col bg-[#16181a] border border-[#26292d] rounded-2xl p-4 sm:p-5 shadow-xl transition-all duration-300',
      isMobileNavOpen ? 'fixed top-20 left-4 z-40 shadow-2xl w-80 max-h-[calc(100vh-6rem)] flex' : 'hidden lg:flex'
    ]">
      <div class="flex flex-col h-full space-y-3 min-h-0">
        <div class="flex items-center justify-between pb-3 border-b border-[#26292d] shrink-0">
          <div class="text-xs font-extrabold uppercase tracking-wider text-dark-muted flex items-center gap-2">
            <IconRenderer name="BookOpen" size="16" class="text-emerald-400" />
            Каталог гайдов
          </div>
          <button @click="isMobileNavOpen = false" class="lg:hidden text-dark-muted hover:text-white">
            <IconRenderer name="X" size="16" />
          </button>
        </div>

        <!-- SIDEBAR LIVE SEARCH INPUT -->
        <div class="relative shrink-0">
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

        <!-- ACTIVE GUIDE CARD WITH TOC SIDEBAR PANEL -->
        <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 min-h-0">
          <!-- Active Guide Card with Table of Contents -->
          <div class="p-4 rounded-2xl border bg-emerald-500/15 border-emerald-500/50 text-white shadow-emerald-950/40 shadow-xl space-y-3">
            <div class="space-y-1">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>Читаемый гайд</span>
                <span class="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30 text-[9px] font-bold">
                  {{ guide.meta.category }}
                </span>
              </div>
              <h3 class="text-xs font-bold leading-snug text-white">
                {{ guide.meta.title }}
              </h3>
            </div>

            <div class="flex items-center justify-between text-[10px] text-dark-muted pt-2 border-t border-emerald-500/30">
              <span class="font-medium">автор: <strong class="text-slate-200">{{ guide.meta.author }}</strong></span>
              <span v-if="guide.meta.server" class="text-emerald-300 font-semibold">{{ guide.meta.server }}</span>
            </div>

            <!-- TABLE OF CONTENTS TREE (PREMIUM ACCORDION DESIGN) -->
            <div v-if="headingOutlineTree.length > 0" class="pt-3 border-t border-emerald-500/25 space-y-2">
              <div 
                @click="isTocOpen = !isTocOpen"
                class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center justify-between cursor-pointer hover:text-emerald-300 transition-colors group/toctoggle py-0.5 select-none"
              >
                <span class="flex items-center gap-1.5">
                  <IconRenderer name="List" size="13" class="text-emerald-400" />
                  Содержание
                </span>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-[9px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    {{ headingOutlineTree.length }} разделов
                  </span>
                  <IconRenderer :name="isTocOpen ? 'ChevronUp' : 'ChevronDown'" size="13" class="text-emerald-400 group-hover/toctoggle:scale-125 transition-transform" />
                </div>
              </div>

              <div v-if="isTocOpen" class="space-y-1.5 transition-all pt-1">
                <div
                  v-for="group in headingOutlineTree"
                  :key="group.id"
                  class="space-y-1"
                >
                  <!-- H1 Main Group Header -->
                  <div
                    :class="[
                      'group/h1item w-full text-left text-[11px] font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer p-2 border shadow-sm',
                      'bg-[#0f1814] hover:bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60 text-slate-100 hover:text-emerald-300'
                    ]"
                  >
                    <span @click="scrollToHeadingBlock(group.id)" class="truncate flex-1 pr-1 font-semibold leading-tight hover:underline" :title="group.title">
                      {{ group.title }}
                    </span>
                    
                    <button
                      v-if="group.children.length > 0"
                      type="button"
                      @click.stop="toggleTocH1(group.id)"
                      class="w-5 h-5 rounded-lg bg-black/40 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all shrink-0 ml-1"
                      :title="collapsedTocH1[group.id] ? 'Развернуть подпункты' : 'Свернуть подпункты'"
                    >
                      <IconRenderer :name="collapsedTocH1[group.id] ? 'ChevronDown' : 'ChevronUp'" size="11" />
                    </button>
                  </div>

                  <!-- H2 Sub-items Hierarchy Tree -->
                  <div v-if="!collapsedTocH1[group.id] && group.children.length > 0" class="ml-2.5 pl-2.5 border-l-2 border-emerald-500/25 space-y-1 py-0.5">
                    <button
                      v-for="child in group.children"
                      :key="child.id"
                      type="button"
                      @click="scrollToHeadingBlock(child.id); isMobileNavOpen = false;"
                      class="w-full text-left text-[10.5px] font-medium py-1 px-2.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all truncate block flex items-center gap-1.5"
                      :title="child.title"
                    >
                      <span class="w-1 h-1 rounded-full bg-cyan-400/60 shrink-0"></span>
                      <span class="truncate">{{ child.title }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Dropdown / Collapsible To Select Other Guides -->
          <div class="pt-2">
            <button
              @click="isOtherGuidesOpen = !isOtherGuidesOpen"
              class="w-full bg-[#121416] hover:bg-[#181a1d] border border-[#26292d] text-slate-300 hover:text-white p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
            >
              <span class="flex items-center gap-1.5 text-dark-muted">
                <IconRenderer name="BookOpen" size="13" /> Все гайды ({{ allGuides.length }})
              </span>
              <IconRenderer :name="isOtherGuidesOpen ? 'ChevronUp' : 'ChevronDown'" size="14" />
            </button>

            <div v-if="isOtherGuidesOpen" class="mt-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              <div 
                v-for="item in filteredAllGuides" 
                :key="item.meta.id"
                @click="emit('select-guide', item.meta.id); isMobileNavOpen = false;"
                :class="[
                  'p-2.5 rounded-xl border text-left cursor-pointer transition-all space-y-1 shadow-sm',
                  guide.meta.id === item.meta.id 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                    : 'bg-[#121416] border-[#26292d] hover:border-emerald-500/40 text-slate-300'
                ]"
              >
                <div class="text-[11px] font-bold leading-snug truncate">{{ item.meta.title }}</div>
                <div class="flex items-center justify-between text-[9px] text-dark-muted">
                  <span>{{ item.meta.author }}</span>
                  <span class="text-cyan-400 font-semibold">{{ item.meta.category }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- RIGHT CONTENT: ARTICLE COLUMN -->
    <main class="flex-1 min-w-0 space-y-8 pb-16">
        <article :class="['p-6 sm:p-8 rounded-2xl shadow-xl space-y-5 transition-all', getVariantClass(guide.meta.variant)]">
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

            <div class="flex items-center gap-3 ml-auto">
              <button
                type="button"
                @click="emit('toggle-bookmark', guide.meta.id)"
                :class="[
                  'px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm',
                  isFavorited
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40'
                    : 'bg-[#121416] text-slate-300 hover:text-white border-[#26292d] hover:border-amber-500/40'
                ]"
                :title="isFavorited ? 'Удалить из закладок' : 'Добавить в закладки'"
              >
                <IconRenderer name="Star" size="14" :class="isFavorited ? 'text-amber-400 fill-amber-400' : 'text-amber-400/70'" />
                <span>{{ isFavorited ? 'В закладках' : 'В закладки' }}</span>
              </button>
              <span class="text-xs text-dark-muted hidden sm:inline">Обновлено: {{ guide.meta.updatedAt }}</span>
            </div>
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
            <div
              v-else-if="block.type === 'section'"
              :class="[
                'w-full rounded-2xl transition-all p-6 shadow-xl',
                block.sectionStyle === 'transparent' ? '' : getVariantClass(block.variant)
              ]"
            >
              <!-- Optional Section Title / Header Collapse Bar if H1/Heading sub-block or explicit section header present -->
              <div 
                :class="[
                  'flex items-center justify-between pb-3 mb-4 border-b border-[#26292d]/80 group/sec',
                  block.allowCollapsing !== false ? 'cursor-pointer' : ''
                ]" 
                @click="block.allowCollapsing !== false ? toggleBlockCollapse(block.id) : null"
              >
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-emerald-400 group-hover/sec:scale-125 transition-transform"></div>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover/sec:text-emerald-300 transition-colors">
                    {{ block.sectionTitle || block.columns?.[0]?.blocks?.find(b => b.type === 'heading')?.headingText || 'Секция гайда' }}
                  </span>
                </div>
                <button
                  v-if="block.allowCollapsing !== false"
                  type="button"
                  class="p-1 rounded-lg bg-[#121416] group-hover/sec:bg-[#212429] border border-[#26292d] text-dark-muted group-hover/sec:text-white transition-colors"
                  :title="collapsedBlocks[block.id] ? 'Развернуть секцию' : 'Свернуть секцию'"
                >
                  <IconRenderer :name="collapsedBlocks[block.id] ? 'ChevronDown' : 'ChevronUp'" size="16" />
                </button>
              </div>

              <div v-if="!collapsedBlocks[block.id]" class="flex flex-wrap gap-6 items-stretch w-full transition-all">
                <div 
                  v-for="col in (block.columns || [])" 
                  :key="col.id"
                  :style="{ width: col.customWidth ? `calc(${col.customWidth}% - 0.75rem)` : undefined }"
                  :class="[
                    !col.customWidth ? getGridSpanClass(col.span) : '',
                    block.sectionStyle === 'transparent' ? 'bg-[#16181a] border border-[#26292d] p-6 rounded-2xl shadow-xl' : '',
                    'flex flex-col justify-start gap-4 h-full'
                  ]"
                >
                  <!-- Stacked Sub-blocks inside Unified Column Card (Top-Aligned) -->
                  <div class="space-y-4 flex-1 flex flex-col justify-start">
                    <div
                      v-for="sub in col.blocks"
                      :key="sub.id"
                      :id="`block-${sub.id}`"
                      :class="sub.fullWidth ? 'col-span-full w-full' : ''"
                    >
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
                      <div v-else-if="sub.type === 'image'" class="w-full flex flex-col items-center gap-2">
                        <div v-if="sub.imageUrl" class="rounded-xl overflow-hidden bg-[#0c0d0e] border border-[#26292d] w-full h-56 sm:h-64 flex items-center justify-center p-1.5 shadow-md relative group/imgview cursor-zoom-in" @click="activeZoomImage = sub.imageUrl">
                          <img :src="sub.imageUrl" :alt="sub.imageCaption" class="w-full h-full object-cover rounded-lg group-hover/imgview:scale-105 transition-transform duration-300" />
                          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/imgview:opacity-100 flex items-center justify-center transition-opacity">
                            <span class="text-xs font-bold text-white bg-black/70 px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
                              <IconRenderer name="Maximize2" size="13" /> Открыть
                            </span>
                          </div>
                        </div>
                        <p v-if="sub.imageCaption" class="text-xs text-center text-dark-muted italic">{{ sub.imageCaption }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Full-width Bottom Sub-blocks inside the Section Card -->
              <div v-if="block.fullWidthBlocksBottom && block.fullWidthBlocksBottom.length > 0" class="mt-6 space-y-4 pt-4 border-t border-[#26292d]/60">
                <div v-for="sub in block.fullWidthBlocksBottom" :key="sub.id" :id="`block-${sub.id}`">
                  <div v-if="sub.type === 'heading'" class="border-b border-[#26292d] pb-3 mb-2">
                    <h2 v-if="sub.headingLevel === 'h1'" class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ sub.headingText }}</h2>
                    <h3 v-else class="text-lg font-bold text-slate-100 tracking-tight">{{ sub.headingText }}</h3>
                  </div>
                  <div v-else-if="sub.type === 'text'" class="bg-[#121416] border border-[#26292d] p-4 rounded-xl text-slate-300 text-sm leading-relaxed shadow-sm">
                    <p class="whitespace-pre-line">{{ sub.textContent }}</p>
                  </div>
                  <div v-else-if="sub.type === 'callout'">
                    <CalloutBlock :block="sub" :is-editing="false" />
                  </div>
                  <div v-else-if="sub.type === 'image'" class="h-full flex flex-col justify-center items-center space-y-2">
                    <div v-if="sub.imageUrl" class="rounded-xl overflow-hidden bg-black/60 border border-[#26292d] flex items-center justify-center w-full h-full p-2">
                      <img :src="sub.imageUrl" :alt="sub.imageCaption" class="max-h-[500px] w-auto object-contain rounded-xl" />
                    </div>
                  </div>
                  <div v-else-if="sub.type === 'checklist'" class="p-4 rounded-xl bg-[#0c0d0e] border border-[#26292d] space-y-2">
                    <div v-if="sub.checklistTitle" class="text-xs font-bold text-white mb-2 flex items-center gap-1.5 border-b border-[#26292d]/80 pb-2">
                      <IconRenderer name="CheckCircle2" size="14" class="text-emerald-400" />
                      <span>{{ sub.checklistTitle }}</span>
                    </div>
                    <label v-for="item in (sub.checklistItems || [])" :key="item.id" @click.prevent="toggleChecklistItemProgress(item.id, item.completed)" class="flex items-center gap-2.5 p-2 rounded-lg bg-[#16181a] border border-[#26292d] cursor-pointer hover:border-emerald-500/40 text-xs transition-all group/subchk select-none">
                      <input type="checkbox" :checked="isChecklistItemCompleted(item.id, item.completed)" class="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer shrink-0 pointer-events-none" />
                      <span :class="['transition-all flex-1', isChecklistItemCompleted(item.id, item.completed) ? 'line-through text-dark-muted/70' : 'text-slate-200 group-hover/subchk:text-white']">{{ item.text }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Standalone Heading Block -->
            <div 
              v-else-if="block.type === 'heading'" 
              :class="[
                'p-5 rounded-2xl h-full flex items-center justify-between border border-[#26292d] group/hhead', 
                block.allowCollapsing !== false ? 'cursor-pointer' : '',
                getVariantClass(block.variant)
              ]" 
              @click="block.allowCollapsing !== false ? toggleBlockCollapse(block.id) : null"
            >
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

              <button
                v-if="block.allowCollapsing !== false"
                type="button"
                class="p-1 rounded-lg bg-[#121416] group-hover/hhead:bg-[#212429] border border-[#26292d] text-dark-muted group-hover/hhead:text-white transition-colors shrink-0 ml-3"
                :title="collapsedBlocks[block.id] ? 'Развернуть' : 'Свернуть'"
              >
                <IconRenderer :name="collapsedBlocks[block.id] ? 'ChevronDown' : 'ChevronUp'" size="16" />
              </button>
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



            <!-- Multiblock Painter -->
            <div v-else-if="block.type === 'multiblock'" class="h-full flex flex-col justify-between">
              <LayerPainter :block="block" :is-editing="false" />
            </div>

            <!-- Interactive Reader Step Checklist -->
            <div v-else-if="block.type === 'checklist'" :class="['p-6 rounded-2xl h-full flex flex-col justify-between shadow-xl space-y-4', getVariantClass(block.variant)]">
              <div v-if="block.checklistTitle" class="flex items-center justify-between border-b border-[#26292d]/80 pb-3">
                <div class="text-sm font-bold text-white flex items-center gap-2">
                  <IconRenderer name="CheckCircle2" size="18" class="text-emerald-400" />
                  {{ block.checklistTitle }}
                </div>
              </div>

              <div class="space-y-2 flex-1">
                <label 
                  v-for="item in (block.checklistItems || [])" 
                  :key="item.id"
                  @click.prevent="toggleChecklistItemProgress(item.id, item.completed)"
                  class="flex items-center gap-3 p-3.5 rounded-xl bg-[#0c0d0e] border border-[#26292d] cursor-pointer hover:border-emerald-500/40 transition-all group/chk select-none"
                >
                  <input
                    type="checkbox"
                    :checked="isChecklistItemCompleted(item.id, item.completed)"
                    class="w-4 h-4 rounded border-[#26292d] bg-[#16181a] text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500 shrink-0 pointer-events-none"
                  />
                  <span :class="['text-xs sm:text-sm font-medium transition-all flex-1', isChecklistItemCompleted(item.id, item.completed) ? 'line-through text-dark-muted/70' : 'text-slate-200 group-hover/chk:text-white']">
                    {{ item.text }}
                  </span>
                  <div v-if="isChecklistItemCompleted(item.id, item.completed)" class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                    ✓
                  </div>
                </label>
              </div>
            </div>

            <!-- Spoiler Block -->
            <div v-else-if="block.type === 'spoiler'">
              <SpoilerBlock :block="block" :is-editing="false" />
            </div>

            <!-- Before After Slider Block -->
            <div v-else-if="block.type === 'before_after'">
              <BeforeAfterSlider :block="block" :is-editing="false" />
            </div>
          </div>
        </div>
      </main>

      <!-- FULLSCREEN IMAGE ZOOM MODAL (PREMIUM DESIGN) -->
      <div 
        v-if="activeZoomImage" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-200"
        @click="activeZoomImage = null"
      >
        <div class="relative flex flex-col items-center max-w-5xl w-full max-h-full" @click.stop>
          <!-- Rounded Image Box with Glowing Neon Border & Floating Close Button -->
          <div class="relative rounded-3xl p-1 bg-[#101216] border-2 border-indigo-500/60 shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden max-h-[calc(100vh-10rem)] flex items-center justify-center">
            <!-- Top Right Floating Close Button -->
            <button 
              type="button"
              @click="activeZoomImage = null" 
              class="absolute top-3 right-3 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-all z-20"
              title="Закрыть"
            >
              <IconRenderer name="X" size="16" class="stroke-[3]" />
            </button>

            <img 
              :src="activeZoomImage" 
              class="max-w-full max-h-[calc(100vh-11rem)] object-contain rounded-2xl" 
            />
          </div>

          <!-- Bottom Action Bar (Filename + Download Button) -->
          <div class="mt-4 bg-[#14161b]/90 border border-indigo-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
            <span class="text-xs font-semibold text-slate-200 truncate max-w-xs font-mono">
              {{ activeZoomImage.split('/').pop()?.split('?')[0] || 'image.png' }}
            </span>
            <a 
              :href="activeZoomImage" 
              target="_blank" 
              download 
              class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-950/60 transition-all"
            >
              <IconRenderer name="Download" size="14" /> Скачать
            </a>
          </div>
        </div>
      </div>
    </div>
</template>
