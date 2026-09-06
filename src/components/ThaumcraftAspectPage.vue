<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import { THAUMCRAFT_ASPECTS, findShortestAspectBridge, type ThaumcraftAspect } from '../data/thaumcraftAspects';

const emit = defineEmits<{
  (e: 'back'): void;
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
  <div class="min-h-screen bg-[#090a0c] text-white py-4 px-3 sm:px-6 lg:px-8 space-y-4">
    <div class="max-w-7xl mx-auto space-y-4">

      <!-- RESEARCH TABLE ASPECT BRIDGE FINDER TOOL (COMPACT BANNER) -->
      <div class="bg-gradient-to-r from-purple-950/40 via-[#121417] to-cyan-950/40 border border-purple-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <IconRenderer name="Compass" size="15" class="text-purple-400" />
            <span>Калькулятор Моста для Стола Исследований</span>
          </h3>
          <span class="text-[10px] text-purple-400/80 font-mono">Thaumcraft 4.2</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <!-- Start Aspect Dropdown -->
          <div class="sm:col-span-5 space-y-1">
            <label class="block text-[11px] font-bold text-slate-300">Начальный аспект</label>
            <select
              v-model="startAspectId"
              class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-purple-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition-all"
            >
              <option v-for="asp in allAspectsList" :key="'start-' + asp.id" :value="asp.id">
                {{ asp.nameRu }} ({{ asp.nameLat }})
              </option>
            </select>
          </div>

          <!-- Target Aspect Dropdown -->
          <div class="sm:col-span-5 space-y-1">
            <label class="block text-[11px] font-bold text-slate-300">Конечный аспект</label>
            <select
              v-model="targetAspectId"
              class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-purple-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition-all"
            >
              <option v-for="asp in allAspectsList" :key="'target-' + asp.id" :value="asp.id">
                {{ asp.nameRu }} ({{ asp.nameLat }})
              </option>
            </select>
          </div>

          <!-- Calculate Button -->
          <div class="sm:col-span-2">
            <button
              type="button"
              @click="calculateBridge"
              class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <IconRenderer name="Sparkles" size="14" />
              <span>Построить</span>
            </button>
          </div>
        </div>

        <!-- Calculated Path Display -->
        <div v-if="isBridgeCalculated" class="pt-2 border-t border-purple-500/20 space-y-1.5">
          <div v-if="calculatedBridge.length === 0" class="text-xs text-rose-400 font-bold p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            Соединительный мост между выбранными аспектами не найден.
          </div>

          <div v-else class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-purple-300 font-bold">
              <span>Цепочка соединения (Шагов: {{ calculatedBridge.length - 1 }}):</span>
            </div>
            
            <div class="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#0c0d0e] border border-purple-500/30 rounded-xl overflow-x-auto">
              <template v-for="(aspId, idx) in calculatedBridge" :key="aspId + idx">
                <div
                  @click="selectAspect(THAUMCRAFT_ASPECTS[aspId])"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm transition-transform hover:scale-105 cursor-pointer"
                  :style="{ borderColor: THAUMCRAFT_ASPECTS[aspId]?.color + '80', backgroundColor: THAUMCRAFT_ASPECTS[aspId]?.color + '15' }"
                >
                  <div class="w-4 h-4 rounded-md overflow-hidden relative flex-shrink-0 flex items-center justify-center bg-black/40">
                    <img 
                      :src="`/aspects/${aspId}.png`" 
                      class="w-full h-full object-contain p-0.5"
                    />
                  </div>
                  <span class="text-xs font-bold text-white">{{ THAUMCRAFT_ASPECTS[aspId]?.nameRu }}</span>
                  <span class="text-[9.5px] text-slate-400">({{ THAUMCRAFT_ASPECTS[aspId]?.nameLat }})</span>
                </div>

                <!-- Arrow separator -->
                <IconRenderer
                  v-if="idx < calculatedBridge.length - 1"
                  name="ChevronRight"
                  size="14"
                  class="text-purple-400/80 shrink-0"
                />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN WORKSPACE: ASPECT EXPLORER & DETAIL CARD (2 COLS) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        <!-- Left Sub-column: Aspect Grid & Filters (7 cols) -->
        <div class="lg:col-span-7 space-y-3">
          
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

        <!-- Right Sub-column: Selected Aspect Detail View (5 cols - Sticky) -->
        <div class="lg:col-span-5 lg:sticky lg:top-4">
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
</template>
