<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import AuthorGalleryModal from './AuthorGalleryModal.vue';
import BlockModelEditorModal from './BlockModelEditorModal.vue';
import BlockModelGalleryModal from './BlockModelGalleryModal.vue';

const props = withDefaults(defineProps<{
  isOpen?: boolean;
  username: string;
  isFullPage?: boolean;
}>(), {
  isOpen: true,
  isFullPage: false
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-guide', guideId: string): void;
  (e: 'go-home'): void;
  (e: 'open-assets'): void;
}>();

const isLoading = ref(true);
const isAuthorGalleryOpen = ref(false);
const isBlockModelEditorOpen = ref(false);
const isBlockModelGalleryOpen = ref(false);
const searchQuery = ref('');
const statusFilter = ref<'all' | 'published' | 'draft'>('all');

const analyticsData = ref<{
  author: string;
  totalGuides: number;
  publishedCount: number;
  pendingCount: number;
  draftCount: number;
  totalViews: number;
  guides: {
    id: string;
    title: string;
    server: string;
    category: string;
    published: boolean;
    isVisible: boolean;
    status: string;
    views: number;
    updatedAt: string;
  }[];
  recentLogs: {
    id: number;
    event_type: string;
    guide_id?: string;
    guide_title?: string;
    created_at: string;
  }[];
} | null>(null);

const fetchAnalytics = async () => {
  if (!props.username) return;
  isLoading.value = true;
  try {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('cubix_jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/author/analytics?username=${encodeURIComponent(props.username)}`, { headers });
    if (res.ok) {
      analyticsData.value = await res.json();
    }
  } catch (e) {
    console.error('Ошибка загрузки аналитики автора:', e);
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.isOpen, (val) => {
  if (val) fetchAnalytics();
}, { immediate: true });

const filteredGuides = computed(() => {
  if (!analyticsData.value?.guides) return [];
  let list = analyticsData.value.guides;

  if (statusFilter.value === 'published') {
    list = list.filter(g => g.published && g.isVisible);
  } else if (statusFilter.value === 'draft') {
    list = list.filter(g => !g.published || !g.isVisible);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(g => g.title.toLowerCase().includes(q) || (g.server && g.server.toLowerCase().includes(q)) || (g.category && g.category.toLowerCase().includes(q)));
  }

  return list;
});

const maxViewsInList = computed(() => {
  if (!analyticsData.value?.guides || analyticsData.value.guides.length === 0) return 1;
  return Math.max(...analyticsData.value.guides.map(g => g.views), 1);
});

const getEventLabel = (type: string) => {
  switch (type) {
    case 'guide_view': return 'Просмотр';
    case 'guide_edit': return 'Правка';
    case 'guide_publish': return 'Публикация';
    case 'guide_create': return 'Создание';
    case 'bookmark_toggle': return 'Закладка';
    default: return type;
  }
};

const getEventBadgeClass = (type: string) => {
  switch (type) {
    case 'guide_view': return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    case 'guide_publish': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'guide_create': return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'bookmark_toggle': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    default: return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
};
</script>

<template>
  <!-- FULL PAGE TAB MODE (?tab=author_dashboard) -->
  <div v-if="isFullPage" class="max-w-7xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
    
    <!-- Loading State -->
    <div v-if="isLoading" class="py-24 text-center space-y-3 bg-[#121418] border border-[#23272e] rounded-3xl shadow-2xl">
      <div class="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="text-xs font-bold text-slate-300">Загрузка кабинета и статистики автора...</div>
    </div>

    <div v-else-if="analyticsData" class="space-y-6">
      
      <!-- HERO HEADER CARD WITH METRICS & QUICK ACTION HUB -->
      <div class="relative bg-gradient-to-br from-[#14171c] via-[#181c22] to-[#121417] border border-[#2a2e36] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        <!-- Ambient Glow Backdrops -->
        <div class="absolute -top-20 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
          
          <!-- Author Info & Greeting -->
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left min-w-0">
            <div class="relative flex-shrink-0">
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-amber-500 p-0.5 shadow-xl shadow-black/80 overflow-hidden ring-2 ring-black/40">
                <div class="w-full h-full bg-[#0c0d0e] rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img :src="`/api/avatar/${encodeURIComponent(username)}`" class="w-full h-full object-cover" />
                </div>
              </div>
              <span class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#14171c]" title="Автор Онлайн"></span>
            </div>

            <div class="space-y-1.5 min-w-0">
              <div class="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {{ username }}
                </h1>
                <span class="px-2.5 py-0.5 text-[11px] font-extrabold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1 shadow-sm">
                  <IconRenderer name="Sparkles" size="12" class="text-amber-400" />
                  Кабинет Автора
                </span>
              </div>
              <p class="text-xs text-slate-300 font-medium max-w-xl">
                Добро пожаловать в персональную рабочую студию. Отслеживайте просмотры статей, управляйте папкой текстур и делитесь наборами с сообществом.
              </p>
            </div>
          </div>

          <!-- Quick Action Buttons Hub -->
          <div class="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0 relative z-10">
            
            <!-- Unified Assets Hub Button -->
            <button
              type="button"
              @click="emit('open-assets')"
              class="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-xs shadow-xl shadow-purple-950/40 transition-all cursor-pointer flex items-center gap-2.5 hover:scale-105 border border-white/10"
            >
              <div class="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center border border-white/10">
                <IconRenderer name="FolderImage" size="18" class="text-amber-300" />
              </div>
              <div class="text-left">
                <div class="text-[12px] leading-tight font-extrabold flex items-center gap-1.5">
                  Центр Ассетов & 3D
                  <span class="px-1.5 py-0.5 text-[9px] bg-amber-400/20 text-amber-200 rounded-md border border-amber-400/30">Текстуры & 3D</span>
                </div>
                <div class="text-[9px] text-purple-200 opacity-90 font-bold">Паки текстур, 3D-модели и Маркетплейс</div>
              </div>
            </button>

            <!-- Go Home / Create New Guide Button -->
            <button
              type="button"
              @click="emit('go-home')"
              class="px-4 py-3 rounded-2xl bg-[#1a1e24] hover:bg-[#242a33] border border-[#343b46] hover:border-cyan-500/50 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 hover:scale-105 shadow-md"
            >
              <IconRenderer name="Plus" size="16" class="text-cyan-400" />
              <span>Создать новый гайд</span>
            </button>
          </div>

        </div>
      </div>

      <!-- KEY METRICS STAT CARDS ROW -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Total Views -->
        <div class="p-5 rounded-2xl bg-[#121418] border border-cyan-500/30 hover:border-cyan-400/60 shadow-lg transition-all space-y-2 group relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconRenderer name="Eye" size="80" class="text-cyan-400" />
          </div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <IconRenderer name="Eye" size="15" />
            </div>
            Всего Просмотров
          </div>
          <div class="text-3xl font-black text-white font-mono tracking-tight">{{ analyticsData.totalViews }}</div>
          <p class="text-[11px] text-dark-muted font-medium">суммарно по всем статьям</p>
        </div>

        <!-- Total Guides -->
        <div class="p-5 rounded-2xl bg-[#121418] border border-purple-500/30 hover:border-purple-400/60 shadow-lg transition-all space-y-2 group relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconRenderer name="BookOpen" size="80" class="text-purple-400" />
          </div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <IconRenderer name="BookOpen" size="15" />
            </div>
            Всего Статей
          </div>
          <div class="text-3xl font-black text-white font-mono tracking-tight">{{ analyticsData.totalGuides }}</div>
          <p class="text-[11px] text-dark-muted font-medium">написано автором</p>
        </div>

        <!-- Published Count -->
        <div class="p-5 rounded-2xl bg-[#121418] border border-emerald-500/30 hover:border-emerald-400/60 shadow-lg transition-all space-y-2 group relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconRenderer name="CheckCircle2" size="80" class="text-emerald-400" />
          </div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <IconRenderer name="CheckCircle2" size="15" />
            </div>
            Опубликовано
          </div>
          <div class="text-3xl font-black text-emerald-400 font-mono tracking-tight">{{ analyticsData.publishedCount }}</div>
          <p class="text-[11px] text-dark-muted font-medium">активны в поиске wiki</p>
        </div>

        <!-- Pending & Drafts -->
        <div class="p-5 rounded-2xl bg-[#121418] border border-amber-500/30 hover:border-amber-400/60 shadow-lg transition-all space-y-2 group relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconRenderer name="Clock" size="80" class="text-amber-400" />
          </div>
          <div class="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <IconRenderer name="Clock" size="15" />
            </div>
            Черновики / В работе
          </div>
          <div class="text-3xl font-black text-amber-400 font-mono tracking-tight">{{ analyticsData.draftCount + analyticsData.pendingCount }}</div>
          <p class="text-[11px] text-dark-muted font-medium">требуют завершения</p>
        </div>

      </div>

      <!-- MAIN CONTENT: 2-COLUMN LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- LEFT COLUMN (8 cols): GUIDES ANALYTICS BREAKDOWN -->
        <div class="lg:col-span-8 space-y-4">
          
          <!-- Section Header & Filters -->
          <div class="bg-[#121418] border border-[#23272e] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <IconRenderer name="BarChart3" size="18" class="text-cyan-400" />
              <span>Рейтинг статей и просмотры</span>
            </h3>

            <div class="flex items-center gap-2.5 w-full sm:w-auto">
              <!-- Filter Tabs -->
              <div class="flex items-center bg-[#1a1e24] p-1 rounded-xl border border-[#262a32]">
                <button
                  type="button"
                  @click="statusFilter = 'all'"
                  :class="['px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer', statusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-extrabold' : 'text-slate-400 hover:text-white']"
                >
                  Все
                </button>
                <button
                  type="button"
                  @click="statusFilter = 'published'"
                  :class="['px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer', statusFilter === 'published' ? 'bg-emerald-500/20 text-emerald-300 font-extrabold' : 'text-slate-400 hover:text-white']"
                >
                  Опубликованные
                </button>
                <button
                  type="button"
                  @click="statusFilter = 'draft'"
                  :class="['px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer', statusFilter === 'draft' ? 'bg-amber-500/20 text-amber-300 font-extrabold' : 'text-slate-400 hover:text-white']"
                >
                  Черновики
                </button>
              </div>

              <!-- Search Bar -->
              <div class="relative w-40 sm:w-48">
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Поиск статей..."
                  class="w-full bg-[#1a1e24] border border-[#262a32] text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-400"
                />
                <IconRenderer name="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredGuides.length === 0" class="text-center py-14 bg-[#121418] rounded-2xl border border-[#23272e] space-y-2">
            <IconRenderer name="FileText" size="36" class="mx-auto text-dark-muted/40" />
            <p class="text-xs text-dark-muted font-bold">Статьи с выбранным фильтром не найдены</p>
          </div>

          <!-- Guides List with Relative Progress Bars -->
          <div v-else class="space-y-3">
            <div
              v-for="guide in filteredGuides"
              :key="guide.id"
              class="bg-[#121418] border border-[#23272e] hover:border-cyan-500/40 p-4 rounded-2xl transition-all shadow-md hover:shadow-cyan-950/20 space-y-2.5 group"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1 min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span 
                      :class="[
                        'text-[9.5px] font-black px-2.5 py-0.5 rounded-md uppercase border tracking-wider',
                        guide.published && guide.isVisible ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                        guide.status === 'pending_moderation' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
                        'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      ]"
                    >
                      {{ guide.published && guide.isVisible ? 'Опубликован' : (guide.status === 'pending_moderation' ? 'На модерации' : 'Черновик') }}
                    </span>

                    <span v-if="guide.server" class="text-[10.5px] font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30 font-mono">
                      🎮 {{ guide.server }}
                    </span>

                    <span class="text-[11px] text-dark-muted font-medium">• {{ guide.category }}</span>
                  </div>

                  <h4 class="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {{ guide.title }}
                  </h4>
                </div>

                <!-- Open Action -->
                <button
                  type="button"
                  @click="emit('select-guide', guide.id)"
                  class="px-3.5 py-2 rounded-xl bg-[#1a1e24] hover:bg-cyan-600 text-slate-300 hover:text-white border border-[#262a32] text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <span>Открыть</span>
                  <IconRenderer name="ArrowRight" size="14" />
                </button>
              </div>

              <!-- Popularity Visual Bar -->
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[10.5px]">
                  <span class="text-dark-muted font-semibold">Популярность статьи</span>
                  <span class="text-cyan-400 font-mono font-black">{{ guide.views }} просмотров</span>
                </div>
                <div class="w-full h-1.5 rounded-full bg-[#1c1f24] overflow-hidden border border-white/5">
                  <div
                    class="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                    :style="{ width: `${Math.max(5, Math.round((guide.views / maxViewsInList) * 100))}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN (4 cols): QUICK TOOLS & RECENT ACTIVITY STREAM -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- QUICK TOOLKIT CARD -->
          <div class="bg-[#121418] border border-[#23272e] p-5 rounded-2xl space-y-3 shadow-md">
            <h3 class="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#23272e] pb-2.5">
              <IconRenderer name="Wrench" size="15" class="text-amber-400" />
              <span>Быстрый инструментарий автора</span>
            </h3>

            <div class="space-y-2">
              <button
                type="button"
                @click="isAuthorGalleryOpen = true"
                class="w-full p-3 rounded-xl bg-[#1a1e24] hover:bg-[#222830] border border-[#262a32] hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between gap-2 group"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <IconRenderer name="FolderImage" size="16" />
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover:text-amber-300">Галерея & Маркетплейс</div>
                    <div class="text-[10px] text-dark-muted">Управление картинками блоков</div>
                  </div>
                </div>
                <IconRenderer name="ChevronRight" size="16" class="text-dark-muted group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                @click="emit('go-home')"
                class="w-full p-3 rounded-xl bg-[#1a1e24] hover:bg-[#222830] border border-[#262a32] hover:border-cyan-500/40 text-left transition-all cursor-pointer flex items-center justify-between gap-2 group"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <IconRenderer name="PenTool" size="16" />
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white group-hover:text-cyan-300">Редактор статей</div>
                    <div class="text-[10px] text-dark-muted">Создать или продолжить черновик</div>
                  </div>
                </div>
                <IconRenderer name="ChevronRight" size="16" class="text-dark-muted group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <!-- RECENT ACTIVITY STREAM CARD -->
          <div v-if="analyticsData.recentLogs.length > 0" class="bg-[#121418] border border-[#23272e] p-5 rounded-2xl space-y-3 shadow-md">
            <h3 class="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#23272e] pb-2.5">
              <IconRenderer name="Activity" size="15" class="text-emerald-400" />
              <span>Лента активности читателей</span>
            </h3>

            <div class="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              <div 
                v-for="log in analyticsData.recentLogs.slice(0, 10)" 
                :key="log.id"
                class="p-2.5 rounded-xl bg-[#1a1e24] border border-[#23272e] space-y-1 text-xs"
              >
                <div class="flex items-center justify-between gap-2">
                  <span :class="['text-[9px] font-black px-2 py-0.5 rounded-md uppercase border shrink-0', getEventBadgeClass(log.event_type)]">
                    {{ getEventLabel(log.event_type) }}
                  </span>
                  <span class="text-[10px] text-dark-muted font-mono shrink-0">{{ log.created_at.split('T')[0] }}</span>
                </div>
                <p class="text-[11px] text-slate-300 font-semibold truncate">{{ log.guide_title || 'Просмотр базы знаний' }}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  </div>

  <!-- STANDALONE MODAL OVERLAY MODE -->
  <div v-else-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#141619] border border-cyan-500/40 w-full max-w-4xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden flex flex-col max-h-[90vh]">
      
      <div class="flex items-center justify-between border-b border-[#26292d] pb-4 relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg">
            <IconRenderer name="TrendingUp" size="22" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Личный Кабинет и Аналитика Автора</span>
              <span class="text-xs bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-mono">{{ username }}</span>
            </h3>
            <p class="text-xs text-slate-400 font-medium">Телеметрия просмотров, статистика публикаций и активность по вашим гайдам</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="isAuthorGalleryOpen = true"
            class="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <IconRenderer name="FolderImage" size="15" />
            <span class="hidden sm:inline">Папка текстур & Маркетплейс</span>
          </button>

          <button 
            @click="emit('close')"
            class="p-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-dark-muted hover:text-white border border-[#34383e] transition-colors cursor-pointer"
          >
            <IconRenderer name="X" size="18" />
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="py-16 text-center space-y-3 relative z-10">
        <IconRenderer name="RotateCw" size="32" class="animate-spin text-cyan-400 mx-auto" />
        <div class="text-xs font-bold text-slate-300">Загрузка статистики и телеметрии автора...</div>
      </div>

      <div v-else-if="analyticsData" class="flex-1 overflow-y-auto space-y-6 pr-1 relative z-10 custom-scrollbar">
        <!-- Key Metrics Cards Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-cyan-500/30 shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <IconRenderer name="Eye" size="13" />
              Всего Просмотров
            </div>
            <div class="text-2xl font-black text-white font-mono">{{ analyticsData.totalViews }}</div>
          </div>
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-[#2b2f36] shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <IconRenderer name="FileText" size="13" />
              Всего Статей
            </div>
            <div class="text-2xl font-black text-white font-mono">{{ analyticsData.totalGuides }}</div>
          </div>
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-emerald-500/30 shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <IconRenderer name="CheckCircle2" size="13" />
              Опубликовано
            </div>
            <div class="text-2xl font-black text-emerald-400 font-mono">{{ analyticsData.publishedCount }}</div>
          </div>
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-amber-500/30 shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <IconRenderer name="Clock" size="13" />
              Черновики
            </div>
            <div class="text-2xl font-black text-amber-400 font-mono">{{ analyticsData.draftCount + analyticsData.pendingCount }}</div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="bg-[#181a1e] border border-[#2b2f36] rounded-2xl overflow-hidden shadow-lg divide-y divide-[#26292d]">
            <div 
              v-for="guide in analyticsData.guides" 
              :key="guide.id"
              class="p-3.5 sm:p-4 hover:bg-[#202329] transition-colors flex items-center justify-between gap-3 group"
            >
              <div class="min-w-0 flex-1 space-y-1">
                <h5 class="text-xs sm:text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors truncate">
                  {{ guide.title }}
                </h5>
              </div>
              <button 
                @click="emit('select-guide', guide.id); emit('close');"
                class="p-2 rounded-xl bg-[#22262c] hover:bg-cyan-600 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <IconRenderer name="ArrowRight" size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end pt-3 border-t border-[#26292d] relative z-10">
        <button
          type="button"
          @click="emit('close')"
          class="px-5 py-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-slate-300 hover:text-white border border-[#34383e] text-xs font-bold transition-all cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>

  <!-- AUTHOR GALLERY MODAL -->
  <AuthorGalleryModal
    :is-open="isAuthorGalleryOpen"
    :username="username"
    @close="isAuthorGalleryOpen = false"
  />

  <!-- 3D BLOCK MODEL EDITOR MODAL -->
  <BlockModelEditorModal
    :is-open="isBlockModelEditorOpen"
    :username="username"
    @close="isBlockModelEditorOpen = false"
  />

  <!-- 3D BLOCK MODEL GALLERY MODAL -->
  <BlockModelGalleryModal
    :is-open="isBlockModelGalleryOpen"
    :author-name="username"
    @close="isBlockModelGalleryOpen = false"
  />
</template>
