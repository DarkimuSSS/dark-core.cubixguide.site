<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';

defineProps<{
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'go-home'): void;
  (e: 'select-guide', guideId: string): void;
}>();

interface TelemetryStats {
  totalViews: number;
  totalEdits: number;
  totalLogins: number;
  topGuides: Array<{ guide_id: string; guide_title?: string; views: number }>;
  recentLogs: Array<{
    id: number;
    event_type: string;
    guide_id?: string;
    guide_title?: string;
    username?: string;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
  }>;
}

const stats = ref<TelemetryStats | null>(null);
const isLoading = ref(true);
const filterEventType = ref<string>('all');
const logSearchQuery = ref<string>('');

const fetchStats = async () => {
  isLoading.value = true;
  try {
    const res = await fetch('/api/telemetry/stats');
    if (res.ok) {
      stats.value = await res.json();
    }
  } catch (err) {
    console.error('Ошибка загрузки телеметрии:', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchStatsFinally = () => {
  isLoading.value = false;
};

onMounted(() => {
  fetchStats();
});

const filteredLogs = computed(() => {
  if (!stats.value?.recentLogs) return [];
  const items = stats.value.recentLogs.filter(log => {
    const matchesType = filterEventType.value === 'all' || log.event_type === filterEventType.value;
    const q = logSearchQuery.value.toLowerCase().trim();
    const matchesQuery = !q ||
      (log.guide_title || '').toLowerCase().includes(q) ||
      (log.username || '').toLowerCase().includes(q) ||
      (log.ip_address || '').toLowerCase().includes(q) ||
      (log.event_type || '').toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });
  return items.slice(0, 6);
});

const formatEventTypeLabel = (type: string) => {
  switch (type) {
    case 'guide_view': return 'Просмотр';
    case 'guide_create': return 'Создание';
    case 'guide_edit': return 'Правка';
    case 'guide_publish': return 'Публикация';
    case 'guide_delete': return 'Удаление';
    case 'user_login': return 'Авторизация';
    case 'page_view': return 'Заход на сайт';
    default: return type;
  }
};

const getEventTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'guide_view': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    case 'guide_publish': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'guide_create': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'guide_edit': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'guide_delete': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'user_login': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    default: return 'bg-slate-700/30 text-slate-300 border-slate-600/40';
  }
};
</script>

<template>
  <div class="space-y-6 pb-24 animate-in fade-in duration-300">
    <!-- Header Title Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#26292d] pb-5">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-md">
            <IconRenderer name="BarChart2" size="24" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Панель Телеметрии & Аналитики</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">ADMIN</span>
            </h1>
            <p class="text-xs text-dark-muted">Мониторинг активности, популярных гайдов и логов сервера в реальном времени</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="fetchStats"
          :disabled="isLoading"
          class="px-3.5 py-2 rounded-xl bg-[#16181a] hover:bg-[#202327] border border-[#26292d] text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <IconRenderer name="RotateCw" size="14" :class="['text-purple-400', isLoading ? 'animate-spin' : '']" />
          <span>Обновить данные</span>
        </button>

        <button
          @click="emit('go-home')"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>На Главную</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !stats" class="py-20 text-center text-dark-muted space-y-3">
      <div class="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="text-xs font-bold">Сбор метрик аналитики с сервера...</div>
    </div>

    <!-- Main Content -->
    <template v-else-if="stats">
      <!-- Top 5 Metrics Widgets Grid -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <!-- Widget 1: Total Views -->
        <div class="p-4 rounded-3xl bg-gradient-to-br from-[#16181a] to-[#121416] border border-cyan-500/30 shadow-xl space-y-2 relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">Просмотры</span>
            <IconRenderer name="Eye" size="16" class="text-cyan-400" />
          </div>
          <div class="text-2xl font-black text-white tracking-tight">{{ stats.totalViews.toLocaleString() }}</div>
          <div class="text-[10px] text-dark-muted truncate">Чтения статей</div>
        </div>

        <!-- Widget 2: Total Edits -->
        <div class="p-4 rounded-3xl bg-gradient-to-br from-[#16181a] to-[#121416] border border-emerald-500/30 shadow-xl space-y-2 relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Редакции</span>
            <IconRenderer name="Edit3" size="16" class="text-emerald-400" />
          </div>
          <div class="text-2xl font-black text-white tracking-tight">{{ stats.totalEdits.toLocaleString() }}</div>
          <div class="text-[10px] text-dark-muted truncate">Правки авторов</div>
        </div>

        <!-- Widget 3: Total Logins -->
        <div class="p-4 rounded-3xl bg-gradient-to-br from-[#16181a] to-[#121416] border border-purple-500/30 shadow-xl space-y-2 relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">Входы</span>
            <IconRenderer name="UserCheck" size="16" class="text-purple-400" />
          </div>
          <div class="text-2xl font-black text-white tracking-tight">{{ stats.totalLogins.toLocaleString() }}</div>
          <div class="text-[10px] text-dark-muted truncate">Сессии авторов</div>
        </div>

        <!-- Widget 4: Total Searches -->
        <div class="p-4 rounded-3xl bg-gradient-to-br from-[#16181a] to-[#121416] border border-amber-500/30 shadow-xl space-y-2 relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Поиски</span>
            <IconRenderer name="Search" size="16" class="text-amber-400" />
          </div>
          <div class="text-2xl font-black text-white tracking-tight">{{ (stats.totalSearches || 0).toLocaleString() }}</div>
          <div class="text-[10px] text-dark-muted truncate">Запросы в поиске</div>
        </div>

        <!-- Widget 5: Total Bookmarks -->
        <div class="p-4 rounded-3xl bg-gradient-to-br from-[#16181a] to-[#121416] border border-rose-500/30 shadow-xl space-y-2 relative overflow-hidden group col-span-2 md:col-span-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">Закладки</span>
            <IconRenderer name="Star" size="16" class="text-rose-400" />
          </div>
          <div class="text-2xl font-black text-white tracking-tight">{{ (stats.totalBookmarks || 0).toLocaleString() }}</div>
          <div class="text-[10px] text-dark-muted truncate">Сохранения в ⭐</div>
        </div>
      </div>

      <!-- Main Layout: Top Popular Guides & Live Activity Log -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <!-- Left: Top Popular Guides Card -->
        <div class="lg:col-span-1 p-6 rounded-3xl bg-[#16181a] border border-[#26292d] shadow-xl space-y-4">
          <div class="flex items-center justify-between border-b border-[#26292d] pb-3">
            <div class="flex items-center gap-2.5">
              <IconRenderer name="Award" size="20" class="text-amber-400" />
              <h3 class="text-sm font-extrabold text-white">Топ Популярных Гайдов</h3>
            </div>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">ПО ПРОСМОТРАМ</span>
          </div>

          <div v-if="stats.topGuides.length === 0" class="text-xs text-dark-muted py-8 text-center">
            Данные о просмотрах пока не записаны
          </div>

          <div v-else class="space-y-2.5">
            <div
              v-for="(g, idx) in stats.topGuides"
              :key="g.guide_id"
              @click="emit('select-guide', g.guide_id)"
              class="p-3 rounded-2xl bg-[#0c0d0e] hover:bg-[#121417] border border-[#26292d] hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-sm"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div :class="[
                  'w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border shadow-md',
                  idx === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                  idx === 1 ? 'bg-slate-300/20 text-slate-200 border-slate-300/50' :
                  idx === 2 ? 'bg-amber-700/20 text-amber-500 border-amber-700/50' :
                  'bg-slate-800/40 text-slate-400 border-slate-700/40'
                ]">
                  #{{ idx + 1 }}
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                    {{ g.guide_title || g.guide_id }}
                  </div>
                  <div class="text-[10px] text-dark-muted truncate">ID: {{ g.guide_id }}</div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-xs font-black text-emerald-400">{{ g.views }}</div>
                <div class="text-[9px] text-dark-muted">просмотров</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Realtime Log Stream Table -->
        <div class="lg:col-span-2 p-6 rounded-3xl bg-[#16181a] border border-[#26292d] shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#26292d] pb-3">
            <div class="flex items-center gap-2.5">
              <IconRenderer name="Activity" size="20" class="text-cyan-400" />
              <h3 class="text-sm font-extrabold text-white">Журнал Событий & Действий (6 последних)</h3>
            </div>

            <!-- Event Filters & Search -->
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <div class="relative flex-1 sm:w-48">
                <input
                  type="text"
                  v-model="logSearchQuery"
                  placeholder="Фильтр по нику/IP/title..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-xl pl-7 pr-3 py-1.5 focus:outline-none focus:border-purple-500/60"
                />
                <IconRenderer name="Search" size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
              </div>

              <select
                v-model="filterEventType"
                class="bg-[#0c0d0e] border border-[#26292d] text-white text-[11px] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500/60"
              >
                <option value="all">Все типы</option>
                <option value="guide_view">Просмотры</option>
                <option value="guide_create">Создание</option>
                <option value="guide_edit">Правки</option>
                <option value="guide_publish">Публикации</option>
                <option value="user_login">Авторизации</option>
              </select>
            </div>
          </div>

          <!-- Logs Table (Fixed max height with clean scrollbar) -->
          <div class="max-h-[480px] overflow-y-auto custom-scrollbar">
            <table class="w-full text-left text-[11px]">
              <thead>
                <tr class="text-dark-muted uppercase border-b border-[#26292d] text-[9.5px]">
                  <th class="py-2 px-3">Тип</th>
                  <th class="py-2 px-3">Объект / Событие</th>
                  <th class="py-2 px-3">Пользователь</th>
                  <th class="py-2 px-3">IP / Клиент</th>
                  <th class="py-2 px-3 text-right">Время</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#26292d]">
                <tr v-if="filteredLogs.length === 0">
                  <td colspan="5" class="py-8 text-center text-dark-muted">
                    События по выбранному фильтру не найдены
                  </td>
                </tr>
                <tr
                  v-for="log in filteredLogs"
                  :key="log.id"
                  class="hover:bg-[#1c1f22] transition-colors"
                >
                  <td class="py-2.5 px-3 whitespace-nowrap">
                    <span :class="['px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border', getEventTypeBadgeClass(log.event_type)]">
                      {{ formatEventTypeLabel(log.event_type) }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 font-semibold text-white max-w-[200px] truncate">
                    {{ log.guide_title || log.guide_id || '—' }}
                  </td>
                  <td class="py-2.5 px-3 text-slate-300 font-medium whitespace-nowrap">
                    {{ log.username || 'Гость' }}
                  </td>
                  <td class="py-2.5 px-3 text-dark-muted font-mono text-[10px] whitespace-nowrap">
                    {{ log.ip_address || '—' }}
                  </td>
                  <td class="py-2.5 px-3 text-dark-muted text-right whitespace-nowrap font-mono text-[10px]">
                    {{ new Date(log.created_at).toLocaleString() }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>
