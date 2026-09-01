<script setup lang="ts">
import { ref, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';

type ThemeMode = 'dark' | 'light' | 'emerald' | 'cyberpunk';

const props = defineProps<{
  isOpen: boolean;
  currentTheme: ThemeMode;
  isAdmin?: boolean;
  guidesCount: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-theme', theme: ThemeMode): void;
  (e: 'clear-drafts'): void;
  (e: 'export-data'): void;
  (e: 'import-data', dataJson: string): void;
}>();

const selectedTab = ref<'appearance' | 'data' | 'system'>('appearance');
const autoExpandToc = ref(true);
const smoothScroll = ref(true);

onMounted(() => {
  const savedToc = localStorage.getItem('cubix_setting_auto_toc');
  if (savedToc !== null) autoExpandToc.value = savedToc === 'true';
  const savedScroll = localStorage.getItem('cubix_setting_smooth_scroll');
  if (savedScroll !== null) smoothScroll.value = savedScroll === 'true';
});

const toggleAutoToc = () => {
  autoExpandToc.value = !autoExpandToc.value;
  localStorage.setItem('cubix_setting_auto_toc', autoExpandToc.value ? 'true' : 'false');
};

const toggleSmoothScroll = () => {
  smoothScroll.value = !smoothScroll.value;
  localStorage.setItem('cubix_setting_smooth_scroll', smoothScroll.value ? 'true' : 'false');
};

const themesList: { id: ThemeMode; name: string; icon: string; color: string; desc: string; previewBg: string }[] = [
  { id: 'dark', name: 'Тёмная (Dark Core)', icon: 'Moon', color: 'text-cyan-400', desc: 'Фирменный тёмный стеклянный стиль', previewBg: 'bg-[#0c0d0e] border-[#26292d]' },
  { id: 'light', name: 'Светлая (Daylight)', icon: 'Sun', color: 'text-amber-400', desc: 'Контрастный дневной белый интерфейс', previewBg: 'bg-slate-100 border-slate-300' },
  { id: 'emerald', name: 'Изумрудная (Emerald)', icon: 'Sparkles', color: 'text-emerald-400', desc: 'Глубокие изумрудные тона', previewBg: 'bg-[#061410] border-[#153e33]' },
  { id: 'cyberpunk', name: 'Киберпанк (Neon)', icon: 'Zap', color: 'text-pink-400', desc: 'Яркие неоновые розовые акценты', previewBg: 'bg-[#120917] border-[#3b184c]' }
];

const fileInput = ref<HTMLInputElement | null>(null);

const triggerImport = () => {
  if (fileInput.value) fileInput.value.click();
};

const handleFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result as string;
    if (content) {
      emit('import-data', content);
    }
  };
  reader.readAsText(file);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Top Header -->
      <div class="flex items-center justify-between pb-4 border-b border-[#26292d]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <IconRenderer name="Settings" size="20" />
          </div>
          <div>
            <h2 class="text-lg font-extrabold text-white tracking-tight">Настройки приложения</h2>
            <p class="text-xs text-dark-muted">Параметры отображения, тем и данных системы</p>
          </div>
        </div>

        <button 
          @click="emit('close')"
          class="w-9 h-9 rounded-xl bg-[#121416] hover:bg-[#212429] border border-[#26292d] text-dark-muted hover:text-white flex items-center justify-center transition-all"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 p-1 bg-[#0c0d0e] border border-[#26292d] rounded-2xl">
        <button
          @click="selectedTab = 'appearance'"
          :class="['flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all', selectedTab === 'appearance' ? 'bg-[#16181a] text-cyan-400 shadow-md border border-[#26292d]' : 'text-dark-muted hover:text-white']"
        >
          <IconRenderer name="Sun" size="14" />
          <span>Оформление</span>
        </button>

        <button
          @click="selectedTab = 'data'"
          :class="['flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all', selectedTab === 'data' ? 'bg-[#16181a] text-emerald-400 shadow-md border border-[#26292d]' : 'text-dark-muted hover:text-white']"
        >
          <IconRenderer name="Database" size="14" />
          <span>Данные и Бэкапы</span>
        </button>
      </div>

      <!-- TAB 1: APPEARANCE -->
      <div v-if="selectedTab === 'appearance'" class="space-y-4">
        <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">Выберите тему оформления:</div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="t in themesList"
            :key="t.id"
            @click="emit('select-theme', t.id)"
            :class="[
              'p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative group',
              currentTheme === t.id ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50' : 'border-[#26292d] bg-[#121416] hover:bg-[#181a1d]'
            ]"
          >
            <div :class="['w-8 h-8 rounded-xl flex items-center justify-center border shrink-0', t.previewBg]">
              <IconRenderer :name="t.icon" size="16" :class="t.color" />
            </div>
            <div>
              <div class="text-xs font-extrabold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                <span>{{ t.name }}</span>
                <span v-if="currentTheme === t.id" class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              </div>
              <p class="text-[11px] text-dark-muted leading-snug mt-0.5">{{ t.desc }}</p>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-[#26292d] space-y-3">
          <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">Интерфейс и навигация:</div>
          
          <div class="flex items-center justify-between p-3 bg-[#121416] border border-[#26292d] rounded-2xl">
            <div>
              <div class="text-xs font-bold text-white">Авто-разворачивание Содержания (TOC)</div>
              <div class="text-[11px] text-dark-muted">Автоматически показывать структуру разделов при открытии статьи</div>
            </div>
            <button
              @click="toggleAutoToc"
              :class="['w-11 h-6 rounded-full transition-colors relative p-0.5 border', autoExpandToc ? 'bg-emerald-600 border-emerald-500' : 'bg-[#26292d] border-[#3b3f46]']"
            >
              <div :class="['w-4 h-4 rounded-full bg-white transition-transform shadow-md', autoExpandToc ? 'translate-x-5' : 'translate-x-0']"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 2: DATA & BACKUPS -->
      <div v-else-if="selectedTab === 'data'" class="space-y-4">
        <div class="p-4 rounded-2xl bg-[#121416] border border-[#26292d] space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IconRenderer name="Download" size="18" />
            </div>
            <div>
              <div class="text-xs font-bold text-white">Экспорт базы гайдов (JSON)</div>
              <div class="text-[11px] text-dark-muted">Скачать полную резервную копию всех {{ guidesCount }} гайдов на ПК</div>
            </div>
          </div>
          <button
            @click="emit('export-data')"
            class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            <IconRenderer name="Download" size="14" />
            <span>Скачать бэкап база данных (.json)</span>
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-[#121416] border border-[#26292d] space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IconRenderer name="Upload" size="18" />
            </div>
            <div>
              <div class="text-xs font-bold text-white">Импорт / Восстановление базы</div>
              <div class="text-[11px] text-dark-muted">Загрузить гайды из ранее сохраненного файла JSON</div>
            </div>
          </div>
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileUpload" />
          <button
            @click="triggerImport"
            class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            <IconRenderer name="Upload" size="14" />
            <span>Загрузить JSON бэкап в систему</span>
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-[#121416] border border-[#26292d] space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <IconRenderer name="Trash2" size="18" />
            </div>
            <div>
              <div class="text-xs font-bold text-white">Очистка локального кэша</div>
              <div class="text-[11px] text-dark-muted">Сбросить сохранённые локальные черновики конструктора</div>
            </div>
          </div>
          <button
            @click="emit('clear-drafts')"
            class="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Очистить черновики браузера</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
