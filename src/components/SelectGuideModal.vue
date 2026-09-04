<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { Guide } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  guides: Guide[];
  currentUsername: string;
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', guide: Guide): void;
  (e: 'create'): void;
}>();

const searchQuery = ref('');
const activeTab = ref<'all' | 'drafts' | 'moderation' | 'published' | 'rejected'>('all');
const viewMode = ref<'cards' | 'rows'>('cards');

// User's own or co-authored guides
const userGuides = computed(() => {
  if (!props.currentUsername) return [];
  const username = props.currentUsername.toLowerCase().trim();
  return props.guides.filter(g => {
    const isAuthor = (g.meta.author || '').toLowerCase().trim() === username || 
                     (g.meta.coAuthors || []).some(ca => ca.toLowerCase().trim() === username);
    return isAuthor || props.isAdmin;
  });
});

const counts = computed(() => {
  const all = userGuides.value;
  return {
    all: all.length,
    drafts: all.filter(g => (!g.meta.published || !g.meta.isVisible) && g.meta.status !== 'pending_moderation' && g.meta.status !== 'rejected').length,
    moderation: all.filter(g => g.meta.status === 'pending_moderation').length,
    published: all.filter(g => g.meta.published && g.meta.isVisible).length,
    rejected: all.filter(g => g.meta.status === 'rejected').length,
  };
});

const filteredGuides = computed(() => {
  let result = userGuides.value;

  // Filter by Tab
  if (activeTab.value === 'drafts') {
    result = result.filter(g => (!g.meta.published || !g.meta.isVisible) && g.meta.status !== 'pending_moderation' && g.meta.status !== 'rejected');
  } else if (activeTab.value === 'moderation') {
    result = result.filter(g => g.meta.status === 'pending_moderation');
  } else if (activeTab.value === 'published') {
    result = result.filter(g => g.meta.published && g.meta.isVisible);
  } else if (activeTab.value === 'rejected') {
    result = result.filter(g => g.meta.status === 'rejected');
  }

  // Filter by Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    result = result.filter(g => 
      (g.meta.title || '').toLowerCase().includes(q) ||
      (g.meta.server || '').toLowerCase().includes(q) ||
      (g.meta.category || '').toLowerCase().includes(q)
    );
  }

  return result;
});

const handleSelect = (guide: Guide) => {
  emit('select', guide);
  emit('close');
};

