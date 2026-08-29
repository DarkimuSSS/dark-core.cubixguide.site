<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { Guide, Category } from '../types/guide';

const props = defineProps<{
  guides: Guide[];
}>();

const emit = defineEmits<{
  (e: 'select-guide', guideId: string): void;
  (e: 'create-guide'): void;
}>();

const searchQuery = ref('');
const selectedCategory = ref<string>('Все');
const selectedServer = ref<string>('Все');

const serverList = ref<string[]>([]);
const isServersLoading = ref<boolean>(true);

const categoriesList = ['Все', 'ХайТек', 'Магия RPG', 'СкайБлок', 'Автоматизация', 'Общий'];

onMounted(async () => {
  try {
    const res = await fetch('/api/servers');
    if (res.ok) {
      serverList.value = await res.json();
    }
  } catch (err) {
    console.error('Error fetching live CubixWorld servers:', err);
    serverList.value = [
      "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
      "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", "UltraSky", 
      "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
      "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", "TechnomagicTest", 
      "SkyTech", "MagicalTech"
    ];
  } finally {
    isServersLoading.value = false;
  }
});

const filteredGuides = computed(() => {
  return props.guides.filter(guide => {
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
    <!-- HERO HERO BANNER SECTION -->
    <section class="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#16181a] via-[#121416] to-[#0c0d0e] border border-[#26292d] p-8 sm:p-14 shadow-2xl">
      <!-- Glow Decor Circles -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-3xl mx-auto text-center space-y-6 relative z-10">
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
            <strong class="text-white">{{ guides.length }}</strong> Гайдов в базе
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

    <!-- LIVE CUBIXWORLD SERVERS MONITORING WIDGET -->
    <div class="bg-[#16181a] border border-[#26292d] p-5 rounded-2xl shadow-xl space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h3 class="text-xs font-bold text-white tracking-wider uppercase">Актуальный список серверов CubixWorld</h3>
        </div>

        <span class="text-[11px] text-emerald-400 font-mono font-semibold">
          LIVE API ({{ serverList.length }} онлайн)
        </span>
      </div>

      <!-- Server Pills List -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          @click="selectedServer = 'Все'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border',
            selectedServer === 'Все'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-[#0c0d0e] hover:bg-[#121416] text-dark-muted border-[#26292d]'
          ]"
        >
          🌐 Все сервера
        </button>

        <button
          v-for="srv in serverList"
          :key="srv"
          type="button"
          @click="selectedServer = selectedServer === srv ? 'Все' : srv"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border flex items-center gap-1.5',
            selectedServer === srv
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0c0d0e] hover:bg-[#121416] text-slate-300 border-[#26292d]'
          ]"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>{{ srv }}</span>
        </button>
      </div>
    </div>

    <!-- CATEGORY FILTER TABS -->
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-[#26292d] pb-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="cat in categoriesList"
            :key="cat"
            type="button"
            @click="selectedCategory = cat"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
              selectedCategory === cat 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50' 
                : 'bg-[#16181a] hover:bg-[#212429] text-dark-muted hover:text-white border border-[#26292d]'
            ]"
          >
            {{ cat }}
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

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="guide in filteredGuides"
          :key="guide.meta.id"
          @click="emit('select-guide', guide.meta.id)"
          class="group bg-[#16181a] hover:bg-[#1c1f22] border border-[#26292d] hover:border-emerald-500/50 p-6 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-5 shadow-lg hover:shadow-2xl hover:shadow-emerald-950/30 hover:-translate-y-1"
        >
          <div class="space-y-4">
            <!-- Badges Bar -->
            <div class="flex items-center justify-between flex-wrap gap-2">
              <span :class="['text-[11px] font-bold px-2.5 py-1 rounded-lg border', getCategoryColor(guide.meta.category)]">
                {{ guide.meta.category }}
              </span>

              <div class="flex items-center gap-1.5">
                <span v-if="guide.meta.server" class="text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  🎮 {{ guide.meta.server }}
                </span>
                <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full border', getDifficultyBadge(guide.meta.difficulty)]">
                  {{ guide.meta.difficulty }}
                </span>
              </div>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
              {{ guide.meta.title }}
            </h3>

            <!-- Summary Excerpt -->
            <p class="text-xs text-dark-muted line-clamp-3 leading-relaxed">
              {{ guide.meta.summary || 'Интерактивное руководство по сборке...' }}
            </p>
          </div>

          <div class="space-y-4 pt-4 border-t border-[#26292d]">
            <!-- Meta Author & Date -->
            <div class="flex items-center justify-between text-[11px] text-dark-muted">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  {{ guide.meta.author ? guide.meta.author.charAt(0).toUpperCase() : 'A' }}
                </div>
                <span class="font-medium text-slate-300">{{ guide.meta.author }}</span>
              </div>
              <span>{{ guide.meta.updatedAt }}</span>
            </div>

            <!-- Action Button -->
            <button
              type="button"
              class="w-full bg-[#121416] group-hover:bg-emerald-600 text-slate-300 group-hover:text-white border border-[#26292d] group-hover:border-emerald-500/50 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Читать гайд</span>
              <IconRenderer name="ChevronRight" size="16" class="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
