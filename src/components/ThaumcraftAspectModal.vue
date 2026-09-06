<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import { THAUMCRAFT_ASPECTS, findShortestAspectBridge, type ThaumcraftAspect } from '../data/thaumcraftAspects';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const searchQuery = ref('');
const activeFilter = ref<'all' | 'primal' | 'compound'>('all');
const selectedAspect = ref<ThaumcraftAspect | null>(THAUMCRAFT_ASPECTS['praecantatio'] || THAUMCRAFT_ASPECTS['aer']);

// Bridge Finder State
const startAspectId = ref<string>('aqua');
const targetAspectId = ref<string>('ignis');
const calculatedBridge = ref<string[]>([]);
const isBridgeCalculated = ref(false);

const allAspectsList = computed(() => Object.values(THAUMCRAFT_ASPECTS));

const filteredAspects = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  return allAspectsList.value.filter(asp => {
    // Filter type
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

const getAspect = (id: string): ThaumcraftAspect | undefined => THAUMCRAFT_ASPECTS[id];

const selectAspect = (asp: ThaumcraftAspect) => {
  selectedAspect.value = asp;
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn" @click.self="emit('close')">
    <div class="bg-[#16181a] border border-[#26292d] w-full max-w-5xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
      
      <!-- Floating Close Button -->
      <button
        type="button"
        @click="emit('close')"
        class="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-[#0c0d0e] border-2 border-indigo-500 hover:border-purple-400 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer z-20"
      >
        <IconRenderer name="X" size="20" class="stroke-[2.5]" />
      </button>

      <!-- Modal Title -->
      <div class="flex items-center gap-3 border-b border-[#26292d] pb-4 pr-12">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-xl shadow-purple-950/50 flex-shrink-0">
          <div class="w-full h-full bg-[#0c0d0e] rounded-[14px] flex items-center justify-center text-purple-400 font-extrabold text-2xl">
            🔮
          </div>
        </div>
        <div>
          <h2 class="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Интерактивный Граф Аспектов Thaumcraft 4</span>
            <span class="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-extrabold uppercase">TC 4.2</span>
          </h2>
          <p class="text-xs text-slate-300 font-medium">Калькулятор моста стола исследований, рецепты скрещивания и стихии</p>
        </div>
      </div>

      <!-- RESEARCH TABLE ASPECT BRIDGE FINDER TOOL (TOP SECTION) -->
      <div class="bg-gradient-to-r from-purple-950/40 via-[#121416] to-cyan-950/40 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
            <IconRenderer name="Compass" size="16" class="text-purple-400" />
            <span>Поиск кратчайшего моста для Стола Исследований</span>
          </h3>
          <span class="text-[11px] text-purple-400/80 font-mono">BFS Pathfinding Engine</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <!-- Start Aspect Dropdown -->
          <div class="sm:col-span-5 space-y-1">
            <label class="block text-[11px] font-bold text-slate-300">Начальный аспект</label>
            <select
              v-model="startAspectId"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400 font-semibold"
            >
              <option v-for="asp in allAspectsList" :key="asp.id" :value="asp.id">
                {{ asp.isPrimal ? '✨' : '🧪' }} {{ asp.nameRu }} ({{ asp.nameLat }})
              </option>
            </select>
          </div>

          <!-- Target Aspect Dropdown -->
          <div class="sm:col-span-5 space-y-1">
            <label class="block text-[11px] font-bold text-slate-300">Целевой аспект</label>
            <select
              v-model="targetAspectId"
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400 font-semibold"
            >
              <option v-for="asp in allAspectsList" :key="asp.id" :value="asp.id">
                {{ asp.isPrimal ? '✨' : '🧪' }} {{ asp.nameRu }} ({{ asp.nameLat }})
              </option>
            </select>
          </div>

          <!-- Calculate Button -->
          <div class="sm:col-span-2">
            <button
              type="button"
              @click="calculateBridge"
              class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-950/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Построить</span>
            </button>
          </div>
        </div>

        <!-- Calculated Bridge Result Render -->
        <div v-if="isBridgeCalculated" class="pt-3 border-t border-purple-500/20 space-y-3">
          <div v-if="calculatedBridge.length === 0" class="text-xs text-rose-400 font-bold p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
            Соединение между аспектами не найдено.
          </div>
          <div v-else class="space-y-2">
            <div class="flex items-center justify-between text-xs text-purple-300 font-bold">
              <span>Цепочка соединения (Шагов: {{ calculatedBridge.length - 1 }}):</span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 p-3 bg-[#0c0d0e] border border-purple-500/30 rounded-xl overflow-x-auto">
              <template v-for="(aspId, idx) in calculatedBridge" :key="aspId + idx">
                <div
                  @click="selectAspect(THAUMCRAFT_ASPECTS[aspId])"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-md transition-transform hover:scale-105 cursor-pointer"
                  :style="{ borderColor: THAUMCRAFT_ASPECTS[aspId]?.color + '80', backgroundColor: THAUMCRAFT_ASPECTS[aspId]?.color + '15' }"
                >
                  <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: THAUMCRAFT_ASPECTS[aspId]?.color }"></span>
                  <span class="text-xs font-bold text-white">{{ THAUMCRAFT_ASPECTS[aspId]?.nameRu }}</span>
                  <span class="text-[10px] text-slate-400">({{ THAUMCRAFT_ASPECTS[aspId]?.nameLat }})</span>
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
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Sub-column: Aspect Grid & Filters (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          
          <!-- Search & Filter Controls -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
            <!-- Search Bar -->
            <div class="relative flex-1 w-full">
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Поиск аспекта (например: Магия, Aqua, Огонь)..."
                class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-purple-400"
              />
              <IconRenderer name="Search" size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            </div>

            <!-- Filter Buttons -->
            <div class="flex items-center gap-1 bg-[#0c0d0e] p-1 rounded-xl border border-[#26292d] w-full sm:w-auto justify-center">
              <button
                type="button"
                @click="activeFilter = 'all'"
                :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', activeFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white']"
              >
                Все ({{ allAspectsList.length }})
              </button>
              <button
                type="button"
                @click="activeFilter = 'primal'"
                :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', activeFilter === 'primal' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white']"
              >
                Первичные (6)
              </button>
              <button
                type="button"
                @click="activeFilter = 'compound'"
                :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', activeFilter === 'compound' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white']"
              >
                Составные
              </button>
            </div>
          </div>

          <!-- Aspect Badges Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
            <div
              v-for="asp in filteredAspects"
              :key="asp.id"
              @click="selectAspect(asp)"
              :class="[
                'p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 group shadow-md',
                selectedAspect?.id === asp.id ? 'ring-2 ring-purple-400 bg-purple-950/40 border-purple-500' : 'bg-[#0c0d0e]/80 border-[#26292d] hover:border-slate-600 hover:bg-[#121416]'
              ]"
            >
              <div
                class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                :style="{ backgroundColor: asp.color }"
              ></div>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-extrabold text-white truncate group-hover:text-purple-300 transition-colors">
                  {{ asp.nameRu }}
                </div>
                <div class="text-[10px] text-slate-400 font-mono truncate">
                  {{ asp.nameLat }}
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Sub-column: Selected Aspect Detail View (5 cols) -->
        <div class="lg:col-span-5">
          <div v-if="selectedAspect" class="bg-[#0c0d0e] border border-[#26292d] rounded-2xl p-5 space-y-5 shadow-xl h-full flex flex-col justify-between">
            
            <div class="space-y-4">
              <!-- Aspect Header badge -->
              <div class="flex items-center gap-3 border-b border-[#26292d] pb-4">
                <div
                  class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl ring-2 ring-white/10"
                  :style="{ backgroundColor: selectedAspect.color }"
                >
                  <span class="text-xl font-black text-black/80">{{ selectedAspect.nameRu.charAt(0) }}</span>
                </div>
                <div>
                  <h3 class="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <span>{{ selectedAspect.nameRu }}</span>
                    <span class="text-[10px] text-slate-300 font-mono">({{ selectedAspect.nameLat }})</span>
                  </h3>
                  <span
                    :class="['text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border inline-block mt-0.5', selectedAspect.isPrimal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/40']"
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
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {{ selectedAspect.isPrimal ? 'Первичный элемент' : 'Рецепт скрещивания:' }}
                </h4>

                <div v-if="selectedAspect.isPrimal" class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300">
                  Базовый аспект (не состоит из других элементов).
                </div>

                <div v-else-if="selectedAspect.components" class="grid grid-cols-2 gap-3">
                  <!-- Component 1 -->
                  <div
                    v-if="getAspect(selectedAspect.components[0])"
                    @click="selectAspect(getAspect(selectedAspect.components[0])!)"
                    class="p-3 rounded-xl bg-[#16181a] border border-[#26292d] hover:border-purple-400/60 transition-all cursor-pointer space-y-1 group"
                  >
                    <div class="flex items-center gap-2">
                      <span class="w-3.5 h-3.5 rounded-full" :style="{ backgroundColor: getAspect(selectedAspect.components[0])?.color }"></span>
                      <span class="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        {{ getAspect(selectedAspect.components[0])?.nameRu }}
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">
                      {{ getAspect(selectedAspect.components[0])?.nameLat }}
                    </div>
                  </div>

                  <!-- Component 2 -->
                  <div
                    v-if="getAspect(selectedAspect.components[1])"
                    @click="selectAspect(getAspect(selectedAspect.components[1])!)"
                    class="p-3 rounded-xl bg-[#16181a] border border-[#26292d] hover:border-purple-400/60 transition-all cursor-pointer space-y-1 group"
                  >
                    <div class="flex items-center gap-2">
                      <span class="w-3.5 h-3.5 rounded-full" :style="{ backgroundColor: getAspect(selectedAspect.components[1])?.color }"></span>
                      <span class="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        {{ getAspect(selectedAspect.components[1])?.nameRu }}
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">
                      {{ getAspect(selectedAspect.components[1])?.nameLat }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Action Button -->
            <div class="pt-3 border-t border-[#26292d] flex justify-between gap-2">
              <button
                type="button"
                @click="startAspectId = selectedAspect.id; calculateBridge();"
                class="flex-1 py-2 rounded-xl bg-[#16181a] hover:bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all text-center"
              >
                Как старт
              </button>
              <button
                type="button"
                @click="targetAspectId = selectedAspect.id; calculateBridge();"
                class="flex-1 py-2 rounded-xl bg-[#16181a] hover:bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all text-center"
              >
                Как цель
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  </div>
</template>