const handleCreateNew = () => {
  emit('create');
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#141619] border border-[#2d3239] w-full max-w-3xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 relative overflow-hidden flex flex-col max-h-[88vh]">
      
      <!-- Ambient Background Glow -->
      <div class="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4 relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
            <IconRenderer name="Edit3" size="20" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-extrabold text-white tracking-tight">Выбор гайда для Конструктора</h3>
            <p class="text-xs text-slate-400 font-medium">Управляйте вашими черновиками и опубликованными материалами</p>
          </div>
        </div>

        <button 
          @click="emit('close')"
          class="p-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-dark-muted hover:text-white border border-[#34383e] transition-colors"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Create Button & Quick Tools Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        <button
          type="button"
          @click="handleCreateNew"
          class="sm:col-span-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] group cursor-pointer"
        >
          <div class="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
            <IconRenderer name="Plus" size="16" />
          </div>
          <span>Создать новый чистый гайд</span>
        </button>

        <!-- Search Bar -->
        <div class="relative flex items-center">
          <IconRenderer name="Search" class="absolute left-3 text-slate-500" size="16" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по гайдам..."
            class="w-full pl-9 pr-3 py-2.5 bg-[#17191d] border border-[#2b2f36] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-all"
          />
        </div>
      </div>

      <!-- Filter Tabs & View Mode Controls -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#24282e] pb-3 relative z-10 text-xs">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            @click="activeTab = 'all'"
            :class="[
              'px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'all' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'bg-[#181a1e] text-slate-400 border border-[#272b32] hover:text-white'
            ]"
          >
            <span>Все</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 font-extrabold">{{ counts.all }}</span>
          </button>

          <button
            @click="activeTab = 'drafts'"
            :class="[
              'px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'drafts' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'bg-[#181a1e] text-slate-400 border border-[#272b32] hover:text-white'
            ]"
          >
            <span>Черновики</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 font-extrabold">{{ counts.drafts }}</span>
          </button>

          <button
            @click="activeTab = 'moderation'"
            :class="[
              'px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'moderation' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'bg-[#181a1e] text-slate-400 border border-[#272b32] hover:text-white'
            ]"
          >
            <span>На модерации</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 font-extrabold">{{ counts.moderation }}</span>
          </button>

          <button
            @click="activeTab = 'published'"
            :class="[
              'px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'bg-[#181a1e] text-slate-400 border border-[#272b32] hover:text-white'
            ]"
          >
            <span>Опубликованные</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 font-extrabold">{{ counts.published }}</span>
          </button>

          <button
            v-if="counts.rejected > 0"
            @click="activeTab = 'rejected'"
            :class="[
              'px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' : 'bg-[#181a1e] text-slate-400 border border-[#272b32] hover:text-white'
            ]"
          >
            <span>Отклоненные</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 font-extrabold">{{ counts.rejected }}</span>
          </button>
        </div>

        <!-- Layout Mode Toggle -->
        <div class="flex items-center gap-1 bg-[#17191d] p-1 rounded-xl border border-[#2b2f36] ml-auto">
          <button 
            @click="viewMode = 'cards'"
            :class="['p-1.5 rounded-lg transition-colors', viewMode === 'cards' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300']"
            title="Плитка"
          >
            <IconRenderer name="Grid" size="14" />
          </button>
          <button 
            @click="viewMode = 'rows'"
            :class="['p-1.5 rounded-lg transition-colors', viewMode === 'rows' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300']"
            title="Компактный список"
          >
            <IconRenderer name="List" size="14" />
          </button>
        </div>
      </div>

      <!-- Scrollable List of Guides -->
      <div class="flex-1 overflow-y-auto pr-1 relative z-10 custom-scrollbar space-y-3">
        
        <!-- Empty State -->
        <div v-if="filteredGuides.length === 0" class="py-12 text-center space-y-4 bg-[#0d0e10] border border-[#23272d] rounded-2xl p-6">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <IconRenderer name="FileText" size="26" />
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white">Гайды не найдены</h4>
            <p class="text-xs text-dark-muted max-w-sm mx-auto">
              {{ searchQuery ? 'По вашему поисковому запросу ничего не найдено.' : 'В этой категории пока нет созданных гайдов.' }}
            </p>
          </div>
        </div>

        <!-- Cards Layout Grid -->
        <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            v-for="guide in filteredGuides" 
            :key="guide.meta.id"
            @click="handleSelect(guide)"
            :class="[
              'p-4 rounded-2xl bg-[#181a1e] hover:bg-[#202329] border transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-md hover:scale-[1.01]',
              guide.meta.status === 'rejected' ? 'border-rose-500/40 hover:border-rose-500' : 
              guide.meta.status === 'pending_moderation' ? 'border-cyan-500/40 hover:border-cyan-500' : 
              guide.meta.published && guide.meta.isVisible ? 'border-[#2b2f36] hover:border-emerald-500/50' :
              'border-[#2b2f36] hover:border-amber-500/50'
            ]"
          >
            <div>
              <div class="flex items-center justify-between gap-1.5 mb-2">
                <span v-if="guide.meta.status === 'rejected'" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Отклонен
                </span>
                <span v-else-if="guide.meta.status === 'pending_moderation'" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Модерация
                </span>
                <span v-else-if="guide.meta.published && guide.meta.isVisible" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Опубликован
                </span>
                <span v-else class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Черновик
                </span>

                <span v-if="guide.meta.server" class="text-[10px] font-semibold text-emerald-400 truncate max-w-[90px]">
                  {{ guide.meta.server }}
                </span>
              </div>

              <h4 class="text-xs font-extrabold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                {{ guide.meta.title || 'Без названия' }}
              </h4>

              <!-- Rejection Reason Banner -->
              <div v-if="guide.meta.status === 'rejected' && guide.meta.rejectionReason" class="mt-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200 space-y-0.5">
                <div class="font-extrabold text-rose-400 flex items-center gap-1">
                  <IconRenderer name="AlertTriangle" size="12" />
                  <span>Замечание:</span>
                </div>
                <p class="leading-tight line-clamp-2 text-rose-300/90 font-medium">{{ guide.meta.rejectionReason }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-dark-muted border-t border-[#292d34] pt-2">
              <span class="flex items-center gap-1 text-slate-400">
                <IconRenderer name="Eye" size="12" />
                {{ guide.meta.views || guide.meta.viewsCount || 0 }}
              </span>
              <span class="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Редактировать <IconRenderer name="ArrowRight" size="12" />
              </span>
            </div>
          </div>
        </div>

        <!-- Compact Rows Layout (Designed for 20+ Guides) -->
        <div v-else class="space-y-2">
          <div 
            v-for="guide in filteredGuides" 
            :key="guide.meta.id"
            @click="handleSelect(guide)"
            :class="[
              'p-3 rounded-xl bg-[#181a1e] hover:bg-[#202329] border transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-sm',
              guide.meta.status === 'rejected' ? 'border-rose-500/40 hover:border-rose-500' : 
              guide.meta.status === 'pending_moderation' ? 'border-cyan-500/40 hover:border-cyan-500' : 
              guide.meta.published && guide.meta.isVisible ? 'border-[#2b2f36] hover:border-emerald-500/50' :
              'border-[#2b2f36] hover:border-amber-500/50'
            ]"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <!-- Status Badge Indicator -->
              <div class="shrink-0">
                <span v-if="guide.meta.status === 'rejected'" class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" title="Отклонен"></span>
                <span v-else-if="guide.meta.status === 'pending_moderation'" class="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" title="На модерации"></span>
                <span v-else-if="guide.meta.published && guide.meta.isVisible" class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" title="Опубликован"></span>
                <span v-else class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" title="Черновик"></span>
              </div>

              <div class="min-w-0 flex-1">
                <h4 class="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                  {{ guide.meta.title || 'Без названия' }}
                </h4>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span v-if="guide.meta.server" class="text-emerald-400 font-semibold">{{ guide.meta.server }}</span>
                  <span>•</span>
                  <span>{{ guide.meta.updatedAt || 'Давно' }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4 shrink-0 text-[11px]">
              <span class="text-slate-400 flex items-center gap-1 font-medium">
                <IconRenderer name="Eye" size="12" />
                {{ guide.meta.views || guide.meta.viewsCount || 0 }}
              </span>

              <button 
                type="button" 
                class="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 transition-colors"
              >
                <span>Открыть</span>
                <IconRenderer name="ArrowRight" size="12" />
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-3 border-t border-[#26292d] relative z-10 text-xs">
        <span class="text-slate-500 font-medium">Отображено гайдов: {{ filteredGuides.length }}</span>
        <button
          type="button"
          @click="emit('close')"
          class="px-5 py-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-slate-300 hover:text-white border border-[#34383e] font-bold transition-all"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
</template>

