<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';
import { GENERAL_RULES_DATA, RULE_CATEGORIES, type GeneralRuleItem } from '../data/generalRulesData';

const props = withDefaults(defineProps<{ 
  isOpen: boolean;
  embedded?: boolean;
  initialTab?: 'general' | 'server';
  initialServer?: string;
}>(), {
  initialTab: 'general',
  initialServer: 'OneBlock'
});

const emit = defineEmits<{ 
  (e: 'close'): void;
  (e: 'update-tab', tab: 'general' | 'server'): void;
  (e: 'update-server', server: string): void;
}>();

// Tab selection: 'general' (Общие правила проекта) | 'server' (Внутриигровые правила серверов)
const activeTab = ref<'general' | 'server'>(props.initialTab);
const selectedServer = ref<string>(props.initialServer);

watch(() => props.initialTab, (newTab) => {
  if (newTab) activeTab.value = newTab;
});

watch(() => props.initialServer, (newServer) => {
  if (newServer) selectedServer.value = newServer;
});

watch(activeTab, (newTab) => {
  emit('update-tab', newTab);
});

watch(selectedServer, (newServer) => {
  emit('update-server', newServer);
});

const searchQuery = ref('');
const activeCategory = ref<string>('all');
const categories = RULE_CATEGORIES;

const availableServers = ref<Array<{ id: string; name: string }>>([
  { id: 'OneBlock', name: 'OneBlock' },
  { id: 'HiTech', name: 'HiTech' },
  { id: 'MagicRPG', name: 'MagicRPG' },
  { id: 'SkyBlock', name: 'SkyBlock' },
  { id: 'TechnoMagic', name: 'TechnoMagic' }
]);

const generalRules: GeneralRuleItem[] = GENERAL_RULES_DATA;


import { ONEBLOCK_RULES_DATA } from '../data/serverRulesData';
import { CREATE_1211_RULES_DATA } from '../data/createRulesData';
import { GALAXY_RULES_DATA } from '../data/galaxyRulesData';
import { GREGTECH_RULES_DATA } from '../data/gregtechRulesData';
import { HITECH_RULES_DATA } from '../data/hitechRulesData';
import { ICEANDFIRE_RULES_DATA } from '../data/iceandfireRulesData';
import { INDUSTRIAL_RULES_DATA } from '../data/industrialRulesData';
import { MAGICRPG_RULES_DATA } from '../data/magicrpgRulesData';
import { SKYTECH_RULES_DATA } from '../data/skytechRulesData';
import { TECHNOMAGIC_RULES_DATA } from '../data/technomagicRulesData';
import { PIXELMON_1211_RULES_DATA } from '../data/pixelmon1211RulesData';
import { PIXELMON_1165_RULES_DATA } from '../data/pixelmon1165RulesData';
import { OCEANBLOCK_1165_RULES_DATA } from '../data/oceanblock1165RulesData';
import { COBBLEMON_1211_RULES_DATA } from '../data/cobblemon1211RulesData';
import { watch, onMounted } from 'vue';

const LOCAL_RULES_MAP: Record<string, any> = {
  'OneBlock': ONEBLOCK_RULES_DATA,
  'Create_1211': CREATE_1211_RULES_DATA,
  'Create': CREATE_1211_RULES_DATA,
  'Galaxy': GALAXY_RULES_DATA,
  'GregTech': GREGTECH_RULES_DATA,
  'HiTech': HITECH_RULES_DATA,
  'IceAndFire_1165': ICEANDFIRE_RULES_DATA,
  'IceAndFire': ICEANDFIRE_RULES_DATA,
  'Industrial': INDUSTRIAL_RULES_DATA,
  'MagicRPG': MAGICRPG_RULES_DATA,
  'SkyTech': SKYTECH_RULES_DATA,
  'TechnoMagic': TECHNOMAGIC_RULES_DATA,
  'Pixelmon_1211': PIXELMON_1211_RULES_DATA,
  'Pixelmon_1165': PIXELMON_1165_RULES_DATA,
  'OceanBlock_1165': OCEANBLOCK_1165_RULES_DATA,
  'Cobblemon_1211': COBBLEMON_1211_RULES_DATA
};

