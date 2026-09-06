<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import { THAUMCRAFT_ASPECTS, findShortestAspectBridge, getAspectSynthesisSteps, type ThaumcraftAspect } from '../data/thaumcraftAspects';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-guide', guideId: string): void;
}>();

const searchQuery = ref('');
const activeFilter = ref<'all' | 'primal' | 'compound'>('all');
const selectedAspect = ref<ThaumcraftAspect | null>(THAUMCRAFT_ASPECTS['praecantatio'] || THAUMCRAFT_ASPECTS['aer']);

// Bridge Finder State & Custom Dropdowns
const startAspectId = ref<string>('aqua');
const targetAspectId = ref<string>('ignis');
const isStartDropdownOpen = ref(false);
const isTargetDropdownOpen = ref(false);
const startSearchQuery = ref('');
const targetSearchQuery = ref('');

const isBridgeCalculated = ref(false);
const isGuideHelpOpen = ref(false);
const calculatedBridge = ref<string[]>([]);
const copySuccess = ref(false);

const allAspectsList = computed(() => Object.values(THAUMCRAFT_ASPECTS));

const filteredStartAspects = computed(() => {
  const q = startSearchQuery.value.toLowerCase().trim();
  if (!q) return allAspectsList.value;
  return allAspectsList.value.filter(a => a.nameRu.toLowerCase().includes(q) || a.nameLat.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
});

const filteredTargetAspects = computed(() => {
  const q = targetSearchQuery.value.toLowerCase().trim();
  if (!q) return allAspectsList.value;
  return allAspectsList.value.filter(a => a.nameRu.toLowerCase().includes(q) || a.nameLat.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
});

// Sequential Synthesis Calculator for selected aspect
const currentSynthesis = computed(() => {
  if (!selectedAspect.value) return { steps: [], primalCosts: {} };
  return getAspectSynthesisSteps(selectedAspect.value.id);
});

const filteredAspects = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  return allAspectsList.value.filter(asp => {
    if (activeFilter.value === 'primal' && !asp.isPrimal) return false;
    if (activeFilter.value === 'compound' && asp.isPrimal) return false;

    if (!query) return true;
    return (
      asp.nameRu.toLowerCase().includes(query) ||
      asp.nameLat.toLowerCase().includes(query) ||
      asp.id.toLowerCase().includes(query) ||
      asp.description.toLowerCase().includes(query)
    );
  });
});

const calculateBridge = () => {
  if (!startAspectId.value || !targetAspectId.value) return;
  calculatedBridge.value = findShortestAspectBridge(startAspectId.value, targetAspectId.value);
  isBridgeCalculated.value = true;
};

const copyAspectChain = async () => {
  if (!calculatedBridge.value || calculatedBridge.value.length === 0) return;
  const textChain = calculatedBridge.value
    .map(id => THAUMCRAFT_ASPECTS[id] ? `${THAUMCRAFT_ASPECTS[id].nameRu} (${THAUMCRAFT_ASPECTS[id].nameLat})` : id)
    .join(' ➔ ');
  try {
    await navigator.clipboard.writeText(textChain);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2500);
  } catch (err) {
    console.error('Failed to copy aspect chain:', err);
  }
};

const getAspect = (id: string): ThaumcraftAspect | undefined => THAUMCRAFT_ASPECTS[id];

const selectAspect = (asp: ThaumcraftAspect) => {
  selectedAspect.value = asp;
};
</script>

