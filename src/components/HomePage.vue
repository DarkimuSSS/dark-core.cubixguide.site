<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';
import SiteFooter from './SiteFooter.vue';
import type { Guide, Category } from '../types/guide';

const props = defineProps<{
  guides: Guide[];
  initialSearchQuery?: string;
  isAdmin?: boolean;
  canEditOthers?: boolean;
  currentUsername?: string;
}>();

const emit = defineEmits<{
  (e: 'select-guide', guideId: string): void;
  (e: 'create-guide'): void;
  (e: 'open-author', username: string): void;
  (e: 'delete-guide', guideId: string): void;
}>();

const DEFAULT_SERVERS = [
  "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
  "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", "UltraSky", 
  "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
  "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", "TechnomagicTest", 
  "SkyTech", "MagicalTech"
];

const searchQuery = ref(props.initialSearchQuery || '');

watch(() => props.initialSearchQuery, (newVal) => {
  if (newVal !== undefined) {
    searchQuery.value = newVal;
    currentPage.value = 1;
  }
});
const PAGE_SIZE = 12;
const currentPage = ref(1);
const selectedCategory = ref<string>('Все');
const selectedServer = ref<string>('Все');
const isServerDropdownOpen = ref<boolean>(false);
const serverSearchQuery = ref('');

const serverList = ref<string[]>([...DEFAULT_SERVERS]);
const isLiveApiConnected = ref<boolean>(true);
const authorProfilesMap = ref<Record<string, { avatarUrl?: string; isVerified?: boolean }>>({});

const categoriesList = [
  { name: 'Все', icon: 'Grid', color: 'text-emerald-400' },
  { name: 'ХайТек', icon: 'Zap', color: 'text-cyan-400' },
  { name: 'Магия RPG', icon: 'Sparkles', color: 'text-purple-400' },
  { name: 'СкайБлок', icon: 'Box', color: 'text-amber-400' },
  { name: 'Автоматизация', icon: 'Layers', color: 'text-emerald-400' },
  { name: 'Общий', icon: 'BookOpen', color: 'text-slate-400' }
];

