<script setup lang="ts">
import { ref, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Presets for Minecraft colors
const MINECRAFT_COLORS = [
  { code: '&0', hex: '#000000', name: 'Черный', motd: '000000' },
  { code: '&1', hex: '#0000AA', name: 'Тёмно-синий', motd: '0000AA' },
  { code: '&2', hex: '#00AA00', name: 'Тёмно-зеленый', motd: '00AA00' },
  { code: '&3', hex: '#00AAAA', name: 'Бирюзовый', motd: '00AAAA' },
  { code: '&4', hex: '#AA0000', name: 'Тёмно-красный', motd: 'AA0000' },
  { code: '&5', hex: '#AA00AA', name: 'Фиолетовый', motd: 'AA00AA' },
  { code: '&6', hex: '#FFAA00', name: 'Золотой', motd: 'FFAA00' },
  { code: '&7', hex: '#AAAAAA', name: 'Серый', motd: 'AAAAAA' },
  { code: '&8', hex: '#555555', name: 'Тёмно-серый', motd: '555555' },
  { code: '&9', hex: '#5555FF', name: 'Синий', motd: '5555FF' },
  { code: '&a', hex: '#55FF55', name: 'Светло-зеленый', motd: '55FF55' },
  { code: '&b', hex: '#55FFFF', name: 'Голубой', motd: '55FFFF' },
  { code: '&c', hex: '#FF5555', name: 'Красный', motd: 'FF5555' },
  { code: '&d', hex: '#FF55FF', name: 'Розовый', motd: 'FF55FF' },
  { code: '&e', hex: '#FFFF55', name: 'Желтый', motd: 'FFFF55' },
  { code: '&f', hex: '#FFFFFF', name: 'Белый', motd: 'FFFFFF' },
];

const MINECRAFT_FORMATS = [
  { code: '&l', name: 'Жирный', tag: 'bold' },
  { code: '&o', name: 'Курсив', tag: 'italic' },
  { code: '&n', name: 'Подчеркнутый', tag: 'underline' },
  { code: '&m', name: 'Зачеркнутый', tag: 'strikethrough' },
  { code: '&k', name: 'Магия / Замешательство', tag: 'obfuscated' },
  { code: '&r', name: 'Сброс формата', tag: 'reset' }
];

// Gradient Presets
const GRADIENT_PRESETS = [
  { name: '🔥 Огненный Дракон', start: '#ff1100', end: '#ffaa00' },
  { name: '🌌 Космический Неон', start: '#9900ff', end: '#00ffff' },
  { name: '🌿 Магический Изумруд', start: '#00ff88', end: '#006644' },
  { name: '💎 Зачарованный Алмаз', start: '#00d2ff', end: '#0033ff' },
  { name: '🌸 Закат Сакуры', start: '#ff007f', end: '#ffaaee' },
  { name: '⚡ Электрический Шторм', start: '#ffee00', end: '#ff00ff' },
];

// State
const modeTab = ref<'gradient' | 'single' | 'sign'>('gradient');
const inputText = ref('CubixWorld Player');
const startColor = ref('#00ffcc');
const endColor = ref('#9900ff');
const isBold = ref(true);
const isItalic = ref(false);
const isUnderline = ref(false);
const isStrikethrough = ref(false);

const singleColor = ref('&a');
const outputFormat = ref<'ampersand' | 'section' | 'hex_amp' | 'motd'>('ampersand');
const copySuccess = ref(false);

const isEyeDropperSupported = ref(typeof window !== 'undefined' && 'EyeDropper' in window);

const pickColorWithEyeDropper = async (target: 'start' | 'end') => {
  if (!('EyeDropper' in window)) return;
  try {
    const eyeDropper = new (window as any).EyeDropper();
    const result = await eyeDropper.open();
    if (result && result.sRGBHex) {
      if (target === 'start') startColor.value = result.sRGBHex;
      else endColor.value = result.sRGBHex;
    }
  } catch (e) {
    // User cancelled EyeDropper selection
  }
};

// Helper: Convert HEX to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Helper: Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Generate gradient styled letter array
const formattedGradientLetters = computed(() => {
  const text = inputText.value || 'CubixWorld';
  const len = text.length;
  const startRgb = hexToRgb(startColor.value);
  const endRgb = hexToRgb(endColor.value);

  return text.split('').map((char, idx) => {
    const factor = len > 1 ? idx / (len - 1) : 0;
    const r = Math.round(startRgb.r + factor * (endRgb.r - startRgb.r));
    const g = Math.round(startRgb.g + factor * (endRgb.g - startRgb.g));
    const b = Math.round(startRgb.b + factor * (endRgb.b - startRgb.b));
    const hex = rgbToHex(r, g, b);

    return {
      char,
      hex,
      cleanHex: hex.replace('#', '')
    };
  });
});

// Generated String Output depending on output format
const generatedOutput = computed(() => {
  if (modeTab.value === 'gradient') {
    const letters = formattedGradientLetters.value;
    let formatPrefix = '';
    if (isBold.value) formatPrefix += outputFormat.value === 'section' ? '§l' : '&l';
    if (isItalic.value) formatPrefix += outputFormat.value === 'section' ? '§o' : '&o';
    if (isUnderline.value) formatPrefix += outputFormat.value === 'section' ? '§n' : '&n';
    if (isStrikethrough.value) formatPrefix += outputFormat.value === 'section' ? '§m' : '&m';

    if (outputFormat.value === 'hex_amp') {
      // &#RRGGBB format (EssentialsX / Spigot 1.16+)
      return letters.map(item => `&#${item.cleanHex}${formatPrefix}${item.char}`).join('');
    } else if (outputFormat.value === 'section') {
      // §x§R§R§G§G§B§B Bungee/Minecraft Vanilla format
      return letters.map(item => {
        const h = item.cleanHex.split('').map(c => `§${c}`).join('');
        return `§x${h}${formatPrefix}${item.char}`;
      }).join('');
    } else if (outputFormat.value === 'motd') {
      // JSON / CMI HEX format {#RRGGBB}
      return letters.map(item => `{#${item.cleanHex}}${formatPrefix}${item.char}`).join('');
    } else {
      // Legacy RGB tag &{#RRGGBB}
      return letters.map(item => `&{#${item.cleanHex}}${formatPrefix}${item.char}`).join('');
    }
  } else {
    // Single Color Mode
    let code = singleColor.value;
    if (outputFormat.value === 'section') code = code.replace('&', '§');
    let formatPrefix = '';
    if (isBold.value) formatPrefix += outputFormat.value === 'section' ? '§l' : '&l';
    if (isItalic.value) formatPrefix += outputFormat.value === 'section' ? '§o' : '&o';
    if (isUnderline.value) formatPrefix += outputFormat.value === 'section' ? '§n' : '&n';
    if (isStrikethrough.value) formatPrefix += outputFormat.value === 'section' ? '§m' : '&m';

    return `${code}${formatPrefix}${inputText.value}`;
  }
});

const applyPreset = (preset: { start: string; end: string }) => {
  startColor.value = preset.start;
  endColor.value = preset.end;
};

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(generatedOutput.value);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy code:', e);
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#090a0c] text-white py-4 px-3 sm:px-6 lg:px-8 space-y-4">
    <div class="max-w-6xl mx-auto space-y-5">

      <!-- TOOL TOP BANNER -->
      <div class="bg-gradient-to-r from-emerald-950/40 via-[#121417] to-cyan-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="emit('back')"
              class="p-1.5 rounded-xl bg-[#16181a] border border-[#26292d] text-slate-400 hover:text-white hover:border-emerald-400 transition-all cursor-pointer"
              title="Назад"
            >
              <IconRenderer name="ArrowLeft" size="16" />
            </button>
            <h2 class="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span class="text-emerald-400 text-xl">🎨</span>
              <span>Генератор Цветных Ников & Сообщений Minecraft</span>
            </h2>
          </div>
          <p class="text-xs text-slate-300">
            Создавайте шикарные градиентные ники для <strong class="text-emerald-300">/nick</strong>, цветные сообщения в чат и красивые таблички в 1 клик!
          </p>
        </div>

        <!-- Mode Tabs Selector -->
        <div class="flex items-center gap-1.5 p-1 bg-[#0c0d0e] border border-[#26292d] rounded-xl shrink-0">
          <button
            type="button"
            @click="modeTab = 'gradient'"
            :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer', modeTab === 'gradient' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white']"
          >
            🌈 HEX Градиент
          </button>
          <button
            type="button"
            @click="modeTab = 'single'"
            :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer', modeTab === 'single' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white']"
          >
            🎨 Классические Коды (&a, &c)
          </button>
        </div>
      </div>

      <!-- MAIN WORKSPACE GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        <!-- Left Column: Controls & Text Input (7 Cols) -->
        <div class="lg:col-span-7 space-y-4">

          <!-- Text Input Block -->
          <div class="bg-[#121417] border border-[#26292d] rounded-2xl p-4 space-y-3 shadow-md">
            <label class="block text-xs font-extrabold uppercase tracking-wider text-emerald-300">
              1. Введите текст или Никнейм:
            </label>
            <input
              type="text"
              v-model="inputText"
              placeholder="Например: DarkimuSSS"
              class="w-full bg-[#0c0d0e] border border-[#26292d] focus:border-emerald-400 text-sm font-bold text-white rounded-xl px-3.5 py-2.5 outline-none transition-all shadow-inner"
            />

            <!-- Formatting Toggles (Bold, Italic, Underline, etc.) -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                @click="isBold = !isBold"
                :class="['px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5', isBold ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#0c0d0e] border-[#26292d] text-slate-400 hover:text-white']"
              >
                <span class="font-black">B</span>
                <span>Жирный (&l)</span>
              </button>

              <button
                type="button"
                @click="isItalic = !isItalic"
                :class="['px-3 py-1.5 rounded-xl border text-xs font-extrabold italic transition-all cursor-pointer flex items-center gap-1.5', isItalic ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#0c0d0e] border-[#26292d] text-slate-400 hover:text-white']"
              >
                <span>I</span>
                <span>Курсив (&o)</span>
              </button>

              <button
                type="button"
                @click="isUnderline = !isUnderline"
                :class="['px-3 py-1.5 rounded-xl border text-xs font-extrabold underline transition-all cursor-pointer flex items-center gap-1.5', isUnderline ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#0c0d0e] border-[#26292d] text-slate-400 hover:text-white']"
              >
                <span>U</span>
                <span>Подчеркнутый (&n)</span>
              </button>

              <button
                type="button"
                @click="isStrikethrough = !isStrikethrough"
                :class="['px-3 py-1.5 rounded-xl border text-xs font-extrabold line-through transition-all cursor-pointer flex items-center gap-1.5', isStrikethrough ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#0c0d0e] border-[#26292d] text-slate-400 hover:text-white']"
              >
                <span>S</span>
                <span>Зачеркнутый (&m)</span>
              </button>
            </div>
          </div>

          <!-- Color Customizer (Gradient Pickers or Single Color Grid) -->
          <div v-if="modeTab === 'gradient'" class="bg-[#121417] border border-[#26292d] rounded-2xl p-4 space-y-4 shadow-md">
            <label class="block text-xs font-extrabold uppercase tracking-wider text-emerald-300">
              2. Настройка HEX Градиента:
            </label>

            <!-- Start & End Color Pickers -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3 bg-[#0c0d0e] border border-[#26292d] rounded-xl space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300">Начальный цвет:</span>
                  <button
                    v-if="isEyeDropperSupported"
                    type="button"
                    @click="pickColorWithEyeDropper('start')"
                    class="p-1 rounded-lg bg-[#16181a] hover:bg-emerald-950/60 border border-[#26292d] hover:border-emerald-400 text-slate-400 hover:text-emerald-300 transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    title="Взять цвет с экрана (Пипетка)"
                  >
                    <IconRenderer name="Pipette" size="12" />
                    <span>Пипетка</span>
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    v-model="startColor"
                    class="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    v-model="startColor"
                    class="w-full bg-[#16181a] border border-[#26292d] text-xs font-mono text-white rounded-lg px-2.5 py-1.5 uppercase outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div class="p-3 bg-[#0c0d0e] border border-[#26292d] rounded-xl space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300">Конечный цвет:</span>
                  <button
                    v-if="isEyeDropperSupported"
                    type="button"
                    @click="pickColorWithEyeDropper('end')"
                    class="p-1 rounded-lg bg-[#16181a] hover:bg-emerald-950/60 border border-[#26292d] hover:border-emerald-400 text-slate-400 hover:text-emerald-300 transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    title="Взять цвет с экрана (Пипетка)"
                  >
                    <IconRenderer name="Pipette" size="12" />
                    <span>Пипетка</span>
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    v-model="endColor"
                    class="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    v-model="endColor"
                    class="w-full bg-[#16181a] border border-[#26292d] text-xs font-mono text-white rounded-lg px-2.5 py-1.5 uppercase outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <!-- Gradient Presets Quick Selection -->
            <div class="space-y-2">
              <span class="text-[11px] font-bold text-slate-400">Готовые пресеты градиентов:</span>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="preset in GRADIENT_PRESETS"
                  :key="preset.name"
                  type="button"
                  @click="applyPreset(preset)"
                  class="p-2 rounded-xl border border-[#26292d] hover:border-emerald-400 text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer group bg-[#0c0d0e]"
                >
                  <span class="truncate text-[11px] text-slate-200 group-hover:text-white">{{ preset.name }}</span>
                  <div
                    class="w-4 h-4 rounded-full shrink-0 border border-white/20"
                    :style="{ background: `linear-gradient(to right, ${preset.start}, ${preset.end})` }"
                  ></div>
                </button>
              </div>
            </div>
          </div>

          <!-- Single Colors Palette Grid -->
          <div v-else class="bg-[#121417] border border-[#26292d] rounded-2xl p-4 space-y-3 shadow-md">
            <label class="block text-xs font-extrabold uppercase tracking-wider text-emerald-300">
              2. Выберите классический цвет:
            </label>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                v-for="color in MINECRAFT_COLORS"
                :key="color.code"
                type="button"
                @click="singleColor = color.code"
                :class="[
                  'p-2.5 rounded-xl border transition-all text-left flex items-center gap-2 cursor-pointer',
                  singleColor === color.code ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/40' : 'bg-[#0c0d0e] border-[#26292d] hover:border-slate-500'
                ]"
              >
                <div
                  class="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  :style="{ backgroundColor: color.hex }"
                ></div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">{{ color.name }}</div>
                  <div class="text-[10px] text-emerald-400 font-mono">{{ color.code }}</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        <!-- Right Column: Live Minecraft Preview & Export (5 Cols) -->
        <div class="lg:col-span-5 space-y-4">

          <!-- LIVE MINECRAFT CHAT PREVIEW BOX -->
          <div class="bg-[#121417] border border-[#26292d] rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <IconRenderer name="Eye" size="14" class="text-cyan-400" />
              <span>Предпросмотр в игре Minecraft</span>
            </h3>

            <!-- Simulated Minecraft Chat Window -->
            <div class="bg-[#0a0a0a] border border-[#1a1c1e] rounded-xl p-4 space-y-3 font-mono shadow-inner relative overflow-hidden">
              <div class="text-[10px] text-slate-500 uppercase tracking-widest border-b border-[#1c1f24] pb-1.5 flex justify-between">
                <span>[CHAT PREVIEW]</span>
                <span>CubixWorld Server</span>
              </div>

              <!-- Live Player Chat Line -->
              <div class="text-sm leading-relaxed flex items-center flex-wrap gap-1">
                <span class="text-slate-400 font-bold">&lt;Игрок&gt;:</span>
                
                <!-- Gradient Letters -->
                <template v-if="modeTab === 'gradient'">
                  <span
                    v-for="(item, idx) in formattedGradientLetters"
                    :key="idx"
                    :style="{ color: item.hex }"
                    :class="[
                      isBold ? 'font-black' : 'font-normal',
                      isItalic ? 'italic' : '',
                      isUnderline ? 'underline' : '',
                      isStrikethrough ? 'line-through' : ''
                    ]"
                  >{{ item.char }}</span>
                </template>

                <!-- Single Color Text -->
                <template v-else>
                  <span
                    :style="{ color: MINECRAFT_COLORS.find(c => c.code === singleColor)?.hex || '#ffffff' }"
                    :class="[
                      isBold ? 'font-black' : 'font-normal',
                      isItalic ? 'italic' : '',
                      isUnderline ? 'underline' : '',
                      isStrikethrough ? 'line-through' : ''
                    ]"
                  >{{ inputText }}</span>
                </template>
              </div>

              <!-- Player Tag Overhead Simulation -->
              <div class="pt-3 border-t border-[#1c1f24] space-y-1">
                <span class="text-[10px] text-slate-500">Над головой персонажа:</span>
                <div class="bg-[#000000]/70 px-3 py-1 rounded-md inline-block text-xs">
                  <template v-if="modeTab === 'gradient'">
                    <span
                      v-for="(item, idx) in formattedGradientLetters"
                      :key="'overhead-' + idx"
                      :style="{ color: item.hex }"
                      :class="[
                        isBold ? 'font-black' : 'font-normal',
                        isItalic ? 'italic' : '',
                        isUnderline ? 'underline' : '',
                        isStrikethrough ? 'line-through' : ''
                      ]"
                    >{{ item.char }}</span>
                  </template>
                  <template v-else>
                    <span
                      :style="{ color: MINECRAFT_COLORS.find(c => c.code === singleColor)?.hex || '#ffffff' }"
                      :class="[
                        isBold ? 'font-black' : 'font-normal',
                        isItalic ? 'italic' : '',
                        isUnderline ? 'underline' : '',
                        isStrikethrough ? 'line-through' : ''
                      ]"
                    >{{ inputText }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- GENERATED CODE & COPY BOX -->
          <div class="bg-[#121417] border border-[#26292d] rounded-2xl p-4 space-y-3 shadow-xl">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Готовый Код Форматирования:
              </h3>

              <!-- Format Switcher (& / § / HEX) -->
              <select
                v-model="outputFormat"
                class="bg-[#0c0d0e] border border-[#26292d] text-[11px] font-bold text-emerald-300 rounded-lg px-2 py-1 outline-none"
              >
                <option value="ampersand">Код с & (&{#HEX})</option>
                <option value="hex_amp">EssentialsX (&#HEX)</option>
                <option value="section">Символ (§x§R...)</option>
                <option value="motd">Формат CMI ({#HEX})</option>
              </select>
            </div>

            <!-- Output Textarea -->
            <textarea
              readonly
              :value="generatedOutput"
              rows="4"
              class="w-full bg-[#0c0d0e] border border-[#26292d] rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none resize-none shadow-inner"
            ></textarea>

            <!-- Copy Button -->
            <button
              type="button"
              @click="copyResult"
              class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
            >
              <IconRenderer :name="copySuccess ? 'Check' : 'Copy'" size="15" />
              <span>{{ copySuccess ? 'Скопировано в буфер обмена!' : 'Скопировать код' }}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>
