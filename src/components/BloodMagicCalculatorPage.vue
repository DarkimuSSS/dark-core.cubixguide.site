<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';
import {
  BLOOD_MAGIC_RUNES,
  BLOOD_MAGIC_TIERS,
  calculateBloodAltarStats,
  type BloodMagicTierInfo
} from '../data/bloodMagicData';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-guide', guideId: string): void;
}>();

const selectedTier = ref<number>(3);
const currentTierInfo = computed(() => BLOOD_MAGIC_TIERS.find(t => t.tier === selectedTier.value) || BLOOD_MAGIC_TIERS[0]);

// Runes count state
const runeCounts = ref<Record<string, number>>({
  speed: 4,
  capacity: 8,
  augmented_capacity: 0,
  sacrifice: 4,
  self_sacrifice: 4,
  dislocation: 4,
  orb: 0,
  acceleration: 0
});

// Auto-adjust runes if total exceeds current tier limit
const totalAllocatedRunes = computed(() => {
  return Object.values(runeCounts.value).reduce((sum, val) => sum + Math.max(0, val), 0);
});

const maxRunesForTier = computed(() => currentTierInfo.value.totalRunes);
const remainingBlankRunes = computed(() => Math.max(0, maxRunesForTier.value - totalAllocatedRunes.value));

watch(selectedTier, (newTier) => {
  const max = BLOOD_MAGIC_TIERS.find(t => t.tier === newTier)?.totalRunes || 0;
  if (totalAllocatedRunes.value > max && max > 0) {
    // Reset or balance proportionally
    runeCounts.value = {
      speed: Math.min(4, Math.floor(max / 4)),
      capacity: Math.min(8, Math.floor(max / 2)),
      augmented_capacity: 0,
      sacrifice: 0,
      self_sacrifice: 0,
      dislocation: 0,
      orb: 0,
      acceleration: 0
    };
  }
});

const updateRuneCount = (runeId: string, delta: number) => {
  const current = runeCounts.value[runeId] || 0;
  const next = Math.max(0, current + delta);
  
  if (delta > 0 && remainingBlankRunes.value <= 0 && maxRunesForTier.value > 0) {
    return; // Cannot exceed total tier runes
  }
  
  runeCounts.value = {
    ...runeCounts.value,
    [runeId]: next
  };
};

const resetRunesToBlank = () => {
  runeCounts.value = {
    speed: 0,
    capacity: 0,
    augmented_capacity: 0,
    sacrifice: 0,
    self_sacrifice: 0,
    dislocation: 0,
    orb: 0,
    acceleration: 0
  };
};

// Preset Builds (Custom Preset Layouts)
const applyPreset = (type: 'speed_craft' | 'max_capacity' | 'mob_farm' | 'self_dagger') => {
  const max = maxRunesForTier.value;
  if (max === 0) return;

  if (type === 'speed_craft') {
    const speed = Math.floor(max * 0.6);
    const capacity = max - speed;
    runeCounts.value = { speed, capacity, augmented_capacity: 0, sacrifice: 0, self_sacrifice: 0, dislocation: 0, orb: 0, acceleration: 0 };
  } else if (type === 'max_capacity') {
    const cap = Math.floor(max * 0.7);
    const augCap = max - cap;
    runeCounts.value = { speed: 0, capacity: cap, augmented_capacity: augCap, sacrifice: 0, self_sacrifice: 0, dislocation: 0, orb: 0, acceleration: 0 };
  } else if (type === 'mob_farm') {
    const sac = Math.floor(max * 0.7);
    const speed = max - sac;
    runeCounts.value = { speed, capacity: 0, augmented_capacity: 0, sacrifice: sac, self_sacrifice: 0, dislocation: 0, orb: 0, acceleration: 0 };
  } else if (type === 'self_dagger') {
    const selfSac = Math.floor(max * 0.7);
    const cap = max - selfSac;
    runeCounts.value = { speed: 0, capacity: cap, augmented_capacity: 0, sacrifice: 0, self_sacrifice: selfSac, dislocation: 0, orb: 0, acceleration: 0 };
  }
};