const activeSectionId = ref<number | 'all'>('all');
const loadedServerRules = ref<Record<string, any>>({});

const fetchServerRulesFromApi = async (serverId: string) => {
  try {
    const res = await fetch(`/api/server-rules/${serverId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.server_id) {
        loadedServerRules.value[serverId] = data;
        const cleanId = getBaseServerId(serverId);
        loadedServerRules.value[cleanId] = data;
      }
    }
  } catch (e) {
    console.warn(`Не удалось загрузить правила для ${serverId} с API, используем локальный фоллбек`);
  }
};

const isServerPickerOpen = ref(false);

const fetchServerListFromApi = async () => {
  try {
    const res = await fetch('/api/servers');
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        // Исключаем мобильные сервера (Mobile), так как их правила совпадают со старшими братьями
        const desktopServers = list
          .filter((s: string) => !s.toLowerCase().includes('mobile'))
          .map((s: string) => ({ id: s, name: s }));
        
        if (desktopServers.length > 0) {
          availableServers.value = desktopServers;
        }
      }
    }
  } catch (e) {
    console.warn('Не удалось загрузить живой список серверов с /api/servers');
  }
};

// Хелпер получения оригинального сервер ID (убирает -Mobile / _Mobile при вызове правил)
const getBaseServerId = (serverId: string) => {
  return serverId.replace(/[-_]mobile$/i, '');
};

watch(selectedServer, (newServer) => {
  if (newServer) {
    fetchServerRulesFromApi(newServer);
  }
}, { immediate: true });

onMounted(() => {
  fetchServerListFromApi();
  fetchServerRulesFromApi(selectedServer.value);
});

const currentServerData = computed(() => {
  const currentId = selectedServer.value;
  const cleanId = getBaseServerId(currentId);

  // 1. Сначала проверяем динамически загруженные с API правила
  if (loadedServerRules.value[currentId]) return loadedServerRules.value[currentId];
  if (loadedServerRules.value[cleanId]) return loadedServerRules.value[cleanId];

  // 2. Мгновенный локальный фоллбек (гарантирует показ всех правил 100% серверов!)
  if (LOCAL_RULES_MAP[currentId]) return LOCAL_RULES_MAP[currentId];
  if (LOCAL_RULES_MAP[cleanId]) return LOCAL_RULES_MAP[cleanId];

  return ONEBLOCK_RULES_DATA;
});

const filteredGeneralRules = computed(() => {
  return generalRules.filter(r => {
    const matchesCat = activeCategory.value === 'all' || r.cat === activeCategory.value;
    const q = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !q || r.num.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.text.toLowerCase().includes(q) || (r.penalty || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });
});

const filteredServerSections = computed(() => {
  if (!currentServerData.value) return [];
  const q = searchQuery.value.toLowerCase().trim();

  return currentServerData.value.sections.map((sec: any) => {
    if (activeSectionId.value !== 'all' && sec.section_id !== activeSectionId.value) {
      return { ...sec, rules: [] };
    }
    const matchingRules = (sec.rules || []).filter((r: any) => {
      if (!q) return true;
      return (r.rule_id || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q) ||
        (r.punishment || '').toLowerCase().includes(q);
    });
    return { ...sec, rules: matchingRules };
  }).filter((sec: any) => sec.rules.length > 0);
});

const isParsingLoading = ref(false);
const customParseUrl = ref('');
const showParseInput = ref(false);

const handleAutoParseRules = async () => {
  const urlToParse = customParseUrl.value.trim() || 'https://cubixworld.net/forum/topic/35287-vnutriigrovihe-pravila-servera';
  isParsingLoading.value = true;
  try {
    const res = await fetch('/api/admin/parse-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forumUrl: urlToParse,
        serverId: selectedServer.value,
        serverName: selectedServer.value
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const textResponse = await res.text();
      console.error('[ParseRules API Non-JSON response]:', textResponse);
      throw new Error(`Сервер вернул HTML вместо JSON. Убедитесь, что бэкенд запущен и перезапущен через pm2! (${res.status} ${res.statusText})`);
    }

    const data = await res.json();
    if (res.ok && data.data) {
      loadedServerRules.value[selectedServer.value] = data.data;
      showParseInput.value = false;
      alert(`Успешно! Правила сервера ${selectedServer.value} обновлены прямо с форума.`);
    } else {
      alert(data.error || 'Ошибка при автоматическом парсинге');
    }
  } catch (e: any) {
    alert(`Ошибка парсинга: ${e.message}`);
  } finally {
    isParsingLoading.value = false;
  }
};
</script>

<template>
  <Teleport to="body" :disabled="embedded">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        :class="embedded ? 'w-full' : 'fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto custom-scrollbar'"
        @click.self="!embedded && emit('close')"
      >
        <!-- Backdrop (only if modal mode) with deep blur -->
        <div v-if="!embedded" class="fixed inset-0 bg-black/80 backdrop-blur-xl transition-all duration-300"></div>

        <!-- Main Modal Container -->
        <div :class="[
          'relative w-full bg-[#121417]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300',
          embedded ? 'min-h-[85vh]' : 'max-w-5xl max-h-[92vh]'
        ]">
          
          <!-- Top Accent Light Flare -->
          <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-24 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 blur-3xl pointer-events-none"></div>

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4.5 border-b border-white/10 shrink-0 bg-[#0e1012]/80 backdrop-blur-md relative z-10">
            <div class="flex items-center gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-500/20 border border-white/20 transform hover:scale-105 transition-transform duration-300">
                <IconRenderer name="Shield" size="22" />
              </div>
              <div>
                <h2 class="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight">
                  Правила CubixWorld
                  <span class="text-[10px] uppercase tracking-wider bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Свод правил
                  </span>
                </h2>
                <p class="text-xs text-slate-400 font-medium">Официальный регламент проекта и особенности локальных серверов</p>
              </div>
            </div>

            <button
              type="button"
              @click="emit('close')"
              class="w-9 h-9 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95"
              title="Закрыть"
            >
              <IconRenderer name="X" size="18" />
            </button>
          </div>

          <!-- MAIN TAB SWITCHER BAR: General Rules vs Server In-game Rules -->
          <div class="px-6 py-3 border-b border-white/5 bg-[#16181c]/90 shrink-0 flex items-center justify-between gap-4 flex-wrap relative z-10">
            <div class="flex items-center gap-1.5 bg-[#0a0b0d]/90 p-1.5 rounded-2xl border border-white/10 shadow-inner">
              <button
                type="button"
                @click="activeTab = 'general'"
                :class="[
                  'px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer relative overflow-hidden',
                  activeTab === 'general'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                ]"
              >
                <IconRenderer name="BookOpen" size="15" />
                <span>Общие правила проекта</span>
              </button>

              <button
                type="button"
                @click="activeTab = 'server'"
                :class="[
                  'px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer relative overflow-hidden',
                  activeTab === 'server'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/40 border border-cyan-400/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                ]"
              >
                <IconRenderer name="Gamepad2" size="15" />
                <span>Правила серверов (Внутриигровые)</span>
              </button>
            </div>

            <!-- Server selector dropdown when Server tab active -->
            <div v-if="activeTab === 'server'" class="flex items-center gap-2 relative">
              <span class="text-xs font-bold text-slate-400">Сервер:</span>
              <div class="relative">
                <button
                  type="button"
                  @click="isServerPickerOpen = !isServerPickerOpen"
                  class="bg-[#0a0b0d] border border-cyan-500/40 text-cyan-300 font-extrabold text-xs rounded-xl px-3.5 py-2 focus:outline-none cursor-pointer flex items-center gap-2.5 hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-950/50"
                >
                  <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>{{ availableServers.find(s => s.id === selectedServer)?.name || selectedServer }}</span>
                  <IconRenderer name="ChevronDown" size="14" :class="['transition-transform duration-200', isServerPickerOpen ? 'rotate-180' : '']" />
                </button>

                <!-- 3-Column Dropdown Menu -->
                <div
                  v-if="isServerPickerOpen"
                  class="absolute top-full right-0 mt-2 w-[480px] max-w-[90vw] bg-[#0e1012]/95 border border-white/10 rounded-2xl shadow-2xl p-3 z-50 space-y-2 backdrop-blur-2xl ring-1 ring-cyan-500/20"
                >
                  <div class="text-[10px] font-black text-cyan-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>Выберите игровой сервер:</span>
                    <span class="text-slate-500 font-normal">Всего: {{ availableServers.length }}</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <button
                      v-for="srv in availableServers"
                      :key="srv.id"
                      type="button"
                      @click="selectedServer = srv.id; isServerPickerOpen = false"
                      :class="[
                        'px-3 py-2 rounded-xl text-xs font-bold text-left transition-all truncate border flex items-center gap-2',
                        selectedServer === srv.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-black shadow-md shadow-cyan-950/40'
                          : 'bg-[#16181c] border-white/5 text-slate-300 hover:text-white hover:border-white/15 hover:bg-white/5'
                      ]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="selectedServer === srv.id ? 'bg-cyan-400' : 'bg-slate-600'"></span>
                      <span class="truncate">{{ srv.name }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Controls Bar: Categories & Search -->
          <div class="px-6 py-3.5 border-b border-white/5 bg-[#0a0b0d]/60 shrink-0 space-y-3 relative z-10">
            <!-- Search input with clear button -->
            <div class="relative">
              <input
                type="text"
                v-model="searchQuery"
                :placeholder="activeTab === 'general' ? 'Поиск по номеру правила, тексту или наказанию (например: 1.11, читы, раздача)...' : `Поиск по внутриигровым правилам ${selectedServer} (варпы, макросы, лимиты)...`"
                class="w-full bg-[#16181c] border border-white/10 text-white text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500"
              />
              <IconRenderer name="Search" size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <IconRenderer name="X" size="14" />
              </button>
            </div>

            <!-- Category Pills (Only for General Rules tab) -->
            <div v-if="activeTab === 'general'" class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                @click="activeCategory = cat.id"
                :class="[
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 border cursor-pointer',
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-md shadow-emerald-950/50 scale-[1.03]'
                    : 'bg-[#16181c] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15'
                ]"
              >
                <IconRenderer :name="cat.icon" size="13" />
                <span>{{ cat.title }}</span>
              </button>
            </div>

            <!-- Server Info Note (For Server tab) -->
            <div v-else class="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-200">
              <div class="flex items-center gap-2.5">
                <IconRenderer name="Info" size="16" class="text-cyan-400 shrink-0" />
                <span>Показаны локальные внутриигровые правила и лимиты для сервера <strong>{{ selectedServer }}</strong>.</span>
              </div>
              <a
                href="https://cubixworld.net/forum/topic/35287-vnutriigrovihe-pravila-servera"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] font-extrabold text-cyan-300 hover:text-cyan-100 transition-colors flex items-center gap-1 shrink-0 bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/40"
              >
                <span>Тема на форуме</span>
                <IconRenderer name="ExternalLink" size="12" />
              </a>
            </div>
          </div>

          <!-- Scrollable Rules list -->
          <div class="overflow-y-auto custom-scrollbar px-6 py-5 space-y-4 flex-1 bg-[#0b0c0e]">
            
            <!-- GENERAL RULES LIST -->
            <template v-if="activeTab === 'general'">
              <div v-if="filteredGeneralRules.length === 0" class="text-center py-16 space-y-3">
                <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <IconRenderer name="Search" size="24" />
                </div>
                <p class="text-sm font-bold text-slate-300">Правила по запросу не найдены</p>
                <p class="text-xs text-slate-500">Попробуйте изменить поисковый запрос или сбросить категории</p>
              </div>

              <div
                v-for="r in filteredGeneralRules"
                :key="r.num"
                class="p-4 sm:p-5 rounded-2xl bg-[#14161a] border border-white/5 hover:border-emerald-500/30 transition-all duration-200 space-y-2.5 group hover:shadow-[0_4px_20px_rgba(16,185,129,0.05)]"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-black flex items-center justify-center shrink-0 shadow-inner">
                      {{ r.num }}
                    </span>
                    <h3 class="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{{ r.title }}</h3>
                  </div>
                </div>

                <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed pl-11">
                  {{ r.text }}
                </p>

                <!-- Penalty Box Badge -->
                <div v-if="r.penalty" class="ml-11 mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs font-medium flex items-center gap-2.5 shadow-sm">
                  <IconRenderer name="AlertTriangle" size="15" class="text-rose-400 shrink-0" />
                  <span><strong class="font-extrabold text-rose-300">Наказание:</strong> {{ r.penalty }}</span>
                </div>
              </div>
            </template>

            <!-- SERVER RULES SECTIONED LIST (OneBlock / HiTech) -->
            <template v-else-if="activeTab === 'server'">
              <div v-if="filteredServerSections.length === 0" class="text-center py-16 space-y-3">
                <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <IconRenderer name="Search" size="24" />
                </div>
                <p class="text-sm font-bold text-slate-300">Правила сервера не найдены</p>
                <p class="text-xs text-slate-500">Попробуйте изменить поисковый запрос или выбрать другой сервер</p>
              </div>

              <div
                v-for="sec in filteredServerSections"
                :key="sec.section_id"
                class="space-y-3"
              >
                <!-- Section Header Badge -->
                <div class="flex items-center gap-2.5 pt-3 pb-1.5 border-b border-white/10">
                  <div class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black text-xs flex items-center justify-center">
                    {{ sec.section_id }}
                  </div>
                  <h3 class="text-sm font-black text-white tracking-wide uppercase">{{ sec.title }}</h3>
                  <span class="text-[11px] text-slate-400 font-bold">({{ sec.rules.length }} правил)</span>
                </div>

                <!-- Rules in Section -->
                <div
                  v-for="r in sec.rules"
                  :key="r.rule_id"
                  class="p-4 sm:p-5 rounded-2xl bg-[#14161a] border border-white/5 hover:border-cyan-500/40 transition-all duration-200 space-y-2.5 group hover:shadow-[0_4px_20px_rgba(6,182,212,0.05)]"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <span class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-black flex items-center justify-center shrink-0">
                        {{ r.rule_id }}
                      </span>
                      <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Пункт {{ r.rule_id }}</h4>
                    </div>
                  </div>

                  <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed pl-11 font-normal">
                    {{ r.description }}
                  </p>

                  <!-- Note Box if exists -->
                  <div v-if="r.note" class="ml-11 mt-2.5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-200 text-xs font-medium space-y-1">
                    <div class="font-extrabold text-[10px] text-cyan-400 uppercase tracking-wider">Примечание:</div>
                    <div class="leading-relaxed">{{ r.note }}</div>
                  </div>

                  <!-- Penalty Box -->
                  <div v-if="r.punishment" class="ml-11 mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs font-medium flex items-center gap-2.5">
                    <IconRenderer name="AlertTriangle" size="15" class="text-rose-400 shrink-0" />
                    <span><strong class="font-extrabold text-rose-300">Наказание:</strong> {{ r.punishment }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-white/10 bg-[#0e1012] shrink-0 flex items-center justify-between gap-4">
            <span class="text-xs text-slate-400 font-medium">
              Показано записей: <strong class="text-emerald-400 font-black">{{ activeTab === 'general' ? filteredGeneralRules.length : filteredServerSections.reduce((acc, s) => acc + s.rules.length, 0) }}</strong>
            </span>
            <button
              type="button"
              @click="emit('close')"
              class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl transition-all duration-200 shadow-lg shadow-emerald-950/60 active:scale-95 cursor-pointer border border-emerald-400/30"
            >
              Закрыть правила
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.25 ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>

