<script setup lang="ts">
import { ref } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { GuideBlock } from '../types/guide';
import { PRESET_ITEMS } from '../data/presetItems';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select-template', blocks: GuideBlock[]): void;
}>();

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  previewLayout: string;
  category: 'Составные колонки' | 'Колонки' | 'Крафт и Схемы' | 'Разделы';
  blocks: GuideBlock[];
}

const templates: LayoutTemplate[] = [
  {
    id: 'tpl_stacked_left_image_right',
    name: '2 Блока слева (Заголовок + Текст) | 1 Картинка справа (4/6 + 2/6)',
    description: 'Слева расположены Заголовок и Текст друг под другом, а справа — скриншот на всю общую высоту.',
    icon: 'Layout',
    previewLayout: '[ Заголовок + Текст (4/6) | Картинка (2/6) ]',
    category: 'Составные колонки',
    blocks: [
      {
        id: 'tpl_sec_1',
        type: 'section',
        span: 'span-6',
        columns: [
          {
            id: 'col_left_1',
            span: 'span-4',
            blocks: [
              {
                id: 'tpl_sub_1',
                type: 'heading',
                headingText: 'Доступ в Мир Драконов',
                headingLevel: 'h2',
                span: 'span-6'
              },
              {
                id: 'tpl_sub_2',
                type: 'text',
                textContent: 'После успешного завершения квеста «Орихалковая броня», в награду вы получите уникальный квестовый предмет. Его необходимо доставить Страннику (NPC) на спавне.',
                span: 'span-6'
              }
            ]
          },
          {
            id: 'col_right_1',
            span: 'span-2',
            blocks: [
              {
                id: 'tpl_sub_3',
                type: 'image',
                imageUrl: '',
                imageCaption: 'Иллюстрация к гайду',
                span: 'span-6'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tpl_stacked_text_callout_crafting',
    name: '2 Блока слева (Текст + Предупреждение) | 1 Крафт справа (3/6 + 3/6)',
    description: 'Слева стопкой стоят описательный текст и важный совет, а справа — схема верстака.',
    icon: 'Grid',
    previewLayout: '[ Текст + Совет (3/6) | Крафт 3x3 (3/6) ]',
    category: 'Составные колонки',
    blocks: [
      {
        id: 'tpl_sec_2',
        type: 'section',
        span: 'span-6',
        columns: [
          {
            id: 'col_left_2',
            span: 'span-3',
            blocks: [
              {
                id: 'tpl_sub_4',
                type: 'text',
                textContent: 'Для создания предмета вам потребуются ресурсы высокого тира. Убедитесь в наличии базовых компонентов.',
                span: 'span-6'
              },
              {
                id: 'tpl_sub_5',
                type: 'callout',
                calloutType: 'warning',
                calloutTitle: 'Опасности PvP зоны',
                calloutText: 'В этом мире включено PvP и нельзя создавать приваты!',
                span: 'span-6'
              }
            ]
          },
          {
            id: 'col_right_2',
            span: 'span-3',
            blocks: [
              {
                id: 'tpl_sub_6',
                type: 'crafting',
                craftingGrid: Array(9).fill(null).map((_, i) => ({ index: i, item: null, count: 1 })),
                craftingOutput: { index: 9, item: PRESET_ITEMS[0], count: 1 },
                span: 'span-6'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tpl_text_image',
    name: 'Текст + Иллюстрация (3/6 + 3/6)',
    description: 'Две равные колонки по 3 спана: описание слева, картинка справа.',
    icon: 'Layout',
    previewLayout: '[ 3 спана | 3 спана ]',
    category: 'Колонки',
    blocks: [
      {
        id: 'tpl_b1',
        type: 'text',
        span: 'span-3',
        textContent: 'Опишите пошаговые действия или подробности процесса...'
      },
      {
        id: 'tpl_b2',
        type: 'image',
        span: 'span-3',
        imageUrl: '',
        imageCaption: 'Иллюстрация к шагу'
      }
    ]
  },
  {
    id: 'tpl_image_text_image',
    name: 'Картинка + Текст + Картинка (2/6 + 2/6 + 2/6)',
    description: 'Три колонки по 2 спана: картинка слева, описание в центре, картинка справа.',
    icon: 'Columns3',
    previewLayout: '[ 2 спана | 2 спана | 2 спана ]',
    category: 'Колонки',
    blocks: [
      {
        id: 'tpl_b3_1',
        type: 'image',
        span: 'span-2',
        imageUrl: '',
        imageCaption: 'Вид слева'
      },
      {
        id: 'tpl_b3_2',
        type: 'text',
        span: 'span-2',
        textContent: 'Пояснение к иллюстрациям и сравнительные харатеристики...'
      },
      {
        id: 'tpl_b3_3',
        type: 'image',
        span: 'span-2',
        imageUrl: '',
        imageCaption: 'Вид справа'
      }
    ]
  }
];

const selectedCategory = ref<string>('Все');
const categoriesList = ['Все', 'Составные колонки', 'Колонки', 'Крафт и Схемы'];

const applyTemplate = (tpl: LayoutTemplate) => {
  const newBlocks: GuideBlock[] = JSON.parse(JSON.stringify(tpl.blocks)).map((b: GuideBlock, idx: number) => ({
    ...b,
    id: `b_tpl_${Date.now()}_${idx}`
  }));
  emit('select-template', newBlocks);
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[#26292d] flex items-center justify-between bg-[#121416]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <IconRenderer name="Layout" size="20" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Библиотека шаблонов макета (Составные колонки)</h3>
            <p class="text-xs text-dark-muted">Размещение нескольких блоков стопкой в одной колонке</p>
          </div>
        </div>
        <button 
          @click="emit('close')"
          class="text-dark-muted hover:text-white p-1.5 rounded-lg hover:bg-[#26292d] transition-colors"
        >
          <IconRenderer name="X" size="18" />
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-2 px-6 py-3 border-b border-[#26292d] bg-[#0c0d0e] overflow-x-auto">
        <button
          v-for="cat in categoriesList"
          :key="cat"
          type="button"
          @click="selectedCategory = cat"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
            selectedCategory === cat 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
              : 'text-dark-muted hover:text-white hover:bg-[#16181a]'
          ]"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Templates Grid -->
      <div class="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="tpl in templates.filter(t => selectedCategory === 'Все' || t.category === selectedCategory)"
          :key="tpl.id"
          @click="applyTemplate(tpl)"
          class="group bg-[#121416] hover:bg-[#16181a] border border-[#26292d] hover:border-emerald-500/60 p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 shadow-md hover:shadow-emerald-950/20"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                <IconRenderer :name="tpl.icon" size="18" class="text-cyan-400" />
                {{ tpl.name }}
              </div>
            </div>

            <p class="text-xs text-dark-muted leading-relaxed">
              {{ tpl.description }}
            </p>
          </div>

          <div class="bg-[#0c0d0e] border border-[#26292d] p-3 rounded-lg flex items-center justify-center font-mono text-xs text-emerald-400 font-bold border-dashed group-hover:border-emerald-500/40">
            {{ tpl.previewLayout }}
          </div>

          <button 
            type="button" 
            class="w-full bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
          >
            <IconRenderer name="Plus" size="14" />
            Вставить шаблон
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-[#26292d] bg-[#121416] flex items-center justify-between">
        <span class="text-xs text-dark-muted">Вставляйте составные колонки с несколькими блоками слева и высоким блоком справа</span>
        <button 
          type="button"
          @click="emit('close')"
          class="text-xs text-dark-muted hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#26292d] transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
</template>
