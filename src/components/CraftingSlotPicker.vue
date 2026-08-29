<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import { PRESET_ITEMS } from '../data/presetItems';
import type { CraftingSlot, ItemDefinition } from '../types/guide';

const props = defineProps<{
  isOpen: boolean;
  slot: CraftingSlot | null;
  slotLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', slot: CraftingSlot): void;
}>();

const searchQuery = ref('');
const selectedItem = ref<ItemDefinition | null>(props.slot?.item || null);
const itemCount = ref<number>(props.slot?.count || 1);
const customTooltip = ref<string>(props.slot?.tooltip || '');

// Custom item form
const isCustomMode = ref(false);
const customName = ref('');
const customMod = ref('Свой Мод');
const customIcon = ref('Box');
const customColor = ref('#10b981');

const filteredPresets = computed(() => {
  if (!searchQuery.value.trim()) return PRESET_ITEMS;
  const q = searchQuery.value.toLowerCase();
  return PRESET_ITEMS.filter(item => 
    item.name.toLowerCase().includes(q) || 
    item.mod.toLowerCase().includes(q)
  );
});

const selectPreset = (item: ItemDefinition) => {
  selectedItem.value = item;
  isCustomMode.value = false;
  if (!customTooltip.value && item.defaultTooltip) {
    customTooltip.value = item.defaultTooltip;
  }
};

const createCustomItem = () => {
  if (!customName.value.trim()) return;
  const item: ItemDefinition = {
    id: `custom_${Date.now()}`,
    name: customName.value.trim(),
    mod: customMod.value.trim() || 'Свой предмет',
    icon: customIcon.value,
    color: customColor.value
  };
  selectedItem.value = item;
  isCustomMode.value = false;
};

const handleSave = () => {
  if (!props.slot) return;
  emit('save', {
    ...props.slot,
    item: selectedItem.value,
    count: Math.max(1, Math.min(64, itemCount.value)),
    tooltip: customTooltip.value
  });
  emit('close');
};

const clearSlot = () => {
  if (!props.slot) return;
  emit('save', {
    ...props.slot,
    item: null,
    count: 1,
    tooltip: ''
  });
  emit('close');
};
</script>

