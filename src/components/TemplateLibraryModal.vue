<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import IconRenderer from './IconRenderer.vue';
import type { GuideBlock } from '../types/guide';

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

const favoriteIds = ref<string[]>([]);

onMounted(() => {
  try {
    const raw = localStorage.getItem('cubix_favorite_templates');
    if (raw) favoriteIds.value = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading favorites:', err);
  }
});

const toggleFavorite = (tplId: string, e: MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  if (favoriteIds.value.includes(tplId)) {
    favoriteIds.value = favoriteIds.value.filter(id => id !== tplId);
  } else {
    favoriteIds.value.push(tplId);
  }
  localStorage.setItem('cubix_favorite_templates', JSON.stringify(favoriteIds.value));
};

const templates: LayoutTemplate[] = [
  {
    id: 'tpl_top_cols_bottom_full',
    name: '2 Колонки сверху + 1 Широкий блок снизу',
    description: 'Вверху 2 параллельные колонки (например, Описание и Иллюстрация), а под ними единый широкий блок на всю ширину.',
    icon: 'Layout',
    previewLayout: '[ 2 Колонки Сверху | 1 Широкий Блок Снизу ]',
    category: 'Составные колонки',
    blocks: [
      {
        id: 'tpl_sec_grid_1',
        type: 'section',
        sectionStyle: 'card',
        customWidth: 100,
        columns: [
          {
            id: 'col_g1',
            customWidth: 50,
            blocks: [
              { id: 'sub_g1', type: 'heading', headingText: 'Первый блок', headingLevel: 'h2', customWidth: 100 },
              { id: 'sub_g2', type: 'text', textContent: 'Описание левой колонки...', customWidth: 100 }
            ]
          },
          {
            id: 'col_g2',
            customWidth: 50,
            blocks: [
              { id: 'sub_g3', type: 'heading', headingText: 'Второй блок', headingLevel: 'h2', customWidth: 100 },
              { id: 'sub_g4', type: 'text', textContent: 'Описание правой колонки...', customWidth: 100 }
            ]
          }
        ]
      },
      {
        id: 'tpl_sec_grid_2',
        type: 'callout',
        calloutType: 'tip',
        calloutTitle: 'Третий блок (На всю ширину карточки)',
        calloutText: 'Это широкий подблок, который идет ниже под колонками.',
        customWidth: 100
      }
    ]
  },
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
            customWidth: 70,
            blocks: [
              {
                id: 'tpl_sub_1',
                type: 'heading',
                headingText: 'Доступ в Мир Драконов',
                headingLevel: 'h2',
                customWidth: 100
              },
              {
                id: 'tpl_sub_2',
                type: 'text',
                textContent: 'После успешного завершения квеста «Орихалковая броня», в награду вы получите уникальный квестовый предмет. Его необходимо доставить Страннику (NPC) на спавне.',
                customWidth: 100
              }
            ]
          },
          {
            id: 'col_right_1',
            customWidth: 30,
            blocks: [
              {
                id: 'tpl_sub_3',
                type: 'image',
                imageUrl: '',
                imageCaption: 'Иллюстрация к гайду',
                customWidth: 100
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tpl_stacked_text_callout_multiblock',
    name: '2 Блока слева (Текст + Предупреждение) | 1 Схема справа (3/6 + 3/6)',
    description: 'Слева стопкой стоят описательный текст и важный совет, а справа — схема мультиструктуры.',
    icon: 'Layers',
    previewLayout: '[ Текст + Совет (3/6) | Схема 3D (3/6) ]',
    category: 'Составные колонки',
    blocks: [
      {
        id: 'tpl_sec_2',
        type: 'section',
        span: 'span-6',
        columns: [
          {
            id: 'col_left_2',
            customWidth: 50,
            blocks: [
              {
                id: 'tpl_sub_4',
                type: 'text',
                textContent: 'Для создания предмета вам потребуются ресурсы высокого тира. Убедитесь в наличии базовых компонентов.',
                customWidth: 100
              },
              {
                id: 'tpl_sub_5',
                type: 'callout',
                calloutType: 'warning',
                calloutTitle: 'Опасности PvP зоны',
                calloutText: 'В этом мире включено PvP и нельзя создавать приваты!',
                customWidth: 100
              }
            ]
          },
          {
            id: 'col_right_2',
            customWidth: 50,
            blocks: [
              {
                id: 'tpl_sub_6',
                type: 'multiblock',
                gridSize: 3,
                palette: [],
                layers: [],
                customWidth: 100
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
        customWidth: 50,
        textContent: 'Опишите пошаговые действия или подробности процесса...'
      },
      {
        id: 'tpl_b2',
        type: 'image',
        customWidth: 50,
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
        customWidth: 33,
        imageUrl: '',
        imageCaption: 'Вид слева'
      },
      {
        id: 'tpl_b3_2',
        type: 'text',
        customWidth: 33,
        textContent: 'Пояснение к иллюстрациям и сравнительные харатеристики...'
      },
      {
        id: 'tpl_b3_3',
        type: 'image',
        customWidth: 33,
        imageUrl: '',
        imageCaption: 'Вид справа'
      }
    ]
  }
];

const selectedCategory = ref<string>('Все');
const categoriesList = ['Все', '⭐ Избранное', 'Составные колонки', 'Колонки', 'Крафт и Схемы'];

const filteredTemplates = computed(() => {
  if (selectedCategory.value === '⭐ Избранное') {
    return templates.filter(t => favoriteIds.value.includes(t.id));
  }
  if (selectedCategory.value === 'Все') {
    return templates;
  }
  return templates.filter(t => t.category === selectedCategory.value);
});

const applyTemplate = (tpl: LayoutTemplate) => {
  const newBlocks: GuideBlock[] = JSON.parse(JSON.stringify(tpl.blocks)).map((b: GuideBlock, idx: number) => ({
    ...b,
    id: `b_tpl_${Date.now()}__${idx}`
  }));
  emit('select-template', newBlocks);
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
    <div class="bg-[#16181a] border border-[#26292d] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[#26292d] flex items-center justify-between bg-[#121416]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <IconRenderer name="Layout" size="20" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              Библиотека шаблонов макета
              <span v-if="favoriteIds.length > 0" class="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                ⭐ {{ favoriteIds.length }} в избранном
              </span>
            </h3>
            <p class="text-xs text-dark-muted">Добавляйте часто используемые макеты в избранное</p>
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
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5',
            selectedCategory === cat 
              ? (cat === '⭐ Избранное' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40')
              : 'text-dark-muted hover:text-white hover:bg-[#16181a]'
          ]"
        >
          <span>{{ cat }}</span>
          <span v-if="cat === '⭐ Избранное' && favoriteIds.length > 0" class="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
            {{ favoriteIds.length }}
          </span>
        </button>
      </div>

      <!-- Templates Grid -->
      <div class="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-if="filteredTemplates.length === 0" class="col-span-2 text-center py-12 text-dark-muted space-y-2">
          <IconRenderer name="Star" size="32" class="mx-auto text-amber-400/40" />
          <p class="text-sm font-semibold text-white">В избранном пока нет шаблонов</p>
          <p class="text-xs">Нажмите на звёздочку на любой карточке шаблона, чтобы добавить её сюда</p>
        </div>

        <div
          v-else
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          @click="applyTemplate(tpl)"
          :class="[
            'group bg-[#121416] hover:bg-[#16181a] border p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 shadow-md relative',
            favoriteIds.includes(tpl.id) 
              ? 'border-amber-500/50 bg-amber-500/5 shadow-amber-950/20' 
              : 'border-[#26292d] hover:border-emerald-500/60 shadow-emerald-950/20'
          ]"
        >
          <!-- Bookmark Star Icon Button -->
          <button
            type="button"
            @click="(e) => toggleFavorite(tpl.id, e)"
            :class="[
              'absolute top-3 right-3 p-1.5 rounded-lg border transition-all z-10',
              favoriteIds.includes(tpl.id)
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                : 'bg-[#0c0d0e] text-dark-muted hover:text-amber-300 border-[#26292d] hover:border-amber-500/40'
            ]"
            :title="favoriteIds.includes(tpl.id) ? 'Удалить из избранного' : 'Добавить в избранное'"
          >
            <IconRenderer name="Star" size="15" />
          </button>

          <div class="space-y-2 pr-8">
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

          <!-- Interactive Visual Blueprint / Layout Preview -->
          <div class="bg-[#0c0d0e] border border-[#26292d] p-3.5 rounded-xl group-hover:border-emerald-500/40 transition-colors">
            <!-- Template 0: 2 cols top + 1 full bottom -->
            <div v-if="tpl.id === 'tpl_top_cols_bottom_full'" class="flex flex-col gap-1.5 h-16 w-full">
              <div class="flex gap-1.5 h-9 w-full">
                <div class="w-[50%] bg-[#16181a] border border-[#26292d] rounded-md p-1 flex flex-col justify-center gap-0.5">
                  <div class="h-1.5 w-3/4 bg-cyan-500/40 rounded"></div>
                  <div class="h-1 w-full bg-slate-700/50 rounded"></div>
                </div>
                <div class="w-[50%] bg-[#16181a] border border-[#26292d] rounded-md p-1 flex flex-col justify-center gap-0.5">
                  <div class="h-1.5 w-3/4 bg-emerald-500/40 rounded"></div>
                  <div class="h-1 w-full bg-slate-700/50 rounded"></div>
                </div>
              </div>
              <div class="h-5 w-full bg-amber-950/20 border border-amber-500/30 rounded-md flex items-center justify-center">
                <span class="text-[8px] text-amber-300 font-mono">Третий блок (100% Ширина)</span>
              </div>
            </div>
            <!-- Template 1: 2 stacked left, 1 right -->
            <div v-if="tpl.id === 'tpl_stacked_left_image_right'" class="flex gap-2 h-16 w-full">
              <div class="w-[70%] bg-[#16181a] border border-[#26292d] rounded-lg p-1.5 flex flex-col gap-1">
                <div class="h-2 w-3/4 bg-cyan-500/40 rounded"></div>
                <div class="h-1.5 w-full bg-slate-700/50 rounded"></div>
                <div class="h-1.5 w-4/5 bg-slate-700/50 rounded"></div>
              </div>
              <div class="w-[30%] bg-pink-950/20 border border-pink-500/30 rounded-lg flex flex-col items-center justify-center gap-1">
                <IconRenderer name="Image" size="14" class="text-pink-400" />
                <span class="text-[9px] text-pink-300 font-mono">Картинка</span>
              </div>
            </div>

            <!-- Template 2: 2 stacked text+callout, 1 multiblock right -->
            <div v-else-if="tpl.id === 'tpl_stacked_text_callout_multiblock'" class="flex gap-2 h-16 w-full">
              <div class="w-[50%] bg-[#16181a] border border-[#26292d] rounded-lg p-1.5 flex flex-col justify-between">
                <div class="h-2 w-full bg-slate-700/60 rounded"></div>
                <div class="h-4 bg-amber-500/20 border border-amber-500/30 rounded flex items-center px-1">
                  <span class="text-[8px] text-amber-300">💡 Совет</span>
                </div>
              </div>
              <div class="w-[50%] bg-purple-950/20 border border-purple-500/30 rounded-lg flex flex-col items-center justify-center gap-0.5">
                <IconRenderer name="Layers" size="14" class="text-purple-400" />
                <span class="text-[9px] text-purple-300 font-mono">3D Схема</span>
              </div>
            </div>

            <!-- Template 3: 2 Equal columns -->
            <div v-else-if="tpl.id === 'tpl_text_image'" class="flex gap-2 h-16 w-full">
              <div class="w-[50%] bg-[#16181a] border border-[#26292d] rounded-lg p-2 flex flex-col gap-1.5">
                <div class="h-2 w-full bg-slate-700/60 rounded"></div>
                <div class="h-2 w-2/3 bg-slate-700/60 rounded"></div>
              </div>
              <div class="w-[50%] bg-pink-950/20 border border-pink-500/30 rounded-lg flex items-center justify-center gap-1">
                <IconRenderer name="Image" size="14" class="text-pink-400" />
              </div>
            </div>

            <!-- Template 4: 3 Equal columns -->
            <div v-else-if="tpl.id === 'tpl_image_text_image'" class="flex gap-2 h-16 w-full">
              <div class="w-[33%] bg-pink-950/20 border border-pink-500/30 rounded-lg flex items-center justify-center">
                <IconRenderer name="Image" size="12" class="text-pink-400" />
              </div>
              <div class="w-[33%] bg-[#16181a] border border-[#26292d] rounded-lg p-1 flex flex-col justify-center gap-1">
                <div class="h-1.5 w-full bg-slate-700/60 rounded"></div>
                <div class="h-1.5 w-3/4 bg-slate-700/60 rounded"></div>
              </div>
              <div class="w-[33%] bg-pink-950/20 border border-pink-500/30 rounded-lg flex items-center justify-center">
                <IconRenderer name="Image" size="12" class="text-pink-400" />
              </div>
            </div>

            <!-- Fallback text badge -->
            <div v-else class="flex items-center justify-center font-mono text-xs text-emerald-400 font-bold">
              {{ tpl.previewLayout }}
            </div>
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
        <span class="text-xs text-dark-muted">Нажмите на звёздочку ⭐ на шаблоне, чтобы закрепить его в Избранном</span>
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