const fetchAuthorProfiles = async () => {
  const authors = Array.from(new Set(props.guides.map(g => g.meta.author).filter(Boolean)));
  for (const author of authors) {
    if (authorProfilesMap.value[author.toLowerCase()]) continue;
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(author)}`);
      if (res.ok) {
        const data = await res.json();
        authorProfilesMap.value[author.toLowerCase()] = {
          avatarUrl: data.avatarUrl,
          isVerified: Boolean(data.isVerified)
        };
      }
    } catch (e) {}
  }
};

onMounted(async () => {
  fetchAuthorProfiles();
  try {
    const res = await fetch('/api/servers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        serverList.value = data;
        isLiveApiConnected.value = true;
      }
    }
  } catch (err) {
    console.error('Error fetching live CubixWorld servers:', err);
  }
});

watch(() => props.guides, () => {
  fetchAuthorProfiles();
}, { deep: true });

const filteredServers = computed(() => {
  const q = serverSearchQuery.value.toLowerCase().trim();
  if (!q) return serverList.value;
  return serverList.value.filter(s => s.toLowerCase().includes(q));
});

const filteredGuides = computed(() => {
  const safeGuides = props.guides || [];
  return safeGuides.filter(guide => {
    // Проверка видимости: гайд виден обычным пользователям только если isVisible === true и published === true
    const isOwner = props.currentUsername && guide.meta.author.toLowerCase() === props.currentUsername.toLowerCase();
    const isCoAuthor = props.currentUsername && (guide.meta.coAuthors || []).some(ca => ca.toLowerCase() === props.currentUsername?.toLowerCase());
    const canSeePrivate = props.isAdmin || props.canEditOthers || isOwner || isCoAuthor;

    // Если гайд не виден для публики и пользователь не владелец/админ — скрываем его из каталога
    if (!guide.meta.isVisible && !canSeePrivate) {
      return false;
    }

    const matchesCategory = selectedCategory.value === 'Все' || guide.meta.category === selectedCategory.value;
    const matchesServer = selectedServer.value === 'Все' || guide.meta.server === selectedServer.value;
    const q = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !q || 
      guide.meta.title.toLowerCase().includes(q) || 
      guide.meta.author.toLowerCase().includes(q) ||
      (guide.meta.server && guide.meta.server.toLowerCase().includes(q)) ||
      (guide.meta.summary && guide.meta.summary.toLowerCase().includes(q));
    
    return matchesCategory && matchesServer && matchesSearch;
  });
});

const totalPages = computed(() => Math.ceil(filteredGuides.value.length / PAGE_SIZE));

const paginatedGuides = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredGuides.value.slice(start, start + PAGE_SIZE);
});

// Reset to page 1 when filters change
watch([searchQuery, selectedCategory, selectedServer], () => {
  currentPage.value = 1;
});

const getServerIcon = (serverName: string) => {
  const name = serverName.toLowerCase();
  if (name.includes('hitech') || name.includes('industrial') || name.includes('gregtech')) return 'Zap';
  if (name.includes('magic') || name.includes('iceandfire')) return 'Sparkles';
  if (name.includes('sky') || name.includes('oneblock') || name.includes('ocean')) return 'Box';
  if (name.includes('create')) return 'Layers';
  if (name.includes('pixelmon') || name.includes('cobblemon')) return 'Grid';
  return 'Box';
};

const getCategoryColor = (cat: Category) => {
  switch (cat) {
    case 'ХайТек':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    case 'Магия RPG':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'СкайБлок':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'Автоматизация':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'Общий':
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  }
};

const getDifficultyBadge = (diff: string) => {
  switch (diff) {
    case 'Новичок':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'Опытный':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'Мастер':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};
</script>

<template>
  <div class="space-y-10 pb-24">
    <!-- HERO BANNER SECTION -->
    <section class="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#16181a] via-[#121416] to-[#0c0d0e] border border-[#26292d] p-6 sm:p-10 shadow-2xl">
      <!-- Glow Decor Circles -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="text-center space-y-6 relative z-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-inner">
          <IconRenderer name="Sparkles" size="14" class="animate-pulse" />
          <span>Официальный Портал Руководств CubixWorld</span>
        </div>

        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          База Знаний и Гайдов <br />
          <span class="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Интерактивные Игровые Схемы
          </span>
        </h1>

        <p class="text-sm sm:text-base text-dark-muted leading-relaxed font-normal">
          Пошаговые статьи по сборкам ХайТек, Магия RPG, СкайБлок и Автоматизации.
          Рецепты крафтов 3x3, схемы алтарей драконов и мультиструктуры.
        </p>

        <!-- Search Bar Component -->
        <div class="pt-2 max-w-xl mx-auto">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Поиск гайдов по названию, автору или серверу (MagicRPG, HiTech, OneBlock)..."
              class="w-full bg-[#0c0d0e]/90 border border-[#26292d] focus:border-emerald-500/70 text-white text-sm rounded-2xl pl-12 pr-4 py-4 focus:outline-none shadow-2xl transition-all placeholder:text-dark-muted"
            />
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted">
              <IconRenderer name="Search" size="20" />
            </div>
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white"
            >
              <IconRenderer name="X" size="18" />
            </button>
          </div>
        </div>

        <!-- Quick Stats Badges -->
        <div class="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-dark-muted font-semibold">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <strong class="text-white">{{ (guides || []).length }}</strong> Гайдов в базе
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            <strong class="text-white">{{ serverList.length }}</strong> Серверов CubixWorld
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            <strong class="text-white">100%</strong> Актуальность
          </div>
        </div>
      </div>
    </section>

    <!-- ULTRA-CLEAN CUBIXWORLD SERVER SELECTOR BAR -->
    <div class="bg-[#16181a] border border-[#26292d] p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
          <IconRenderer name="Box" size="20" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-extrabold text-white tracking-tight">Сервер CubixWorld</h3>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              LIVE ({{ serverList.length }} активных)
            </span>
          </div>
          <p class="text-xs text-dark-muted">Выберите ваш сервер для точной фильтрации статей</p>
        </div>
      </div>

      <!-- Server Dropdown with multi-column grid -->
      <div class="relative w-full md:w-auto">
        <button
          type="button"
          @click="isServerDropdownOpen = !isServerDropdownOpen"
          class="w-full md:w-64 bg-[#0c0d0e] hover:bg-[#121416] border border-[#26292d] hover:border-emerald-500/50 text-white text-xs font-bold rounded-xl px-4 py-3 flex items-center justify-between transition-all shadow-md"
        >
          <div class="flex items-center gap-2 truncate">
            <span class="text-emerald-400 font-mono">🎮</span>
            <span class="truncate">{{ selectedServer === 'Все' ? 'Все сервера CubixWorld' : selectedServer }}</span>
          </div>
          <IconRenderer name="ChevronDown" size="16" :class="['text-dark-muted transition-transform duration-200 shrink-0', isServerDropdownOpen ? 'rotate-180 text-emerald-400' : '']" />
        </button>

        <!-- Wide multi-column dropdown -->
        <div
          v-if="isServerDropdownOpen"
          class="absolute top-full right-0 mt-2 bg-[#16181a] border border-[#26292d] rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-fadeIn w-[480px]"
        >
          <!-- Search inside dropdown -->
          <div class="relative">
            <input
              type="text"
              v-model="serverSearchQuery"
              :placeholder="`Поиск по ${serverList.length} серверу...`"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-emerald-500/60 transition-all"
            />
            <IconRenderer name="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          </div>

          <!-- All servers button spanning full width -->
          <button
            type="button"
            @click="selectedServer = 'Все'; isServerDropdownOpen = false;"
            :class="[
              'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all',
              selectedServer === 'Все'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-[#212429] hover:text-white border border-[#26292d]'
            ]"
          >
            <div class="flex items-center gap-2">
              <span>🌐</span>
              <span>Все сервера CubixWorld</span>
            </div>
            <IconRenderer v-if="selectedServer === 'Все'" name="Check" size="14" />
          </button>

          <!-- Grid of servers: 3 columns -->
          <div class="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            <button
              v-for="srv in filteredServers"
              :key="srv"
              type="button"
              @click="selectedServer = srv; isServerDropdownOpen = false;"
              :class="[
                'text-left px-2.5 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all truncate',
                selectedServer === srv
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-[#212429] hover:text-white border border-[#26292d]'
              ]"
            >
              <IconRenderer :name="getServerIcon(srv)" size="13" :class="selectedServer === srv ? 'text-white shrink-0' : 'text-cyan-400 shrink-0'" />
              <span class="truncate">{{ srv }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CATEGORY FILTER TABS WITH ICONS -->
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-[#26292d] pb-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="cat in categoriesList"
            :key="cat.name"
            type="button"
            @click="selectedCategory = cat.name"
            :class="[
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2',
              selectedCategory === cat.name 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50' 
                : 'bg-[#16181a] hover:bg-[#212429] text-dark-muted hover:text-white border border-[#26292d]'
            ]"
          >
            <IconRenderer :name="cat.icon" size="15" :class="selectedCategory === cat.name ? 'text-white' : cat.color" />
            <span>{{ cat.name }}</span>
          </button>
        </div>

        <div class="flex items-center gap-3 text-xs text-dark-muted font-mono">
          <span v-if="selectedServer !== 'Все'" class="bg-cyan-500/10 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-bold">
            Сервер: {{ selectedServer }}
          </span>
          <span>Найдено: {{ filteredGuides.length }} гайдов</span>
        </div>
      </div>

      <!-- GUIDES CATALOG GRID -->
      <div v-if="filteredGuides.length === 0" class="text-center py-16 bg-[#16181a] border border-[#26292d] rounded-2xl space-y-3">
        <IconRenderer name="Search" size="36" class="mx-auto text-dark-muted/40" />
        <h3 class="text-base font-bold text-white">Ничего не найдено</h3>
        <p class="text-xs text-dark-muted">Попробуйте изменить поисковый запрос, категорию или выбранный сервер</p>
      </div>

      <!-- ULTRA COMPACT SLEEK GUIDE CARDS GRID WITH BADGES OVERLAID ON BANNER -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="guide in paginatedGuides"
          :key="guide.meta.id"
          @click="emit('select-guide', guide.meta.id)"
          class="group bg-[#16181a] hover:bg-[#1c1f22] border border-[#26292d] hover:border-emerald-500/50 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl hover:shadow-emerald-950/30 hover:-translate-y-1 overflow-hidden"
        >
          <!-- COVER BANNER CONTAINER WITH BADGES OVERLAID ON TOP -->
          <div class="h-28 sm:h-32 w-full relative overflow-hidden flex-shrink-0 card-cover-banner">
            <img v-if="guide.meta.coverUrl" :src="guide.meta.coverUrl" class="w-full h-full object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-500" />
            <div v-else-if="guide.meta.coverGradient" :class="['w-full h-full bg-gradient-to-tr', guide.meta.coverGradient]"></div>
            <div v-else class="w-full h-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900"></div>

            <!-- Gradient Shadow Overlay for Readable Badges -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#16181a] via-[#16181a]/30 to-black/40 pointer-events-none card-banner-shadow"></div>

            <!-- DRAFT / PRIVATE BADGE OVERLAY -->
            <div v-if="!guide.meta.published || !guide.meta.isVisible" class="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-rose-950/90 border border-rose-500/60 text-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-xl backdrop-blur-md">
              <IconRenderer name="EyeOff" size="12" />
              <span>Черновик (Скрыт)</span>
            </div>

            <!-- BADGES OVERLAID DIRECTLY ON THE BANNER -->
            <div class="absolute inset-x-0 bottom-2.5 px-4 sm:px-5 z-10 flex items-center justify-between flex-wrap gap-1.5">
              <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-md backdrop-blur-md', getCategoryColor(guide.meta.category)]">
                {{ guide.meta.category }}
              </span>

              <div class="flex items-center gap-1">
                <span v-if="guide.meta.server" class="text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded shadow-md backdrop-blur-md">
                  🎮 {{ guide.meta.server }}
                </span>
                <span :class="['text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shadow-md backdrop-blur-md', getDifficultyBadge(guide.meta.difficulty)]">
                  {{ guide.meta.difficulty }}
                </span>
              </div>
            </div>
          </div>

          <!-- CARD BODY -->
          <div class="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div class="space-y-1.5">
              <!-- Title -->
              <h3 class="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                {{ guide.meta.title }}
              </h3>

              <!-- Summary Excerpt -->
              <p class="text-xs text-dark-muted line-clamp-2 leading-relaxed">
                {{ guide.meta.summary || 'Интерактивное руководство по сборке...' }}
              </p>
            </div>

            <!-- COMPACT BOTTOM ROW: Author Avatar, Verified Checkmark, Date & Hover Arrow -->
            <div class="flex items-center justify-between pt-2.5 border-t border-[#26292d]/80 text-[11px]">
              <div 
                @click.stop="emit('open-author', guide.meta.author)"
                class="flex items-center gap-2 hover:text-emerald-400 transition-colors cursor-pointer group/author"
                title="Просмотреть профиль автора"
              >
                <!-- Avatar with Glow Ring -->
                <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-600 via-cyan-500 to-purple-600 p-0.5 shadow-md flex-shrink-0">
                  <div class="w-full h-full bg-[#0c0d0e] rounded-[6px] flex items-center justify-center overflow-hidden">
                    <img v-if="authorProfilesMap[guide.meta.author.toLowerCase()]?.avatarUrl" :src="authorProfilesMap[guide.meta.author.toLowerCase()]?.avatarUrl" class="w-full h-full object-cover" />
                    <span v-else class="text-[10px] font-black text-emerald-400">{{ guide.meta.author ? guide.meta.author.charAt(0).toUpperCase() : 'A' }}</span>
                  </div>
                </div>

                <!-- Author Nickname + Verified Badge -->
                <div class="flex items-center gap-1">
                  <span class="font-bold text-slate-200 text-xs group-hover/author:text-emerald-400 group-hover/author:underline">{{ guide.meta.author }}</span>
                  <span v-if="authorProfilesMap[guide.meta.author.toLowerCase()]?.isVerified" class="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center shadow-sm" title="Проверенный Автор">
                    <svg class="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
              </div>

              <!-- Date, Trash (admin only) & Hover Arrow Action -->
              <div class="flex items-center gap-2">
                <!-- Admin trash button -->
                <button
                  v-if="isAdmin || canEditOthers"
                  type="button"
                  @click.stop="emit('delete-guide', guide.meta.id)"
                  class="w-6 h-6 rounded-lg bg-[#121416] hover:bg-rose-500/20 text-dark-muted hover:text-rose-400 border border-[#26292d] hover:border-rose-500/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  title="Удалить гайд"
                >
                  <IconRenderer name="Trash2" size="12" />
                </button>

                <span class="font-mono text-[10px] text-slate-400">{{ guide.meta.updatedAt }}</span>
                <div class="w-6 h-6 rounded-lg bg-[#121416] group-hover:bg-emerald-600 text-slate-400 group-hover:text-white border border-[#26292d] group-hover:border-emerald-500 flex items-center justify-center transition-all">
                  <IconRenderer name="ChevronRight" size="14" class="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- PAGINATION CONTROLS -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-6 pb-4">
        <button
          type="button"
          @click="currentPage = 1"
          :disabled="currentPage === 1"
          class="w-8 h-8 rounded-xl border border-[#26292d] text-dark-muted hover:text-white hover:border-emerald-500/50 hover:bg-[#16181a] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-xs"
          title="Первая страница"
        >
          <IconRenderer name="ChevronsLeft" size="14" />
        </button>
        <button
          type="button"
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="w-8 h-8 rounded-xl border border-[#26292d] text-dark-muted hover:text-white hover:border-emerald-500/50 hover:bg-[#16181a] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          <IconRenderer name="ChevronLeft" size="14" />
        </button>

        <!-- Page number pills -->
        <div class="flex items-center gap-1">
          <template v-for="page in totalPages" :key="page">
            <button
              v-if="Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages"
              type="button"
              @click="currentPage = page"
              :class="[
                'w-8 h-8 rounded-xl text-xs font-bold transition-all border',
                currentPage === page
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                  : 'border-[#26292d] text-dark-muted hover:text-white hover:border-emerald-500/50 hover:bg-[#16181a]'
              ]"
            >{{ page }}</button>
            <span
              v-else-if="Math.abs(page - currentPage) === 3"
              class="text-dark-muted text-xs px-1"
            >…</span>
          </template>
        </div>

        <button
          type="button"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="w-8 h-8 rounded-xl border border-[#26292d] text-dark-muted hover:text-white hover:border-emerald-500/50 hover:bg-[#16181a] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          <IconRenderer name="ChevronRight" size="14" />
        </button>
        <button
          type="button"
          @click="currentPage = totalPages"
          :disabled="currentPage === totalPages"
          class="w-8 h-8 rounded-xl border border-[#26292d] text-dark-muted hover:text-white hover:border-emerald-500/50 hover:bg-[#16181a] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-xs"
          title="Последняя страница"
        >
          <IconRenderer name="ChevronsRight" size="14" />
        </button>

      </div>
    </div>
  </div>
</template>