const calculatedStats = computed(() => calculateBloodAltarStats(selectedTier.value, runeCounts.value));
</script>

<template>
  <div class="min-h-screen bg-[#0c0d0e] text-[#e2e8f0] pb-16">
    <!-- Compact Top Navigation Header -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div class="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <button
            @click="emit('back')"
            class="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer"
            title="Назад в каталог гайдов"
          >
            <IconRenderer name="ArrowLeft" size="18" />
          </button>
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-crimson-600 to-red-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-950/60 border border-white/20">
            <IconRenderer name="Droplet" size="20" />
          </div>
          <div>
            <h1 class="text-lg font-black text-white flex items-center gap-2">
              Калькулятор Алтаря Blood Magic
              <span class="text-[10px] uppercase font-mono font-black text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                Tier 1–6
              </span>
            </h1>
            <p class="text-xs text-slate-400">Интерактивный расчет характеристик, рун и сметы блоков для сервера</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-6">
      
      <!-- 1. TIER SELECTION TABS -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <IconRenderer name="Layers" size="16" />
            <span>Уровень (Tier) Алтаря</span>
          </h2>
          <span class="text-xs text-slate-400 font-medium">Размер рунической структуры</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            v-for="t in BLOOD_MAGIC_TIERS"
            :key="t.tier"
            @click="selectedTier = t.tier"
            :class="[
              'p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 group relative overflow-hidden',
              selectedTier === t.tier
                ? 'bg-rose-500/20 border-rose-500 text-white shadow-xl shadow-rose-950/60 ring-2 ring-rose-500/40'
                : 'bg-[#121417] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 hover:bg-[#181a1f]'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-black text-rose-400">Tier {{ t.tier }}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="selectedTier === t.tier ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'">
                {{ t.totalRunes }} рун
              </span>
            </div>
            <div>
              <div class="text-xs font-extrabold text-white truncate">{{ t.name.split('—')[1] || t.name }}</div>
              <div class="text-[10px] text-slate-400 truncate">{{ t.dimensions }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- 2. MAIN GRID: CALCULATOR RUNES & STATS DISPLAY -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- LEFT COLUMN: RUNE ALLOCATION & BUILDER (7 Cols) -->
        <div class="lg:col-span-7 space-y-6">
          <div class="p-5 sm:p-6 rounded-3xl bg-[#121417] border border-white/10 shadow-2xl space-y-5">
            <div class="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/10">
              <div>
                <h3 class="text-base font-black text-white flex items-center gap-2">
                  <IconRenderer name="Sliders" size="18" class="text-rose-400" />
                  <span>Распределение Рун для Tier {{ selectedTier }}</span>
                </h3>
                <p class="text-xs text-slate-400">
                  Доступно слотов для рун: <strong class="text-rose-400 font-extrabold">{{ remainingBlankRunes }}</strong> из <strong>{{ maxRunesForTier }}</strong>
                </p>
              </div>

              <!-- Reset & Quick Presets -->
              <div class="flex items-center gap-2">
                <button
                  @click="resetRunesToBlank"
                  class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Сбросить все руны"
                >
                  <IconRenderer name="RotateCcw" size="13" />
                  <span>Сброс</span>
                </button>
              </div>
            </div>

            <!-- Warning if Tier 1 (0 runes) -->
            <div v-if="selectedTier === 1" class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium space-y-1">
              <div class="font-extrabold flex items-center gap-2">
                <IconRenderer name="AlertCircle" size="16" class="text-amber-400 shrink-0" />
                <span>Tier I не содержит рунических слотов</span>
              </div>
              <p class="text-slate-300 leading-relaxed">
                На первом уровне используется исключительно сам блок Кровавого Алтаря. Чтобы начать вставлять руны скорости, емкости и жертвоприношения, выберите Tier II или выше.
              </p>
            </div>

            <!-- Preset Quick Selectors -->
            <div v-else class="space-y-2">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Готовые пресеты сборок:</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  @click="applyPreset('speed_craft')"
                  class="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <IconRenderer name="Zap" size="14" class="shrink-0" />
                  <span>Скоростной крафт</span>
                </button>
                <button
                  @click="applyPreset('max_capacity')"
                  class="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <IconRenderer name="Database" size="14" class="shrink-0" />
                  <span>Макс. Емкость LP</span>
                </button>
                <button
                  @click="applyPreset('mob_farm')"
                  class="p-2.5 rounded-xl bg-crimson-500/10 hover:bg-crimson-500/20 border border-crimson-500/30 text-crimson-300 text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <IconRenderer name="Skull" size="14" class="shrink-0" />
                  <span>Спавнер мобов</span>
                </button>
                <button
                  @click="applyPreset('self_dagger')"
                  class="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <IconRenderer name="HeartHandshake" size="14" class="shrink-0" />
                  <span>Селф-фарм ножом</span>
                </button>
              </div>
            </div>

            <!-- Rune Allocator Controls List (Compact 2-Column Grid) -->
            <div v-if="selectedTier > 1" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              <div
                v-for="(rune, id) in BLOOD_MAGIC_RUNES"
                :key="id"
                class="p-3 rounded-2xl bg-[#090a0c] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3 group"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div :class="['w-8 h-8 rounded-xl bg-gradient-to-br border flex items-center justify-center text-white shrink-0 shadow-md', rune.color]">
                    <IconRenderer :name="rune.icon" size="15" />
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-extrabold text-white truncate group-hover:text-rose-300 transition-colors">{{ rune.nameRu }}</h4>
                    <p class="text-[10px] text-slate-400 truncate">{{ rune.effectFormula }}</p>
                  </div>
                </div>

                <!-- Number Incrementation Control -->
                <div class="flex items-center gap-1.5 shrink-0 bg-white/5 p-1 rounded-xl border border-white/5">
                  <button
                    @click="updateRuneCount(id, -1)"
                    :disabled="!runeCounts[id]"
                    class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-white font-bold flex items-center justify-center transition-all cursor-pointer text-xs"
                  >
                    -
                  </button>
                  <span class="w-6 text-center font-mono font-black text-xs text-white">
                    {{ runeCounts[id] || 0 }}
                  </span>
                  <button
                    @click="updateRuneCount(id, 1)"
                    :disabled="remainingBlankRunes <= 0"
                    class="w-6 h-6 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-30 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-center transition-all cursor-pointer text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: REALTIME STATS & MATERIAL COST (5 Cols) -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- REALTIME ALTAR STATS CARD -->
          <div class="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#14161a] to-[#0f1114] border border-rose-500/30 shadow-2xl space-y-5 relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 class="text-base font-black text-white flex items-center gap-2">
                <IconRenderer name="Activity" size="18" class="text-rose-400" />
                <span>Характеристики Алтаря</span>
              </h3>
              <span class="text-xs font-mono font-black text-rose-400">Tier {{ selectedTier }}</span>
            </div>

            <!-- Main Big Capacity Meter -->
            <div class="p-4 rounded-2xl bg-[#090a0c] border border-white/10 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <IconRenderer name="Database" size="14" class="text-rose-400" />
                  Максимальная Емкость LP:
                </span>
                <span class="font-mono font-black text-rose-400 text-base">
                  {{ calculatedStats.capacity.toLocaleString() }} LP
                </span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10">
                <div class="h-full rounded-full bg-gradient-to-r from-rose-600 to-red-500 shadow-sm transition-all duration-500" style="width: 100%"></div>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3.5 rounded-2xl bg-[#090a0c] border border-white/5 space-y-1">
                <div class="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <IconRenderer name="Zap" size="12" class="text-amber-400" />
                  <span>Множитель Скорости</span>
                </div>
                <div class="text-base font-mono font-black text-amber-300">
                  x{{ calculatedStats.speedMultiplier }}
                </div>
                <div class="text-[10px] text-slate-500">Ускорение крафта LP</div>
              </div>

              <div class="p-3.5 rounded-2xl bg-[#090a0c] border border-white/5 space-y-1">
                <div class="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <IconRenderer name="HeartHandshake" size="12" class="text-emerald-400" />
                  <span>LP с Жертв. Ножа</span>
                </div>
                <div class="text-base font-mono font-black text-emerald-300">
                  +{{ calculatedStats.lpPerSelfSacrifice }} LP
                </div>
                <div class="text-[10px] text-slate-500">За 1 сердце (Бонус: +{{ calculatedStats.selfSacrificeBonusPct }}%)</div>
              </div>

              <div class="p-3.5 rounded-2xl bg-[#090a0c] border border-white/5 space-y-1">
                <div class="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <IconRenderer name="Skull" size="12" class="text-crimson-400" />
                  <span>LP с Моб-Фермы</span>
                </div>
                <div class="text-base font-mono font-black text-crimson-300">
                  +{{ calculatedStats.lpPerMobSacrifice }} LP
                </div>
                <div class="text-[10px] text-slate-500">За моба (Бонус: +{{ calculatedStats.sacrificeBonusPct }}%)</div>
              </div>

              <div class="p-3.5 rounded-2xl bg-[#090a0c] border border-white/5 space-y-1">
                <div class="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <IconRenderer name="ArrowUpDown" size="12" class="text-cyan-400" />
                  <span>Скорость Труб</span>
                </div>
                <div class="text-base font-mono font-black text-cyan-300">
                  +{{ calculatedStats.dislocationBonusPct }}%
                </div>
                <div class="text-[10px] text-slate-500">Выкачка/закачка жидкости</div>
              </div>
            </div>
          </div>

          <!-- MATERIAL BILL / STRUCTURE COST CARD -->
          <div class="p-5 sm:p-6 rounded-3xl bg-[#121417] border border-white/10 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 class="text-base font-black text-white flex items-center gap-2">
                <IconRenderer name="Box" size="18" class="text-rose-400" />
                <span>Смета Блоков для Постройки</span>
              </h3>
              <span class="text-xs text-slate-400 font-bold">{{ currentTierInfo.dimensions }}</span>
            </div>

            <p class="text-xs text-slate-400 leading-relaxed">
              {{ currentTierInfo.description }}
            </p>

            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-slate-300">Кровавый Алтарь (Blood Altar):</span>
                <span class="font-mono text-rose-400 font-black">1 шт</span>
              </div>

              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-slate-300">Всего рун в структуре:</span>
                <span class="font-mono text-rose-400 font-black">{{ currentTierInfo.totalRunes }} шт</span>
              </div>

              <div v-if="remainingBlankRunes > 0" class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-slate-400">Оставшиеся пустые руны (Blank Rune):</span>
                <span class="font-mono text-slate-400 font-black">{{ remainingBlankRunes }} шт</span>
              </div>

              <div v-if="currentTierInfo.structures.glowstoneOrBricks" class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-amber-300">{{ currentTierInfo.structures.glowstoneOrBricks.name }}:</span>
                <span class="font-mono text-amber-400 font-black">{{ currentTierInfo.structures.glowstoneOrBricks.count }} шт</span>
              </div>

              <div v-if="currentTierInfo.structures.bloodBricks" class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-rose-300">{{ currentTierInfo.structures.bloodBricks.name }}:</span>
                <span class="font-mono text-rose-400 font-black">{{ currentTierInfo.structures.bloodBricks.count }} шт</span>
              </div>

              <div v-if="currentTierInfo.structures.beacons" class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-cyan-300">{{ currentTierInfo.structures.beacons.name }}:</span>
                <span class="font-mono text-cyan-400 font-black">{{ currentTierInfo.structures.beacons.count }} шт</span>
              </div>

              <div v-if="currentTierInfo.structures.crystalPillars" class="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs font-bold">
                <span class="text-purple-300">{{ currentTierInfo.structures.crystalPillars.name }}:</span>
                <span class="font-mono text-purple-400 font-black">{{ currentTierInfo.structures.crystalPillars.count }} шт</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>