<template>
  <div v-if="isOpen && slot" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-[#26292d] flex items-center justify-between bg-[#121416]">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <IconRenderer name="Box" size="18" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">Выбор предмета</h3>
            <p class="text-xs text-dark-muted">{{ slotLabel || `Слот крафта #${slot.index + 1}` }}</p>
          </div>
        </div>
        <button 
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-1 rounded-md hover:bg-[#26292d] transition-colors"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1">
        <!-- Selected Item Preview -->
        <div class="bg-[#0c0d0e] border border-[#26292d] rounded-lg p-3.5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div 
              class="w-12 h-12 rounded-lg bg-[#16181a] border border-[#26292d] flex items-center justify-center relative shadow-inner"
              :style="{ borderColor: selectedItem ? selectedItem.color : '#26292d' }"
            >
              <IconRenderer v-if="selectedItem" :name="selectedItem.icon" size="24" :color="selectedItem.color" />
              <span v-else class="text-xs text-dark-muted">Пусто</span>
              <span v-if="selectedItem && itemCount > 1" class="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-black">
                x{{ itemCount }}
              </span>
            </div>
            <div>
              <div class="text-sm font-semibold text-white">
                {{ selectedItem ? selectedItem.name : 'Предмет не выбран' }}
              </div>
              <div class="text-xs text-dark-muted">
                {{ selectedItem ? selectedItem.mod : 'Выберите предмет из списка или создайте свой' }}
              </div>
            </div>
          </div>
          <button 
            v-if="selectedItem"
            type="button"
            @click="clearSlot"
            class="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-md border border-rose-500/30 flex items-center gap-1 transition-all"
          >
            <IconRenderer name="Trash2" size="13" />
            Очистить
          </button>
        </div>

        <!-- Details Editor -->
        <div v-if="selectedItem" class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#121416] p-3 rounded-lg border border-[#26292d]">
          <div>
            <label class="block text-xs font-medium text-dark-muted mb-1">Количество в стаке (1 - 64)</label>
            <div class="flex items-center gap-2">
              <input 
                type="number" 
                v-model.number="itemCount" 
                min="1" 
                max="64"
                class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-accent"
              />
              <input 
                type="range" 
                v-model.number="itemCount" 
                min="1" 
                max="64" 
                class="w-24 accent-emerald-500"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-dark-muted mb-1">Заметка / Тултип</label>
            <input 
              type="text" 
              v-model="customTooltip"
              placeholder="например: Верхний левый угол..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-accent"
            />
          </div>
        </div>

        <!-- Search & Toggle Custom -->
        <div class="flex items-center justify-between gap-3 pt-1">
          <div class="relative flex-1">
            <IconRenderer name="Search" size="15" class="absolute left-3 top-2.5 text-dark-muted" />
            <input 
              type="text"
              v-model="searchQuery"
              placeholder="Поиск по названию или моду..."
              class="w-full bg-[#0c0d0e] border border-[#26292d] text-xs text-white pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-emerald-accent/60"
            />
          </div>
          <button 
            type="button"
            @click="isCustomMode = !isCustomMode"
            class="text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <IconRenderer name="Plus" size="14" />
            {{ isCustomMode ? 'Показать пресеты' : 'Свой предмет' }}
          </button>
        </div>

        <!-- Custom Item Form -->
        <div v-if="isCustomMode" class="bg-[#121416] border border-[#26292d] p-3.5 rounded-lg space-y-3">
          <h4 class="text-xs font-semibold text-white uppercase tracking-wider">Создать свой предмет</h4>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-dark-muted">Название предмета</label>
              <input type="text" v-model="customName" placeholder="например: Квантовое ядро" class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs px-2.5 py-1.5 rounded" />
            </div>
            <div>
              <label class="text-[11px] text-dark-muted">Название мода</label>
              <input type="text" v-model="customMod" placeholder="например: TechMod" class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs px-2.5 py-1.5 rounded" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-dark-muted">Иконка (Lucide name)</label>
              <input type="text" v-model="customIcon" placeholder="Cpu, Gem, Zap..." class="w-full bg-[#0c0d0e] border border-[#26292d] text-white text-xs px-2.5 py-1.5 rounded" />
            </div>
            <div>
              <label class="text-[11px] text-dark-muted">Цветовой акцент</label>
              <input type="color" v-model="customColor" class="w-full bg-[#0c0d0e] border border-[#26292d] h-8 rounded cursor-pointer" />
            </div>
          </div>
          <button 
            type="button"
            @click="createCustomItem"
            class="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-2 rounded-md transition-colors"
          >
            Добавить предмет
          </button>
        </div>

        <!-- Presets List -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
          <button
            v-for="item in filteredPresets"
            :key="item.id"
            type="button"
            @click="selectPreset(item)"
            :class="[
              'p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all group',
              selectedItem?.id === item.id 
                ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md' 
                : 'bg-[#121416] border-[#26292d] hover:border-[#3b3f46] text-slate-300'
            ]"
          >
            <div 
              class="w-8 h-8 rounded-md bg-[#16181a] border border-[#26292d] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              :style="{ color: item.color }"
            >
              <IconRenderer :name="item.icon" size="18" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-white truncate">{{ item.name }}</div>
              <div class="text-[10px] text-dark-muted truncate">{{ item.mod }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-5 py-3.5 border-t border-[#26292d] bg-[#121416] flex items-center justify-between">
        <button 
          type="button"
          @click="emit('close')"
          class="text-xs text-dark-muted hover:text-white px-3 py-2 rounded-lg hover:bg-[#26292d] transition-colors"
        >
          Отмена
        </button>
        <button 
          type="button"
          @click="handleSave"
          class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
        >
          <IconRenderer name="Check" size="14" />
          Применить
        </button>
      </div>
    </div>
  </div>
</template>