<template>
  <div class="min-h-screen bg-[#090a0c] text-white py-4 px-3 sm:px-6 lg:px-8 space-y-4">
    <div class="max-w-7xl mx-auto space-y-4">

      <!-- RESEARCH TABLE ASPECT BRIDGE FINDER TOOL (COMPACT BANNER) -->
      <div class="bg-gradient-to-r from-purple-950/40 via-[#121417] to-cyan-950/40 border border-purple-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl">
        <!-- Tool Header with Quick Explanation & Guide Link -->
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="space-y-0.5">
            <h3 class="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <IconRenderer name="Compass" size="15" class="text-purple-400" />
              <span>Помощник Стола Исследований Таумкрафт 4</span>
            </h3>
            <p class="text-[11px] text-slate-300">
              Показывает идеальную цепочку аспектов для соединения двух узлов на столе исследований. 
              <span class="text-purple-300 font-bold">Правило:</span> аспекты соединяются, если один состоит из другого или они имеют общий элемент!
            </p>
          </div>
          <button
            type="button"
            @click="emit('open-guide', 'guide_1788713578258')"
            class="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm hover:scale-102"
          >
            <IconRenderer name="BookOpen" size="14" />
            <span>Как связывать аспекты? (Гайд)</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <!-- Start Aspect Dropdown (Custom 3-column Grid) -->
          <div class="sm:col-span-5 space-y-1 relative">
            <label class="block text-[11px] font-bold text-slate-300">1. Начальный аспект на столе</label>
            <button
              type="button"
              @click="isStartDropdownOpen = !isStartDropdownOpen; isTargetDropdownOpen = false;"
              class="w-full bg-[#0c0d0e] hover:bg-[#121416] border border-[#26292d] hover:border-purple-500/50 text-white text-xs font-bold rounded-xl px-3 py-2 flex items-center justify-between transition-all shadow-md cursor-pointer"
            >
              <div class="flex items-center gap-2 truncate">
                <img :src="`/aspects/${startAspectId}.png`" class="w-4 h-4 object-contain" />
                <span class="truncate">{{ THAUMCRAFT_ASPECTS[startAspectId]?.nameRu }}</span>
                <span class="text-[10px] text-slate-400 font-mono">({{ THAUMCRAFT_ASPECTS[startAspectId]?.nameLat }})</span>
              </div>
              <IconRenderer name="ChevronDown" size="14" :class="['text-slate-400 transition-transform duration-200 shrink-0', isStartDropdownOpen ? 'rotate-180 text-purple-400' : '']" />
            </button>

            <!-- Dropdown Popover (3 Columns Grid) -->
            <div v-if="isStartDropdownOpen" @click="isStartDropdownOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden"></div>
            <div
              v-if="isStartDropdownOpen"
              class="absolute top-full left-0 mt-2 bg-[#16181a] border border-[#26292d] rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-fadeIn w-full sm:w-[480px] max-w-[calc(100vw-1.5rem)]"
            >
              <div class="relative">
                <input
                  type="text"
                  v-model="startSearchQuery"
                  placeholder="Поиск аспекта..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-purple-400 text-xs text-white rounded-xl pl-8 pr-3 py-1.5 outline-none"
                  @click.stop
                />
                <IconRenderer name="Search" size="14" class="absolute left-2.5 top-2 text-slate-400" />
              </div>

              <!-- 3 Column Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                <button
                  v-for="asp in filteredStartAspects"
                  :key="'start-opt-' + asp.id"
                  type="button"
                  @click="startAspectId = asp.id; isStartDropdownOpen = false;"
                  :class="[
                    'p-1.5 rounded-lg border text-left text-xs transition-all flex items-center gap-1.5 cursor-pointer',
                    startAspectId === asp.id ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold' : 'bg-[#0c0d0e] border-[#26292d] hover:bg-[#1c1f24] hover:border-slate-600 text-slate-200'
                  ]"
                >
                  <img :src="`/aspects/${asp.id}.png`" class="w-3.5 h-3.5 object-contain shrink-0" />
                  <span class="truncate text-[11px]">{{ asp.nameRu }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Target Aspect Dropdown (Custom 3-column Grid) -->
          <div class="sm:col-span-5 space-y-1 relative">
            <label class="block text-[11px] font-bold text-slate-300">2. Конечный аспект, куда тянем</label>
            <button
              type="button"
              @click="isTargetDropdownOpen = !isTargetDropdownOpen; isStartDropdownOpen = false;"
              class="w-full bg-[#0c0d0e] hover:bg-[#121416] border border-[#26292d] hover:border-purple-500/50 text-white text-xs font-bold rounded-xl px-3 py-2 flex items-center justify-between transition-all shadow-md cursor-pointer"
            >
              <div class="flex items-center gap-2 truncate">
                <img :src="`/aspects/${targetAspectId}.png`" class="w-4 h-4 object-contain" />
                <span class="truncate">{{ THAUMCRAFT_ASPECTS[targetAspectId]?.nameRu }}</span>
                <span class="text-[10px] text-slate-400 font-mono">({{ THAUMCRAFT_ASPECTS[targetAspectId]?.nameLat }})</span>
              </div>
              <IconRenderer name="ChevronDown" size="14" :class="['text-slate-400 transition-transform duration-200 shrink-0', isTargetDropdownOpen ? 'rotate-180 text-purple-400' : '']" />
            </button>

            <!-- Dropdown Popover (3 Columns Grid) -->
            <div v-if="isTargetDropdownOpen" @click="isTargetDropdownOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden"></div>
            <div
              v-if="isTargetDropdownOpen"
              class="absolute top-full right-0 mt-2 bg-[#16181a] border border-[#26292d] rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-fadeIn w-full sm:w-[480px] max-w-[calc(100vw-1.5rem)]"
            >
              <div class="relative">
                <input
                  type="text"
                  v-model="targetSearchQuery"
                  placeholder="Поиск аспекта..."
                  class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-purple-400 text-xs text-white rounded-xl pl-8 pr-3 py-1.5 outline-none"
                  @click.stop
                />
                <IconRenderer name="Search" size="14" class="absolute left-2.5 top-2 text-slate-400" />
              </div>

              <!-- 3 Column Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                <button
                  v-for="asp in filteredTargetAspects"
                  :key="'target-opt-' + asp.id"
                  type="button"
                  @click="targetAspectId = asp.id; isTargetDropdownOpen = false;"
                  :class="[
                    'p-1.5 rounded-lg border text-left text-xs transition-all flex items-center gap-1.5 cursor-pointer',
                    targetAspectId === asp.id ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold' : 'bg-[#0c0d0e] border-[#26292d] hover:bg-[#1c1f24] hover:border-slate-600 text-slate-200'
                  ]"
                >
                  <img :src="`/aspects/${asp.id}.png`" class="w-3.5 h-3.5 object-contain shrink-0" />
                  <span class="truncate text-[11px]">{{ asp.nameRu }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Calculate Button -->
          <div class="sm:col-span-2">
            <button
              type="button"
              @click="calculateBridge"
              class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <IconRenderer name="Sparkles" size="14" />
              <span>Рассчитать</span>
            </button>
          </div>
        </div>

        <!-- Calculated Path Display -->
        <div v-if="isBridgeCalculated" class="pt-3 border-t border-purple-500/20 space-y-2">
          <div v-if="calculatedBridge.length === 0" class="text-xs text-rose-400 font-bold p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            Соединительный мост между выбранными аспектами не найден.
          </div>

          <div v-else class="space-y-2">
            <div class="flex items-center justify-between text-xs text-purple-300 font-bold flex-wrap gap-2">
              <span>Выкладывайте эти аспекты подряд в клетки на столе (Шагов: {{ calculatedBridge.length - 1 }}):</span>
              <button
                type="button"
                @click="copyAspectChain"
                class="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102 active:scale-98"
              >
                <IconRenderer :name="copySuccess ? 'Check' : 'Copy'" size="13" :class="copySuccess ? 'text-emerald-400' : 'text-purple-300'" />
                <span>{{ copySuccess ? 'Скопировано в буфер!' : 'Скопировать цепочку' }}</span>
              </button>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 p-3 bg-[#0c0d0e] border border-purple-500/30 rounded-2xl overflow-x-auto">
              <template v-for="(aspId, idx) in calculatedBridge" :key="aspId + idx">
                <div
                  @click="selectAspect(THAUMCRAFT_ASPECTS[aspId])"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-transform hover:scale-105 cursor-pointer relative group"
                  :style="{ borderColor: THAUMCRAFT_ASPECTS[aspId]?.color + '80', backgroundColor: THAUMCRAFT_ASPECTS[aspId]?.color + '15' }"
                >
                  <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-black/60 text-purple-300 font-mono">#{ idx + 1 }</span>
                  <div class="w-4 h-4 rounded-md overflow-hidden relative flex-shrink-0 flex items-center justify-center bg-black/40">
                    <img 
                      :src="`/aspects/${aspId}.png`" 
                      class="w-full h-full object-contain p-0.5"
                    />
                  </div>
                  <span class="text-xs font-bold text-white">{{ THAUMCRAFT_ASPECTS[aspId]?.nameRu }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">({{ THAUMCRAFT_ASPECTS[aspId]?.nameLat }})</span>
                </div>

                <!-- Arrow separator -->
                <IconRenderer
                  v-if="idx < calculatedBridge.length - 1"
                  name="ChevronRight"
                  size="16"
                  class="text-purple-400/80 shrink-0"
                />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN WORKSPACE: ASPECT EXPLORER & DETAIL CARD (2 COLS) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        <!-- Left Sub-column: Aspect Grid & Filters (7 cols, order-2 on mobile) -->
        <div class="lg:col-span-7 space-y-3 order-2 lg:order-1">
          
          <!-- Search & Filter Controls -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
            <!-- Search Bar -->
            <div class="relative flex-1 w-full">
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Поиск аспекта (Магия, Aqua, Ignis)..."
                class="w-full bg-[#121417] border border-[#26292d] focus:border-purple-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition-all shadow-sm"
              />
              <IconRenderer name="Search" size="14" class="absolute left-3 top-2 text-slate-400" />
            </div>

            <!-- Filter Buttons -->
            <div class="flex items-center gap-1 bg-[#121417] border border-[#26292d] p-0.5 rounded-xl shrink-0 w-full sm:w-auto justify-center">
              <button
                type="button"
                @click="activeFilter = 'all'"
                :class="['px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all', activeFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white']"
              >
                Все ({{ allAspectsList.length }})
              </button>
              <button
                type="button"
                @click="activeFilter = 'primal'"
                :class="['px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all', activeFilter === 'primal' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white']"
              >
                Первичные (6)
              </button>
              <button
                type="button"
                @click="activeFilter = 'compound'"
                :class="['px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all', activeFilter === 'compound' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white']"
              >
                Составные
              </button>
            </div>
          </div>

          <!-- Aspect Badges Grid (4 columns dense layout) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <div
              v-for="asp in filteredAspects"
              :key="asp.id"
              @click="selectAspect(asp)"
              :class="[
                'p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 group shadow-sm',
                selectedAspect?.id === asp.id ? 'ring-2 ring-purple-400 bg-purple-950/40 border-purple-500' : 'bg-[#121417]/90 border-[#26292d] hover:border-slate-600 hover:bg-[#16191e]'
              ]"
            >
              <!-- Aspect Icon Image -->
              <div
                class="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform overflow-hidden relative border border-white/5"
                :style="{ backgroundColor: asp.color + '15' }"
              >
                <img 
                  :src="`/aspects/${asp.id}.png`" 
                  :alt="asp.nameLat"
                  class="w-full h-full object-contain p-0.5"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-extrabold text-white truncate group-hover:text-purple-300 transition-colors leading-tight">
                  {{ asp.nameRu }}
                </div>
                <div class="text-[9px] text-slate-400 font-mono truncate leading-tight">
                  {{ asp.nameLat }}
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Sub-column: Selected Aspect Detail View (5 cols - Sticky, order-1 on mobile) -->
        <div class="lg:col-span-5 lg:sticky lg:top-4 order-1 lg:order-2">
          <div v-if="selectedAspect" class="bg-[#121417] border border-[#26292d] rounded-2xl p-4 space-y-4 shadow-xl">
            
            <div class="space-y-3">
              <!-- Aspect Header badge -->
              <div class="flex items-center gap-3 border-b border-[#26292d] pb-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10 overflow-hidden relative"
                  :style="{ backgroundColor: selectedAspect.color + '22' }"
                >
                  <img 
                    :src="`/aspects/${selectedAspect.id}.png`" 
                    :alt="selectedAspect.nameLat"
                    class="w-full h-full object-contain p-0.5"
                  />
                </div>
                <div>
                  <h3 class="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                    <span>{{ selectedAspect.nameRu }}</span>
                    <span class="text-[11px] text-slate-300 font-mono">({{ selectedAspect.nameLat }})</span>
                  </h3>
                  <span
                    :class="['text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border inline-block mt-0.5', selectedAspect.isPrimal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/40']"
                  >
                    {{ selectedAspect.isPrimal ? '✨ Первичная Стихия' : '🧪 Составной Аспект' }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <p class="text-xs text-slate-300 font-medium leading-relaxed bg-[#16181a] p-3 rounded-xl border border-[#26292d]">
                {{ selectedAspect.description }}
              </p>

              <!-- Aspect Recipe Breakdown (Components) -->
              <div class="space-y-2">
                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {{ selectedAspect.isPrimal ? 'Первичный элемент' : 'Рецепт скрещивания:' }}
                </h4>

                <div v-if="selectedAspect.isPrimal" class="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300">
                  Базовый аспект (не состоит из других элементов).
                </div>

                <div v-else-if="selectedAspect.components" class="grid grid-cols-2 gap-2">
                  <!-- Component 1 -->
                  <div
                    v-if="getAspect(selectedAspect.components[0])"
                    @click="selectAspect(getAspect(selectedAspect.components[0])!)"
                    class="p-2.5 rounded-xl bg-[#16181a] border border-[#26292d] hover:border-purple-400/60 transition-all cursor-pointer space-y-0.5 group flex items-center gap-2"
                  >
                    <div class="w-5 h-5 rounded-lg overflow-hidden relative flex-shrink-0 flex items-center justify-center bg-black/40">
                      <img 
                        :src="`/aspects/${selectedAspect.components[0]}.png`" 
                        class="w-full h-full object-contain p-0.5"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {{ getAspect(selectedAspect.components[0])?.nameRu }}
                      </div>
                      <div class="text-[9px] text-slate-400 font-mono truncate">
                        {{ getAspect(selectedAspect.components[0])?.nameLat }}
                      </div>
                    </div>
                  </div>

                  <!-- Component 2 -->
                  <div
                    v-if="getAspect(selectedAspect.components[1])"
                    @click="selectAspect(getAspect(selectedAspect.components[1])!)"
                    class="p-2.5 rounded-xl bg-[#16181a] border border-[#26292d] hover:border-purple-400/60 transition-all cursor-pointer space-y-0.5 group flex items-center gap-2"
                  >
                    <div class="w-5 h-5 rounded-lg overflow-hidden relative flex-shrink-0 flex items-center justify-center bg-black/40">
                      <img 
                        :src="`/aspects/${selectedAspect.components[1]}.png`" 
                        class="w-full h-full object-contain p-0.5"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {{ getAspect(selectedAspect.components[1])?.nameRu }}
                      </div>
                      <div class="text-[9px] text-slate-400 font-mono truncate">
                        {{ getAspect(selectedAspect.components[1])?.nameLat }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sequential Crafting Steps Tree (Пошаговый крафт) -->
              <div v-if="!selectedAspect.isPrimal && currentSynthesis.steps.length > 0" class="space-y-2 pt-2 border-t border-[#26292d]">
                <div class="flex items-center justify-between">
                  <h4 class="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    <IconRenderer name="Layers" size="12" />
                    <span>Последовательность Крафта ({{ currentSynthesis.steps.length }} шаг):</span>
                  </h4>
                </div>

                <div class="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  <div
                    v-for="step in currentSynthesis.steps"
                    :key="step.result + step.stepNumber"
                    class="p-2 rounded-xl bg-[#16181a] border border-[#26292d] flex items-center justify-between gap-2 text-xs"
                  >
                    <span class="text-[10px] font-mono font-bold text-purple-400 shrink-0">#{{ step.stepNumber }}</span>

                    <!-- Craft Formula -->
                    <div class="flex items-center gap-1.5 min-w-0">
                      <!-- Component 1 -->
                      <div @click="selectAspect(THAUMCRAFT_ASPECTS[step.component1])" class="flex items-center gap-1 cursor-pointer hover:opacity-80">
                        <img :src="`/aspects/${step.component1}.png`" class="w-4 h-4 object-contain" />
                        <span class="text-[11px] font-bold text-slate-200 truncate max-w-[65px]">{{ THAUMCRAFT_ASPECTS[step.component1]?.nameRu }}</span>
                      </div>

                      <span class="text-slate-500 text-[10px] font-black">+</span>

                      <!-- Component 2 -->
                      <div @click="selectAspect(THAUMCRAFT_ASPECTS[step.component2])" class="flex items-center gap-1 cursor-pointer hover:opacity-80">
                        <img :src="`/aspects/${step.component2}.png`" class="w-4 h-4 object-contain" />
                        <span class="text-[11px] font-bold text-slate-200 truncate max-w-[65px]">{{ THAUMCRAFT_ASPECTS[step.component2]?.nameRu }}</span>
                      </div>
                    </div>

                    <span class="text-slate-500 text-[10px] font-black">➔</span>

                    <!-- Result Aspect -->
                    <div @click="selectAspect(THAUMCRAFT_ASPECTS[step.result])" class="flex items-center gap-1 cursor-pointer hover:opacity-80 shrink-0">
                      <img :src="`/aspects/${step.result}.png`" class="w-4 h-4 object-contain" />
                      <span class="text-[11px] font-extrabold text-purple-300">{{ THAUMCRAFT_ASPECTS[step.result]?.nameRu }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Total Base Primal Aspects Cost -->
              <div v-if="!selectedAspect.isPrimal" class="pt-2 border-t border-[#26292d] space-y-1.5">
                <h4 class="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <IconRenderer name="Zap" size="12" />
                  <span>Итого базовых стихий:</span>
                </h4>
                <div class="grid grid-cols-3 gap-1.5">
                  <div
                    v-for="(count, primalId) in currentSynthesis.primalCosts"
                    :key="primalId"
                    v-show="count > 0"
                    class="p-1.5 rounded-lg bg-[#16181a] border border-[#26292d] flex items-center justify-between px-2 text-[11px]"
                  >
                    <div class="flex items-center gap-1">
                      <img :src="`/aspects/${primalId}.png`" class="w-3.5 h-3.5 object-contain" />
                      <span class="text-slate-300 text-[10px]">{{ THAUMCRAFT_ASPECTS[primalId]?.nameRu }}</span>
                    </div>
                    <span class="font-extrabold text-amber-400 text-xs">x{{ count }}</span>
                  </div>
                </div>
              </div>

              <!-- Interactive Item Scanner (Где взять аспект / Растопка) -->
              <div class="pt-2 border-t border-[#26292d] space-y-2">
                <h4 class="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <IconRenderer name="Search" size="12" class="text-emerald-400" />
                  <span>Интерактивный Сканер: Где взять аспект?</span>
                </h4>

                <div v-if="selectedAspect.items && selectedAspect.items.length > 0" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(item, idx) in selectedAspect.items"
                    :key="item + idx"
                    class="px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[11px] font-bold flex items-center gap-1 shadow-xs hover:border-emerald-400 transition-colors"
                  >
                    <span class="text-[9px]">📦</span>
                    <span>{{ item }}</span>
                  </span>
                </div>
                <div v-else class="text-[11px] text-slate-400 italic bg-[#16181a] p-2 rounded-xl border border-[#26292d]">
                  Содержится в редких магических артефактах или получается скрещиванием аспектов на столе.
                </div>
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div class="pt-3 border-t border-[#26292d] flex justify-between gap-2">
              <button
                type="button"
                @click="startAspectId = selectedAspect.id; calculateBridge();"
                class="flex-1 py-2 rounded-xl bg-[#16181a] hover:bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all text-center cursor-pointer"
              >
                Как старт
              </button>
              <button
                type="button"
                @click="targetAspectId = selectedAspect.id; calculateBridge();"
                class="flex-1 py-2 rounded-xl bg-[#16181a] hover:bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all text-center cursor-pointer"
              >
                Как цель
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  </div>

  <!-- EDUCATIONAL THAUMCRAFT RESEARCH GUIDE MODAL -->
  <div v-if="isGuideHelpOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn" @click.self="isGuideHelpOpen = false">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar relative">
      <button
        type="button"
        @click="isGuideHelpOpen = false"
        class="absolute top-5 right-5 p-2 rounded-xl bg-[#0c0d0e] border border-[#26292d] hover:border-purple-400 text-slate-300 hover:text-white transition-all cursor-pointer"
      >
        <IconRenderer name="X" size="18" />
      </button>

      <div class="flex items-center gap-3 border-b border-[#26292d] pb-4">
        <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold text-xl shrink-0">
          📜
        </div>
        <div>
          <h3 class="text-base font-black text-white tracking-tight">Как соединять аспекты на Столе Исследований?</h3>
          <p class="text-xs text-purple-300 font-medium">Главные правила и принципы проведения магических дорожек в TC 4.2</p>
        </div>
      </div>

      <div class="space-y-4 text-xs text-slate-200 leading-relaxed">
        <div class="p-3.5 bg-[#0c0d0e] border border-purple-500/30 rounded-2xl space-y-2">
          <h4 class="font-extrabold text-purple-300 flex items-center gap-2">
            <span>1. Золотое правило соединения</span>
          </h4>
          <p class="text-slate-300">
            Два соседних аспектов на столе исследования **связываются соединительной нитью**, если соблюдено одно из двух условий:
          </p>
          <ul class="list-disc list-inside space-y-1 text-slate-300 pl-1">
            <li>Один аспект является прямо компонентом другого (например: <strong class="text-white">Victus</strong> состоить из <strong class="text-white">Aqua + Terra</strong>, поэтому Victus соединяется и с Aqua, и с Terra).</li>
            <li>Два аспекта имеют **общий базовый компонент** (например: <strong class="text-white">Lux (Aer + Ignis)</strong> и <strong class="text-white">Motus (Aer + Ordo)</strong> соединяются, так как у них общий <strong class="text-white">Aer</strong>).</li>
          </ul>
        </div>

        <div class="p-3.5 bg-[#0c0d0e] border border-[#26292d] rounded-2xl space-y-2">
          <h4 class="font-extrabold text-cyan-300 flex items-center gap-2">
            <span>2. Как пользоваться калькулятором сверху?</span>
          </h4>
          <ol class="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
            <li>Выберите аспект, с которого у вас выходит иконка в исследовании (напр. <strong>Aqua</strong>).</li>
            <li>Выберите конечную цель на другом конце записки (напр. <strong>Ignis</strong>).</li>
            <li>Нажмите <strong>«Рассчитать»</strong> — алгоритм мгновенно построит самый короткий путь!</li>
            <li>Выкладывайте полученные аспекты по порядку <strong class="text-purple-300">#1, #2, #3...</strong> в клетки на столе между узлами.</li>
          </ol>
        </div>

        <div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-amber-200">
          <h4 class="font-extrabold flex items-center gap-2">
            <span>💡 Совет тауматурга</span>
          </h4>
          <p class="text-[11.5px]">
            Используйте первичные стихии (Aer, Aqua, Ignis, Terra, Ordo, Perditio) как "мосты-переходники", если у вас мало составных аспектов в изученных знаниях!
          </p>
        </div>
      </div>

      <div class="pt-3 border-t border-[#26292d] flex justify-end">
        <button
          type="button"
          @click="isGuideHelpOpen = false"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          Понятно, к калькулятору!
        </button>
      </div>
    </div>
  </div>
</template>
