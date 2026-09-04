<script setup lang="ts">
import { ref, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';

const props = defineProps<{
  isOpen: boolean;
  username: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-guide', guideId: string): void;
}>();

const isLoading = ref(true);
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
    const res = await fetch(`/api/author/analytics?username=${encodeURIComponent(props.username)}`);
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

const getEventLabel = (type: string) => {
  switch (type) {
    case 'guide_view': return 'Просмотр';
    case 'guide_edit': return 'Редактирование';
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
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
    <div class="bg-[#141619] border border-cyan-500/40 w-full max-w-4xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden flex flex-col max-h-[90vh]">
      
      <!-- Ambient Glows -->
      <div class="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
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

        <button 
          @click="emit('close')"
          class="p-2 rounded-xl bg-[#1c1f24] hover:bg-[#262a30] text-dark-muted hover:text-white border border-[#34383e] transition-colors cursor-pointer"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Content Area -->
      <div v-if="isLoading" class="py-16 text-center space-y-3 relative z-10">
        <IconRenderer name="RotateCw" size="32" class="animate-spin text-cyan-400 mx-auto" />
        <div class="text-xs font-bold text-slate-300">Загрузка статистики и телеметрии автора...</div>
      </div>

      <div v-else-if="analyticsData" class="flex-1 overflow-y-auto space-y-6 pr-1 relative z-10 custom-scrollbar">
        
        <!-- Key Metrics Cards Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <!-- Total Views -->
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-cyan-500/30 shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <IconRenderer name="Eye" size="13" />
              Всего Просмотров
            </div>
            <div class="text-2xl font-black text-white font-mono">{{ analyticsData.totalViews }}</div>
            <div class="text-[10px] text-dark-muted">по всем вашим гайдам</div>
          </div>

          <!-- Total Guides -->
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-[#2b2f36] shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <IconRenderer name="FileText" size="13" />
              Всего Статей
            </div>
            <div class="text-2xl font-black text-white font-mono">{{ analyticsData.totalGuides }}</div>
            <div class="text-[10px] text-dark-muted">создано автором</div>
          </div>

          <!-- Published Count -->
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-emerald-500/30 shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <IconRenderer name="CheckCircle2" size="13" />
              Опубликовано
            </div>
            <div class="text-2xl font-black text-emerald-400 font-mono">{{ analyticsData.publishedCount }}</div>
            <div class="text-[10px] text-dark-muted">активны в каталоге</div>
          </div>

          <!-- Pending & Drafts Count -->
          <div class="p-4 rounded-2xl bg-[#181a1e] border border-amber-500/30 shadow-md space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <IconRenderer name="Clock" size="13" />
              Черновики / В работе
            </div>
            <div class="text-2xl font-black text-amber-400 font-mono">{{ analyticsData.draftCount + analyticsData.pendingCount }}</div>
            <div class="text-[10px] text-dark-muted">требуют публикации</div>
          </div>
        </div>

        <!-- Table: Individual Guides Telemetry Breakdown -->
        <div class="space-y-3">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <IconRenderer name="BarChart3" size="15" class="text-cyan-400" />
            <span>Рейтинг просмотров ваших гайдов</span>
          </h4>

          <div class="bg-[#181a1e] border border-[#2b2f36] rounded-2xl overflow-hidden shadow-lg">
            <div v-if="analyticsData.guides.length === 0" class="p-6 text-center text-xs text-dark-muted">
              У вас пока нет созданных статей для отображения аналитики
            </div>

            <div v-else class="divide-y divide-[#26292d]">
              <div 
                v-for="guide in analyticsData.guides" 
                :key="guide.id"
                class="p-3.5 sm:p-4 hover:bg-[#202329] transition-colors flex items-center justify-between gap-3 group"
              >
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span 
                      :class="[
                        'text-[9px] font-black px-2 py-0.5 rounded-full uppercase border',
                        guide.published && guide.isVisible ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                        guide.status === 'pending_moderation' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
                        'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      ]"
                    >
                      {{ guide.published && guide.isVisible ? 'Опубликован' : (guide.status === 'pending_moderation' ? 'На модерации' : 'Черновик') }}
                    </span>
                    <span v-if="guide.server" class="text-[10px] font-semibold text-emerald-400 font-mono">{{ guide.server }}</span>
                    <span class="text-[10px] text-dark-muted font-medium">• {{ guide.category }}</span>
                  </div>

                  <h5 class="text-xs sm:text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {{ guide.title }}
                  </h5>
                </div>

                <div class="flex items-center gap-4 shrink-0">
                  <div class="text-right">
                    <div class="text-xs sm:text-sm font-black text-cyan-400 font-mono flex items-center justify-end gap-1">
                      <IconRenderer name="Eye" size="13" />
                      <span>{{ guide.views }}</span>
                    </div>
                    <div class="text-[9.5px] text-dark-muted">просмотров</div>
                  </div>

                  <button 
                    @click="emit('select-guide', guide.id); emit('close');"
                    class="p-2 rounded-xl bg-[#22262c] hover:bg-cyan-600 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
                    title="Открыть гайд"
                  >
                    <IconRenderer name="ArrowRight" size="15" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Log Activity Stream -->
        <div v-if="analyticsData.recentLogs.length > 0" class="space-y-3">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <IconRenderer name="Activity" size="15" class="text-emerald-400" />
            <span>Лента недавней активности читателей</span>
          </h4>

          <div class="bg-[#181a1e] border border-[#2b2f36] rounded-2xl p-4 space-y-2 shadow-lg">
            <div 
              v-for="log in analyticsData.recentLogs.slice(0, 8)" 
              :key="log.id"
              class="flex items-center justify-between text-xs py-1.5 border-b border-[#26292d]/50 last:border-none"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span :class="['text-[9px] font-black px-2 py-0.5 rounded-md uppercase border shrink-0', getEventBadgeClass(log.event_type)]">
                  {{ getEventLabel(log.event_type) }}
                </span>
                <span class="text-slate-300 truncate font-medium">{{ log.guide_title || 'Просмотр страницы' }}</span>
              </div>
              <span class="text-[10px] text-dark-muted font-mono shrink-0 ml-2">{{ log.created_at.split('T')[0] }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
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
</template>
